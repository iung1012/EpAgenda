CREATE TABLE public.whatsapp_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_name TEXT,
  status TEXT NOT NULL DEFAULT 'disconnected',
  phone_connected TEXT,
  notify_on_create BOOLEAN NOT NULL DEFAULT true,
  notify_on_update BOOLEAN NOT NULL DEFAULT true,
  notify_on_cancel BOOLEAN NOT NULL DEFAULT true,
  notify_on_reminder BOOLEAN NOT NULL DEFAULT true,
  singleton BOOLEAN NOT NULL DEFAULT true UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_config TO authenticated;
GRANT ALL ON public.whatsapp_config TO service_role;
ALTER TABLE public.whatsapp_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins_manage_whatsapp_config" ON public.whatsapp_config
  FOR ALL TO authenticated
  USING (public.is_admin_or_manager(auth.uid()))
  WITH CHECK (public.is_admin_or_manager(auth.uid()));

CREATE TRIGGER update_whatsapp_config_updated_at
  BEFORE UPDATE ON public.whatsapp_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.whatsapp_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_recipients TO authenticated;
GRANT ALL ON public.whatsapp_recipients TO service_role;
ALTER TABLE public.whatsapp_recipients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins_manage_whatsapp_recipients" ON public.whatsapp_recipients
  FOR ALL TO authenticated
  USING (public.is_admin_or_manager(auth.uid()))
  WITH CHECK (public.is_admin_or_manager(auth.uid()));

CREATE TRIGGER update_whatsapp_recipients_updated_at
  BEFORE UPDATE ON public.whatsapp_recipients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.whatsapp_config (singleton) VALUES (true) ON CONFLICT DO NOTHING;