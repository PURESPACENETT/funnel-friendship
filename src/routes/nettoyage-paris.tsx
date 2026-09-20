import { createFileRoute } from "@tanstack/react-router";

import { LocalSeoPage, localBusinessJsonLd, type LocalPageProps } from "@/components/local-seo-page";

const PAGE: LocalPageProps = {
  title: "Entreprise de nettoyage à Paris",
  intro:
    "PURE SPACE NETT assure le nettoyage de bureaux, commerces, immeubles et logements dans tous les arrondissements de Paris. Estimation de prix immédiate en ligne, interlocuteur unique et équipes formées aux contraintes des sites parisiens.",
  areaServed: ["Paris", "Paris 1er au 20e arrondissement"],
  districts: [
    "Paris Centre (1er–4e)",
    "Quartier Latin et Montparnasse (5e, 6e, 14e, 15e)",
    "Champs-Élysées et Opéra (8e, 9e)",
    "République, Marais et Bastille (3e, 10e, 11e)",
    "Montmartre et Batignolles (17e, 18e)",
    "Belleville, Nation et Bercy (12e, 19e, 20e)",
  ],
  services: [
    "Nettoyage de bureaux et sièges sociaux",
    "Entretien de commerces et locaux recevant du public",
    "Parties communes de copropriétés",
    "Remise en état après travaux ou déménagement",
    "Vitrerie et nettoyage de vitrines",
    "Sous-traitance et renfort d'équipes",
  ],
  faq: [
    {
      question: "Couvrez-vous tous les arrondissements de Paris ?",
      answer:
        "Oui, du 1er au 20e. Nos équipes sont basées à l'est de Paris, ce qui permet des interventions rapides sur la rive droite et le centre.",
    },
    {
      question: "Pouvez-vous intervenir en dehors des heures de bureau ?",
      answer:
        "Oui. Nous intervenons tôt le matin, en soirée et le samedi pour ne pas perturber votre activité.",
    },
    {
      question: "Travaillez-vous avec des syndics et des gestionnaires d'immeubles ?",
      answer:
        "Oui, l'entretien des parties communes et la sortie des containers font partie de nos prestations régulières à Paris.",
    },
    {
      question: "Comment obtenir un prix pour mes bureaux parisiens ?",
      answer:
        "Renseignez la surface, la fréquence et les prestations souhaitées : vous recevez une fourchette immédiate, puis un devis ferme après visite du site.",
    },
  ],
};

export const Route = createFileRoute("/nettoyage-paris")({
  head: () => ({
    meta: [
      { title: "Nettoyage Paris — Entreprise de nettoyage professionnel | PURE SPACE NETT" },
      {
        name: "description",
        content:
          "Entreprise de nettoyage à Paris : bureaux, commerces, copropriétés, logements et sous-traitance, du 1er au 20e arrondissement. Estimation de prix immédiate en ligne.",
      },
      { property: "og:title", content: "Nettoyage Paris — PURE SPACE NETT" },
      {
        property: "og:description",
        content:
          "Nettoyage de bureaux, commerces et immeubles dans tous les arrondissements de Paris.",
      },
    ],
    links: [{ rel: "canonical", href: "/nettoyage-paris" }],
    scripts: [
      {
        type: "application/ld+json",
        children: localBusinessJsonLd(PAGE, "/nettoyage-paris"),
      },
    ],
  }),
  component: () => <LocalSeoPage {...PAGE} />,
});
