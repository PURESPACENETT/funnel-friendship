-- Automatically create an attribution record for website quote requests carrying Meta UTM parameters.
ALTER TABLE public.quote_requests
  ADD COLUMN IF NOT EXISTS fbclid text;

CREATE UNIQUE INDEX IF NOT EXISTS meta_lead_attributions_quote_request_unique
ON public.meta_lead_attributions(quote_request_id)
WHERE quote_request_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.capture_meta_quote_attribution()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF lower(coalesce(NEW.utm_source, '')) IN ('facebook','instagram','meta','fb','ig')
     OR lower(coalesce(NEW.utm_medium, '')) IN ('cpc','paid_social','paid-social','meta') THEN
    INSERT INTO public.meta_lead_attributions (
      source, quote_request_id, utm_source, utm_medium, utm_campaign,
      utm_content, utm_term, lead_created_at, contact_name, email, phone, raw
    )
    VALUES (
      'meta_web', NEW.id, NEW.utm_source, NEW.utm_medium, NEW.utm_campaign,
      NEW.utm_content, NEW.utm_term, NEW.created_at,
      COALESCE(NEW.contact_name, NEW.full_name), NEW.email, NEW.phone,
      jsonb_build_object(
        'landing_page', NEW.landing_page,
        'referrer', NEW.referrer,
        'fbclid', NEW.fbclid,
        'source_system', NEW.source_system
      )
    )
    ON CONFLICT (quote_request_id)
    DO UPDATE SET
      utm_source = EXCLUDED.utm_source,
      utm_medium = EXCLUDED.utm_medium,
      utm_campaign = EXCLUDED.utm_campaign,
      utm_content = EXCLUDED.utm_content,
      utm_term = EXCLUDED.utm_term,
      raw = EXCLUDED.raw,
      updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS quote_requests_capture_meta_attribution ON public.quote_requests;
CREATE TRIGGER quote_requests_capture_meta_attribution
AFTER INSERT OR UPDATE OF utm_source, utm_medium, utm_campaign, utm_content, utm_term
ON public.quote_requests
FOR EACH ROW
EXECUTE FUNCTION public.capture_meta_quote_attribution();