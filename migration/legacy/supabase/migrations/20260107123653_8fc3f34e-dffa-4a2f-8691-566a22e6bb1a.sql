-- Corrigir políticas restantes para tasks e calendar_events
DROP POLICY IF EXISTS "Users can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can create events" ON public.calendar_events;

-- Políticas mais restritivas para tasks
CREATE POLICY "Users can create tasks" ON public.tasks
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

-- Políticas mais restritivas para calendar_events
CREATE POLICY "Users can create events" ON public.calendar_events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);