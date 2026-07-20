
DROP POLICY IF EXISTS "Authenticated users can view client files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload client files" ON storage.objects;
DROP POLICY IF EXISTS "Admins and managers can update client files" ON storage.objects;
DROP POLICY IF EXISTS "Admins and managers can delete client files" ON storage.objects;

CREATE POLICY "client-files: authenticated read"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'client-files');

CREATE POLICY "client-files: authenticated upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'client-files' AND auth.uid() = owner);

CREATE POLICY "client-files: admin/manager update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'client-files' AND public.is_admin_or_manager(auth.uid()))
WITH CHECK (bucket_id = 'client-files' AND public.is_admin_or_manager(auth.uid()));

CREATE POLICY "client-files: admin/manager delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'client-files' AND public.is_admin_or_manager(auth.uid()));

DROP POLICY IF EXISTS "db-export: admin read" ON storage.objects;
DROP POLICY IF EXISTS "db-export: admin write" ON storage.objects;
DROP POLICY IF EXISTS "db-export: admin update" ON storage.objects;
DROP POLICY IF EXISTS "db-export: admin delete" ON storage.objects;

CREATE POLICY "db-export: admin read"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'database_export_20_07_26' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "db-export: admin write"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'database_export_20_07_26' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "db-export: admin update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'database_export_20_07_26' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'database_export_20_07_26' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "db-export: admin delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'database_export_20_07_26' AND public.has_role(auth.uid(), 'admin'));

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
