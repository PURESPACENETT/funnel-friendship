import { createClient } from "@supabase/supabase-js";

import { searchLocalBusinesses } from "./src/lib/prospect-search.server";
import { scanWebsiteForEmails } from "./src/lib/prospect-email.server";
import { draftOutreachEmail } from "./src/lib/prospect-ai.server";
import { sendTemplateEmail } from "./src/lib/email-templates/send-email";
import { scoreProspect } from "./src/lib/prospects-shared";

const supabase = createClient(
  process.env["VITE_SUPABASE_URL"]!,
  process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
  { auth: { persistSession: false } },
);

const TARGETS = [
  { sector: "syndic de copropriété", area: "Paris 11e", radiusKm: 4 },
  { sector: "cabinet de gestion immobilière", area: "Boulogne-Billancourt", radiusKm: 5 },
  { sector: "bureaux et coworking", area: "Montreuil", radiusKm: 5 },
  { sector: "résidence étudiante", area: "Saint-Denis", radiusKm: 6 },
];

async function run() {
  for (const target of TARGETS) {
    const { prospects: found, center } = await searchLocalBusinesses(
      target.sector,
      target.area,
      target.radiusKm,
    );
    const { data: existing } = await supabase
      .from("prospects")
      .select("external_id")
      .in("external_id", found.map((f) => f.external_id));
    const known = new Set((existing ?? []).map((r) => r.external_id));
    const fresh = found.filter((f) => !known.has(f.external_id));

    let inserted: any[] = [];
    if (fresh.length > 0) {
      const { data, error } = await supabase
        .from("prospects")
        .insert(fresh.map((f) => ({ ...f, source: "recherche", status: "a_contacter" as const })))
        .select("*");
      if (error) throw new Error(error.message);
      inserted = data ?? [];
    }

    let emailsFound = 0;
    let prepared = 0;
    for (const row of inserted.slice(0, 6)) {
      const emails = row.website ? await scanWebsiteForEmails(row.website).catch(() => []) : [];
      const draft = await draftOutreachEmail({
        companyName: row.company_name,
        sector: row.sector,
        city: row.city,
        postalCode: row.postal_code,
        website: row.website,
        notes: row.notes,
      }).catch(() => null);
      if (emails.length > 0) emailsFound += 1;
      if (draft) prepared += 1;
      await supabase
        .from("prospects")
        .update({
          ...(emails[0] ? { email: emails[0] } : {}),
          found_emails: emails,
          ...(draft
            ? {
                outreach_subject: draft.subject,
                outreach_body: draft.body,
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
    }

    await supabase.from("prospect_searches").insert({
      sector: target.sector,
      area: target.area,
      radius_km: target.radiusKm,
      center_lat: center.latitude,
      center_lng: center.longitude,
      found_count: found.length,
      new_count: fresh.length,
    });

    console.log(
      `${target.area} / ${target.sector}: ${found.length} trouvées, ${fresh.length} nouvelles, ${emailsFound} avec email, ${prepared} messages prêts`,
    );
  }

  // Full send test: use one prepared prospect but send to our own address.
  const { data: candidates } = await supabase
    .from("prospects")
    .select("*")
    .not("outreach_subject", "is", null)
    .is("outreach_sent_at", null)
    .limit(1);
  const target = candidates?.[0];
  if (!target) {
    console.log("TEST ENVOI: aucun prospect avec message prêt");
    return;
  }
  const result = await sendTemplateEmail("prospect-outreach", "contact@purespacenett.com", {
    templateData: {
      subject: target.outreach_subject,
      body: target.outreach_body,
      companyName: target.company_name,
    },
    idempotencyKey: `prospect-outreach-test-${target.id}-${Date.now()}`,
  });
  console.log("TEST ENVOI", target.company_name, JSON.stringify(result));
  if (result.sent) {
    await supabase
      .from("prospects")
      .update({ outreach_sent_at: new Date().toISOString(), status: "contacte" })
      .eq("id", target.id);
    const { data: check } = await supabase
      .from("prospects")
      .select("company_name, status, outreach_sent_at")
      .eq("id", target.id)
      .single();
    console.log("STATUT APRES ENVOI", JSON.stringify(check));
    await supabase
      .from("prospects")
      .update({ outreach_sent_at: null, status: "a_contacter" })
      .eq("id", target.id);
    console.log("fiche de test remise à zéro");
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
