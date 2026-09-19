import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { formatEuros } from "@/lib/quotes-shared";

const searchSchema = z.object({
  min: z.coerce.number().optional(),
  max: z.coerce.number().optional(),
});

export const Route = createFileRoute("/merci")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Demande envoyée — PURE SPACE NETT" },
      {
        name: "description",
        content: "Votre demande de devis de nettoyage a bien été enregistrée.",
      },
      { property: "og:title", content: "Demande envoyée — PURE SPACE NETT" },
      {
        property: "og:description",
        content: "Votre demande de devis de nettoyage a bien été enregistrée.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ThankYouPage,
});

function ThankYouPage() {
  const { min, max } = Route.useSearch();

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-5 py-16">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <CheckCircle2 className="mx-auto size-10 text-success" />
        <h1 className="mt-4 text-2xl text-foreground">Merci, votre demande est enregistrée</h1>
        <p className="mt-3 text-muted-foreground">
          Nous revenons vers vous rapidement avec une proposition détaillée. Un email de
          confirmation vous a été envoyé.
        </p>

        {min != null && max != null && (
          <div className="mt-6 rounded-lg border border-border bg-surface p-4">
            <p className="text-sm text-muted-foreground">Estimation indicative</p>
            <p className="mt-1 font-display text-2xl text-foreground">
              {formatEuros(min)} – {formatEuros(max)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Par intervention, hors taxes. Confirmée après échange.
            </p>
          </div>
        )}

        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <Button asChild>
            <a href="https://www.purespacenett.com">Retour au site</a>
          </Button>
          <Button asChild variant="outline">
            <Link to="/">Nouvelle demande</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
