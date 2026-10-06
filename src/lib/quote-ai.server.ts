import { Output, streamText } from "ai";
import { z } from "zod";

import { createAIRouter, logAIUsage } from "./ai-router.server";
import { FREQUENCIES, PROPERTY_TYPES, CLIENT_TYPES, SERVICES, labelOf } from "./quotes-shared";

export const qualificationSchema = z.object({
  summary: z.string().trim().min(1).max(600),
  keyPoints: z.array(z.string().trim().min(1).max(240)).min(3).max(5),
  urgency: z.enum(["faible", "moyenne", "elevee"]),
  nextStep: z.string().trim().min(1).max(300),
});

export type Qualification = z.infer<typeof qualificationSchema>;

export interface QualifyInput {
  clientType: string;
  propertyType: string;
  surfaceM2: number;
  rooms?: number | null;
  frequency: string;
  services: string[];
  city: string;
  postalCode: string;
  desiredDate?: string | null;
  contactName: string;
  companyName?: string | null;
  message?: string | null;
  estimateMin: number;
  estimateMax: number;
}

function buildPrompt(input: QualifyInput): string {
  return [
    "Demande de devis reçue par une entreprise de nettoyage professionnel (PURE SPACE NETT).",
    `Type de client : ${labelOf(CLIENT_TYPES, input.clientType)}`,
    `Contact : ${input.contactName}${input.companyName ? ` (${input.companyName})` : ""}`,
    `Lieu : ${labelOf(PROPERTY_TYPES, input.propertyType)} à ${input.city} (${input.postalCode})`,
    `Surface : ${input.surfaceM2} m²${input.rooms ? `, ${input.rooms} pièces/étages` : ""}`,
    `Fréquence : ${labelOf(FREQUENCIES, input.frequency)}`,
    `Prestations : ${input.services.map((s) => labelOf(SERVICES, s)).join(", ")}`,
    `Date souhaitée : ${input.desiredDate || "non précisée"}`,
    `Estimation automatique : ${input.estimateMin} à ${input.estimateMax} € par intervention`,
    "",
    "Besoin décrit par le prospect (texte libre) :",
    input.message?.trim() ? input.message.trim() : "(aucune précision écrite)",
  ].join("\n");
}

const SYSTEM = [
  "Tu qualifies des demandes de devis pour une entreprise de nettoyage professionnel en France.",
  "Écris uniquement en français, de manière factuelle et opérationnelle, pour l'équipe commerciale.",
  "N'invente aucune information absente de la demande.",
  "summary : 2 à 3 phrases maximum résumant le besoin réel et le contexte.",
  "keyPoints : 3 à 5 points courts et concrets (contraintes, accès, horaires, récurrence, volume, signaux d'achat).",
  "urgency : faible, moyenne ou elevee selon la date souhaitée et le ton du message.",
  "nextStep : une seule phrase indiquant l'action commerciale à faire en premier.",
].join("\n");

/** Generates a qualified summary of a quote request with Lovable AI. */
export async function qualifyQuoteRequest(input: QualifyInput): Promise<Qualification | null> {
  const ai = createAIRouter();
  if (!ai) {
    console.error("OPENAI_API_KEY missing, skipping AI qualification");
    return null;
  }

  try {
    const result = streamText({
      model: ai.modelFor("quoteQualification"),
      system: SYSTEM,
      prompt: buildPrompt(input),
      output: Output.object({ schema: qualificationSchema }),
      providerOptions: ai.providerOptionsFor("quoteQualification"),
    });

    const output = await result.output;
    const qualification = qualificationSchema.parse(output);
    await logAIUsage("quoteQualification", result.usage);
    return qualification;
  } catch (error) {
    console.error("GPT-6.1 Sol quote qualification failed", error);
    return null;
  }
}

/** Qualifies a stored request and persists the result. */
export async function qualifyAndStore(requestId: string, input: QualifyInput): Promise<boolean> {
  const qualification = await qualifyQuoteRequest(input);
  if (!qualification) return false;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin
    .from("quote_requests")
    .update({
      ai_summary: qualification.summary,
      ai_key_points: qualification.keyPoints.slice(0, 6),
      ai_urgency: qualification.urgency,
      ai_next_step: qualification.nextStep,
      ai_generated_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (error) {
    console.error("Storing AI qualification failed", error.message);
    return false;
  }
  return true;
}
