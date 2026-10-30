import type { FastifyBaseLogger } from 'fastify';
import { db } from './db.ts';
import { queueCalendarMessage } from './outbox.ts';
import { secret,config } from './config.ts';
import { emitChange } from './events.ts';
import sendWhatsapp from './integrations/whatsapp-send.js';
let running=false;
export async function generateReminders(now=new Date()){
  const notifications=await db.$transaction(async tx=>{
    const visits=await tx.filmmaker_visits.findMany({where:{status:'agendada',reminder_sent:false,visit_date:{gte:now.toISOString(),lte:new Date(now.getTime()+20*60000).toISOString()}}});
    const created=[];
    for(const visit of visits){
      const claimed=await tx.filmmaker_visits.updateMany({where:{id:visit.id,reminder_sent:false},data:{reminder_sent:true,updated_at:now.toISOString()}});
      if(!claimed.count)continue;
      const hora=new Date(visit.visit_date).toLocaleTimeString('pt-BR',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit'});
      created.push(await tx.notifications.create({data:{title:'Hora de preparar os equipamentos',message:`Sua visita "${visit.title}" começa às ${hora}. Prepare os equipamentos antes de sair.`,created_by:visit.filmmaker_id,target_user_id:visit.assigned_to||visit.filmmaker_id,created_at:now.toISOString()}}));
      await queueCalendarMessage(tx,'reminder',visit);
    }
    return created;
  });
  for(const row of notifications)await emitChange({table:'notifications',eventType:'INSERT',new:row,old:{}});
  return notifications.length;
}
export async function processOutbox(log:Pick<FastifyBaseLogger,'error'>){
  const rows=await db.whatsapp_outbox.findMany({where:{sent_at:null,available_at:{lte:new Date().toISOString()},attempts:{lt:8}},orderBy:{available_at:'asc'},take:20});
  for(const row of rows){
    try{
      const response=await sendWhatsapp(new Request(`${config.origin}/api/functions/whatsapp-send`,{method:'POST',headers:{'Content-Type':'application/json','x-internal-secret':secret('CRON_SECRET')},body:JSON.stringify({event:row.event,message:row.message})}));
      if(!response||!response.ok)throw new Error(`Falha na integração: ${response?.status}`);
      const result=await response.json() as {sent?:number;skipped?:string;failures?:{body?:unknown}[]};
      if(result.skipped?.includes('não conectada')){await db.whatsapp_outbox.update({where:{id:row.id},data:{available_at:new Date(Date.now()+60000).toISOString(),last_error:result.skipped}});continue;}
      if(result.failures?.length){
        const pending=result.failures.some(failure=>/pendente|PENDING/i.test(String(failure.body)));
        if(pending){await db.whatsapp_outbox.update({where:{id:row.id},data:{attempts:8,last_error:'Entrega pendente no provedor; conferir o histórico antes de reenviar'}});continue;}
        throw new Error('O provedor recusou uma ou mais mensagens; consulte o histórico de envios');
      }
      await db.whatsapp_outbox.update({where:{id:row.id},data:{sent_at:new Date().toISOString(),last_error:null,attempts:row.attempts+1}});
    }catch(error){
      const attempts=row.attempts+1;await db.whatsapp_outbox.update({where:{id:row.id},data:{attempts,last_error:error instanceof Error?error.message:'Falha de envio',available_at:new Date(Date.now()+Math.min(3600000,60000*2**attempts)).toISOString()}});
      log.error({id:row.id,error:error instanceof Error?error.message:'Falha'},'WhatsApp delivery failed');
    }
  }
}
export function startJobs(log:FastifyBaseLogger){
  const run=async()=>{if(running)return;running=true;try{await generateReminders();await processOutbox(log);await db.auth_sessions.deleteMany({where:{expires_at:{lt:new Date()}}});}catch(error){log.error({err:error},'Scheduled jobs failed');}finally{running=false;}};
  void run();const timer=setInterval(()=>void run(),60000);timer.unref();
}
