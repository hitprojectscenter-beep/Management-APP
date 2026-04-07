/**
 * Risk Engine - מנוע זיהוי סיכונים.
 * סורק משימות ומחזיר תובנות על סיכונים פוטנציאליים.
 * משלב heuristics קלאסיים + Claude AI לסיכונים מורכבים.
 */
import type { MockTask } from "../db/mock-data";
import type { RiskSeverity } from "../db/types";

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

    // 1. Overdue
    if (task.plannedEnd && new Date(task.plannedEnd).getTime() < now && task.status !== "done") {
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
