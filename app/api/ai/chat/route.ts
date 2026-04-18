import { NextResponse } from "next/server";
import { chat, type ClaudeMessage } from "@/lib/ai/claude";
import { mockTasks, mockUsers, mockRisks, mockProjectMembers, getProjects } from "@/lib/db/mock-data";
import {
  calculateProjectHealth,
  detectResourceBottlenecks,
  predictProjectEndDate,
  generateActiveRecommendations,
  scanTasksForRisks,
} from "@/lib/ai/risk-engine";
import { generateMitigationPlan } from "@/lib/ai/mitigation-engine";

export const runtime = "nodejs";

function buildContextSnapshot(): string {
  const projects = getProjects();
  const health = calculateProjectHealth(mockTasks);
  const overdueTasks = mockTasks.filter((t) => {
    if (!t.plannedEnd || t.status === "done" || t.status === "cancelled") return false;
    return new Date(t.plannedEnd).getTime() < Date.now();
  });
  const blockedTasks = mockTasks.filter((t) => t.status === "blocked");

  // === Enhanced AI analyses ===
  const bottlenecks = detectResourceBottlenecks(mockUsers, mockProjectMembers, mockTasks);
  const forecast = predictProjectEndDate(mockTasks);
  const recommendations = generateActiveRecommendations(mockTasks, mockUsers, mockProjectMembers);
  const dynamicRisks = scanTasksForRisks(mockTasks);
  const mitigationPlan = generateMitigationPlan(mockTasks, mockUsers, mockProjectMembers);

  const summary = {
    totalTasks: mockTasks.length,
    projects: projects.length,
    overallHealthScore: health.score,
    completed: health.metrics.completed,
    overdue: overdueTasks.length,
    blocked: blockedTasks.length,
    activeRisks: mockRisks.filter((r) => !r.dismissed).length + dynamicRisks.length,
    teamMembers: mockUsers.length,
    projectsList: projects.map((p) => ({ id: p.id, name: p.name, nameEn: p.nameEn })),
    overdueTasks: overdueTasks.slice(0, 5).map((t) => ({
      title: t.title,
      assignee: mockUsers.find((u) => u.id === t.assigneeId)?.name,
      dueDate: t.plannedEnd,
    })),
    blockedTasks: blockedTasks.map((t) => ({
      title: t.title,
      assignee: mockUsers.find((u) => u.id === t.assigneeId)?.name,
    })),
    risks: mockRisks
      .filter((r) => !r.dismissed)
      .map((r) => ({ severity: r.severity, type: r.type, message: r.message })),
    aiDetectedRisks: dynamicRisks.slice(0, 10),
    // === New AI insights ===
    resourceBottlenecks: bottlenecks.map((b) => ({
      user: b.userName,
      fte: b.totalFte,
      severity: b.severity,
      criticalAssignments: b.criticalAssignments,
      message: b.message,
      recommendation: b.recommendation,
    })),
    forecast: forecast
      ? {
          plannedEnd: forecast.plannedEnd.toISOString(),
          forecastEnd: forecast.forecastEnd.toISOString(),
          delayDays: forecast.delayDays,
          confidence: forecast.confidence,
          velocityActual: forecast.velocityActual.toFixed(1),
          velocityRequired: forecast.velocityRequired.toFixed(1),
          insight: forecast.insight,
        }
      : null,
    activeRecommendations: recommendations.map((r) => ({
      priority: r.priority,
      category: r.category,
      title: r.title,
      detail: r.detail,
      action: r.actionLabel,
    })),
    // === Mitigation plan: AI-suggested actions ===
    mitigationPlan: {
      summary: mitigationPlan.summary,
      reassignments: mitigationPlan.reassignments.slice(0, 5).map((r) => ({
        task: r.taskTitle,
        from: r.fromUserName,
        to: r.toUserName,
        matchScore: r.matchScore,
        reasoning: r.reasoning,
      })),
      strategies: mitigationPlan.strategies.slice(0, 5).map((s) => ({
        task: s.taskTitle,
        riskType: s.riskType,
        severity: s.riskSeverity,
        preferredAction: s.preferredAction.title,
        actionDetail: s.preferredAction.detail,
      })),
      earlyWarnings: mitigationPlan.earlyWarnings,
    },
  };

  return JSON.stringify(summary, null, 2);
}

export async function POST(req: Request) {
  try {
    const { messages, locale } = (await req.json()) as {
      messages: ClaudeMessage[];
      locale: "he" | "en";
    };

    const systemPrompt =
      locale === "he"
        ? `אתה Claude, העוזר החכם של PMO++ - פלטפורמת ניהול פרויקטים פנים-ארגונית.

ענה תמיד בעברית, באופן ענייני, ידידותי וקצר (עד 5-6 משפטים).
אתה רואה את כל הנתונים של הארגון, כולל ניתוחי AI מתקדמים: צווארי בקבוק במשאבים, חיזוי תאריכי סיום, ניתוח אפקט שרשרת, והמלצות פעולה אקטיביות.

חוקים לניסוח התשובה:
1. **תמיד התחל מהמסקנה המעשית** - לא מההסבר. אם נשאלת "מה הסיכונים?" - תן את 1-3 הסיכונים המובילים תחילה, אחר כך הקשר.
2. **השתמש במספרים** - "3 משימות באיחור", "47% הקצאת יתר", לא "כמה משימות באיחור".
3. **תן המלצה אקטיבית** - לכל בעיה שאתה מציין, ציין מה לעשות עכשיו.
4. **ציטט שמות אמיתיים** - של פרויקטים, משתמשים ומשימות מהנתונים, לא טקסט גנרי.
5. **השתמש באייקונים בפתיחה**: 🚨 לקריטי, ⚠️ לאזהרה, ✅ למצב טוב, 💡 להמלצה.

הנה תמונת מצב נוכחית של הארגון:
${buildContextSnapshot()}`
        : `You are Claude, the intelligent assistant for PMO++ - an internal project management platform.

Answer concisely (5-6 sentences max). You see all organization data including AI analyses: resource bottlenecks, end-date forecasts, cascade impact analysis, and active recommendations.

Response rules:
1. **Lead with the practical conclusion** - not the explanation. If asked "what are the risks?", give the top 1-3 first, then context.
2. **Use numbers** - "3 tasks overdue", "47% over-allocated", not "some tasks".
3. **Give an active recommendation** - for every issue, say what to do now.
4. **Quote real names** - of projects, users, tasks from the data, not generic text.
5. **Open with icons**: 🚨 critical, ⚠️ warning, ✅ good, 💡 recommendation.

Here's the current organization snapshot:
${buildContextSnapshot()}`;

    const reply = await chat(messages, systemPrompt);

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("AI chat error:", error);
    return NextResponse.json(
      {
        error:
          "AI not available. Set ANTHROPIC_API_KEY in .env.local to enable. " +
          (error instanceof Error ? error.message : ""),
      },
      { status: 500 }
    );
  }
}
