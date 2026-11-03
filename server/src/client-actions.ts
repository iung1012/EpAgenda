import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db, model } from './db.ts';
import { requireActor, requireManager } from './auth.ts';
import { requireOpenPostDay } from './post-days.ts';
import { queueCalendarMessage } from './outbox.ts';
import { emitChange } from './events.ts';
import { HttpError } from './config.ts';
import type { TableName } from './schema.ts';

export async function registerClientActions(app:FastifyInstance){
  app.post('/api/rpc/delete_client',async req=>{
    const actor=await requireActor(req);requireManager(actor);
    const {client_id}=z.object({client_id:z.string().uuid()}).parse(req.body);
    const client=await db.$transaction(async tx=>{
      const existing=await tx.clients.findUnique({where:{id:client_id}});if(!existing)throw new HttpError(404,'Cliente não encontrado');
      for(const post of await tx.posts.findMany({where:{client_id},select:{scheduled_date:true}}))await requireOpenPostDay(tx,post.scheduled_date);
      for(const table of ['calendar_events','filmmaker_visits'] as const){for(const row of await model(table,tx).findMany({where:{client_id}}))await queueCalendarMessage(tx,'cancel',row,table==='calendar_events'?'Evento':'Visita');}
      for(const table of ['client_passwords','client_folders','client_drive_folders','tasks','calendar_events','filmmaker_demands','filmmaker_visits'] as TableName[])await model(table,tx).deleteMany({where:{client_id}});
      await tx.clients.delete({where:{id:client_id}});return existing;
    },{timeout:30000});
    await emitChange({table:'clients',eventType:'DELETE',old:client,new:{}});
    return {ok:true};
  });
}
