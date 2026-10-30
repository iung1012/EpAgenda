-- Corrigir search_path nas funções
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  
  IF (SELECT COUNT(*) FROM public.user_roles) = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'colaborador');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Remover políticas permissivas e criar mais restritivas
DROP POLICY IF EXISTS "Collaborators can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can manage folders" ON public.client_folders;

-- Política mais restritiva para clients (apenas autenticados podem inserir)
CREATE POLICY "Authenticated users can insert clients" ON public.clients
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

-- Políticas mais restritivas para client_folders
CREATE POLICY "Authenticated users can insert folders" ON public.client_folders
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update own folders" ON public.client_folders
  FOR UPDATE TO authenticated USING (auth.uid() = created_by OR public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Admins and managers can delete folders" ON public.client_folders
  FOR DELETE TO authenticated USING (public.is_admin_or_manager(auth.uid()));