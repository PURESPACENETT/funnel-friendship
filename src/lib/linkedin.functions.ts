import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const statusEnum = z.enum(["a_contacter", "contacte", "interesse", "converti", "ecarte"]);

export const listLinkedInContacts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("linkedin_contacts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw new Error(error.message);
    return { contacts: data ?? [] };
  });

export const addLinkedInContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        fullName: z.string().trim().min(2).max(120),
        company: z.string().trim().max(160).optional(),
        city: z.string().trim().max(120).optional(),
        roleKey: z.string().trim().max(40).optional(),
        linkedinUrl: z.string().trim().max(400).optional(),
        notes: z.string().trim().max(2000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("linkedin_contacts")
      .insert({
        full_name: data.fullName,
        company: data.company || null,
        city: data.city || null,
        role_key: data.roleKey || null,
        linkedin_url: data.linkedinUrl || null,
        notes: data.notes || null,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

/** Moves a LinkedIn contact along the pipeline; alerts the owner on "Contacté". */
export const updateLinkedInContactStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), status: statusEnum }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error: readError } = await context.supabase
      .from("linkedin_contacts")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!row) throw new Error("Contact introuvable");

    const becomesContacted = data.status === "contacte" && !row.contacted_at;

    const { error } = await context.supabase
      .from("linkedin_contacts")
      .update({
        status: data.status,
        ...(becomesContacted ? { contacted_at: new Date().toISOString() } : {}),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    if (becomesContacted) {
      try {
        const { notifyOwner } = await import("./prospection-daily.server");
        await notifyOwner(
          [
            {
              name: `${row.full_name}${row.company ? ` — ${row.company}` : ""} (LinkedIn)`,
              email: row.linkedin_url ?? "LinkedIn",
              city: row.city,
            },
          ],
          "manuel",
        );
      } catch (alertError) {
        console.error("linkedin contacted alert failed", alertError);
      }
    }

    return { ok: true, alerted: becomesContacted };
  });

export const deleteLinkedInContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("linkedin_contacts")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
