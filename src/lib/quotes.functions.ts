import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  DEFAULT_PRICING,
  estimatePrice,
  quoteRequestSchema,
  scoreRequest,
  type PricingSettings,
} from "./quotes-shared";

const PRICING_ID = "00000000-0000-0000-0000-000000000001";

function toPricing(row: Record<string, unknown> | null | undefined): PricingSettings {
  if (!row) return DEFAULT_PRICING;
  return {
    min_price: Number(row["min_price"] ?? DEFAULT_PRICING.min_price),
    range_spread: Number(row["range_spread"] ?? DEFAULT_PRICING.range_spread),
    property_rates: (row["property_rates"] as Record<string, number>) ?? DEFAULT_PRICING.property_rates,
    frequency_multipliers:
      (row["frequency_multipliers"] as Record<string, number>) ??
      DEFAULT_PRICING.frequency_multipliers,
    service_surcharges:
      (row["service_surcharges"] as Record<string, number>) ?? DEFAULT_PRICING.service_surcharges,
  };
}

/** Public: submit a quote request from the website form. */
export const submitQuoteRequest = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => quoteRequestSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: pricingRow } = await supabaseAdmin
      .from("pricing_settings")
      .select("*")
      .eq("id", PRICING_ID)
      .maybeSingle();

    const pricing = toPricing(pricingRow as Record<string, unknown> | null);
    const estimate = estimatePrice(data, pricing);
    const score = scoreRequest(data);

    const { data: inserted, error } = await supabaseAdmin
      .from("quote_requests")
      .insert({
        client_type: data.clientType,
        property_type: data.propertyType,
        surface_m2: data.surfaceM2,
        rooms: data.rooms ?? null,
        frequency: data.frequency,
        services: data.services,
        city: data.city,
        postal_code: data.postalCode,
        desired_date: data.desiredDate ? data.desiredDate : null,
        contact_name: data.contactName,
        company_name: data.companyName || null,
        email: data.email,
        phone: data.phone,
        message: data.message || null,
        estimate_min: estimate.min,
        estimate_max: estimate.max,
        score,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    try {
      const { notifyNewRequest } = await import("./quote-notifications.server");
      await notifyNewRequest({
        id: inserted.id,
        estimate,
        score,
        input: data,
        ownerEmail:
          ((pricingRow as Record<string, unknown> | null)?.["notify_email"] as string | null) ??
          null,
      });
    } catch (notifyError) {
      console.error("Email notification failed", notifyError);
    }

    try {
      const { qualifyAndStore } = await import("./quote-ai.server");
      await qualifyAndStore(inserted.id, {
        ...data,
        rooms: data.rooms ?? null,
        desiredDate: data.desiredDate || null,
        companyName: data.companyName || null,
        message: data.message || null,
        estimateMin: estimate.min,
        estimateMax: estimate.max,
      });
    } catch (aiError) {
      console.error("AI qualification failed", aiError);
    }

    return { id: inserted.id, estimate, score };
  });

/** Private: (re)generate the AI qualification of a request. */
export const qualifyRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("quote_requests")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Demande introuvable");

    const { qualifyAndStore } = await import("./quote-ai.server");
    const ok = await qualifyAndStore(row.id, {
      clientType: row.client_type,
      propertyType: row.property_type,
      surfaceM2: row.surface_m2,
      rooms: row.rooms,
      frequency: row.frequency,
      services: row.services,
      city: row.city,
      postalCode: row.postal_code,
      desiredDate: row.desired_date,
      contactName: row.contact_name,
      companyName: row.company_name,
      message: row.message,
      estimateMin: Number(row.estimate_min),
      estimateMax: Number(row.estimate_max),
    });

    if (!ok) throw new Error("Analyse indisponible pour le moment");
    return { ok: true };
  });

/** Public: live estimate preview while filling the form. */
export const previewEstimate = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        propertyType: z.string(),
        surfaceM2: z.coerce.number().int().min(0).max(200000),
        frequency: z.string(),
        services: z.array(z.string()),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: pricingRow } = await supabaseAdmin
      .from("pricing_settings")
      .select("*")
      .eq("id", PRICING_ID)
      .maybeSingle();
    const pricing = toPricing(pricingRow as Record<string, unknown> | null);
    if (!data.surfaceM2 || data.services.length === 0) return null;
    return estimatePrice(data as never, pricing);
  });

export const listRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("quote_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getRequest = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: request, error } = await context.supabase
      .from("quote_requests")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);

    const { data: notes, error: notesError } = await context.supabase
      .from("request_notes")
      .select("*")
      .eq("request_id", data.id)
      .order("created_at", { ascending: false });
    if (notesError) throw new Error(notesError.message);

    return { request, notes: notes ?? [] };
  });

export const updateRequestStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["nouveau", "contacte", "devis_envoye", "gagne", "perdu"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const patch = {
      status: data.status,
      ...(data.status !== "nouveau"
        ? { last_contacted_at: new Date().toISOString() }
        : {}),
    };
    const { error } = await context.supabase
      .from("quote_requests")
      .update(patch)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ requestId: z.string().uuid(), body: z.string().trim().min(1).max(2000) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("request_notes").insert({
      request_id: data.requestId,
      author_id: context.userId,
      body: data.body,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("quote_requests").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getPricing = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("pricing_settings")
      .select("*")
      .eq("id", PRICING_ID)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const row = data as Record<string, unknown> | null;
    return {
      ...toPricing(row),
      notify_email: (row?.["notify_email"] as string | null) ?? "",
    };
  });

export const updatePricing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        min_price: z.coerce.number().min(0).max(100000),
        range_spread: z.coerce.number().min(0).max(0.6),
        property_rates: z.record(z.string(), z.coerce.number().min(0).max(100)),
        frequency_multipliers: z.record(z.string(), z.coerce.number().min(0).max(10)),
        service_surcharges: z.record(z.string(), z.coerce.number().min(0).max(10)),
        notify_email: z.string().trim().email().max(255).or(z.literal("")),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("pricing_settings")
      .update({
        min_price: data.min_price,
        range_spread: data.range_spread,
        property_rates: data.property_rates,
        frequency_multipliers: data.frequency_multipliers,
        service_surcharges: data.service_surcharges,
        notify_email: data.notify_email || null,
      })
      .eq("id", PRICING_ID);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
