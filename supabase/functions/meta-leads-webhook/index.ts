import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GRAPH_VERSION = Deno.env.get("META_GRAPH_API_VERSION");
const LEAD_ACCESS_TOKEN = Deno.env.get("META_LEADS_ACCESS_TOKEN") ?? Deno.env.get("META_ACCESS_TOKEN");
const VERIFY_TOKEN = Deno.env.get("META_VERIFY_TOKEN");
const APP_SECRET = Deno.env.get("META_APP_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!GRAPH_VERSION || !LEAD_ACCESS_TOKEN || !VERIFY_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Meta Lead Ads webhook configuration.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function verifySignature(request: Request, rawBody: string) {
  if (!APP_SECRET) return true;
  const signature = request.headers.get("x-hub-signature-256");
  if (!signature?.startsWith("sha256=")) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(APP_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const expected = "sha256=" + [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");

  const a = new TextEncoder().encode(signature);
  const b = new TextEncoder().encode(expected);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

function fieldMap(fieldData: unknown) {
  const result: Record<string, string> = {};
  if (!Array.isArray(fieldData)) return result;
  for (const field of fieldData) {
    const item = field as Record<string, unknown>;
    const values = Array.isArray(item.values) ? item.values : [];
    result[String(item.name ?? "")] = String(values[0] ?? "");
  }
  return result;
}

async function fetchLead(leadId: string) {
  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${leadId}`);
  url.searchParams.set("access_token", LEAD_ACCESS_TOKEN!);
  url.searchParams.set("fields", "id,created_time,form_id,ad_id,adset_id,campaign_id,field_data,custom_disclaimer_responses");
  const response = await fetch(url);
  const payload = await response.json();
  if (!response.ok || payload.error) throw new Error(payload.error?.message ?? "Unable to retrieve Meta lead");
  return payload;
}

Deno.serve(async (request) => {
  if (request.method === "GET") {
    const url = new URL(request.url);
    if (url.searchParams.get("hub.mode") === "subscribe" && url.searchParams.get("hub.verify_token") === VERIFY_TOKEN) {
      return new Response(url.searchParams.get("hub.challenge") ?? "", { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const rawBody = await request.text();
  if (!(await verifySignature(request, rawBody))) return new Response("Invalid signature", { status: 403 });

  const payload = JSON.parse(rawBody);
  const events = [];

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "leadgen") continue;

      const value = change.value ?? {};
      const leadId = String(value.leadgen_id ?? "");
      if (!leadId) continue;

      const lead = await fetchLead(leadId);
      const fields = fieldMap(lead.field_data);
      const contactName = fields.full_name || [fields.first_name, fields.last_name].filter(Boolean).join(" ");
      const email = fields.email || fields.email_address || null;
      const phone = fields.phone_number || fields.phone || null;

      const { data: attribution, error: attributionError } = await supabase
        .from("meta_lead_attributions")
        .upsert({
          lead_external_id: leadId,
          source: "meta_lead_ads",
          meta_page_id: value.page_id ? String(value.page_id) : String(entry.id ?? ""),
          meta_form_id: lead.form_id ? String(lead.form_id) : (value.form_id ? String(value.form_id) : null),
          meta_campaign_id: lead.campaign_id ? String(lead.campaign_id) : null,
          meta_adset_id: lead.adset_id ? String(lead.adset_id) : null,
          meta_ad_id: lead.ad_id ? String(lead.ad_id) : (value.ad_id ? String(value.ad_id) : null),
          lead_created_at: lead.created_time ? new Date(lead.created_time).toISOString() : null,
          contact_name: contactName || null,
          email,
          phone,
          raw: { webhook: value, lead },
        }, { onConflict: "lead_external_id" })
        .select("*")
        .single();

      if (attributionError) throw new Error(attributionError.message);

      let quoteRequestId = attribution.quote_request_id;

      if (!quoteRequestId && contactName && email && phone) {
        const { data: existing } = await supabase
          .from("quote_requests")
          .select("id")
          .eq("email", email)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existing) {
          quoteRequestId = existing.id;
        } else {
          const { data: requestRow, error: requestError } = await supabase
            .from("quote_requests")
            .insert({
              full_name: contactName,
              email,
              phone,
              status: "nouveau",
              client_type: fields.client_type === "entreprise" ? "entreprise" : "particulier",
              service_type: fields.service_type ?? "Demande via Meta Ads",
              message: fields.message ?? null,
              source_system: "meta_lead_ads",
              estimate_min: 0,
              estimate_max: 0,
            })
            .select("id")
            .single();

          if (requestError) throw new Error(requestError.message);
          quoteRequestId = requestRow.id;
        }

        const { error: linkError } = await supabase
          .from("meta_lead_attributions")
          .update({ quote_request_id: quoteRequestId })
          .eq("id", attribution.id);
        if (linkError) throw new Error(linkError.message);
      }

      events.push({ leadgen_id: leadId, quote_request_id: quoteRequestId });
    }
  }

  return Response.json({ ok: true, processed: events });
});
