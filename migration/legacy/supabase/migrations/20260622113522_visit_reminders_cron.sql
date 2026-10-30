-- Lembrete automático ao videomaker ~20 min antes da visita.
-- Requer as extensões pg_cron e pg_net habilitadas no projeto Supabase.
--
-- TODO (aplicar no painel Supabase/Lovable):
--   1. Substituir <SUPABASE_URL> pela URL do projeto (ex.: https://xxxx.supabase.co)
--   2. Substituir <SERVICE_ROLE_KEY> pela service_role key (mantenha em secret, não commite)
--
-- A função edge `visit-reminders` busca visitas agendadas nos próximos 20 min,
-- cria a notificação direcionada ao responsável e marca reminder_sent = true.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'visit-reminders-5min',
  '*/5 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://nggswlcwjtmrdubncibf.supabase.co/functions/v1/visit-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
      ),
      body := '{}'::jsonb
    );
  $$
);
