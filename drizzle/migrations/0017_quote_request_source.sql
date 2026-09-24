-- Track external website quote imports so retries are idempotent.
ALTER TABLE public.quote_requests
  ADD COLUMN IF NOT EXISTS source_system TEXT,
  ADD COLUMN IF NOT EXISTS source_external_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS quote_requests_source_external_unique
  ON public.quote_requests (source_system, source_external_id)
  WHERE source_external_id IS NOT NULL;
