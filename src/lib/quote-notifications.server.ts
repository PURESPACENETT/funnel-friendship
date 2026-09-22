import type { QuoteRequestInput } from "./quotes-shared";
import { CLIENT_TYPES, FREQUENCIES, formatEuros, labelOf, scoreLabel } from "./quotes-shared";
import { sendTemplateEmail } from "./email-templates/send-email";

export interface NewRequestPayload {
  id: string;
  estimate: { min: number; max: number };
  score: number;
  input: QuoteRequestInput;
  ownerEmail: string | null;
}

/**
 * Sends the owner alert + prospect confirmation for a new quote request.
 * Email failures are logged but never block the request — it is already
 * saved and visible in the dashboard.
 */
export async function notifyNewRequest(payload: NewRequestPayload): Promise<void> {
  const { id, estimate, score, input, ownerEmail } = payload;
  const estimateMin = formatEuros(estimate.min);
  const estimateMax = formatEuros(estimate.max);
  const frequency = labelOf(FREQUENCIES, input.frequency);
  const clientType = labelOf(CLIENT_TYPES, input.clientType);

  try {
    await sendTemplateEmail("request-confirmation", input.email, {
      templateData: {
        name: input.contactName,
        estimateMin,
        estimateMax,
        frequency,
        city: input.city,
      },
      idempotencyKey: `request-confirmation-${id}`,
      replyTo: "contact@purespacenett.com",
    });
  } catch (error) {
    console.error("Prospect confirmation email failed", id, error);
  }

  if (!ownerEmail) return;
  try {
    await sendTemplateEmail("new-request-owner", ownerEmail, {
      templateData: {
        clientType,
        name: input.contactName,
        email: input.email,
        phone: input.phone,
        city: input.city,
        postalCode: input.postalCode,
        surface: input.surfaceM2,
        frequency,
        estimateMin,
        estimateMax,
        scoreLabel: scoreLabel(score),
        requestId: id,
      },
      idempotencyKey: `new-request-owner-${id}`,
      replyTo: "contact@purespacenett.com",
    });
  } catch (error) {
    console.error("Owner alert email failed", id, error);
  }
}
