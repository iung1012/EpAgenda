import { mkdir, readFile, writeFile, rename, rm, stat } from 'node:fs/promises';
import { resolve, sep, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from './db.ts';
import { config, HttpError } from './config.ts';
import { requireActor, authenticate, isManager, type Actor } from './auth.ts';
import { signFile, verifyFile } from './crypto.ts';

export const uploadRoot = resolve(config.dataDir, 'uploads');
export function validatePath(bucket: string, path: string) {
  if (bucket !== 'client-files' || !path || path.length > 1024 || path.includes('\\') || path.includes('\0') || path.split('/').some(part => !part || part === '.' || part === '..')) throw new HttpError(400, 'Caminho de arquivo inválido');
  const file = resolve(uploadRoot, bucket, path);
  if (!file.startsWith(`${resolve(uploadRoot,bucket)}${sep}`)) throw new HttpError(400, 'Caminho de arquivo inválido');
  return file;
}
export const fileUrl = (bucket: string,path: string) => `${config.origin}/api/storage/${encodeURIComponent(bucket)}/${path.split('/').map(encodeURIComponent).join('/')}`;
export async function storeFile(bucket: string,path: string, bytes: Buffer,type: string,actor: Actor | null,upsert=false) {
  const file=validatePath(bucket,path);
  const existing=await db.storage_objects.findUnique({where:{bucket_path:{bucket,path}}});
  if(existing&&(!upsert||(actor&&existing.owner_id!==actor.id&&!isManager(actor)))) throw new HttpError(409,'Arquivo já existe ou não pode ser substituído');
  await mkdir(dirname(file),{recursive:true,mode:0o700});
  const temporary=`${file}.${randomUUID()}.tmp`;
  await writeFile(temporary,bytes,{mode:0o600});
  const previous=existing?await readFile(file):null;
  try {
    await db.$transaction(async tx=>{
      await rename(temporary,file);
      await tx.storage_objects.upsert({where:{bucket_path:{bucket,path}},create:{bucket,path,owner_id:actor?.id??null,mime_type:type,size:bytes.length,created_at:new Date().toISOString()},update:{mime_type:type,size:bytes.length}});
    });
  } catch(error){
    if(previous) await writeFile(file,previous,{mode:0o600}); else await rm(file,{force:true});
    await rm(temporary,{force:true}); throw error;
  }
  return {path};
}
export async function registerStorage(app: FastifyInstance) {
  app.post('/api/storage/sign',async req=>{
    await requireActor(req);
    const {bucket,path,expiresIn}=z.object({bucket:z.literal('client-files'),path:z.string(),expiresIn:z.number().int().min(1).max(3600)}).parse(req.body);
    validatePath(bucket,path);
    if(!await db.storage_objects.findUnique({where:{bucket_path:{bucket,path}}})) throw new HttpError(404,'Arquivo não encontrado');
    return {signedUrl:`${fileUrl(bucket,path)}?token=${encodeURIComponent(signFile(bucket,path,expiresIn))}`};
  });
  app.post('/api/storage/remove',async req=>{
    const actor=await requireActor(req);
    const {bucket,paths}=z.object({bucket:z.literal('client-files'),paths:z.array(z.string()).max(100)}).parse(req.body);
    for(const path of paths){
      const file=validatePath(bucket,path);
      const row=await db.storage_objects.findUnique({where:{bucket_path:{bucket,path}}});
      if(row&&row.owner_id!==actor.id&&!isManager(actor)) throw new HttpError(403,'Sem permissão para remover arquivo');
      await db.storage_objects.deleteMany({where:{bucket,path}}); await rm(file,{force:true});
    }
    return {ok:true};
  });
  app.post<{Params:{bucket:string;'*':string}}>('/api/storage/:bucket/*',async req=>{
    const actor=await requireActor(req);
    const {bucket,'*':path}=req.params; validatePath(bucket,path);
    const parts=req.parts(); let bytes:Buffer|undefined,type='application/octet-stream',upsert=false;
    for await(const part of parts){
      if(part.type==='file'){ if(bytes) throw new HttpError(400,'Envie um arquivo por vez'); bytes=await part.toBuffer(); type=part.mimetype; }
      else if(part.fieldname==='upsert') upsert=part.value==='true';
    }
    if(!bytes||bytes.length>5*1024*1024) throw new HttpError(413,'Envie um arquivo de até 5 MB');
    return storeFile(bucket,path,bytes,type,actor,upsert);
  });
  app.get<{Params:{bucket:string;'*':string};Querystring:{token?:string}}>('/api/storage/:bucket/*',async(req,reply)=>{
    const {bucket,'*':path}=req.params;
    const file=validatePath(bucket,path);
    if(!(req.query.token&&verifyFile(req.query.token,bucket,path))&&!await authenticate(req)) throw new HttpError(401,'Entre novamente no sistema');
    const row=await db.storage_objects.findUnique({where:{bucket_path:{bucket,path}}});
    if(!row) throw new HttpError(404,'Arquivo não encontrado');
    await stat(file).catch(()=>{throw new HttpError(404,'Arquivo não encontrado');});
    const safe=/^(image\/(png|jpeg|gif|webp|avif)|video\/(mp4|webm|quicktime)|audio\/(mpeg|mp4|ogg|wav)|application\/pdf)$/.test(row.mime_type);
    reply.header('Content-Type',safe?row.mime_type:'application/octet-stream').header('Cache-Control','private, no-store').header('Content-Security-Policy',"sandbox; default-src 'none'");
    if(!safe) reply.header('Content-Disposition',`attachment; filename*=UTF-8''${encodeURIComponent(path.split('/').at(-1)!)}`);
    return reply.sendFile(`${bucket}/${path}`,uploadRoot,{cacheControl:false,etag:false,lastModified:false});
  });
}
