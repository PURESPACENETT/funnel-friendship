-- Prospecting safety: allow explicit suppression of outbound outreach.
ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS do_not_contact boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS do_not_contact_reason text;

CREATE INDEX IF NOT EXISTS prospects_do_not_contact_idx
  ON public.prospects (do_not_contact)
  WHERE do_not_contact = true;
