import { supabaseAdmin } from "@/integrations/supabase/client.server";

import { draftOutreachEmail } from "./prospect-ai.server";
import { scanWebsiteForEmails } from "./prospect-email.server";
import { searchLocalBusinesses } from "./prospect-search.server";
import { scoreProspect } from "./prospects-shared";
import { sendTemplateEmail } from "./email-templates/send-email";

/** Sectors and areas rotated across the week, Paris + Île-de-France. */
const PLAN: { sector: string; area: string; radiusKm: number }[][] = [
  // Sunday
  [
    { sector: "syndic de copropriété", area: "Paris 11e", radiusKm: 4 },
    { sector: "cabinet de gestion immobilière", area: "Paris 17e", radiusKm: 4 },
  ],
  // Monday
  [
    { sector: "bureaux et coworking", area: "Paris 9e", radiusKm: 4 },
    { sector: "agence immobilière", area: "Boulogne-Billancourt", radiusKm: 5 },
  ],
  // Tuesday
  [
    { sector: "syndic de copropriété", area: "Montreuil", radiusKm: 5 },
    { sector: "résidence étudiante", area: "Saint-Denis", radiusKm: 6 },
  ],
  // Wednesday
  [
    { sector: "bureaux et coworking", area: "Levallois-Perret", radiusKm: 4 },
    { sector: "cabinet de gestion immobilière", area: "Créteil", radiusKm: 6 },
  ],
  // Thursday
  [
    { sector: "clinique et cabinet médical", area: "Paris 15e", radiusKm: 4 },
    { sector: "syndic de copropriété", area: "Nanterre", radiusKm: 6 },
  ],
  // Friday
  [
    { sector: "hôtel", area: "Paris 10e", radiusKm: 4 },
    { sector: "société de nettoyage", area: "Aubervilliers", radiusKm: 6 },
  ],
  // Saturday
  [
    { sector: "salle de sport", area: "Paris 12e", radiusKm: 4 },
    { sector: "agence immobilière", area: "Versailles", radiusKm: 7 },
  ],
];

/** Hard caps so a single run stays bounded and predictable. */
const PREPARE_LIMIT = 6;
const SEND_LIMIT = 8;

function enforceAmazighSignature(value: string): string {
  return value.replace(/\bAmine\b/gi, "Amazigh");
}

export interface DailyProspectionResult {
  found: number;
  created: number;
  prepared: number;
  sent: number;
  contacted: { name: string; email: string; city: string | null }[];
}

/**
 * One automatic prospecting round: find new companies around Paris and
 * Île-de-France, look for their public email, write the first message,
 * send it, and report every card that moved to "Contacté".
 */
export async function runDailyProspection(): Promise<DailyProspectionResult> {
  const targets = PLAN[new Date().getUTCDay()] ?? PLAN[0]!;
  let found = 0;
  let created = 0;
  let prepared = 0;

  for (const target of targets) {
    try {
      const { prospects: results, center } = await searchLocalBusinesses(
        target.sector,
        target.area,
        target.radiusKm,
      );
      found += results.length;

      let fresh: typeof results = [];
      if (results.length > 0) {
        const { data: existing } = await supabaseAdmin
          .from("prospects")
          .select("external_id")
          .in(
            "external_id",
            results.map((r) => r.external_id),
          );
        const known = new Set((existing ?? []).map((row) => row.external_id));
        fresh = results.filter((r) => !known.has(r.external_id));
      }

      if (fresh.length > 0) {
        const { data: inserted, error } = await supabaseAdmin
          .from("prospects")
          .insert(
            fresh.map((f) => ({ ...f, source: "auto", status: "a_contacter" as const })),
          )
          .select("*");
        if (error) throw new Error(error.message);
        created += fresh.length;
        prepared += await prepareRows((inserted ?? []).slice(0, PREPARE_LIMIT));
      }

      await supabaseAdmin.from("prospect_searches").insert({
        sector: target.sector,
        area: target.area,
        radius_km: target.radiusKm,
        center_lat: center.latitude,
        center_lng: center.longitude,
        found_count: results.length,
        new_count: fresh.length,
      });
    } catch (error) {
      console.error("daily prospection search failed", target, error);
    }
  }

  const contacted = await sendPreparedOutreach();

  await notifyOwner(contacted, "automatique", {
    found,
    created,
    prepared,
    sent: contacted.length,
  });

  return { found, created, prepared, sent: contacted.length, contacted };
}

/** Looks for a public email and writes the first message for each new company. */
async function prepareRows(rows: any[]): Promise<number> {
  let prepared = 0;

  for (const row of rows) {
    try {
      const emails = row.website ? await scanWebsiteForEmails(row.website).catch(() => []) : [];
      const draft = await draftOutreachEmail({
        companyName: row.company_name,
        sector: row.sector,
        city: row.city,
        postalCode: row.postal_code,
        website: row.website,
        notes: row.notes,
      }).catch(() => null);

      const safeDraft = draft
        ? { subject: draft.subject, body: enforceAmazighSignature(draft.body) }
        : null;

      await supabaseAdmin
        .from("prospects")
        .update({
          ...(emails[0] ? { email: emails[0] } : {}),
          found_emails: emails,
          ...(safeDraft
            ? {
                outreach_subject: safeDraft.subject,
                outreach_body: safeDraft.body,
                outreach_generated_at: new Date().toISOString(),
              }
            : {}),
          score: scoreProspect({
            postalCode: row.postal_code,
            website: row.website,
            phone: row.phone,
            email: emails[0] ?? null,
            reviewsCount: row.reviews_count,
            sector: row.sector,
          }),
        })
        .eq("id", row.id);

      if (safeDraft) prepared += 1;
    } catch (error) {
      console.error("daily prospection prepare failed", row?.id, error);
    }
  }

  return prepared;
}

/** Sends up to SEND_LIMIT reviewed-ready messages and flags them as contacted. */
async function sendPreparedOutreach() {
  const { data: ready } = await supabaseAdmin
    .from("prospects")
    .select("id, company_name, city, email, outreach_subject, outreach_body, outreach_generated_at")
    .not("email", "is", null)
    .not("outreach_subject", "is", null)
    .not("outreach_body", "is", null)
    .is("outreach_sent_at", null)
    .in("status", ["nouveau", "a_contacter"])
    .order("score", { ascending: false })
    .limit(SEND_LIMIT);

  const contacted: { name: string; email: string; city: string | null }[] = [];

  for (const row of ready ?? []) {
    try {
      const safeBody = enforceAmazighSignature(row.outreach_body!);
      if (safeBody !== row.outreach_body) {
        const { error: signatureError } = await supabaseAdmin
          .from("prospects")
          .update({ outreach_body: safeBody })
          .eq("id", row.id);
        if (signatureError) throw new Error(signatureError.message);
      }

      const result = await sendTemplateEmail("prospect-outreach", row.email!, {
        templateData: {
          subject: row.outreach_subject,
          body: safeBody,
          companyName: row.company_name,
        },
        idempotencyKey: `prospect-outreach-${row.id}-${row.outreach_generated_at ?? "auto"}`,
      });
      if (!result.sent) continue;

      await supabaseAdmin
        .from("prospects")
        .update({ outreach_sent_at: new Date().toISOString(), status: "contacte" })
        .eq("id", row.id);

      contacted.push({ name: row.company_name, email: row.email!, city: row.city });
    } catch (error) {
      console.error("daily prospection send failed", row.id, error);
    }
  }

  return contacted;
}

/** Alerts the owner about every card that just moved to "Contacté". */
export async function notifyOwner(
  contacted: { name: string; email: string; city: string | null }[],
  origin: "automatique" | "manuel",
  counts?: { found: number; created: number; prepared: number; sent: number },
) {
  if (contacted.length === 0) return;

  const { data: settings } = await supabaseAdmin
    .from("pricing_settings")
    .select("notify_email")
    .maybeSingle();
  const ownerEmail = settings?.notify_email;
  if (!ownerEmail) return;

  const summary = counts
    ? `${counts.found} entreprise(s) trouvée(s), ${counts.created} nouvelle(s) fiche(s), ${counts.prepared} message(s) préparé(s), ${counts.sent} email(s) envoyé(s).`
    : "";

  try {
    await sendTemplateEmail("prospect-contacted-owner", ownerEmail, {
      templateData: { companies: contacted, origin, summary },
      idempotencyKey: `prospect-contacted-${origin}-${contacted
        .map((c) => c.email)
        .join(",")
        .slice(0, 120)}-${new Date().toISOString().slice(0, 13)}`,
    });
  } catch (error) {
    console.error("owner contacted alert failed", error);
  }
}
