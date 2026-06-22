-- Visitas: persistir responsável, prazo de entrega e flag de lembrete
ALTER TABLE public.filmmaker_visits
  ADD COLUMN IF NOT EXISTS assigned_to uuid,
  ADD COLUMN IF NOT EXISTS delivery_deadline date,
  ADD COLUMN IF NOT EXISTS reminder_sent boolean NOT NULL DEFAULT false;

-- Tarefas: vínculo com a visita de origem + exclusão em cascata
-- (excluir a visita remove automaticamente a tarefa gerada)
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS visit_id uuid
  REFERENCES public.filmmaker_visits(id) ON DELETE CASCADE;

-- Clientes: arquivamento (não destrutivo)
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;
