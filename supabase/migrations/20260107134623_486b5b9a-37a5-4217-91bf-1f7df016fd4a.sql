-- Create equipment table (fixed list)
CREATE TABLE public.equipment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;

-- Everyone can view equipment
CREATE POLICY "Anyone can view equipment"
ON public.equipment FOR SELECT
USING (true);

-- Only admins can manage equipment
CREATE POLICY "Admins can manage equipment"
ON public.equipment FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Create filmmaker visits table
CREATE TABLE public.filmmaker_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  filmmaker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  visit_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'agendada' CHECK (status IN ('agendada', 'realizada', 'cancelada')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.filmmaker_visits ENABLE ROW LEVEL SECURITY;

-- Filmmakers can view their own visits, managers and admins can view all
CREATE POLICY "Filmmakers view own visits, managers view all"
ON public.filmmaker_visits FOR SELECT
USING (
  filmmaker_id = auth.uid() 
  OR is_admin_or_manager(auth.uid())
);

-- Filmmakers can create their own visits
CREATE POLICY "Filmmakers can create own visits"
ON public.filmmaker_visits FOR INSERT
WITH CHECK (filmmaker_id = auth.uid());

-- Filmmakers can update their own visits, managers can update all
CREATE POLICY "Filmmakers can update own visits"
ON public.filmmaker_visits FOR UPDATE
USING (
  filmmaker_id = auth.uid() 
  OR is_admin_or_manager(auth.uid())
);

-- Only admins and managers can delete visits
CREATE POLICY "Admins and managers can delete visits"
ON public.filmmaker_visits FOR DELETE
USING (is_admin_or_manager(auth.uid()));

-- Create visit equipment junction table
CREATE TABLE public.visit_equipment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visit_id UUID NOT NULL REFERENCES public.filmmaker_visits(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  UNIQUE(visit_id, equipment_id)
);

-- Enable RLS
ALTER TABLE public.visit_equipment ENABLE ROW LEVEL SECURITY;

-- Same policies as visits
CREATE POLICY "View equipment for accessible visits"
ON public.visit_equipment FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.filmmaker_visits 
    WHERE id = visit_id 
    AND (filmmaker_id = auth.uid() OR is_admin_or_manager(auth.uid()))
  )
);

CREATE POLICY "Insert equipment for own visits"
ON public.visit_equipment FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.filmmaker_visits 
    WHERE id = visit_id 
    AND filmmaker_id = auth.uid()
  )
);

CREATE POLICY "Delete equipment for accessible visits"
ON public.visit_equipment FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.filmmaker_visits 
    WHERE id = visit_id 
    AND (filmmaker_id = auth.uid() OR is_admin_or_manager(auth.uid()))
  )
);

-- Create filmmaker demands table
CREATE TABLE public.filmmaker_demands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  filmmaker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  visit_id UUID REFERENCES public.filmmaker_visits(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'em_processo' CHECK (status IN ('em_processo', 'terminado', 'alteracoes')),
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.filmmaker_demands ENABLE ROW LEVEL SECURITY;

-- Filmmakers can view their own demands, managers and admins can view all
CREATE POLICY "Filmmakers view own demands, managers view all"
ON public.filmmaker_demands FOR SELECT
USING (
  filmmaker_id = auth.uid() 
  OR is_admin_or_manager(auth.uid())
);

-- Filmmakers can create their own demands
CREATE POLICY "Filmmakers can create own demands"
ON public.filmmaker_demands FOR INSERT
WITH CHECK (filmmaker_id = auth.uid());

-- Filmmakers can update their own demands, managers can update all
CREATE POLICY "Filmmakers can update own demands"
ON public.filmmaker_demands FOR UPDATE
USING (
  filmmaker_id = auth.uid() 
  OR is_admin_or_manager(auth.uid())
);

-- Only admins and managers can delete demands
CREATE POLICY "Admins and managers can delete demands"
ON public.filmmaker_demands FOR DELETE
USING (is_admin_or_manager(auth.uid()));

-- Add update triggers
CREATE TRIGGER update_filmmaker_visits_updated_at
BEFORE UPDATE ON public.filmmaker_visits
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_filmmaker_demands_updated_at
BEFORE UPDATE ON public.filmmaker_demands
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default equipment
INSERT INTO public.equipment (name, description) VALUES
('Câmera Principal', 'Câmera principal de filmagem'),
('Câmera Secundária', 'Câmera secundária/backup'),
('Tripé', 'Tripé para câmera'),
('Gimbal', 'Estabilizador gimbal'),
('Drone', 'Drone para filmagens aéreas'),
('Iluminação LED', 'Kit de iluminação LED'),
('Microfone Lapela', 'Microfone de lapela wireless'),
('Microfone Boom', 'Microfone boom/shotgun'),
('Gravador de Áudio', 'Gravador de áudio externo'),
('Cartões de Memória', 'Kit de cartões de memória'),
('Baterias Extras', 'Baterias extras para equipamentos'),
('HD Externo', 'HD externo para backup');