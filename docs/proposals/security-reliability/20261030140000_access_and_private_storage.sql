-- DRAFT: do not apply. Full database/auth/storage backup and application integration
-- are required first. See README.md in this directory for unresolved dependencies.
-- Membership is checked on every request, including requests with an old JWT.
CREATE OR REPLACE FUNCTION public.is_active_member(_user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles p JOIN public.user_roles r USING (user_id)
                 WHERE p.user_id = _user_id);
$$;
REVOKE ALL ON FUNCTION public.is_active_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_member(uuid) TO authenticated, service_role;

-- Remove access left behind by the old profile-only removal flow.
DELETE FROM public.user_roles r WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = r.user_id);

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['profiles','user_roles','clients','equipment','pautas','filmmaker_visits',
    'tasks','calendar_events','filmmaker_demands','posts','client_drive_folders','client_folders',
    'client_passwords','task_comments','task_templates','visit_equipment','notifications',
    'whatsapp_config','whatsapp_recipients','whatsapp_message_logs','whatsapp_ai_messages'] LOOP
    EXECUTE format('CREATE POLICY active_members_only ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.is_active_member()) WITH CHECK (public.is_active_member())', t);
  END LOOP;
END $$;
CREATE POLICY active_members_only ON storage.objects AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_active_member()) WITH CHECK (public.is_active_member());

-- Only the admin API can set app_metadata. User-supplied user_metadata is not trusted.
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE(NEW.raw_app_meta_data->>'agency_member', 'false') <> 'true' THEN
    RAISE EXCEPTION 'Solicite uma conta ao administrador da agência';
  END IF;
  INSERT INTO public.profiles(user_id, full_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'colaborador');
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.revoke_team_access(target_user uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(30102026);
  IF public.has_role(target_user, 'admin') AND
     (SELECT count(*) FROM public.user_roles WHERE role = 'admin') <= 1 THEN
    RAISE EXCEPTION 'O último administrador não pode ser desativado';
  END IF;
  DELETE FROM public.user_roles WHERE user_id = target_user;
END $$;
REVOKE ALL ON FUNCTION public.revoke_team_access(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_team_access(uuid) TO service_role;

-- Return only the safe team fields; managers do not need write access to roles.
CREATE OR REPLACE FUNCTION public.get_team_members()
RETURNS TABLE(id uuid, user_id uuid, full_name text, avatar_url text, phone text, birthday date, role public.app_role)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_active_member() OR NOT public.is_admin_or_manager(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso restrito à administração' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT p.id, p.user_id, p.full_name, p.avatar_url, p.phone, p.birthday, r.role
    FROM public.profiles p JOIN public.user_roles r ON r.user_id = p.user_id ORDER BY p.full_name;
END $$;
REVOKE ALL ON FUNCTION public.get_team_members() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_team_members() TO authenticated;

-- Credentials are accessed only through the authenticated encryption service.
REVOKE ALL ON public.client_passwords FROM anon, authenticated;
GRANT ALL ON public.client_passwords TO service_role;

UPDATE storage.buckets SET public = false WHERE id = 'client-files';
DROP POLICY IF EXISTS "client-files: admin/manager update" ON storage.objects;
CREATE POLICY "client-files: owner or manager update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'client-files' AND (owner = auth.uid() OR public.is_admin_or_manager(auth.uid())))
  WITH CHECK (bucket_id = 'client-files' AND (owner = auth.uid() OR public.is_admin_or_manager(auth.uid())));

-- Marking a notification as read cannot change its author, body or recipients.
REVOKE UPDATE ON public.notifications FROM authenticated;
CREATE OR REPLACE FUNCTION public.mark_notifications_read(notification_ids uuid[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_active_member() THEN RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501'; END IF;
  IF cardinality(notification_ids) > 1000 THEN RAISE EXCEPTION 'Selecione até 1000 notificações'; END IF;
  UPDATE public.notifications SET read_by = read_by || jsonb_build_array(auth.uid()::text)
    WHERE id = ANY(notification_ids)
      AND (target_user_id IS NULL OR target_user_id = auth.uid() OR created_by = auth.uid())
      AND NOT read_by @> jsonb_build_array(auth.uid()::text);
END $$;
REVOKE ALL ON FUNCTION public.mark_notifications_read(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_notifications_read(uuid[]) TO authenticated;
