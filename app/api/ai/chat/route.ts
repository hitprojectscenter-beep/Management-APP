import { NextResponse } from "next/server";
import { chat, type ClaudeMessage } from "@/lib/ai/claude";
import { mockTasks, mockUsers, mockRisks, getProjects } from "@/lib/db/mock-data";
import { calculateProjectHealth } from "@/lib/ai/risk-engine";

export const runtime = "nodejs";

function buildContextSnapshot(): string {
  const projects = getProjects();
  const health = calculateProjectHealth(mockTasks);
  const overdueTasks = mockTasks.filter((t) => {
    if (!t.plannedEnd || t.status === "done" || t.status === "cancelled") return false;
    return new Date(t.plannedEnd).getTime() < Date.now();
  });
  const blockedTasks = mockTasks.filter((t) => t.status === "blocked");

  const summary = {
    totalTasks: mockTasks.length,
    projects: projects.length,
    overallHealthScore: health.score,
    completed: health.metrics.completed,
    overdue: overdueTasks.length,
    blocked: blockedTasks.length,
    activeRisks: mockRisks.filter((r) => !r.dismissed).length,
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
      .map((r) => ({
        severity: r.severity,
        type: r.type,
        message: r.message,
      })),
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
        ? `אתה Claude, העוזר החכם של Work OS - פלטפורמת ניהול פרויקטים פנים-ארגונית.

ענה תמיד בעברית, באופן ענייני, ידידותי ועם נתונים מספריים מדויקים.
אתה יכול לראות את כל הנתונים של הארגון. תן ניתוחים, תובנות, והמלצות פרקטיות.

הנה תמונת מצב נוכחית של הארגון:
${buildContextSnapshot()}`
        : `You are Claude, the intelligent assistant for Work OS - an internal project management platform.

Always answer concisely with accurate data. You can see all organization data. Provide analysis, insights, and practical recommendations.

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
