ALTER TYPE public.prospect_status ADD VALUE IF NOT EXISTS 'qualifie' AFTER 'nouveau';
ALTER TYPE public.prospect_status ADD VALUE IF NOT EXISTS 'reponse_recue' AFTER 'contacte';
ALTER TYPE public.prospect_status ADD VALUE IF NOT EXISTS 'rdv_a_prendre' AFTER 'interesse';
ALTER TYPE public.prospect_status ADD VALUE IF NOT EXISTS 'rdv_effectue' AFTER 'rdv_a_prendre';
ALTER TYPE public.prospect_status ADD VALUE IF NOT EXISTS 'visite_technique' AFTER 'rdv_effectue';
ALTER TYPE public.prospect_status ADD VALUE IF NOT EXISTS 'devis_envoye' AFTER 'visite_technique';
ALTER TYPE public.prospect_status ADD VALUE IF NOT EXISTS 'negociation' AFTER 'devis_envoye';
ALTER TYPE public.prospect_status ADD VALUE IF NOT EXISTS 'perdu' AFTER 'converti';

CREATE TYPE public.opportunity_type AS ENUM ('vente_directe', 'sous_traitance', 'les_deux');
CREATE TYPE public.prospect_activity_type AS ENUM ('note', 'email_envoye', 'email_recu', 'appel', 'relance', 'rdv', 'visite', 'devis', 'changement_statut', 'tache');
CREATE TYPE public.prospect_task_type AS ENUM ('appeler', 'email', 'relance', 'rdv', 'visite', 'devis', 'autre');
CREATE TYPE public.task_priority AS ENUM ('basse', 'normale', 'haute', 'urgente');

ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS opportunity_type public.opportunity_type;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS loss_reason text;

-- Default opportunity type on insert only when none was provided (never overrides a manual value).
CREATE OR REPLACE FUNCTION public.prospects_default_opportunity()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.opportunity_type IS NULL THEN
    IF NEW.sector IN ('entreprise_nettoyage','societe_proprete','nettoyage_bureaux','nettoyage_industriel','nettoyage_chantier','nettoyage_vitres','proprete_services') THEN
      NEW.opportunity_type := 'sous_traitance';
    ELSE
      NEW.opportunity_type := 'vente_directe';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER prospects_default_opportunity BEFORE INSERT ON public.prospects
FOR EACH ROW EXECUTE FUNCTION public.prospects_default_opportunity();

-- Backfill only empty values on existing rows.
UPDATE public.prospects SET opportunity_type = CASE
  WHEN sector IN ('entreprise_nettoyage','societe_proprete','nettoyage_bureaux','nettoyage_industriel','nettoyage_chantier','nettoyage_vitres','proprete_services') THEN 'sous_traitance'::public.opportunity_type
  ELSE 'vente_directe'::public.opportunity_type END
WHERE opportunity_type IS NULL;

CREATE INDEX IF NOT EXISTS prospects_opportunity_type_idx ON public.prospects (opportunity_type);
CREATE INDEX IF NOT EXISTS prospects_score_idx ON public.prospects (score DESC);
CREATE INDEX IF NOT EXISTS prospects_email_idx ON public.prospects (email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS prospects_sector_idx ON public.prospects (sector);
CREATE INDEX IF NOT EXISTS prospects_city_idx ON public.prospects (city);

CREATE TABLE public.prospect_activities (
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
CREATE POLICY "Staff can read prospect activities" ON public.prospect_activities FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can insert prospect activities" ON public.prospect_activities FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()) AND (created_by IS NULL OR created_by = auth.uid()));
CREATE POLICY "Staff can delete own prospect activities" ON public.prospect_activities FOR DELETE TO authenticated USING (public.is_staff(auth.uid()) AND created_by = auth.uid());
CREATE INDEX prospect_activities_prospect_idx ON public.prospect_activities (prospect_id, occurred_at DESC);
CREATE INDEX prospect_activities_occurred_idx ON public.prospect_activities (occurred_at DESC);
CREATE UNIQUE INDEX prospect_activities_dedupe_idx ON public.prospect_activities (prospect_id, dedupe_key) WHERE dedupe_key IS NOT NULL;

CREATE TABLE public.prospect_tasks (
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
CREATE POLICY "Staff can read prospect tasks" ON public.prospect_tasks FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can insert prospect tasks" ON public.prospect_tasks FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()) AND (created_by IS NULL OR created_by = auth.uid()));
CREATE POLICY "Staff can update prospect tasks" ON public.prospect_tasks FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can delete prospect tasks" ON public.prospect_tasks FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));
CREATE INDEX prospect_tasks_prospect_idx ON public.prospect_tasks (prospect_id);
CREATE INDEX prospect_tasks_open_due_idx ON public.prospect_tasks (due_at) WHERE completed_at IS NULL;
CREATE TRIGGER prospect_tasks_touch BEFORE UPDATE ON public.prospect_tasks FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();