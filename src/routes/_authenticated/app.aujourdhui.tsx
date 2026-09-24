import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Clock3 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { completeProspectTask, listTodayProspectTasks } from "@/lib/prospect-crm.functions";
import { TASK_TYPES, TASK_PRIORITIES, labelOf } from "@/lib/prospects-shared";

export const Route = createFileRoute("/_authenticated/app/aujourdhui")({
  head: () => ({
    meta: [
      { title: "À faire aujourd'hui — PURE SPACE NETT" },
      { name: "description", content: "Tâches commerciales à traiter aujourd'hui et en retard." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TodayPage,
});

function formatDue(value: string | null) {
  if (!value) return "Sans échéance";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function isOverdue(value: string | null, completedAt: string | null) {
  return Boolean(value && !completedAt && new Date(value).getTime() < Date.now());
}

function TodayPage() {
  const fetchTasks = useServerFn(listTodayProspectTasks);
  const completeTask = useServerFn(completeProspectTask);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["today-prospect-tasks"],
    queryFn: () => fetchTasks(),
  });

  const mutation = useMutation({
    mutationFn: (id: string) => completeTask({ data: { id } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["today-prospect-tasks"] });
      void queryClient.invalidateQueries({ queryKey: ["prospect-crm"] });
      toast.success("Tâche terminée.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (isLoading) return <Skeleton className="h-96 rounded-xl" />;

  const tasks = data ?? [];
  const open = tasks.filter((task) => !task.completed_at);
  const overdue = open.filter((task) => isOverdue(task.due_at, task.completed_at));
  const completed = tasks.filter((task) => task.completed_at);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl text-foreground">À faire aujourd'hui</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tâches échues ou à traiter aujourd'hui. Les tâches terminées restent visibles dans l'historique du prospect.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">À traiter</p><p className="mt-1 text-2xl font-600">{open.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">En retard</p><p className="mt-1 text-2xl font-600">{overdue.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Terminées aujourd'hui / récentes</p><p className="mt-1 text-2xl font-600">{completed.length}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Tâches commerciales</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {tasks.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Aucune tâche échue ou planifiée aujourd'hui.
            </p>
          ) : tasks.map((task) => {
            const prospect = task.prospect;
            const late = isOverdue(task.due_at, task.completed_at);
            return (
              <div key={task.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3">
                <button
                  type="button"
                  aria-label={task.completed_at ? "Tâche terminée" : "Terminer la tâche"}
                  disabled={Boolean(task.completed_at) || mutation.isPending}
                  onClick={() => mutation.mutate(task.id)}
                  className="text-muted-foreground disabled:opacity-50"
                >
                  <CheckCircle2 className="size-5" />
                </button>
                <div className="min-w-0 flex-1">
                  <p className={task.completed_at ? "text-sm line-through text-muted-foreground" : "text-sm"}>
                    {task.title}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {prospect?.company_name ?? "Prospect supprimé"}{prospect?.city ? " · " + prospect.city : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={late ? "destructive" : "outline"}>
                    <Clock3 className="mr-1 size-3" />
                    {formatDue(task.due_at)}
                  </Badge>
                  <Badge variant="secondary">{labelOf(TASK_TYPES, task.task_type)}</Badge>
                  <Badge variant="outline">{labelOf(TASK_PRIORITIES, task.priority)}</Badge>
                </div>
                {!task.completed_at && prospect?.do_not_contact ? (
                  <p className="basis-full text-xs text-muted-foreground">
                    Prospect marqué « ne pas contacter » : ne pas lancer d'email de prospection sans réactivation.
                  </p>
                ) : null}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
