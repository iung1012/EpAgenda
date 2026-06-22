import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Janela de antecedência do lembrete (minutos antes da visita)
const REMINDER_WINDOW_MIN = 20;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const expectedSecret = Deno.env.get('CRON_SECRET');
    const callerSecret = req.headers.get('x-cron-secret');
    if (!expectedSecret || callerSecret !== expectedSecret) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_MIN * 60 * 1000);

    console.log(`Looking for visits between ${now.toISOString()} and ${windowEnd.toISOString()}`);

    // Visitas agendadas que começam dentro da janela e ainda não notificadas
    const { data: upcomingVisits, error: fetchError } = await supabase
      .from('filmmaker_visits')
      .select('*')
      .eq('status', 'agendada')
      .eq('reminder_sent', false)
      .gte('visit_date', now.toISOString())
      .lte('visit_date', windowEnd.toISOString());

    if (fetchError) {
      console.error('Error fetching visits:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${upcomingVisits?.length || 0} visits to remind`);

    if (!upcomingVisits || upcomingVisits.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No reminders to send', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let sent = 0;

    for (const visit of upcomingVisits) {
      const targetUser = visit.assigned_to || visit.filmmaker_id;
      const hora = new Date(visit.visit_date).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo',
      });

      // created_by = quem agendou a visita. Mantê-lo diferente do target garante que o
      // push do navegador apareça (useNotifications suprime push quando created_by === user).
      const { error: notifyError } = await supabase.from('notifications').insert({
        title: 'Hora de preparar os equipamentos',
        message: `Sua visita "${visit.title}" começa às ${hora}. Confirme/preencha os equipamentos antes de sair.`,
        created_by: visit.filmmaker_id,
        target_user_id: targetUser,
      });

      if (notifyError) {
        console.error(`Error creating notification for visit ${visit.id}:`, notifyError);
        continue;
      }

      const { error: flagError } = await supabase
        .from('filmmaker_visits')
        .update({ reminder_sent: true })
        .eq('id', visit.id);

      if (flagError) {
        console.error(`Error flagging visit ${visit.id}:`, flagError);
        continue;
      }

      sent++;
      console.log(`Reminder sent for visit ${visit.id} to user ${targetUser}`);
    }

    return new Response(
      JSON.stringify({ message: 'Reminders processed', sent, totalChecked: upcomingVisits.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in visit-reminders function:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
