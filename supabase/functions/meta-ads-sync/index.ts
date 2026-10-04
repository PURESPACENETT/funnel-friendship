import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GRAPH_VERSION = Deno.env.get("META_GRAPH_API_VERSION");
const ACCESS_TOKEN = Deno.env.get("META_ACCESS_TOKEN");
const ACCOUNT_ID = Deno.env.get("META_AD_ACCOUNT_ID");
const ACCOUNT_NAME = Deno.env.get("META_AD_ACCOUNT_NAME") ?? "PURE SPACE NETT — Meta Ads";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!GRAPH_VERSION || !ACCESS_TOKEN || !ACCOUNT_ID || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Meta/Supabase configuration.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function graph(path: string, params: Record<string, string> = {}) {
  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${path.replace(/^\//, "")}`);
  url.searchParams.set("access_token", ACCESS_TOKEN);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const response = await fetch(url);
  const payload = await response.json();
  if (!response.ok || payload.error) throw new Error(payload.error?.message ?? "Meta Graph API error");
  return payload;
}

async function graphAll(path: string, params: Record<string, string> = {}) {
  const rows: Record<string, unknown>[] = [];
  let payload = await graph(path, { ...params, limit: "200" });
  while (true) {
    rows.push(...(payload.data ?? []));
    const next = payload.paging?.next;
    if (!next) break;
    const response = await fetch(next);
    payload = await response.json();
    if (!response.ok || payload.error) throw new Error(payload.error?.message ?? "Meta pagination error");
  }
  return rows;
}

function money(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function actionCount(actions: unknown, names: string[]) {
  if (!Array.isArray(actions)) return 0;
  return actions.reduce((sum, item) => {
    const action = item as Record<string, unknown>;
    return names.includes(String(action.action_type ?? "")) ? sum + money(action.value) : sum;
  }, 0);
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return Response.json({ ok: false, error: "POST required" }, { status: 405 });

  const startedAt = new Date().toISOString();
  let syncRunId: string | null = null;

  try {
    const { data: account, error: accountError } = await supabase
      .from("meta_ad_accounts")
      .upsert({
        meta_account_id: ACCOUNT_ID,
        name: ACCOUNT_NAME,
        currency: "EUR",
        timezone: "Europe/Paris",
        is_active: true,
      }, { onConflict: "meta_account_id" })
      .select("*")
      .single();
    if (accountError) throw new Error(accountError.message);

    const { data: run, error: runError } = await supabase
      .from("meta_sync_runs")
      .insert({ account_id: account.id, sync_type: "full", status: "running", started_at: startedAt })
      .select("id")
      .single();
    if (runError) throw new Error(runError.message);
    syncRunId = run.id;

    const campaigns = await graphAll(`${ACCOUNT_ID}/campaigns`, {
      fields: "id,name,objective,status,effective_status,daily_budget,lifetime_budget,start_time,stop_time",
    });
    const campaignMap = new Map<string, string>();
    let rowsUpserted = 0;

    for (const campaign of campaigns) {
      const { data: row, error } = await supabase.from("meta_campaigns").upsert({
        account_id: account.id,
        meta_campaign_id: String(campaign.id),
        name: String(campaign.name ?? campaign.id),
        objective: campaign.objective ? String(campaign.objective) : null,
        status: campaign.status ? String(campaign.status) : null,
        effective_status: campaign.effective_status ? String(campaign.effective_status) : null,
        daily_budget_cents: campaign.daily_budget != null ? Math.round(money(campaign.daily_budget)) : null,
        lifetime_budget_cents: campaign.lifetime_budget != null ? Math.round(money(campaign.lifetime_budget)) : null,
        start_time: campaign.start_time ? String(campaign.start_time) : null,
        stop_time: campaign.stop_time ? String(campaign.stop_time) : null,
        raw: campaign,
      }, { onConflict: "meta_campaign_id" }).select("id").single();
      if (error) throw new Error(error.message);
      campaignMap.set(String(campaign.id), row.id);
      rowsUpserted++;
    }

    const adsets = await graphAll(`${ACCOUNT_ID}/adsets`, {
      fields: "id,campaign_id,name,status,effective_status,optimization_goal,billing_event,daily_budget,lifetime_budget,targeting",
    });
    const adsetMap = new Map<string, string>();

    for (const adset of adsets) {
      const campaignId = campaignMap.get(String(adset.campaign_id ?? ""));
      if (!campaignId) continue;
      const { data: row, error } = await supabase.from("meta_ad_sets").upsert({
        campaign_id: campaignId,
        meta_adset_id: String(adset.id),
        name: String(adset.name ?? adset.id),
        status: adset.status ? String(adset.status) : null,
        effective_status: adset.effective_status ? String(adset.effective_status) : null,
        optimization_goal: adset.optimization_goal ? String(adset.optimization_goal) : null,
        billing_event: adset.billing_event ? String(adset.billing_event) : null,
        daily_budget_cents: adset.daily_budget != null ? Math.round(money(adset.daily_budget)) : null,
        lifetime_budget_cents: adset.lifetime_budget != null ? Math.round(money(adset.lifetime_budget)) : null,
        targeting: adset.targeting ?? {},
        raw: adset,
      }, { onConflict: "meta_adset_id" }).select("id").single();
      if (error) throw new Error(error.message);
      adsetMap.set(String(adset.id), row.id);
      rowsUpserted++;
    }

    const ads = await graphAll(`${ACCOUNT_ID}/ads`, {
      fields: "id,adset_id,name,status,effective_status,creative{id,name}",
    });
    const adMap = new Map<string, string>();

    for (const ad of ads) {
      const adSetId = adsetMap.get(String(ad.adset_id ?? ""));
      if (!adSetId) continue;
      const creative = (ad.creative ?? {}) as Record<string, unknown>;
      const { data: row, error } = await supabase.from("meta_ads").upsert({
        ad_set_id: adSetId,
        meta_ad_id: String(ad.id),
        name: String(ad.name ?? ad.id),
        status: ad.status ? String(ad.status) : null,
        effective_status: ad.effective_status ? String(ad.effective_status) : null,
        creative_id: creative.id ? String(creative.id) : null,
        creative_name: creative.name ? String(creative.name) : null,
        raw: ad,
      }, { onConflict: "meta_ad_id" }).select("id").single();
      if (error) throw new Error(error.message);
      adMap.set(String(ad.id), row.id);
      rowsUpserted++;
    }

    const end = new Date();
    const begin = new Date();
    begin.setDate(begin.getDate() - 30);

    const insights = await graphAll(`${ACCOUNT_ID}/insights`, {
      level: "ad",
      fields: "date_start,campaign_id,adset_id,ad_id,spend,impressions,reach,clicks,ctr,cpc,actions",
      time_range: JSON.stringify({
        since: begin.toISOString().slice(0, 10),
        until: end.toISOString().slice(0, 10),
      }),
      time_increment: "1",
    });

    for (const insight of insights) {
      const spend = money(insight.spend);
      const leads = actionCount(insight.actions, ["lead", "onsite_conversion.lead_grouped"]);
      const conversions = actionCount(insight.actions, ["purchase", "offsite_conversion.fb_pixel_purchase"]);
      const campaignId = String(insight.campaign_id ?? "");
      const adsetId = String(insight.adset_id ?? "");
      const adId = String(insight.ad_id ?? "");

      const { error } = await supabase.from("meta_insights_daily").upsert({
        account_id: account.id,
        date: String(insight.date_start),
        campaign_id: campaignMap.get(campaignId) ?? null,
        ad_set_id: adsetMap.get(adsetId) ?? null,
        ad_id: adMap.get(adId) ?? null,
        meta_campaign_id: campaignId || null,
        meta_adset_id: adsetId || null,
        meta_ad_id: adId || null,
        spend,
        impressions: Math.round(money(insight.impressions)),
        reach: Math.round(money(insight.reach)),
        clicks: Math.round(money(insight.clicks)),
        link_clicks: 0,
        leads,
        ctr: money(insight.ctr),
        cpc: money(insight.cpc),
        cpl: leads > 0 ? spend / leads : 0,
        conversions,
        conversion_value: 0,
        currency: "EUR",
        raw: insight,
      }, { onConflict: "account_id,date,meta_campaign_id,meta_adset_id,meta_ad_id" });
      if (error) throw new Error(error.message);
      rowsUpserted++;
    }

    await supabase.from("meta_ad_accounts").update({ last_synced_at: new Date().toISOString() }).eq("id", account.id);
    await supabase.from("meta_sync_runs").update({
      status: "success",
      finished_at: new Date().toISOString(),
      rows_upserted: rowsUpserted,
    }).eq("id", syncRunId);

    return Response.json({ ok: true, rows_upserted: rowsUpserted });
  } catch (error) {
    if (syncRunId) {
      await supabase.from("meta_sync_runs").update({
        status: "failed",
        finished_at: new Date().toISOString(),
        error_message: error instanceof Error ? error.message : String(error),
      }).eq("id", syncRunId);
    }
    return Response.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
});
