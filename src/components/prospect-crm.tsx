import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Filter,
  Mail,
  Phone,
  Plus,
  Search,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  OPPORTUNITY_TYPES,
  PIPELINE_COLUMNS,
  PROSPECT_STATUSES,
  TASK_PRIORITIES,
  TASK_TYPES,
  labelOf,
  scoreLabel,
} from "@/lib/prospects-shared";
import { cn } from "@/lib/utils";
import {
  addProspectNote,
  completeProspectTask,
  createProspectTask,
  getProspectCrmDetail,
  listProspectCrm,
  updateProspectLossReason,
  updateProspectOpportunityType,
} from "@/lib/prospect-crm.functions";
import { updateProspectStatus } from "@/lib/prospects.functions";

type Prospect = {
  id: string;
  company_name: string;
  city: string | null;
  postal_code: string | null;
  email: string | null;
  phone: string | null;
  score: number | null;
  status: string;
  opportunity_type: string | null;
  loss_reason: string | null;
  website: string | null;
  outreach_sent_at: string | null;
  created_at: string;
  updated_at: string;
};

type Task = {
  id: string;
  prospect_id: string;
  title: string;
  task_type: string;
  due_at: string | null;
  priority: string;
  completed_at: string | null;
};

type Activity = {
  id: string;
  prospect_id: string;
  activity_type: string;
  title: string;
  body: string | null;
  occurred_at: string;
};

const statusLabel = (value: string) => labelOf(PROSPECT_STATUSES, value);
const opportunityLabel = (value: string | null) => labelOf(OPPORTUNITY_TYPES, value);
const taskTypeLabel = (value: string) => labelOf(TASK_TYPES, value);
const priorityLabel = (value: string) => labelOf(TASK_PRIORITIES, value);

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function isOverdue(value: string | null, completedAt: string | null) {
  return Boolean(value && !completedAt && new Date(value).getTime() < Date.now());
}

function isToday(value: string | null) {
  if (!value) return false;
  const date = new Date(value);
  const now = new Date();
  return date.toDateString() === now.toDateString();
}

export function ProspectCrm() {
  const queryClient = useQueryClient();
  const fetchCrm = useServerFn(listProspectCrm);
  const fetchDetail = useServerFn(getProspectCrmDetail);
  const setStatus = useServerFn(updateProspectStatus);
  const setOpportunity = useServerFn(updateProspectOpportunityType);
  const setLossReason = useServerFn(updateProspectLossReason);
  const addNote = useServerFn(addProspectNote);
  const createTask = useServerFn(createProspectTask);
  const completeTask = useServerFn(completeProspectTask);

  const { data, isLoading } = useQuery({
    queryKey: ["prospect-crm"],
    queryFn: () => fetchCrm(),
  });

  const [view, setView] = useState<"pipeline" | "list">("pipeline");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("tous");
  const [opportunityFilter, setOpportunityFilter] = useState("tous");
  const [minScore, setMinScore] = useState("0");
  const [emailFilter, setEmailFilter] = useState("tous");
  const [search, setSearch] = useState("");
  const [note, setNote] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskType, setTaskType] = useState("relance");
  const [taskPriority, setTaskPriority] = useState("normale");
  const [taskDue, setTaskDue] = useState("");
  const [lossReason, setLossReasonValue] = useState("");

  const prospects = (data?.prospects ?? []) as Prospect[];
  const tasks = (data?.tasks ?? []) as Task[];
  const activities = (data?.activities ?? []) as Activity[];
  const kpis = data?.kpis;

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const score = Number(minScore);
    return prospects.filter((p) => {
      if (statusFilter !== "tous" && p.status !== statusFilter) return false;
      if (opportunityFilter !== "tous" && p.opportunity_type !== opportunityFilter) return false;
      if ((p.score ?? 0) < score) return false;
      if (emailFilter === "avec" && !p.email) return false;
      if (emailFilter === "sans" && p.email) return false;
      if (
        needle &&
        ![p.company_name, p.city, p.postal_code, p.email, p.phone]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(needle))
      ) {
        return false;
      }
      return true;
    });
  }, [prospects, statusFilter, opportunityFilter, minScore, emailFilter, search]);

  const dueTasks = tasks.filter((task) => !task.completed_at && (isToday(task.due_at) || isOverdue(task.due_at, task.completed_at)));
  const overdueTasks = dueTasks.filter((task) => isOverdue(task.due_at, task.completed_at));

  const selected = prospects.find((p) => p.id === selectedId) ?? null;
  const selectedActivities = activities.filter((a) => a.prospect_id === selectedId);
  const selectedTasks = tasks.filter((t) => t.prospect_id === selectedId);

  const detailQuery = useQuery({
    queryKey: ["prospect-crm-detail", selectedId],
    queryFn: () => fetchDetail({ data: { id: selectedId! } }),
    enabled: Boolean(selectedId),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["prospect-crm"] });
    if (selectedId) void queryClient.invalidateQueries({ queryKey: ["prospect-crm-detail", selectedId] });
  };

  const statusMutation = useMutation({
    mutationFn: (payload: { id: string; status: string }) => setStatus({ data: payload as never }),
    onSuccess: invalidate,
    onError: (error: Error) => toast.error(error.message),
  });

  const opportunityMutation = useMutation({
    mutationFn: (value: string) =>
      setOpportunity({ data: { id: selectedId!, opportunityType: value as "vente_directe" | "sous_traitance" | "les_deux" } }),
    onSuccess: () => {
      toast.success("Type d'opportunité enregistré.");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const noteMutation = useMutation({
    mutationFn: () => addNote({ data: { prospectId: selectedId!, body: note } }),
    onSuccess: () => {
      setNote("");
      toast.success("Note ajoutée.");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const taskMutation = useMutation({
    mutationFn: () =>
      createTask({
        data: {
          prospectId: selectedId!,
          title: taskTitle,
          taskType: taskType as "appeler" | "email" | "relance" | "rdv" | "visite" | "devis" | "autre",
          priority: taskPriority as "basse" | "normale" | "haute" | "urgente",
          dueAt: taskDue ? new Date(taskDue).toISOString() : null,
        },
      }),
    onSuccess: () => {
      setTaskTitle("");
      setTaskDue("");
      toast.success("Tâche créée.");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => completeTask({ data: { id } }),
    onSuccess: invalidate,
    onError: (error: Error) => toast.error(error.message),
  });

  const lossMutation = useMutation({
    mutationFn: () => setLossReason({ data: { id: selectedId!, lossReason: lossReason.trim() || null } }),
    onSuccess: () => {
      toast.success("Motif de perte enregistré.");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const openProspect = (id: string) => {
    setSelectedId(id);
    const prospect = prospects.find((p) => p.id === id);
    setLossReasonValue(prospect?.loss_reason ?? "");
  };

  const renderCard = (prospect: Prospect) => {
    const nextTask = tasks
      .filter((task) => task.prospect_id === prospect.id && !task.completed_at)
      .sort((a, b) => (a.due_at ?? "9999").localeCompare(b.due_at ?? "9999"))[0];

    return (
      <button
        key={prospect.id}
        type="button"
        onClick={() => openProspect(prospect.id)}
        className="w-full rounded-lg border border-border bg-card p-3 text-left transition hover:bg-muted/50"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-500">{prospect.company_name}</p>
            <p className="text-xs text-muted-foreground">{prospect.city ?? "Ville non renseignée"}</p>
          </div>
          <Badge variant="outline">{prospect.score ?? 0}</Badge>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge variant="secondary">{opportunityLabel(prospect.opportunity_type)}</Badge>
          {prospect.email ? <Badge variant="outline">Email</Badge> : <Badge variant="outline">Sans email</Badge>}
        </div>
        <p className="mt-2 truncate text-xs text-muted-foreground">
          {nextTask ? "Prochaine tâche : " + nextTask.title : "Aucune tâche ouverte"}
        </p>
      </button>
    );
  };

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-surface/50 p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-500 uppercase tracking-[0.14em] text-muted-foreground">CRM commercial</p>
          <h2 className="text-xl font-600">Pipeline de prospection</h2>
          <p className="text-sm text-muted-foreground">Pilotez les relances, rendez-vous, devis et conversions depuis les prospects existants.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant={view === "pipeline" ? "default" : "outline"} onClick={() => setView("pipeline")}>Pipeline</Button>
          <Button size="sm" variant={view === "list" ? "default" : "outline"} onClick={() => setView("list")}>Liste</Button>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ["Prospects", kpis?.total ?? 0],
          ["À contacter", kpis?.aContacter ?? 0],
          ["Contactés", kpis?.contactes ?? 0],
          ["Réponses", kpis?.reponses ?? 0],
          ["Intéressés", kpis?.interesses ?? 0],
          ["RDV", kpis?.rdv ?? 0],
          ["Devis", kpis?.devis ?? 0],
          ["Gagnés", kpis?.gagnes ?? 0],
          ["Perdus", kpis?.perdus ?? 0],
          ["Taux de contact", kpis?.contactRate === null ? "—" : String(kpis?.contactRate ?? 0) + " %"],
        ].map(([label, value]) => (
          <Card key={String(label)}>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-xl font-600">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-52 flex-1">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input className="pl-8" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Entreprise, ville, email…" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous les statuts</SelectItem>
            {PROSPECT_STATUSES.map((status) => <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={opportunityFilter} onValueChange={setOpportunityFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Opportunité" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Toutes opportunités</SelectItem>
            {OPPORTUNITY_TYPES.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={minScore} onValueChange={setMinScore}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Score" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Tous les scores</SelectItem>
            <SelectItem value="50">Score ≥ 50</SelectItem>
            <SelectItem value="70">Score ≥ 70</SelectItem>
          </SelectContent>
        </Select>
        <Select value={emailFilter} onValueChange={setEmailFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Email" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Email : tous</SelectItem>
            <SelectItem value="avec">Avec email</SelectItem>
            <SelectItem value="sans">Sans email</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          {isLoading ? (
            <Card><CardContent className="p-6 text-sm text-muted-foreground">Chargement du CRM…</CardContent></Card>
          ) : view === "pipeline" ? (
            <div className="grid gap-3 overflow-x-auto pb-2 xl:grid-cols-4">
              {PIPELINE_COLUMNS.map((column) => {
                const items = filtered.filter((prospect) => column.statuses.includes(prospect.status as never));
                return (
                  <div key={column.key} className="min-w-[245px] rounded-xl border border-border bg-muted/20 p-2.5">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-500">{column.label}</p>
                      <Badge variant="outline">{items.length}</Badge>
                    </div>
                    <div className="space-y-2">
                      {items.length ? items.map(renderCard) : <p className="p-3 text-xs text-muted-foreground">Aucun prospect</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="space-y-2 p-3">
                {filtered.map(renderCard)}
                {!filtered.length && <p className="p-6 text-center text-sm text-muted-foreground">Aucun prospect avec ces filtres.</p>}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm"><CalendarClock className="size-4" />À faire aujourd'hui</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {dueTasks.length ? dueTasks.slice(0, 8).map((task) => (
                <button key={task.id} type="button" onClick={() => openProspect(task.prospect_id)} className="w-full rounded-lg border border-border p-2 text-left">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm">{task.title}</span>
                    <Badge variant={isOverdue(task.due_at, task.completed_at) ? "destructive" : "secondary"}>{priorityLabel(task.priority)}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{formatDate(task.due_at)}</p>
                </button>
              )) : <p className="text-xs text-muted-foreground">Aucune relance due.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">En retard</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-600">{overdueTasks.length}</p>
              <p className="text-xs text-muted-foreground">tâche(s) ouverte(s) dépassée(s)</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {selected ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">{selected.company_name}</CardTitle>
              <p className="text-xs text-muted-foreground">{selected.city ?? "Ville non renseignée"} · score {selected.score ?? 0} ({scoreLabel(selected.score ?? 0)})</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setSelectedId(null)}>Fermer</Button>
          </CardHeader>
          <CardContent className="grid gap-5 lg:grid-cols-[1.1fr_1fr_1fr]">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {selected.phone ? <Button size="sm" variant="outline" asChild><a href={"tel:" + selected.phone}><Phone className="size-4" />Appeler</a></Button> : null}
                {selected.email ? <Button size="sm" variant="outline" asChild><a href={"mailto:" + selected.email}><Mail className="size-4" />Email</a></Button> : null}
                {selected.website ? <Button size="sm" variant="outline" asChild><a href={selected.website} target="_blank" rel="noreferrer"><ExternalLink className="size-4" />Site</a></Button> : null}
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-500 text-muted-foreground">Opportunité</p>
                <Select value={selected.opportunity_type ?? "vente_directe"} onValueChange={(value) => opportunityMutation.mutate(value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{OPPORTUNITY_TYPES.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-500 text-muted-foreground">Statut</p>
                <Select value={selected.status} onValueChange={(value) => statusMutation.mutate({ id: selected.id, status: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PROSPECT_STATUSES.map((status) => <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              {selected.status === "perdu" ? (
                <div className="space-y-2">
                  <Input value={lossReason} onChange={(event) => setLossReasonValue(event.target.value)} placeholder="Motif de perte" />
                  <Button size="sm" variant="outline" onClick={() => lossMutation.mutate()}>Enregistrer le motif</Button>
                </div>
              ) : null}

              <div className="space-y-2">
                <Textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ajouter une note commerciale…" />
                <Button size="sm" variant="secondary" disabled={!note.trim() || noteMutation.isPending} onClick={() => noteMutation.mutate()}><Plus className="size-4" />Ajouter une note</Button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-500">Tâches ouvertes</p>
                <Badge variant="outline">{selectedTasks.filter((task) => !task.completed_at).length}</Badge>
              </div>

              <div className="space-y-2">
                {(detailQuery.data?.tasks ?? selectedTasks).filter((task) => !task.completed_at).map((task) => (
                  <div key={task.id} className="rounded-lg border border-border p-2">
                    <div className="flex items-start gap-2">
                      <button type="button" aria-label="Terminer la tâche" onClick={() => completeMutation.mutate(task.id)} className="mt-0.5 text-muted-foreground hover:text-foreground">
                        <CheckCircle2 className="size-4" />
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">{task.title}</p>
                        <p className={cn("text-xs text-muted-foreground", isOverdue(task.due_at, task.completed_at) && "text-destructive")}>
                          {taskTypeLabel(task.task_type)} · {formatDate(task.due_at)} · {priorityLabel(task.priority)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2 rounded-lg border border-dashed border-border p-3">
                <Input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="Nouvelle tâche…" />
                <div className="grid grid-cols-2 gap-2">
                  <Select value={taskType} onValueChange={setTaskType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TASK_TYPES.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={taskPriority} onValueChange={setTaskPriority}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TASK_PRIORITIES.map((priority) => <SelectItem key={priority.value} value={priority.value}>{priority.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Input type="datetime-local" value={taskDue} onChange={(event) => setTaskDue(event.target.value)} />
                <Button size="sm" className="w-full" disabled={!taskTitle.trim() || taskMutation.isPending} onClick={() => taskMutation.mutate()}><Plus className="size-4" />Ajouter la tâche</Button>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-500">Historique commercial</p>
              <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                {(detailQuery.data?.activities ?? selectedActivities).map((activity) => (
                  <div key={activity.id} className="rounded-lg border border-border p-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-500">{activity.title}</p>
                      <span className="text-[11px] text-muted-foreground">{formatDate(activity.occurred_at)}</span>
                    </div>
                    {activity.body ? <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{activity.body}</p> : null}
                  </div>
                ))}
                {!selectedActivities.length && !detailQuery.data?.activities?.length ? <p className="text-xs text-muted-foreground">Aucune activité enregistrée.</p> : null}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Filter className="size-3.5" />
        {filtered.length} prospect(s) affiché(s) sur {prospects.length}.
        <ChevronRight className="size-3.5" />
        Les colonnes regroupent plusieurs statuts fins pour garder un pipeline lisible.
      </div>
    </section>
  );
}
