import { createOpenAI } from "@ai-sdk/openai";
import { Output, streamText } from "ai";
import { z } from "zod";

import { labelOf, SECTORS } from "./prospects-shared";

const outreachSchema = z.object({
  subject: z.string().trim().min(3),
  body: z.string().trim().min(20),
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

const SUBCONTRACTING_SECTORS = new Set([
  "entreprise_nettoyage",
  "societe_proprete",
  "nettoyage_bureaux",
  "nettoyage_industriel",
  "nettoyage_chantier",
  "nettoyage_vitres",
  "proprete_services",
]);

const SYSTEM = [
  "Tu es Amazigh, dirigeant de PURE SPACE NETT, entreprise de nettoyage professionnel basée au Pré-Saint-Gervais (93), et intervenant dans toute l'Île-de-France.",
  "Tu rédiges des emails de prospection B2B pour deux objectifs selon le secteur ciblé.",
  "Pour une entreprise de nettoyage ou de propreté, propose PURE SPACE NETT comme partenaire de sous-traitance pour les chantiers délégués, surcharges, renforts ou zones à couvrir.",
  "Pour tous les autres secteurs, propose les prestations de nettoyage de PURE SPACE NETT adaptées à leur activité.",
  "Ne mélange jamais vente directe et sous-traitance dans le même email.",
  "Prestations réelles : entretien de bureaux et locaux, remise en état, fin de chantier, vitrerie et renfort de capacité.",
  "Ton professionnel, direct et posé. Phrases courtes, vocabulaire concret. Aucun fait inventé.",
  "Varie l'accroche et la formulation. Longueur 90 à 150 mots, 3 à 5 paragraphes courts.",
  "Termine exactement par : Amazigh — PURE SPACE NETT puis www.purespacenett.com.",
  "Objet : 5 à 9 mots, spécifique au secteur ou à la ville, sans point d'exclamation, sans « offre » ni « promotion ».",
].join("\n");

function buildPrompt(input: OutreachInput): string {
  const subcontracting = input.sector ? SUBCONTRACTING_SECTORS.has(input.sector) : false;
  return [
    "Entreprise à contacter :",
    `Nom : ${input.companyName}`,
    `Secteur : ${input.sector ? labelOf(SECTORS, input.sector) : "non précisé"}`,
    `Ville : ${input.city ?? "non précisée"}${input.postalCode ? ` (${input.postalCode})` : ""}`,
    `Site web : ${input.website ?? "non précisé"}`,
    `Notes internes : ${input.notes?.trim() || "aucune"}`,
    "",
    subcontracting
      ? "OBJECTIF : sous-traitance. Présente PURE SPACE NETT comme partenaire pour prendre des chantiers délégués."
      : "OBJECTIF : vente de prestations. Présente les services de nettoyage de PURE SPACE NETT adaptés à cette activité.",
    "Rédige l'objet et le corps du premier email. N'utilise que les informations fournies.",
  ].join("\n");
}

/**
 * Deterministic fallback used when the AI provider is unavailable, misconfigured,
 * rate-limited, or returns an invalid structured response. This guarantees that
 * automatic prospecting never leaves the email fields empty.
 */
export function buildFallbackOutreachEmail(input: OutreachInput): OutreachDraft {
  const subcontracting = input.sector ? SUBCONTRACTING_SECTORS.has(input.sector) : false;
  const city = input.city?.trim();
  const location = city ? ` à ${city}` : " en Île-de-France";

  if (subcontracting) {
    return {
      subject: `Sous-traitance nettoyage${city ? ` — ${city}` : ""}`,
      body: [
        "Bonjour,",
        "",
        `Je suis Amazigh, de PURE SPACE NETT, entreprise de nettoyage professionnel basée au Pré-Saint-Gervais.`,
        "",
        `Nous intervenons${location} pour l'entretien de bureaux et locaux, la remise en état, la fin de chantier, la vitrerie et le renfort de capacité.`,
        "",
        "Nous pouvons intervenir en sous-traitance sur des chantiers délégués, des surcharges ponctuelles ou des besoins de renfort.",
        "",
        "Seriez-vous disponible pour un échange rapide afin de voir si ce partenariat peut correspondre à vos besoins ?",
        "",
        "Amazigh — PURE SPACE NETT",
        "www.purespacenett.com",
      ].join("\n"),
    };
  }

  return {
    subject: `Nettoyage professionnel${city ? ` — ${city}` : ""}`,
    body: [
      "Bonjour,",
      "",
      `Je suis Amazigh, de PURE SPACE NETT, entreprise de nettoyage professionnel basée au Pré-Saint-Gervais.`,
      "",
      `Nous proposons${location} l'entretien de bureaux et locaux, la remise en état, la fin de chantier, la vitrerie et le renfort de capacité.`,
      "",
      "Je vous contacte afin de savoir si vous avez actuellement un besoin de nettoyage ou un prochain chantier à préparer.",
      "",
      "Seriez-vous disponible pour un échange rapide ?",
      "",
      "Amazigh — PURE SPACE NETT",
      "www.purespacenett.com",
    ].join("\n"),
  };
}

/**
 * Drafts a personalised outreach email. The AI is attempted first, but a
 * deterministic local draft is always returned when the provider is unavailable.
 */
export async function draftOutreachEmail(input: OutreachInput): Promise<OutreachDraft> {
  const fallback = buildFallbackOutreachEmail(input);
  const key = process.env["LOVABLE_API_KEY"];

  if (!key) {
    console.warn("LOVABLE_API_KEY missing; using deterministic outreach fallback");
    return fallback;
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
    console.error("Outreach drafting failed; using deterministic fallback", error);
    return fallback;
  }
}
