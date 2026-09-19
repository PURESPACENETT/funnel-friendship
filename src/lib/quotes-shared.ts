import { z } from "zod";

export const CLIENT_TYPES = [
  { value: "entreprise", label: "Entreprise" },
  { value: "sous_traitance", label: "Sous-traitance" },
  { value: "particulier", label: "Particulier" },
] as const;

export const PROPERTY_TYPES = [
  { value: "bureaux", label: "Bureaux" },
  { value: "commerce", label: "Commerce / local" },
  { value: "immeuble", label: "Immeuble / copropriété" },
  { value: "chantier", label: "Chantier" },
  { value: "logement", label: "Logement" },
  { value: "autre", label: "Autre" },
] as const;

export const FREQUENCIES = [
  { value: "ponctuel", label: "Ponctuel (une seule fois)" },
  { value: "hebdomadaire", label: "1 fois par semaine" },
  { value: "plusieurs_semaine", label: "Plusieurs fois par semaine" },
  { value: "quotidien", label: "Tous les jours" },
  { value: "contrat_annuel", label: "Contrat annuel" },
] as const;

export const SERVICES = [
  { value: "nettoyage_courant", label: "Nettoyage courant" },
  { value: "vitrerie", label: "Vitrerie" },
  { value: "remise_en_etat", label: "Remise en état" },
  { value: "fin_de_chantier", label: "Fin de chantier" },
  { value: "desinfection", label: "Désinfection" },
] as const;

export const STATUSES = [
  { value: "nouveau", label: "Nouveau" },
  { value: "contacte", label: "Contacté" },
  { value: "devis_envoye", label: "Devis envoyé" },
  { value: "gagne", label: "Gagné" },
  { value: "perdu", label: "Perdu" },
] as const;

export type StatusValue = (typeof STATUSES)[number]["value"];

export function labelOf(
  list: ReadonlyArray<{ value: string; label: string }>,
  value: string,
): string {
  return list.find((item) => item.value === value)?.label ?? value;
}

export const quoteRequestSchema = z.object({
  clientType: z.enum(["entreprise", "sous_traitance", "particulier"]),
  propertyType: z.enum(["bureaux", "commerce", "immeuble", "chantier", "logement", "autre"]),
  surfaceM2: z.coerce.number().int().min(1, "Surface requise").max(200000),
  rooms: z.coerce.number().int().min(0).max(5000).optional(),
  frequency: z.enum([
    "ponctuel",
    "hebdomadaire",
    "plusieurs_semaine",
    "quotidien",
    "contrat_annuel",
  ]),
  services: z
    .array(
      z.enum([
        "nettoyage_courant",
        "vitrerie",
        "remise_en_etat",
        "fin_de_chantier",
        "desinfection",
      ]),
    )
    .min(1, "Choisissez au moins une prestation"),
  city: z.string().trim().min(1, "Ville requise").max(120),
  postalCode: z.string().trim().min(4, "Code postal requis").max(10),
  desiredDate: z.string().trim().max(20).optional().or(z.literal("")),
  contactName: z.string().trim().min(2, "Nom requis").max(120),
  companyName: z.string().trim().max(160).optional().or(z.literal("")),
  email: z.string().trim().email("Adresse email invalide").max(255),
  phone: z.string().trim().min(6, "Téléphone requis").max(30),
  message: z.string().trim().max(1500).optional().or(z.literal("")),
});

export type QuoteRequestInput = z.infer<typeof quoteRequestSchema>;

export interface PricingSettings {
  min_price: number;
  range_spread: number;
  property_rates: Record<string, number>;
  frequency_multipliers: Record<string, number>;
  service_surcharges: Record<string, number>;
}

export const DEFAULT_PRICING: PricingSettings = {
  min_price: 90,
  range_spread: 0.15,
  property_rates: {
    bureaux: 0.45,
    commerce: 0.5,
    immeuble: 0.4,
    chantier: 1.2,
    logement: 0.6,
    autre: 0.5,
  },
  frequency_multipliers: {
    ponctuel: 1.6,
    hebdomadaire: 1,
    plusieurs_semaine: 0.9,
    quotidien: 0.8,
    contrat_annuel: 0.85,
  },
  service_surcharges: {
    nettoyage_courant: 0,
    vitrerie: 0.15,
    remise_en_etat: 0.4,
    fin_de_chantier: 0.5,
    desinfection: 0.2,
  },
};

export function estimatePrice(
  input: Pick<QuoteRequestInput, "propertyType" | "surfaceM2" | "frequency" | "services">,
  pricing: PricingSettings,
): { min: number; max: number } {
  const rate = pricing.property_rates[input.propertyType] ?? 0.5;
  const freq = pricing.frequency_multipliers[input.frequency] ?? 1;
  const surcharge = input.services.reduce(
    (sum, service) => sum + (pricing.service_surcharges[service] ?? 0),
    0,
  );

  const base = Math.max(
    pricing.min_price,
    input.surfaceM2 * rate * (1 + surcharge) * freq,
  );
  const spread = pricing.range_spread;
  return {
    min: Math.round((base * (1 - spread)) / 5) * 5,
    max: Math.round((base * (1 + spread)) / 5) * 5,
  };
}

const RECURRING = new Set(["hebdomadaire", "plusieurs_semaine", "quotidien", "contrat_annuel"]);

export function scoreRequest(
  input: Pick<QuoteRequestInput, "clientType" | "frequency" | "surfaceM2" | "services">,
): number {
  let score = 20;
  if (input.clientType === "entreprise") score += 25;
  if (input.clientType === "sous_traitance") score += 20;
  if (RECURRING.has(input.frequency)) score += 25;
  if (input.frequency === "contrat_annuel" || input.frequency === "quotidien") score += 10;
  if (input.surfaceM2 >= 200) score += 10;
  if (input.surfaceM2 >= 800) score += 10;
  if (input.services.length > 1) score += 5;
  return Math.min(100, score);
}

export function scoreLabel(score: number): "Haute" | "Moyenne" | "Basse" {
  if (score >= 70) return "Haute";
  if (score >= 45) return "Moyenne";
  return "Basse";
}

export function formatEuros(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}
