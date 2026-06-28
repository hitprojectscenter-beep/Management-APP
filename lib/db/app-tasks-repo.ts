/**
 * Data-access for `app_tasks` — the user-created tasks (add-task form + intake
 * extraction) that now live in PostgreSQL instead of the browser's
 * localStorage. Server-only: every function here runs behind an API route that
 * has already resolved the session, so the `viewer` passed in is trusted.
 *
 * Access model (enforced HERE, by the repo — never trust the client):
 *   • admin                     → sees every app task.
 *   • manager                   → sees own tasks + every task created by or
 *                                 assigned to anyone in their reporting subtree
 *                                 (transitive managerId chain).
 *   • member / viewer / guest   → sees only tasks they created or are assigned.
 *
 * Rows convert to/from the `MockTask` shape the UI already speaks, so nothing
 * downstream of the API has to change.
 */

import "server-only";
import { eq, or, inArray, desc, arrayOverlaps } from "drizzle-orm";
import { getDb } from "./client";
import { appTasks, users, type AppTask, type NewAppTask } from "./schema";
import type { TaskStatus, TaskPriority } from "./types";
import type { MockTask } from "./mock-data";

/** The UI reads a couple of extra fields off tasks via a cast — keep them. */
export type AppMockTask = MockTask & {
  sourceFile?: { name: string; size?: number; type?: string; blobUrl?: string; source?: string } | null;
  creatorId?: string | null;
};

export interface Viewer {
  id: string;
  role: "admin" | "manager" | "member" | "viewer" | "guest";
}

// ---- converters -------------------------------------------------------------

const STATUSES = new Set<TaskStatus>([
  // legacy
  "not_started", "in_progress", "review", "done", "blocked", "cancelled",
  // workflow
  "new", "frozen", "waiting", "handled", "rejected", "completed",
]);
const PRIORITIES = new Set<TaskPriority>(["low", "medium", "high", "critical"]);

function asArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
}
function intOr0(v: unknown): number {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? n : 0;
}

/** DB row → MockTask the UI already renders. */
export function rowToMockTask(r: AppTask): AppMockTask {
  return {
    id: r.id,
    wbsNodeId: r.wbsNodeId ?? "",
    parentTaskId: r.parentTaskId ?? null,
    title: r.title,
    titleEn: r.titleEn ?? undefined,
    description: r.description ?? undefined,
    status: (STATUSES.has(r.status as TaskStatus) ? r.status : "new") as TaskStatus,
    priority: (PRIORITIES.has(r.priority as TaskPriority) ? r.priority : "medium") as TaskPriority,
    assigneeId: r.assigneeId ?? null,
    team: Array.isArray(r.team) ? r.team : undefined,
    plannedStart: r.plannedStart ?? "",
    plannedEnd: r.plannedEnd ?? "",
    actualStart: r.actualStart ?? null,
    actualEnd: r.actualEnd ?? null,
    estimateHours: r.estimateHours ?? 0,
    actualHours: r.actualHours ?? 0,
    progressPercent: r.progressPercent ?? 0,
    tags: Array.isArray(r.tags) ? r.tags : [],
    dependencies: Array.isArray(r.dependencies) ? r.dependencies : [],
    resources: Array.isArray(r.resources) ? r.resources : [],
    attachments: Array.isArray(r.attachments) ? r.attachments : [],
    sourceFile: r.sourceFile ?? undefined,
    memberRoles: r.memberRoles ?? undefined,
    creatorId: r.creatorId ?? null,
  };
}

/** Sanitize the per-member role map: keep only entries with a string type. */
function sanitizeMemberRoles(v: unknown): Record<string, { type: string; detail?: string }> {
  const out: Record<string, { type: string; detail?: string }> = {};
  if (v && typeof v === "object") {
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (val && typeof val === "object" && typeof (val as { type?: unknown }).type === "string") {
        const t = (val as { type: string }).type;
        const d = (val as { detail?: unknown }).detail;
        out[k] = { type: t, ...(typeof d === "string" && d.trim() ? { detail: d.trim().slice(0, 300) } : {}) };
      }
    }
  }
  return out;
}

/** Incoming client task → DB insert row. Sanitizes types; never trusts shape. */
function toRow(t: Partial<AppMockTask> & { id: string; title: string }, creatorId: string | null): NewAppTask {
  const status = STATUSES.has(t.status as TaskStatus) ? (t.status as TaskStatus) : "new";
  const priority = PRIORITIES.has(t.priority as TaskPriority) ? (t.priority as TaskPriority) : "medium";
  return {
    id: t.id,
    title: String(t.title).slice(0, 500),
    titleEn: t.titleEn ?? null,
    description: t.description ?? null,
    status,
    priority,
    wbsNodeId: t.wbsNodeId ?? "",
    parentTaskId: t.parentTaskId ?? null,
    creatorId,
    assigneeId: t.assigneeId ?? null,
    team: Array.isArray(t.team) && t.team.length ? t.team.filter((x) => typeof x === "string") : t.assigneeId ? [t.assigneeId] : [],
    plannedStart: t.plannedStart ?? "",
    plannedEnd: t.plannedEnd ?? "",
    actualStart: t.actualStart ?? null,
    actualEnd: t.actualEnd ?? null,
    estimateHours: intOr0(t.estimateHours),
    actualHours: intOr0(t.actualHours),
    progressPercent: Math.max(0, Math.min(100, intOr0(t.progressPercent))),
    tags: asArray(t.tags),
    dependencies: asArray(t.dependencies),
    resources: asArray(t.resources),
    attachments: Array.isArray(t.attachments) ? t.attachments : [],
    sourceFile: t.sourceFile ?? null,
    memberRoles: sanitizeMemberRoles(t.memberRoles),
    updatedAt: new Date(),
  };
}

// ---- hierarchy --------------------------------------------------------------

/** [viewerId, ...everyone in their reporting subtree]. Small team → one scan. */
async function visibleUserIds(viewerId: string): Promise<string[]> {
  const all = await getDb().select({ id: users.id, managerId: users.managerId }).from(users);
  const childrenOf = new Map<string, string[]>();
  for (const u of all) {
    if (u.managerId) {
      const list = childrenOf.get(u.managerId) ?? [];
      list.push(u.id);
      childrenOf.set(u.managerId, list);
    }
  }
  const result = new Set<string>([viewerId]);
  const queue = [viewerId];
  while (queue.length) {
    const cur = queue.shift() as string;
    for (const child of childrenOf.get(cur) ?? []) {
      if (!result.has(child)) {
        result.add(child);
        queue.push(child);
      }
    }
  }
  return [...result];
}

// ---- queries ----------------------------------------------------------------

/** All app tasks the viewer is allowed to see, newest first. */
export async function listAppTasksForViewer(viewer: Viewer): Promise<AppMockTask[]> {
  const db = getDb();
  if (viewer.role === "admin") {
    const rows = await db.select().from(appTasks).orderBy(desc(appTasks.createdAt));
    return rows.map(rowToMockTask);
  }
  const ids = viewer.role === "manager" ? await visibleUserIds(viewer.id) : [viewer.id];
  const rows = await db
    .select()
    .from(appTasks)
    .where(
      or(
        inArray(appTasks.creatorId, ids),
        inArray(appTasks.assigneeId, ids),
        arrayOverlaps(appTasks.team, ids),
      ),
    )
    .orderBy(desc(appTasks.createdAt));
  return rows.map(rowToMockTask);
}

/** A single app task by id (no access filtering — caller checks visibility). */
export async function getAppTaskById(id: string): Promise<AppMockTask | null> {
  const rows = await getDb().select().from(appTasks).where(eq(appTasks.id, id)).limit(1);
  return rows[0] ? rowToMockTask(rows[0]) : null;
}

/** True if the viewer may see/edit this task (own/assigned, manager-subtree, or admin). */
export async function canViewerAccess(viewer: Viewer, task: AppMockTask): Promise<boolean> {
  if (viewer.role === "admin") return true;
  const ids = viewer.role === "manager" ? await visibleUserIds(viewer.id) : [viewer.id];
  const set = new Set(ids);
  return (
    (!!task.creatorId && set.has(task.creatorId)) ||
    (!!task.assigneeId && set.has(task.assigneeId)) ||
    (Array.isArray(task.team) && task.team.some((m) => set.has(m)))
  );
}

/** Insert or update one task. On update keeps the original creator + createdAt. */
export async function upsertAppTask(
  task: Partial<AppMockTask> & { id: string; title: string },
  creatorId: string | null,
): Promise<AppMockTask> {
  const row = toRow(task, creatorId);
  // Don't let an update reassign ownership or reset createdAt.
  const { id: _id, creatorId: _c, ...mutable } = row;
  void _id;
  void _c;
  const [saved] = await getDb()
    .insert(appTasks)
    .values(row)
    .onConflictDoUpdate({ target: appTasks.id, set: mutable })
    .returning();
  return rowToMockTask(saved);
}

/** Bulk upsert (intake extraction creates many at once). Best-effort per row. */
export async function upsertAppTasks(
  tasks: (Partial<AppMockTask> & { id: string; title: string })[],
  creatorId: string | null,
): Promise<number> {
  let n = 0;
  for (const t of tasks) {
    try {
      await upsertAppTask(t, creatorId);
      n++;
    } catch {
      /* skip the bad row, keep the rest */
    }
  }
  return n;
}

/** Delete one task by id. Caller must have verified access first. */
export async function deleteAppTask(id: string): Promise<void> {
  await getDb().delete(appTasks).where(eq(appTasks.id, id));
}
