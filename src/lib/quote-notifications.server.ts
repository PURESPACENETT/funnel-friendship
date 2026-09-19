import type { QuoteRequestInput } from "./quotes-shared";

export interface NewRequestPayload {
  id: string;
  estimate: { min: number; max: number };
  score: number;
  input: QuoteRequestInput;
  ownerEmail: string | null;
}

/**
 * Sends the owner alert + prospect confirmation for a new quote request.
 * Email delivery is wired once the sender domain is configured for this
 * project; until then the request is still saved and visible in the dashboard.
 */
export async function notifyNewRequest(payload: NewRequestPayload): Promise<void> {
  console.log(
    "New quote request",
    payload.id,
    payload.input.email,
    payload.estimate,
    "owner:",
    payload.ownerEmail,
  );
}
