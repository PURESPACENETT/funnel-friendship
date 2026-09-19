import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Mail, MapPin, Phone, RefreshCw, Sparkles, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  addNote,
  deleteRequest,
  getRequest,
  qualifyRequest,
  updateRequestStatus,
} from "@/lib/quotes.functions";
import {
  CLIENT_TYPES,
  FREQUENCIES,
  PROPERTY_TYPES,
  SERVICES,
  STATUSES,
  formatEuros,
  labelOf,
  scoreLabel,
  type StatusValue,
} from "@/lib/quotes-shared";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/demandes/$id")({
  head: () => ({
    meta: [
      { title: "Fiche demande — PURE SPACE NETT" },
      { name: "description", content: "Détail d'une demande de devis." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RequestDetailPage,
});

function RequestDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const fetchRequest = useServerFn(getRequest);
  const setStatus = useServerFn(updateRequestStatus);
  const createNote = useServerFn(addNote);
  const removeRequest = useServerFn(deleteRequest);

  const [note, setNote] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["request", id],
    queryFn: () => fetchRequest({ data: { id } }),
  });

  const statusMutation = useMutation({
    mutationFn: (status: StatusValue) => setStatus({ data: { id, status } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["request", id] });
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      toast.success("Statut mis à jour");
    },
    onError: () => toast.error("Mise à jour impossible"),
  });

  const noteMutation = useMutation({
    mutationFn: (body: string) => createNote({ data: { requestId: id, body } }),
    onSuccess: () => {
      setNote("");
      queryClient.invalidateQueries({ queryKey: ["request", id] });
      toast.success("Note ajoutée");
    },
    onError: () => toast.error("Note non enregistrée"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => removeRequest({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      navigate({ to: "/app/demandes" });
    },
    onError: () => toast.error("Suppression impossible"),
  });

  if (isLoading) return <Skeleton className="h-96 rounded-xl" />;

  const request = data?.request;
  if (!request) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-foreground">Cette demande n'existe plus.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/app/demandes">Retour aux demandes</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        to="/app/demandes"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Toutes les demandes
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl text-foreground">
            {request.company_name || request.contact_name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {labelOf(CLIENT_TYPES, request.client_type)} · reçue le{" "}
            {new Date(request.created_at).toLocaleDateString("fr-FR")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Priorité {scoreLabel(request.score)}</Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="size-4" /> Supprimer
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUSES.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => statusMutation.mutate(option.value)}
            disabled={statusMutation.isPending}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm transition-colors",
              request.status === option.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background hover:bg-secondary",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-base text-foreground">Le besoin</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Type de lieu" value={labelOf(PROPERTY_TYPES, request.property_type)} />
              <Field label="Surface" value={`${request.surface_m2} m²`} />
              <Field
                label="Pièces / étages"
                value={request.rooms != null ? String(request.rooms) : "—"}
              />
              <Field label="Fréquence" value={labelOf(FREQUENCIES, request.frequency)} />
              <Field
                label="Prestations"
                value={request.services.map((s: string) => labelOf(SERVICES, s)).join(", ")}
              />
              <Field
                label="Date souhaitée"
                value={
                  request.desired_date
                    ? new Date(request.desired_date).toLocaleDateString("fr-FR")
                    : "—"
                }
              />
            </dl>
            {request.message && (
              <p className="mt-4 rounded-lg bg-surface p-4 text-sm text-foreground">
                {request.message}
              </p>
            )}
          </section>

          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-base text-foreground">Notes de suivi</h2>
            <div className="mt-3 space-y-2">
              <Textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Appel du jour, conditions négociées, prochaine étape..."
              />
              <Button
                size="sm"
                onClick={() => noteMutation.mutate(note)}
                disabled={!note.trim() || noteMutation.isPending}
              >
                Ajouter la note
              </Button>
            </div>

            <ul className="mt-5 space-y-3">
              {(data?.notes ?? []).map((n) => (
                <li key={n.id} className="rounded-lg border border-border bg-surface p-3">
                  <p className="text-sm text-foreground">{n.body}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(n.created_at).toLocaleString("fr-FR")}
                  </p>
                </li>
              ))}
              {(data?.notes ?? []).length === 0 && (
                <li className="text-sm text-muted-foreground">Aucune note pour l'instant.</li>
              )}
            </ul>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Estimation automatique
            </p>
            <p className="mt-2 font-display text-2xl text-foreground">
              {formatEuros(Number(request.estimate_min))} –{" "}
              {formatEuros(Number(request.estimate_max))}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Par intervention, hors taxes.</p>
          </section>

          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-base text-foreground">Contact</h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="text-foreground">{request.contact_name}</li>
              <li>
                <a
                  href={`mailto:${request.email}`}
                  className="flex items-center gap-2 text-primary hover:underline"
                >
                  <Mail className="size-4" /> {request.email}
                </a>
              </li>
              <li>
                <a
                  href={`tel:${request.phone}`}
                  className="flex items-center gap-2 text-primary hover:underline"
                >
                  <Phone className="size-4" /> {request.phone}
                </a>
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="size-4" /> {request.city} ({request.postal_code})
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm text-foreground">{value}</dd>
    </div>
  );
}
