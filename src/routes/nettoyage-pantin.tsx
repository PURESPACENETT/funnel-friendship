import { createFileRoute } from "@tanstack/react-router";

import { LocalSeoPage, localBusinessJsonLd, type LocalPageProps } from "@/components/local-seo-page";

const PAGE: LocalPageProps = {
  title: "Entreprise de nettoyage à Pantin (93500)",
  intro:
    "PURE SPACE NETT est une entreprise de nettoyage basée aux portes de Pantin. Nous entretenons bureaux, commerces, parties communes d'immeubles et logements sur toute la commune, avec une estimation de prix immédiate en ligne et un devis ferme sous 24 h.",
  areaServed: ["Pantin", "Le Pré-Saint-Gervais", "Les Lilas", "Aubervilliers", "Romainville"],
  districts: [
    "Quatre-Chemins",
    "Église de Pantin",
    "Hoche",
    "Les Courtillières",
    "Le Petit Pantin",
    "Grands Moulins",
  ],
  services: [
    "Nettoyage de bureaux et espaces de coworking",
    "Entretien des parties communes d'immeubles",
    "Remise en état après travaux",
    "Nettoyage de fin de bail et de logement",
    "Vitrerie et surfaces vitrées",
    "Sous-traitance pour sociétés de nettoyage",
  ],
  faq: [
    {
      question: "Intervenez-vous sur tout Pantin ?",
      answer:
        "Oui, sur l'ensemble de la commune : Quatre-Chemins, Église de Pantin, Hoche, Les Courtillières, Grands Moulins, ainsi que Le Pré-Saint-Gervais et Les Lilas.",
    },
    {
      question: "Quel est le prix d'un nettoyage de bureaux à Pantin ?",
      answer:
        "Le tarif dépend de la surface, de la fréquence et des prestations. Notre formulaire vous donne une fourchette immédiate, puis nous confirmons par un devis ferme.",
    },
    {
      question: "Acceptez-vous les contrats de sous-traitance ?",
      answer:
        "Oui. Nous travaillons régulièrement en sous-traitance pour des sociétés de nettoyage et des sociétés de facility management en Seine-Saint-Denis.",
    },
    {
      question: "Sous quel délai pouvez-vous démarrer ?",
      answer:
        "Pour une intervention ponctuelle, en général sous 48 à 72 h. Pour un contrat régulier, nous planifions le démarrage avec vous après la visite du site.",
    },
  ],
};

export const Route = createFileRoute("/nettoyage-pantin")({
  head: () => ({
    meta: [
      { title: "Nettoyage Pantin — Entreprise de nettoyage pro | PURE SPACE NETT" },
      {
        name: "description",
        content:
          "Entreprise de nettoyage à Pantin (93500) : bureaux, immeubles, commerces, logements et sous-traitance. Estimation de prix immédiate, devis ferme sous 24 h.",
      },
      { property: "og:title", content: "Nettoyage Pantin — PURE SPACE NETT" },
      {
        property: "og:description",
        content:
          "Nettoyage de bureaux, immeubles et logements à Pantin. Estimation immédiate en ligne.",
      },
    ],
    links: [{ rel: "canonical", href: "/nettoyage-pantin" }],
    scripts: [
      {
        type: "application/ld+json",
        children: localBusinessJsonLd(PAGE, "/nettoyage-pantin"),
      },
    ],
  }),
  component: () => <LocalSeoPage {...PAGE} />,
});
