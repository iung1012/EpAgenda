
-- profiles: require authentication
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

-- notifications: only own / targeted / created
DROP POLICY IF EXISTS "Everyone can view notifications" ON public.notifications;
CREATE POLICY "Users view own or targeted notifications"
ON public.notifications FOR SELECT TO authenticated
USING (
  target_user_id IS NULL
  OR target_user_id = auth.uid()
  OR created_by = auth.uid()
);

-- notifications: tighten UPDATE (mark as read) to authenticated only, no anon
DROP POLICY IF EXISTS "Authenticated users can mark as read" ON public.notifications;
CREATE POLICY "Authenticated users can mark as read"
ON public.notifications FOR UPDATE TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- user_roles: own role or admin
DROP POLICY IF EXISTS "Users can view all roles" ON public.user_roles;
CREATE POLICY "Users view own role or admins view all"
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- client_drive_folders: require auth
DROP POLICY IF EXISTS "Authenticated users can view drive folders" ON public.client_drive_folders;
CREATE POLICY "Authenticated users can view drive folders"
ON public.client_drive_folders FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

-- clients: remove overpermissive UPDATE; restrict toggle to admin/manager
DROP POLICY IF EXISTS "Authenticated can toggle clients" ON public.clients;
-- existing "Users can update own clients" and ALL admin policy remain
-- Make clients SELECT require auth (was true to public)
DROP POLICY IF EXISTS "Authenticated users can view clients" ON public.clients;
CREATE POLICY "Authenticated users can view clients"
ON public.clients FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

-- tasks: remove catch-all OR auth.uid() IS NOT NULL
DROP POLICY IF EXISTS "Users can update tasks" ON public.tasks;
CREATE POLICY "Users can update tasks"
ON public.tasks FOR UPDATE TO authenticated
USING (
  auth.uid() = created_by
  OR auth.uid() = assigned_to
  OR public.is_admin_or_manager(auth.uid())
)
WITH CHECK (
  auth.uid() = created_by
  OR auth.uid() = assigned_to
  OR public.is_admin_or_manager(auth.uid())
);
-- tasks SELECT: require auth
DROP POLICY IF EXISTS "Users can view all tasks" ON public.tasks;
CREATE POLICY "Authenticated users can view tasks"
ON public.tasks FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

-- Lock down SECURITY DEFINER functions from anonymous (and public) execution
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin_or_manager(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
-- handle_new_user is called by the auth trigger as the postgres role; no API caller needs it
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin_or_manager(uuid) TO authenticated, service_role;
