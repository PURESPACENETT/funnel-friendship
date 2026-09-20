import { createFileRoute } from "@tanstack/react-router";

import { LocalSeoPage, localBusinessJsonLd, type LocalPageProps } from "@/components/local-seo-page";

const PAGE: LocalPageProps = {
  title: "Nettoyage de bureaux en Île-de-France",
  intro:
    "PURE SPACE NETT entretient les bureaux, espaces de coworking et locaux professionnels en Île-de-France : nettoyage quotidien ou hebdomadaire, sanitaires, espaces d'accueil et cuisines d'entreprise. Estimation de prix immédiate en ligne, devis ferme sous 24 h.",
  areaServed: ["Paris", "Pantin", "Montreuil", "Saint-Denis", "Boulogne-Billancourt", "Île-de-France"],
  districts: [
    "Paris 11e",
    "Paris 19e",
    "Paris 20e",
    "Pantin et Les Lilas",
    "Montreuil",
    "Saint-Denis",
  ],
  services: [
    "Nettoyage régulier de bureaux et open spaces",
    "Entretien des sanitaires et cuisines d'entreprise",
    "Nettoyage d'espaces de coworking et salles de réunion",
    "Vitrerie et surfaces vitrées",
    "Remise en état après travaux ou déménagement",
    "Sous-traitance pour sociétés de facility management",
  ],
  faq: [
    {
      question: "Quel est le prix d'un nettoyage de bureaux ?",
      answer:
        "Le tarif dépend de la surface, de la fréquence et des prestations souhaitées. Notre formulaire en ligne vous donne une fourchette immédiate, puis nous confirmons par un devis ferme sous 24 h.",
    },
    {
      question: "Intervenez-vous en dehors des horaires de bureau ?",
      answer:
        "Oui. Nous intervenons tôt le matin, le soir ou le week-end pour ne pas perturber vos équipes. Les créneaux sont définis ensemble au moment du devis.",
    },
    {
      question: "Proposez-vous des contrats réguliers ?",
      answer:
        "Oui, la plupart de nos clients bureaux sont en contrat d'entretien régulier : quotidien, hebdomadaire ou bimensuel, avec une équipe dédiée.",
    },
    {
      question: "Travaillez-vous en sous-traitance ?",
      answer:
        "Oui. Nous travaillons régulièrement en sous-traitance pour des sociétés de nettoyage et de facility management sur Paris et la petite couronne.",
    },
  ],
};

export const Route = createFileRoute("/nettoyage-de-bureaux")({
  head: () => ({
    meta: [
      { title: "Nettoyage de bureaux — Paris & Île-de-France | PURE SPACE NETT" },
      {
        name: "description",
        content:
          "Entreprise de nettoyage de bureaux en Île-de-France : entretien régulier, coworking, sanitaires, vitrerie. Estimation immédiate en ligne, devis sous 24 h.",
      },
      { property: "og:title", content: "Nettoyage de bureaux — PURE SPACE NETT" },
      {
        property: "og:description",
        content:
          "Nettoyage de bureaux et locaux professionnels en Île-de-France. Estimation immédiate en ligne.",
      },
      { property: "og:url", content: "https://funnel-friendship.lovable.app/nettoyage-de-bureaux" },
    ],
    links: [{ rel: "canonical", href: "https://funnel-friendship.lovable.app/nettoyage-de-bureaux" }],
    scripts: [
      {
        type: "application/ld+json",
        children: localBusinessJsonLd(PAGE, "/nettoyage-de-bureaux"),
      },
    ],
  }),
  component: () => <LocalSeoPage {...PAGE} />,
});
