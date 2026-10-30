-- DRAFT: do not apply. Authorization, cancellation semantics, frontend integration
-- and database regression tests are unfinished. See README.md in this directory.
-- One transaction owns the visit, its equipment and its delivery task.
CREATE OR REPLACE FUNCTION public.save_visit(payload jsonb, visit_id uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.filmmaker_visits; old_v public.filmmaker_visits; equipment_ids uuid[];
  assignee uuid; deadline date; scheduled timestamptz; v_id uuid := visit_id;
BEGIN
  IF NOT public.is_active_member() THEN RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501'; END IF;
  IF jsonb_typeof(payload) <> 'object' OR length(trim(payload->>'title')) NOT BETWEEN 1 AND 100
     OR payload->>'title' IS NULL THEN RAISE EXCEPTION 'Título inválido'; END IF;
  assignee := (payload->>'assigned_to')::uuid;
  deadline := (payload->>'delivery_deadline')::date;
  scheduled := (payload->>'visit_date')::timestamptz;
  IF assignee IS NULL OR deadline IS NULL OR scheduled IS NULL OR NOT public.is_active_member(assignee) THEN
    RAISE EXCEPTION 'Informe data, prazo e responsável ativo';
  END IF;
  IF deadline < (scheduled AT TIME ZONE 'America/Sao_Paulo')::date THEN
    RAISE EXCEPTION 'O prazo não pode ser anterior à visita';
  END IF;
  IF COALESCE(payload->>'status', 'agendada') NOT IN ('agendada','realizada','cancelada') THEN
    RAISE EXCEPTION 'Status inválido';
  END IF;
  SELECT COALESCE(array_agg(DISTINCT value::uuid), '{}'::uuid[]) INTO equipment_ids
    FROM jsonb_array_elements_text(COALESCE(payload->'equipment_ids', '[]'::jsonb));
  IF EXISTS (SELECT 1 FROM unnest(equipment_ids) e WHERE NOT EXISTS (SELECT 1 FROM public.equipment WHERE id=e)) THEN
    RAISE EXCEPTION 'Equipamento inválido';
  END IF;
  IF v_id IS NOT NULL THEN
    SELECT * INTO old_v FROM public.filmmaker_visits WHERE id = v_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Visita não encontrada'; END IF;
    IF old_v.filmmaker_id <> auth.uid() AND old_v.assigned_to IS DISTINCT FROM auth.uid()
       AND NOT public.is_admin_or_manager(auth.uid()) THEN
      RAISE EXCEPTION 'Sem permissão para editar esta visita' USING ERRCODE = '42501';
    END IF;
    UPDATE public.filmmaker_visits SET title=trim(payload->>'title'), description=NULLIF(payload->>'description',''),
      location=NULLIF(payload->>'location',''), visit_date=scheduled, client_id=NULLIF(payload->>'client_id','')::uuid,
      status=COALESCE(payload->>'status','agendada'), notes=NULLIF(payload->>'notes',''), assigned_to=assignee,
      delivery_deadline=deadline,
      reminder_sent=CASE WHEN old_v.visit_date IS DISTINCT FROM scheduled OR old_v.assigned_to IS DISTINCT FROM assignee
        OR (old_v.status <> 'agendada' AND payload->>'status' = 'agendada') THEN false ELSE old_v.reminder_sent END
      WHERE id=v_id RETURNING * INTO v;
  ELSE
    IF NOT public.is_admin_or_manager(auth.uid()) AND NOT public.has_role(auth.uid(), 'filmmaker') THEN
      RAISE EXCEPTION 'Sem permissão para agendar visitas' USING ERRCODE = '42501';
    END IF;
    INSERT INTO public.filmmaker_visits(title,description,location,visit_date,client_id,status,notes,filmmaker_id,assigned_to,delivery_deadline)
      VALUES(trim(payload->>'title'),NULLIF(payload->>'description',''),NULLIF(payload->>'location',''),scheduled,
        NULLIF(payload->>'client_id','')::uuid,COALESCE(payload->>'status','agendada'),NULLIF(payload->>'notes',''),auth.uid(),assignee,deadline)
      RETURNING * INTO v;
    v_id := v.id;
  END IF;
  DELETE FROM public.visit_equipment WHERE public.visit_equipment.visit_id=v_id;
  INSERT INTO public.visit_equipment(visit_id,equipment_id) SELECT v_id, unnest(equipment_ids);
  -- Cancelled visits keep their task/history, but no longer produce an open delivery.
  UPDATE public.tasks SET title='Entrega: ' || v.title, due_date=deadline, assigned_to=assignee, client_id=v.client_id,
    description='Entrega da visita ' || to_char(scheduled AT TIME ZONE 'America/Sao_Paulo','DD/MM/YYYY HH24:MI') || COALESCE(E'\n' || v.notes,''),
    status=CASE WHEN v.status='cancelada' THEN 'feito'::public.task_status ELSE status END
    WHERE public.tasks.visit_id=v_id;
  IF NOT FOUND AND v.status <> 'cancelada' THEN
    INSERT INTO public.tasks(title,description,status,priority,due_date,client_id,assigned_to,created_by,visit_id)
      VALUES('Entrega: ' || v.title,'Entrega da visita ' || to_char(scheduled AT TIME ZONE 'America/Sao_Paulo','DD/MM/YYYY HH24:MI'),
        'a_fazer','media',deadline,v.client_id,assignee,v.filmmaker_id,v_id);
  END IF;
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.save_visit(jsonb, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_visit(jsonb, uuid) TO authenticated;

-- Dragging a visit uses the same transaction and authorization rules.
CREATE OR REPLACE FUNCTION public.move_visit(target_visit uuid, scheduled_at timestamptz)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE v public.filmmaker_visits; equipment jsonb;
BEGIN
  SELECT * INTO v FROM public.filmmaker_visits WHERE id=target_visit FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Visita não encontrada'; END IF;
  SELECT COALESCE(jsonb_agg(equipment_id),'[]'::jsonb) INTO equipment FROM public.visit_equipment WHERE visit_id=target_visit;
  RETURN public.save_visit(to_jsonb(v) || jsonb_build_object('visit_date',scheduled_at,'equipment_ids',equipment), target_visit);
END $$;
REVOKE ALL ON FUNCTION public.move_visit(uuid,timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.move_visit(uuid,timestamptz) TO authenticated;

DROP POLICY IF EXISTS "Insert equipment for own visits" ON public.visit_equipment;
CREATE POLICY "Insert equipment for accessible visits" ON public.visit_equipment FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.filmmaker_visits v WHERE v.id=visit_id AND
    (v.filmmaker_id=auth.uid() OR v.assigned_to=auth.uid() OR public.is_admin_or_manager(auth.uid()))));
DROP POLICY IF EXISTS "Filmmakers can update own visits" ON public.filmmaker_visits;
CREATE POLICY "Members can update assigned visits" ON public.filmmaker_visits FOR UPDATE TO authenticated
  USING (filmmaker_id=auth.uid() OR assigned_to=auth.uid() OR public.is_admin_or_manager(auth.uid()));
