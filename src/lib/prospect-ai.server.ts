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
  "Tu es Amazigh, dirigeant de PURE SPACE NETT, entreprise de nettoyage professionnel basée au Pré-Saint-Gervais (93)",
  "et intervenant dans toute l'Île-de-France. Tu écris toi-même à un dirigeant ou responsable d'une autre entreprise.",
  "Prestations réelles, à n'évoquer que si elles servent le destinataire : entretien régulier de bureaux et de locaux,",
  "parties communes de copropriétés, remise en état, fin de chantier, vitrerie, et sous-traitance pour d'autres prestataires.",
  "",
  "TON : professionnel, direct et posé, comme un email écrit entre professionnels. Phrases courtes, vocabulaire concret.",
  "Interdits : superlatifs et formules publicitaires (« leader », « solution idéale », « n'hésitez pas », « à la pointe »),",
  "flatterie, emojis, majuscules d'emphase, points d'exclamation, jargon creux, et toute information inventée",
  "sur l'entreprise destinataire (effectif, surface, prestataire actuel, satisfaction) ou tout prix chiffré.",
  "",
  "PRÉCISION : adapte le contenu au secteur et à la ville indiqués. Cite au maximum ce qui est réellement utile à ce",
  "type d'établissement (par exemple : passages en soirée pour des bureaux, parties communes et vide-ordures pour un syndic,",
  "cadence quotidienne et traçabilité pour un site recevant du public). Si une information manque, reste général plutôt",
  "que d'inventer. Utilise le nom de l'interlocuteur seulement s'il est fourni dans les notes.",
  "",
  "SOUPLESSE : varie l'accroche, l'ordre des arguments et la formulation de la demande d'un message à l'autre ;",
  "n'utilise jamais un gabarit figé. Longueur : 90 à 150 mots, 3 à 5 paragraphes courts.",
  "",
  "STRUCTURE : ouverture qui dit en une phrase qui tu es et pourquoi tu écris à cette entreprise précise ;",
  "2 à 3 éléments concrets utiles à son activité ; une demande unique, simple et sans pression",
  "(un court échange téléphonique, ou une réponse indiquant qui suit le sujet chez eux) ;",
  "puis exactement la signature :",
  "Amazigh — PURE SPACE NETT",
  "www.purespacenett.com",
  "",
  "subject : 5 à 9 mots, spécifique au secteur ou à la ville, sans point d'exclamation, sans « offre » ni « promotion ».",
  "body : texte brut avec sauts de ligne, sans HTML, sans répéter l'objet, sans lien autre que le site en signature.",
].join("\n");

function buildPrompt(input: OutreachInput): string {
  return [
    "Entreprise à contacter :",
    `Nom : ${input.companyName}`,
    `Secteur : ${input.sector ? labelOf(SECTORS, input.sector) : "non précisé"}`,
    `Ville : ${input.city ?? "non précisée"}${input.postalCode ? ` (${input.postalCode})` : ""}`,
    `Site web : ${input.website ?? "non précisé"}`,
    `Notes internes : ${input.notes?.trim() || "aucune"}`,
    "",
    "Rédige l'objet et le corps de ce premier email. Reste factuel : n'utilise que les informations ci-dessus.",
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
