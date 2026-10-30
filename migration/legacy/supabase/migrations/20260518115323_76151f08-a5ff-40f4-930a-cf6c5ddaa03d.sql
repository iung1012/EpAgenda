
-- POSTS
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID,
  title TEXT NOT NULL,
  caption TEXT,
  scheduled_date TIMESTAMPTZ NOT NULL,
  posted_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'agendado',
  platform TEXT NOT NULL DEFAULT 'instagram',
  media_url TEXT,
  link TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view posts" ON public.posts
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can create posts" ON public.posts
  FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creator or admin update posts" ON public.posts
  FOR UPDATE USING ((auth.uid() = created_by) OR is_admin_or_manager(auth.uid()));
CREATE POLICY "Creator or admin delete posts" ON public.posts
  FOR DELETE USING ((auth.uid() = created_by) OR is_admin_or_manager(auth.uid()));

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PAUTAS
CREATE TABLE public.pautas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  client_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pautas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view pautas" ON public.pautas
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can create pautas" ON public.pautas
  FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creator or admin update pautas" ON public.pautas
  FOR UPDATE USING ((auth.uid() = created_by) OR is_admin_or_manager(auth.uid()));
CREATE POLICY "Creator or admin delete pautas" ON public.pautas
  FOR DELETE USING ((auth.uid() = created_by) OR is_admin_or_manager(auth.uid()));

CREATE TRIGGER update_pautas_updated_at BEFORE UPDATE ON public.pautas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- TASKS: add pauta_id
ALTER TABLE public.tasks ADD COLUMN pauta_id UUID;
