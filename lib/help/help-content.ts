/**
 * Knowledge base for the help bot.
 * Each entry has keywords (for matching) and structured answers.
 * The bot first tries keyword match; if no match and Claude API is set,
 * it falls back to AI with the full knowledge base as context.
 */

export interface HelpEntry {
  id: string;
  keywords: { he: string[]; en: string[] };
  question: { he: string; en: string };
  answer: { he: string; en: string };
  category: "navigation" | "tasks" | "projects" | "ai" | "general" | "settings";
}

export const HELP_ENTRIES: HelpEntry[] = [
  {
    id: "what-is-workos",
    category: "general",
    keywords: {
      he: ["מה זה", "work os", "וורק", "מערכת", "אפליקציה", "יישום"],
      en: ["what is", "work os", "system", "application", "about"],
    },
    question: { he: "מה זה Work OS?", en: "What is Work OS?" },
    answer: {
      he: "Work OS היא פלטפורמת ניהול פרויקטים פנים-ארגונית. היא מחברת בין אסטרטגיה לביצוע - עם תמיכה מלאה בעברית, AI מובנה לזיהוי סיכונים, וכל הכלים שצריך: Gantt, Kanban, יומן, דשבורדים, ואינטגרציה עם Google Calendar.",
      en: "Work OS is an internal project management platform. It connects strategy with execution - with full Hebrew support, built-in AI for risk detection, and all the tools you need: Gantt, Kanban, calendar, dashboards, and Google Calendar integration.",
    },
  },
  {
    id: "add-task",
    category: "tasks",
    keywords: {
      he: ["איך מוסיפים", "ליצור משימה", "להוסיף משימה", "משימה חדשה", "+", "להוסיף"],
      en: ["add task", "create task", "new task", "+", "how to add"],
    },
    question: { he: "איך אוסיף משימה חדשה?", en: "How do I add a new task?" },
    answer: {
      he: 'לחץ על כפתור ה-"+" הכחול בעמוד הבית (ליד שורת הטאבים), או היכנס לדף פרויקט ספציפי ולחץ "משימה חדשה". יופיע חלון בו תוכל למלא: כותרת, תיאור, פרויקט, אחראי, תאריכים, עדיפות והערכת שעות.',
      en: 'Click the blue "+" button on the home page (next to the tabs), or open a specific project and click "New task". A dialog will appear where you fill: title, description, project, assignee, dates, priority, and hours estimate.',
    },
  },
  {
    id: "filter-tasks",
    category: "tasks",
    keywords: {
      he: ["סינון", "לסנן", "טאבים", "קטגוריה", "סטטוס", "באיחור"],
      en: ["filter", "tabs", "category", "status", "overdue"],
    },
    question: { he: "איך אסנן את המשימות שלי?", en: "How do I filter my tasks?" },
    answer: {
      he: "בעמוד הבית יש 7 טאבים מעל רשימת המשימות: הכל / בביצוע / לא התחילו / בבדיקה / חסומות / באיחור / לפי פרויקט. לחיצה על טאב מסננת מיד. הטאב 'לפי פרויקט' מקבץ את המשימות תחת הפרויקט המתאים.",
      en: "On the home page there are 7 tabs above the tasks list: All / In Progress / Not Started / In Review / Blocked / Overdue / By Project. Click any tab to filter immediately. 'By Project' groups tasks under their parent project.",
    },
  },
  {
    id: "task-time-remaining",
    category: "tasks",
    keywords: {
      he: ["זמן נותר", "דדליין", "צבע", "אדום", "ירוק", "צהוב", "כתום"],
      en: ["time remaining", "deadline", "color", "red", "green", "amber"],
    },
    question: { he: "מה משמעות הצבעים על המשימות?", en: "What do the task colors mean?" },
    answer: {
      he: "כל משימה מציגה תווית עם 'זמן נותר עד הדדליין':\n🟢 ירוק = מעל 2 ימים נותרו (רגוע)\n🟡 צהוב = פחות מ-2 ימים (התחל לעבוד)\n🔴 אדום = באיחור (פעולה נדרשת!)",
      en: "Each task shows a 'time until deadline' badge:\n🟢 Green = more than 2 days left (relaxed)\n🟡 Amber = less than 2 days (start working)\n🔴 Red = overdue (action needed!)",
    },
  },
  {
    id: "what-is-fte",
    category: "projects",
    keywords: {
      he: ["fte", "אחוז משרה", "הקצאה", "משרה", "משתתף", "הקצאת יתר"],
      en: ["fte", "allocation", "percent", "over-allocation", "participation"],
    },
    question: { he: "מה זה FTE ואחוז משרה?", en: "What is FTE / allocation %?" },
    answer: {
      he: "FTE = Full-Time Equivalent. כל משתתף בפרויקט מקבל אחוז משרה - כמה מזמן העבודה שלו מוקצה לפרויקט. לדוגמה: 50% = חצי משרה, 100% = משרה מלאה. אם הסך של משתמש עובר 100% - יש הקצאת יתר ותקבל אזהרה אדומה. תמצא את נתוני ה-FTE שלך בעמוד הבית בפאנל הצדדי 'ההשתתפות שלי'.",
      en: "FTE = Full-Time Equivalent. Each project member gets an allocation % - how much of their work time goes to the project. E.g. 50% = half time, 100% = full time. If a user's total exceeds 100% - it's over-allocated and shows a red warning. You'll find your FTE breakdown in the home page side panel 'My Participation'.",
    },
  },
  {
    id: "wbs",
    category: "projects",
    keywords: {
      he: ["wbs", "מבנה", "היררכיה", "פרוגרמה", "פורטפוליו", "אבן דרך", "אקטיביטי"],
      en: ["wbs", "hierarchy", "structure", "program", "portfolio", "milestone"],
    },
    question: { he: "מה זה WBS ואיך עובדת ההיררכיה?", en: "What is WBS and how does the hierarchy work?" },
    answer: {
      he: "WBS = Work Breakdown Structure (מבנה עבודה היררכי). ההיררכיה בWork OS היא:\n📁 Portfolio (פורטפוליו)\n └ 📂 Program (תוכנית)\n   └ 📋 Project (פרויקט)\n     └ 🎯 Goal (יעד)\n       └ 🚩 Milestone (אבן דרך)\n         └ ⚙️ Activity (פעילות עם תוצר)\n           └ ✅ Task (משימה)\n             └ 📌 Subtask (תת-משימה)\n\nתוכל לראות את הציר הזה בכל דף פרויקט בצד.",
      en: "WBS = Work Breakdown Structure. The hierarchy in Work OS is:\n📁 Portfolio\n └ 📂 Program\n   └ 📋 Project\n     └ 🎯 Goal\n       └ 🚩 Milestone\n         └ ⚙️ Activity (with deliverable)\n           └ ✅ Task\n             └ 📌 Subtask\n\nYou can see this tree on every project detail page.",
    },
  },
  {
    id: "views",
    category: "projects",
    keywords: {
      he: ["תצוגה", "גאנט", "קנבן", "רשימה", "יומן", "תצוגות"],
      en: ["view", "gantt", "kanban", "list", "calendar"],
    },
    question: { he: "אילו תצוגות יש לפרויקט?", en: "What views are available for a project?" },
    answer: {
      he: "כל פרויקט מציע 4 תצוגות שונות שאפשר להחליף ביניהן בלחיצה:\n📋 רשימה - טבלה עם כל המידע\n🎴 קנבן - עמודות לפי סטטוס עם drag & drop\n📊 גאנט - ציר זמן עם תלויות (תומך RTL מלא!)\n📅 יומן - תצוגה חודשית\n\nכל אחת מתאימה לסוג עבודה אחר.",
      en: "Each project offers 4 different views you can switch between:\n📋 List - table with all info\n🎴 Kanban - columns by status with drag & drop\n📊 Gantt - timeline with dependencies (full RTL support!)\n📅 Calendar - monthly view\n\nEach suits a different way of working.",
    },
  },
  {
    id: "ai-sidekick-vs-help",
    category: "ai",
    keywords: {
      he: ["ai", "סייד קיק", "בוט", "צאט", "עוזר חכם", "claude"],
      en: ["ai", "sidekick", "bot", "chat", "assistant", "claude"],
    },
    question: {
      he: "מה ההבדל בין AI Sidekick לבוט העזרה?",
      en: "What's the difference between AI Sidekick and the Help Bot?",
    },
    answer: {
      he: "שני בוטים שונים לגמרי!\n\n🪄 **AI Sidekick** (במרכז AI) - עונה על שאלות על **הנתונים שלך**: 'אילו פרויקטים בסיכון?', 'מי הכי עמוס?', 'סכם לי את השבוע'.\n\n❓ **בוט עזרה** (כפתור ?) - עונה על שאלות על **השימוש במערכת**: 'איך מוסיפים משימה?', 'מה זה FTE?', 'איך מסננים?'",
      en: "Two completely different bots!\n\n🪄 **AI Sidekick** (in AI Center) - answers questions about **your data**: 'Which projects are at risk?', 'Who is busiest?', 'Summarize my week'.\n\n❓ **Help Bot** (? button) - answers questions about **using the system**: 'How do I add a task?', 'What is FTE?', 'How to filter?'",
    },
  },
  {
    id: "ai-risks",
    category: "ai",
    keywords: {
      he: ["סיכונים", "ai", "זיהוי", "התראה", "קריטי"],
      en: ["risks", "detection", "alert", "critical"],
    },
    question: { he: "איך פועל זיהוי הסיכונים האוטומטי?", en: "How does automatic risk detection work?" },
    answer: {
      he: "מנוע ה-AI סורק את כל המשימות באופן רציף ומזהה 5 סוגי סיכונים:\n1. **באיחור** - עברו את הדדליין\n2. **חסום** - יותר מ-24 שעות\n3. **חריגת מאמץ** - שעות בפועל מעל 120% מהערכה\n4. **התקדמות איטית** - אחוזי ביצוע נמוכים מהזמן שעבר\n5. **קריטי לא התחיל** - עדיפות קריטית עם פחות מ-3 ימים להתחלה\n\nתראה את כל הסיכונים במרכז ה-AI עם הצעות לפעולה.",
      en: "The AI engine continuously scans all tasks and detects 5 types of risks:\n1. **Overdue** - past deadline\n2. **Blocked** - more than 24h\n3. **Effort overrun** - actual hours over 120% of estimate\n4. **Schedule slip** - progress below elapsed time\n5. **Critical not started** - critical priority with less than 3 days to start\n\nSee all risks in the AI Center with action suggestions.",
    },
  },
  {
    id: "language",
    category: "settings",
    keywords: {
      he: ["שפה", "עברית", "אנגלית", "להחליף", "rtl"],
      en: ["language", "hebrew", "english", "switch", "rtl"],
    },
    question: { he: "איך מחליפים שפה?", en: "How do I switch language?" },
    answer: {
      he: "לחץ על כפתור הגלובוס 🌐 בסרגל העליון. השפה מתחלפת מיד וגם כיוון הכתיבה (עברית = RTL, אנגלית = LTR). ברירת המחדל היא עברית.",
      en: "Click the globe 🌐 button in the top bar. Language switches immediately along with text direction (Hebrew = RTL, English = LTR). Default is Hebrew.",
    },
  },
  {
    id: "dark-mode",
    category: "settings",
    keywords: {
      he: ["כהה", "דארק", "ערכת נושא", "צבעים"],
      en: ["dark", "theme", "mode", "colors"],
    },
    question: { he: "איך עוברים למצב כהה?", en: "How do I switch to dark mode?" },
    answer: {
      he: "לחץ על אייקון השמש/הירח בסרגל העליון. כל הצבעים, הגרפים והקומפוננטות מתאימים את עצמם אוטומטית.",
      en: "Click the sun/moon icon in the top bar. All colors, charts and components automatically adapt.",
    },
  },
  {
    id: "google-calendar",
    category: "settings",
    keywords: {
      he: ["יומן", "calendar", "google", "סנכרון"],
      en: ["calendar", "google", "sync"],
    },
    question: { he: "איך מסנכרנים עם Google Calendar?", en: "How do I sync with Google Calendar?" },
    answer: {
      he: "במצב הדגמה הסנכרון מוצג כתשתית מוכנה. כדי להפעיל באמת: צריך להוסיף GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET ב-.env.local. אז כל משימה עם תאריך תופיע גם ב-Google Calendar שלך, ושינויים בקלנדר יחזרו אוטומטית למערכת.",
      en: "In demo mode the sync is shown as ready infrastructure. To actually enable: add GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET to .env.local. Then every task with a date appears in your Google Calendar, and changes in the calendar flow back into the system automatically.",
    },
  },
  {
    id: "rbac",
    category: "settings",
    keywords: {
      he: ["הרשאות", "תפקיד", "rbac", "אדמין", "מנהל"],
      en: ["permissions", "role", "rbac", "admin", "manager"],
    },
    question: { he: "איך עובדות ההרשאות?", en: "How do permissions work?" },
    answer: {
      he: "Work OS משתמשת ב-RBAC (Role-Based Access Control) עם 5 תפקידים:\n👑 **Admin** - הכל\n📊 **Manager** - יוצר/עורך פרויקטים ומשימות\n🧑‍💻 **Member** - מעדכן משימות שהוקצו לו\n👁️ **Viewer** - רק קריאה + תגובות\n🚪 **Guest** - גישה מוגבלת לפרויקטים ספציפיים",
      en: "Work OS uses RBAC (Role-Based Access Control) with 5 roles:\n👑 **Admin** - full access\n📊 **Manager** - create/edit projects and tasks\n🧑‍💻 **Member** - update assigned tasks\n👁️ **Viewer** - read-only + comments\n🚪 **Guest** - limited access to specific projects",
    },
  },
  {
    id: "dashboard-vs-home",
    category: "navigation",
    keywords: {
      he: ["לוח", "דשבורד", "הבית", "הבדל"],
      en: ["dashboard", "home", "landing", "difference"],
    },
    question: {
      he: "מה ההבדל בין 'המשימות שלי' ל'לוח מחוונים'?",
      en: "What's the difference between 'My Tasks' and 'Dashboard'?",
    },
    answer: {
      he: "🏠 **המשימות שלי** (דף הבית) - תצוגה אישית של מה **אתה** צריך לעשות. המשימות הפתוחות שלך, ההקצאות שלך, הפרויקטים שלך.\n\n📊 **לוח מחוונים** - תצוגת על של **כל הארגון**: KPIs, גרפים, עומס צוות כולל, תובנות AI. יותר למנהלים.",
      en: "🏠 **My Tasks** (home) - personal view of what **you** need to do. Your open tasks, allocations, projects.\n\n📊 **Dashboard** - high-level view of **the entire organization**: KPIs, charts, team workload, AI insights. More for managers.",
    },
  },
  {
    id: "tour-restart",
    category: "general",
    keywords: {
      he: ["סיור", "מדריך", "תור", "הדרכה", "להתחיל מחדש"],
      en: ["tour", "guide", "walkthrough", "restart"],
    },
    question: { he: "איך מפעילים מחדש את הסיור?", en: "How do I restart the tour?" },
    answer: {
      he: 'לחץ על כפתור העזרה (?) בסרגל העליון, ובחר "התחל סיור". זה יפעיל מחדש את המדריך האינטראקטיבי של 11 השלבים.',
      en: 'Click the help (?) button in the top bar and select "Start Tour". This restarts the 11-step interactive walkthrough.',
    },
  },
];

/**
 * Find matching help entries by keywords (simple scoring).
 */
export function findHelpByKeywords(query: string, locale: "he" | "en"): HelpEntry[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const scored = HELP_ENTRIES.map((entry) => {
    let score = 0;
    const keywords = entry.keywords[locale];
    for (const kw of keywords) {
      if (q.includes(kw.toLowerCase())) {
        score += kw.length; // longer matches = better
      }
    }
    // Also check question itself
    const question = entry.question[locale].toLowerCase();
    if (question.includes(q) || q.includes(question.slice(0, 10))) {
      score += 5;
    }
    return { entry, score };
  })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return scored.map((s) => s.entry);
}

/**
 * Format the entire knowledge base as system prompt context for the AI fallback.
 */
export function formatKnowledgeBaseForAI(locale: "he" | "en"): string {
  return HELP_ENTRIES.map(
    (e) =>
      `Q: ${e.question[locale]}\nA: ${e.answer[locale]}\n[category: ${e.category}]`
  ).join("\n\n---\n\n");
}
