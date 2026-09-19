import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  CLIENT_TYPES,
  FREQUENCIES,
  PROPERTY_TYPES,
  SERVICES,
  formatEuros,
  quoteRequestSchema,
} from "@/lib/quotes-shared";
import { previewEstimate, submitQuoteRequest } from "@/lib/quotes.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Demande de devis nettoyage — PURE SPACE NETT" },
      {
        name: "description",
        content:
          "Obtenez une estimation immédiate pour le nettoyage de vos bureaux, locaux, immeubles ou logements. Entreprises, sous-traitance et particuliers.",
      },
      { property: "og:title", content: "Demande de devis nettoyage — PURE SPACE NETT" },
      {
        property: "og:description",
        content:
          "Estimation immédiate en ligne pour vos prestations de nettoyage professionnel et résidentiel.",
      },
    ],
  }),
  component: QuoteRequestPage,
});

type FormState = {
  clientType: string;
  propertyType: string;
  surfaceM2: string;
  rooms: string;
  frequency: string;
  services: string[];
  city: string;
  postalCode: string;
  desiredDate: string;
  contactName: string;
  companyName: string;
  email: string;
  phone: string;
  message: string;
};

const EMPTY: FormState = {
  clientType: "",
  propertyType: "",
  surfaceM2: "",
  rooms: "",
  frequency: "",
  services: [],
  city: "",
  postalCode: "",
  desiredDate: "",
  contactName: "",
  companyName: "",
  email: "",
  phone: "",
  message: "",
};

const STEPS = ["Votre profil", "Votre besoin", "Le lieu", "Vos coordonnées"];

function QuoteRequestPage() {
  const navigate = useNavigate();
  const submit = useServerFn(submitQuoteRequest);
  const preview = useServerFn(previewEstimate);

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [estimate, setEstimate] = useState<{ min: number; max: number } | null>(null);
  const [sending, setSending] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleService = (value: string) =>
    setForm((prev) => ({
      ...prev,
      services: prev.services.includes(value)
        ? prev.services.filter((s) => s !== value)
        : [...prev.services, value],
    }));

  const canContinue = () => {
    if (step === 0) return Boolean(form.clientType && form.propertyType);
    if (step === 1)
      return Boolean(form.surfaceM2 && Number(form.surfaceM2) > 0 && form.frequency && form.services.length);
    if (step === 2) return Boolean(form.city.trim() && form.postalCode.trim());
    return true;
  };

  const goNext = async () => {
    if (!canContinue()) {
      toast.error("Merci de compléter cette étape.");
      return;
    }
    const next = step + 1;
    setStep(next);
    if (next === 3) {
      try {
        const result = await preview({
          data: {
            propertyType: form.propertyType,
            surfaceM2: Number(form.surfaceM2),
            frequency: form.frequency,
            services: form.services,
          },
        });
        setEstimate(result);
      } catch {
        setEstimate(null);
      }
    }
  };

  const handleSubmit = async () => {
    const parsed = quoteRequestSchema.safeParse({
      ...form,
      surfaceM2: Number(form.surfaceM2),
      rooms: form.rooms ? Number(form.rooms) : undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Formulaire incomplet");
      return;
    }
    setSending(true);
    try {
      const result = await submit({ data: parsed.data });
      navigate({
        to: "/merci",
        search: { min: result.estimate.min, max: result.estimate.max },
      });
    } catch {
      toast.error("L'envoi a échoué. Merci de réessayer dans un instant.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <div>
            <p className="font-display text-lg font-700 tracking-tight text-foreground">
              PURE SPACE NETT
            </p>
            <p className="text-xs text-muted-foreground">Nettoyage professionnel & résidentiel</p>
          </div>
          <a
            href="https://www.purespacenett.com"
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            purespacenett.com
          </a>
        </div>
      </header>

      <section className="border-b border-border bg-surface">
        <div className="mx-auto grid max-w-5xl gap-8 px-5 py-12 md:grid-cols-2 md:py-16">
          <div>
            <h1 className="text-3xl leading-tight text-foreground md:text-4xl">
              Votre devis de nettoyage,
              <br />
              estimé immédiatement.
            </h1>
            <p className="mt-4 max-w-prose text-muted-foreground">
              Bureaux, commerces, immeubles, chantiers ou logements. Répondez à quelques questions
              et recevez une fourchette de prix à l'écran, puis notre proposition détaillée.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              <li className="flex items-center gap-3">
                <Building2 className="size-4 text-primary" />
                Entreprises, sous-traitance et particuliers
              </li>
              <li className="flex items-center gap-3">
                <Clock className="size-4 text-primary" />
                Estimation en moins de 2 minutes
              </li>
              <li className="flex items-center gap-3">
                <ShieldCheck className="size-4 text-primary" />
                Vos informations restent confidentielles
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between text-sm">
              <span className="font-600 text-foreground">{STEPS[step]}</span>
              <span className="text-muted-foreground">
                Étape {step + 1} / {STEPS.length}
              </span>
            </div>
            <Progress value={((step + 1) / STEPS.length) * 100} className="mt-3" />

            <div className="mt-6 space-y-5">
              {step === 0 && (
                <>
                  <ChoiceGroup
                    label="Vous êtes"
                    options={CLIENT_TYPES}
                    value={form.clientType}
                    onChange={(v) => set("clientType", v)}
                  />
                  <ChoiceGroup
                    label="Type de lieu"
                    options={PROPERTY_TYPES}
                    value={form.propertyType}
                    onChange={(v) => set("propertyType", v)}
                  />
                </>
              )}

              {step === 1 && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="surface">Surface (m²)</Label>
                      <Input
                        id="surface"
                        type="number"
                        min={1}
                        inputMode="numeric"
                        value={form.surfaceM2}
                        onChange={(e) => set("surfaceM2", e.target.value)}
                        placeholder="120"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="rooms">Pièces / étages</Label>
                      <Input
                        id="rooms"
                        type="number"
                        min={0}
                        inputMode="numeric"
                        value={form.rooms}
                        onChange={(e) => set("rooms", e.target.value)}
                        placeholder="4"
                      />
                    </div>
                  </div>
                  <ChoiceGroup
                    label="Fréquence souhaitée"
                    options={FREQUENCIES}
                    value={form.frequency}
                    onChange={(v) => set("frequency", v)}
                  />
                  <div className="space-y-2">
                    <Label>Prestations</Label>
                    <div className="flex flex-wrap gap-2">
                      {SERVICES.map((service) => {
                        const active = form.services.includes(service.value);
                        return (
                          <button
                            key={service.value}
                            type="button"
                            onClick={() => toggleService(service.value)}
                            className={cn(
                              "rounded-full border px-3 py-1.5 text-sm transition-colors",
                              active
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background hover:bg-secondary",
                            )}
                          >
                            {service.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="city">Ville</Label>
                      <Input
                        id="city"
                        value={form.city}
                        onChange={(e) => set("city", e.target.value)}
                        placeholder="Paris"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="postal">Code postal</Label>
                      <Input
                        id="postal"
                        value={form.postalCode}
                        onChange={(e) => set("postalCode", e.target.value)}
                        placeholder="75011"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="date">Date souhaitée (optionnel)</Label>
                    <Input
                      id="date"
                      type="date"
                      value={form.desiredDate}
                      onChange={(e) => set("desiredDate", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="message">Décrivez votre besoin avec vos mots</Label>
                    <Textarea
                      id="message"
                      rows={5}
                      value={form.message}
                      onChange={(e) => set("message", e.target.value)}
                      placeholder="Ex. : bureaux sur 2 étages, passage après 18h, sanitaires et vitres intérieures, démarrage souhaité rapidement..."
                    />
                    <p className="text-xs text-muted-foreground">
                      Votre description est analysée automatiquement pour préparer notre réponse :
                      accès, horaires, contraintes et priorité.
                    </p>
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <div className="rounded-lg border border-border bg-surface p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Sparkles className="size-4 text-primary" />
                      Estimation indicative
                    </div>
                    <p className="mt-1 font-display text-2xl text-foreground">
                      {estimate
                        ? `${formatEuros(estimate.min)} – ${formatEuros(estimate.max)}`
                        : "Calcul en cours..."}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Par intervention, hors taxes. Confirmée après échange.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Nom et prénom</Label>
                    <Input
                      id="name"
                      value={form.contactName}
                      onChange={(e) => set("contactName", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="company">Société (optionnel)</Label>
                    <Input
                      id="company"
                      value={form.companyName}
                      onChange={(e) => set("companyName", e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={form.email}
                        onChange={(e) => set("email", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="phone">Téléphone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={form.phone}
                        onChange={(e) => set("phone", e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="mt-6 flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0 || sending}
              >
                <ArrowLeft className="size-4" /> Retour
              </Button>
              {step < STEPS.length - 1 ? (
                <Button type="button" onClick={goNext}>
                  Continuer <ArrowRight className="size-4" />
                </Button>
              ) : (
                <Button type="button" onClick={handleSubmit} disabled={sending}>
                  {sending ? "Envoi..." : "Envoyer ma demande"}
                  <CheckCircle2 className="size-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-5 py-8 text-sm text-muted-foreground">
        <span>© {new Date().getFullYear()} PURE SPACE NETT</span>
        <Link to="/auth" className="underline-offset-4 hover:text-foreground hover:underline">
          Espace interne
        </Link>
      </footer>
    </div>
  );
}

function ChoiceGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
              value === option.value
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border bg-background hover:bg-secondary",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
