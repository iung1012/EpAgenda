import { readFile,writeFile,mkdir,stat,rm } from 'node:fs/promises';
import { resolve,dirname } from 'node:path';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { db,model,Prisma } from '../src/db.ts';
import { config } from '../src/config.ts';
import { tables,type TableName,type Row } from '../src/schema.ts';
import { restoreOrder,rewriteStorage } from '../src/backup.ts';
import { encryptCredential,decryptCredential,hashToken } from '../src/crypto.ts';
import { validatePath } from '../src/storage.ts';

const args=process.argv.slice(2);
const option=(name:string)=>{const index=args.indexOf(name);return index<0?undefined:args[index+1];};
const source=option('--input');
if(!source)throw new Error('Use --input arquivo.json --create-activation-links --origin https://epagenda.site');
const schema=z.object({format:z.literal('ep-midias-backup'),version:z.literal(1),createdAt:z.string(),sourceUrl:z.string(),credentialsFormat:z.literal('utf8-v1').optional(),users:z.array(z.object({id:z.string().uuid(),email:z.string().email()})),tables:z.record(z.string(),z.array(z.record(z.string(),z.unknown()))),files:z.array(z.object({path:z.string(),type:z.string(),data:z.string()}))});
const backup=schema.parse(JSON.parse(await readFile(source,'utf8')));
const origin=new URL(option('--origin')||config.origin).origin;
if(!args.includes('--create-activation-links'))throw new Error('Este backup não contém hashes de login. Confirme --create-activation-links para criar novos acessos individuais');
const expected=Object.keys(tables) as TableName[];
if(expected.some(name=>!Array.isArray(backup.tables[name]))||Object.keys(backup.tables).some(name=>!Object.hasOwn(tables,name)))throw new Error('O conjunto de tabelas do backup não corresponde ao aplicativo');
if(await db.auth_users.count())throw new Error('O destino já contém usuários. Nenhum dado será substituído');
for(const table of expected)if(await model(table).count())throw new Error(`O destino não está vazio (${table}). Restauração cancelada`);
const records=rewriteStorage(backup.tables,backup.sourceUrl) as Record<TableName,Row[]>;
const originalPasswords=new Map<string,string>();
const now=new Date().toISOString(),expiresAt=new Date(Date.now()+7*86400_000);
const userIds=new Set(backup.users.map(user=>user.id));
const dateTimes=new Set(['created_at','updated_at','visit_date','scheduled_date','posted_at','start_date','end_date']);
for(const table of expected)for(const row of records[table]){
  if(!z.string().uuid().safeParse(row.id).success)throw new Error(`Identificador inválido em ${table}`);
  for(const key of Object.keys(row))if(!Object.hasOwn(tables[table],key))throw new Error(`Campo não reconhecido em ${table}: ${key}. Atualize o esquema antes de importar`);
  for(const field of ['user_id','created_by','assigned_to','filmmaker_id','target_user_id'])if(row[field]&&!userIds.has(String(row[field])))throw new Error(`Conta ausente para vínculo em ${table}.${field}`);
  for(const key of dateTimes)if(typeof row[key]==='string')row[key]=new Date(String(row[key])).toISOString();
  if(table==='user_roles'&&!['admin','gerente','colaborador','filmmaker','designer'].includes(String(row.role)))throw new Error('Cargo de usuário não reconhecido');
  if(table==='client_passwords'){
    const plaintext=Buffer.from(String(row.encrypted_password),'base64').toString(backup.credentialsFormat?'utf8':'latin1');
    originalPasswords.set(String(row.id),plaintext);row.encrypted_password=encryptCredential(plaintext,String(row.id));
  }
  if(table==='whatsapp_config'){row.status='disconnected';row.phone_connected=null;}
}
if(!records.user_roles.some(row=>row.role==='admin'))throw new Error('O backup deve conter um administrador');
const paths=new Set<string>();
for(const file of backup.files){validatePath('client-files',file.path);if(paths.has(file.path))throw new Error('Caminho de arquivo duplicado');paths.add(file.path);}
const links=backup.users.map(user=>({id:user.id,email:user.email,token:randomBytes(32).toString('base64url')}));
const written:string[]=[];
let committed=false;
try{
  for(const file of backup.files){const destination=validatePath('client-files',file.path);if(await stat(destination).catch(()=>null))throw new Error('Há arquivos existentes no destino; restauração cancelada');await mkdir(dirname(destination),{recursive:true,mode:0o700});await writeFile(destination,Buffer.from(file.data,'base64'),{flag:'wx',mode:0o600});written.push(destination);}
  await db.$transaction(async tx=>{
    for(const user of backup.users){const profile=records.profiles.find(row=>row.user_id===user.id);await tx.auth_users.create({data:{id:user.id,email:user.email.toLowerCase(),password_hash:null,confirmed:true,created_at:String(profile?.created_at||now),updated_at:now}});}
    for(const table of restoreOrder)for(const row of records[table]){
      const fields=tables[table] as Record<string,{type:string}>;
      const data=Object.fromEntries(Object.entries(row).map(([key,value])=>[key,value===null&&fields[key].type==='json'?Prisma.DbNull:value]));
      await model(table,tx).create({data});
    }
    for(const file of backup.files)await tx.storage_objects.create({data:{bucket:'client-files',path:file.path,mime_type:file.type||'application/octet-stream',size:Buffer.from(file.data,'base64').length,created_at:now}});
    for(const link of links)await tx.auth_activation_tokens.create({data:{user_id:link.id,token_hash:hashToken(link.token),expires_at:expiresAt}});
  },{timeout:120000});
  committed=true;
  const actual:Record<string,number>={};for(const table of expected){actual[table]=await model(table).count();if(actual[table]!==backup.tables[table].length)throw new Error(`Contagem divergente em ${table}`);}
  let verifiedCredentials=0;
  for(const credential of await db.client_passwords.findMany()){if(decryptCredential(credential.encrypted_password,credential.id)!==originalPasswords.get(credential.id))throw new Error('Falha ao verificar uma credencial');verifiedCredentials++;}
  for(const file of backup.files)if(hashToken((await readFile(validatePath('client-files',file.path))).toString('base64'))!==hashToken(file.data))throw new Error('Conteúdo de arquivo divergente');
  const foreignKeys=await db.$queryRawUnsafe<unknown[]>('PRAGMA foreign_key_check');if(foreignKeys.length)throw new Error('A verificação de integridade encontrou vínculos inválidos');
  const integrity=await db.$queryRawUnsafe<{integrity_check:string}[]>('PRAGMA integrity_check');if(integrity[0]?.integrity_check!=='ok')throw new Error('SQLite não passou na verificação de integridade');
  const quote=(value:string)=>`"${value.replaceAll('"','""')}"`;
  const csv=['email,link,expires_at',...links.map(link=>[link.email,`${origin}/auth#activate=${link.token}`,expiresAt.toISOString()].map(quote).join(','))].join('\n')+'\n';
  await writeFile(resolve(config.dataDir,'activation-links.csv'),csv,{mode:0o600,flag:'wx'});
  const report={importedAt:now,sourceCreatedAt:backup.createdAt,sourceSha256:hashToken(await readFile(source,'utf8')),users:links.length,records:actual,files:backup.files.length,verifiedCredentials,foreignKeyCheck:'ok',integrityCheck:'ok',activationLinksExpireAt:expiresAt.toISOString(),originalLoginHashesAvailable:false};
  await writeFile(resolve(config.dataDir,'migration-report.json'),JSON.stringify(report,null,2),{mode:0o600});
  await db.$queryRawUnsafe('PRAGMA wal_checkpoint(TRUNCATE)');
  console.log(JSON.stringify(report,null,2));
}catch(error){if(!committed)for(const file of written)await rm(file,{force:true});throw error;}
finally{originalPasswords.clear();await db.$disconnect();}
