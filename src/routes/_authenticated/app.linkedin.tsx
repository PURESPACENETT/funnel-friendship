import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  LINKEDIN_CITIES,
  LINKEDIN_ROLES,
  LINKEDIN_TEMPLATES,
  linkedInSearchUrl,
} from "@/lib/linkedin-outreach";

export const Route = createFileRoute("/_authenticated/app/linkedin")({
  head: () => ({
    meta: [
      { title: "Prospection LinkedIn — PURE SPACE NETT" },
      {
        name: "description",
        content: "Recherches LinkedIn par ville et messages d'invitation, de suivi et de relance.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LinkedInPage,
});

function LinkedInPage() {
  const [roleValue, setRoleValue] = useState(LINKEDIN_ROLES[0]!.value);
  const [prenom, setPrenom] = useState("");
  const [entreprise, setEntreprise] = useState("");
  const [ville, setVille] = useState("Pantin");

  const role = LINKEDIN_ROLES.find((r) => r.value === roleValue) ?? LINKEDIN_ROLES[0]!;

  const messages = useMemo(
    () =>
      LINKEDIN_TEMPLATES.map((template) => ({
        template,
        text: template.build({
          prenom: prenom.trim() || "Madame, Monsieur",
          entreprise: entreprise.trim(),
          ville: ville.trim() || "Paris",
          role,
        }),
      })),
    [prenom, entreprise, ville, role],
  );

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copié`);
    } catch {
      toast.error("Copie impossible sur cet appareil");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl text-foreground">Prospection LinkedIn</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Les recherches à ouvrir ville par ville, et les trois messages à envoyer : invitation,
          suivi, relance.
        </p>
      </div>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-base text-foreground">1. Qui chercher</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {LINKEDIN_ROLES.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setRoleValue(item.value)}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                item.value === roleValue
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{role.why}</p>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-base text-foreground">2. Recherches par ville</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Un clic ouvre LinkedIn avec la recherche déjà remplie. Comptez 15 à 20 invitations par
          jour maximum pour rester sous les limites de LinkedIn.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {LINKEDIN_CITIES.map((city) => (
            <div
              key={city}
              className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
            >
              <span className="text-sm text-foreground">{city}</span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => setVille(city)}>
                  Messages
                </Button>
                <Button asChild variant="outline" size="sm">
                  <a
                    href={linkedInSearchUrl(role, city)}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    Ouvrir
                    <ExternalLink className="ml-1 size-3.5" />
                  </a>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-base text-foreground">3. Messages à envoyer</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="prenom">Prénom du contact</Label>
            <Input
              id="prenom"
              value={prenom}
              onChange={(event) => setPrenom(event.target.value)}
              placeholder="Claire"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="entreprise">Entreprise</Label>
            <Input
              id="entreprise"
              value={entreprise}
              onChange={(event) => setEntreprise(event.target.value)}
              placeholder="Cabinet Duval"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="ville">Ville</Label>
            <Input
              id="ville"
              value={ville}
              onChange={(event) => setVille(event.target.value)}
              placeholder="Pantin"
              className="mt-1"
            />
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {messages.map(({ template, text }) => (
            <article key={template.value} className="rounded-lg border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm text-foreground">{template.label}</p>
                  <p className="text-xs text-muted-foreground">{template.hint}</p>
                </div>
                <div className="flex items-center gap-2">
                  {template.limit ? (
                    <span
                      className={`text-xs ${
                        text.length > template.limit ? "text-destructive" : "text-muted-foreground"
                      }`}
                    >
                      {text.length}/{template.limit}
                    </span>
                  ) : null}
                  <Button size="sm" variant="outline" onClick={() => copy(text, template.label)}>
                    <Copy className="mr-1 size-3.5" />
                    Copier
                  </Button>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">{text}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
