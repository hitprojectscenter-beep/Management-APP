/**
 * Resource-availability + workload check for task assignment.
 *
 * When a task is being created/assigned, the creator wants to know
 * whether the people they're putting on it are already over-committed
 * in that time window. Two signals, both from data we already have:
 *
 *   1. Committed allocation (FTE %) — sum of the member's ftePercent
 *      across all project memberships (mockProjectMembers). This is
 *      their standing load. Over 100% means they're already
 *      over-allocated before this task is even added.
 *
 *   2. Calendar overlap — the member's other ACTIVE tasks whose
 *      [plannedStart, plannedEnd] window overlaps the new task's
 *      window. In this app the calendar is built from tasks (each task
 *      is a calendar item), so overlapping tasks ARE the schedule
 *      conflicts to surface.
 *
 * The dialog uses this to warn — never block — the creator, exactly as
 * requested: "אם העובד בעומס מעל 100% — יש להתריע למגדיר המשימה".
 */

import { mockUsers, mockProjectMembers, mockTasks } from "@/lib/db/mock-data";

export interface OverlapTask {
  id: string;
  title: string;
  plannedStart: string;
  plannedEnd: string;
}

export interface MemberWorkload {
  userId: string;
  name: string;
  /** Sum of ftePercent across the member's project memberships. */
  ftePercent: number;
  /** Member's active tasks whose dates overlap the requested window. */
  overlapping: OverlapTask[];
  /** True when committed allocation already exceeds 100%. */
  overloaded: boolean;
}

/** Inclusive date-range overlap on YYYY-MM-DD strings. */
function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  if (!aStart || !aEnd || !bStart || !bEnd) return false;
  // [aStart, aEnd] overlaps [bStart, bEnd] iff aStart <= bEnd && bStart <= aEnd.
  return aStart <= bEnd && bStart <= aEnd;
}

/**
 * Compute one member's workload for a [start, end] window. `excludeTaskId`
 * lets the caller skip the task currently being edited so it doesn't count
 * itself as an overlap.
 */
export function computeMemberWorkload(
  userId: string,
  start: string,
  end: string,
  excludeTaskId?: string,
): MemberWorkload {
  const user = mockUsers.find((u) => u.id === userId);
  const ftePercent = mockProjectMembers
    .filter((m) => m.userId === userId)
    .reduce((sum, m) => sum + (m.ftePercent || 0), 0);

  const overlapping: OverlapTask[] = mockTasks
    .filter(
      (t) =>
        t.assigneeId === userId &&
        t.id !== excludeTaskId &&
        t.status !== "done" &&
        t.status !== "cancelled" &&
        rangesOverlap(start, end, t.plannedStart, t.plannedEnd),
    )
    .map((t) => ({ id: t.id, title: t.title, plannedStart: t.plannedStart, plannedEnd: t.plannedEnd }));

  return {
    userId,
    name: user?.name || userId,
    ftePercent,
    overlapping,
    overloaded: ftePercent > 100,
  };
}

/** Compute workload for several members at once. */
export function computeTeamWorkload(
  userIds: string[],
  start: string,
  end: string,
  excludeTaskId?: string,
): MemberWorkload[] {
  return userIds.map((id) => computeMemberWorkload(id, start, end, excludeTaskId));
}
