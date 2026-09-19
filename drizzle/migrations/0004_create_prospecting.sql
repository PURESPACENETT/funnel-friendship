DO $$ BEGIN
  CREATE TYPE public.prospect_status AS ENUM ('nouveau', 'a_contacter', 'contacte', 'interesse', 'converti', 'ecarte');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL DEFAULT 'recherche',
  external_id TEXT UNIQUE,
  company_name TEXT NOT NULL,
  sector TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  website TEXT,
  phone TEXT,
  email TEXT,
  rating NUMERIC(2,1),
  reviews_count INTEGER,
  score INTEGER NOT NULL DEFAULT 0,
  status public.prospect_status NOT NULL DEFAULT 'nouveau',
  outreach_subject TEXT,
  outreach_body TEXT,
  outreach_generated_at TIMESTAMPTZ,
  outreach_sent_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS prospects_status_idx ON public.prospects (status);
CREATE INDEX IF NOT EXISTS prospects_created_at_idx ON public.prospects (created_at DESC);

CREATE TABLE IF NOT EXISTS public.prospect_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sector TEXT NOT NULL,
  area TEXT NOT NULL,
  found_count INTEGER NOT NULL DEFAULT 0,
  new_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospects TO authenticated;
GRANT ALL ON public.prospects TO service_role;
GRANT SELECT, INSERT ON public.prospect_searches TO authenticated;
GRANT ALL ON public.prospect_searches TO service_role;

ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read prospects" ON public.prospects FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can insert prospects" ON public.prospects FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update prospects" ON public.prospects FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can delete prospects" ON public.prospects FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can read searches" ON public.prospect_searches FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can insert searches" ON public.prospect_searches FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()) AND auth.uid() = created_by);

DROP TRIGGER IF EXISTS prospects_touch ON public.prospects;
CREATE TRIGGER prospects_touch BEFORE UPDATE ON public.prospects
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();