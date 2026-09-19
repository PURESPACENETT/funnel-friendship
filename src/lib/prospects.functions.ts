import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  outreachDraftSchema,
  prospectPatchSchema,
  prospectSearchSchema,
  scoreProspect,
} from "./prospects-shared";

const statusEnum = z.enum([
  "nouveau",
  "a_contacter",
  "contacte",
  "interesse",
  "converti",
  "ecarte",
]);

/** Runs one bounded prospect search and stores the new companies found. */
export const searchProspects = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => prospectSearchSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { searchLocalBusinesses } = await import("./prospect-search.server");
    const found = await searchLocalBusinesses(data.sector, data.area);

    let created = 0;
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
        const { error } = await context.supabase.from("prospects").insert(
          fresh.map((f) => ({ ...f, source: "recherche", status: "a_contacter" as const })),
        );
        if (error) throw new Error(error.message);
        created = fresh.length;
      }
    }

    await context.supabase.from("prospect_searches").insert({
      sector: data.sector,
      area: data.area,
      found_count: found.length,
      new_count: created,
      created_by: context.userId,
    });

    return { found: found.length, created };
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
      notes: row.notes,
    });
    if (!draft) throw new Error("La rédaction automatique a échoué, réessayez.");

    const { error } = await context.supabase
      .from("prospects")
      .update({
        outreach_subject: draft.subject,
        outreach_body: draft.body,
        outreach_generated_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    return draft;
  });

export const saveOutreach = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => outreachDraftSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("prospects")
      .update({ outreach_subject: data.subject, outreach_body: data.body })
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

    const { sendTemplateEmail } = await import("./email-templates/send-email");
    const result = await sendTemplateEmail("prospect-outreach", row.email, {
      templateData: {
        subject: row.outreach_subject,
        body: row.outreach_body,
        companyName: row.company_name,
      },
      idempotencyKey: `prospect-outreach-${row.id}-${row.outreach_generated_at ?? "manual"}`,
    });

    if (!result.sent) {
      return { sent: false as const, reason: result.reason };
    }

    const { error } = await context.supabase
      .from("prospects")
      .update({ outreach_sent_at: new Date().toISOString(), status: "contacte" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

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

export const deleteProspect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("prospects").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
