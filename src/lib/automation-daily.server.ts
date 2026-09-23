import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendTemplateEmail } from "./email-templates/send-email";

const REQUEST_DELAY_DAYS = 3;
const PROSPECT_DELAY_DAYS = 4;
const REVIEW_DELAY_DAYS = 1;
const REVIEW_URL = "https://share.google/2u1kIaVRrVNB4drT0";

function olderThan(value: string | null | undefined, days: number): boolean {
  if (!value) return false;
  return Date.now() - new Date(value).getTime() >= days * 86400000;
}

async function ownerEmail(): Promise<string | null> {
  const { data } = await supabaseAdmin.from("pricing_settings").select("notify_email").maybeSingle();
  return data?.notify_email ?? null;
}

export interface DailyAutomationResult {
  requestFollowups: number;
  prospectFollowups: number;
  reviewRequests: number;
  reportSent: boolean;
}

/** One bounded daily automation round: relances, avis and owner reporting. */
export async function runDailyAutomation(): Promise<DailyAutomationResult> {
  let requestFollowups = 0;
  let prospectFollowups = 0;
  let reviewRequests = 0;

  const { data: requests } = await supabaseAdmin
    .from("quote_requests")
    .select("id, status, contact_name, email, created_at, last_contacted_at")
    .in("status", ["contacte", "devis_envoye", "gagne"])
    .order("created_at", { ascending: false })
    .limit(500);

  for (const row of requests ?? []) {
    const reference = row.last_contacted_at ?? row.created_at;
    if (row.status === "gagne") {
      if (!olderThan(row.created_at, REVIEW_DELAY_DAYS)) continue;
      try {
        const result = await sendTemplateEmail("review-request", row.email, {
          templateData: { name: row.contact_name, reviewUrl: REVIEW_URL },
          idempotencyKey: `review-request-${row.id}`,
          replyTo: "contact@purespacenett.com",
        });
        if (result.sent) reviewRequests += 1;
      } catch (error) {
        console.error("review request failed", row.id, error);
      }
      continue;
    }

    if (!olderThan(reference, REQUEST_DELAY_DAYS)) continue;
    try {
      const result = await sendTemplateEmail("request-followup", row.email, {
        templateData: { name: row.contact_name },
        idempotencyKey: `request-followup-${row.id}-${new Date(reference).toISOString().slice(0, 10)}`,
        replyTo: "contact@purespacenett.com",
      });
      if (result.sent) {
        requestFollowups += 1;
        await supabaseAdmin.from("quote_requests").update({ last_contacted_at: new Date().toISOString() }).eq("id", row.id);
      }
    } catch (error) {
      console.error("request followup failed", row.id, error);
    }
  }

  const { data: prospects } = await supabaseAdmin
    .from("prospects")
    .select("id, company_name, email, status, outreach_sent_at")
    .eq("status", "contacte")
    .not("email", "is", null)
    .not("outreach_sent_at", "is", null)
    .order("outreach_sent_at", { ascending: true })
    .limit(500);

  for (const row of prospects ?? []) {
    if (!olderThan(row.outreach_sent_at, PROSPECT_DELAY_DAYS)) continue;
    try {
      const result = await sendTemplateEmail("prospect-followup", row.email, {
        templateData: { companyName: row.company_name },
        idempotencyKey: `prospect-followup-${row.id}-1`,
        replyTo: "contact@purespacenett.com",
      });
      if (result.sent) prospectFollowups += 1;
    } catch (error) {
      console.error("prospect followup failed", row.id, error);
    }
  }

  const email = await ownerEmail();
  const report = [
    "Relances demandes : " + requestFollowups,
    "Relances prospects : " + prospectFollowups,
    "Demandes d'avis : " + reviewRequests,
    "Les actions sont exécutées automatiquement avec déduplication par dossier.",
  ].join("\n");

  let reportSent = false;
  if (email) {
    try {
      const result = await sendTemplateEmail("daily-report", email, {
        templateData: { summary: report },
        idempotencyKey: `daily-commercial-report-${new Date().toISOString().slice(0, 10)}`,
      });
      reportSent = result.sent;
    } catch (error) {
      console.error("daily report failed", error);
    }
  }

  return { requestFollowups, prospectFollowups, reviewRequests, reportSent };
}
