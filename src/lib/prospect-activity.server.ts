import type { Database, Json } from "@/integrations/supabase/types";

type ActivityType = Database["public"]["Enums"]["prospect_activity_type"];

export interface ActivityInput {
  prospectId: string;
  type: ActivityType;
  title: string;
  body?: string | null;
  createdBy?: string | null;
  metadata?: Json;
  occurredAt?: string;
  /** When set, the same (prospect, key) is journaled only once. */
  dedupeKey?: string | null;
}

/**
 * Writes one timeline entry. Never throws: journaling must not break the
 * business action (status change, email send) it describes.
 */
export async function logProspectActivity(
  supabase: { from: (table: string) => any },
  input: ActivityInput,
): Promise<void> {
  const { error } = await supabase.from("prospect_activities").insert({
    prospect_id: input.prospectId,
    activity_type: input.type,
    title: input.title,
    body: input.body ?? null,
    created_by: input.createdBy ?? null,
    metadata: input.metadata ?? {},
    occurred_at: input.occurredAt ?? new Date().toISOString(),
    dedupe_key: input.dedupeKey ?? null,
  });
  // 23505 = already journaled with this dedupe key: expected, ignore.
  if (error && error.code !== "23505") {
    console.error("prospect activity log failed", input.type, error.message);
  }
}
