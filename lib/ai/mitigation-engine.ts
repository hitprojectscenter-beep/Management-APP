/**
 * Mitigation Engine - AI-driven risk mitigation plan generator.
 *
 * Goes beyond detection (risk-engine.ts) to PROPOSE specific corrective actions:
 *   1. Smart resource reassignment - skill+availability+performance matching
 *   2. Per-risk mitigation strategies - concrete action lists
 *   3. Auto task routing - score new tasks against team capacity
 *   4. Comprehensive mitigation plan - aggregated playbook for the PM
 */
import type { MockTask, MockUser, MockProjectMember } from "../db/mock-data";
import type { RiskSeverity } from "../db/types";
import {
  detectResourceBottlenecks,
  predictProjectEndDate,
  generateActiveRecommendations,
  type ResourceBottleneck,
} from "./risk-engine";
import { computeCriticalPath } from "../gantt/critical-path";

// ============================================================
// 1. Smart Reassignment Engine
// ============================================================

export interface ReassignmentSuggestion {
  taskId: string;
  taskTitle: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  matchScore: number; // 0-100
  reasoning: string[];
  skillMatch: number; // 0-100
  availability: number; // 0-100 (higher = more available)
  performance: number; // 0-100
}

/**
 * Find the best alternative assignee for a task based on:
 *   - Skill match against task tags/title
 *   - Current availability (FTE allocation)
 *   - Historical performance score
 *   - Excluding the current assignee
 */
export function findBestReassignment(
  task: MockTask,
  users: MockUser[],
  members: MockProjectMember[],
  allTasks: MockTask[]
): ReassignmentSuggestion | null {
  const fromUser = users.find((u) => u.id === task.assigneeId);
  if (!fromUser) return null;

  // Score each candidate user
  const taskKeywords = [
    ...task.tags,
    ...task.title.toLowerCase().split(/\s+/).filter((w) => w.length > 3),
  ].map((k) => k.toLowerCase());

  const scored = users
    .filter((u) => u.id !== task.assigneeId && u.role !== "guest" && u.role !== "viewer")
    .map((u) => {
      // Skill match
      const userSkills = (u.skills || []).map((s) => s.toLowerCase());
      const skillMatches = taskKeywords.filter((kw) =>
        userSkills.some((s) => s.includes(kw) || kw.includes(s))
      ).length;
      const skillMatch = Math.min(100, skillMatches * 30);

      // Availability (inverse of FTE)
      const userFte = members
        .filter((m) => m.userId === u.id)
        .reduce((sum, m) => sum + m.ftePercent, 0);
      const availability = Math.max(0, 100 - userFte);

      // Performance score
      const performance = u.performanceScore || 75;

      // Active task count penalty
      const activeTasks = allTasks.filter(
        (t) => t.assigneeId === u.id && t.status !== "done" && t.status !== "cancelled"
      ).length;
      const loadPenalty = Math.min(30, activeTasks * 5);

      // Weighted match score
      const matchScore = Math.round(
        skillMatch * 0.4 + availability * 0.35 + performance * 0.25 - loadPenalty
      );

      // Build reasoning
      const reasoning: string[] = [];
      if (skillMatches > 0) {
        const matchedSkills = userSkills.filter((s) =>
          taskKeywords.some((kw) => s.includes(kw) || kw.includes(s))
        );
        reasoning.push(`${skillMatches} כישורים תואמים: ${matchedSkills.slice(0, 3).join(", ")}`);
      }
      if (availability > 50) {
        reasoning.push(`זמינות גבוהה (${100 - userFte}% פנוי)`);
      } else if (availability > 20) {
        reasoning.push(`זמינות חלקית (${100 - userFte}% פנוי)`);
      }
      if (performance >= 85) {
        reasoning.push(`היסטוריית ביצועים מצוינת (${performance}/100)`);
      } else if (performance >= 75) {
        reasoning.push(`ביצועים סבירים (${performance}/100)`);
      }
      if (activeTasks <= 2) {
        reasoning.push(`עומס נמוך כעת (${activeTasks} משימות פתוחות)`);
      }

      return {
        user: u,
        matchScore: Math.max(0, matchScore),
        skillMatch,
        availability,
        performance,
        reasoning,
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore);

  if (scored.length === 0) return null;
  const best = scored[0];

  return {
    taskId: task.id,
    taskTitle: task.title,
    fromUserId: fromUser.id,
    fromUserName: fromUser.name,
    toUserId: best.user.id,
    toUserName: best.user.name,
    matchScore: best.matchScore,
    reasoning: best.reasoning,
    skillMatch: best.skillMatch,
    availability: best.availability,
    performance: best.performance,
  };
}

/**
 * Generate reassignment suggestions for all bottleneck tasks.
 * For each user with critical/high bottleneck, find the most loaded
 * non-critical task and suggest a reassignment.
 */
export function generateReassignmentSuggestions(
  users: MockUser[],
  members: MockProjectMember[],
  tasks: MockTask[]
): ReassignmentSuggestion[] {
  const bottlenecks = detectResourceBottlenecks(users, members, tasks);
  const suggestions: ReassignmentSuggestion[] = [];
  const cpm = computeCriticalPath(tasks);

  for (const b of bottlenecks) {
    if (b.severity !== "critical" && b.severity !== "high") continue;
    // Find tasks assigned to this user that are NOT on critical path (we want to keep critical ones)
    const candidateTasks = tasks.filter(
      (t) =>
        t.assigneeId === b.userId &&
        t.status !== "done" &&
        t.status !== "cancelled" &&
        !cpm.criticalTaskIds.has(t.id)
    );
    // Sort by estimate hours descending (move biggest load first)
    candidateTasks.sort((a, b) => b.estimateHours - a.estimateHours);
    for (const task of candidateTasks.slice(0, 2)) {
      const suggestion = findBestReassignment(task, users, members, tasks);
      if (suggestion && suggestion.matchScore > 30) {
        suggestions.push(suggestion);
      }
    }
  }

  return suggestions.sort((a, b) => b.matchScore - a.matchScore).slice(0, 6);
}

// ============================================================
// 2. Mitigation Strategies Generator
// ============================================================

export type MitigationCategory = "resource" | "schedule" | "scope" | "process" | "escalation";

export interface MitigationAction {
  category: MitigationCategory;
  title: string;
  detail: string;
  effort: "low" | "medium" | "high";
  impact: "low" | "medium" | "high";
  timeframe: string;
}

export interface MitigationStrategy {
  taskId: string;
  taskTitle: string;
  riskType: string;
  riskSeverity: RiskSeverity;
  actions: MitigationAction[];
  preferredAction: MitigationAction;
}

/**
 * Generate concrete mitigation actions for a given risk type.
 * Each action has effort/impact rating to help the PM choose.
 */
export function getMitigationActionsForRisk(
  riskType: string,
  task: MockTask
): MitigationAction[] {
  const actions: MitigationAction[] = [];

  switch (riskType) {
    case "blocked":
      actions.push({
        category: "escalation",
        title: "פגישת הסלמה דחופה",
        detail: "כנס פגישה של 30 דקות עם האחראי, הפותר ומנהל הפרויקט - זהה את החסם והגדר פעולה ספציפית עם תאריך יעד.",
        effort: "low",
        impact: "high",
        timeframe: "תוך 24 שעות",
      });
      actions.push({
        category: "resource",
        title: "הקצאת משאב סיוע",
        detail: "צרף איש צוות נוסף עם כישורים משלימים שיכול לעקוף את החסם או לעזור לפתור אותו.",
        effort: "medium",
        impact: "high",
        timeframe: "תוך 2 ימים",
      });
      actions.push({
        category: "scope",
        title: "פיצול המשימה",
        detail: "פצל את המשימה לתת-משימות שאפשר להתחיל במקביל - חלק שלא תלוי בחסם יכול להתקדם.",
        effort: "medium",
        impact: "medium",
        timeframe: "תוך 1 יום",
      });
      break;

    case "overdue":
      actions.push({
        category: "schedule",
        title: "עדכון baseline ותקשורת לבעלי עניין",
        detail: "אם האיחור בלתי הפיך - עדכן את baseline ושלח עדכון לסטייקהולדרים עם הסבר וצפי חדש.",
        effort: "low",
        impact: "medium",
        timeframe: "תוך 24 שעות",
      });
      actions.push({
        category: "resource",
        title: "תגבור מהיר",
        detail: "הוסף מפתח/אנליסט נוסף לסיים את המשימה תוך 2-3 ימים.",
        effort: "high",
        impact: "high",
        timeframe: "תוך 3 ימים",
      });
      actions.push({
        category: "process",
        title: "Daily standups עד סיום",
        detail: "עבור ל-15 דקות יומיות עם האחראי עד שהמשימה נסגרת.",
        effort: "low",
        impact: "medium",
        timeframe: "מיידי",
      });
      break;

    case "effort_overrun":
      actions.push({
        category: "scope",
        title: "צמצום תכולה (Scope Reduction)",
        detail: "זהה דרישות שאינן must-have והעבר אותן ל-backlog או ל-iteration הבא.",
        effort: "low",
        impact: "high",
        timeframe: "תוך 2 ימים",
      });
      actions.push({
        category: "process",
        title: "סקירת קוד / ייעוץ טכני",
        detail: "אם החריגה נובעת ממורכבות טכנית - תאם code review עם איש מקצוע מנוסה.",
        effort: "medium",
        impact: "medium",
        timeframe: "תוך 3 ימים",
      });
      break;

    case "schedule_slip":
      actions.push({
        category: "process",
        title: "Pair programming / זוגי",
        detail: "שלוף את האחראי לעבודה זוגית לכמה ימים - מאיץ ביצוע ומפחית טעויות.",
        effort: "medium",
        impact: "high",
        timeframe: "מיידי",
      });
      actions.push({
        category: "resource",
        title: "העברת משימות אחרות הצידה",
        detail: "פנה את היומן של האחראי ממשימות אחרות כדי להתמקד.",
        effort: "low",
        impact: "high",
        timeframe: "תוך 1 יום",
      });
      break;

    case "critical_not_started":
      actions.push({
        category: "schedule",
        title: "התחלה מיידית - היום!",
        detail: "התקשר לאחראי, וודא שכל ה-prerequisites מוכנים, והכרז על kick-off היום.",
        effort: "low",
        impact: "high",
        timeframe: "היום",
      });
      actions.push({
        category: "escalation",
        title: "הסלמה ל-Sponsor",
        detail: "אם האחראי לא יכול להתחיל - הסלמה מיידית למנהל הפרויקט.",
        effort: "low",
        impact: "high",
        timeframe: "תוך שעות",
      });
      break;

    default:
      actions.push({
        category: "process",
        title: "ניטור מוגבר",
        detail: "הגדל את תדירות העדכונים על המשימה ועקוב מקרוב.",
        effort: "low",
        impact: "low",
        timeframe: "מיידי",
      });
  }

  return actions;
}

/**
 * Build a full mitigation strategy for each at-risk task.
 */
export function generateMitigationStrategies(
  tasks: MockTask[]
): MitigationStrategy[] {
  const strategies: MitigationStrategy[] = [];
  const now = Date.now();

  for (const task of tasks) {
    if (task.status === "done" || task.status === "cancelled") continue;

    let riskType = "";
    let severity: RiskSeverity = "low";

    if (task.status === "blocked") {
      riskType = "blocked";
      severity = "high";
    } else if (task.plannedEnd && new Date(task.plannedEnd).getTime() < now) {
      riskType = "overdue";
      severity = "high";
    } else if (task.estimateHours > 0 && task.actualHours > task.estimateHours * 1.2) {
      riskType = "effort_overrun";
      severity = "medium";
    } else if (
      task.priority === "critical" &&
      task.status === "not_started" &&
      task.plannedStart &&
      (new Date(task.plannedStart).getTime() - now) / (1000 * 60 * 60 * 24) < 3
    ) {
      riskType = "critical_not_started";
      severity = "critical";
    } else {
      continue;
    }

    const actions = getMitigationActionsForRisk(riskType, task);
    if (actions.length === 0) continue;

    // Pick preferred = highest impact-to-effort ratio
    const effortMap = { low: 1, medium: 2, high: 3 };
    const impactMap = { low: 1, medium: 2, high: 3 };
    const preferred = [...actions].sort((a, b) => {
      const ratioB = impactMap[b.impact] / effortMap[b.effort];
      const ratioA = impactMap[a.impact] / effortMap[a.effort];
      return ratioB - ratioA;
    })[0];

    strategies.push({
      taskId: task.id,
      taskTitle: task.title,
      riskType,
      riskSeverity: severity,
      actions,
      preferredAction: preferred,
    });
  }

  // Sort by severity
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  return strategies
    .sort((a, b) => severityOrder[a.riskSeverity] - severityOrder[b.riskSeverity])
    .slice(0, 8);
}

// ============================================================
// 3. Auto Task Routing
// ============================================================

export interface AutoRouteSuggestion {
  recommendedUserId: string;
  recommendedUserName: string;
  matchScore: number;
  alternativeUserIds: string[];
  reasoning: string;
}

/**
 * For a hypothetical new task with given attributes, suggest the best assignee.
 */
export function predictAutoRoute(
  taskTitle: string,
  taskTags: string[],
  estimateHours: number,
  users: MockUser[],
  members: MockProjectMember[],
  allTasks: MockTask[]
): AutoRouteSuggestion | null {
  const keywords = [
    ...taskTags,
    ...taskTitle.toLowerCase().split(/\s+/).filter((w) => w.length > 3),
  ].map((k) => k.toLowerCase());

  const scored = users
    .filter((u) => u.role === "manager" || u.role === "member" || u.role === "admin")
    .map((u) => {
      const userSkills = (u.skills || []).map((s) => s.toLowerCase());
      const matches = keywords.filter((kw) =>
        userSkills.some((s) => s.includes(kw) || kw.includes(s))
      ).length;
      const skillMatch = Math.min(100, matches * 25);

      const userFte = members
        .filter((m) => m.userId === u.id)
        .reduce((sum, m) => sum + m.ftePercent, 0);
      const availability = Math.max(0, 100 - userFte);

      const performance = u.performanceScore || 75;

      const score = Math.round(skillMatch * 0.4 + availability * 0.35 + performance * 0.25);
      return { user: u, score, matches };
    })
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return null;
  const best = scored[0];
  if (best.score < 20) return null;

  return {
    recommendedUserId: best.user.id,
    recommendedUserName: best.user.name,
    matchScore: best.score,
    alternativeUserIds: scored.slice(1, 4).map((s) => s.user.id),
    reasoning: `${best.matches} כישורים תואמים, ביצועים ${best.user.performanceScore}/100, וזמינות פנויה`,
  };
}

// ============================================================
// 4. Comprehensive Mitigation Plan
// ============================================================

export interface MitigationPlan {
  generatedAt: string;
  reassignments: ReassignmentSuggestion[];
  strategies: MitigationStrategy[];
  bottlenecks: ResourceBottleneck[];
  earlyWarnings: string[];
  summary: {
    totalActions: number;
    immediateActions: number;
    riskTasksCount: number;
    bottleneckUsersCount: number;
  };
}

/**
 * Generate the complete AI mitigation plan combining all analyses.
 * This is the "playbook" that the AI gives to the PM.
 */
export function generateMitigationPlan(
  tasks: MockTask[],
  users: MockUser[],
  members: MockProjectMember[]
): MitigationPlan {
  const reassignments = generateReassignmentSuggestions(users, members, tasks);
  const strategies = generateMitigationStrategies(tasks);
  const bottlenecks = detectResourceBottlenecks(users, members, tasks);
  const forecast = predictProjectEndDate(tasks);

  // Early warnings - things that will become problems
  const earlyWarnings: string[] = [];
  const cpm = computeCriticalPath(tasks);
  const now = Date.now();

  // Tasks on critical path that are starting soon
  for (const t of tasks) {
    if (cpm.criticalTaskIds.has(t.id) && t.status === "not_started" && t.plannedStart) {
      const days = (new Date(t.plannedStart).getTime() - now) / (1000 * 60 * 60 * 24);
      if (days > 0 && days < 7) {
        earlyWarnings.push(
          `משימה קריטית "${t.title}" מתחילה תוך ${Math.ceil(days)} ימים - וודא שכל ה-prerequisites מוכנים`
        );
      }
    }
  }

  // Heavily loaded users with critical work coming up
  for (const b of bottlenecks) {
    if (b.severity === "high" && b.criticalAssignments > 0) {
      earlyWarnings.push(
        `${b.userName} עומד להיות צוואר בקבוק - הקצאה ${b.totalFte}% עם ${b.criticalAssignments} משימות קריטיות`
      );
    }
  }

  // Forecast warning
  if (forecast && forecast.delayDays > 7) {
    earlyWarnings.push(
      `חיזוי AI: צפוי איחור של ${forecast.delayDays} ימים בסיום הפרויקט (ביטחון ${forecast.confidence})`
    );
  }

  const immediateActions =
    reassignments.length + strategies.filter((s) => s.riskSeverity === "critical" || s.riskSeverity === "high").length;

  return {
    generatedAt: new Date().toISOString(),
    reassignments,
    strategies,
    bottlenecks: bottlenecks.slice(0, 5),
    earlyWarnings: earlyWarnings.slice(0, 6),
    summary: {
      totalActions: reassignments.length + strategies.length,
      immediateActions,
      riskTasksCount: strategies.length,
      bottleneckUsersCount: bottlenecks.length,
    },
  };
}
