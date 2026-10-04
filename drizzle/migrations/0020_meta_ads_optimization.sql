-- PURE SPACE NETT — Meta Ads acquisition + optimization foundation
-- Stores Meta entities, daily performance, attribution and optimization recommendations.
-- Secrets/tokens are intentionally NOT stored in the database.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'meta_sync_status') THEN
    CREATE TYPE public.meta_sync_status AS ENUM ('running','success','failed');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'meta_recommendation_status') THEN
    CREATE TYPE public.meta_recommendation_status AS ENUM ('pending','applied','dismissed','expired');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.meta_ad_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meta_account_id text NOT NULL UNIQUE,
  name text NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  timezone text NOT NULL DEFAULT 'Europe/Paris',
  is_active boolean NOT NULL DEFAULT true,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.meta_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.meta_ad_accounts(id) ON DELETE CASCADE,
  meta_campaign_id text NOT NULL UNIQUE,
  name text NOT NULL,
  objective text,
  status text,
  effective_status text,
  daily_budget_cents integer,
  lifetime_budget_cents integer,
  start_time timestamptz,
  stop_time timestamptz,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.meta_ad_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.meta_campaigns(id) ON DELETE CASCADE,
  meta_adset_id text NOT NULL UNIQUE,
  name text NOT NULL,
  status text,
  effective_status text,
  optimization_goal text,
  billing_event text,
  daily_budget_cents integer,
  lifetime_budget_cents integer,
  targeting jsonb NOT NULL DEFAULT '{}'::jsonb,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.meta_ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_set_id uuid NOT NULL REFERENCES public.meta_ad_sets(id) ON DELETE CASCADE,
  meta_ad_id text NOT NULL UNIQUE,
  name text NOT NULL,
  status text,
  effective_status text,
  creative_id text,
  creative_name text,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.meta_insights_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.meta_ad_accounts(id) ON DELETE CASCADE,
  date date NOT NULL,
  campaign_id uuid REFERENCES public.meta_campaigns(id) ON DELETE SET NULL,
  ad_set_id uuid REFERENCES public.meta_ad_sets(id) ON DELETE SET NULL,
  ad_id uuid REFERENCES public.meta_ads(id) ON DELETE SET NULL,
  meta_campaign_id text,
  meta_adset_id text,
  meta_ad_id text,
  spend numeric(14,2) NOT NULL DEFAULT 0,
  impressions bigint NOT NULL DEFAULT 0,
  reach bigint NOT NULL DEFAULT 0,
  clicks bigint NOT NULL DEFAULT 0,
  link_clicks bigint NOT NULL DEFAULT 0,
  leads integer NOT NULL DEFAULT 0,
  ctr numeric(10,4) NOT NULL DEFAULT 0,
  cpc numeric(14,4) NOT NULL DEFAULT 0,
  cpl numeric(14,4) NOT NULL DEFAULT 0,
  conversions integer NOT NULL DEFAULT 0,
  conversion_value numeric(14,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, date, meta_campaign_id, meta_adset_id, meta_ad_id)
);

CREATE TABLE IF NOT EXISTS public.meta_lead_attributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_external_id text UNIQUE,
  source text NOT NULL DEFAULT 'meta',
  quote_request_id uuid REFERENCES public.quote_requests(id) ON DELETE SET NULL,
  prospect_id uuid REFERENCES public.prospects(id) ON DELETE SET NULL,
  meta_account_id text,
  meta_page_id text,
  meta_form_id text,
  meta_campaign_id text,
  meta_adset_id text,
  meta_ad_id text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  first_touch_at timestamptz,
  lead_created_at timestamptz,
  contact_name text,
  email text,
  phone text,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.meta_conversion_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attribution_id uuid REFERENCES public.meta_lead_attributions(id) ON DELETE SET NULL,
  quote_request_id uuid REFERENCES public.quote_requests(id) ON DELETE SET NULL,
  prospect_id uuid REFERENCES public.prospects(id) ON DELETE SET NULL,
  conversion_type text NOT NULL,
  revenue_amount numeric(14,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  occurred_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'crm',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.meta_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES public.meta_ad_accounts(id) ON DELETE SET NULL,
  sync_type text NOT NULL,
  status public.meta_sync_status NOT NULL DEFAULT 'running',
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  rows_upserted integer NOT NULL DEFAULT 0,
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.meta_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES public.meta_ad_accounts(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id text,
  recommendation_type text NOT NULL,
  priority text NOT NULL DEFAULT 'medium',
  title text NOT NULL,
  rationale text NOT NULL,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.meta_recommendation_status NOT NULL DEFAULT 'pending',
  generated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  applied_at timestamptz,
  dismissed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS meta_campaigns_account_idx ON public.meta_campaigns(account_id);
CREATE INDEX IF NOT EXISTS meta_ad_sets_campaign_idx ON public.meta_ad_sets(campaign_id);
CREATE INDEX IF NOT EXISTS meta_ads_adset_idx ON public.meta_ads(ad_set_id);
CREATE INDEX IF NOT EXISTS meta_insights_date_idx ON public.meta_insights_daily(date DESC);
CREATE INDEX IF NOT EXISTS meta_insights_campaign_idx ON public.meta_insights_daily(meta_campaign_id, date DESC);
CREATE INDEX IF NOT EXISTS meta_attribution_campaign_idx ON public.meta_lead_attributions(meta_campaign_id, lead_created_at DESC);
CREATE INDEX IF NOT EXISTS meta_attribution_quote_idx ON public.meta_lead_attributions(quote_request_id);
CREATE INDEX IF NOT EXISTS meta_conversion_occurred_idx ON public.meta_conversion_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS meta_recommendations_pending_idx ON public.meta_recommendations(status, priority, generated_at DESC);

CREATE OR REPLACE FUNCTION public.meta_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS meta_ad_accounts_touch ON public.meta_ad_accounts;
CREATE TRIGGER meta_ad_accounts_touch BEFORE UPDATE ON public.meta_ad_accounts
FOR EACH ROW EXECUTE FUNCTION public.meta_touch_updated_at();

DROP TRIGGER IF EXISTS meta_campaigns_touch ON public.meta_campaigns;
CREATE TRIGGER meta_campaigns_touch BEFORE UPDATE ON public.meta_campaigns
FOR EACH ROW EXECUTE FUNCTION public.meta_touch_updated_at();

DROP TRIGGER IF EXISTS meta_ad_sets_touch ON public.meta_ad_sets;
CREATE TRIGGER meta_ad_sets_touch BEFORE UPDATE ON public.meta_ad_sets
FOR EACH ROW EXECUTE FUNCTION public.meta_touch_updated_at();

DROP TRIGGER IF EXISTS meta_ads_touch ON public.meta_ads;
CREATE TRIGGER meta_ads_touch BEFORE UPDATE ON public.meta_ads
FOR EACH ROW EXECUTE FUNCTION public.meta_touch_updated_at();

DROP TRIGGER IF EXISTS meta_insights_touch ON public.meta_insights_daily;
CREATE TRIGGER meta_insights_touch BEFORE UPDATE ON public.meta_insights_daily
FOR EACH ROW EXECUTE FUNCTION public.meta_touch_updated_at();

DROP TRIGGER IF EXISTS meta_attributions_touch ON public.meta_lead_attributions;
CREATE TRIGGER meta_attributions_touch BEFORE UPDATE ON public.meta_lead_attributions
FOR EACH ROW EXECUTE FUNCTION public.meta_touch_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_ad_accounts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_campaigns TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_ad_sets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_ads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_insights_daily TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_lead_attributions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_conversion_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_sync_runs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_recommendations TO authenticated;

GRANT ALL ON public.meta_ad_accounts TO service_role;
GRANT ALL ON public.meta_campaigns TO service_role;
GRANT ALL ON public.meta_ad_sets TO service_role;
GRANT ALL ON public.meta_ads TO service_role;
GRANT ALL ON public.meta_insights_daily TO service_role;
GRANT ALL ON public.meta_lead_attributions TO service_role;
GRANT ALL ON public.meta_conversion_events TO service_role;
GRANT ALL ON public.meta_sync_runs TO service_role;
GRANT ALL ON public.meta_recommendations TO service_role;

ALTER TABLE public.meta_ad_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_ad_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_insights_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_lead_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_conversion_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_sync_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_recommendations ENABLE ROW LEVEL SECURITY;

DO $policies$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'meta_ad_accounts','meta_campaigns','meta_ad_sets','meta_ads',
    'meta_insights_daily','meta_lead_attributions','meta_conversion_events',
    'meta_sync_runs','meta_recommendations'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Staff can read %s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Staff can insert %s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Staff can update %s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Staff can delete %s" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "Staff can read %s" ON public.%I FOR SELECT TO authenticated USING (public.is_staff(auth.uid()))', t, t);
    EXECUTE format('CREATE POLICY "Staff can insert %s" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()))', t, t);
    EXECUTE format('CREATE POLICY "Staff can update %s" ON public.%I FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()))', t, t);
    EXECUTE format('CREATE POLICY "Staff can delete %s" ON public.%I FOR DELETE TO authenticated USING (public.is_staff(auth.uid()))', t, t);
  END LOOP;
END
$policies$;
