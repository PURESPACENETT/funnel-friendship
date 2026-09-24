import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { getPricing, updatePricing } from "@/lib/quotes.functions";
import {
  DEFAULT_PRICING,
  FREQUENCIES,
  PROPERTY_TYPES,
  SERVICES,
  type PricingSettings,
} from "@/lib/quotes-shared";

export const Route = createFileRoute("/_authenticated/app/tarifs")({
  head: () => ({
    meta: [
      { title: "Tarifs — PURE SPACE NETT" },
      { name: "description", content: "Grille tarifaire utilisée pour les estimations." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PricingPage,
});

type Form = PricingSettings & { notify_email: string };

function PricingPage() {
  const queryClient = useQueryClient();
  const fetchPricing = useServerFn(getPricing);
  const savePricing = useServerFn(updatePricing);

  const { data, isLoading } = useQuery({
    queryKey: ["pricing"],
    queryFn: () => fetchPricing(),
  });

  const [form, setForm] = useState<Form>({ ...DEFAULT_PRICING, notify_email: "" });

  useEffect(() => {
    if (data) setForm(data as Form);
  }, [data]);

  const mutation = useMutation({
    mutationFn: (payload: Form) => savePricing({ data: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pricing"] });
      toast.success("Tarifs enregistrés");
    },
    onError: () => toast.error("Enregistrement impossible"),
  });

  if (isLoading) return <Skeleton className="h-96 rounded-xl" />;

  const setRate = (
    group: "property_rates" | "frequency_multipliers" | "service_surcharges",
    key: string,
    value: number,
  ) => setForm((prev) => ({ ...prev, [group]: { ...prev[group], [key]: value } }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl text-foreground">Tarifs & notifications</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ces valeurs calculent l'estimation affichée aux prospects. Modifiables à tout moment.
        </p>
      </div>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-base text-foreground">Général</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <NumberField
            label="Prix minimum (€)"
            value={form.min_price}
            step={5}
            onChange={(v) => setForm((p) => ({ ...p, min_price: v }))}
          />
          <NumberField
            label="Marge de fourchette (0 = tarif exact)"
            value={form.range_spread}
            step={0.05}
            onChange={(v) => setForm((p) => ({ ...p, range_spread: v }))}
          />
          <div className="space-y-1.5">
            <Label htmlFor="notify">Email d'alerte</Label>
            <Input
              id="notify"
              type="email"
              value={form.notify_email}
              onChange={(e) => setForm((p) => ({ ...p, notify_email: e.target.value }))}
              placeholder="contact@purespacenett.com"
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-base text-foreground">Tarif horaire équivalent par type de lieu (€ / h)</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {PROPERTY_TYPES.map((item) => (
            <NumberField
              key={item.value}
              label={item.label}
              step={0.05}
              value={form.property_rates[item.value] ?? 0}
              onChange={(v) => setRate("property_rates", item.value, v)}
            />
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-base text-foreground">Coefficient par fréquence</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {FREQUENCIES.map((item) => (
            <NumberField
              key={item.value}
              label={item.label}
              step={0.05}
              value={form.frequency_multipliers[item.value] ?? 1}
              onChange={(v) => setRate("frequency_multipliers", item.value, v)}
            />
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-base text-foreground">Majoration par prestation (0 = tarif horaire de base)</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {SERVICES.map((item) => (
            <NumberField
              key={item.value}
              label={item.label}
              step={0.05}
              value={form.service_surcharges[item.value] ?? 0}
              onChange={(v) => setRate("service_surcharges", item.value, v)}
            />
          ))}
        </div>
      </section>

      <div className="flex gap-2">
        <Button onClick={() => mutation.mutate(form)} disabled={mutation.isPending}>
          {mutation.isPending ? "Enregistrement..." : "Enregistrer"}
        </Button>
        <Button
          variant="outline"
          onClick={() => setForm({ ...DEFAULT_PRICING, notify_email: form.notify_email })}
        >
          Réinitialiser la grille
        </Button>
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  step,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type="number"
        step={step}
        min={0}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
