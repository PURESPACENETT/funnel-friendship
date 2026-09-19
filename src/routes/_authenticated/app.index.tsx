import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Euro, Inbox, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { listRequests } from "@/lib/quotes.functions";
import { STATUSES, formatEuros, labelOf, scoreLabel } from "@/lib/quotes-shared";

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({
    meta: [
      { title: "Tableau de bord — PURE SPACE NETT" },
      { name: "description", content: "Suivi des demandes de devis de nettoyage." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardPage,
});

const FOLLOW_UP_DAYS = 3;

function DashboardPage() {
  const fetchRequests = useServerFn(listRequests);
  const { data, isLoading } = useQuery({
    queryKey: ["requests"],
    queryFn: () => fetchRequests(),
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  const requests = data ?? [];
  const today = new Date().toDateString();
  const newToday = requests.filter((r) => new Date(r.created_at).toDateString() === today).length;
  const open = requests.filter((r) => r.status !== "gagne" && r.status !== "perdu");
  const pipeline = open.reduce((sum, r) => sum + Number(r.estimate_max ?? 0), 0);
  const won = requests.filter((r) => r.status === "gagne").length;
  const closed = won + requests.filter((r) => r.status === "perdu").length;
  const conversion = closed ? Math.round((won / closed) * 100) : 0;
  const b2b = requests.filter((r) => r.client_type !== "particulier").length;

  const cutoff = Date.now() - FOLLOW_UP_DAYS * 86400000;
  const followUp = requests.filter(
    (r) =>
      (r.status === "nouveau" || r.status === "contacte" || r.status === "devis_envoye") &&
      new Date(r.last_contacted_at ?? r.created_at).getTime() < cutoff,
  );

  const latest = requests.slice(0, 6);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl text-foreground">Tableau de bord</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {requests.length} demande{requests.length > 1 ? "s" : ""} au total · {b2b} professionnelle
          {b2b > 1 ? "s" : ""} · {requests.length - b2b} particulier
          {requests.length - b2b > 1 ? "s" : ""}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Inbox} label="Nouvelles aujourd'hui" value={String(newToday)} />
        <StatCard icon={Euro} label="Pipeline estimé" value={formatEuros(pipeline)} />
        <StatCard icon={TrendingUp} label="Taux de conversion" value={`${conversion} %`} />
        <StatCard
          icon={AlertTriangle}
          label={`À relancer (+${FOLLOW_UP_DAYS} j)`}
          value={String(followUp.length)}
        />
      </div>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-lg text-foreground">Dernières demandes</h2>
          <Link
            to="/app/demandes"
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            Tout voir
          </Link>
        </div>

        {latest.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-border bg-surface p-6 text-center text-sm text-muted-foreground">
            Aucune demande pour l'instant. Partagez le lien du formulaire depuis votre site.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {latest.map((r) => (
              <li key={r.id}>
                <Link
                  to="/app/demandes/$id"
                  params={{ id: r.id }}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 transition-colors hover:bg-secondary"
                >
                  <div>
                    <p className="font-600 text-foreground">
                      {r.company_name || r.contact_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.city} · {r.surface_m2} m² · {labelOf(STATUSES, r.status)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">Priorité {scoreLabel(r.score)}</Badge>
                    <span className="text-sm text-foreground">
                      {formatEuros(Number(r.estimate_min))} – {formatEuros(Number(r.estimate_max))}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {followUp.length > 0 && (
        <section>
          <h2 className="text-lg text-foreground">À relancer</h2>
          <ul className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {followUp.slice(0, 8).map((r) => (
              <li key={r.id}>
                <Link
                  to="/app/demandes/$id"
                  params={{ id: r.id }}
                  className="flex items-center justify-between gap-2 px-4 py-3 transition-colors hover:bg-secondary"
                >
                  <span className="text-foreground">{r.company_name || r.contact_name}</span>
                  <span className="text-xs text-muted-foreground">
                    Dernier contact :{" "}
                    {new Date(r.last_contacted_at ?? r.created_at).toLocaleDateString("fr-FR")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Inbox;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        <Icon className="size-4 text-primary" />
        {label}
      </div>
      <p className="mt-2 font-display text-2xl text-foreground">{value}</p>
    </div>
  );
}
