-- Performance hardening for Meta Ads foreign keys and RLS policies.
CREATE INDEX IF NOT EXISTS meta_conversion_events_attribution_idx ON public.meta_conversion_events(attribution_id);
CREATE INDEX IF NOT EXISTS meta_conversion_events_prospect_idx ON public.meta_conversion_events(prospect_id);
CREATE INDEX IF NOT EXISTS meta_conversion_events_quote_request_idx ON public.meta_conversion_events(quote_request_id);
CREATE INDEX IF NOT EXISTS meta_insights_daily_ad_idx ON public.meta_insights_daily(ad_id);
CREATE INDEX IF NOT EXISTS meta_insights_daily_ad_set_idx ON public.meta_insights_daily(ad_set_id);
CREATE INDEX IF NOT EXISTS meta_insights_daily_campaign_idx ON public.meta_insights_daily(campaign_id);
CREATE INDEX IF NOT EXISTS meta_lead_attributions_prospect_idx ON public.meta_lead_attributions(prospect_id);
CREATE INDEX IF NOT EXISTS meta_recommendations_account_idx ON public.meta_recommendations(account_id);
CREATE INDEX IF NOT EXISTS meta_sync_runs_account_idx ON public.meta_sync_runs(account_id);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['meta_ad_accounts','meta_campaigns','meta_ad_sets','meta_ads','meta_insights_daily','meta_lead_attributions','meta_conversion_events','meta_sync_runs','meta_recommendations'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Staff can read %s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Staff can insert %s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Staff can update %s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Staff can delete %s" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "Staff can read %s" ON public.%I FOR SELECT TO authenticated USING ((select public.is_staff((select auth.uid()))))', t, t);
    EXECUTE format('CREATE POLICY "Staff can insert %s" ON public.%I FOR INSERT TO authenticated WITH CHECK ((select public.is_staff((select auth.uid()))))', t, t);
    EXECUTE format('CREATE POLICY "Staff can update %s" ON public.%I FOR UPDATE TO authenticated USING ((select public.is_staff((select auth.uid())))) WITH CHECK ((select public.is_staff((select auth.uid()))))', t, t);
    EXECUTE format('CREATE POLICY "Staff can delete %s" ON public.%I FOR DELETE TO authenticated USING ((select public.is_staff((select auth.uid()))))', t, t);
  END LOOP;
END $$;