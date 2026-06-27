/**
 * Data-access for in-app notifications (the topbar bell). Server-only; the
 * recipient (userId) is always the caller's own session for reads/marks.
 */

import "server-only";
import { eq, and, desc, inArray, count } from "drizzle-orm";
import { getDb } from "./client";
import { notifications } from "./schema";

export interface NewNotification {
  userId: string;
  type: string;
  taskId?: string | null;
  title: string;
  body?: string | null;
  actorId?: string | null;
}

/** Bulk-insert notifications (one row per recipient). Best-effort. */
export async function createNotifications(rows: NewNotification[]): Promise<void> {
  if (rows.length === 0) return;
  await getDb().insert(notifications).values(
    rows.map((r) => ({
      userId: r.userId,
      type: r.type,
      taskId: r.taskId ?? null,
      title: r.title.slice(0, 300),
      body: r.body ? r.body.slice(0, 1000) : null,
      actorId: r.actorId ?? null,
    })),
  );
}

/** Recent notifications for a user, newest first. */
export async function listForUser(userId: string, limit = 30) {
  return getDb()
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function unreadCount(userId: string): Promise<number> {
  const rows = await getDb()
    .select({ n: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
  return rows[0]?.n ?? 0;
}

/** Mark specific notifications read (scoped to the user), or all if ids omitted. */
export async function markRead(userId: string, ids?: string[]): Promise<void> {
  const where =
    ids && ids.length
      ? and(eq(notifications.userId, userId), inArray(notifications.id, ids))
      : eq(notifications.userId, userId);
  await getDb().update(notifications).set({ read: true }).where(where);
}
