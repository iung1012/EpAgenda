-- Visitas: persistir responsável, prazo de entrega e flag de lembrete
ALTER TABLE public.filmmaker_visits
  ADD COLUMN IF NOT EXISTS assigned_to uuid,
  ADD COLUMN IF NOT EXISTS delivery_deadline date,
  ADD COLUMN IF NOT EXISTS reminder_sent boolean NOT NULL DEFAULT false;

-- Tarefas: vínculo com a visita de origem + exclusão em cascata
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS visit_id uuid
  REFERENCES public.filmmaker_visits(id) ON DELETE CASCADE;

-- Clientes: arquivamento (não destrutivo)
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;

-- Garantir que filmmaker_visits tenha RLS e GRANTs corretos
ALTER TABLE public.filmmaker_visits ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.filmmaker_visits TO authenticated;
GRANT ALL ON public.filmmaker_visits TO service_role;

-- Garantir que tasks tenha RLS e GRANTs corretos
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;

-- Garantir que clients tenha RLS e GRANTs corretos
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;

-- Política de update para todos autenticados (para postagens fixas)
DROP POLICY IF EXISTS "Authenticated can toggle clients" ON public.clients;
CREATE POLICY "Authenticated can toggle clients"
ON public.clients
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);