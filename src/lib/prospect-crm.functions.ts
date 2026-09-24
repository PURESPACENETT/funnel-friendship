import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logProspectActivity } from "./prospect-activity.server";
import { PROSPECT_STATUS_VALUES } from "./prospects-shared";

const statusEnum = z.enum(PROSPECT_STATUS_VALUES);
const opportunityEnum = z.enum(["vente_directe", "sous_traitance", "les_deux"]);
const taskTypeEnum = z.enum(["appeler", "email", "relance", "rdv", "visite", "devis", "autre"]);
const priorityEnum = z.enum(["basse", "normale", "haute", "urgente"]);

export const listProspectCrm = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: prospects, error: prospectsError }, { data: tasks, error: tasksError }, { data: activities, error: activitiesError }] =
      await Promise.all([
        context.supabase
          .from("prospects")
          .select("id,company_name,city,postal_code,email,phone,score,status,opportunity_type,loss_reason,website,outreach_sent_at,created_at,updated_at")
          .order("score", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(400),
        context.supabase
          .from("prospect_tasks")
          .select("id,prospect_id,title,task_type,due_at,priority,completed_at,created_at,updated_at")
          .order("completed_at", { ascending: true, nullsFirst: true })
          .order("due_at", { ascending: true, nullsFirst: false })
          .limit(500),
        context.supabase
          .from("prospect_activities")
          .select("id,prospect_id,activity_type,title,body,occurred_at,created_by,metadata,created_at")
          .order("occurred_at", { ascending: false })
          .limit(500),
      ]);

    if (prospectsError) throw new Error(prospectsError.message);
    if (tasksError) throw new Error(tasksError.message);
    if (activitiesError) throw new Error(activitiesError.message);

    return {
      prospects: prospects ?? [],
      tasks: tasks ?? [],
      activities: activities ?? [],
      kpis: buildKpis(prospects ?? []),
    };
  });

export const getProspectCrmDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const [{ data: prospect, error: prospectError }, { data: tasks, error: tasksError }, { data: activities, error: activitiesError }] =
      await Promise.all([
        context.supabase.from("prospects").select("*").eq("id", data.id).maybeSingle(),
        context.supabase
          .from("prospect_tasks")
          .select("*")
          .eq("prospect_id", data.id)
          .order("completed_at", { ascending: true, nullsFirst: true })
          .order("due_at", { ascending: true, nullsFirst: false }),
        context.supabase
          .from("prospect_activities")
          .select("*")
          .eq("prospect_id", data.id)
          .order("occurred_at", { ascending: false })
          .limit(100),
      ]);

    if (prospectError) throw new Error(prospectError.message);
    if (!prospect) throw new Error("Prospect introuvable.");
    if (tasksError) throw new Error(tasksError.message);
    if (activitiesError) throw new Error(activitiesError.message);

    return { prospect, tasks: tasks ?? [], activities: activities ?? [] };
  });

export const createProspectTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      prospectId: z.string().uuid(),
      title: z.string().trim().min(2).max(200),
      taskType: taskTypeEnum,
      dueAt: z.string().datetime().nullable().optional(),
      priority: priorityEnum,
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: task, error } = await context.supabase
      .from("prospect_tasks")
      .insert({
        prospect_id: data.prospectId,
        title: data.title,
        task_type: data.taskType,
        due_at: data.dueAt ?? null,
        priority: data.priority,
        created_by: context.userId,
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    await logProspectActivity(context.supabase, {
      prospectId: data.prospectId,
      type: "tache",
      title: "Tâche créée : " + data.title,
      metadata: { taskId: task.id, taskType: data.taskType, priority: data.priority },
      createdBy: context.userId,
      dedupeKey: "task-created-" + task.id,
    });

    return task;
  });

export const completeProspectTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: task, error: readError } = await context.supabase
      .from("prospect_tasks")
      .select("id,prospect_id,title,completed_at")
      .eq("id", data.id)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!task) throw new Error("Tâche introuvable.");

    if (!task.completed_at) {
      const completedAt = new Date().toISOString();
      const { error } = await context.supabase
        .from("prospect_tasks")
        .update({ completed_at: completedAt })
        .eq("id", data.id);
      if (error) throw new Error(error.message);

      await logProspectActivity(context.supabase, {
        prospectId: task.prospect_id,
        type: "tache",
        title: "Tâche terminée : " + task.title,
        metadata: { taskId: task.id, completedAt },
        createdBy: context.userId,
        dedupeKey: "task-completed-" + task.id,
      });
    }

    return { ok: true };
  });

export const deleteProspectTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("prospect_tasks").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addProspectNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      prospectId: z.string().uuid(),
      body: z.string().trim().min(2).max(4000),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await logProspectActivity(context.supabase, {
      prospectId: data.prospectId,
      type: "note",
      title: "Note commerciale",
      body: data.body,
      createdBy: context.userId,
    });
    return { ok: true };
  });

export const updateProspectOpportunityType = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), opportunityType: opportunityEnum.nullable() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("prospects")
      .update({ opportunity_type: data.opportunityType })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateProspectLossReason = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), lossReason: z.string().trim().max(500).nullable() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("prospects")
      .update({ loss_reason: data.lossReason || null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

function buildKpis(rows: Array<{ status: string }>) {
  const total = rows.length;
  const count = (statuses: string[]) => rows.filter((row) => statuses.includes(row.status)).length;
  const contacted = count([
    "contacte",
    "reponse_recue",
    "interesse",
    "rdv_a_prendre",
    "rdv_effectue",
    "visite_technique",
    "devis_envoye",
    "negociation",
    "converti",
  ]);

  return {
    total,
    aContacter: count(["a_contacter"]),
    contactes: contacted,
    reponses: count(["reponse_recue"]),
    interesses: count(["interesse"]),
    rdv: count(["rdv_a_prendre", "rdv_effectue"]),
    devis: count(["devis_envoye"]),
    gagnes: count(["converti"]),
    perdus: count(["perdu"]),
    contactRate: total === 0 ? null : Math.round((contacted / total) * 100),
  };
}

void statusEnum;
