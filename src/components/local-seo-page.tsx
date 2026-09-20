import { Link } from "@tanstack/react-router";
import { ArrowRight, Building2, MapPin, Phone, ShieldCheck, Star } from "lucide-react";

import { Button } from "@/components/ui/button";

export const BUSINESS = {
  name: "PURE SPACE NETT",
  phone: "07 59 48 30 21",
  phoneE164: "+33759483021",

  email: "contact@purespacenett.com",
  website: "https://www.purespacenett.com",
  street: "Le Pré-Saint-Gervais",
  city: "Le Pré-Saint-Gervais",
  postalCode: "93310",
  latitude: 48.8869,
  longitude: 2.4064,
} as const;

export type LocalPageProps = {
  /** Heading of the page, e.g. "Entreprise de nettoyage à Pantin". */
  title: string;
  /** Short lead paragraph under the heading. */
  intro: string;
  /** Neighbourhoods or cities covered, listed for local relevance. */
  districts: readonly string[];
  /** Services highlighted on this page. */
  services: readonly string[];
  /** Questions clients actually ask about this area. */
  faq: readonly { question: string; answer: string }[];
  /** Areas served, used in the structured data. */
  areaServed: readonly string[];
};

/** Structured data so Google can link the page to the business and its area. */
export function localBusinessJsonLd(props: LocalPageProps, path: string) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "CleaningService",
    name: BUSINESS.name,
    description: props.intro,
    url: `https://funnel-friendship.lovable.app${path}`,
    telephone: BUSINESS.phoneE164,
    email: BUSINESS.email,
    sameAs: [BUSINESS.website],
    address: {
      "@type": "PostalAddress",
      streetAddress: BUSINESS.street,
      addressLocality: BUSINESS.city,
      postalCode: BUSINESS.postalCode,
      addressCountry: "FR",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: BUSINESS.latitude,
      longitude: BUSINESS.longitude,
    },
    areaServed: props.areaServed.map((name) => ({ "@type": "Place", name })),
    priceRange: "€€",
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        opens: "07:00",
        closes: "20:00",
      },
    ],
    mainEntityOfPage: {
      "@type": "FAQPage",
      mainEntity: props.faq.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    },
  });
}

export function LocalSeoPage(props: LocalPageProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
          <Link to="/" className="text-lg font-semibold text-foreground">
            PURE SPACE NETT
          </Link>
          <Button asChild size="sm">
            <Link to="/">
              Demander un devis <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-14">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="size-4" /> {props.areaServed[0]}
        </p>
        <h1 className="mt-3 text-3xl leading-tight text-foreground sm:text-4xl">{props.title}</h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">{props.intro}</p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/">
              Estimation immédiate <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <a href={`tel:${BUSINESS.phoneE164}`}>
              <Phone className="size-4" /> Nous appeler
            </a>
          </Button>
        </div>

        <section className="mt-14">
          <h2 className="text-xl text-foreground">Nos prestations sur ce secteur</h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {props.services.map((service) => (
              <li
                key={service}
                className="flex items-start gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground"
              >
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                {service}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-14">
          <h2 className="text-xl text-foreground">Zones desservies</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Nos équipes interviennent quotidiennement sur {props.districts.join(", ")}.
          </p>
        </section>

        <section className="mt-14">
          <h2 className="text-xl text-foreground">Entreprises, syndics et particuliers</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-card p-4">
              <Building2 className="size-5 text-primary" />
              <h3 className="mt-2 text-base text-foreground">Professionnels et sous-traitance</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Bureaux, commerces, parties communes d'immeubles, chantiers, fin de bail. Contrats
                réguliers et renfort en sous-traitance pour les sociétés de nettoyage.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <Star className="size-5 text-primary" />
              <h3 className="mt-2 text-base text-foreground">Particuliers</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Ménage régulier, remise en état après travaux, nettoyage de fin de location,
                vitrerie. Devis clair avant toute intervention.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-14">
          <h2 className="text-xl text-foreground">Questions fréquentes</h2>
          <dl className="mt-4 space-y-4">
            {props.faq.map((item) => (
              <div key={item.question} className="rounded-lg border border-border bg-card p-4">
                <dt className="text-sm font-semibold text-foreground">{item.question}</dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {item.answer}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-14 rounded-xl border border-border bg-surface p-6">
          <h2 className="text-xl text-foreground">Recevez votre estimation en 2 minutes</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Décrivez votre local et vos besoins : vous obtenez une fourchette de prix immédiate, puis
            un devis ferme après visite ou échange téléphonique.
          </p>
          <Button className="mt-5" asChild>
            <Link to="/">
              Demander mon devis <ArrowRight className="size-4" />
            </Link>
          </Button>
        </section>

        <nav className="mt-14 flex flex-wrap gap-4 text-sm text-muted-foreground">
          <Link to="/nettoyage-pantin" className="underline-offset-4 hover:text-foreground hover:underline">
            Nettoyage Pantin
          </Link>
          <Link to="/nettoyage-paris" className="underline-offset-4 hover:text-foreground hover:underline">
            Nettoyage Paris
          </Link>
          <Link
            to="/nettoyage-ile-de-france"
            className="underline-offset-4 hover:text-foreground hover:underline"
          >
            Nettoyage Île-de-France
          </Link>
        </nav>
      </main>
    </div>
  );
}
