/**
 * Advanced KPI calculations — 6 new metrics based on industry standards:
 * PMBOK, EVM, McKinsey OHI, Gallup Q12, Bain NPS, MBI Burnout.
 *
 * These supplement the existing 10 KPIs already in the dashboard.
 */

import type { MockTask, MockUser, MockProjectMember } from "@/lib/db/mock-data";

// ============================================================
// DATA STRUCTURES — seed data (mock)
// ============================================================

/** NPS survey response — stakeholder feedback */
export interface NpsResponse {
  id: string;
  respondentId: string; // userId
  role: "sponsor" | "pm" | "team_member" | "stakeholder";
  score: number; // 0-10
  comment?: string;
  surveyDate: string; // ISO
}

/** Decision log entry — for Decision Latency metric */
export interface DecisionLogEntry {
  id: string;
  projectId: string;
  raisedAt: string; // ISO — when issue/risk was flagged
  decidedAt: string | null; // ISO — when decision was made (null = pending)
  decisionType: "risk_response" | "scope_change" | "budget_adjustment" | "resource_allocation";
  raisedByUserId: string;
  decidedByUserId: string | null;
  description: string;
}

/** AI recommendation with adoption tracking */
export interface AiRecommendationLog {
  id: string;
  projectId: string;
  createdAt: string;
  recommendation: string;
  severity: "low" | "medium" | "high" | "critical";
  adopted: boolean; // did PM act on it?
  adoptedAt: string | null;
}

// ============================================================
// SEEDED DATA (mock, representing last 30 days)
// ============================================================

const now = Date.now();
const ago = (days: number, hours = 0) => new Date(now - days * 86400000 - hours * 3600000).toISOString();

export const mockNpsResponses: NpsResponse[] = [
  { id: "nps-1",  respondentId: "u1", role: "pm",           score: 9, comment: "כלי מצוין",         surveyDate: ago(2) },
  { id: "nps-2",  respondentId: "u2", role: "sponsor",      score: 8, comment: "שיפור משמעותי",    surveyDate: ago(3) },
  { id: "nps-3",  respondentId: "u3", role: "stakeholder",  score: 10,                            surveyDate: ago(5) },
  { id: "nps-4",  respondentId: "u4", role: "team_member",  score: 7,                             surveyDate: ago(6) },
  { id: "nps-5",  respondentId: "u5", role: "team_member",  score: 9,                             surveyDate: ago(8) },
  { id: "nps-6",  respondentId: "u6", role: "sponsor",      score: 9, comment: "מעולה למנכ\"ל",   surveyDate: ago(10) },
  { id: "nps-7",  respondentId: "u1", role: "pm",           score: 8,                             surveyDate: ago(15) },
  { id: "nps-8",  respondentId: "u2", role: "sponsor",      score: 7,                             surveyDate: ago(18) },
  { id: "nps-9",  respondentId: "u3", role: "stakeholder",  score: 6, comment: "דרוש שיפור בניהול סיכונים", surveyDate: ago(22) },
  { id: "nps-10", respondentId: "u4", role: "team_member",  score: 10,                            surveyDate: ago(25) },
  { id: "nps-11", respondentId: "u5", role: "team_member",  score: 8,                             surveyDate: ago(28) },
  { id: "nps-12", respondentId: "u6", role: "sponsor",      score: 9,                             surveyDate: ago(30) },
];

export const mockDecisionLog: DecisionLogEntry[] = [
  { id: "dec-1", projectId: "wbs-project-sf-crm",       raisedAt: ago(2, 6),  decidedAt: ago(2, 2),    decisionType: "risk_response",      raisedByUserId: "u1", decidedByUserId: "u2", description: "תגובה לסיכון תקציבי" },
  { id: "dec-2", projectId: "wbs-project-sf-marketing", raisedAt: ago(4),     decidedAt: ago(3, 18),   decisionType: "resource_allocation", raisedByUserId: "u3", decidedByUserId: "u2", description: "הקצאת מפתח נוסף" },
  { id: "dec-3", projectId: "wbs-project-sf-tasks",     raisedAt: ago(6),     decidedAt: ago(5, 12),   decisionType: "scope_change",       raisedByUserId: "u4", decidedByUserId: "u1", description: "שינוי היקף פיצ'ר" },
  { id: "dec-4", projectId: "wbs-project-sf-crm",       raisedAt: ago(7),     decidedAt: ago(5),        decisionType: "budget_adjustment",  raisedByUserId: "u1", decidedByUserId: "u6", description: "תוספת תקציב" },
  { id: "dec-5", projectId: "wbs-project-1",            raisedAt: ago(10),    decidedAt: ago(9, 15),   decisionType: "risk_response",      raisedByUserId: "u1", decidedByUserId: "u2", description: "שינוי לוח זמנים" },
  { id: "dec-6", projectId: "wbs-project-2",            raisedAt: ago(12),    decidedAt: ago(10),       decisionType: "scope_change",       raisedByUserId: "u5", decidedByUserId: "u1", description: "הפחתת היקף" },
  { id: "dec-7", projectId: "wbs-project-sf-marketing", raisedAt: ago(14),    decidedAt: null,          decisionType: "budget_adjustment",  raisedByUserId: "u3", decidedByUserId: null, description: "החלטה ממתינה — תקציב נוסף" },
  { id: "dec-8", projectId: "wbs-project-sf-crm",       raisedAt: ago(18),    decidedAt: ago(15, 8),   decisionType: "resource_allocation", raisedByUserId: "u4", decidedByUserId: "u2", description: "העברת מפתח" },
];

export const mockAiRecommendations: AiRecommendationLog[] = [
  { id: "air-1",  projectId: "wbs-project-sf-crm",       createdAt: ago(1),  recommendation: "הסלמה למנהל בכיר",      severity: "critical", adopted: true,  adoptedAt: ago(0, 20) },
  { id: "air-2",  projectId: "wbs-project-sf-marketing", createdAt: ago(2),  recommendation: "הפחתת WIP limit",       severity: "high",     adopted: true,  adoptedAt: ago(1, 12) },
  { id: "air-3",  projectId: "wbs-project-sf-tasks",     createdAt: ago(3),  recommendation: "שיבוץ מחדש של משימה",  severity: "medium",   adopted: false, adoptedAt: null },
  { id: "air-4",  projectId: "wbs-project-sf-crm",       createdAt: ago(5),  recommendation: "סקירת תלויות",          severity: "high",     adopted: true,  adoptedAt: ago(4) },
  { id: "air-5",  projectId: "wbs-project-1",            createdAt: ago(7),  recommendation: "תוספת משאבים",          severity: "high",     adopted: true,  adoptedAt: ago(6) },
  { id: "air-6",  projectId: "wbs-project-2",            createdAt: ago(8),  recommendation: "פגישת חירום",           severity: "critical", adopted: false, adoptedAt: null },
  { id: "air-7",  projectId: "wbs-project-sf-marketing", createdAt: ago(10), recommendation: "עדכון baseline",        severity: "medium",   adopted: true,  adoptedAt: ago(9) },
  { id: "air-8",  projectId: "wbs-project-sf-crm",       createdAt: ago(12), recommendation: "סקירה שבועית",          severity: "low",      adopted: true,  adoptedAt: ago(11) },
  { id: "air-9",  projectId: "wbs-project-sf-tasks",     createdAt: ago(15), recommendation: "גידור תהליך",           severity: "medium",   adopted: false, adoptedAt: null },
  { id: "air-10", projectId: "wbs-project-1",            createdAt: ago(18), recommendation: "בדיקת אבני דרך",        severity: "high",     adopted: true,  adoptedAt: ago(16) },
];

// ============================================================
// KPI CALCULATION FUNCTIONS
// ============================================================

/**
 * 1. CPI — Cost Performance Index (EVM standard)
 * Formula: CPI = Earned Value / Actual Cost
 * Interpretation: >1.0 = under budget, <1.0 = over budget
 */
export function calculateCPI(tasks: MockTask[]): { value: number; status: "good" | "warning" | "critical" } {
  const completed = tasks.filter((t) => t.status === "done");
  if (completed.length === 0) return { value: 1.0, status: "good" };

  // Earned Value = planned hours of completed tasks
  const earnedValue = completed.reduce((sum, t) => sum + (t.estimateHours || 0), 0);
  // Actual Cost = actual hours of completed tasks
  const actualCost = completed.reduce((sum, t) => sum + (t.actualHours || t.estimateHours || 0), 0);

  if (actualCost === 0) return { value: 1.0, status: "good" };
  const cpi = earnedValue / actualCost;

  return {
    value: parseFloat(cpi.toFixed(2)),
    status: cpi >= 0.95 ? "good" : cpi >= 0.85 ? "warning" : "critical",
  };
}

/**
 * 2. SPI — Schedule Performance Index (EVM standard)
 * Formula: SPI = Earned Value / Planned Value
 * Interpretation: >1.0 = ahead of schedule, <1.0 = behind
 */
export function calculateSPI(tasks: MockTask[]): { value: number; status: "good" | "warning" | "critical" } {
  const now = Date.now();

  // Planned Value: work that SHOULD be done by now (all tasks whose plannedEnd < now)
  const shouldBeDone = tasks.filter((t) => t.plannedEnd && new Date(t.plannedEnd).getTime() <= now);
  if (shouldBeDone.length === 0) return { value: 1.0, status: "good" };

  const plannedValue = shouldBeDone.reduce((sum, t) => sum + (t.estimateHours || 0), 0);
  // Earned Value: work ACTUALLY completed from those that should be done
  const earnedValue = shouldBeDone
    .filter((t) => t.status === "done")
    .reduce((sum, t) => sum + (t.estimateHours || 0), 0);

  if (plannedValue === 0) return { value: 1.0, status: "good" };
  const spi = earnedValue / plannedValue;

  return {
    value: parseFloat(spi.toFixed(2)),
    status: spi >= 0.95 ? "good" : spi >= 0.80 ? "warning" : "critical",
  };
}

/**
 * 3. Rework Rate — % of tasks that went back to in_progress after review
 * Source: ISO 9001, Six Sigma
 * Target: < 15% (healthy), > 30% (systemic issue)
 */
export function calculateReworkRate(tasks: MockTask[]): { value: number; status: "good" | "warning" | "critical"; reworked: number } {
  // Simulate: tasks with actualHours > 1.5x estimate = likely reworked
  const eligible = tasks.filter((t) => t.status === "done" || t.status === "in_progress");
  if (eligible.length === 0) return { value: 0, status: "good", reworked: 0 };

  const reworked = eligible.filter((t) =>
    t.estimateHours > 0 && t.actualHours > t.estimateHours * 1.5
  ).length;

  const rate = (reworked / eligible.length) * 100;
  return {
    value: parseFloat(rate.toFixed(1)),
    status: rate < 15 ? "good" : rate < 30 ? "warning" : "critical",
    reworked,
  };
}

/**
 * 4. Decision Latency — avg hours from issue raised to decision made
 * Source: McKinsey OHI 2023
 * Target: < 72 hours (3 days)
 */
export function calculateDecisionLatency(): { avgHours: number; status: "good" | "warning" | "critical"; pending: number } {
  const decided = mockDecisionLog.filter((d) => d.decidedAt !== null);
  const pending = mockDecisionLog.filter((d) => d.decidedAt === null).length;

  if (decided.length === 0) return { avgHours: 0, status: "good", pending };

  const totalHours = decided.reduce((sum, d) => {
    const diffMs = new Date(d.decidedAt!).getTime() - new Date(d.raisedAt).getTime();
    return sum + diffMs / 3600000;
  }, 0);

  const avgHours = totalHours / decided.length;
  return {
    avgHours: parseFloat(avgHours.toFixed(1)),
    status: avgHours < 48 ? "good" : avgHours < 72 ? "warning" : "critical",
    pending,
  };
}

/**
 * 5. Stakeholder NPS — Net Promoter Score (Bain methodology)
 * Formula: %Promoters (9-10) − %Detractors (0-6)
 * Range: -100 to +100. Target: > +30
 */
export function calculateNPS(): { value: number; status: "good" | "warning" | "critical"; promoters: number; passives: number; detractors: number; total: number } {
  const total = mockNpsResponses.length;
  if (total === 0) return { value: 0, status: "warning", promoters: 0, passives: 0, detractors: 0, total };

  const promoters = mockNpsResponses.filter((r) => r.score >= 9).length;
  const passives = mockNpsResponses.filter((r) => r.score >= 7 && r.score <= 8).length;
  const detractors = mockNpsResponses.filter((r) => r.score <= 6).length;

  const nps = Math.round(((promoters - detractors) / total) * 100);
  return {
    value: nps,
    status: nps >= 30 ? "good" : nps >= 0 ? "warning" : "critical",
    promoters, passives, detractors, total,
  };
}

/**
 * 6. Burnout Risk Index — Maslach Burnout Inventory-inspired
 * Score per user (0-100, higher = more risk):
 * - FTE > 90% → +40
 * - FTE 80-90% → +25
 * - 3+ overdue tasks → +30
 * - 2+ blocked tasks → +20
 * - Priority-critical tasks → +10
 */
export function calculateBurnoutRisk(
  users: MockUser[],
  tasks: MockTask[],
  members: MockProjectMember[]
): { avgScore: number; status: "good" | "warning" | "critical"; atRiskUsers: { userId: string; userName: string; score: number }[] } {
  const nowMs = Date.now();
  const userScores = users.map((u) => {
    const totalFte = members.filter((m) => m.userId === u.id).reduce((sum, m) => sum + m.ftePercent, 0);
    const userTasks = tasks.filter((t) => t.assigneeId === u.id && t.status !== "done" && t.status !== "cancelled");
    const overdue = userTasks.filter((t) => t.plannedEnd && new Date(t.plannedEnd).getTime() < nowMs).length;
    const blocked = userTasks.filter((t) => t.status === "blocked").length;
    const critical = userTasks.filter((t) => t.priority === "critical").length;

    let score = 0;
    if (totalFte > 90) score += 40; else if (totalFte >= 80) score += 25;
    if (overdue >= 3) score += 30; else if (overdue > 0) score += 15;
    if (blocked >= 2) score += 20; else if (blocked > 0) score += 10;
    if (critical > 0) score += 10;

    return { userId: u.id, userName: u.name, score: Math.min(score, 100), fte: totalFte, overdue, blocked };
  });

  const avgScore = userScores.reduce((s, u) => s + u.score, 0) / Math.max(userScores.length, 1);
  const atRisk = userScores
    .filter((u) => u.score >= 50)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return {
    avgScore: parseFloat(avgScore.toFixed(1)),
    status: avgScore < 30 ? "good" : avgScore < 60 ? "warning" : "critical",
    atRiskUsers: atRisk,
  };
}

/**
 * 7. AI Recommendation Adoption Rate — Gartner AI in PM
 * Formula: Adopted Recs / Total Recs × 100
 * Target: > 60%
 */
export function calculateAiAdoptionRate(): { value: number; status: "good" | "warning" | "critical"; adopted: number; total: number } {
  const total = mockAiRecommendations.length;
  if (total === 0) return { value: 0, status: "warning", adopted: 0, total };

  const adopted = mockAiRecommendations.filter((r) => r.adopted).length;
  const rate = Math.round((adopted / total) * 100);

  return {
    value: rate,
    status: rate >= 60 ? "good" : rate >= 40 ? "warning" : "critical",
    adopted, total,
  };
}
