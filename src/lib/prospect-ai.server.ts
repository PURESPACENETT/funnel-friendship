import { createOpenAI } from "@ai-sdk/openai";
import { Output, streamText } from "ai";
import { z } from "zod";

import { labelOf, SECTORS } from "./prospects-shared";

const outreachSchema = z.object({
  subject: z.string(),
  body: z.string(),
});

export type OutreachDraft = z.infer<typeof outreachSchema>;

export interface OutreachInput {
  companyName: string;
  sector?: string | null;
  city?: string | null;
  postalCode?: string | null;
  website?: string | null;
  notes?: string | null;
}

const SYSTEM = [
  "Tu rédiges des emails de prospection B2B en français pour PURE SPACE NETT,",
  "entreprise de nettoyage professionnel basée au Pré-Saint-Gervais (93) et intervenant dans toute l'Île-de-France.",
  "Elle propose l'entretien de bureaux et locaux, la remise en état, le nettoyage de fin de chantier,",
  "les vitres et les contrats récurrents, y compris en sous-traitance pour d'autres prestataires.",
  "Règles : 120 à 160 mots maximum, vouvoiement, ton sobre et concret, aucun superlatif marketing,",
  "aucune information inventée sur l'entreprise destinataire, aucune promesse de prix chiffrée.",
  "Structure : accroche locale (ville/secteur), 2 à 3 bénéfices concrets, proposition d'un court échange téléphonique,",
  "signature « Amazigh — PURE SPACE NETT » suivie de www.purespacenett.com.",
  "subject : 6 à 9 mots, sans majuscules excessives ni point d'exclamation.",
  "body : texte brut avec des sauts de ligne, sans HTML, sans objet répété.",
].join("\n");

function buildPrompt(input: OutreachInput): string {
  return [
    "Entreprise à contacter :",
    `Nom : ${input.companyName}`,
    `Secteur : ${input.sector ? labelOf(SECTORS, input.sector) : "non précisé"}`,
    `Ville : ${input.city ?? "non précisée"}${input.postalCode ? ` (${input.postalCode})` : ""}`,
    `Site web : ${input.website ?? "non précisé"}`,
    `Notes internes : ${input.notes?.trim() || "aucune"}`,
  ].join("\n");
}

/** Drafts a personalised outreach email with Lovable AI. Returns null on failure. */
export async function draftOutreachEmail(input: OutreachInput): Promise<OutreachDraft | null> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) {
    console.error("LOVABLE_API_KEY missing, skipping outreach drafting");
    return null;
  }

  const lovable = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey: key,
    headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });

  try {
    const result = streamText({
      model: lovable.responses("openai/gpt-6-astra"),
      system: SYSTEM,
      prompt: buildPrompt(input),
      output: Output.object({ schema: outreachSchema }),
      providerOptions: {
        openai: {
          forceReasoning: true,
          reasoningEffort: "low",
          reasoningSummary: "auto",
          store: false,
          include: ["reasoning.encrypted_content"],
        },
      },
    });

    const output = await result.output;
    return outreachSchema.parse(output);
  } catch (error) {
    console.error("Outreach drafting failed", error);
    return null;
  }
}
