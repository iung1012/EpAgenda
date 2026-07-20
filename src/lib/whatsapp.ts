import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export type WhatsappEvent = 'create' | 'update' | 'cancel' | 'reminder';

interface VisitLike {
  title: string;
  visit_date: string;
  location?: string | null;
  clientName?: string | null;
  assignedName?: string | null;
}

export function buildVisitMessage(event: WhatsappEvent, visit: VisitLike) {
  const when = (() => {
    const d = new Date(visit.visit_date);
    if (isNaN(d.getTime())) return visit.visit_date;
    return format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  })();
  const parts: string[] = [];
  const header =
    event === 'create' ? '📅 *Nova visita agendada*'
    : event === 'update' ? '✏️ *Visita atualizada*'
    : event === 'cancel' ? '❌ *Visita cancelada*'
    : '⏰ *Lembrete de visita*';
  parts.push(header);
  parts.push(`*${visit.title}*`);
  parts.push(`🗓️ ${when}`);
  if (visit.clientName) parts.push(`👤 Cliente: ${visit.clientName}`);
  if (visit.location) parts.push(`📍 ${visit.location}`);
  if (visit.assignedName) parts.push(`🎬 Responsável: ${visit.assignedName}`);
  return parts.join('\n');
}

export async function sendWhatsappNotification(event: WhatsappEvent, visit: VisitLike) {
  try {
    const message = buildVisitMessage(event, visit);
    await supabase.functions.invoke('whatsapp-send', {
      body: { event, message },
    });
  } catch (err) {
    // Never break the UI flow because of WhatsApp errors
    console.warn('[whatsapp] send failed', err);
  }
}