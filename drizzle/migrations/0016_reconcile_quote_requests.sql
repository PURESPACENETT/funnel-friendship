-- Reconcile the live quote_requests table with the CRM quote-request contract.
-- Keep legacy columns for backward compatibility; add the fields consumed by the current application.

ALTER TABLE public.quote_requests
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS client_type public.client_type,
  ADD COLUMN IF NOT EXISTS property_type_new TEXT,
  ADD COLUMN IF NOT EXISTS surface_m2 INTEGER,
  ADD COLUMN IF NOT EXISTS rooms INTEGER,
  ADD COLUMN IF NOT EXISTS frequency_new TEXT,
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

-- Backfill the new columns from the legacy schema where possible.
UPDATE public.quote_requests
SET
  client_type = COALESCE(client_type, CASE
    WHEN service_type ILIKE '%sous-traitance%' THEN 'sous_traitance'::public.client_type
    WHEN service_type ILIKE '%entreprise%' THEN 'entreprise'::public.client_type
    ELSE 'particulier'::public.client_type
  END),
  contact_name = COALESCE(contact_name, full_name),
  company_name = COALESCE(company_name, NULL),
  surface_m2 = COALESCE(surface_m2, NULLIF(regexp_replace(COALESCE(surface, ''), '[^0-9]', '', 'g'), '')::INTEGER),
  frequency_new = COALESCE(frequency_new, frequency),
  city = COALESCE(city, split_part(address, ',', 1)),
  message = COALESCE(message, message);

-- Copy the application-facing names from the legacy columns for existing rows.
UPDATE public.quote_requests
SET
  property_type_new = COALESCE(property_type_new, property_type),
  frequency_new = COALESCE(frequency_new, frequency);

CREATE INDEX IF NOT EXISTS quote_requests_created_at_idx
  ON public.quote_requests (created_at DESC);

CREATE INDEX IF NOT EXISTS quote_requests_status_idx
  ON public.quote_requests (status);

-- Public submissions are performed server-side with the service role.
-- Do not grant direct anonymous table access.
