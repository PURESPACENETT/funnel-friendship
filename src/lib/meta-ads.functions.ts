import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const accountSchema = z.object({
  id: z.string().uuid().optional(),
  meta_account_id: z.string().trim().min(3),
  name: z.string().trim().min(2),
  currency: z.string().trim().min(3).max(3).default("EUR"),
  timezone: z.string().trim().min(1).default("Europe/Paris"),
  is_active: z.boolean().default(true),
});

const recommendationStatusSchema = z.enum(["pending", "applied", "dismissed", "expired"]);

function startOfDay(daysAgo: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

type Insight = {
  date: string;
  meta_campaign_id: string | null;
  meta_adset_id: string | null;
  meta_ad_id: string | null;
  spend: number | string;
  impressions: number;
  clicks: number;
  leads: number;
  conversions: number;
  conversion_value: number | string;
};

function aggregate(rows: Insight[]) {
  const spend = rows.reduce((s, r) => s + Number(r.spend || 0), 0);
  const leads = rows.reduce((s, r) => s + Number(r.leads || 0), 0);
  const conversions = rows.reduce((s, r) => s + Number(r.conversions || 0), 0);
  const revenue = rows.reduce((s, r) => s + Number(r.conversion_value || 0), 0);
  const impressions = rows.reduce((s, r) => s + Number(r.impressions || 0), 0);
  const clicks = rows.reduce((s, r) => s + Number(r.clicks || 0), 0);
  return {
    spend,
    leads,
    conversions,
    revenue,
    impressions,
    clicks,
    cpl: leads > 0 ? spend / leads : 0,
    cpa: conversions > 0 ? spend / conversions : 0,
    roas: spend > 0 ? revenue / spend : 0,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
  };
}

export const getMetaAdsDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const since = startOfDay(30);

    const [{ data: accounts, error: accountsError }, { data: insights, error: insightsError }, { data: recommendations, error: recommendationsError }] =
      await Promise.all([
        context.supabase.from("meta_ad_accounts").select("*").order("created_at", { ascending: false }),
        context.supabase
          .from("meta_insights_daily")
          .select("*")
          .gte("date", since)
          .order("date", { ascending: true }),
        context.supabase
          .from("meta_recommendations")
          .select("*")
          .eq("status", "pending")
          .order("generated_at", { ascending: false })
          .limit(20),
      ]);

    if (accountsError) throw new Error(accountsError.message);
    if (insightsError) throw new Error(insightsError.message);
    if (recommendationsError) throw new Error(recommendationsError.message);

    const rows = (insights ?? []) as Insight[];
    const totals = aggregate(rows);

    const campaignIds = [...new Set(rows.map((r) => r.meta_campaign_id).filter(Boolean))] as string[];
    const { data: campaigns, error: campaignsError } = campaignIds.length
      ? await context.supabase
          .from("meta_campaigns")
          .select("meta_campaign_id,name,status,effective_status,daily_budget_cents")
          .in("meta_campaign_id", campaignIds)
      : { data: [], error: null };
    if (campaignsError) throw new Error(campaignsError.message);

    const campaignMap = new Map((campaigns ?? []).map((c) => [c.meta_campaign_id, c]));
    const byCampaign = new Map<string, Insight[]>();
    for (const row of rows) {
      if (!row.meta_campaign_id) continue;
      const list = byCampaign.get(row.meta_campaign_id) ?? [];
      list.push(row);
      byCampaign.set(row.meta_campaign_id, list);
    }

    const campaignsPerformance = [...byCampaign.entries()]
      .map(([id, campaignRows]) => ({
        meta_campaign_id: id,
        name: campaignMap.get(id)?.name ?? id,
        status: campaignMap.get(id)?.effective_status ?? campaignMap.get(id)?.status ?? "UNKNOWN",
        daily_budget_cents: campaignMap.get(id)?.daily_budget_cents ?? null,
        ...aggregate(campaignRows),
      }))
      .sort((a, b) => b.spend - a.spend);

    const byDay = new Map<string, Insight[]>();
    for (const row of rows) {
      const list = byDay.get(row.date) ?? [];
      list.push(row);
      byDay.set(row.date, list);
    }

    const daily = [...byDay.entries()].map(([date, dayRows]) => ({
      date,
      ...aggregate(dayRows),
    }));

    return {
      connected: (accounts ?? []).some((a) => a.is_active),
      accounts: accounts ?? [],
      totals,
      daily,
      campaigns: campaignsPerformance,
      recommendations: recommendations ?? [],
      syncedAt: accounts?.[0]?.last_synced_at ?? null,
    };
  });

export const saveMetaAdAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => accountSchema.parse(input))
  .handler(async ({ data, context }) => {
    const payload = {
      meta_account_id: data.meta_account_id,
      name: data.name,
      currency: data.currency,
      timezone: data.timezone,
      is_active: data.is_active,
    };

    const query = data.id
      ? context.supabase.from("meta_ad_accounts").update(payload).eq("id", data.id)
      : context.supabase.from("meta_ad_accounts").upsert(payload, { onConflict: "meta_account_id" });

    const { data: account, error } = await query.select("*").single();
    if (error) throw new Error(error.message);
    return account;
  });

export const setMetaRecommendationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), status: recommendationStatusSchema }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const patch =
      data.status === "applied"
        ? { status: data.status, applied_at: new Date().toISOString() }
        : data.status === "dismissed"
          ? { status: data.status, dismissed_at: new Date().toISOString() }
          : { status: data.status };

    const { error } = await context.supabase
      .from("meta_recommendations")
      .update(patch)
      .eq("id", data.id);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const generateMetaRecommendations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const since = startOfDay(14);
    const { data: rows, error } = await context.supabase
      .from("meta_insights_daily")
      .select("*")
      .gte("date", since);

    if (error) throw new Error(error.message);

    const insights = (rows ?? []) as Insight[];
    const byCampaign = new Map<string, Insight[]>();
    for (const row of insights) {
      if (!row.meta_campaign_id) continue;
      const list = byCampaign.get(row.meta_campaign_id) ?? [];
      list.push(row);
      byCampaign.set(row.meta_campaign_id, list);
    }

    const performances = [...byCampaign.entries()].map(([id, list]) => ({
      id,
      metrics: aggregate(list),
    }));
    const active = performances.filter((p) => p.metrics.spend > 0 && p.metrics.leads > 0);
    const medianCpl = active.length
      ? [...active.map((p) => p.metrics.cpl)].sort((a, b) => a - b)[Math.floor(active.length / 2)] ?? 0
      : 0;

    const { data: campaigns } = await context.supabase
      .from("meta_campaigns")
      .select("meta_campaign_id,name,status,effective_status");

    const names = new Map((campaigns ?? []).map((c) => [c.meta_campaign_id, c.name]));
    const generated = [];

    for (const p of performances) {
      const name = names.get(p.id) ?? p.id;
      let recommendation: { type: string; priority: string; title: string; rationale: string } | null = null;

      if (p.metrics.spend >= 50 && p.metrics.leads === 0) {
        recommendation = {
          type: "pause",
          priority: "high",
          title: "Suspendre ou revoir cette campagne",
          rationale: `${name} a dépensé ${p.metrics.spend.toFixed(2)} € sur 14 jours sans lead attribué. Vérifier ciblage, formulaire et créatifs avant de continuer à investir.`,
        };
      } else if (medianCpl > 0 && p.metrics.leads >= 3 && p.metrics.cpl <= medianCpl * 0.7) {
        recommendation = {
          type: "increase_budget",
          priority: "high",
          title: "Augmenter progressivement le budget",
          rationale: `${name} présente un CPL de ${p.metrics.cpl.toFixed(2)} €, inférieur d'au moins 30 % à la médiane des campagnes actives. Tester une hausse progressive plutôt qu'un changement brutal.`,
        };
      } else if (medianCpl > 0 && p.metrics.leads >= 3 && p.metrics.cpl >= medianCpl * 1.5) {
        recommendation = {
          type: "reduce_or_test",
          priority: "medium",
          title: "Réduire ou tester une nouvelle créative",
          rationale: `${name} présente un CPL de ${p.metrics.cpl.toFixed(2)} €, supérieur d'au moins 50 % à la médiane. Tester un nouvel angle publicitaire avant d'augmenter le budget.`,
        };
      }

      if (!recommendation) continue;

      const { data: existing } = await context.supabase
        .from("meta_recommendations")
        .select("id")
        .eq("entity_type", "campaign")
        .eq("entity_id", p.id)
        .eq("recommendation_type", recommendation.type)
        .eq("status", "pending")
        .limit(1)
        .maybeSingle();

      if (existing) continue;

      const { data: inserted, error: insertError } = await context.supabase
        .from("meta_recommendations")
        .insert({
          entity_type: "campaign",
          entity_id: p.id,
          recommendation_type: recommendation.type,
          priority: recommendation.priority,
          title: recommendation.title,
          rationale: recommendation.rationale,
          metrics: p.metrics,
        })
        .select("*")
        .single();

      if (insertError) throw new Error(insertError.message);
      generated.push(inserted);
    }

    return { generated };
  });
