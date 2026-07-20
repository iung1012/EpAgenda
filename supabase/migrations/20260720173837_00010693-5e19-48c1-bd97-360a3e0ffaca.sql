
CREATE TABLE public.whatsapp_ai_messages (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  role text not null check (role in ('user','assistant','system','tool')),
  content text,
  tool_calls jsonb,
  tool_call_id text,
  name text,
  created_at timestamptz not null default now()
);
CREATE INDEX ON public.whatsapp_ai_messages (phone, created_at);
GRANT ALL ON public.whatsapp_ai_messages TO service_role;
ALTER TABLE public.whatsapp_ai_messages ENABLE ROW LEVEL SECURITY;
-- No policies: only service_role (edge functions) reads/writes this table.
