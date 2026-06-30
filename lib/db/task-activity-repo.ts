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
import { appTasks, taskHistory, taskMemberStatus, users, type TaskHistoryRow, type TaskMemberStatusRow } from "./schema";
import { daysBetween, formatDateDDMMYYYY } from "@/lib/utils";
import { dispatchToUsers } from "@/lib/notify/dispatch";
import { STATUS_LABELS_ML } from "@/lib/utils/locale-text";

export type HistoryKind =
  | "created"
  | "status_change"
  | "member_done"
  | "member_undone"
  | "extension_request"
  | "extension_approved"
  | "extension_rejected"
  | "roles_updated"
  // Supervisor (ממונה) actions on a subordinate's task:
  | "supervisor_note"
  | "supervisor_reject"
  | "supervisor_cancel"
  | "supervisor_extend"
  // The assignee acknowledged a supervisor decision (read-receipt):
  | "decision_acknowledged"
  // Auto-escalation: an overdue/stuck task was raised up the management chain:
  | "escalated"
  // A rejected/cancelled task was reopened (back into the workflow):
  | "reopened"
  // A supervisor reassigned (delegated) the task to a different subordinate:
  | "reassigned";

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
  memberRoles: Record<string, { type: string; detail?: string }> | null;
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
      memberRoles: appTasks.memberRoles,
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
  assigneeId: string | null; // current responsible user (for reassignment UI)
  team: string[];
  completionMembers: string[]; // who must sign off
  memberRoles: Record<string, { type: string; detail?: string }>; // who does what
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
    assigneeId: core.assigneeId,
    team: (core.team ?? []).filter(Boolean),
    completionMembers: completionSet(core.team, core.assigneeId),
    memberRoles: core.memberRoles ?? {},
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

/** Replace the task's per-member responsibility map (who does what), logging
 *  the change. `roles` must already be sanitized by the caller. */
export async function updateMemberRoles(
  taskId: string,
  actorId: string,
  roles: Record<string, { type: string; detail?: string }>,
): Promise<{ history: TaskHistoryRow }> {
  const core = await getTaskCore(taskId);
  if (!core) throw new Error("task_not_found");
  await getDb()
    .update(appTasks)
    .set({ memberRoles: roles, updatedAt: new Date() })
    .where(eq(appTasks.id, taskId));
  const history = await log(taskId, actorId, "roles_updated", "עודכנו תפקידי חברי הצוות במשימה.", {});
  return { history };
}

// ---- supervisor (ממונה) actions on a subordinate's task -------------------

/** All user ids in `viewerId`'s reporting subtree (excludes the viewer). */
export async function reportingSubtree(viewerId: string): Promise<Set<string>> {
  const all = await getDb().select({ id: users.id, managerId: users.managerId }).from(users);
  const childrenOf = new Map<string, string[]>();
  for (const u of all) if (u.managerId) { const a = childrenOf.get(u.managerId) ?? []; a.push(u.id); childrenOf.set(u.managerId, a); }
  const out = new Set<string>();
  const q = [...(childrenOf.get(viewerId) ?? [])];
  while (q.length) { const id = q.shift() as string; if (out.has(id)) continue; out.add(id); for (const ch of childrenOf.get(id) ?? []) q.push(ch); }
  return out;
}

/** The actor's managers, from their direct manager UP TO + INCLUDING the
 *  division head (סמנכ"ל). Excludes the CEO (an admin who sees everything). */
export async function supervisorChainUpToVP(actorId: string): Promise<string[]> {
  const all = await getDb().select({ id: users.id, managerId: users.managerId }).from(users);
  const byId = new Map(all.map((u) => [u.id, u]));
  const ceoId = all.find((u) => !u.managerId)?.id;
  const chain: string[] = [];
  const seen = new Set<string>();
  let cur = byId.get(actorId);
  while (cur?.managerId) {
    const mgr = byId.get(cur.managerId);
    if (!mgr || !mgr.managerId) break;       // reached the CEO — stop (don't include)
    if (seen.has(mgr.id)) break;
    seen.add(mgr.id);
    chain.push(mgr.id);
    if (mgr.managerId === ceoId) break;       // mgr is a division head (VP) — included, stop
    cur = mgr;
  }
  return chain;
}

/** True if `viewerId` supervises this task — the assignee (or a team member)
 *  is in the viewer's reporting subtree (and isn't the viewer). */
export async function isSupervisorOfTask(viewerId: string, taskId: string): Promise<boolean> {
  const core = await getTaskCore(taskId);
  if (!core) return false;
  const targets = [core.assigneeId, ...((core.team ?? []) as string[])].filter((x): x is string => !!x && x !== viewerId);
  if (!targets.length) return false;
  const subtree = await reportingSubtree(viewerId);
  return targets.some((t) => subtree.has(t));
}

export type SupervisorAction = "note" | "reject" | "cancel" | "extend";

/** A supervisor annotates / rejects / cancels / extends a subordinate's task.
 *  (Cannot delete.) Each action carries a mandatory reason and is logged. */
export async function supervisorAction(
  taskId: string,
  actorId: string,
  action: SupervisorAction,
  note: string,
  newDueDate?: string,
  reasonCode?: string,
): Promise<{ status?: string; plannedEnd?: string; history: TaskHistoryRow }> {
  const core = await getTaskCore(taskId);
  if (!core) throw new Error("task_not_found");
  const db = getDb();
  const rc = reasonCode ? { reasonCode } : {};
  if (action === "reject" || action === "cancel") {
    const to = action === "reject" ? "rejected" : "cancelled";
    await db.update(appTasks).set({ status: to, updatedAt: new Date() }).where(eq(appTasks.id, taskId));
    const history = await log(taskId, actorId, action === "reject" ? "supervisor_reject" : "supervisor_cancel", note, {
      fromStatus: core.status, toStatus: to, meta: rc,
    });
    return { status: to, history };
  }
  if (action === "extend") {
    const nd = String(newDueDate || "");
    await db.update(appTasks).set({ plannedEnd: nd, updatedAt: new Date() }).where(eq(appTasks.id, taskId));
    const history = await log(taskId, actorId, "supervisor_extend", note, { meta: { newDueDate: nd, prevDueDate: core.plannedEnd, ...rc } });
    return { plannedEnd: nd, history };
  }
  const history = await log(taskId, actorId, "supervisor_note", note, { meta: rc });
  return { history };
}

/** The assignee acknowledges a supervisor decision (read-receipt). Returns the
 *  decision's original actor + kind so the API can notify them back. */
export async function acknowledgeDecision(
  taskId: string,
  actorId: string,
  historyId: string,
): Promise<{ history: TaskHistoryRow; refActorId: string | null; refKind: string | null }> {
  const rows = await getDb()
    .select()
    .from(taskHistory)
    .where(and(eq(taskHistory.id, historyId), eq(taskHistory.taskId, taskId)))
    .limit(1);
  const ref = rows[0] ?? null;
  const history = await log(taskId, actorId, "decision_acknowledged", "אישור קבלת ההחלטה", {
    meta: { refId: historyId, refKind: ref?.kind ?? null },
  });
  return { history, refActorId: ref?.actorId ?? null, refKind: ref?.kind ?? null };
}

/**
 * Reopen a REJECTED/CANCELLED task back into the workflow (instead of creating a
 * new one and losing the history). Restores the status the task held just before
 * it was closed (fallback "in_progress"), with a mandatory reason. Logged +
 * notified. Allowed for the creator / a supervisor of the assignee / an admin
 * (enforced in the API layer).
 */
export async function reopenTask(
  taskId: string,
  actorId: string,
  note: string,
): Promise<{ status: string; history: TaskHistoryRow }> {
  const core = await getTaskCore(taskId);
  if (!core) throw new Error("task_not_found");
  if (core.status !== "rejected" && core.status !== "cancelled") throw new Error("not_closed");

  // Restore the status the task had just before it was closed.
  const hist = await getDb()
    .select({ fromStatus: taskHistory.fromStatus, toStatus: taskHistory.toStatus })
    .from(taskHistory)
    .where(eq(taskHistory.taskId, taskId))
    .orderBy(asc(taskHistory.createdAt));
  let restore = "in_progress";
  for (let i = hist.length - 1; i >= 0; i--) {
    const h = hist[i];
    if ((h.toStatus === "rejected" || h.toStatus === "cancelled") && h.fromStatus) {
      restore = h.fromStatus;
      break;
    }
  }
  if (!SETTABLE_STATUS_SET.has(restore)) restore = "in_progress";

  await getDb().update(appTasks).set({ status: restore, updatedAt: new Date() }).where(eq(appTasks.id, taskId));
  const history = await log(taskId, actorId, "reopened", note, { fromStatus: core.status, toStatus: restore });
  return { status: restore, history };
}

/**
 * Reassign (delegate) a task from its current assignee to a DIFFERENT user, with
 * a mandatory reason. The new user becomes the responsible assignee (team[0])
 * and a participant; the previous assignee is dropped from the active team. The
 * caller (a supervisor of the current assignee, or an admin) and the target's
 * eligibility are enforced in the API layer. Logged + notified.
 */
export async function reassignTask(
  taskId: string,
  actorId: string,
  newAssigneeId: string,
  note: string,
): Promise<{ assigneeId: string; from: string | null; history: TaskHistoryRow }> {
  const core = await getTaskCore(taskId);
  if (!core) throw new Error("task_not_found");
  const from = core.assigneeId;
  if (from === newAssigneeId) throw new Error("same_assignee");
  const team = (core.team ?? []).filter(Boolean);
  const newTeam = [newAssigneeId, ...team.filter((id) => id !== from && id !== newAssigneeId)];
  await getDb()
    .update(appTasks)
    .set({ assigneeId: newAssigneeId, team: newTeam, updatedAt: new Date() })
    .where(eq(appTasks.id, taskId));
  const history = await log(taskId, actorId, "reassigned", note, { meta: { from, to: newAssigneeId } });
  return { assigneeId: newAssigneeId, from, history };
}

// ---- Auto-escalation (#4) ---------------------------------------------------

/** Active statuses that can be escalated (not done/handled/completed/cancelled/rejected). */
const ESCALATABLE = new Set<string>(["new", "in_progress", "frozen", "waiting"]);
const ESCALATE_OVERDUE_DAYS = 3; // overdue by ≥ this many days
const ESCALATE_STUCK_DAYS = 7; // frozen/waiting with no movement ≥ this many days
const ESCALATE_COOLDOWN_DAYS = 7; // don't re-escalate the same task within this window

export interface EscalationRecord {
  taskId: string;
  title: string;
  assigneeId: string;
  reason: "overdue" | "stuck";
  days: number;
  recipients: string[];
}

/**
 * Scan all created tasks and escalate the ones that are OVERDUE (≥3 days past
 * the due date) or STUCK (frozen/waiting with no movement ≥7 days) UP the
 * assignee's management chain to the division head (סמנכ"ל) + the creator.
 * Idempotent-ish: a task isn't re-escalated within a 7-day cooldown, so the
 * daily cron won't spam. Returns a summary. Called by the daily Vercel Cron
 * (or manually by an admin) at /api/cron/escalate.
 */
export async function runEscalations(now: Date = new Date()): Promise<{ scanned: number; escalated: EscalationRecord[] }> {
  const db = getDb();
  const today = now.toISOString().slice(0, 10);

  // One pass over users → name map + a local "chain up to VP" (avoids N+1).
  const allUsers = await db.select({ id: users.id, name: users.name, managerId: users.managerId }).from(users);
  const byId = new Map(allUsers.map((u) => [u.id, u]));
  const ceoId = allUsers.find((u) => !u.managerId)?.id;
  const chainUpToVP = (actorId: string): string[] => {
    const chain: string[] = [];
    const seen = new Set<string>();
    let cur = byId.get(actorId);
    while (cur?.managerId) {
      const mgr = byId.get(cur.managerId);
      if (!mgr || !mgr.managerId) break; // reached the CEO — stop (don't include)
      if (seen.has(mgr.id)) break;
      seen.add(mgr.id);
      chain.push(mgr.id);
      if (mgr.managerId === ceoId) break; // mgr is a division head (VP) — included, stop
      cur = mgr;
    }
    return chain;
  };

  const tasks = await db
    .select({
      id: appTasks.id,
      title: appTasks.title,
      status: appTasks.status,
      assigneeId: appTasks.assigneeId,
      creatorId: appTasks.creatorId,
      plannedEnd: appTasks.plannedEnd,
      updatedAt: appTasks.updatedAt,
    })
    .from(appTasks);

  const escalated: EscalationRecord[] = [];
  for (const t of tasks) {
    if (!ESCALATABLE.has(t.status)) continue;
    const assignee = t.assigneeId;
    if (!assignee) continue;

    let reason: "overdue" | "stuck" | null = null;
    let days = 0;
    if (t.plannedEnd && t.plannedEnd < today) {
      const d = daysBetween(t.plannedEnd, today);
      if (d >= ESCALATE_OVERDUE_DAYS) {
        reason = "overdue";
        days = d;
      }
    }
    if (!reason && (t.status === "frozen" || t.status === "waiting")) {
      const idle = daysBetween(t.updatedAt, now);
      if (idle >= ESCALATE_STUCK_DAYS) {
        reason = "stuck";
        days = idle;
      }
    }
    if (!reason) continue;

    // Cooldown — skip if this task was escalated within the window.
    const prior = await db
      .select({ createdAt: taskHistory.createdAt })
      .from(taskHistory)
      .where(and(eq(taskHistory.taskId, t.id), eq(taskHistory.kind, "escalated")));
    const lastEsc = prior.map((r) => r.createdAt).sort((a, b) => a.getTime() - b.getTime()).pop();
    if (lastEsc && daysBetween(lastEsc, now) < ESCALATE_COOLDOWN_DAYS) continue;

    // Recipients: the assignee's chain up to the VP + the creator, minus the assignee.
    const recipients = [...new Set([...chainUpToVP(assignee), t.creatorId].filter((x): x is string => !!x))].filter((uid) => uid !== assignee);
    if (recipients.length === 0) continue;

    const reasonText =
      reason === "overdue"
        ? `המשימה באיחור ${days} ימים מתאריך היעד`
        : `המשימה ${t.status === "frozen" ? "מוקפאת" : "ממתינה"} ${days} ימים ללא התקדמות`;
    await log(t.id, "system", "escalated", reasonText, { meta: { reason, days, escalatedTo: recipients } });

    const assigneeName = byId.get(assignee)?.name || "";
    await dispatchToUsers({
      recipientIds: recipients,
      type: "task_escalated",
      taskId: t.id,
      title: `⚠️ הסלמה: ${t.title}`,
      body: `${reasonText}. אחראי/ת: ${assigneeName}. נדרשת התערבות ניהולית.`,
    });

    escalated.push({ taskId: t.id, title: t.title, assigneeId: assignee, reason, days, recipients });
  }

  return { scanned: tasks.length, escalated };
}

// ---- Weekly digest (#9) -----------------------------------------------------

export interface DigestRecord {
  managerId: string;
  atRisk: number;
}

/**
 * Weekly per-manager digest: for every user who has subordinates, collect the
 * AT-RISK tasks in their reporting subtree — overdue, due within 7 days, or
 * frozen/waiting — and send them one summary (in-app bell + email). Managers
 * with nothing at risk get nothing. Returns who was notified. Called by the
 * weekly Vercel Cron (or manually by an admin) at /api/cron/digest.
 */
export async function runWeeklyDigest(now: Date = new Date()): Promise<{ managers: number; sent: DigestRecord[] }> {
  const db = getDb();
  const today = now.toISOString().slice(0, 10);

  const allUsers = await db.select({ id: users.id, name: users.name, managerId: users.managerId }).from(users);
  const nameById = new Map(allUsers.map((u) => [u.id, u.name]));
  const childrenOf = new Map<string, string[]>();
  for (const u of allUsers) {
    if (u.managerId) {
      const arr = childrenOf.get(u.managerId);
      if (arr) arr.push(u.id);
      else childrenOf.set(u.managerId, [u.id]);
    }
  }
  const descendants = (root: string): Set<string> => {
    const out = new Set<string>();
    const q = [...(childrenOf.get(root) ?? [])];
    while (q.length) {
      const id = q.shift() as string;
      if (out.has(id)) continue;
      out.add(id);
      for (const ch of childrenOf.get(id) ?? []) q.push(ch);
    }
    return out;
  };

  const tasks = await db
    .select({
      id: appTasks.id,
      title: appTasks.title,
      status: appTasks.status,
      assigneeId: appTasks.assigneeId,
      plannedEnd: appTasks.plannedEnd,
    })
    .from(appTasks);

  const managers = allUsers.filter((u) => childrenOf.has(u.id));
  const sent: DigestRecord[] = [];
  for (const m of managers) {
    const subtree = descendants(m.id);
    if (subtree.size === 0) continue;
    const atRisk = tasks.filter((t) => {
      if (!t.assigneeId || !subtree.has(t.assigneeId)) return false;
      if (!ESCALATABLE.has(t.status)) return false; // active only
      const overdue = !!t.plannedEnd && t.plannedEnd < today;
      const dueSoon = !!t.plannedEnd && t.plannedEnd >= today && daysBetween(today, t.plannedEnd) <= 7;
      const stuck = t.status === "frozen" || t.status === "waiting";
      return overdue || dueSoon || stuck;
    });
    if (atRisk.length === 0) continue;

    const lines = atRisk.slice(0, 25).map((t) => {
      const st = STATUS_LABELS_ML[t.status]?.he || t.status;
      const due = t.plannedEnd ? formatDateDDMMYYYY(t.plannedEnd) : "—";
      const flag = t.plannedEnd && t.plannedEnd < today ? " ⚠️ באיחור" : "";
      return `• ${t.title} — ${st} — יעד ${due} — ${nameById.get(t.assigneeId!) || ""}${flag}`;
    });
    const more = atRisk.length > 25 ? `\n…ועוד ${atRisk.length - 25} משימות` : "";
    await dispatchToUsers({
      recipientIds: [m.id],
      type: "weekly_digest",
      title: `תקציר שבועי — ${atRisk.length} משימות בסיכון בצוות שלך`,
      body: `שלום ${m.name},\nלהלן המשימות בסיכון (באיחור / יעד בשבוע הקרוב / מוקפאות) בתת-העץ הניהולי שלך:\n\n${lines.join("\n")}${more}`,
    });
    sent.push({ managerId: m.id, atRisk: atRisk.length });
  }

  return { managers: managers.length, sent };
}
