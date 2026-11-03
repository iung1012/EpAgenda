import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { db, type Database } from './db.ts';
import { requireActor } from './auth.ts';
import { HttpError } from './config.ts';

const dateSchema=z.iso.date();
export function postDate(value:unknown):string {
  if(typeof value!=='string'||!Number.isFinite(new Date(value).getTime())) throw new HttpError(400,'Data da postagem inválida');
  return new Date(value).toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'});
}
export async function requireOpenPostDay(database:Database,value:unknown){
  if(await database.post_day_closures.findUnique({where:{date:postDate(value)}}))throw new HttpError(409,'Este dia foi encerrado e não pode ser alterado');
}
export async function registerPostDays(app:FastifyInstance){
  app.post('/api/rpc/get_post_day',async req=>{await requireActor(req);const {date}=z.object({date:dateSchema}).parse(req.body);return {closed:!!await db.post_day_closures.findUnique({where:{date}})};});
  app.post('/api/rpc/close_post_day',async req=>{
    const actor=await requireActor(req);const {date}=z.object({date:dateSchema}).parse(req.body);
    await db.post_day_closures.upsert({where:{date},create:{date,closed_at:new Date().toISOString(),closed_by:actor.id},update:{}});
    return {closed:true};
  });
}
