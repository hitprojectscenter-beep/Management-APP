/**
 * Risk Engine - מנוע זיהוי סיכונים.
 * סורק משימות ומחזיר תובנות על סיכונים פוטנציאליים.
 * משלב heuristics קלאסיים + Claude AI לסיכונים מורכבים.
 *
 * Capabilities:
 * 1. scanTasksForRisks - 5 classic risk types (overdue, blocked, effort overrun, slip, critical-not-started)
 * 2. detectResourceBottlenecks - users with >80% allocation on critical-path work
 * 3. predictProjectEndDate - velocity-based forecast with delay multiplier
 * 4. computeDependencyImpact - cascade effect analysis on dependent tasks
 * 5. generateActiveRecommendations - actionable next steps for the PM
 */
import type { MockTask, MockUser, MockProjectMember } from "../db/mock-data";
import type { RiskSeverity } from "../db/types";
import { computeCriticalPath } from "../gantt/critical-path";

export interface DetectedRisk {
  taskId: string;
  severity: RiskSeverity;
  type: string;
  message: string;
  suggestion: string;
}

export function scanTasksForRisks(tasks: MockTask[]): DetectedRisk[] {
  const risks: DetectedRisk[] = [];
  const now = Date.now();

  for (const task of tasks) {
    if (task.status === "done" || task.status === "cancelled") continue;

    // 1. Overdue (status already filtered above, just check the date)
    if (task.plannedEnd && new Date(task.plannedEnd).getTime() < now) {
      risks.push({
        taskId: task.id,
        severity: "high",
        type: "overdue",
        message: `המשימה "${task.title}" עברה את תאריך היעד`,
        suggestion: "עדכן תאריך יעד או הסלמת המשימה",
      });
    }

    // 2. Blocked > 24h
    if (task.status === "blocked") {
      risks.push({
        taskId: task.id,
        severity: "high",
        type: "blocked",
        message: `המשימה "${task.title}" חסומה`,
        suggestion: "זהה את החסם והסר אותו, או הקצה משאב נוסף",
      });
    }

    // 3. Effort overrun > 20%
    if (task.estimateHours > 0 && task.actualHours > task.estimateHours * 1.2) {
      const overrun = Math.round(((task.actualHours - task.estimateHours) / task.estimateHours) * 100);
      risks.push({
        taskId: task.id,
        severity: overrun > 50 ? "high" : "medium",
        type: "effort_overrun",
        message: `חריגה של ${overrun}% מההערכת זמן ב-"${task.title}"`,
        suggestion: "עדכן הערכה או פצל לתת-משימות",
      });
    }

    // 4. Schedule slip - progress vs elapsed time mismatch
    if (task.plannedStart && task.plannedEnd && task.status === "in_progress") {
      const start = new Date(task.plannedStart).getTime();
      const end = new Date(task.plannedEnd).getTime();
      const total = end - start;
      const elapsed = now - start;
      if (total > 0 && elapsed > 0) {
        const expectedProgress = Math.min(100, (elapsed / total) * 100);
        if (expectedProgress - task.progressPercent > 20) {
          risks.push({
            taskId: task.id,
            severity: "medium",
            type: "schedule_slip",
            message: `התקדמות איטית: צפוי ${Math.round(expectedProgress)}% אך בפועל ${task.progressPercent}%`,
            suggestion: "הקצה משאבים נוספים או עדכן baseline",
          });
        }
      }
    }

    // 5. Critical priority + not started + close to deadline
    if (
      task.priority === "critical" &&
      task.status === "not_started" &&
      task.plannedStart
    ) {
      const daysToStart = (new Date(task.plannedStart).getTime() - now) / (1000 * 60 * 60 * 24);
      if (daysToStart < 3) {
        risks.push({
          taskId: task.id,
          severity: "critical",
          type: "critical_not_started",
          message: `משימה קריטית "${task.title}" לא החלה`,
          suggestion: "התחל מיד או דחה את ה-milestone",
        });
      }
    }
  }

  return risks;
}

export function calculateProjectHealth(tasks: MockTask[]): {
  score: number; // 0-100
  status: "healthy" | "at-risk" | "critical";
  metrics: {
    total: number;
    onTime: number;
    overdue: number;
    blocked: number;
    completed: number;
  };
} {
  const now = Date.now();
  let onTime = 0;
  let overdue = 0;
  let blocked = 0;
  let completed = 0;

  for (const task of tasks) {
    if (task.status === "done") completed++;
    if (task.status === "blocked") blocked++;
    if (
      task.plannedEnd &&
      new Date(task.plannedEnd).getTime() < now &&
      task.status !== "done"
    ) {
      overdue++;
    } else if (task.status !== "cancelled") {
      onTime++;
    }
  }

  const total = tasks.length || 1;
  const completionRate = (completed / total) * 100;
  const overdueRate = (overdue / total) * 100;
  const blockedRate = (blocked / total) * 100;

  const score = Math.max(
    0,
    Math.round(completionRate * 0.5 - overdueRate * 1.5 - blockedRate * 1.0 + 50)
  );

  let status: "healthy" | "at-risk" | "critical" = "healthy";
  if (score < 40) status = "critical";
  else if (score < 70) status = "at-risk";

  return {
    score: Math.min(100, Math.max(0, score)),
    status,
    metrics: { total, onTime, overdue, blocked, completed },
  };
}

// ============================================================
// Resource Bottleneck Detection
// ============================================================

export interface ResourceBottleneck {
  userId: string;
  userName: string;
  totalFte: number;
  isOverallocated: boolean;
  criticalAssignments: number; // tasks on critical path assigned to this user
  blockedAssignments: number;
  severity: RiskSeverity;
  message: string;
  recommendation: string;
  affectedTaskIds: string[];
}

/**
 * Identify users at risk of becoming bottlenecks for critical-path work.
 * Triggers:
 *   - Total FTE > 80% (per the requirements)
 *   - User assigned to critical path tasks AND already loaded
 *   - Multiple blocked tasks on the same user
 */
export function detectResourceBottlenecks(
  users: MockUser[],
  members: MockProjectMember[],
  tasks: MockTask[]
): ResourceBottleneck[] {
  const cpm = computeCriticalPath(tasks);
  const bottlenecks: ResourceBottleneck[] = [];

  for (const user of users) {
    const userMemberships = members.filter((m) => m.userId === user.id);
    const totalFte = userMemberships.reduce((sum, m) => sum + m.ftePercent, 0);
    const userTasks = tasks.filter((t) => t.assigneeId === user.id);
    const openTasks = userTasks.filter((t) => t.status !== "done" && t.status !== "cancelled");
    const criticalAssignments = openTasks.filter((t) => cpm.criticalTaskIds.has(t.id));
    const blockedAssignments = openTasks.filter((t) => t.status === "blocked");

    const isOverallocated = totalFte > 100;
    const isHeavilyLoaded = totalFte > 80;
    const hasCriticalWork = criticalAssignments.length > 0;
    const hasBlockedWork = blockedAssignments.length > 0;

    // Skip users with no risk indicators
    if (!isHeavilyLoaded && !hasBlockedWork && criticalAssignments.length < 2) continue;

    let severity: RiskSeverity = "low";
    let message = "";
    let recommendation = "";

    if (isOverallocated && hasCriticalWork) {
      severity = "critical";
      message = `${user.name} מוקצה ב-${totalFte}% (>100%) ועובד על ${criticalAssignments.length} משימות בנתיב הקריטי`;
      recommendation = "העבר חלק מהמשימות הלא-קריטיות לחבר צוות אחר, או הסט תאריכי יעד";
    } else if (isHeavilyLoaded && hasCriticalWork) {
      severity = "high";
      message = `${user.name} מוקצה ב-${totalFte}% וחב לאחראי על ${criticalAssignments.length} משימות קריטיות`;
      recommendation = "שקול הוספת משאב סיוע למשימות הקריטיות לפני שנפילה ביצועית מתחילה";
    } else if (blockedAssignments.length >= 2) {
      severity = "high";
      message = `${user.name} עם ${blockedAssignments.length} משימות חסומות במקביל - עומס מנטלי גבוה`;
      recommendation = "פתור את החסימות במשימה הקריטית ביותר תחילה";
    } else if (isOverallocated) {
      severity = "medium";
      message = `${user.name} מוקצה ב-${totalFte}% - הקצאת יתר שתביא לשחיקה`;
      recommendation = "פצל מחדש את המשימות או שקול גיוס עזרה";
    } else if (isHeavilyLoaded) {
      severity = "low";
      message = `${user.name} מוקצה ב-${totalFte}% - מעל הסף הבטוח של 80%`;
      recommendation = "שמור על סדר עדיפויות וצפה לעיכובים אפשריים";
    }

    bottlenecks.push({
      userId: user.id,
      userName: user.name,
      totalFte,
      isOverallocated,
      criticalAssignments: criticalAssignments.length,
      blockedAssignments: blockedAssignments.length,
      severity,
      message,
      recommendation,
      affectedTaskIds: openTasks.map((t) => t.id),
    });
  }

  return bottlenecks.sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return order[a.severity] - order[b.severity];
  });
}

// ============================================================
// Predictive Forecasting
// ============================================================

export interface ProjectForecast {
  plannedEnd: Date;
  forecastEnd: Date;
  delayDays: number;
  confidence: "high" | "medium" | "low";
  velocityActual: number; // tasks completed per week
  velocityRequired: number; // tasks per week needed to finish on time
  remainingTasks: number;
  insight: string;
}

/**
 * Forecast realistic project end date based on:
 *   - Current velocity (completed tasks per unit time)
 *   - Average historical slippage of completed tasks
 *   - Number of remaining tasks
 *
 * If we have completed tasks, we measure how late they typically were
 * and apply a slip multiplier to the remaining work.
 */
export function predictProjectEndDate(tasks: MockTask[]): ProjectForecast | null {
  if (tasks.length === 0) return null;

  const now = Date.now();
  const completed = tasks.filter((t) => t.status === "done" && t.actualEnd);
  const remaining = tasks.filter((t) => t.status !== "done" && t.status !== "cancelled");

  if (remaining.length === 0) {
    // All done - return last actual end
    const lastEnd = Math.max(...completed.map((t) => new Date(t.actualEnd!).getTime()));
    return {
      plannedEnd: new Date(lastEnd),
      forecastEnd: new Date(lastEnd),
      delayDays: 0,
      confidence: "high",
      velocityActual: 0,
      velocityRequired: 0,
      remainingTasks: 0,
      insight: "כל המשימות הושלמו 🎉",
    };
  }

  // Original planned end = max of all plannedEnd
  const planned = Math.max(
    ...tasks
      .filter((t) => t.plannedEnd)
      .map((t) => new Date(t.plannedEnd).getTime())
  );
  const plannedEnd = new Date(planned);

  // Calculate slip multiplier from completed tasks
  let avgSlipDays = 0;
  if (completed.length > 0) {
    const slips = completed.map((t) => {
      const p = new Date(t.plannedEnd).getTime();
      const a = new Date(t.actualEnd!).getTime();
      return (a - p) / (1000 * 60 * 60 * 24);
    });
    avgSlipDays = slips.reduce((sum, s) => sum + s, 0) / slips.length;
  }

  // Effort overrun multiplier
  const effortOverrun =
    completed.length > 0
      ? completed.reduce((sum, t) => {
          if (t.estimateHours === 0) return sum;
          return sum + t.actualHours / t.estimateHours;
        }, 0) / completed.length
      : 1;

  // Calculate weekly velocity
  let velocityActual = 0;
  if (completed.length > 0) {
    const earliest = Math.min(...completed.map((t) => new Date(t.actualEnd!).getTime()));
    const latest = Math.max(...completed.map((t) => new Date(t.actualEnd!).getTime()));
    const weeksSpan = Math.max(1, (latest - earliest) / (1000 * 60 * 60 * 24 * 7));
    velocityActual = completed.length / weeksSpan;
  }

  const weeksRemaining = (planned - now) / (1000 * 60 * 60 * 24 * 7);
  const velocityRequired = weeksRemaining > 0 ? remaining.length / weeksRemaining : remaining.length;

  // Forecast: take planned end + average slip × number of remaining tasks (capped)
  const slipPerTask = Math.max(0, avgSlipDays);
  const slipMultiplier = Math.max(1, effortOverrun);
  const additionalDays = slipPerTask * Math.min(remaining.length, 10) * slipMultiplier;
  const forecastTime = Math.max(planned, now) + additionalDays * 1000 * 60 * 60 * 24;
  const forecastEnd = new Date(forecastTime);
  const delayDays = Math.round((forecastTime - planned) / (1000 * 60 * 60 * 24));

  // Confidence based on sample size
  let confidence: "high" | "medium" | "low" = "low";
  if (completed.length >= 5) confidence = "high";
  else if (completed.length >= 2) confidence = "medium";

  // Insight message
  let insight = "";
  if (delayDays > 14) {
    insight = `על סמך מגמת הביצועים, צפוי איחור משמעותי של ${delayDays} ימים. מומלץ לעדכן את ה-baseline או להוסיף משאבים.`;
  } else if (delayDays > 3) {
    insight = `צפוי איחור קטן של ${delayDays} ימים. ניתן עדיין להחזיר את הפרויקט לזמנים אם פועלים מיד.`;
  } else if (delayDays > 0) {
    insight = `הפרויקט במסלול - איחור צפוי קטן (${delayDays} ימים).`;
  } else {
    insight = `הפרויקט במסלול! צפוי להסתיים בזמן או לפני התאריך המתוכנן.`;
  }

  return {
    plannedEnd,
    forecastEnd,
    delayDays,
    confidence,
    velocityActual,
    velocityRequired,
    remainingTasks: remaining.length,
    insight,
  };
}

// ============================================================
// Dependency Impact Analysis
// ============================================================

export interface DependencyImpact {
  delayedTaskId: string;
  delayedTaskTitle: string;
  affectedTaskIds: string[];
  affectedCount: number;
  cascadeDays: number; // total cascade delay
  affectsCriticalPath: boolean;
  affectedCriticalIds: string[];
  message: string;
  recommendation: string;
}

/**
 * For a delayed task, walk the dependency graph forward to find
 * all downstream tasks that will be impacted, and estimate the cascade.
 */
export function computeDependencyImpact(
  delayedTaskId: string,
  delayedDays: number,
  tasks: MockTask[]
): DependencyImpact | null {
  const task = tasks.find((t) => t.id === delayedTaskId);
  if (!task) return null;

  // Build forward graph: task -> [tasks that depend on it]
  const forward = new Map<string, string[]>();
  for (const t of tasks) {
    for (const dep of t.dependencies) {
      const list = forward.get(dep) || [];
      list.push(t.id);
      forward.set(dep, list);
    }
  }

  // BFS from delayed task forward
  const affected = new Set<string>();
  const queue = [delayedTaskId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    const successors = forward.get(id) || [];
    for (const next of successors) {
      if (!affected.has(next)) {
        affected.add(next);
        queue.push(next);
      }
    }
  }

  // Check if any affected task is on critical path
  const cpm = computeCriticalPath(tasks);
  const affectedCritical = Array.from(affected).filter((id) => cpm.criticalTaskIds.has(id));
  const affectsCriticalPath = affectedCritical.length > 0 || cpm.criticalTaskIds.has(delayedTaskId);

  // Cascade days: roughly delay × longest dependency chain depth
  const maxDepth = computeMaxDepthFromTask(delayedTaskId, forward);
  const cascadeDays = Math.round(delayedDays * Math.max(1, Math.sqrt(maxDepth)));

  let message = "";
  let recommendation = "";

  if (affected.size === 0) {
    message = `העיכוב במשימה אינו משפיע על משימות אחרות`;
    recommendation = "אין צורך בפעולה מיידית - העיכוב מקומי";
  } else if (affectsCriticalPath) {
    message = `עיכוב של ${delayedDays} ימים יוצר אפקט שרשרת על ${affected.size} משימות, מתוכן ${affectedCritical.length} בנתיב הקריטי - יגרור איחור צפוי של ${cascadeDays} ימים בסיום הפרויקט`;
    recommendation = "מיידית: הקצה משאב נוסף או פצל את המשימה. שקול עדכון baseline.";
  } else {
    message = `עיכוב של ${delayedDays} ימים ישפיע על ${affected.size} משימות עוקבות (לא על הנתיב הקריטי). אפקט שרשרת צפוי: ${cascadeDays} ימים`;
    recommendation = "ניתן לספוג את העיכוב מהחוצץ הקיים, אך כדאי לעקוב";
  }

  return {
    delayedTaskId,
    delayedTaskTitle: task.title,
    affectedTaskIds: Array.from(affected),
    affectedCount: affected.size,
    cascadeDays,
    affectsCriticalPath,
    affectedCriticalIds: affectedCritical,
    message,
    recommendation,
  };
}

function computeMaxDepthFromTask(taskId: string, forward: Map<string, string[]>): number {
  const successors = forward.get(taskId) || [];
  if (successors.length === 0) return 0;
  return 1 + Math.max(...successors.map((s) => computeMaxDepthFromTask(s, forward)));
}

// ============================================================
// Active Recommendations - aggregated insights for the Sidekick
// ============================================================

export interface ActiveRecommendation {
  priority: "now" | "soon" | "watch";
  category: "blocker" | "resource" | "schedule" | "scope" | "quality";
  title: string;
  detail: string;
  actionLabel: string;
  affectedTaskIds: string[];
}

export function generateActiveRecommendations(
  tasks: MockTask[],
  users: MockUser[],
  members: MockProjectMember[]
): ActiveRecommendation[] {
  const recommendations: ActiveRecommendation[] = [];
  const now = Date.now();

  // 1. Blocked tasks
  const blockedTasks = tasks.filter((t) => t.status === "blocked");
  for (const task of blockedTasks) {
    const assignee = users.find((u) => u.id === task.assigneeId);
    recommendations.push({
      priority: "now",
      category: "blocker",
      title: `הסלמת חסימה: ${task.title}`,
      detail: assignee
        ? `המשימה חסומה ומוקצית ל-${assignee.name}. כל משימה שתלויה בה תושפע.`
        : "המשימה חסומה ללא אחראי - הקצה מיד.",
      actionLabel: "פתח פגישת הסלמה",
      affectedTaskIds: [task.id],
    });
  }

  // 2. Critical not started
  const criticalNotStarted = tasks.filter(
    (t) => t.priority === "critical" && t.status === "not_started" && t.plannedStart
  );
  for (const task of criticalNotStarted) {
    const daysToStart = (new Date(task.plannedStart).getTime() - now) / (1000 * 60 * 60 * 24);
    if (daysToStart < 7) {
      recommendations.push({
        priority: daysToStart < 3 ? "now" : "soon",
        category: "schedule",
        title: `התחל מיד: ${task.title}`,
        detail: `משימה קריטית שעוד לא החלה (${Math.ceil(daysToStart)} ימים לתאריך התחלה).`,
        actionLabel: "אזן עומסים והתחל",
        affectedTaskIds: [task.id],
      });
    }
  }

  // 3. Resource bottleneck
  const bottlenecks = detectResourceBottlenecks(users, members, tasks);
  for (const b of bottlenecks.slice(0, 3)) {
    if (b.severity === "critical" || b.severity === "high") {
      recommendations.push({
        priority: b.severity === "critical" ? "now" : "soon",
        category: "resource",
        title: `איזון עומסים: ${b.userName}`,
        detail: b.message,
        actionLabel: "פצל מחדש",
        affectedTaskIds: b.affectedTaskIds,
      });
    }
  }

  // 4. Forecast warning
  const forecast = predictProjectEndDate(tasks);
  if (forecast && forecast.delayDays > 7) {
    recommendations.push({
      priority: forecast.delayDays > 14 ? "now" : "soon",
      category: "schedule",
      title: `איחור צפוי בסיום הפרויקט: ${forecast.delayDays} ימים`,
      detail: forecast.insight,
      actionLabel: "עדכן baseline",
      affectedTaskIds: [],
    });
  }

  // Sort by priority
  const order = { now: 0, soon: 1, watch: 2 };
  return recommendations.sort((a, b) => order[a.priority] - order[b.priority]);
}
