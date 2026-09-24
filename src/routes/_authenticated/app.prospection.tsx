import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
  AtSign,
  Globe,
  Loader2,
  Mail,
  MapPin,
  Search,
  Send,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteProspect,
  findProspectEmail,
  generateOutreach,
  importProspects,
  listProspects,
  saveOutreach,
  scanProspectWebsite,
  searchProspects,
  sendOutreach,
  updateProspect,
  updateProspectStatus,
} from "@/lib/prospects.functions";
import {
  AREAS,
  DEFAULT_RADIUS_KM,
  MAX_RADIUS_KM,
  MIN_RADIUS_KM,
  PROSPECT_STATUSES,
  SECTORS,
  labelOf,
  scoreLabel,
} from "@/lib/prospects-shared";
import { cn } from "@/lib/utils";
import { ProspectCrm } from "@/components/prospect-crm";

const ProspectMap = lazy(() => import("@/components/prospect-map"));

export const Route = createFileRoute("/_authenticated/app/prospection")({
  head: () => ({
    meta: [
      { title: "Prospection — PURE SPACE NETT" },
      { name: "description", content: "Prospection d'entreprises de nettoyage pour développer les contrats de sous-traitance." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProspectingPage,
});

interface ProspectRow {
  id: string;
  company_name: string;
  sector: string | null;
  city: string | null;
  postal_code: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  score: number | null;
  source: string | null;
  notes: string | null;
  outreach_subject: string | null;
  outreach_body: string | null;
  outreach_sent_at: string | null;
  latitude: number | null;
  longitude: number | null;
  contact_name: string | null;
  contact_title: string | null;
  contact_linkedin: string | null;
  found_emails: string[] | null;
}

function enforceAmazighSignature(value: string): string {
  return value.replace(/\bAmine\b/gi, "Amazigh");
}

function ProspectingPage() {
  const queryClient = useQueryClient();
  const fetchProspects = useServerFn(listProspects);
  const runSearch = useServerFn(searchProspects);
  const runImport = useServerFn(importProspects);
  const runDraft = useServerFn(generateOutreach);
  const runSave = useServerFn(saveOutreach);
  const runSend = useServerFn(sendOutreach);
  const runStatus = useServerFn(updateProspectStatus);
  const runPatch = useServerFn(updateProspect);
  const runDelete = useServerFn(deleteProspect);
  const runFindEmail = useServerFn(findProspectEmail);
  const runScan = useServerFn(scanProspectWebsite);

  const { data, isLoading } = useQuery({
    queryKey: ["prospects"],
    queryFn: () => fetchProspects(),
  });

  const [sector, setSector] = useState(SECTORS[0]!.value);
  const [area, setArea] = useState(AREAS[0]!);
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);
  const [filter, setFilter] = useState("tous");
  const [term, setTerm] = useState("");
  const [importText, setImportText] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [email, setEmail] = useState("");
  const [center, setCenter] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [workspace, setWorkspace] = useState<"crm" | "acquisition">("crm");

  useEffect(() => setMounted(true), []);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["prospects"] });

  const prospects = (data?.prospects ?? []) as ProspectRow[];
  const searches = (data?.searches ?? []) as Array<{
    radius_km?: number | null;
    center_lat?: number | null;
    center_lng?: number | null;
  }>;
  const selected = prospects.find((p) => p.id === selectedId) ?? null;

  const lastSearch = searches[0];
  const mapCenter =
    center ??
    (typeof lastSearch?.center_lat === "number" && typeof lastSearch?.center_lng === "number"
      ? { latitude: Number(lastSearch.center_lat), longitude: Number(lastSearch.center_lng) }
      : null);

  const rows = useMemo(() => {
    const needle = term.trim().toLowerCase();
    return prospects.filter((p) => {
      const matchStatus = filter === "tous" || p.status === filter;
      const matchTerm =
        !needle ||
        [p.company_name, p.city, p.postal_code, p.email, p.phone]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(needle));
      return matchStatus && matchTerm;
    });
  }, [prospects, filter, term]);

  const pins = useMemo(
    () =>
      rows
        .filter((p) => typeof p.latitude === "number" && typeof p.longitude === "number")
        .map((p) => ({
          id: p.id,
          name: p.company_name,
          city: p.city,
          postalCode: p.postal_code,
          latitude: Number(p.latitude),
          longitude: Number(p.longitude),
          contacted: Boolean(p.outreach_sent_at),
          selected: p.id === selectedId,
        })),
    [rows, selectedId],
  );

  /** Prospects grouped by town, then by postal code (quartier for Paris arrondissements). */
  const areasBreakdown = useMemo(() => {
    const groups = new Map<string, { total: number; quarters: Map<string, number> }>();
    for (const row of rows) {
      const city = row.city ?? "Ville inconnue";
      const group = groups.get(city) ?? { total: 0, quarters: new Map<string, number>() };
      group.total += 1;
      const quarter = row.postal_code ?? "—";
      group.quarters.set(quarter, (group.quarters.get(quarter) ?? 0) + 1);
      groups.set(city, group);
    }
    return [...groups.entries()]
      .map(([city, group]) => ({
        city,
        total: group.total,
        quarters: [...group.quarters.entries()].sort((a, b) => b[1] - a[1]),
      }))
      .sort((a, b) => b.total - a.total);
  }, [rows]);

  const select = (prospect: ProspectRow) => {
    setSelectedId(prospect.id);
    setSubject(prospect.outreach_subject ?? "");
    setBody(enforceAmazighSignature(prospect.outreach_body ?? ""));
    setEmail(prospect.email ?? "");
  };

  const selectById = (id: string) => {
    const prospect = prospects.find((p) => p.id === id);
    if (prospect) select(prospect);
  };

  const searchMutation = useMutation({
    mutationFn: () => runSearch({ data: { sector, area, radiusKm } }),
    onSuccess: (result) => {
      setCenter(result.center);
      toast.success(
        result.created > 0
          ? `${result.created} nouvelle(s) entreprise(s) ajoutée(s) sur ${result.found} trouvée(s)${
              result.prepared > 0 ? ` — ${result.prepared} message(s) déjà rédigé(s)` : ""
            }.`
          : `Aucune nouvelle entreprise (${result.found} déjà connues).`,
      );
      void refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const importMutation = useMutation({
    mutationFn: () => runImport({ data: { text: importText } }),
    onSuccess: (result) => {
      toast.success(`${result.created} entreprise(s) importée(s).`);
      setImportText("");
      void refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const draftMutation = useMutation({
    mutationFn: (id: string) => runDraft({ data: { id } }),
    onSuccess: (draft) => {
      setSubject(draft.subject);
      setBody(draft.body);
      toast.success("Message préparé, relisez-le avant l'envoi.");
      void refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const saveMutation = useMutation({
    mutationFn: (id: string) =>
      runSave({ data: { id, subject, body: enforceAmazighSignature(body) } }),
    onSuccess: () => {
      toast.success("Message enregistré.");
      void refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const sendMutation = useMutation({
    mutationFn: async (id: string) => {
      // Persist what is on screen (address + message) so nothing typed is lost on send.
      if (email) await runPatch({ data: { id, email } });
      if (subject.length >= 3 && body.length >= 20) {
        await runSave({ data: { id, subject, body: enforceAmazighSignature(body) } });
      }
      return runSend({ data: { id } });
    },

    onSuccess: (result) => {
      if (result.sent) toast.success("Email envoyé, le prospect passe en « Contacté ».");
      else toast.error("Envoi bloqué : cette adresse a été désinscrite.");
      void refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const patchMutation = useMutation({
    mutationFn: (id: string) => runPatch({ data: { id, email } }),
    onSuccess: () => {
      toast.success("Coordonnées mises à jour.");
      void refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const scanMutation = useMutation({
    mutationFn: (id: string) => runScan({ data: { id } }),
    onSuccess: (result) => {
      if (result.emails.length > 0) {
        if (result.email) setEmail(result.email);
        toast.success(`${result.emails.length} adresse(s) trouvée(s) sur leur site.`);
      } else {
        toast.error("Aucune adresse publique sur leur site.");
      }
      void refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const findEmailMutation = useMutation({
    mutationFn: (id: string) => runFindEmail({ data: { id } }),
    onSuccess: (result) => {
      if (result.email) setEmail(result.email);
      if (result.found && result.contact) {
        toast.success(`Adresse trouvée, à l'attention de ${result.contact.contactName}.`);
      } else if (result.found) {
        toast.success("Adresse trouvée sur leur site web.");
      } else if (result.contact) {
        toast.message(
          `Interlocuteur identifié : ${result.contact.contactName}. Adresse email à compléter.`,
        );
      } else {
        toast.error(
          "Aucune adresse trouvée. Ouvrez leur site web et copiez l'email de leur page Contact.",
        );
      }
      void refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const statusMutation = useMutation({
    mutationFn: (payload: { id: string; status: string }) =>
      runStatus({ data: payload as never }),
    onSuccess: () => void refresh(),
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => runDelete({ data: { id } }),
    onSuccess: () => {
      setSelectedId(null);
      toast.success("Prospect retiré.");
      void refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-600 tracking-tight">Prospection sous-traitance</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Trouvez des entreprises de nettoyage à prospecter pour obtenir des chantiers en sous-traitance. Le premier message est rédigé automatiquement —
          vous le relisez et vous l'envoyez.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-2">
        <Button variant={workspace === "crm" ? "default" : "outline"} onClick={() => setWorkspace("crm")}>
          CRM & relances
        </Button>
        <Button variant={workspace === "acquisition" ? "default" : "outline"} onClick={() => setWorkspace("acquisition")}>
          Recherche & nouveaux prospects
        </Button>
      </div>

      {workspace === "crm" ? (
        <ProspectCrm />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Prospecter des entreprises de nettoyage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Type d'entreprise de nettoyage</Label>
                <Select value={sector} onValueChange={setSector}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SECTORS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Ville</Label>
                <Select value={area} onValueChange={setArea}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AREAS.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Rayon autour de la ville</Label>
                <span className="text-sm font-500">{radiusKm} km</span>
              </div>
              <Slider
                value={[radiusKm]}
                min={MIN_RADIUS_KM}
                max={MAX_RADIUS_KM}
                step={1}
                onValueChange={(value) => setRadiusKm(value[0] ?? DEFAULT_RADIUS_KM)}
              />
            </div>

            <Button
              onClick={() => searchMutation.mutate()}
              disabled={searchMutation.isPending}
              className="w-full"
            >
              {searchMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Search className="size-4" />
              )}
              Lancer la recherche
            </Button>
            <p className="text-xs text-muted-foreground">
              Jusqu'à 15 entreprises par recherche, doublons ignorés. Les premières entreprises
              trouvées reçoivent automatiquement un message prêt à relire.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Importer une liste</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              rows={5}
              value={importText}
              onChange={(event) => setImportText(event.target.value)}
              placeholder={"Nom de l'entreprise ; email ; téléphone ; ville\nCabinet Duval ; contact@duval.fr ; 0148000000 ; Pantin"}
            />
            <Button
              variant="secondary"
              onClick={() => importMutation.mutate()}
              disabled={importMutation.isPending || importText.trim().length < 2}
              className="w-full"
            >
              {importMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              Importer
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="size-4" />
            Carte des entreprises
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          {mounted ? (
            <Suspense fallback={<Skeleton className="h-72 w-full" />}>
              <ProspectMap
                pins={pins}
                center={mapCenter}
                radiusKm={radiusKm}
                onSelect={selectById}
              />
            </Suspense>
          ) : (
            <Skeleton className="h-72 w-full" />
          )}

          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {pins.length} entreprise(s) localisée(s). Cliquez un point pour ouvrir sa fiche.
            </p>
            <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
              {areasBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Lancez une recherche pour voir la répartition par ville.
                </p>
              ) : (
                areasBreakdown.map((group) => (
                  <div key={group.city} className="rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-500">{group.city}</span>
                      <Badge variant="outline">{group.total}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {group.quarters
                        .map(([quarter, count]) => `${quarter} (${count})`)
                        .join(" · ")}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader className="gap-3">
            <CardTitle className="text-base">
              Prospects {rows.length > 0 ? `(${rows.length})` : ""}
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Input
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                placeholder="Rechercher…"
                className="h-9 max-w-52"
              />
              <Button
                variant={filter === "tous" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("tous")}
              >
                Tous
              </Button>
              {PROSPECT_STATUSES.map((status) => (
                <Button
                  key={status.value}
                  variant={filter === status.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter(status.value)}
                >
                  {status.label}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : rows.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Aucun prospect pour l'instant. Lancez une recherche ci-dessus.
              </p>
            ) : (
              rows.map((prospect) => (
                <button
                  key={prospect.id}
                  type="button"
                  onClick={() => select(prospect)}
                  className={cn(
                    "w-full rounded-lg border border-border p-3 text-left transition-colors hover:bg-muted/60",
                    selectedId === prospect.id && "border-primary bg-primary/5",
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-500">{prospect.company_name}</span>
                    <div className="flex items-center gap-2">
                      {prospect.outreach_sent_at ? (
                        <Badge variant="secondary">Contacté</Badge>
                      ) : prospect.outreach_body ? (
                        <Badge variant="secondary">Message prêt</Badge>
                      ) : null}
                      <Badge variant="outline">
                        {labelOf(PROSPECT_STATUSES, prospect.status)}
                      </Badge>
                      <Badge variant="outline">{scoreLabel(prospect.score ?? 0)}</Badge>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[
                      labelOf(SECTORS, prospect.sector),
                      prospect.city,
                      prospect.email ?? prospect.phone ?? "coordonnées à compléter",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {selected ? selected.company_name : "Premier contact"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selected ? (
              <p className="text-sm text-muted-foreground">
                Sélectionnez une entreprise de nettoyage pour préparer son email de prospection sous-traitance.
              </p>
            ) : (
              <>
                {selected.contact_name ? (
                  <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
                    <p className="font-500">{selected.contact_name}</p>
                    {selected.contact_title ? (
                      <p className="text-xs text-muted-foreground">{selected.contact_title}</p>
                    ) : null}
                    {selected.contact_linkedin ? (
                      <a
                        href={selected.contact_linkedin}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-primary underline"
                      >
                        Voir son profil
                      </a>
                    ) : null}
                  </div>
                ) : null}

                <div className="space-y-1.5">
                  <Label>Email du prospect</Label>
                  <div className="flex gap-2">
                    <Input
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="contact@entreprise.fr"
                    />
                    <Button
                      variant="secondary"
                      onClick={() => patchMutation.mutate(selected.id)}
                      disabled={patchMutation.isPending}
                    >
                      <Mail className="size-4" />
                    </Button>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => scanMutation.mutate(selected.id)}
                      disabled={scanMutation.isPending || !selected.website}
                    >
                      {scanMutation.isPending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Globe className="size-4" />
                      )}
                      Scanner leur site
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => findEmailMutation.mutate(selected.id)}
                      disabled={findEmailMutation.isPending}
                    >
                      {findEmailMutation.isPending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <AtSign className="size-4" />
                      )}
                      Trouver le contact
                    </Button>
                  </div>

                  {(selected.found_emails ?? []).length > 0 ? (
                    <div className="space-y-1 rounded-lg border border-border p-2">
                      <p className="text-xs text-muted-foreground">
                        Adresses trouvées sur leur site — cliquez pour l'utiliser :
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {(selected.found_emails ?? []).map((found) => (
                          <Button
                            key={found}
                            variant={found === email ? "default" : "outline"}
                            size="sm"
                            onClick={() => setEmail(found)}
                          >
                            {found}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {selected.website ? (
                    <a
                      href={selected.website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-primary underline"
                    >
                      Voir leur site web
                    </a>
                  ) : null}
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => draftMutation.mutate(selected.id)}
                  disabled={draftMutation.isPending}
                >
                  {draftMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  Réécrire le message
                </Button>

                <div className="space-y-1.5">
                  <Label>Objet</Label>
                  <Input value={subject} onChange={(event) => setSubject(event.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Message</Label>
                  <Textarea
                    rows={10}
                    value={enforceAmazighSignature(body)}
                    onChange={(event) => setBody(enforceAmazighSignature(event.target.value))}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => saveMutation.mutate(selected.id)}
                    disabled={saveMutation.isPending || subject.length < 3 || body.length < 20}
                  >
                    Enregistrer
                  </Button>
                  <Button
                    onClick={() => sendMutation.mutate(selected.id)}
                    disabled={sendMutation.isPending || !email || body.length < 20}
                  >
                    {sendMutation.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Send className="size-4" />
                    )}
                    Envoyer
                  </Button>
                </div>

                <div className="space-y-1.5">
                  <Label>Statut</Label>
                  <div className="flex flex-wrap gap-2">
                    {PROSPECT_STATUSES.map((status) => (
                      <Button
                        key={status.value}
                        size="sm"
                        variant={selected.status === status.value ? "default" : "outline"}
                        onClick={() =>
                          statusMutation.mutate({ id: selected.id, status: status.value })
                        }
                      >
                        {status.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => deleteMutation.mutate(selected.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="size-4" />
                  Retirer ce prospect
                </Button>
              </>
            )}
          </CardContent>
        </Card>
          </div>
        </div>
      )}
    </div>
  );
}
