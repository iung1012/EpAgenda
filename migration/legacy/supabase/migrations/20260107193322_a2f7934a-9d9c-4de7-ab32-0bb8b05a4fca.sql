-- Create table to link clients with their Google Drive folders
CREATE TABLE public.client_drive_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  folder_id TEXT NOT NULL,
  folder_name TEXT NOT NULL,
  folder_type TEXT DEFAULT 'geral',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.client_drive_folders ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view drive folders"
ON public.client_drive_folders FOR SELECT
USING (true);

CREATE POLICY "Users can create drive folders"
ON public.client_drive_folders FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own or admin can update"
ON public.client_drive_folders FOR UPDATE
USING (auth.uid() = created_by OR is_admin_or_manager(auth.uid()));

CREATE POLICY "Admins and managers can delete drive folders"
ON public.client_drive_folders FOR DELETE
USING (is_admin_or_manager(auth.uid()));