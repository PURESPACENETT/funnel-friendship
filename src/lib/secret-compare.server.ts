import { createHash, timingSafeEqual } from "node:crypto";

const digest = (value: string) => createHash("sha256").update(value, "utf8").digest();

/** Constant-time check of a provided secret against one or more accepted values. */
export function secretMatches(provided: string | null | undefined, accepted: (string | undefined)[]): boolean {
  if (!provided) return false;
  const p = digest(provided);
  let ok = false;
  for (const value of accepted) {
    if (value && timingSafeEqual(p, digest(value))) ok = true;
  }
  return ok;
}

/** Reads a secret from x-cron-secret or Authorization: Bearer. */
export function providedCronSecret(request: Request): string | null {
  const header = request.headers.get("x-cron-secret") ?? request.headers.get("authorization");
  return header?.startsWith("Bearer ") ? header.slice(7) : header;
}
