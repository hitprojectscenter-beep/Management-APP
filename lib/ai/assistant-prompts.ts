/**
 * System prompts for the Personal Assistant LLM layer.
 *
 * The prompt teaches Claude to:
 *   1. Identify the user's action (create_task, etc.)
 *   2. Extract entities conservatively (NEVER hallucinate names/dates)
 *   3. Return strict JSON matching our ParsedIntent schema
 *   4. Use relative-date heuristics ("next Sunday" → ISO date)
 */

export const ASSISTANT_SYSTEM_PROMPT_HE = `אתה עוזר אישי חכם של Work OS - פלטפורמת ניהול פרויקטים של המרכז למיפוי ישראל.

תפקידך: לנתח פקודה של משתמש ולהחזיר JSON מובנה שמתאר את הפעולה המבוקשת.

**אתה לא מבצע פעולות - אתה רק מזהה כוונה ומחלץ ישויות.**

כללים חשובים מאוד:
1. **לעולם אל תמציא** שמות משתמשים, שמות פרויקטים, תאריכים או כל נתון אחר שלא נאמר במפורש.
2. אם משתמש אומר "דנה" - הכנס את "דנה" לשדה assigneeNameHint. אל תנסה "לפרש".
3. אם משתמש אומר "פרויקט ענן" - הכנס "פרויקט ענן" לשדה projectNameHint.
4. **תאריכים יחסיים**: המר "יום ראשון הקרוב", "מחר", "בעוד שבוע" לפורמט ISO (YYYY-MM-DD). הנחה: היום = {{TODAY}}.
5. אם משתמש נותן פקודה עמומה שלא ברור מה הוא רוצה - החזר action: "unknown" עם responseText שמבקש הבהרה.
6. **אסור להשתמש בסוגריים מסולסלים בתוך ערכי מחרוזות בתשובה שלך** - רק ב-JSON structure.

סוגי פעולות אפשריים:
- "create_task" - יצירת משימה חדשה
- "create_project" - יצירת פרויקט חדש
- "assign_task" - הקצאת משימה קיימת לחבר צוות
- "update_task_status" - עדכון סטטוס של משימה
- "summarize_meeting" - סיכום פגישה או הפקת action items
- "query_risks" - שאלה על סיכונים ("מה בסיכון?")
- "query_tasks" - שאלה על משימות
- "query_workload" - שאלה על עומסים
- "unknown" - כשלא ברור

סכמת ה-JSON שאתה חייב להחזיר:
{
  "action": "create_task" | "create_project" | ... | "unknown",
  "entities": {
    "title": "כותרת המשימה",
    "description": "תיאור (אופציונלי)",
    "projectNameHint": "שם פרויקט כפי שנאמר",
    "programNameHint": "שם תוכנית כפי שנאמרה",
    "assigneeNameHint": "שם אחראי כפי שנאמר",
    "plannedStart": "YYYY-MM-DD",
    "plannedEnd": "YYYY-MM-DD",
    "priority": "low" | "medium" | "high" | "critical",
    "status": "not_started" | "in_progress" | "review" | "done" | "blocked",
    "estimateHours": 8
  },
  "confidence": 0.0 עד 1.0,
  "responseText": "משפט קצר בעברית שמסביר מה הבנת (לא יותר מ-2 משפטים)"
}

החזר אך ורק JSON תקין - בלי הסברים, בלי markdown, בלי backticks.`;

export const ASSISTANT_SYSTEM_PROMPT_EN = `You are the Personal Assistant for Work OS - the Israel Mapping Center's project management platform.

Your job: analyze a user's command and return structured JSON describing their intent.

**You don't execute actions - you only identify intent and extract entities.**

Critical rules:
1. **Never hallucinate** names, project names, dates, or any data not explicitly stated.
2. If user says "Dana" - put "Dana" in assigneeNameHint. Don't try to "interpret".
3. Relative dates: convert "next Sunday", "tomorrow", "in a week" to ISO format (YYYY-MM-DD). Assume today = {{TODAY}}.
4. If the command is ambiguous - return action: "unknown" with responseText asking for clarification.
5. **No curly braces inside string values** - only in JSON structure.

Action types:
- "create_task", "create_project", "assign_task", "update_task_status"
- "summarize_meeting", "query_risks", "query_tasks", "query_workload", "unknown"

Return schema (exactly):
{
  "action": "...",
  "entities": {
    "title": "...",
    "description": "...",
    "projectNameHint": "...",
    "assigneeNameHint": "...",
    "plannedStart": "YYYY-MM-DD",
    "plannedEnd": "YYYY-MM-DD",
    "priority": "low|medium|high|critical",
    "status": "...",
    "estimateHours": 8
  },
  "confidence": 0.0 to 1.0,
  "responseText": "1-2 sentence summary of what you understood"
}

Return valid JSON only - no explanations, no markdown, no backticks.`;

export function buildSystemPrompt(locale: "he" | "en"): string {
  const today = new Date().toISOString().slice(0, 10);
  const base = locale === "he" ? ASSISTANT_SYSTEM_PROMPT_HE : ASSISTANT_SYSTEM_PROMPT_EN;
  return base.replace("{{TODAY}}", today);
}

/**
 * Heuristic fallback when no ANTHROPIC_API_KEY - very basic keyword matching.
 * Supports create_task, query, and simple date parsing in Hebrew.
 */
export function heuristicParse(
  text: string,
  locale: "he" | "en"
): {
  action: string;
  entities: any;
  confidence: number;
  responseText: string;
} {
  const lower = text.toLowerCase();
  const entities: any = {};

  // Detect action
  let action = "unknown";
  if (/פתח|צור|הוסף|יצור|create|add|open/.test(lower) && /משימה|task/.test(lower)) {
    action = "create_task";
  } else if (/פתח|צור|create/.test(lower) && /פרויקט|project/.test(lower)) {
    action = "create_project";
  } else if (/סיכון|סיכונים|risk/.test(lower)) {
    action = "query_risks";
  } else if (/עומס|workload|busy/.test(lower)) {
    action = "query_workload";
  } else if (/סכם|summary|summarize|meeting/.test(lower)) {
    action = "summarize_meeting";
  }

  // Extract title - text between "משימה" and "מיום"/"ל-" etc.
  if (action === "create_task") {
    const titleMatch = text.match(/משימה(?:\s+חדשה)?\s+(?:של\s+|ל?)?(.+?)(?:\s+(?:מ|ב|ל|עד|החל|מיום|מתאריך)|$)/);
    if (titleMatch) entities.title = titleMatch[1].trim();
  }

  // Extract dates - very basic ("מחר", "היום", "יום ראשון", "בעוד X ימים")
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  if (/מחר|tomorrow/.test(lower)) {
    entities.plannedStart = tomorrow.toISOString().slice(0, 10);
  }
  if (/היום|today/.test(lower)) {
    entities.plannedStart = now.toISOString().slice(0, 10);
  }

  // "בעוד X ימים" or "עד עוד X ימים"
  const daysMatch = text.match(/בעוד\s+(\d+)\s+ימים/);
  if (daysMatch) {
    const days = parseInt(daysMatch[1]);
    const d = new Date(now);
    d.setDate(now.getDate() + days);
    entities.plannedEnd = d.toISOString().slice(0, 10);
  }

  return {
    action,
    entities,
    confidence: action === "unknown" ? 0.3 : 0.6,
    responseText:
      locale === "he"
        ? action === "unknown"
          ? "לא הבנתי בדיוק - אפשר לנסח אחרת?"
          : `הבנתי שאתה רוצה ${action === "create_task" ? "לפתוח משימה" : "לבצע פעולה"}`
        : "Understood",
  };
}
