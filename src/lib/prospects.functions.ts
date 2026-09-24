import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  outreachDraftSchema,
  PROSPECT_STATUS_VALUES,
  PROSPECT_STATUSES,
  labelOf,
  prospectPatchSchema,
  prospectSearchSchema,
  scoreProspect,
} from "./prospects-shared";
import { logProspectActivity } from "./prospect-activity.server";

const statusEnum = z.enum(PROSPECT_STATUS_VALUES);

function enforceAmazighSignature(value: string): string {
  return value.replace(/\bAmine\b/gi, "Amazigh");
}

/** How many freshly found companies get their email + message prepared automatically. */
const AUTO_PREPARE_LIMIT = 6;

interface FreshProspect {
  id: string;
  company_name: string;
  sector: string | null;
  city: string | null;
  postal_code: string | null;
  website: string | null;
  notes: string | null;
  phone: string | null;
  reviews_count: number | null;
}

/**
 * For each newly found company: look for a public email, identify the contact,
 * then write the first message and store it for review. Nothing is sent here.
 */
async function autoPrepare(
  supabase: { from: (table: string) => any },
  rows: FreshProspect[],
): Promise<number> {
  const [{ scanWebsiteForEmails, findContactViaClay, clayConfigured }, { draftOutreachEmail }] =
    await Promise.all([import("./prospect-email.server"), import("./prospect-ai.server")]);

  const results = await Promise.allSettled(
    rows.slice(0, AUTO_PREPARE_LIMIT).map(async (row) => {
      const emails = row.website ? await scanWebsiteForEmails(row.website).catch(() => []) : [];
      const email = emails[0] ?? null;

      let contact: Awaited<ReturnType<typeof findContactViaClay>> = null;
      if (clayConfigured()) {
        contact = await findContactViaClay({
          website: row.website,
          companyName: row.company_name,
        }).catch(() => null);
      }

      const draft = await draftOutreachEmail({
        companyName: row.company_name,
        sector: row.sector,
        city: row.city,
        postalCode: row.postal_code,
        website: row.website,
        notes: [row.notes, contact ? `Interlocuteur : ${contact.contactName}` : null]
          .filter(Boolean)
          .join("\n") || null,
      }).catch(() => null);

      const safeDraft = draft
        ? { subject: draft.subject, body: enforceAmazighSignature(draft.body) }
        : null;

      const { error } = await supabase
        .from("prospects")
        .update({
          ...(email ? { email } : {}),
          found_emails: emails,
          ...(contact
            ? {
                contact_name: contact.contactName,
                contact_title: contact.title,
                contact_linkedin: contact.linkedin,
              }
            : {}),
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
            email,
            reviewsCount: row.reviews_count,
            sector: row.sector,
          }),
        })
        .eq("id", row.id);
      if (error) throw new Error(error.message);
      return Boolean(safeDraft);
    }),
  );

  return results.filter((r) => r.status === "fulfilled" && r.value).length;
}

/** Runs one bounded prospect search and stores the new companies found. */
export const searchProspects = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => prospectSearchSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { searchLocalBusinesses } = await import("./prospect-search.server");
    const { prospects: found, center } = await searchLocalBusinesses(
      data.sector,
      data.area,
      data.radiusKm,
    );

    let created = 0;
    let prepared = 0;

    if (found.length > 0) {
      const { data: existing, error: existingError } = await context.supabase
        .from("prospects")
        .select("external_id")
        .in(
          "external_id",
          found.map((f) => f.external_id),
        );
      if (existingError) throw new Error(existingError.message);

      const known = new Set((existing ?? []).map((row) => row.external_id));
      const fresh = found.filter((f) => !known.has(f.external_id));

      if (fresh.length > 0) {
        const { data: inserted, error } = await context.supabase
          .from("prospects")
          .insert(
            fresh.map((f) => ({ ...f, source: "recherche", status: "a_contacter" as const })),
          )
          .select(
            "id, company_name, sector, city, postal_code, website, notes, phone, reviews_count",
          );
        if (error) throw new Error(error.message);
        created = fresh.length;

        try {
          prepared = await autoPrepare(context.supabase, (inserted ?? []) as FreshProspect[]);
        } catch (prepareError) {
          console.error("auto prepare failed", prepareError);
        }
      }
    }

    await context.supabase.from("prospect_searches").insert({
      sector: data.sector,
      area: data.area,
      radius_km: data.radiusKm,
      center_lat: center.latitude,
      center_lng: center.longitude,
      found_count: found.length,
      new_count: created,
      created_by: context.userId,
    });

    return { found: found.length, created, prepared, center };
  });

export const listProspects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("prospects")
      .select("*")
      .order("score", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(400);
    if (error) throw new Error(error.message);

    const { data: searches } = await context.supabase
      .from("prospect_searches")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);

    return { prospects: data ?? [], searches: searches ?? [] };
  });

export const updateProspectStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), status: statusEnum }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("prospects")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateProspect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => prospectPatchSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error: readError } = await context.supabase
      .from("prospects")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!row) throw new Error("Prospect introuvable");

    const email = data.email === undefined ? row.email : data.email || null;
    const phone = data.phone === undefined ? row.phone : data.phone || null;

    const { error } = await context.supabase
      .from("prospects")
      .update({
        email,
        phone,
        ...(data.notes === undefined ? {} : { notes: data.notes || null }),
        score: scoreProspect({
          postalCode: row.postal_code,
          website: row.website,
          phone,
          email,
          reviewsCount: row.reviews_count,
          sector: row.sector,
        }),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Drafts a personalised outreach email and stores it for review. */
export const generateOutreach = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error: readError } = await context.supabase
      .from("prospects")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!row) throw new Error("Prospect introuvable");

    const { draftOutreachEmail } = await import("./prospect-ai.server");
    const draft = await draftOutreachEmail({
      companyName: row.company_name,
      sector: row.sector,
      city: row.city,
      postalCode: row.postal_code,
      website: row.website,
      notes: [row.notes, row.contact_name ? `Interlocuteur : ${row.contact_name}` : null]
        .filter(Boolean)
        .join("\n") || null,
    });
    if (!draft) throw new Error("La rédaction automatique a échoué, réessayez.");

    const safeDraft = {
      subject: draft.subject,
      body: enforceAmazighSignature(draft.body),
    };

    const { error } = await context.supabase
      .from("prospects")
      .update({
        outreach_subject: safeDraft.subject,
        outreach_body: safeDraft.body,
        outreach_generated_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    return safeDraft;
  });

export const saveOutreach = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => outreachDraftSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("prospects")
      .update({
        outreach_subject: data.subject,
        outreach_body: enforceAmazighSignature(data.body),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Sends the reviewed outreach email. Nothing is ever sent without this call. */
export const sendOutreach = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error: readError } = await context.supabase
      .from("prospects")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!row) throw new Error("Prospect introuvable");
    if (!row.email) throw new Error("Ajoutez d'abord une adresse email pour ce prospect.");
    if (!row.outreach_subject || !row.outreach_body)
      throw new Error("Préparez d'abord le message avant l'envoi.");

    const safeBody = enforceAmazighSignature(row.outreach_body);
    if (safeBody !== row.outreach_body) {
      const { error: signatureError } = await context.supabase
        .from("prospects")
        .update({ outreach_body: safeBody })
        .eq("id", data.id);
      if (signatureError) throw new Error(signatureError.message);
    }

    const { sendTemplateEmail } = await import("./email-templates/send-email");
    const result = await sendTemplateEmail("prospect-outreach", row.email, {
      templateData: {
        subject: row.outreach_subject,
        body: safeBody,
        companyName: row.company_name,
      },
      idempotencyKey: `prospect-outreach-${row.id}-${row.outreach_generated_at ?? "manual"}`,
      replyTo: "contact@purespacenett.com",
    });

    if (!result.sent) {
      return { sent: false as const, reason: result.reason };
    }

    const { error } = await context.supabase
      .from("prospects")
      .update({ outreach_sent_at: new Date().toISOString(), status: "contacte" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    try {
      const { notifyOwner } = await import("./prospection-daily.server");
      await notifyOwner(
        [{ name: row.company_name, email: row.email, city: row.city }],
        "manuel",
      );
    } catch (alertError) {
      console.error("owner contacted alert failed", alertError);
    }

    return { sent: true as const };
  });


/** Imports a pasted list: one company per line — Nom; email; téléphone; ville */
export const importProspects = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ text: z.string().trim().min(2).max(20000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const rows = data.text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 200)
      .map((line) => {
        const [name, email, phone, city] = line.split(/[;,\t]/).map((part) => part.trim());
        return { name: name ?? "", email: email ?? "", phone: phone ?? "", city: city ?? "" };
      })
      .filter((row) => row.name.length > 1);

    if (rows.length === 0) throw new Error("Aucune ligne exploitable dans la liste collée.");

    const { error } = await context.supabase.from("prospects").insert(
      rows.map((row) => ({
        source: "import",
        status: "a_contacter" as const,
        company_name: row.name.slice(0, 200),
        email: row.email || null,
        phone: row.phone || null,
        city: row.city || null,
        score: scoreProspect({ email: row.email, phone: row.phone }),
      })),
    );
    if (error) throw new Error(error.message);

    return { created: rows.length };
  });

/** Reads the company website and returns every public address found. */
export const scanProspectWebsite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error: readError } = await context.supabase
      .from("prospects")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!row) throw new Error("Prospect introuvable");
    if (!row.website)
      throw new Error("Cette entreprise n'a pas de site web enregistré.");

    const { scanWebsiteForEmails } = await import("./prospect-email.server");
    const emails = await scanWebsiteForEmails(row.website);

    const email = row.email ?? emails[0] ?? null;
    const { error } = await context.supabase
      .from("prospects")
      .update({
        found_emails: emails,
        email,
        score: scoreProspect({
          postalCode: row.postal_code,
          website: row.website,
          phone: row.phone,
          email,
          reviewsCount: row.reviews_count,
          sector: row.sector,
        }),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    return { emails, email };
  });

/** Looks for a professional email on the website, and the contact to address via Clay. */
export const findProspectEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error: readError } = await context.supabase
      .from("prospects")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!row) throw new Error("Prospect introuvable");

    const { scanWebsiteForEmails, findContactViaClay, clayConfigured } = await import(
      "./prospect-email.server"
    );

    let emails: string[] = [];
    try {
      emails = await scanWebsiteForEmails(row.website);
    } catch (error) {
      console.error("website email scan failed", error);
    }

    let contact: Awaited<ReturnType<typeof findContactViaClay>> = null;
    if (clayConfigured()) {
      try {
        contact = await findContactViaClay({
          website: row.website,
          companyName: row.company_name,
        });
      } catch (error) {
        console.error("clay contact lookup failed", error);
      }
    }

    const email = emails[0] ?? row.email ?? null;

    const { error } = await context.supabase
      .from("prospects")
      .update({
        email,
        found_emails: emails.length > 0 ? emails : row.found_emails,
        ...(contact
          ? {
              contact_name: contact.contactName,
              contact_title: contact.title,
              contact_linkedin: contact.linkedin,
            }
          : {}),
        score: scoreProspect({
          postalCode: row.postal_code,
          website: row.website,
          phone: row.phone,
          email,
          reviewsCount: row.reviews_count,
          sector: row.sector,
        }),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    return {
      found: Boolean(email) as boolean,
      email,
      emails,
      contact,
    };
  });

export const deleteProspect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("prospects").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
