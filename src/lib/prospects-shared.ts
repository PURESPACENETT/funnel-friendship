import { z } from "zod";

export interface Option {
  value: string;
  label: string;
}

export const PROSPECT_STATUS_VALUES = [
  "nouveau",
  "qualifie",
  "a_contacter",
  "contacte",
  "reponse_recue",
  "interesse",
  "rdv_a_prendre",
  "rdv_effectue",
  "visite_technique",
  "devis_envoye",
  "negociation",
  "converti",
  "perdu",
  "ecarte",
] as const;

export type ProspectStatus = (typeof PROSPECT_STATUS_VALUES)[number];

export const PROSPECT_STATUSES: Array<Option & { value: ProspectStatus }> = [
  { value: "nouveau", label: "Nouveau" },
  { value: "qualifie", label: "Qualifié" },
  { value: "a_contacter", label: "À contacter" },
  { value: "contacte", label: "Contacté" },
  { value: "reponse_recue", label: "Réponse reçue" },
  { value: "interesse", label: "Intéressé" },
  { value: "rdv_a_prendre", label: "RDV à prendre" },
  { value: "rdv_effectue", label: "RDV effectué" },
  { value: "visite_technique", label: "Visite technique" },
  { value: "devis_envoye", label: "Devis envoyé" },
  { value: "negociation", label: "Négociation" },
  { value: "converti", label: "Gagné" },
  { value: "perdu", label: "Perdu" },
  { value: "ecarte", label: "Écarté" },
];

/** Pipeline columns: several fine-grained statuses can share one column. */
export const PIPELINE_COLUMNS: Array<{ key: string; label: string; statuses: ProspectStatus[] }> = [
  { key: "qualifier", label: "À qualifier", statuses: ["nouveau", "qualifie"] },
  { key: "a_contacter", label: "À contacter", statuses: ["a_contacter"] },
  { key: "contacte", label: "Contacté", statuses: ["contacte"] },
  { key: "reponse", label: "Réponse reçue", statuses: ["reponse_recue"] },
  { key: "interesse", label: "Intéressé", statuses: ["interesse"] },
  { key: "rdv", label: "RDV", statuses: ["rdv_a_prendre", "rdv_effectue"] },
  { key: "visite", label: "Visite", statuses: ["visite_technique"] },
  { key: "devis", label: "Devis", statuses: ["devis_envoye"] },
  { key: "negociation", label: "Négociation", statuses: ["negociation"] },
  { key: "gagne", label: "Gagné", statuses: ["converti"] },
  { key: "perdu", label: "Perdu", statuses: ["perdu", "ecarte"] },
];

/** Statuses meaning the prospect has been reached at least once. */
export const CONTACTED_STATUSES: ProspectStatus[] = [
  "contacte",
  "reponse_recue",
  "interesse",
  "rdv_a_prendre",
  "rdv_effectue",
  "visite_technique",
  "devis_envoye",
  "negociation",
  "converti",
];

export const OPPORTUNITY_TYPES: Array<Option & { value: "vente_directe" | "sous_traitance" | "les_deux" }> = [
  { value: "vente_directe", label: "Vente directe" },
  { value: "sous_traitance", label: "Sous-traitance" },
  { value: "les_deux", label: "Les deux" },
];

export const ACTIVITY_TYPES: Option[] = [
  { value: "note", label: "Note" },
  { value: "email_envoye", label: "Email envoyé" },
  { value: "email_recu", label: "Email reçu" },
  { value: "appel", label: "Appel" },
  { value: "relance", label: "Relance" },
  { value: "rdv", label: "RDV" },
  { value: "visite", label: "Visite" },
  { value: "devis", label: "Devis" },
  { value: "changement_statut", label: "Changement de statut" },
  { value: "tache", label: "Tâche" },
];

export const TASK_TYPES: Option[] = [
  { value: "appeler", label: "Appeler" },
  { value: "email", label: "Email" },
  { value: "relance", label: "Relance" },
  { value: "rdv", label: "RDV" },
  { value: "visite", label: "Visite" },
  { value: "devis", label: "Devis" },
  { value: "autre", label: "Autre" },
];

export const TASK_PRIORITIES: Option[] = [
  { value: "basse", label: "Basse" },
  { value: "normale", label: "Normale" },
  { value: "haute", label: "Haute" },
  { value: "urgente", label: "Urgente" },
];

export const SUBCONTRACTING_SECTORS = [
  "entreprise_nettoyage",
  "societe_proprete",
  "nettoyage_bureaux",
  "nettoyage_industriel",
  "nettoyage_chantier",
  "nettoyage_vitres",
  "proprete_services",
];

export function defaultOpportunityType(sector: string | null | undefined) {
  return sector && SUBCONTRACTING_SECTORS.includes(sector) ? "sous_traitance" : "vente_directe";
}

/** Target segments for subcontracting: other cleaning companies that can delegate jobs. */
export const SECTORS: Array<Option & { query: string }> = [
  { value: "syndic de copropriété", label: "Syndics de copropriété", query: "syndic de copropriété" },
  { value: "cabinet de gestion immobilière", label: "Gestion immobilière", query: "cabinet de gestion immobilière" },
  { value: "bureaux et coworking", label: "Bureaux et coworking", query: "bureaux coworking" },
  { value: "agence immobilière", label: "Agences immobilières", query: "agence immobilière" },
  { value: "clinique et cabinet médical", label: "Cliniques et cabinets médicaux", query: "clinique cabinet médical" },
  { value: "hôtel", label: "Hôtels", query: "hôtel" },
  { value: "salle de sport", label: "Salles de sport", query: "salle de sport" },
  { value: "entreprise_nettoyage", label: "Entreprises de nettoyage", query: "entreprise de nettoyage" },
  { value: "societe_proprete", label: "Sociétés de propreté", query: "société de propreté" },
  { value: "nettoyage_bureaux", label: "Nettoyage de bureaux", query: "entreprise nettoyage bureaux" },
  { value: "nettoyage_industriel", label: "Nettoyage industriel", query: "entreprise nettoyage industriel" },
  { value: "nettoyage_chantier", label: "Nettoyage de chantiers", query: "entreprise nettoyage fin de chantier" },
  { value: "nettoyage_vitres", label: "Nettoyage vitres", query: "entreprise nettoyage vitres" },
  { value: "proprete_services", label: "Prestataires de propreté", query: "prestataire services propreté nettoyage" },
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

export const DEFAULT_RADIUS_KM = 10;
export const MIN_RADIUS_KM = 1;
export const MAX_RADIUS_KM = 50;

export const prospectSearchSchema = z.object({
  sector: z.string().trim().min(2).max(60),
  area: z.string().trim().min(2).max(80),
  radiusKm: z.number().int().min(MIN_RADIUS_KM).max(MAX_RADIUS_KM).default(DEFAULT_RADIUS_KM),
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

  const highValue = [
    "entreprise_nettoyage",
    "societe_proprete",
    "nettoyage_bureaux",
    "nettoyage_industriel",
    "nettoyage_chantier",
    "nettoyage_vitres",
    "proprete_services",
  ];
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
