-- Reconcile the live quote_requests table with the current application/CRM contract.
-- Legacy columns are kept for backward compatibility.

DO $$ BEGIN
  CREATE TYPE public.client_type AS ENUM ('entreprise','sous_traitance','particulier');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.quote_requests
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS client_type public.client_type,
  ADD COLUMN IF NOT EXISTS surface_m2 INTEGER,
  ADD COLUMN IF NOT EXISTS rooms INTEGER,
  ADD COLUMN IF NOT EXISTS services TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS desired_date DATE,
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS estimate_min NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estimate_max NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ai_summary TEXT,
  ADD COLUMN IF NOT EXISTS ai_key_points TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ai_urgency TEXT,
  ADD COLUMN IF NOT EXISTS ai_next_step TEXT,
  ADD COLUMN IF NOT EXISTS ai_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_requested_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS quote_requests_created_at_idx
  ON public.quote_requests (created_at DESC);

CREATE INDEX IF NOT EXISTS quote_requests_status_idx
  ON public.quote_requests (status);

CREATE OR REPLACE FUNCTION public.quote_requests_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS quote_requests_touch ON public.quote_requests;
CREATE TRIGGER quote_requests_touch
  BEFORE UPDATE ON public.quote_requests
  FOR EACH ROW EXECUTE FUNCTION public.quote_requests_touch_updated_at();
