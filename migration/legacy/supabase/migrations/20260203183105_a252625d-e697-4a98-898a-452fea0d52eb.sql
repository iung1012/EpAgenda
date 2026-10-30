-- Create task_templates table with link field
CREATE TABLE public.task_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  priority public.task_priority NOT NULL DEFAULT 'media',
  link TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view templates
CREATE POLICY "Authenticated users can view templates"
ON public.task_templates
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Users can create their own templates
CREATE POLICY "Users can create templates"
ON public.task_templates
FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Users can update own templates, admins/managers can update any
CREATE POLICY "Users can update own templates"
ON public.task_templates
FOR UPDATE
USING (auth.uid() = created_by OR is_admin_or_manager(auth.uid()));

-- Users can delete own templates, admins/managers can delete any
CREATE POLICY "Users can delete own templates"
ON public.task_templates
FOR DELETE
USING (auth.uid() = created_by OR is_admin_or_manager(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_task_templates_updated_at
BEFORE UPDATE ON public.task_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();