/**
 * WBS Roll-up calculations.
 *
 * Recursively aggregates metrics from leaf nodes (tasks) up through
 * the WBS hierarchy (subtask -> task -> activity -> milestone -> goal -> project -> program -> portfolio).
 *
 * Aggregations:
 *   - estimateHours / actualHours: simple sum
 *   - progressPercent: weighted average by estimateHours
 *   - earliest plannedStart / latest plannedEnd
 *   - count of children at each status
 *   - cost: hours × hourly rate (default ₪150/h)
 */
import type { MockTask, MockWbsNode } from "@/lib/db/mock-data";

const HOURLY_RATE = 150;

export interface WbsRollup {
  nodeId: string;
  totalEstimateHours: number;
  totalActualHours: number;
  weightedProgress: number; // 0-100
  plannedStart: string | null;
  plannedEnd: string | null;
  costPlanned: number;
  costActual: number;
  taskCount: number;
  doneCount: number;
  blockedCount: number;
  overdueCount: number;
}

/** Direct tasks owned by this WBS node */
function tasksOfNode(nodeId: string, allTasks: MockTask[]): MockTask[] {
  return allTasks.filter((t) => t.wbsNodeId === nodeId);
}

/** Direct child WBS nodes */
function childrenOfNode(nodeId: string, allNodes: MockWbsNode[]): MockWbsNode[] {
  return allNodes.filter((n) => n.parentId === nodeId);
}

/**
 * Compute roll-up for a single node and all its descendants.
 * Returns a Map keyed by nodeId.
 */
export function computeAllRollups(
  allNodes: MockWbsNode[],
  allTasks: MockTask[]
): Map<string, WbsRollup> {
  const rollups = new Map<string, WbsRollup>();

  function rollupNode(nodeId: string): WbsRollup {
    if (rollups.has(nodeId)) return rollups.get(nodeId)!;

    const directTasks = tasksOfNode(nodeId, allTasks);
    const childNodes = childrenOfNode(nodeId, allNodes);

    let totalEst = 0;
    let totalAct = 0;
    let totalProgressWeight = 0;
    let weightSum = 0;
    let earliest: number | null = null;
    let latest: number | null = null;
    let taskCount = 0;
    let doneCount = 0;
    let blockedCount = 0;
    let overdueCount = 0;
    const now = Date.now();

    // Aggregate direct tasks
    for (const task of directTasks) {
      const w = Math.max(task.estimateHours, 1);
      totalEst += task.estimateHours;
      totalAct += task.actualHours;
      totalProgressWeight += task.progressPercent * w;
      weightSum += w;
      taskCount++;
      if (task.status === "done") doneCount++;
      if (task.status === "blocked") blockedCount++;
      if (task.plannedEnd && new Date(task.plannedEnd).getTime() < now && task.status !== "done") {
        overdueCount++;
      }
      if (task.plannedStart) {
        const t = new Date(task.plannedStart).getTime();
        if (earliest === null || t < earliest) earliest = t;
      }
      if (task.plannedEnd) {
        const t = new Date(task.plannedEnd).getTime();
        if (latest === null || t > latest) latest = t;
      }
    }

    // Recursively aggregate child nodes
    for (const child of childNodes) {
      const childRollup = rollupNode(child.id);
      const w = Math.max(childRollup.totalEstimateHours, 1);
      totalEst += childRollup.totalEstimateHours;
      totalAct += childRollup.totalActualHours;
      totalProgressWeight += childRollup.weightedProgress * w;
      weightSum += w;
      taskCount += childRollup.taskCount;
      doneCount += childRollup.doneCount;
      blockedCount += childRollup.blockedCount;
      overdueCount += childRollup.overdueCount;
      if (childRollup.plannedStart) {
        const t = new Date(childRollup.plannedStart).getTime();
        if (earliest === null || t < earliest) earliest = t;
      }
      if (childRollup.plannedEnd) {
        const t = new Date(childRollup.plannedEnd).getTime();
        if (latest === null || t > latest) latest = t;
      }
    }

    const result: WbsRollup = {
      nodeId,
      totalEstimateHours: totalEst,
      totalActualHours: totalAct,
      weightedProgress: weightSum > 0 ? totalProgressWeight / weightSum : 0,
      plannedStart: earliest ? new Date(earliest).toISOString() : null,
      plannedEnd: latest ? new Date(latest).toISOString() : null,
      costPlanned: totalEst * HOURLY_RATE,
      costActual: totalAct * HOURLY_RATE,
      taskCount,
      doneCount,
      blockedCount,
      overdueCount,
    };
    rollups.set(nodeId, result);
    return result;
  }

  // Trigger computation for every node
  for (const node of allNodes) {
    rollupNode(node.id);
  }

  return rollups;
}

/**
 * Generate auto-numbering (1, 1.1, 1.1.1, 1.2, 2, ...) for a WBS hierarchy.
 * Returns Map nodeId -> number string.
 */
export function computeWbsNumbering(
  allNodes: MockWbsNode[],
  rootNodeIds?: string[]
): Map<string, string> {
  const numbering = new Map<string, string>();

  // Find roots
  const roots = rootNodeIds
    ? allNodes.filter((n) => rootNodeIds.includes(n.id))
    : allNodes.filter((n) => !n.parentId);

  // Sort by position
  const sorted = [...roots].sort((a, b) => a.position - b.position);

  function walk(nodes: MockWbsNode[], prefix: string) {
    nodes.forEach((node, idx) => {
      const num = prefix ? `${prefix}.${idx + 1}` : `${idx + 1}`;
      numbering.set(node.id, num);
      const children = allNodes
        .filter((n) => n.parentId === node.id)
        .sort((a, b) => a.position - b.position);
      if (children.length > 0) {
        walk(children, num);
      }
    });
  }

  walk(sorted, "");
  return numbering;
}

/**
 * Get all descendant nodes of a given node (recursive).
 */
export function getDescendants(
  nodeId: string,
  allNodes: MockWbsNode[]
): MockWbsNode[] {
  const result: MockWbsNode[] = [];
  const queue = [nodeId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    const children = allNodes.filter((n) => n.parentId === id);
    result.push(...children);
    queue.push(...children.map((c) => c.id));
  }
  return result;
}
