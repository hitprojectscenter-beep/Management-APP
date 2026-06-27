/**
 * Data-access for the per-task internal chat + delivery/acknowledgment
 * receipts. Server-only; access is enforced here against the task's participant
 * set (creator + assignee + team).
 *
 * Keyed by the task's STRING id, so it works for created (`app_tasks`) tasks
 * and — as shared demo content — seeded mock tasks (which aren't in app_tasks).
 */

import "server-only";
import { eq, asc } from "drizzle-orm";
import { getDb } from "./client";
import { appTasks, taskMessages, taskReceipts, users } from "./schema";

export interface ThreadViewer {
  id: string;
  role: "admin" | "manager" | "member" | "viewer" | "guest";
}

export interface TaskParticipants {
  creatorId: string | null;
  ids: string[]; // creator + assignee + team, de-duped
  isCreatedTask: boolean; // false → seeded/unknown task (shared demo content)
}

/** [viewerId, ...reporting subtree]. */
async function subtreeIds(viewerId: string): Promise<string[]> {
  const all = await getDb().select({ id: users.id, managerId: users.managerId }).from(users);
  const childrenOf = new Map<string, string[]>();
  for (const u of all) {
    if (u.managerId) {
      const l = childrenOf.get(u.managerId) ?? [];
      l.push(u.id);
      childrenOf.set(u.managerId, l);
    }
  }
  const res = new Set<string>([viewerId]);
  const q = [viewerId];
  while (q.length) {
    const c = q.shift() as string;
    for (const ch of childrenOf.get(c) ?? []) if (!res.has(ch)) { res.add(ch); q.push(ch); }
  }
  return [...res];
}

/** The participant set for a task (from app_tasks). isCreatedTask=false if the
 *  id isn't a created task (a seeded one). */
export async function getTaskParticipants(taskId: string): Promise<TaskParticipants> {
  const rows = await getDb()
    .select({ creatorId: appTasks.creatorId, assigneeId: appTasks.assigneeId, team: appTasks.team })
    .from(appTasks)
    .where(eq(appTasks.id, taskId))
    .limit(1);
  const r = rows[0];
  if (!r) return { creatorId: null, ids: [], isCreatedTask: false };
  const set = new Set<string>();
  if (r.creatorId) set.add(r.creatorId);
  if (r.assigneeId) set.add(r.assigneeId);
  for (const m of r.team ?? []) if (m) set.add(m);
  return { creatorId: r.creatorId ?? null, ids: [...set], isCreatedTask: true };
}

/** Whether the viewer may read/post in a task's thread + the participant set. */
export async function canAccessThread(
  viewer: ThreadViewer,
  taskId: string,
): Promise<{ ok: boolean; participants: TaskParticipants }> {
  const participants = await getTaskParticipants(taskId);
  if (viewer.role === "admin") return { ok: true, participants };
  // Seeded/unknown task → shared demo content; any signed-in user may chat.
  if (!participants.isCreatedTask) return { ok: true, participants };
  if (participants.ids.includes(viewer.id)) return { ok: true, participants };
  if (viewer.role === "manager") {
    const sub = new Set(await subtreeIds(viewer.id));
    if (participants.ids.some((id) => sub.has(id))) return { ok: true, participants };
  }
  return { ok: false, participants };
}

export async function listMessages(taskId: string) {
  return getDb()
    .select({ id: taskMessages.id, authorId: taskMessages.authorId, body: taskMessages.body, createdAt: taskMessages.createdAt })
    .from(taskMessages)
    .where(eq(taskMessages.taskId, taskId))
    .orderBy(asc(taskMessages.createdAt));
}

export async function postMessage(taskId: string, authorId: string, body: string) {
  const clean = body.trim().slice(0, 4000);
  const [m] = await getDb().insert(taskMessages).values({ taskId, authorId, body: clean }).returning();
  return m;
}

export async function listReceipts(taskId: string) {
  return getDb()
    .select({ userId: taskReceipts.userId, seenAt: taskReceipts.seenAt, acknowledgedAt: taskReceipts.acknowledgedAt })
    .from(taskReceipts)
    .where(eq(taskReceipts.taskId, taskId));
}

/** Record that a user opened the task (first time only — keeps original seenAt). */
export async function recordSeen(taskId: string, userId: string): Promise<void> {
  await getDb()
    .insert(taskReceipts)
    .values({ taskId, userId })
    .onConflictDoNothing({ target: [taskReceipts.taskId, taskReceipts.userId] });
}

/** Record an explicit acknowledgment ("I received this task"). */
export async function acknowledge(taskId: string, userId: string): Promise<void> {
  const now = new Date();
  await getDb()
    .insert(taskReceipts)
    .values({ taskId, userId, acknowledgedAt: now })
    .onConflictDoUpdate({ target: [taskReceipts.taskId, taskReceipts.userId], set: { acknowledgedAt: now } });
}
