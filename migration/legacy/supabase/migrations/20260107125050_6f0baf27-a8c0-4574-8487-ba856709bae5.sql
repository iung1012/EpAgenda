-- Criar bucket para arquivos de clientes
INSERT INTO storage.buckets (id, name, public) VALUES ('client-files', 'client-files', true);

-- Políticas de storage para client-files
CREATE POLICY "Authenticated users can view client files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'client-files');

CREATE POLICY "Authenticated users can upload client files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'client-files');

CREATE POLICY "Admins and managers can update client files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'client-files' AND public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Admins and managers can delete client files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'client-files' AND public.is_admin_or_manager(auth.uid()));