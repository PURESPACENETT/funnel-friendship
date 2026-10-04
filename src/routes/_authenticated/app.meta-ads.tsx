import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { BarChart3, CheckCircle2, CircleAlert, Euro, Megaphone, RefreshCw, Target, TrendingUp } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  generateMetaRecommendations,
  getMetaAdsDashboard,
  saveMetaAdAccount,
  setMetaRecommendationStatus,
} from "@/lib/meta-ads.functions";

export const Route = createFileRoute("/_authenticated/app/meta-ads")({
  head: () => ({
    meta: [
      { title: "Meta Ads — PURE SPACE NETT" },
      { name: "description", content: "Pilot et optimisation des campagnes Facebook et Instagram." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MetaAdsPage,
});

function euros(value: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value);
}

function percent(value: number) {
  return value.toFixed(2) + " %";
}

function MetaAdsPage() {
  const queryClient = useQueryClient();
  const fetchDashboard = useServerFn(getMetaAdsDashboard);
  const saveAccount = useServerFn(saveMetaAdAccount);
  const generateRecommendations = useServerFn(generateMetaRecommendations);
  const setRecommendationStatus = useServerFn(setMetaRecommendationStatus);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["meta-ads-dashboard"],
    queryFn: () => fetchDashboard(),
  });

  const [accountId, setAccountId] = useState("");
  const [accountName, setAccountName] = useState("PURE SPACE NETT — Meta Ads");

  const accountMutation = useMutation({
    mutationFn: () => saveAccount({
      data: {
        meta_account_id: accountId.trim(),
        name: accountName.trim(),
        currency: "EUR",
        timezone: "Europe/Paris",
        is_active: true,
      },
    }),
    onSuccess: () => {
      toast.success("Compte publicitaire enregistré. La synchronisation Meta sera activée à l'étape suivante.");
      void queryClient.invalidateQueries({ queryKey: ["meta-ads-dashboard"] });
      setAccountId("");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const recommendationMutation = useMutation({
    mutationFn: () => generateRecommendations(),
    onSuccess: (result) => {
      toast.success(
        result.generated.length
          ? String(result.generated.length) + " recommandation(s) générée(s)."
          : "Aucune nouvelle recommandation : les données actuelles ne déclenchent pas de règle d'optimisation.",
      );
      void queryClient.invalidateQueries({ queryKey: ["meta-ads-dashboard"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const statusMutation = useMutation({
    mutationFn: (payload: { id: string; status: "applied" | "dismissed" }) =>
      setRecommendationStatus({ data: payload }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["meta-ads-dashboard"] }),
    onError: (error: Error) => toast.error(error.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const totals = data?.totals ?? {
    spend: 0, leads: 0, conversions: 0, revenue: 0, impressions: 0, clicks: 0, cpl: 0, cpa: 0, roas: 0, ctr: 0,
  };
  const campaigns = data?.campaigns ?? [];
  const recommendations = data?.recommendations ?? [];
  const accounts = data?.accounts ?? [];
  const connected = Boolean(data?.connected);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-600 tracking-tight">Meta Ads Optimizer</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Facebook + Instagram : dépenses, leads, clients, chiffre d'affaires attribué et recommandations d'optimisation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={connected ? "default" : "secondary"}>
            {connected ? "Compte connecté" : "En attente de connexion"}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void queryClient.invalidateQueries({ queryKey: ["meta-ads-dashboard"] })}
            disabled={isFetching}
          >
            <RefreshCw className={isFetching ? "size-4 animate-spin" : "size-4"} />
            Actualiser
          </Button>
        </div>
      </div>

      {!connected && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">1. Préparer le compte publicitaire</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
            <div className="space-y-1.5">
              <Label>Identifiant du compte Meta Ads</Label>
              <Input value={accountId} onChange={(e) => setAccountId(e.target.value)} placeholder="act_123456789..." />
            </div>
            <div className="space-y-1.5">
              <Label>Nom interne</Label>
              <Input value={accountName} onChange={(e) => setAccountName(e.target.value)} />
            </div>
            <Button
              onClick={() => accountMutation.mutate()}
              disabled={!accountId.trim() || accountMutation.isPending}
            >
              <Megaphone className="size-4" />
              Enregistrer
            </Button>
          </CardContent>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">
              Le jeton Meta ne sera jamais enregistré dans la base de données. Il sera conservé côté serveur dans les secrets Supabase.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric icon={Euro} label="Dépenses · 30 j" value={euros(totals.spend)} />
        <Metric icon={Target} label="Leads attribués" value={String(totals.leads)} />
        <Metric icon={TrendingUp} label="CPL" value={totals.leads ? euros(totals.cpl) : "—"} />
        <Metric icon={BarChart3} label="ROAS attribué" value={totals.spend ? totals.roas.toFixed(2) + "×" : "—"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Metric icon={TrendingUp} label="CA attribué" value={euros(totals.revenue)} />
        <Metric icon={Target} label="Clients / conversions" value={String(totals.conversions)} />
        <Metric icon={BarChart3} label="CTR" value={percent(totals.ctr)} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Campagnes · 30 derniers jours</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Le système optimise sur le coût du client et le CA, pas uniquement sur le coût du lead.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => recommendationMutation.mutate()}
            disabled={recommendationMutation.isPending || !campaigns.length}
          >
            <TrendingUp className="size-4" />
            Analyser
          </Button>
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Aucune donnée Meta synchronisée pour l'instant.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-3">Campagne</th>
                    <th className="px-3 py-3">Statut</th>
                    <th className="px-3 py-3 text-right">Dépenses</th>
                    <th className="px-3 py-3 text-right">Leads</th>
                    <th className="px-3 py-3 text-right">CPL</th>
                    <th className="px-3 py-3 text-right">CA</th>
                    <th className="px-3 py-3 text-right">ROAS</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((campaign) => (
                    <tr key={campaign.meta_campaign_id} className="border-b border-border/70 last:border-0">
                      <td className="px-3 py-3 font-medium text-foreground">{campaign.name}</td>
                      <td className="px-3 py-3"><Badge variant="secondary">{campaign.status}</Badge></td>
                      <td className="px-3 py-3 text-right">{euros(campaign.spend)}</td>
                      <td className="px-3 py-3 text-right">{campaign.leads}</td>
                      <td className="px-3 py-3 text-right">{campaign.leads ? euros(campaign.cpl) : "—"}</td>
                      <td className="px-3 py-3 text-right">{euros(campaign.revenue)}</td>
                      <td className="px-3 py-3 text-right">{campaign.spend ? campaign.roas.toFixed(2) + "×" : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Recommandations</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Aucune modification de budget n'est appliquée automatiquement à ce stade.
            </p>
          </div>
          {recommendations.length > 0 ? <Badge>{recommendations.length} à traiter</Badge> : null}
        </CardHeader>
        <CardContent className="space-y-3">
          {recommendations.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Pas de recommandation en attente.
            </div>
          ) : (
            recommendations.map((recommendation) => (
              <div key={recommendation.id} className="rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <CircleAlert className="size-4 text-primary" />
                      <p className="font-medium text-foreground">{recommendation.title}</p>
                      <Badge variant="secondary">{recommendation.priority}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{recommendation.rationale}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => statusMutation.mutate({ id: recommendation.id, status: "dismissed" })}
                    >
                      Ignorer
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => statusMutation.mutate({ id: recommendation.id, status: "applied" })}
                    >
                      <CheckCircle2 className="size-4" />
                      Marquer appliquée
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">État de l'intégration</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <StatusItem label="Base Meta Ads" ok={accounts.length > 0} />
          <StatusItem label="Données de performance" ok={campaigns.length > 0} />
          <StatusItem label="Attribution CRM" ok={totals.leads > 0 || accounts.length === 0} />
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Euro; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
          <Icon className="size-4 text-primary" />
          {label}
        </div>
        <p className="mt-2 font-display text-2xl text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}

function StatusItem({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border p-4">
      <span className="text-sm text-foreground">{label}</span>
      <Badge variant={ok ? "default" : "secondary"}>{ok ? "OK" : "À configurer"}</Badge>
    </div>
  );
}
