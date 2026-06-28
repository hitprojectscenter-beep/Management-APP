/**
 * Data-access for the task WORKFLOW: status changes, the per-task history
 * timeline, per-member completion sign-off (which auto-completes the task), and
 * due-date-extension requests + creator decisions.
 *
 * Server-only. Access is enforced by the API layer against the task's
 * participant set (reusing canAccessThread from task-thread-repo); every write
 * here carries the mandatory explanation note the spec requires.
 *
 * Keyed by the task's STRING id (works for created `app_tasks`).
 */

import "server-only";
import { eq, asc, and } from "drizzle-orm";
import { getDb } from "./client";
import { appTasks, taskHistory, taskMemberStatus, type TaskHistoryRow, type TaskMemberStatusRow } from "./schema";

export type HistoryKind =
  | "created"
  | "status_change"
  | "member_done"
  | "member_undone"
  | "extension_request"
  | "extension_approved"
  | "extension_rejected";

/** Valid workflow statuses a task may hold. */
export const WORKFLOW_STATUS_SET = new Set<string>([
  "new",
  "in_progress",
  "frozen",
  "waiting",
  "handled",
  "rejected",
  "completed",
]);

/** Statuses a user may set by hand — "completed" is auto-only. */
export const SETTABLE_STATUS_SET = new Set<string>([
  "new",
  "in_progress",
  "frozen",
  "waiting",
  "handled",
  "rejected",
]);

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

interface TaskCore {
  status: string;
  team: string[] | null;
  assigneeId: string | null;
  plannedEnd: string;
  creatorId: string | null;
  title: string;
}

/** Read just the workflow-relevant fields of a task, or null if it isn't a
 *  created task (seeded tasks have no workflow state). */
async function getTaskCore(taskId: string): Promise<TaskCore | null> {
  const rows = await getDb()
    .select({
      status: appTasks.status,
      team: appTasks.team,
      assigneeId: appTasks.assigneeId,
      plannedEnd: appTasks.plannedEnd,
      creatorId: appTasks.creatorId,
      title: appTasks.title,
    })
    .from(appTasks)
    .where(eq(appTasks.id, taskId))
    .limit(1);
  return rows[0] ?? null;
}

/** The members who must each sign off ("בוצע") for the task to auto-complete:
 *  the assigned team, or [assignee] when no team was set. */
function completionSet(team: string[] | null, assigneeId: string | null): string[] {
  const t = (team ?? []).filter(Boolean);
  if (t.length) return [...new Set(t)];
  return assigneeId ? [assigneeId] : [];
}

/** Insert one history row and return it. */
async function log(
  taskId: string,
  actorId: string,
  kind: HistoryKind,
  note: string,
  extra?: { fromStatus?: string | null; toStatus?: string | null; meta?: Record<string, unknown> },
): Promise<TaskHistoryRow> {
  const [row] = await getDb()
    .insert(taskHistory)
    .values({
      taskId,
      actorId,
      kind,
      note: note.trim().slice(0, 2000) || "—",
      fromStatus: extra?.fromStatus ?? null,
      toStatus: extra?.toStatus ?? null,
      meta: extra?.meta ?? {},
    })
    .returning();
  return row;
}

// ---- reads ------------------------------------------------------------------

export interface TaskActivity {
  status: string;
  plannedEnd: string;
  team: string[];
  completionMembers: string[]; // who must sign off
  history: TaskHistoryRow[];
  members: TaskMemberStatusRow[];
}

/** Everything the task screen needs to render the workflow + timeline. */
export async function getActivity(taskId: string): Promise<TaskActivity | null> {
  const core = await getTaskCore(taskId);
  if (!core) return null;
  const db = getDb();
  const [history, members] = await Promise.all([
    db.select().from(taskHistory).where(eq(taskHistory.taskId, taskId)).orderBy(asc(taskHistory.createdAt)),
    db.select().from(taskMemberStatus).where(eq(taskMemberStatus.taskId, taskId)),
  ]);
  return {
    status: core.status,
    plannedEnd: core.plannedEnd,
    team: (core.team ?? []).filter(Boolean),
    completionMembers: completionSet(core.team, core.assigneeId),
    history,
    members,
  };
}

// ---- mutations --------------------------------------------------------------

/** Change the task's overall status, logging the mandatory explanation. */
export async function changeStatus(
  taskId: string,
  actorId: string,
  toStatus: string,
  note: string,
): Promise<{ from: string; to: string; history: TaskHistoryRow }> {
  if (!SETTABLE_STATUS_SET.has(toStatus)) throw new Error("bad_status");
  const core = await getTaskCore(taskId);
  if (!core) throw new Error("task_not_found");
  const from = core.status;
  await getDb()
    .update(appTasks)
    .set({ status: toStatus, updatedAt: new Date() })
    .where(eq(appTasks.id, taskId));
  const history = await log(taskId, actorId, "status_change", note, { fromStatus: from, toStatus });
  return { from, to: toStatus, history };
}

/** A team member marks their own part done (or undoes it). When every member
 *  in the completion set is done, the task auto-completes (→ "completed"). */
export async function setMemberDone(
  taskId: string,
  userId: string,
  done: boolean,
  note: string,
): Promise<{ autoCompleted: boolean; doneCount: number; neededCount: number; history: TaskHistoryRow }> {
  const core = await getTaskCore(taskId);
  if (!core) throw new Error("task_not_found");
  const db = getDb();
  await db
    .insert(taskMemberStatus)
    .values({ taskId, userId, done, note: note.trim().slice(0, 2000) || null })
    .onConflictDoUpdate({
      target: [taskMemberStatus.taskId, taskMemberStatus.userId],
      set: { done, note: note.trim().slice(0, 2000) || null, updatedAt: new Date() },
    });
  const history = await log(taskId, userId, done ? "member_done" : "member_undone", note, {});

  const needed = completionSet(core.team, core.assigneeId);
  const rows = await db
    .select({ userId: taskMemberStatus.userId, done: taskMemberStatus.done })
    .from(taskMemberStatus)
    .where(eq(taskMemberStatus.taskId, taskId));
  const doneSet = new Set(rows.filter((r) => r.done).map((r) => r.userId));
  const doneCount = needed.filter((id) => doneSet.has(id)).length;

  let autoCompleted = false;
  if (done && needed.length > 0 && doneCount === needed.length && core.status !== "completed") {
    await db
      .update(appTasks)
      .set({ status: "completed", actualEnd: todayISO(), progressPercent: 100, updatedAt: new Date() })
      .where(eq(appTasks.id, taskId));
    await log(taskId, userId, "status_change", "כל חברי הצוות סימנו 'בוצע' — המשימה הושלמה אוטומטית.", {
      fromStatus: core.status,
      toStatus: "completed",
      meta: { auto: true },
    });
    autoCompleted = true;
  }
  return { autoCompleted, doneCount, neededCount: needed.length, history };
}

/** A member proposes a new due date with a mandatory explanation → logged as a
 *  request the creator can later approve/reject. */
export async function requestExtension(
  taskId: string,
  actorId: string,
  newDueDate: string,
  note: string,
): Promise<{ history: TaskHistoryRow; prevDueDate: string }> {
  const core = await getTaskCore(taskId);
  if (!core) throw new Error("task_not_found");
  const history = await log(taskId, actorId, "extension_request", note, {
    meta: { newDueDate, prevDueDate: core.plannedEnd, status: "pending" },
  });
  return { history, prevDueDate: core.plannedEnd };
}

/** The creator approves (applies the new due date) or rejects a request. */
export async function decideExtension(
  taskId: string,
  actorId: string,
  requestId: string,
  approve: boolean,
  note: string,
): Promise<{ applied: boolean; newDueDate: string; history: TaskHistoryRow }> {
  const db = getDb();
  const reqRows = await db
    .select()
    .from(taskHistory)
    .where(and(eq(taskHistory.id, requestId), eq(taskHistory.taskId, taskId)))
    .limit(1);
  const req = reqRows[0];
  if (!req || req.kind !== "extension_request") throw new Error("request_not_found");
  const newDueDate = String((req.meta as Record<string, unknown> | null)?.newDueDate ?? "");

  let applied = false;
  if (approve && newDueDate) {
    await db
      .update(appTasks)
      .set({ plannedEnd: newDueDate, updatedAt: new Date() })
      .where(eq(appTasks.id, taskId));
    applied = true;
  }
  const history = await log(taskId, actorId, approve ? "extension_approved" : "extension_rejected", note, {
    meta: { requestId, newDueDate },
  });
  return { applied, newDueDate, history };
}
