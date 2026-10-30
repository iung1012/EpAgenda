import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import staticFiles from '@fastify/static';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import { z } from 'zod';
import { config,HttpError,secret } from './config.ts';
import { db } from './db.ts';
import { registerAuth,requireActor,authenticate } from './auth.ts';
import { executeQuery } from './query.ts';
import { registerStorage } from './storage.ts';
import { registerEvents } from './events.ts';
import { registerBackup } from './backup.ts';
import { registerVisits } from './visits.ts';
import { integrationContext } from './context.ts';

process.env.APP_INTERNAL_URL ||= `http://127.0.0.1:${config.port}`;
process.env.INTERNAL_SERVICE_KEY ||= 'local-server-only';
process.env.INTERNAL_PUBLIC_MARKER ||= 'http-only-cookie';
export async function buildApp(){
  secret('CREDENTIALS_KEY');secret('FILE_SIGNING_KEY');secret('CRON_SECRET');
  const app=Fastify({logger:process.env.NODE_ENV==='test'?false:{serializers:{req(req){return {method:req.method,url:req.url.split('?')[0],remoteAddress:req.ip};}}},trustProxy:'127.0.0.1',bodyLimit:2_000_000});
  await app.register(cookie);
  await app.register(multipart,{limits:{files:1,fileSize:5*1024*1024,fields:3}});
  await app.register(helmet,{contentSecurityPolicy:{directives:{defaultSrc:["'self'"],scriptSrc:["'self'",'https://static.elfsight.com'],styleSrc:["'self'","'unsafe-inline'"],imgSrc:["'self'",'data:','https:'],connectSrc:["'self'",'https://brasilapi.com.br','https://date.nager.at'],frameSrc:["'self'",'https://drive.google.com','https://docs.google.com'],mediaSrc:["'self'",'blob:'],fontSrc:["'self'",'data:'],objectSrc:["'none'"],baseUri:["'self'"],formAction:["'self'"]}}});
  await app.register(rateLimit,{max:300,timeWindow:'1 minute'});
  app.addHook('onRequest',async req=>{
    if(!req.url.startsWith('/api/')||['GET','HEAD','OPTIONS'].includes(req.method))return;
    const origin=req.headers.origin;
    if(origin&&origin!==config.origin)throw new HttpError(403,'Origem da requisição não permitida');
    if(req.headers['sec-fetch-site']==='cross-site')throw new HttpError(403,'Origem da requisição não permitida');
  });
  app.setErrorHandler((error,req,reply)=>{
    const known=error as {statusCode?:number;code?:string;message?:string};
    const status=error instanceof z.ZodError?400:known.statusCode??(known.code==='P2002'?409:known.code==='P2003'?400:500);
    if(status>=500)req.log.error({err:error},'request failed');
    const message=error instanceof z.ZodError?'Dados inválidos':status>=500?'Não foi possível concluir a operação':known.code==='P2002'?'Registro já existe':known.code==='P2003'?'Vínculo com registro inexistente':known.message;
    reply.code(status).send({error:message});
  });
  app.get('/api/health',async()=>{await db.$queryRaw`SELECT 1`;return {status:'ok',database:'sqlite',dataImported:existsSync(resolve(config.dataDir,'migration-report.json'))};});
  await registerAuth(app);
  app.post('/api/query',async req=>executeQuery(req.body,await requireActor(req)));
  await registerStorage(app);await registerEvents(app);await registerBackup(app);await registerVisits(app);
  const integrations:Record<string,()=>Promise<{default:(request:Request)=>Promise<Response|undefined>}>>={
    'google-drive':()=>import('./integrations/google-drive.js'),
    'whatsapp-send':()=>import('./integrations/whatsapp-send.js'),
    'whatsapp-connect':()=>import('./integrations/whatsapp-connect.js'),
    'whatsapp-status':()=>import('./integrations/whatsapp-status.js'),
    'whatsapp-disconnect':()=>import('./integrations/whatsapp-disconnect.js'),
    'whatsapp-webhook':()=>import('./integrations/whatsapp-webhook.js'),
    'whatsapp-ai':()=>import('./integrations/whatsapp-ai.js'),
  };
  app.route<{Params:{name:string};Querystring:{action?:string}}>({method:['GET','POST','OPTIONS'],url:'/api/functions/:name',handler:async(req,reply)=>{
    const {name}=req.params;if(!Object.hasOwn(integrations,name))throw new HttpError(404,'Integração não encontrada');
    const isStream=name==='google-drive'&&req.query.action==='stream';
    const internal=['whatsapp-send','whatsapp-ai'].includes(name)&&req.headers['x-internal-secret']===secret('CRON_SECRET');
    const actor=isStream||name==='whatsapp-webhook'||internal?await authenticate(req):await requireActor(req);
    const {default:handler}=await integrations[name]();
    const headers=new Headers();for(const [key,value]of Object.entries(req.headers))if(value)headers.set(key,Array.isArray(value)?value.join(','):value);
    const request=new Request(new URL(req.url,config.origin),{method:req.method,headers,body:['GET','HEAD'].includes(req.method)?undefined:JSON.stringify(req.body??{})});
    const result=await integrationContext.run({actor},()=>handler(request));
    if(!result)throw new HttpError(500,'A integração não produziu uma resposta');
    reply.code(result.status);
    for(const [key,value]of result.headers)if(!['access-control-allow-origin','access-control-allow-headers','content-length'].includes(key.toLowerCase()))reply.header(key,value);
    if(result.body)return reply.send(result.body);
    return reply.send();
  }});
  const dist=resolve(import.meta.dirname,'../../dist');
  await app.register(staticFiles,{root:resolve(dist,'assets'),prefix:'/assets/',decorateReply:true});
  for(const file of ['favicon.ico','favicon.png','robots.txt','placeholder.svg'])app.get(`/${file}`,async (_req,reply)=>reply.sendFile(file,dist));
  app.setNotFoundHandler((req,reply)=>{
    if(req.url.startsWith('/api/')||!['GET','HEAD'].includes(req.method))return reply.code(404).send({error:'Não encontrado'});
    if(existsSync(resolve(dist,'index.html')))return reply.sendFile('index.html',dist);
    return reply.code(503).send({error:'A interface ainda está sendo preparada'});
  });
  return app;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const app=await buildApp();
  await db.$queryRawUnsafe('PRAGMA journal_mode=WAL');
  await db.$queryRawUnsafe('PRAGMA busy_timeout=5000');
  await app.listen({host:config.host,port:config.port});
  if(process.env.ENABLE_JOBS==='1'){const {startJobs}=await import('./jobs.ts');startJobs(app.log);}
  for(const signal of ['SIGINT','SIGTERM'] as const)process.on(signal,async()=>{await app.close();await db.$disconnect();process.exit(0);});
}
