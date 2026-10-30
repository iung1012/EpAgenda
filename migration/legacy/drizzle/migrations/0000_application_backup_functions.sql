CREATE OR REPLACE FUNCTION public.export_application_backup() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t text; rows jsonb; result jsonb := '{}'::jsonb;
BEGIN
  FOREACH t IN ARRAY ARRAY['profiles','user_roles','clients','equipment','pautas','filmmaker_visits','tasks','calendar_events','filmmaker_demands','posts','client_drive_folders','client_folders','client_passwords','task_comments','task_templates','visit_equipment','notifications','whatsapp_config','whatsapp_recipients','whatsapp_message_logs','whatsapp_ai_messages'] LOOP
    EXECUTE format('SELECT COALESCE(jsonb_agg(to_jsonb(r)), ''[]''::jsonb) FROM public.%I r', t) INTO rows;
    result := result || jsonb_build_object(t, rows);
  END LOOP;
  RETURN result;
END; $$;
REVOKE ALL ON FUNCTION public.export_application_backup() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.export_application_backup() TO service_role;
CREATE OR REPLACE FUNCTION public.import_application_backup(payload jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t text; cols text; updates text; total integer := 0; affected integer; allowed text[] := ARRAY['profiles','user_roles','clients','equipment','pautas','filmmaker_visits','tasks','calendar_events','filmmaker_demands','posts','client_drive_folders','client_folders','client_passwords','task_comments','task_templates','visit_equipment','notifications','whatsapp_config','whatsapp_recipients','whatsapp_message_logs','whatsapp_ai_messages'];
BEGIN
  IF jsonb_typeof(payload) <> 'object' THEN RAISE EXCEPTION 'Invalid backup'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_object_keys(payload) k WHERE NOT k = ANY(allowed)) THEN RAISE EXCEPTION 'Unsupported table'; END IF;
  PERFORM pg_advisory_xact_lock(17412026);
  SET CONSTRAINTS ALL DEFERRED;
  FOREACH t IN ARRAY allowed LOOP
    IF NOT payload ? t OR jsonb_typeof(payload->t) <> 'array' THEN RAISE EXCEPTION 'Missing table: %', t; END IF;
    IF EXISTS (SELECT 1 FROM jsonb_array_elements(payload->t) r WHERE jsonb_typeof(r) <> 'object' OR NOT r ? 'id') THEN RAISE EXCEPTION 'Invalid records: %', t; END IF;
    SELECT string_agg(format('%I', column_name), ', ' ORDER BY ordinal_position), string_agg(format('%I = EXCLUDED.%I', column_name, column_name), ', ' ORDER BY ordinal_position) FILTER (WHERE column_name <> 'id') INTO cols, updates FROM information_schema.columns WHERE table_schema='public' AND table_name=t;
    EXECUTE format('INSERT INTO public.%I (%s) SELECT %s FROM jsonb_populate_recordset(NULL::public.%I, $1) ON CONFLICT (id) DO UPDATE SET %s', t, cols, cols, t, updates) USING payload->t;
    GET DIAGNOSTICS affected = ROW_COUNT;
    total := total + affected;
  END LOOP;
  RETURN jsonb_build_object('records',total);
END; $$;
REVOKE ALL ON FUNCTION public.import_application_backup(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.import_application_backup(jsonb) TO service_role;