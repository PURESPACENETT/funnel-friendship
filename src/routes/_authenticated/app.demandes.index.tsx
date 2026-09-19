import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listRequests } from "@/lib/quotes.functions";
import {
  CLIENT_TYPES,
  STATUSES,
  formatEuros,
  labelOf,
  scoreLabel,
} from "@/lib/quotes-shared";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/demandes/")({
  head: () => ({
    meta: [
      { title: "Demandes — PURE SPACE NETT" },
      { name: "description", content: "Toutes les demandes de devis reçues." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RequestsPage,
});

function RequestsPage() {
  const fetchRequests = useServerFn(listRequests);
  const { data, isLoading } = useQuery({
    queryKey: ["requests"],
    queryFn: () => fetchRequests(),
  });

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("tous");

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data ?? []).filter((r) => {
      const matchStatus = status === "tous" || r.status === status;
      const matchTerm =
        !term ||
        [r.contact_name, r.company_name, r.city, r.email, r.phone, r.postal_code]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(term));
      return matchStatus && matchTerm;
    });
  }, [data, search, status]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl text-foreground">Demandes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Filtrez, priorisez et ouvrez une fiche pour suivre l'échange.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Nom, société, ville, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[{ value: "tous", label: "Tous" }, ...STATUSES].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setStatus(option.value)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm transition-colors",
                status === option.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-secondary",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-surface p-8 text-center text-sm text-muted-foreground">
          Aucune demande ne correspond à ce filtre.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Lieu</TableHead>
                <TableHead>Surface</TableHead>
                <TableHead>Estimation</TableHead>
                <TableHead>Priorité</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Reçue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} className="cursor-pointer">
                  <TableCell className="font-500">
                    <Link
                      to="/app/demandes/$id"
                      params={{ id: r.id }}
                      className="text-foreground underline-offset-4 hover:underline"
                    >
                      {r.company_name || r.contact_name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {labelOf(CLIENT_TYPES, r.client_type)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.city} ({r.postal_code})
                  </TableCell>
                  <TableCell className="text-muted-foreground">{r.surface_m2} m²</TableCell>
                  <TableCell>
                    {formatEuros(Number(r.estimate_min))} – {formatEuros(Number(r.estimate_max))}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{scoreLabel(r.score)}</Badge>
                  </TableCell>
                  <TableCell>{labelOf(STATUSES, r.status)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString("fr-FR")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
