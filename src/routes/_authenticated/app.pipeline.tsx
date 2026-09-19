import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { listRequests, updateRequestStatus } from "@/lib/quotes.functions";
import {
  STATUSES,
  formatEuros,
  scoreLabel,
  type StatusValue,
} from "@/lib/quotes-shared";

export const Route = createFileRoute("/_authenticated/app/pipeline")({
  head: () => ({
    meta: [
      { title: "Pipeline — PURE SPACE NETT" },
      { name: "description", content: "Suivi des demandes de devis par étape." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PipelinePage,
});

const ORDER = STATUSES.map((s) => s.value);

function PipelinePage() {
  const fetchRequests = useServerFn(listRequests);
  const setStatus = useServerFn(updateRequestStatus);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["requests"],
    queryFn: () => fetchRequests(),
  });

  const move = useMutation({
    mutationFn: (vars: { id: string; status: StatusValue }) => setStatus({ data: vars }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      toast.success("Demande déplacée");
    },
    onError: () => toast.error("Déplacement impossible"),
  });

  if (isLoading) return <Skeleton className="h-96 rounded-xl" />;

  const rows = data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl text-foreground">Pipeline</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Faites avancer chaque demande de « Nouveau » jusqu'à « Gagné » ou « Perdu ».
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        {STATUSES.map((column) => {
          const items = rows.filter((r) => r.status === column.value);
          const total = items.reduce((sum, r) => sum + Number(r.estimate_max), 0);
          const index = ORDER.indexOf(column.value);

          return (
            <section
              key={column.value}
              className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-3"
            >
              <header className="flex items-baseline justify-between">
                <p className="text-sm font-500 text-foreground">{column.label}</p>
                <span className="text-xs text-muted-foreground">{items.length}</span>
              </header>
              <p className="text-xs text-muted-foreground">
                {items.length > 0 ? `Potentiel ${formatEuros(total)}` : "Aucune demande"}
              </p>

              <ul className="space-y-3">
                {items.map((r) => (
                  <li key={r.id} className="rounded-lg border border-border bg-card p-3">
                    <Link
                      to="/app/demandes/$id"
                      params={{ id: r.id }}
                      className="text-sm text-foreground underline-offset-4 hover:underline"
                    >
                      {r.company_name || r.contact_name}
                    </Link>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {r.city} · {r.surface_m2} m²
                    </p>
                    <p className="mt-1 text-xs text-foreground">
                      {formatEuros(Number(r.estimate_min))} – {formatEuros(Number(r.estimate_max))}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {scoreLabel(r.score)}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          aria-label="Étape précédente"
                          disabled={index === 0 || move.isPending}
                          onClick={() =>
                            move.mutate({ id: r.id, status: ORDER[index - 1] as StatusValue })
                          }
                          className="rounded-md border border-border p-1 text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-40"
                        >
                          <ChevronLeft className="size-4" />
                        </button>
                        <button
                          type="button"
                          aria-label="Étape suivante"
                          disabled={index === ORDER.length - 1 || move.isPending}
                          onClick={() =>
                            move.mutate({ id: r.id, status: ORDER[index + 1] as StatusValue })
                          }
                          className="rounded-md border border-border p-1 text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-40"
                        >
                          <ChevronRight className="size-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
