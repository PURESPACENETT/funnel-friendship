import { z } from "zod";

export interface Option {
  value: string;
  label: string;
}

export const PROSPECT_STATUSES: Option[] = [
  { value: "nouveau", label: "Nouveau" },
  { value: "a_contacter", label: "À contacter" },
  { value: "contacte", label: "Contacté" },
  { value: "interesse", label: "Intéressé" },
  { value: "converti", label: "Client" },
  { value: "ecarte", label: "Écarté" },
];

export type ProspectStatus = (typeof PROSPECT_STATUSES)[number]["value"];

/** Target segments for a cleaning company, with the search phrase used to find them. */
export const SECTORS: Array<Option & { query: string }> = [
  { value: "bureaux", label: "Bureaux & coworking", query: "bureaux entreprise coworking" },
  { value: "syndic", label: "Syndics & copropriétés", query: "syndic de copropriété" },
  { value: "immobilier", label: "Agences immobilières", query: "agence immobilière" },
  { value: "medical", label: "Cabinets médicaux & dentaires", query: "cabinet médical dentaire" },
  { value: "commerce", label: "Commerces", query: "magasin commerce" },
  { value: "restaurant", label: "Restaurants & cafés", query: "restaurant café" },
  { value: "sport", label: "Salles de sport", query: "salle de sport fitness" },
  { value: "hotel", label: "Hôtels & résidences", query: "hôtel résidence" },
  { value: "ecole", label: "Écoles & crèches privées", query: "école privée crèche" },
  { value: "btp", label: "Entreprises du bâtiment", query: "entreprise de bâtiment travaux" },
];

/** Priority areas — Seine-Saint-Denis first, then Paris est and the rest of IDF. */
export const AREAS: string[] = [
  "Le Pré-Saint-Gervais",
  "Pantin",
  "Les Lilas",
  "Aubervilliers",
  "Bagnolet",
  "Romainville",
  "Noisy-le-Sec",
  "Bobigny",
  "Montreuil",
  "Saint-Denis",
  "Saint-Ouen",
  "Paris 19e",
  "Paris 20e",
  "Paris 11e",
  "Paris 10e",
  "Paris 2e",
  "Paris 8e",
  "Paris 17e",
  "Vincennes",
  "Neuilly-sur-Seine",
];

export const MAX_RESULTS_PER_SEARCH = 15;

export const prospectSearchSchema = z.object({
  sector: z.string().trim().min(2).max(60),
  area: z.string().trim().min(2).max(80),
});

export const prospectPatchSchema = z.object({
  id: z.string().uuid(),
  email: z.string().trim().email().max(255).or(z.literal("")).optional(),
  phone: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const outreachDraftSchema = z.object({
  id: z.string().uuid(),
  subject: z.string().trim().min(3).max(200),
  body: z.string().trim().min(20).max(6000),
});

export function labelOf(options: Option[], value: string | null | undefined): string {
  if (!value) return "—";
  return options.find((o) => o.value === value)?.label ?? value;
}

export interface ScoreInput {
  postalCode?: string | null;
  website?: string | null;
  phone?: string | null;
  email?: string | null;
  reviewsCount?: number | null;
  sector?: string | null;
}

/** 0-100 priority score: proximity first, then how reachable the prospect is. */
export function scoreProspect(input: ScoreInput): number {
  let score = 30;
  const cp = (input.postalCode ?? "").trim();
  if (cp.startsWith("93")) score += 20;
  else if (cp.startsWith("75")) score += 14;
  else if (cp) score += 6;

  if (input.email) score += 18;
  if (input.phone) score += 10;
  if (input.website) score += 8;
  if ((input.reviewsCount ?? 0) >= 20) score += 5;

  const highValue = ["bureaux", "syndic", "immobilier", "medical", "hotel", "ecole"];
  if (input.sector && highValue.includes(input.sector)) score += 9;

  return Math.max(0, Math.min(100, score));
}

export function scoreLabel(score: number): string {
  if (score >= 70) return "Haute";
  if (score >= 50) return "Moyenne";
  return "Basse";
}

/** Extracts a French postal code and city from a formatted address. */
export function parseAddress(address: string | null | undefined): {
  postalCode: string | null;
  city: string | null;
} {
  if (!address) return { postalCode: null, city: null };
  const match = address.match(/\b(\d{5})\s+([^,]+)/);
  if (!match) return { postalCode: null, city: null };
  return { postalCode: match[1] ?? null, city: (match[2] ?? "").trim() || null };
}
