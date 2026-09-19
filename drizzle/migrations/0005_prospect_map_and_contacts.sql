ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric,
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS contact_title text,
  ADD COLUMN IF NOT EXISTS contact_linkedin text,
  ADD COLUMN IF NOT EXISTS found_emails text[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE public.prospect_searches
  ADD COLUMN IF NOT EXISTS radius_km integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS center_lat numeric,
  ADD COLUMN IF NOT EXISTS center_lng numeric;