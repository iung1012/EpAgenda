import type { Database } from './db.ts';
import { config } from './config.ts';
import type { Row } from './schema.ts';
export async function queueCalendarMessage(database:Database,event:string,row:Row,label='Visita'){
  const title=String(row.title||label),date=String(row.visit_date||row.start_date);
  const when=new Date(date).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'});
  const header=event==='create'?'agendamento':event==='cancel'?'cancelamento':event==='reminder'?'lembrete':'atualização';
  const message=`📅 *${label}: ${header}*\n*${title}*\n🗓️ ${when}${row.location?`\n📍 ${row.location}`:''}`;
  await database.whatsapp_outbox.create({data:{event,message,available_at:new Date().toISOString()}});
}
