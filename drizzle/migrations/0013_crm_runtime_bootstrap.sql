-- CRM runtime bootstrap for environments where the base prospecting migrations
-- have not yet been applied. This is additive and preserves existing data.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'app_role'
  ) THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'staff');
  ELSE
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'staff';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text IN ('admin', 'staff')
  );
$$;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$;

CREATE TYPE public.prospect_status AS ENUM (
  'nouveau',
  'qualifie',
  'a_contacter',
  'contacte',
  'reponse_recue',
  'interesse',
  'rdv_a_prendre',
  'rdv_effectue',
  'visite_technique',
  'devis_envoye',
  'negociation',
  'converti',
  'perdu',
  'ecarte'
);

CREATE TYPE public.opportunity_type AS ENUM (
  'vente_directe',
  'sous_traitance',
  'les_deux'
);

CREATE TYPE public.prospect_activity_type AS ENUM (
  'note',
  'email_envoye',
  'email_recu',
  'appel',
  'relance',
  'rdv',
  'visite',
  'devis',
  'changement_statut',
  'tache'
);

CREATE TYPE public.prospect_task_type AS ENUM (
  'appeler',
  'email',
  'relance',
  'rdv',
  'visite',
  'devis',
  'autre'
);

CREATE TYPE public.task_priority AS ENUM (
  'basse',
  'normale',
  'haute',
  'urgente'
);

CREATE TABLE IF NOT EXISTS public.prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'recherche',
  external_id text UNIQUE,
  company_name text NOT NULL,
  sector text,
  address text,
  city text,
  postal_code text,
  website text,
  phone text,
  email text,
  rating numeric(2,1),
  reviews_count integer,
  score integer NOT NULL DEFAULT 0,
  status public.prospect_status NOT NULL DEFAULT 'nouveau',
  opportunity_type public.opportunity_type,
  loss_reason text,
  contact_name text,
  contact_title text,
  contact_linkedin text,
  found_emails text[] NOT NULL DEFAULT '{}',
  outreach_subject text,
  outreach_body text,
  outreach_generated_at timestamptz,
  outreach_sent_at timestamptz,
  followup_sent_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS opportunity_type public.opportunity_type,
  ADD COLUMN IF NOT EXISTS loss_reason text,
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS contact_title text,
  ADD COLUMN IF NOT EXISTS contact_linkedin text,
  ADD COLUMN IF NOT EXISTS found_emails text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS followup_sent_at timestamptz;

CREATE TABLE IF NOT EXISTS public.prospect_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sector text NOT NULL,
  area text NOT NULL,
  radius_km numeric NOT NULL DEFAULT 10,
  center_lat numeric,
  center_lng numeric,
  found_count integer NOT NULL DEFAULT 0,
  new_count integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.prospect_searches
  ADD COLUMN IF NOT EXISTS radius_km numeric NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS center_lat numeric,
  ADD COLUMN IF NOT EXISTS center_lng numeric;

CREATE OR REPLACE FUNCTION public.prospects_default_opportunity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.opportunity_type IS NULL THEN
    IF NEW.sector IN (
      'entreprise_nettoyage',
      'societe_proprete',
      'nettoyage_bureaux',
      'nettoyage_industriel',
      'nettoyage_chantier',
      'nettoyage_vitres',
      'proprete_services'
    ) THEN
      NEW.opportunity_type := 'sous_traitance';
    ELSE
      NEW.opportunity_type := 'vente_directe';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prospects_default_opportunity ON public.prospects;
CREATE TRIGGER prospects_default_opportunity
BEFORE INSERT ON public.prospects
FOR EACH ROW EXECUTE FUNCTION public.prospects_default_opportunity();

UPDATE public.prospects
SET opportunity_type = CASE
  WHEN sector IN (
    'entreprise_nettoyage',
    'societe_proprete',
    'nettoyage_bureaux',
    'nettoyage_industriel',
    'nettoyage_chantier',
    'nettoyage_vitres',
    'proprete_services'
  ) THEN 'sous_traitance'::public.opportunity_type
  ELSE 'vente_directe'::public.opportunity_type
END
WHERE opportunity_type IS NULL;

DROP TRIGGER IF EXISTS prospects_touch ON public.prospects;
CREATE TRIGGER prospects_touch
BEFORE UPDATE ON public.prospects
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospects TO authenticated;
GRANT ALL ON public.prospects TO service_role;
GRANT SELECT, INSERT ON public.prospect_searches TO authenticated;
GRANT ALL ON public.prospect_searches TO service_role;

ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_searches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read prospects" ON public.prospects;
DROP POLICY IF EXISTS "Staff can insert prospects" ON public.prospects;
DROP POLICY IF EXISTS "Staff can update prospects" ON public.prospects;
DROP POLICY IF EXISTS "Staff can delete prospects" ON public.prospects;
CREATE POLICY "Staff can read prospects"
ON public.prospects FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can insert prospects"
ON public.prospects FOR INSERT TO authenticated
WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update prospects"
ON public.prospects FOR UPDATE TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can delete prospects"
ON public.prospects FOR DELETE TO authenticated
USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff can read searches" ON public.prospect_searches;
DROP POLICY IF EXISTS "Staff can insert searches" ON public.prospect_searches;
CREATE POLICY "Staff can read searches"
ON public.prospect_searches FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can insert searches"
ON public.prospect_searches FOR INSERT TO authenticated
WITH CHECK (public.is_staff(auth.uid()) AND (created_by IS NULL OR auth.uid() = created_by));

CREATE INDEX IF NOT EXISTS prospects_status_idx ON public.prospects (status);
CREATE INDEX IF NOT EXISTS prospects_opportunity_type_idx ON public.prospects (opportunity_type);
CREATE INDEX IF NOT EXISTS prospects_score_idx ON public.prospects (score DESC);
CREATE INDEX IF NOT EXISTS prospects_email_idx ON public.prospects (email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS prospects_sector_idx ON public.prospects (sector);
CREATE INDEX IF NOT EXISTS prospects_city_idx ON public.prospects (city);
CREATE INDEX IF NOT EXISTS prospects_created_at_idx ON public.prospects (created_at DESC);
CREATE INDEX IF NOT EXISTS prospect_searches_created_at_idx ON public.prospect_searches (created_at DESC);

CREATE TABLE IF NOT EXISTS public.prospect_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  activity_type public.prospect_activity_type NOT NULL,
  title text NOT NULL,
  body text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  dedupe_key text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.prospect_activities TO authenticated;
GRANT ALL ON public.prospect_activities TO service_role;
ALTER TABLE public.prospect_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read prospect activities" ON public.prospect_activities;
DROP POLICY IF EXISTS "Staff can insert prospect activities" ON public.prospect_activities;
DROP POLICY IF EXISTS "Staff can delete own prospect activities" ON public.prospect_activities;
CREATE POLICY "Staff can read prospect activities"
ON public.prospect_activities FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can insert prospect activities"
ON public.prospect_activities FOR INSERT TO authenticated
WITH CHECK (public.is_staff(auth.uid()) AND (created_by IS NULL OR created_by = auth.uid()));
CREATE POLICY "Staff can delete own prospect activities"
ON public.prospect_activities FOR DELETE TO authenticated
USING (public.is_staff(auth.uid()) AND created_by = auth.uid());

CREATE INDEX IF NOT EXISTS prospect_activities_prospect_idx
ON public.prospect_activities (prospect_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS prospect_activities_occurred_idx
ON public.prospect_activities (occurred_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS prospect_activities_dedupe_idx
ON public.prospect_activities (prospect_id, dedupe_key)
WHERE dedupe_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.prospect_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  title text NOT NULL,
  task_type public.prospect_task_type NOT NULL DEFAULT 'autre',
  due_at timestamptz,
  priority public.task_priority NOT NULL DEFAULT 'normale',
  completed_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospect_tasks TO authenticated;
GRANT ALL ON public.prospect_tasks TO service_role;
ALTER TABLE public.prospect_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read prospect tasks" ON public.prospect_tasks;
DROP POLICY IF EXISTS "Staff can insert prospect tasks" ON public.prospect_tasks;
DROP POLICY IF EXISTS "Staff can update prospect tasks" ON public.prospect_tasks;
DROP POLICY IF EXISTS "Staff can delete prospect tasks" ON public.prospect_tasks;
CREATE POLICY "Staff can read prospect tasks"
ON public.prospect_tasks FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can insert prospect tasks"
ON public.prospect_tasks FOR INSERT TO authenticated
WITH CHECK (public.is_staff(auth.uid()) AND (created_by IS NULL OR created_by = auth.uid()));
CREATE POLICY "Staff can update prospect tasks"
ON public.prospect_tasks FOR UPDATE TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can delete prospect tasks"
ON public.prospect_tasks FOR DELETE TO authenticated
USING (public.is_staff(auth.uid()));

CREATE INDEX IF NOT EXISTS prospect_tasks_prospect_idx ON public.prospect_tasks (prospect_id);
CREATE INDEX IF NOT EXISTS prospect_tasks_due_idx ON public.prospect_tasks (due_at);
CREATE INDEX IF NOT EXISTS prospect_tasks_open_due_idx
ON public.prospect_tasks (due_at)
WHERE completed_at IS NULL;

DROP TRIGGER IF EXISTS prospect_tasks_touch ON public.prospect_tasks;
CREATE TRIGGER prospect_tasks_touch
BEFORE UPDATE ON public.prospect_tasks
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.users.id
);
