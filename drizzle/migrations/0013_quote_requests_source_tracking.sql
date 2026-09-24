ALTER TABLE public.quote_requests ADD COLUMN IF NOT EXISTS source_system text;
ALTER TABLE public.quote_requests ADD COLUMN IF NOT EXISTS source_external_id text;
CREATE UNIQUE INDEX IF NOT EXISTS quote_requests_source_unique
  ON public.quote_requests (source_system, source_external_id)
  WHERE source_system IS NOT NULL AND source_external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS quote_requests_email_created_idx ON public.quote_requests (email, created_at DESC);