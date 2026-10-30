import { readFile, writeFile, rm, mkdir } from 'node:fs/promises';
import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { db, model, type Database } from './db.ts';
import { tables, type TableName, type Row } from './schema.ts';
import { config,HttpError } from './config.ts';
import { requireActor,requireAdmin } from './auth.ts';
import { decryptCredential,encryptCredential,signFile,hashToken } from './crypto.ts';
import { validatePath,fileUrl } from './storage.ts';
import { dirname } from 'node:path';

const names=Object.keys(tables) as TableName[];
// Foreign-key order for portable application restores; managed login data is excluded.
export const restoreOrder:TableName[]=['profiles','user_roles','clients','equipment','pautas','filmmaker_visits','tasks','calendar_events','filmmaker_demands','posts','client_drive_folders','client_folders','client_passwords','task_comments','task_templates','visit_equipment','notifications','whatsapp_config','whatsapp_recipients','whatsapp_message_logs','whatsapp_ai_messages'];
const envelope=z.object({format:z.literal('ep-midias-backup'),version:z.literal(1),createdAt:z.string(),sourceUrl:z.string().url(),credentialsFormat:z.literal('utf8-v1').optional(),tables:z.record(z.string(),z.array(z.record(z.string(),z.unknown()))),users:z.array(z.object({id:z.string().uuid(),email:z.string().email()})),files:z.array(z.object({path:z.string(),type:z.string(),data:z.string()}))});
export async function applicationSnapshot(database:Database=db){
  const result:Record<string,Row[]>={};
  for(const name of names) result[name]=await model(name,database).findMany();
  for(const row of result.client_passwords) row.encrypted_password=Buffer.from(decryptCredential(String(row.encrypted_password),String(row.id))).toString('base64');
  return result;
}
export function rewriteStorage(value:unknown,sourceUrl:string):unknown {
  if(typeof value==='string'){
    const prefix=`${sourceUrl}/storage/v1/object/`;
    if(value.startsWith(prefix)){
      const relative=value.slice(prefix.length).replace(/^(public|sign)\//,'').split('?')[0];
      const [bucket,...parts]=relative.split('/');
      if(bucket==='client-files')return `/api/storage/${bucket}/${parts.join('/')}`;
    }
    if(value.startsWith(`${sourceUrl}/api/storage/client-files/`)) return value.replace(`${sourceUrl}/api/storage/`,'/api/storage/').split('?')[0];
    return value;
  }
  if(Array.isArray(value))return value.map(item=>rewriteStorage(item,sourceUrl));
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,rewriteStorage(item,sourceUrl)]));
  return value;
}
export async function registerBackup(app:FastifyInstance){
  app.post('/api/functions/application-backup',{bodyLimit:85_000_000},async req=>{
    const actor=await requireActor(req);requireAdmin(actor);
    const body=z.object({action:z.enum(['export','import']),backup:z.unknown().optional()}).parse(req.body);
    const users=await db.auth_users.findMany({select:{id:true,email:true}});
    if(body.action==='export'){
      const snapshot=await db.$transaction(tx=>applicationSnapshot(tx),{timeout:30000});
      const files=await db.storage_objects.findMany({where:{bucket:'client-files'},orderBy:{path:'asc'}});
      return {format:'ep-midias-backup',version:1,credentialsFormat:'utf8-v1',createdAt:new Date().toISOString(),sourceUrl:config.origin,tables:snapshot,users,files:files.map(file=>({path:file.path,url:`${fileUrl(file.bucket,file.path)}?token=${encodeURIComponent(signFile(file.bucket,file.path,3600))}`}))};
    }
    const backup=envelope.parse(body.backup);
    if(Object.keys(backup.tables).length!==names.length||names.some(name=>!Array.isArray(backup.tables[name])))throw new HttpError(400,'A cópia deve conter todas as tabelas da aplicação');
    const mapping=new Map<string,string>();
    for(const old of backup.users){const user=users.find(user=>user.email.toLowerCase()===old.email.toLowerCase());if(!user)throw new HttpError(409,'Crie as contas com os mesmos e-mails antes de importar');mapping.set(old.id,user.id);}
    const restored=rewriteStorage(backup.tables,backup.sourceUrl) as Record<TableName,Row[]>;
    for(const [table,rows]of Object.entries(restored))for(const row of rows){
      if(typeof row.id!=='string'||!z.string().uuid().safeParse(row.id).success)throw new HttpError(400,'Registro com identificador inválido');
      for(const field of ['user_id','created_by','assigned_to','filmmaker_id','target_user_id'])if(typeof row[field]==='string'){
        const id=mapping.get(String(row[field]));if(!id)throw new HttpError(409,'Vínculo com usuário ausente');row[field]=id;
      }
      if(Array.isArray(row.read_by))row.read_by=row.read_by.map(id=>mapping.get(String(id))??id);
      if(table==='client_passwords')row.encrypted_password=encryptCredential(Buffer.from(String(row.encrypted_password),'base64').toString(backup.credentialsFormat?'utf8':'latin1'),row.id as string);
      for(const key of Object.keys(row))if(!Object.hasOwn(tables[table as TableName],key))throw new HttpError(400,`Campo incompatível em ${table}: ${key}`);
    }
    restored.user_roles=[];
    const profiles=await db.profiles.findMany();for(const row of restored.profiles){const current=profiles.find(profile=>profile.user_id===row.user_id);if(current)row.id=current.id;}
    const currentConfig=await db.whatsapp_config.findFirst();for(const row of restored.whatsapp_config){if(currentConfig)row.id=currentConfig.id;if(backup.sourceUrl!==config.origin){row.status='disconnected';row.instance_name=null;row.phone_connected=null;}}
    if(backup.files.reduce((total,file)=>total+file.data.length,0)>55_000_000)throw new HttpError(413,'Limite de 40 MB de arquivos');
    const paths=new Set<string>(),created:string[]=[];
    // Validate every path before touching files.
    for(const file of backup.files){validatePath('client-files',file.path);if(paths.has(file.path))throw new HttpError(400,'Arquivo duplicado');paths.add(file.path);}
    try {
      for(const file of backup.files){
        const path=validatePath('client-files',file.path),bytes=Buffer.from(file.data,'base64');
        const current=await readFile(path).catch(()=>null);
        if(current){if(hashToken(current.toString('base64'))!==hashToken(bytes.toString('base64')))throw new HttpError(409,'Um arquivo existente tem conteúdo diferente');}
        else{await mkdir(dirname(path),{recursive:true,mode:0o700});await writeFile(path,bytes,{flag:'wx',mode:0o600});created.push(path);}
      }
      const records=await db.$transaction(async tx=>{
        let count=0;
        for(const table of restoreOrder)for(const row of restored[table]){
          await model(table,tx).upsert({where:{id:row.id},create:row,update:row});count++;
        }
        for(const file of backup.files)await tx.storage_objects.upsert({where:{bucket_path:{bucket:'client-files',path:file.path}},create:{bucket:'client-files',path:file.path,mime_type:file.type,size:Buffer.from(file.data,'base64').length,created_at:new Date().toISOString()},update:{}});
        return count;
      },{timeout:60000});
      return {records,files:backup.files.length};
    }catch(error){for(const file of created)await rm(file,{force:true});throw error;}
  });
}
