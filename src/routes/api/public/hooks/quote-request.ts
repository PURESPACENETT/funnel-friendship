import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { secretMatches } from "@/lib/secret-compare.server";
import { DEFAULT_PRICING, estimatePrice, scoreRequest } from "@/lib/quotes-shared";

const secretSchema = z.string().min(32).max(256);
const quoteImportSchema = z.object({
  sourceExternalId: z.string().uuid(),
  clientType: z.enum(["entreprise", "sous_traitance", "particulier"]),
  propertyType: z.string().trim().min(1).max(80),
  surfaceM2: z.coerce.number().int().min(1).max(200000),
  frequency: z.enum(["ponctuel", "hebdomadaire", "plusieurs_semaine", "quotidien", "contrat_annuel"]),
  services: z.array(z.string().trim().min(1).max(120)).min(1).max(10),
  city: z.string().trim().min(1).max(120),
  postalCode: z.string().trim().min(4).max(10),
  desiredDate: z.string().trim().max(20).optional().default(""),
  contactName: z.string().trim().min(2).max(120),
  companyName: z.string().trim().max(160).optional().default(""),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(6).max(30),
  message: z.string().trim().max(4000).optional().default(""),
});

const DEFAULT_SERVICE_KEYS = new Set(["nettoyage_courant", "vitrerie", "remise_en_etat", "fin_de_chantier", "desinfection"]);

const DEFAULT_ALLOWED_ORIGINS = new Set([
  "https://purespacenett.com",
  "https://www.purespacenett.com",
]);

function corsHeaders(origin: string | null): Record<string, string> {
  const configured = (process.env["PUBLIC_QUOTE_WEBHOOK_ORIGIN"] ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const allowedOrigins = new Set<string>(
    configured.length ? configured : DEFAULT_ALLOWED_ORIGINS,
  );
  const allowOrigin =
    origin && allowedOrigins.has(origin)
      ? origin
      : ([...allowedOrigins][0] ?? "https://purespacenett.com");

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, x-quote-webhook-secret",
    "Cache-Control": "no-store",
    "Vary": "Origin",
    "X-Robots-Tag": "noindex, nofollow",
  };
}

function normalizeServiceKeys(services: string[]): string[] {
  const normalized = services.map((service) => {
    const value = service.toLowerCase();
    if (value.includes("vitre")) return "vitrerie";
    if (value.includes("fin de chantier")) return "fin_de_chantier";
    if (value.includes("remise en état") || value.includes("sinistre")) return "remise_en_etat";
    if (value.includes("désinfection") || value.includes("sanitaire")) return "desinfection";
    return "nettoyage_courant";
  });
  return [...new Set(normalized)].filter((service) => DEFAULT_SERVICE_KEYS.has(service));
}

function normalizePropertyType(value: string): string {
  const normalized = value.toLowerCase();
  if (normalized.includes("bureau")) return "bureaux";
  if (normalized.includes("commerce")) return "commerce";
  if (normalized.includes("immeuble")) return "immeuble";
  if (normalized.includes("chantier")) return "chantier";
  if (normalized.includes("maison") || normalized.includes("appartement") || normalized.includes("logement")) {
    return "logement";
  }
  return "autre";
}

function parsePricing(row: Record<string, unknown> | null) {
  if (!row) return DEFAULT_PRICING;
  return {
    min_price: Number(row["min_price"] ?? DEFAULT_PRICING.min_price),
    range_spread: Number(row["range_spread"] ?? DEFAULT_PRICING.range_spread),
    property_rates: (row["property_rates"] as Record<string, number>) ?? DEFAULT_PRICING.property_rates,
    frequency_multipliers:
      (row["frequency_multipliers"] as Record<string, number>) ??
      DEFAULT_PRICING.frequency_multipliers,
    service_surcharges:
      (row["service_surcharges"] as Record<string, number>) ??
      DEFAULT_PRICING.service_surcharges,
  };
}

export const Route = createFileRoute("/api/public/hooks/quote-request")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      OPTIONS: async ({ request }) =>
        new Response(null, {
          status: 204,
          headers: corsHeaders(request.headers.get("origin")),
        }),
      GET: async () =>
        new Response("Method Not Allowed", {
          status: 405,
          headers: { Allow: "POST, OPTIONS", "X-Robots-Tag": "noindex, nofollow" },
        }),
      POST: async ({ request }) => {
        const headers = corsHeaders(request.headers.get("origin"));
        const expected =
          process.env["PUBLIC_QUOTE_WEBHOOK_SECRET"] ??
          process.env["B2B_LEAD_WEBHOOK_SECRET"] ??
          "";
        const provided = request.headers.get("x-quote-webhook-secret") ?? "";

        if (!expected || !secretSchema.safeParse(expected).success || !secretMatches(provided, [expected])) {
          return Response.json({ error: "unauthorized" }, { status: 401, headers });
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Requête invalide" }, { status: 400, headers });
        }

        const parsed = quoteImportSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json(
            {
              error: "Données de demande de devis invalides",
              details: parsed.error.flatten().fieldErrors,
            },
            { status: 400, headers },
          );
        }

        const data = parsed.data;
        const { data: existing, error: lookupError } = await supabaseAdmin
          .from("quote_requests")
          .select("id")
          .eq("source_system", "purespacenett_site")
          .eq("source_external_id", data.sourceExternalId)
          .maybeSingle();

        if (lookupError) {
          console.error("Quote import lookup failed", lookupError.message);
          return Response.json({ error: "Vérification impossible" }, { status: 500, headers });
        }

        if (existing) {
          return Response.json({ ok: true, id: existing.id, duplicate: true }, { status: 200, headers });
        }

        const { data: pricingRow } = await supabaseAdmin
          .from("pricing_settings")
          .select("*")
          .eq("id", "00000000-0000-0000-0000-000000000001")
          .maybeSingle();

        const pricing = parsePricing(pricingRow as Record<string, unknown> | null);
        const propertyType = normalizePropertyType(data.propertyType);
        const services = normalizeServiceKeys(data.services);
        const estimate = estimatePrice(
          {
            propertyType: propertyType as never,
            surfaceM2: data.surfaceM2,
            frequency: data.frequency,
            services: services as never,
          },
          pricing,
        );
        const score = scoreRequest({
          clientType: data.clientType,
          frequency: data.frequency,
          surfaceM2: data.surfaceM2,
          services: services as never,
        });

        const { data: inserted, error } = await supabaseAdmin
          .from("quote_requests")
          .insert({
            source_system: "purespacenett_site",
            source_external_id: data.sourceExternalId,
            client_type: data.clientType,
            property_type: propertyType,
            surface_m2: data.surfaceM2,
            frequency: data.frequency,
            services,
            city: data.city,
            postal_code: data.postalCode,
            desired_date: data.desiredDate || null,
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

        if (error) {
          if (error.code === "23505") {
            const { data: duplicate } = await supabaseAdmin
              .from("quote_requests")
              .select("id")
              .eq("source_system", "purespacenett_site")
              .eq("source_external_id", data.sourceExternalId)
              .maybeSingle();
            if (duplicate) {
              return Response.json({ ok: true, id: duplicate.id, duplicate: true }, { status: 200, headers });
            }
          }
          console.error("Quote import insert failed", error.message);
          return Response.json({ error: "Enregistrement impossible" }, { status: 500, headers });
        }

        try {
          const { qualifyAndStore } = await import("@/lib/quote-ai.server");
          await qualifyAndStore(inserted.id, {
            clientType: data.clientType,
            propertyType,
            surfaceM2: data.surfaceM2,
            rooms: null,
            frequency: data.frequency,
            services,
            city: data.city,
            postalCode: data.postalCode,
            desiredDate: data.desiredDate || null,
            contactName: data.contactName,
            companyName: data.companyName || null,
            message: data.message || null,
            estimateMin: estimate.min,
            estimateMax: estimate.max,
          });
        } catch (aiError) {
          console.error("Imported quote AI qualification failed", aiError);
        }

        return Response.json(
          { ok: true, id: inserted.id, estimate, score },
          { status: 200, headers },
        );
      },
    },
  },
});
