CREATE TABLE public.whatsapp_message_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event text,
  phone text NOT NULL,
  recipient_label text,
  message text NOT NULL,
  provider_status text,
  provider_message_id text,
  remote_jid text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.whatsapp_message_logs TO authenticated;
GRANT ALL ON public.whatsapp_message_logs TO service_role;

ALTER TABLE public.whatsapp_message_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and managers can view whatsapp logs"
ON public.whatsapp_message_logs
FOR SELECT
TO authenticated
USING (public.is_admin_or_manager(auth.uid()));

CREATE INDEX whatsapp_message_logs_created_at_idx ON public.whatsapp_message_logs (created_at DESC);