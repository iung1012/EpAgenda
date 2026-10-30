import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { db } from './db.ts';
import { isManager,requireActor,type Actor } from './auth.ts';
import { HttpError } from './config.ts';
import { queueCalendarMessage } from './outbox.ts';
import { emitChange } from './events.ts';

const payloadSchema=z.object({title:z.string().trim().min(1).max(100),description:z.string().max(500).nullable().optional(),location:z.string().max(200).nullable().optional(),visit_date:z.string().datetime({offset:true}),client_id:z.union([z.string().uuid(),z.literal('')]).nullable().optional(),status:z.enum(['agendada','realizada','cancelada']),notes:z.string().max(1000).nullable().optional(),equipment_ids:z.array(z.string().uuid()).max(100),assigned_to:z.string().uuid(),delivery_deadline:z.string().regex(/^\d{4}-\d{2}-\d{2}$/)});
function mayEdit(actor:Actor,visit:{filmmaker_id:string;assigned_to:string|null}){
  if(!isManager(actor)&&visit.filmmaker_id!==actor.id&&visit.assigned_to!==actor.id)throw new HttpError(403,'Sem permissão para editar esta visita');
}
export async function saveVisit(input:unknown,actor:Actor){
  const {payload,visit_id}=z.object({payload:payloadSchema,visit_id:z.string().uuid().nullable().default(null)}).parse(input);
  const scheduled=new Date(payload.visit_date).toISOString();
  const localDate=new Date(scheduled).toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'});
  if(payload.delivery_deadline<localDate)throw new HttpError(400,'O prazo não pode ser anterior à visita');
  const result=await db.$transaction(async tx=>{
    const previous=visit_id?await tx.filmmaker_visits.findUnique({where:{id:visit_id}}):null;
    if(visit_id&&!previous)throw new HttpError(404,'Visita não encontrada');
    if(previous)mayEdit(actor,previous);else if(!isManager(actor)&&actor.role!=='filmmaker')throw new HttpError(403,'Sem permissão para criar visitas');
    if(!await tx.auth_users.findFirst({where:{id:payload.assigned_to,disabled:false,user_roles_user_id:{some:{}}}}))throw new HttpError(400,'Escolha um responsável ativo');
    const ids=[...new Set(payload.equipment_ids)];
    if(await tx.equipment.count({where:{id:{in:ids}}})!==ids.length)throw new HttpError(400,'Equipamento não encontrado');
    const now=new Date().toISOString();
    const data={title:payload.title,description:payload.description||null,location:payload.location||null,visit_date:scheduled,client_id:payload.client_id||null,status:payload.status,notes:payload.notes||null,assigned_to:payload.assigned_to,delivery_deadline:payload.delivery_deadline,updated_at:now};
    const changed=!!previous&&(previous.visit_date!==scheduled||previous.assigned_to!==payload.assigned_to||(previous.status!=='agendada'&&payload.status==='agendada'));
    const visit=previous?await tx.filmmaker_visits.update({where:{id:previous.id},data:{...data,reminder_sent:changed?false:previous.reminder_sent}}):await tx.filmmaker_visits.create({data:{...data,filmmaker_id:actor.id,created_at:now}});
    await tx.visit_equipment.deleteMany({where:{visit_id:visit.id}});
    for(const equipment_id of ids)await tx.visit_equipment.create({data:{visit_id:visit.id,equipment_id}});
    const taskData={title:`Entrega: ${visit.title}`,description:`Entrega da visita ${new Date(scheduled).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})}${visit.notes?`\n${visit.notes}`:''}`,due_date:visit.delivery_deadline,assigned_to:visit.assigned_to,client_id:visit.client_id,updated_at:now,cancelled:visit.status==='cancelada'};
    const tasks=await tx.tasks.updateMany({where:{visit_id:visit.id},data:taskData});
    if(!tasks.count&&visit.status!=='cancelada')await tx.tasks.create({data:{...taskData,visit_id:visit.id,created_by:visit.filmmaker_id,created_at:now}});
    await queueCalendarMessage(tx,visit.status==='cancelada'?'cancel':previous?'update':'create',visit);
    return {visit,previous};
  });
  await emitChange({table:'filmmaker_visits',eventType:result.previous?'UPDATE':'INSERT',old:result.previous??{},new:result.visit});
  return result.visit.id;
}
export async function registerVisits(app:FastifyInstance){
  app.post('/api/rpc/save_visit',async req=>({id:await saveVisit(req.body,await requireActor(req))}));
  app.post('/api/rpc/move_visit',async req=>{
    const actor=await requireActor(req);
    const {target_visit,scheduled_at}=z.object({target_visit:z.string().uuid(),scheduled_at:z.string().datetime({offset:true})}).parse(req.body);
    const result=await db.$transaction(async tx=>{
      const previous=await tx.filmmaker_visits.findUnique({where:{id:target_visit}});if(!previous)throw new HttpError(404,'Visita não encontrada');mayEdit(actor,previous);
      const date=new Date(scheduled_at).toISOString();
      if(previous.delivery_deadline&&previous.delivery_deadline<new Date(date).toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'}))throw new HttpError(400,'Ajuste o prazo de entrega antes de reagendar para esta data');
      const visit=await tx.filmmaker_visits.update({where:{id:target_visit},data:{visit_date:date,reminder_sent:false,updated_at:new Date().toISOString()}});
      await queueCalendarMessage(tx,'update',visit);return {visit,previous};
    });
    await emitChange({table:'filmmaker_visits',eventType:'UPDATE',old:result.previous,new:result.visit});return {id:result.visit.id};
  });
}
