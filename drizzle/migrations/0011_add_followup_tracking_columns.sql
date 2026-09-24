ALTER TABLE public.quote_requests ADD COLUMN IF NOT EXISTS review_requested_at timestamptz;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS followup_sent_at timestamptz;