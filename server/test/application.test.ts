import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,rm,readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { randomBytes,randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

const directory=await mkdtemp(resolve(tmpdir(),'epagenda-test-'));
process.env.NODE_ENV='test';process.env.DATA_DIR=directory;
process.env.DATABASE_URL=`file:${resolve(directory,'test.db').replaceAll('\\','/')}`;
process.env.APP_ORIGIN='http://localhost:8080';
process.env.CREDENTIALS_KEY=randomBytes(32).toString('base64');
process.env.FILE_SIGNING_KEY=randomBytes(32).toString('base64');
process.env.CRON_SECRET=randomBytes(32).toString('base64');
const initialization=new DatabaseSync(resolve(directory,'test.db'));
initialization.exec(await readFile(resolve(import.meta.dirname,'../prisma/migrations/20261030170000_init/migration.sql'),'utf8'));
initialization.close();
const {db}=await import('../src/db.ts');
const {buildApp}=await import('../src/index.ts');
const {createUser}=await import('../src/auth.ts');
const {credentialWire}=await import('../src/query.ts');
const {decryptCredential,hashToken}=await import('../src/crypto.ts');
const {validatePath}=await import('../src/storage.ts');
const {generateReminders}=await import('../src/jobs.ts');
const {default:bcrypt}=await import('bcryptjs');
const app=await buildApp();
const fixturePassword='Synthetic-password-12345';
const admin=await createUser({email:'admin@agency.test',password:fixturePassword,full_name:'Administrador',role:'admin'});
const manager=await createUser({email:'manager@agency.test',password:fixturePassword,full_name:'Gerente',role:'gerente'});
const film=await createUser({email:'film@agency.test',password:fixturePassword,full_name:'Filmmaker',role:'filmmaker'});
const colleague=await createUser({email:'other@agency.test',password:fixturePassword,full_name:'Colaborador',role:'colaborador'});
async function login(email:string,password=fixturePassword){const response=await app.inject({method:'POST',url:'/api/auth/login',payload:{email,password}});assert.equal(response.statusCode,200,response.body);assert.equal(response.cookies[0].httpOnly,true);return `epagenda_session=${response.cookies[0].value}`;}
const adminCookie=await login(admin.email),managerCookie=await login(manager.email),filmCookie=await login(film.email),otherCookie=await login(colleague.email);
async function query(cookie:string,payload:Record<string,unknown>){return app.inject({method:'POST',url:'/api/query',headers:{cookie},payload});}
const filter=(column:string,value:unknown)=>({column,op:'eq',value});
let clientId='',equipmentId='',visitId='';
test('VPS application authorization and migration regressions',async t=>{
  await t.test('requires a session, rejects unsafe fields and blocks public account creation',async()=>{
    const page=await app.inject({url:'/auth'}),head=await app.inject({method:'HEAD',url:'/auth'});assert.equal(head.statusCode,page.statusCode);assert.equal(head.body,'');
    assert.equal((await query('',{table:'clients'})).statusCode,401);
    assert.equal((await app.inject({method:'POST',url:'/api/auth/signup',payload:{email:'bad@agency.test',password:fixturePassword}})).statusCode,404);
    assert.equal((await query(adminCookie,{table:'auth_users'})).statusCode,400);
    assert.equal((await query(adminCookie,{table:'clients',filters:[filter('__proto__','x')]})).statusCode,400);
    const csrf=await app.inject({method:'POST',url:'/api/query',headers:{cookie:adminCookie,origin:'https://attacker.example'},payload:{table:'clients',operation:'insert',values:{name:'Bad'}}});assert.equal(csrf.statusCode,403);
  });
  await t.test('creates clients and equipment, preserves server ownership and enforces update permissions',async()=>{
    let result=await query(adminCookie,{table:'clients',operation:'insert',values:{name:'Cliente teste',created_by:film.id}});assert.equal(result.statusCode,200,result.body);clientId=result.json().data[0].id;assert.equal(result.json().data[0].created_by,admin.id);
    result=await query(adminCookie,{table:'equipment',operation:'insert',values:{name:'Câmera'}});assert.equal(result.statusCode,200,result.body);equipmentId=result.json().data[0].id;
    assert.equal((await query(filmCookie,{table:'clients',operation:'update',filters:[filter('id',clientId)],values:{name:'Alterado'}})).statusCode,403);
    assert.equal((await query(filmCookie,{table:'equipment',operation:'insert',values:{name:'Não permitido'}})).statusCode,403);
    const own=await query(filmCookie,{table:'profiles',operation:'update',filters:[filter('user_id',film.id)],values:{full_name:'Nome atualizado'}});assert.equal(own.statusCode,200,own.body);
    assert.equal((await query(filmCookie,{table:'profiles',operation:'update',filters:[filter('user_id',film.id)],values:{user_id:admin.id}})).statusCode,403);
    const team=await query(managerCookie,{table:'user_roles'});assert.equal(team.json().data.length,4);
  });
  await t.test('encrypts client credentials, handles Unicode and restricts access',async()=>{
    const plaintext='Senha de serviço 🦉 áéí-123';
    const result=await query(adminCookie,{table:'client_passwords',operation:'insert',values:{client_id:clientId,service_name:'Serviço teste',encrypted_password:credentialWire(plaintext)}});
    assert.equal(result.statusCode,200,result.body);const id=result.json().data[0].id;
    const stored=await db.client_passwords.findUniqueOrThrow({where:{id}});assert.match(stored.encrypted_password,/^v1\./);assert.notEqual(stored.encrypted_password,credentialWire(plaintext));assert.equal(decryptCredential(stored.encrypted_password,id),plaintext);
    assert.equal((await query(filmCookie,{table:'client_passwords'})).statusCode,403);
    const listed=await query(managerCookie,{table:'client_passwords'});assert.equal(Buffer.from(listed.json().data[0].encrypted_password.slice(5),'base64').toString('utf8'),plaintext);
  });
  await t.test('notification reads are atomic and cannot alter bodies or forge other readers',async()=>{
    const created=await query(adminCookie,{table:'notifications',operation:'insert',values:{title:'Aviso',message:'Original',created_by:film.id}});assert.equal(created.statusCode,200,created.body);const id=created.json().data[0].id;
    assert.equal((await query(filmCookie,{table:'notifications',operation:'update',filters:[filter('id',id)],values:{message:'Falsificado'}})).statusCode,403);
    const marked=await query(filmCookie,{table:'notifications',operation:'update',filters:[filter('id',id)],values:{read_by:[admin.id]}});assert.equal(marked.statusCode,200,marked.body);assert.deepEqual(marked.json().data[0].read_by,[film.id]);
    await query(managerCookie,{table:'notifications',operation:'update',filters:[filter('id',id)],values:{read_by:[]}});
    const row=await db.notifications.findUniqueOrThrow({where:{id}});assert.deepEqual(row.read_by,[film.id,manager.id]);assert.equal(row.message,'Original');assert.equal(row.created_by,admin.id);
  });
  const visit=()=>({title:'Visita teste',visit_date:'2030-01-02T12:00:00.000Z',status:'agendada',client_id:clientId,assigned_to:film.id,delivery_deadline:'2030-01-03',equipment_ids:[equipmentId]});
  await t.test('visit failure rolls back everything; success links task and equipment',async()=>{
    let response=await app.inject({method:'POST',url:'/api/rpc/save_visit',headers:{cookie:adminCookie},payload:{payload:{...visit(),equipment_ids:[randomUUID()]}}});assert.equal(response.statusCode,400);assert.equal(await db.filmmaker_visits.count(),0);assert.equal(await db.tasks.count(),0);
    response=await app.inject({method:'POST',url:'/api/rpc/save_visit',headers:{cookie:adminCookie},payload:{payload:visit()}});assert.equal(response.statusCode,200,response.body);visitId=response.json().id;
    assert.equal(await db.tasks.count({where:{visit_id:visitId}}),1);assert.equal(await db.visit_equipment.count({where:{visit_id:visitId}}),1);
    assert.equal((await query(adminCookie,{table:'filmmaker_visits',operation:'update',filters:[filter('id',visitId)],values:{title:'Bypass'}})).statusCode,400);
  });
  await t.test('reminders are claimed once and queued with their notification in one transaction',async()=>{
    assert.equal(await generateReminders(new Date('2030-01-02T11:45:00Z')),1);assert.equal(await generateReminders(new Date('2030-01-02T11:45:00Z')),0);
    assert.equal(await db.whatsapp_outbox.count({where:{event:'reminder'}}),1);assert.equal(await db.notifications.count({where:{target_user_id:film.id,title:'Hora de preparar os equipamentos'}}),1);
  });
  await t.test('editing and cancellation preserve history, equipment and actual delivery status',async()=>{
    let response=await app.inject({method:'POST',url:'/api/rpc/save_visit',headers:{cookie:adminCookie},payload:{visit_id:visitId,payload:{...visit(),assigned_to:manager.id,delivery_deadline:'2030-01-04'}}});assert.equal(response.statusCode,200,response.body);
    let task=await db.tasks.findFirstOrThrow({where:{visit_id:visitId}});assert.equal(task.assigned_to,manager.id);assert.equal(task.due_date,'2030-01-04');assert.equal((await db.filmmaker_visits.findUniqueOrThrow({where:{id:visitId}})).reminder_sent,false);
    assert.equal((await app.inject({method:'POST',url:'/api/rpc/move_visit',headers:{cookie:otherCookie},payload:{target_visit:visitId,scheduled_at:'2030-01-02T13:00:00.000Z'}})).statusCode,403);
    response=await app.inject({method:'POST',url:'/api/rpc/move_visit',headers:{cookie:managerCookie},payload:{target_visit:visitId,scheduled_at:'2030-01-02T13:00:00.000Z'}});assert.equal(response.statusCode,200,response.body);assert.equal(await db.visit_equipment.count({where:{visit_id:visitId}}),1);
    response=await app.inject({method:'POST',url:'/api/rpc/save_visit',headers:{cookie:adminCookie},payload:{visit_id:visitId,payload:{...visit(),status:'cancelada'}}});assert.equal(response.statusCode,200,response.body);
    task=await db.tasks.findFirstOrThrow({where:{visit_id:visitId}});assert.equal(task.cancelled,true);assert.equal(task.status,'a_fazer');assert.equal((await query(adminCookie,{table:'tasks'})).json().data.length,0);
  });
  await t.test('uploaded files stay private, signed URLs work and path traversal is rejected',async()=>{
    const path=`${clientId}/arquivos/document.txt`,form=new FormData();form.set('file',new Blob(['conteúdo privado'],{type:'text/plain'}),'document.txt');form.set('upsert','false');
    const request=new Request('http://localhost/upload',{method:'POST',body:form});const payload=Buffer.from(await request.arrayBuffer());
    const response=await app.inject({method:'POST',url:`/api/storage/client-files/${path}`,headers:{cookie:adminCookie,'content-type':request.headers.get('content-type')!},payload});assert.equal(response.statusCode,200,response.body);
    assert.equal((await app.inject({url:`/api/storage/client-files/${path}`})).statusCode,401);
    const authorized=await app.inject({url:`/api/storage/client-files/${path}`,headers:{cookie:filmCookie}});assert.equal(authorized.statusCode,200,authorized.body);assert.equal(authorized.body,'conteúdo privado');assert.match(authorized.headers['cache-control'] as string,/private/);
    const signed=await app.inject({method:'POST',url:'/api/storage/sign',headers:{cookie:adminCookie},payload:{bucket:'client-files',path,expiresIn:60}});const url=new URL(signed.json().signedUrl);assert.equal((await app.inject({url:url.pathname+url.search})).statusCode,200);
    assert.throws(()=>validatePath('client-files','../secret'));assert.throws(()=>validatePath('client-files','a/../../secret'));assert.throws(()=>validatePath('database_export','secret'));
  });
  await t.test('application export excludes managed login credentials and portable import preserves privileges',async()=>{
    const response=await app.inject({method:'POST',url:'/api/functions/application-backup',headers:{cookie:adminCookie},payload:{action:'export'}});assert.equal(response.statusCode,200,response.body);const backup=response.json();assert.equal(backup.credentialsFormat,'utf8-v1');assert.equal(backup.users.length,4);assert.ok(!response.body.includes('password_hash'));assert.ok(!response.body.includes('token_hash'));
    const restoredFiles=[];for(const file of backup.files){const url=new URL(file.url),download=await app.inject({url:url.pathname+url.search});restoredFiles.push({path:file.path,type:download.headers['content-type'],data:download.rawPayload.toString('base64')});}
    backup.files=restoredFiles;const imported=await app.inject({method:'POST',url:'/api/functions/application-backup',headers:{cookie:adminCookie},payload:{action:'import',backup}});assert.equal(imported.statusCode,200,imported.body);assert.equal(await db.user_roles.count({where:{user_id:admin.id,role:'admin'}}),1);
  });
  await t.test('activation links are single-use and deactivation revokes already issued sessions',async authTest=>{
    const token=randomBytes(32).toString('base64url');await db.auth_users.update({where:{id:colleague.id},data:{password_hash:null}});await db.auth_activation_tokens.create({data:{user_id:colleague.id,token_hash:hashToken(token),expires_at:new Date(Date.now()+60000)}});
    // Even a successful dummy comparison must never authenticate a pending account.
    const dummy=authTest.mock.method(bcrypt,'compare',async()=>true);
    try { assert.equal((await app.inject({method:'POST',url:'/api/auth/login',payload:{email:colleague.email,password:fixturePassword}})).statusCode,401); }
    finally { dummy.mock.restore(); }
    const payload={token,password:'Synthetic-new-password-12345'};let response=await app.inject({method:'POST',url:'/api/auth/activate',payload});assert.equal(response.statusCode,200,response.body);response=await app.inject({method:'POST',url:'/api/auth/activate',payload});assert.equal(response.statusCode,401);
    const cookie=await login(colleague.email,payload.password);assert.equal((await app.inject({method:'POST',url:'/api/functions/deactivate-user',headers:{cookie:adminCookie},payload:{user_id:admin.id}})).statusCode,400);
    response=await app.inject({method:'POST',url:'/api/functions/deactivate-user',headers:{cookie:adminCookie},payload:{user_id:colleague.id}});assert.equal(response.statusCode,200,response.body);assert.equal((await query(cookie,{table:'clients'})).statusCode,401);assert.equal((await query(otherCookie,{table:'clients'})).statusCode,401);assert.equal(await db.profiles.count({where:{user_id:colleague.id}}),1);
    assert.equal((await app.inject({method:'POST',url:'/api/auth/login',payload:{email:colleague.email,password:payload.password}})).statusCode,401);
  });
});
test.after(async()=>{await app.close();await db.$disconnect();await rm(directory,{recursive:true,force:true});});
