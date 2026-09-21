/** LinkedIn prospecting presets: roles to look for, cities to cover, and the messages to send. */

export interface LinkedInRole {
  value: string;
  label: string;
  /** Keywords typed into the LinkedIn people search, combined with the city. */
  keywords: string;
  /** Why this person matters for a cleaning contract. */
  why: string;
}

export const LINKEDIN_ROLES: LinkedInRole[] = [
  {
    value: "syndic",
    label: "Syndics de copropriété",
    keywords: '"syndic de copropriété" OR "gestionnaire de copropriété"',
    why: "Décide de l'entretien des halls, parkings et parties communes.",
  },
  {
    value: "gestionnaire",
    label: "Gestionnaires immobiliers / property managers",
    keywords: '"property manager" OR "gestionnaire immobilier" OR "asset manager"',
    why: "Gère des portefeuilles de bureaux : contrats récurrents multi-sites.",
  },
  {
    value: "travaux",
    label: "Conducteurs de travaux",
    keywords: '"conducteur de travaux" OR "chef de chantier" OR "responsable travaux"',
    why: "Achète le nettoyage de fin de chantier et la remise en état.",
  },
  {
    value: "services",
    label: "Responsables services généraux",
    keywords: '"services généraux" OR "office manager" OR "facility manager"',
    why: "Gère le prestataire de nettoyage au quotidien dans les bureaux.",
  },
];

export const LINKEDIN_CITIES: string[] = [
  "Le Pré-Saint-Gervais",
  "Pantin",
  "Les Lilas",
  "Aubervilliers",
  "Bagnolet",
  "Montreuil",
  "Romainville",
  "Bobigny",
  "Saint-Denis",
  "Saint-Ouen",
  "Paris",
  "Paris 11e",
  "Paris 17e",
  "Boulogne-Billancourt",
  "Neuilly-sur-Seine",
  "Vincennes",
  "Ivry-sur-Seine",
  "Levallois-Perret",
];

/** Builds the LinkedIn people-search URL for one role in one city. */
export function linkedInSearchUrl(role: LinkedInRole, city: string): string {
  const query = `(${role.keywords}) "${city}"`;
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(query)}&origin=GLOBAL_SEARCH_HEADER`;
}

export interface MessageTemplate {
  value: string;
  label: string;
  hint: string;
  /** Character budget to respect on LinkedIn. */
  limit?: number;
  build: (vars: MessageVars) => string;
}

export interface MessageVars {
  prenom: string;
  entreprise: string;
  ville: string;
  role: LinkedInRole;
}

export const LINKEDIN_TEMPLATES: MessageTemplate[] = [
  {
    value: "invitation",
    label: "Invitation (note de connexion)",
    hint: "À joindre à la demande de connexion — 300 caractères maximum côté LinkedIn.",
    limit: 300,
    build: ({ prenom, entreprise, ville }) =>
      `Bonjour ${prenom}, je suis Amazigh de PURE SPACE NETT, entreprise de nettoyage basée au Pré-Saint-Gervais. Nous entretenons bureaux et parties communes à ${ville}. Je serais ravi d'échanger sur vos sites ${entreprise ? `chez ${entreprise}` : ""}. Bonne journée.`
        .replace(/\s+/g, " ")
        .trim(),
  },
  {
    value: "suivi",
    label: "Suivi après acceptation",
    hint: "À envoyer dans les 24 h suivant l'acceptation de l'invitation.",
    build: ({ prenom, entreprise, ville, role }) =>
      [
        `Bonjour ${prenom}, merci pour votre retour de connexion.`,
        "",
        `Chez PURE SPACE NETT, nous assurons l'entretien de locaux professionnels à ${ville} et en Île-de-France : passages en soirée ou tôt le matin, équipes fixes, contrôle qualité et remplacement garanti en cas d'absence.`,
        "",
        role.value === "travaux"
          ? "Nous intervenons aussi en nettoyage de fin de chantier et remise en état avant livraison, y compris en sous-traitance."
          : `Si ${entreprise || "votre structure"} revoit ses prestataires, je peux vous envoyer une proposition chiffrée après une visite rapide.`,
        "",
        "Seriez-vous disponible pour un échange de dix minutes cette semaine ?",
        "",
        "Amazigh — PURE SPACE NETT",
        "07 59 48 30 21 — www.purespacenett.com",
      ].join("\n"),
  },
  {
    value: "relance",
    label: "Relance (5 à 7 jours après)",
    hint: "Une seule relance, courte, sans reproche.",
    build: ({ prenom, ville }) =>
      [
        `Bonjour ${prenom}, je reviens brièvement vers vous.`,
        "",
        `Nous avons de la disponibilité sur ${ville} pour des prestations récurrentes ou ponctuelles. Si le sujet n'est pas d'actualité, dites-le-moi simplement et je n'en reparlerai plus.`,
        "",
        "Sinon, je vous propose un point de dix minutes au 07 59 48 30 21.",
        "",
        "Amazigh — PURE SPACE NETT",
      ].join("\n"),
  },
];
