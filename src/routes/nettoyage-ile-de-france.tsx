import { createFileRoute } from "@tanstack/react-router";

import { LocalSeoPage, localBusinessJsonLd, type LocalPageProps } from "@/components/local-seo-page";

const PAGE: LocalPageProps = {
  title: "Entreprise de nettoyage en Île-de-France",
  intro:
    "PURE SPACE NETT intervient sur Paris et toute l'Île-de-France : nettoyage de bureaux, locaux commerciaux, immeubles, chantiers et logements. Un seul interlocuteur pour plusieurs sites, une estimation de prix immédiate et des contrats de sous-traitance pour les sociétés de nettoyage.",
  areaServed: [
    "Île-de-France",
    "Paris",
    "Seine-Saint-Denis",
    "Hauts-de-Seine",
    "Val-de-Marne",
    "Seine-et-Marne",
    "Val-d'Oise",
    "Essonne",
    "Yvelines",
  ],
  districts: [
    "Paris et petite couronne",
    "Seine-Saint-Denis (Pantin, Montreuil, Saint-Denis, Aubervilliers)",
    "Hauts-de-Seine (Boulogne, Levallois, Nanterre, Courbevoie)",
    "Val-de-Marne (Vincennes, Créteil, Ivry)",
    "Val-d'Oise et Seine-et-Marne",
    "Essonne et Yvelines sur contrat régulier",
  ],
  services: [
    "Contrats multi-sites pour entreprises",
    "Nettoyage de bureaux, entrepôts et locaux techniques",
    "Entretien de copropriétés et résidences",
    "Remise en état de fin de chantier",
    "Nettoyage de logements et fins de bail",
    "Sous-traitance pour sociétés de nettoyage et facility management",
  ],
  faq: [
    {
      question: "Jusqu'où vous déplacez-vous en Île-de-France ?",
      answer:
        "Sur les huit départements. Paris et la petite couronne sont couverts au quotidien ; la grande couronne est desservie pour les contrats réguliers et les chantiers.",
    },
    {
      question: "Gérez-vous plusieurs sites pour un même client ?",
      answer:
        "Oui. Un interlocuteur unique coordonne les équipes, avec un reporting par site et une facturation regroupée.",
    },
    {
      question: "Proposez-vous de la sous-traitance ?",
      answer:
        "Oui, c'est une part importante de notre activité : renfort d'équipes, remplacement et reprise de chantiers pour d'autres sociétés de nettoyage franciliennes.",
    },
    {
      question: "Quel délai pour recevoir un devis ?",
      answer:
        "Une fourchette de prix s'affiche dès la fin du formulaire, et nous revenons vers vous avec un devis ferme sous 24 h ouvrées.",
    },
  ],
};

export const Route = createFileRoute("/nettoyage-ile-de-france")({
  head: () => ({
    meta: [
      { title: "Nettoyage Île-de-France — Entreprise de nettoyage | PURE SPACE NETT" },
      {
        name: "description",
        content:
          "Entreprise de nettoyage en Île-de-France : bureaux, immeubles, chantiers, logements, contrats multi-sites et sous-traitance. Estimation de prix immédiate en ligne.",
      },
      { property: "og:title", content: "Nettoyage Île-de-France — PURE SPACE NETT" },
      {
        property: "og:description",
        content:
          "Nettoyage professionnel sur Paris et les huit départements d'Île-de-France. Devis rapide.",
      },
    ],
    links: [{ rel: "canonical", href: "/nettoyage-ile-de-france" }],
    scripts: [
      {
        type: "application/ld+json",
        children: localBusinessJsonLd(PAGE, "/nettoyage-ile-de-france"),
      },
    ],
  }),
  component: () => <LocalSeoPage {...PAGE} />,
});
