/**
 * System prompts for the Personal Assistant LLM layer.
 * + A robust heuristic fallback that works WITHOUT Claude API key.
 *
 * The heuristic parser speaks Hebrew, manages dialog, and performs
 * real actions - it is NOT just a placeholder.
 */
import {
  mockTasks,
  mockUsers,
  mockProjectMembers,
  mockWbsNodes,
  getProjects,
  CURRENT_USER_ID,
  getUserById,
  getOpenTasksForUser,
} from "../db/mock-data";
import { scanTasksForRisks, calculateProjectHealth } from "./risk-engine";

// ============================================================
// Claude system prompts (used when ANTHROPIC_API_KEY is set)
// ============================================================

export const ASSISTANT_SYSTEM_PROMPT_HE = `אתה עוזר אישי חכם של Work OS - פלטפורמת ניהול פרויקטים של המרכז למיפוי ישראל.

תפקידך: לנתח פקודה של משתמש ולהחזיר JSON מובנה שמתאר את הפעולה המבוקשת.

**אתה לא מבצע פעולות - אתה רק מזהה כוונה ומחלץ ישויות.**

כללים:
1. **לעולם אל תמציא** שמות משתמשים, שמות פרויקטים, תאריכים או נתון שלא נאמר.
2. אם משתמש אומר שם אדם - הכנס ל-assigneeNameHint. אם אומר שם פרויקט - ל-projectNameHint.
3. **תאריכים יחסיים**: "יום ראשון הקרוב", "מחר", "בעוד שבוע" → ISO (YYYY-MM-DD). היום = {{TODAY}}.
4. אם הפקודה עמומה - החזר action: "unknown" עם responseText שמבקש הבהרה בעברית.

סוגי פעולות: "create_task", "create_project", "assign_task", "update_task_status", "summarize_meeting", "query_risks", "query_tasks", "query_workload", "unknown"

סכמת JSON:
{
  "action": "...",
  "entities": {
    "title": "...", "description": "...", "projectNameHint": "...",
    "assigneeNameHint": "...", "plannedStart": "YYYY-MM-DD",
    "plannedEnd": "YYYY-MM-DD", "priority": "low|medium|high|critical",
    "status": "...", "estimateHours": 8
  },
  "confidence": 0.0-1.0,
  "responseText": "משפט קצר בעברית"
}

החזר אך ורק JSON תקין.`;

export const ASSISTANT_SYSTEM_PROMPT_EN = `You are the Personal Assistant for Work OS - the Israel Mapping Center's project management platform.

Analyze user commands and return structured JSON. You don't execute actions - only identify intent and extract entities.

Rules:
1. Never hallucinate names, dates, or any data not explicitly stated.
2. Relative dates → ISO (YYYY-MM-DD). Today = {{TODAY}}.
3. If ambiguous → action: "unknown" with responseText asking for clarification.

Actions: "create_task", "create_project", "assign_task", "update_task_status", "summarize_meeting", "query_risks", "query_tasks", "query_workload", "unknown"

Return valid JSON only.`;

export function buildSystemPrompt(locale: "he" | "en"): string {
  const today = new Date().toISOString().slice(0, 10);
  const base = locale === "he" ? ASSISTANT_SYSTEM_PROMPT_HE : ASSISTANT_SYSTEM_PROMPT_EN;
  return base.replace("{{TODAY}}", today);
}

// ============================================================
// Robust heuristic parser - works WITHOUT Claude API key.
// Speaks Hebrew, manages real dialog, provides useful answers.
// ============================================================

export function heuristicParse(
  text: string,
  locale: "he" | "en"
): {
  action: string;
  entities: any;
  confidence: number;
  responseText: string;
} {
  const lower = text.toLowerCase().trim();
  const isHe = locale === "he";
  const entities: any = {};
  const now = new Date();
  const currentUser = getUserById(CURRENT_USER_ID);

  // ---- Detect action from keywords ----
  let action = "unknown";
  let responseText = "";

  // CREATE TASK
  if (/פתח|צור|הוסף|יצור|תיצור|create|add|open|new/.test(lower) && /משימה|task/.test(lower)) {
    action = "create_task";

    // Extract title - text after "משימה (חדשה)?" up to date/project markers
    const titleMatch = text.match(
      /משימה(?:\s+חדשה)?\s+(?:של\s+|ל|בשם\s+)?[""]?(.+?)[""]?(?:\s+(?:מ(?:יום|תאריך)?|ב|ל|עד|החל|לפרויקט|בפרויקט|ולהקצות|והקצה)|$)/i
    );
    if (titleMatch) entities.title = titleMatch[1].trim();

    // Extract project hint
    const projMatch = text.match(/(?:לפרויקט|בפרויקט|פרויקט)\s+[""]?(.+?)[""]?(?:\s|$|,|\.)/i);
    if (projMatch) entities.projectNameHint = projMatch[1].trim();

    // Extract assignee hint
    const assignMatch = text.match(/(?:הקצה\s+ל|להקצות\s+ל|אחראי|ל)\s*[-:]?\s*[""]?(\S+(?:\s+\S+)?)[""]?(?:\s|$|,|\.)/i);
    if (assignMatch && !/פרויקט|משימה|יום|מחר/.test(assignMatch[1])) {
      entities.assigneeNameHint = assignMatch[1].trim();
    }

    responseText = isHe
      ? `הבנתי שאתה רוצה לפתוח משימה חדשה${entities.title ? `: "${entities.title}"` : ""}. אבדוק אילו פרטים עוד חסרים.`
      : `Got it - creating a new task${entities.title ? `: "${entities.title}"` : ""}. Let me check what info is still needed.`;
  }
  // CREATE PROJECT
  else if (/פתח|צור|create/.test(lower) && /פרויקט|project/.test(lower)) {
    action = "create_project";
    const titleMatch = text.match(/פרויקט(?:\s+חדש)?\s+(?:בשם\s+)?[""]?(.+?)[""]?(?:\s|$)/i);
    if (titleMatch) entities.title = titleMatch[1].trim();
    responseText = isHe
      ? `הבנתי - יצירת פרויקט חדש${entities.title ? `: "${entities.title}"` : ""}.`
      : `Creating a new project${entities.title ? `: "${entities.title}"` : ""}.`;
  }
  // QUERY RISKS
  else if (/סיכון|סיכונים|risk|risks|בסיכון|מה הסיכון/.test(lower)) {
    action = "query_risks";
    const risks = scanTasksForRisks(mockTasks);
    const activeRisks = risks.length;
    const blockedTasks = mockTasks.filter((t) => t.status === "blocked");
    const overdueTasks = mockTasks.filter(
      (t) => t.plannedEnd && new Date(t.plannedEnd).getTime() < Date.now() && t.status !== "done" && t.status !== "cancelled"
    );

    responseText = isHe
      ? `🔍 נמצאו ${activeRisks} סיכונים פעילים:\n• ${blockedTasks.length} משימות חסומות\n• ${overdueTasks.length} משימות באיחור\n\n${
          blockedTasks.length > 0
            ? `🚫 חסומות: ${blockedTasks.slice(0, 3).map((t) => `"${t.title}"`).join(", ")}`
            : ""
        }${
          overdueTasks.length > 0
            ? `\n⚠️ באיחור: ${overdueTasks.slice(0, 3).map((t) => `"${t.title}"`).join(", ")}`
            : ""
        }\n\n💡 לפרטים נוספים - עבור לדף "ניהול סיכונים" בתפריט.`
      : `Found ${activeRisks} active risks: ${blockedTasks.length} blocked, ${overdueTasks.length} overdue.`;
  }
  // QUERY WORKLOAD
  else if (/עומס|עמוס|workload|capacity|כמה משימות|מי פנוי|מי עמוס/.test(lower)) {
    action = "query_workload";
    const workload = mockUsers.map((u) => {
      const tasks = mockTasks.filter((t) => t.assigneeId === u.id && t.status !== "done" && t.status !== "cancelled");
      const fte = mockProjectMembers.filter((m) => m.userId === u.id).reduce((s, m) => s + m.ftePercent, 0);
      return { name: u.name, open: tasks.length, fte };
    });
    responseText = isHe
      ? `📊 עומס עבודה נוכחי:\n${workload.map((w) => `• ${w.name}: ${w.open} משימות פתוחות, ${w.fte}% הקצאה`).join("\n")}\n\n${
          workload.some((w) => w.fte > 80) ? "⚠️ יש חברי צוות בהקצאת יתר!" : "✅ העומסים מאוזנים."
        }`
      : `Workload: ${workload.map((w) => `${w.name}: ${w.open} open, ${w.fte}% FTE`).join("; ")}`;
  }
  // QUERY TASKS / STATUS
  else if (/משימות|tasks|סטטוס|status|מה קורה|מה המצב|עדכון|תן לי סיכום/.test(lower)) {
    action = "query_tasks";
    const health = calculateProjectHealth(mockTasks);
    const myTasks = currentUser ? getOpenTasksForUser(currentUser.id) : [];
    responseText = isHe
      ? `📋 סיכום מצב:\n• ציון בריאות כולל: ${health.score}/100 (${health.status === "healthy" ? "בריא ✅" : health.status === "at-risk" ? "בסיכון ⚠️" : "קריטי 🚨"})\n• ${health.metrics.completed} הושלמו מתוך ${health.metrics.total}\n• ${health.metrics.overdue} באיחור, ${health.metrics.blocked} חסומות\n${
          myTasks.length > 0
            ? `\n📌 יש לך ${myTasks.length} משימות פתוחות${myTasks.length <= 3 ? ":\n" + myTasks.map((t) => `  • "${t.title}" (${t.status === "in_progress" ? "בביצוע" : t.status === "blocked" ? "חסום" : "לא התחיל"})`).join("\n") : "."}`
            : "\n✅ אין לך משימות פתוחות!"
        }`
      : `Health: ${health.score}/100. ${health.metrics.completed}/${health.metrics.total} done. ${health.metrics.overdue} overdue.`;
  }
  // MEETING SUMMARY
  else if (/סכם|סיכום|פגישה|ישיבה|meeting|summarize|summary/.test(lower)) {
    action = "summarize_meeting";
    responseText = isHe
      ? "📝 כדי לסכם פגישה, שלח לי את הטקסט או נקודות המפתח מהפגישה, ואכין סיכום עם פעולות לביצוע (Action Items)."
      : "Send me the meeting text or key points, and I'll create a summary with action items.";
  }
  // GREETING
  else if (/שלום|היי|הי|בוקר טוב|ערב טוב|hello|hi|hey/.test(lower)) {
    action = "query_tasks"; // treat as status check
    const myTasks = currentUser ? getOpenTasksForUser(currentUser.id) : [];
    responseText = isHe
      ? `שלום ${currentUser?.name?.split(" ")[0] || ""}! 👋\nיש לך ${myTasks.length} משימות פתוחות.\n\nאיך אוכל לעזור? אפשר:\n• "פתח משימה חדשה..."\n• "מה הסיכונים?"\n• "מה המצב בפרויקט CRM?"\n• "מי הכי עמוס?"`
      : `Hello ${currentUser?.name?.split(" ")[0] || ""}! You have ${myTasks.length} open tasks. How can I help?`;
  }
  // HELP
  else if (/עזרה|help|מה אתה יכול|מה אפשר/.test(lower)) {
    action = "query_tasks";
    responseText = isHe
      ? "🤖 אני יכול לעזור עם:\n\n📋 **משימות**: \"פתח משימה חדשה לבדיקת שרתים\"\n📊 **סטטוס**: \"מה המצב?\" / \"תן לי סיכום\"\n⚠️ **סיכונים**: \"מה הסיכונים?\" / \"מה בסיכון?\"\n👥 **עומסים**: \"מי הכי עמוס?\" / \"מי פנוי?\"\n📝 **פגישות**: \"סכם את הפגישה\"\n\nאפשר לכתוב או להקליט 🎤"
      : "I can help with: creating tasks, checking status, risks, workload, and meeting summaries.";
  }
  // UNKNOWN - give helpful response instead of "Understood"
  else {
    action = "unknown";
    responseText = isHe
      ? `🤔 לא הצלחתי להבין בדיוק מה לעשות עם: "${text.slice(0, 50)}${text.length > 50 ? "..." : ""}"\n\nנסה לנסח אחרת, למשל:\n• "פתח משימה חדשה ל..."\n• "מה הסיכונים בפרויקט...?"\n• "מה המצב?"\n• "מי הכי עמוס?"`
      : `I didn't quite understand: "${text.slice(0, 50)}". Try: "Create a task for...", "What are the risks?", or "What's the status?"`;
  }

  // ---- Extract dates ----
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  if (/מחר|tomorrow/.test(lower)) {
    if (!entities.plannedStart) entities.plannedStart = tomorrow.toISOString().slice(0, 10);
  }
  if (/היום|today/.test(lower)) {
    if (!entities.plannedStart) entities.plannedStart = now.toISOString().slice(0, 10);
  }
  // "בעוד X ימים"
  const daysMatch = text.match(/בעוד\s+(\d+)\s+ימים/);
  if (daysMatch) {
    const d = new Date(now);
    d.setDate(now.getDate() + parseInt(daysMatch[1]));
    if (!entities.plannedEnd) entities.plannedEnd = d.toISOString().slice(0, 10);
  }
  // "עד יום X" / "עד ה-X"
  const untilMatch = text.match(/עד\s+(?:יום\s+)?(?:ה-?)?(\d{1,2})(?:\s*[./]\s*(\d{1,2}))?/);
  if (untilMatch) {
    const day = parseInt(untilMatch[1]);
    const month = untilMatch[2] ? parseInt(untilMatch[2]) - 1 : now.getMonth();
    const d = new Date(now.getFullYear(), month, day);
    if (d.getTime() < now.getTime()) d.setMonth(d.getMonth() + 1);
    entities.plannedEnd = d.toISOString().slice(0, 10);
  }

  // ---- Extract priority ----
  if (/קריטי|critical|דחוף|urgent/.test(lower)) entities.priority = "critical";
  else if (/גבוה|high|חשוב/.test(lower)) entities.priority = "high";
  else if (/נמוך|low/.test(lower)) entities.priority = "low";

  return {
    action,
    entities,
    confidence: action === "unknown" ? 0.3 : 0.75,
    responseText,
  };
}
