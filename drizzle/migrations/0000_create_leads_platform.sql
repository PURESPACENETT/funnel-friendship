-- Types
CREATE TYPE public.client_type AS ENUM ('entreprise', 'sous_traitance', 'particulier');
CREATE TYPE public.request_status AS ENUM ('nouveau', 'contacte', 'devis_envoye', 'gagne', 'perdu');

-- Pricing settings (single row)
CREATE TABLE public.pricing_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  min_price NUMERIC NOT NULL DEFAULT 90,
  range_spread NUMERIC NOT NULL DEFAULT 0.15,
  property_rates JSONB NOT NULL DEFAULT '{
    "bureaux": 0.45,
    "commerce": 0.5,
    "immeuble": 0.4,
    "chantier": 1.2,
    "logement": 0.6,
    "autre": 0.5
  }'::jsonb,
  frequency_multipliers JSONB NOT NULL DEFAULT '{
    "ponctuel": 1.6,
    "hebdomadaire": 1,
    "plusieurs_semaine": 0.9,
    "quotidien": 0.8,
    "contrat_annuel": 0.85
  }'::jsonb,
  service_surcharges JSONB NOT NULL DEFAULT '{
    "nettoyage_courant": 0,
    "vitrerie": 0.15,
    "remise_en_etat": 0.4,
    "fin_de_chantier": 0.5,
    "desinfection": 0.2
  }'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.pricing_settings TO authenticated;
GRANT ALL ON public.pricing_settings TO service_role;
ALTER TABLE public.pricing_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read pricing"
  ON public.pricing_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can update pricing"
  ON public.pricing_settings FOR UPDATE TO authenticated USING (true);

INSERT INTO public.pricing_settings (id) VALUES ('00000000-0000-0000-0000-000000000001');

-- Quote requests
CREATE TABLE public.quote_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status public.request_status NOT NULL DEFAULT 'nouveau',
  client_type public.client_type NOT NULL,
  property_type TEXT NOT NULL,
  surface_m2 INTEGER NOT NULL DEFAULT 0,
  rooms INTEGER,
  frequency TEXT NOT NULL,
  services TEXT[] NOT NULL DEFAULT '{}',
  city TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  desired_date DATE,
  contact_name TEXT NOT NULL,
  company_name TEXT,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  message TEXT,
  estimate_min NUMERIC NOT NULL DEFAULT 0,
  estimate_max NUMERIC NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  last_contacted_at TIMESTAMPTZ
);

GRANT SELECT, UPDATE, DELETE ON public.quote_requests TO authenticated;
GRANT ALL ON public.quote_requests TO service_role;
ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read requests"
  ON public.quote_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can update requests"
  ON public.quote_requests FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete requests"
  ON public.quote_requests FOR DELETE TO authenticated USING (true);

CREATE INDEX quote_requests_created_at_idx ON public.quote_requests (created_at DESC);
CREATE INDEX quote_requests_status_idx ON public.quote_requests (status);

-- Notes
CREATE TABLE public.request_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.request_notes TO authenticated;
GRANT ALL ON public.request_notes TO service_role;
ALTER TABLE public.request_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read notes"
  ON public.request_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert notes"
  ON public.request_notes FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authenticated can delete own notes"
  ON public.request_notes FOR DELETE TO authenticated USING (auth.uid() = author_id);

CREATE INDEX request_notes_request_id_idx ON public.request_notes (request_id, created_at DESC);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER quote_requests_touch
  BEFORE UPDATE ON public.quote_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER pricing_settings_touch
  BEFORE UPDATE ON public.pricing_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();