ALTER TABLE public.quote_requests
  ADD COLUMN IF NOT EXISTS review_requested_at TIMESTAMPTZ;

ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS followup_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS quote_requests_review_requested_idx
  ON public.quote_requests (review_requested_at);

CREATE INDEX IF NOT EXISTS prospects_followup_sent_idx
  ON public.prospects (followup_sent_at);
