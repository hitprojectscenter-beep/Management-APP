/**
 * Critical Path Method (CPM) implementation.
 *
 * Builds a directed acyclic graph from task dependencies and computes
 * the longest path from start tasks (no incoming edges) to end tasks
 * (no outgoing edges). Tasks on this longest path are "critical" -
 * any delay in them delays the entire project.
 *
 * Returns:
 *   - criticalTaskIds: Set of task IDs on the critical path
 *   - earliestStart / latestStart: per-task scheduling info
 *   - totalDays: total project duration along critical path
 */
import type { MockTask } from "@/lib/db/mock-data";

export interface CpmResult {
  criticalTaskIds: Set<string>;
  totalDays: number;
  earliestStart: Map<string, number>; // days from project start
  latestFinish: Map<string, number>;
  slack: Map<string, number>; // 0 = critical
}

/** Duration in days (handles ms/Date conversion) */
function getDurationDays(task: MockTask): number {
  if (!task.plannedStart || !task.plannedEnd) return 0;
  const start = new Date(task.plannedStart).getTime();
  const end = new Date(task.plannedEnd).getTime();
  return Math.max(0, (end - start) / (1000 * 60 * 60 * 24));
}

export function computeCriticalPath(tasks: MockTask[]): CpmResult {
  if (tasks.length === 0) {
    return {
      criticalTaskIds: new Set(),
      totalDays: 0,
      earliestStart: new Map(),
      latestFinish: new Map(),
      slack: new Map(),
    };
  }

  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const filterDeps = (deps: string[]) => deps.filter((d) => taskMap.has(d));

  // Build graph
  const incoming = new Map<string, string[]>(); // task -> deps that point to it
  const outgoing = new Map<string, string[]>(); // task -> tasks that depend on it
  for (const task of tasks) {
    incoming.set(task.id, filterDeps(task.dependencies));
  }
  for (const task of tasks) {
    for (const dep of filterDeps(task.dependencies)) {
      const list = outgoing.get(dep) || [];
      list.push(task.id);
      outgoing.set(dep, list);
    }
  }

  // Topological sort (Kahn's)
  const inDegree = new Map<string, number>();
  for (const task of tasks) {
    inDegree.set(task.id, (incoming.get(task.id) || []).length);
  }
  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }
  const topo: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    topo.push(id);
    for (const next of outgoing.get(id) || []) {
      const d = (inDegree.get(next) || 0) - 1;
      inDegree.set(next, d);
      if (d === 0) queue.push(next);
    }
  }

  // If we couldn't visit all (cycle), fall back to original order
  if (topo.length < tasks.length) {
    for (const t of tasks) {
      if (!topo.includes(t.id)) topo.push(t.id);
    }
  }

  // Forward pass: earliest start
  const earliestStart = new Map<string, number>();
  const earliestFinish = new Map<string, number>();
  for (const id of topo) {
    const task = taskMap.get(id)!;
    const dur = getDurationDays(task);
    const deps = filterDeps(task.dependencies);
    const es = deps.length === 0
      ? 0
      : Math.max(...deps.map((d) => earliestFinish.get(d) ?? 0));
    earliestStart.set(id, es);
    earliestFinish.set(id, es + dur);
  }

  const totalDays = Math.max(...Array.from(earliestFinish.values()), 0);

  // Backward pass: latest finish
  const latestFinish = new Map<string, number>();
  const latestStart = new Map<string, number>();
  for (let i = topo.length - 1; i >= 0; i--) {
    const id = topo[i];
    const task = taskMap.get(id)!;
    const dur = getDurationDays(task);
    const succs = outgoing.get(id) || [];
    const lf = succs.length === 0
      ? totalDays
      : Math.min(...succs.map((s) => latestStart.get(s) ?? totalDays));
    latestFinish.set(id, lf);
    latestStart.set(id, lf - dur);
  }

  // Compute slack: tasks with 0 slack are critical
  const slack = new Map<string, number>();
  const criticalTaskIds = new Set<string>();
  for (const id of topo) {
    const es = earliestStart.get(id) || 0;
    const ls = latestStart.get(id) || 0;
    const s = ls - es;
    slack.set(id, s);
    if (Math.abs(s) < 0.01) criticalTaskIds.add(id);
  }

  return { criticalTaskIds, totalDays, earliestStart, latestFinish, slack };
}

/**
 * Determine task health status based on planned vs actual progress.
 * green = on track, amber = at risk, red = behind/blocked
 */
export function getTaskHealth(task: MockTask): "green" | "amber" | "red" {
  if (task.status === "done") return "green";
  if (task.status === "blocked" || task.status === "cancelled") return "red";

  const now = Date.now();
  if (!task.plannedEnd) return "green";

  const end = new Date(task.plannedEnd).getTime();

  // Already overdue (done/cancelled were filtered above)
  if (end < now) return "red";

  // Calculate expected progress vs actual
  if (task.plannedStart && task.status === "in_progress") {
    const start = new Date(task.plannedStart).getTime();
    const total = end - start;
    if (total > 0) {
      const elapsed = now - start;
      const expectedProgress = Math.min(100, Math.max(0, (elapsed / total) * 100));
      const diff = expectedProgress - task.progressPercent;
      if (diff > 25) return "red";
      if (diff > 10) return "amber";
    }
  }

  // Approaching deadline (done/cancelled were filtered above)
  const daysRemaining = (end - now) / (1000 * 60 * 60 * 24);
  if (daysRemaining < 2 && task.progressPercent < 80) {
    return "amber";
  }

  return "green";
}
