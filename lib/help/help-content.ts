/**
 * Comprehensive Knowledge Base for the Help Bot.
 * Covers ALL features and objects in Work OS.
 *
 * Categories: navigation, tasks, projects, gantt, wbs, risks, ai,
 *             assistant, team, admin, automations, settings, general
 */

export interface HelpEntry {
  id: string;
  keywords: { he: string[]; en: string[] };
  question: { he: string; en: string };
  answer: { he: string; en: string };
  category: string;
}

export const HELP_ENTRIES: HelpEntry[] = [
  // ============================================================
  // GENERAL
  // ============================================================
  {
    id: "what-is-workos",
    category: "general",
    keywords: { he: ["מה זה", "work os", "וורק", "מערכת", "אפליקציה", "יישום", "למה"], en: ["what is", "work os", "system", "about", "why"] },
    question: { he: "מה זה Work OS?", en: "What is Work OS?" },
    answer: {
      he: "Work OS היא פלטפורמת ניהול פרויקטים פנים-ארגונית של המרכז למיפוי ישראל. היא מגשרת בין אסטרטגיה לביצוע - עם תמיכה מלאה בעברית RTL, עוזר אישי קולי מבוסס AI, ניהול סיכונים פרואקטיבי, לוח גאנט, WBS, קנבן, דשבורדים ותמיכה ב-5 שפות.",
      en: "Work OS is the Israel Mapping Center's internal project management platform, bridging strategy and execution with full Hebrew RTL, AI voice assistant, proactive risk management, Gantt, WBS, Kanban, dashboards, and 5 languages.",
    },
  },
  {
    id: "tour-restart",
    category: "general",
    keywords: { he: ["סיור", "מדריך", "תור", "הדרכה", "מחדש", "איך מתחילים"], en: ["tour", "guide", "walkthrough", "restart", "getting started"] },
    question: { he: "איך מפעילים את הסיור המודרך?", en: "How to restart the guided tour?" },
    answer: {
      he: "לחץ על כפתור העזרה (?) בסרגל העליון ובחר \"סיור אינטראקטיבי\". הסיור בן 12 שלבים מכסה את כל האזורים המרכזיים. אפשר לדלג, לחזור אחורה, או לסגור בכל שלב.",
      en: "Click the help (?) button in the top bar and select 'Interactive Tour'. The 12-step tour covers all key areas. You can skip, go back, or close at any step.",
    },
  },
  {
    id: "languages",
    category: "general",
    keywords: { he: ["שפה", "עברית", "אנגלית", "רוסית", "צרפתית", "ספרדית", "להחליף", "rtl", "שפות"], en: ["language", "hebrew", "english", "russian", "french", "spanish", "switch", "rtl"] },
    question: { he: "אילו שפות נתמכות ואיך מחליפים?", en: "What languages are supported?" },
    answer: {
      he: "המערכת תומכת ב-5 שפות: עברית 🇮🇱, אנגלית 🇬🇧, רוסית 🇷🇺, צרפתית 🇫🇷 וספרדית 🇪🇸. לחץ על אייקון הגלובוס 🌐 בסרגל העליון ובחר שפה. השפה מזוהה אוטומטית לפי הגדרות הדפדפן שלך. עברית = RTL מלא, כולל הגאנט!",
      en: "5 languages: Hebrew 🇮🇱, English 🇬🇧, Russian 🇷🇺, French 🇫🇷, Spanish 🇪🇸. Click the globe 🌐 in the top bar. Auto-detected from browser settings.",
    },
  },
  {
    id: "dark-mode",
    category: "general",
    keywords: { he: ["כהה", "דארק", "ערכת נושא", "צבעים", "בהיר", "מצב"], en: ["dark", "light", "theme", "mode", "colors"] },
    question: { he: "איך עוברים למצב כהה?", en: "How to switch to dark mode?" },
    answer: {
      he: "לחץ על אייקון השמש/ירח ☀️🌙 בסרגל העליון. כל הצבעים, הגרפים, הגאנט והקומפוננטות מתאימים את עצמם אוטומטית.",
      en: "Click the sun/moon ☀️🌙 icon in the top bar. All colors, charts, Gantt, and components adapt automatically.",
    },
  },
  {
    id: "mobile-pwa",
    category: "general",
    keywords: { he: ["נייד", "טלפון", "טאבלט", "אפליקציה", "pwa", "אנדרואיד", "אייפון", "ios"], en: ["mobile", "phone", "tablet", "app", "pwa", "android", "iphone", "ios", "install"] },
    question: { he: "איך משתמשים במערכת מהנייד?", en: "How to use on mobile?" },
    answer: {
      he: "המערכת מותאמת לנייד, טאבלט, iOS ו-Android. אפשר גם להתקין אותה כאפליקציה: בכרום → תפריט (⋮) → 'התקן אפליקציה'. ב-Safari → שתף → 'הוסף למסך הבית'. התפריט נפתח דרך כפתור ההמבורגר ☰.",
      en: "Fully responsive for mobile/tablet/iOS/Android. Install as app: Chrome → menu (⋮) → 'Install app'. Safari → Share → 'Add to Home Screen'. Menu opens via hamburger ☰.",
    },
  },
  // ============================================================
  // NAVIGATION
  // ============================================================
  {
    id: "dashboard-vs-home",
    category: "navigation",
    keywords: { he: ["לוח", "דשבורד", "הבית", "הבדל", "kpi", "מחוונים"], en: ["dashboard", "home", "landing", "difference", "kpi"] },
    question: { he: "מה ההבדל בין 'המשימות שלי' ל'דשבורדים'?", en: "Difference between My Tasks and Dashboards?" },
    answer: {
      he: "🏠 **המשימות שלי** (דף הבית) - תצוגה אישית: המשימות הפתוחות שלך, ההקצאות, הפרויקטים.\n\n📊 **דשבורדים ו-KPI** - תצוגת מנהלים: KPIs ארגוניים, גרפים, בורר תפקיד (PM תפעולי / PMO אסטרטגי) עם מדדים שונים לכל אחד כולל Velocity, Budget, EVM, ROI ו-RAG.",
      en: "🏠 My Tasks = personal view of YOUR open tasks. 📊 Dashboards = organizational KPIs with role switcher (PM operational / PMO strategic) showing Velocity, Budget, EVM, ROI, RAG.",
    },
  },
  {
    id: "sidebar-navigation",
    category: "navigation",
    keywords: { he: ["תפריט", "ניווט", "סרגל", "צד", "איפה", "רובריקות"], en: ["sidebar", "menu", "navigation", "where", "find"] },
    question: { he: "מה יש בתפריט הצד?", en: "What's in the sidebar?" },
    answer: {
      he: "התפריט כולל: המשימות שלי, דשבורדים ו-KPI, לוח גאנט, WBS, ניהול סיכונים, פורטפוליו, פרויקטים, משימות, יומן, מרכז AI, דוחות, אוטומציות, צוות, ניהול מערכת, הגדרות. במובייל - נפתח דרך כפתור ☰.",
      en: "Sidebar includes: My Tasks, Dashboards, Gantt, WBS, Risks, Portfolios, Projects, Tasks, Calendar, AI Center, Reports, Automations, Team, Admin, Settings. On mobile: opens via ☰.",
    },
  },
  // ============================================================
  // TASKS
  // ============================================================
  {
    id: "add-task",
    category: "tasks",
    keywords: { he: ["איך מוסיפים", "ליצור משימה", "להוסיף משימה", "משימה חדשה", "+", "להוסיף", "לפתוח"], en: ["add task", "create task", "new task", "+", "how to add"] },
    question: { he: "איך מוסיפים משימה חדשה?", en: "How to add a new task?" },
    answer: {
      he: "לחץ על כפתור \"+\" בעמוד הבית. הטופס כולל: כותרת, סוג משימה (13 סוגים כולל סיכום פגישה, הכנה לפגישה, מענה על פניה, אחר), שיוך לפרויקט או פרוגרמה, תיאור (עד 300 תווים), בחירת צוות (מרובה), תאריכים, עדיפות, מקור המשימה, וצירוף קבצים (עד 5MB).\n\n🎤 אפשר גם דרך העוזר האישי: \"פתח משימה חדשה ל...\"",
      en: "Click '+' on home page. Form includes: title, type (13 types), project/program assignment, description (300 chars), team (multi-select), dates, priority, source, and file attachments (5MB max). Also via voice: 'Create a new task for...'",
    },
  },
  {
    id: "task-types",
    category: "tasks",
    keywords: { he: ["סוג משימה", "סוגים", "באג", "פגישה", "מסמך", "מענה", "אחר"], en: ["task type", "types", "bug", "meeting", "document", "other"] },
    question: { he: "מה סוגי המשימות האפשריים?", en: "What task types are available?" },
    answer: {
      he: "13 סוגים: 🐛 באג, ✨ תכונה חדשה, 📈 שיפור, 🔬 מחקר, 📝 תיעוד, 📅 פגישה, 🛒 רכש, 📋 סיכום פגישה, 📎 הכנה לפגישה, ✅ פעולה בהמשך לפגישה, 📄 יצירת מסמך, 💬 מענה על פניה, 📌 אחר (טקסט חופשי עד 100 תווים).",
      en: "13 types: Bug, Feature, Improvement, Research, Documentation, Meeting, Procurement, Meeting Summary, Meeting Prep, Meeting Follow-up, Create Document, Respond to Request, Other (free text up to 100 chars).",
    },
  },
  {
    id: "task-source",
    category: "tasks",
    keywords: { he: ["מקור", "מקור משימה", "החלטת מנהל", "פגישה", "הכנה"], en: ["source", "task source", "manager decision", "meeting"] },
    question: { he: "מה זה 'מקור המשימה'?", en: "What is 'task source'?" },
    answer: {
      he: "מקור המשימה מציין מאיפה הגיעה הדרישה: 'החלטת מנהל', 'בהמשך לפגישה', 'הכנה לפגישה', או 'אחר' (טקסט חופשי עד 100 תווים). זה עוזר לעקוב אחרי מה הוליד את המשימה.",
      en: "Task source indicates where the requirement came from: 'Manager Decision', 'Following a Meeting', 'Meeting Preparation', or 'Other' (free text up to 100 chars).",
    },
  },
  {
    id: "filter-tasks",
    category: "tasks",
    keywords: { he: ["סינון", "לסנן", "טאבים", "קטגוריה", "סטטוס", "באיחור"], en: ["filter", "tabs", "category", "status", "overdue"] },
    question: { he: "איך מסננים משימות?", en: "How to filter tasks?" },
    answer: {
      he: "בעמוד הבית יש 7 טאבים: הכל, בביצוע, לא התחילו, בבדיקה, חסומות, באיחור, לפי פרויקט. לחיצה על טאב מסננת מיד. 'לפי פרויקט' מקבץ תחת כל פרויקט.",
      en: "7 tabs on home: All, In Progress, Not Started, In Review, Blocked, Overdue, By Project. Click to filter. 'By Project' groups tasks under their project.",
    },
  },
  {
    id: "task-colors",
    category: "tasks",
    keywords: { he: ["זמן נותר", "דדליין", "צבע", "אדום", "ירוק", "צהוב"], en: ["time remaining", "deadline", "color", "red", "green"] },
    question: { he: "מה משמעות הצבעים על המשימות?", en: "What do task colors mean?" },
    answer: {
      he: "🟢 ירוק = מעל 2 ימים נותרו\n🟡 צהוב = פחות מ-2 ימים\n🔴 אדום = באיחור!\n\nהצבע מחושב אוטומטית לפי תאריך היעד ואחוז ההתקדמות.",
      en: "🟢 Green = 2+ days left. 🟡 Amber = less than 2 days. 🔴 Red = overdue. Auto-calculated from due date + progress.",
    },
  },
  {
    id: "close-task",
    category: "tasks",
    keywords: { he: ["סגירת", "לסגור", "סגור משימה", "טופל", "בוטל", "נדחה", "הועבר"], en: ["close task", "complete", "handled", "cancelled", "postponed", "transferred"] },
    question: { he: "איך סוגרים משימה?", en: "How to close a task?" },
    answer: {
      he: "רק העובד שאליו משויכת המשימה יכול לסגור אותה. בלחיצה על 'סגור משימה' נפתח דיאלוג עם:\n• 4 סיבות: ✅ טופל, ⏳ נדחה, ❌ בוטל, 🔄 הועבר למשתמש אחר\n• תיאור קצר (עד 300 תווים)",
      en: "Only the assigned user can close. Dialog offers 4 reasons: Handled, Postponed, Cancelled, Transferred. Plus optional description (300 chars).",
    },
  },
  {
    id: "reassign-task",
    category: "tasks",
    keywords: { he: ["שייך מחדש", "שיוך", "העבר משימה", "להקצות", "למשתמש אחר"], en: ["reassign", "transfer", "move task", "assign to"] },
    question: { he: "איך משייכים מחדש משימה?", en: "How to reassign a task?" },
    answer: {
      he: "רק מי שפתח את המשימה יכול לשייך אותה מחדש. דיאלוג השיוך מציג: From → To עם אבטרים, רשימת משתמשים לבחירה, וסיבת שיוך (אופציונלי).\n\n🎤 אפשר גם דרך העוזר: \"שייך מחדש את המשימה X ל-Y\"",
      en: "Only task creator can reassign. Dialog shows From → To with avatars, user list, and optional reason. Also via voice: 'Reassign task X to Y'.",
    },
  },
  {
    id: "attach-files",
    category: "tasks",
    keywords: { he: ["קובץ", "צירוף", "מסמך", "העלאה", "5mb", "קבצים"], en: ["file", "attach", "upload", "document", "5mb"] },
    question: { he: "איך מצרפים קבצים למשימה?", en: "How to attach files?" },
    answer: {
      he: "בטופס הוספת משימה, בתחתית יש אזור 'צירוף מסמכים'. לחץ על 📎 לבחירת קבצים. כל פורמט מותר, מוגבל ל-5MB לקובץ. אפשר לצרף מספר קבצים ולהסיר כל אחד בנפרד.",
      en: "In the Add Task form, click 📎 at the bottom. Any format, max 5MB per file. Multiple files allowed, each removable independently.",
    },
  },
  // ============================================================
  // PROJECTS & PORTFOLIOS
  // ============================================================
  {
    id: "project-views",
    category: "projects",
    keywords: { he: ["תצוגה", "תצוגות", "רשימה", "קנבן", "יומן", "kanban"], en: ["view", "views", "list", "kanban", "calendar"] },
    question: { he: "אילו תצוגות יש לפרויקט?", en: "What project views are available?" },
    answer: {
      he: "4 תצוגות בכל דף פרויקט:\n📋 **רשימה** - טבלה עם כל הפרטים, מיון וסינון\n🗂️ **קנבן** - עמודות לפי סטטוס, Drag & Drop\n📊 **גאנט** - ציר זמן עם planned vs actual ונתיב קריטי\n📅 **יומן** - תצוגה חודשית\n\nהחלפה בלחיצה על הטאב.",
      en: "4 views per project: List (table), Kanban (drag & drop columns), Gantt (timeline + critical path), Calendar (monthly). Switch via tabs.",
    },
  },
  {
    id: "what-is-fte",
    category: "projects",
    keywords: { he: ["fte", "אחוז משרה", "הקצאה", "משרה", "משתתף", "הקצאת יתר", "80%"], en: ["fte", "allocation", "percent", "over-allocation"] },
    question: { he: "מה זה FTE ואחוז משרה?", en: "What is FTE?" },
    answer: {
      he: "FTE = Full-Time Equivalent. כל משתתף בפרויקט מקבל אחוז - כמה מזמנו מוקצה. 50% = חצי משרה. אם סך ההקצאות עובר 100% → הקצאת יתר! מעל 80% = אזהרה (סף בטיחות). הנתונים מופיעים ב'ההשתתפות שלי' בעמוד הבית.",
      en: "FTE = Full-Time Equivalent. Each member gets a %. Over 100% = over-allocation warning. Above 80% = safety threshold. See 'My Participation' on home page.",
    },
  },
  {
    id: "portfolio",
    category: "projects",
    keywords: { he: ["פורטפוליו", "תוכנית", "פרוגרמה", "היררכיה", "מבנה"], en: ["portfolio", "program", "hierarchy", "structure"] },
    question: { he: "מה ההבדל בין פורטפוליו, פרוגרמה ופרויקט?", en: "Portfolio vs Program vs Project?" },
    answer: {
      he: "📁 **פורטפוליו** - אוסף כל היוזמות (הרמה הגבוהה ביותר)\n📂 **פרוגרמה** - קבוצת פרויקטים קשורים (למשל: יישומי Salesforce)\n📋 **פרויקט** - יוזמה ספציפית עם תחילה וסוף\n\nמשימה שייכת לפרויקט, פרויקט שייך לפרוגרמה, פרוגרמה שייכת לפורטפוליו.",
      en: "Portfolio > Program > Project. Portfolio = all initiatives. Program = related projects group. Project = specific initiative with start/end.",
    },
  },
  // ============================================================
  // GANTT
  // ============================================================
  {
    id: "gantt",
    category: "gantt",
    keywords: { he: ["גאנט", "gantt", "ציר זמן", "תכנון", "ביצוע", "פסים", "לוח"], en: ["gantt", "timeline", "planned", "actual", "chart", "bars"] },
    question: { he: "איך עובד לוח הגאנט?", en: "How does the Gantt chart work?" },
    answer: {
      he: "לוח הגאנט מציג כל משימה כשני פסים מקבילים:\n• פס אפור = תכנון מקורי (Baseline)\n• פס צבעוני = ביצוע בפועל (ירוק/צהוב/אדום לפי בריאות)\n\nכולל: אבני דרך (יהלומים סגולים), נתיב קריטי (toggle אדום), חוצץ זמן, Today line, zoom in/out, ייצוא ל-Excel.\n\nנגיש דרך 'לוח גאנט' בתפריט הצד.",
      en: "Gantt shows dual bars per task: gray (planned baseline) + colored (actual, health-coded). Includes milestones, critical path toggle, buffer, today line, zoom, Excel export.",
    },
  },
  {
    id: "critical-path",
    category: "gantt",
    keywords: { he: ["נתיב קריטי", "קריטי", "critical path", "עיכוב", "מסלול"], en: ["critical path", "critical", "delay", "longest path"] },
    question: { he: "מה זה נתיב קריטי?", en: "What is the critical path?" },
    answer: {
      he: "הנתיב הקריטי = שרשרת המשימות הארוכה ביותר שכל עיכוב בה ידחה את סיום הפרויקט כולו. בגאנט, לחץ 'נתיב קריטי' → המשימות הקריטיות מודגשות באדום עם ⚡.\n\n🎤 אפשר לשאול את העוזר: \"הסבר נתיב קריטי\" ולקבל ניתוח מפורט.",
      en: "Critical path = longest chain of tasks where any delay pushes the entire project end date. Click 'Critical Path' in Gantt → critical tasks highlighted in red with ⚡.",
    },
  },
  {
    id: "milestones",
    category: "gantt",
    keywords: { he: ["אבן דרך", "milestone", "יהלום", "שלב"], en: ["milestone", "diamond", "phase", "marker"] },
    question: { he: "מה זה אבני דרך בגאנט?", en: "What are milestones in Gantt?" },
    answer: {
      he: "אבני דרך = נקודות ציון עם זמן אפס (zero-duration). מוצגות כיהלומים סגולים 💎 בגאנט. דוגמאות: אישור שלב, מסירה, השקה. הן מופיעות ברמת Milestone בהיררכיית ה-WBS.",
      en: "Milestones = zero-duration markers shown as purple diamonds 💎 in Gantt. Examples: phase approval, delivery, launch.",
    },
  },
  // ============================================================
  // WBS
  // ============================================================
  {
    id: "wbs",
    category: "wbs",
    keywords: { he: ["wbs", "מבנה", "היררכיה", "חבילות עבודה", "פירוק", "רמות", "8"], en: ["wbs", "hierarchy", "structure", "work breakdown", "levels"] },
    question: { he: "מה זה WBS ואיך הוא עובד?", en: "What is WBS?" },
    answer: {
      he: "WBS = מבנה עבודה היררכי (Work Breakdown Structure) עם 8 רמות:\n📁 Portfolio → 📂 Program → 📋 Project → 🎯 Goal → 🚩 Milestone → ⚙️ Activity → ✅ Task → 📌 Subtask\n\nכל רמה מציגה: מספור אוטומטי (1.1.1), אחוז התקדמות (roll-up מהילדים), ואייקון לפי סוג. אפשר לכווץ/להרחיב ענפים. נגיש דרך 'WBS - חבילות עבודה' בתפריט.",
      en: "WBS = hierarchical work breakdown with 8 levels: Portfolio → Program → Project → Goal → Milestone → Activity → Task → Subtask. Auto-numbering, roll-up progress, collapsible.",
    },
  },
  {
    id: "wbs-rollup",
    category: "wbs",
    keywords: { he: ["אגרגציה", "roll-up", "סיכום", "חישוב", "משוקלל", "עלויות"], en: ["rollup", "aggregation", "weighted", "costs", "summary"] },
    question: { he: "איך עובד חישוב ה-Roll-up ב-WBS?", en: "How does WBS roll-up work?" },
    answer: {
      he: "המערכת מחשבת אוטומטית מלמטה למעלה:\n• **שעות** - סכום כל הילדים\n• **התקדמות** - ממוצע משוקלל לפי שעות (לא ממוצע פשוט!)\n• **תאריכים** - min(התחלה), max(סיום) של כל הצאצאים\n• **עלויות** - שעות × תעריף שעתי\n• **ספירות** - סך משימות, הושלמו, חסומות, באיחור",
      en: "Auto-calculated bottom-up: hours (sum), progress (weighted avg by hours), dates (min start, max end), costs (hours × rate), counts (total/done/blocked/overdue).",
    },
  },
  // ============================================================
  // RISKS
  // ============================================================
  {
    id: "ai-risks",
    category: "risks",
    keywords: { he: ["סיכונים", "סיכון", "risk", "זיהוי", "התראה", "קריטי", "5 סוגים"], en: ["risks", "detection", "alert", "5 types"] },
    question: { he: "איך עובד זיהוי הסיכונים?", en: "How does risk detection work?" },
    answer: {
      he: "מנוע ה-AI סורק את כל המשימות ומזהה 5 סוגי סיכונים:\n1. ⏰ **באיחור** - עבר דדליין\n2. 🚫 **חסום** - מעל 24 שעות\n3. 📈 **חריגת מאמץ** - 20%+ מעל הערכה\n4. 🐢 **התקדמות איטית** - progress מאחורי הזמן\n5. ⚠️ **קריטי לא התחיל** - פחות מ-3 ימים להתחלה\n\nנגיש דרך 'ניהול סיכונים' בתפריט.",
      en: "AI scans all tasks for 5 risk types: overdue, blocked >24h, effort overrun >20%, schedule slip, critical not started <3 days.",
    },
  },
  {
    id: "mitigation-plan",
    category: "risks",
    keywords: { he: ["תכנית", "גידור", "mitigation", "שיבוץ", "המלצה", "פעולה"], en: ["mitigation", "plan", "reassignment", "recommendation"] },
    question: { he: "מה זה תכנית ניהול סיכונים?", en: "What is the mitigation plan?" },
    answer: {
      he: "ה-AI מפיק תכנית מלאה:\n🔄 **שיבוצים מחדש** - ממליץ למי להעביר משימות (לפי כישורים, זמינות, ביצועים)\n🔧 **אסטרטגיות גידור** - 2-3 פעולות לכל סיכון עם דירוג מאמץ/השפעה\n⚠️ **התרעות מוקדמות** - צפי לבעיות לפני שמתרחשות\n\n🎤 שאל את העוזר: \"מה תכנית ניהול הסיכונים?\"",
      en: "AI generates: smart reassignments (skills+availability+performance), mitigation strategies per risk (effort/impact rated), early warnings. Ask: 'What's the risk plan?'",
    },
  },
  {
    id: "resource-bottleneck",
    category: "risks",
    keywords: { he: ["צוואר בקבוק", "עומס", "bottleneck", "שחיקה", "קיבולת"], en: ["bottleneck", "overload", "burnout", "capacity"] },
    question: { he: "מה זה צוואר בקבוק במשאבים?", en: "What is a resource bottleneck?" },
    answer: {
      he: "ה-AI מזהה עובדים בסיכון:\n• FTE מעל 80% = סף בטיחות → אזהרה\n• FTE מעל 100% = הקצאת יתר → קריטי\n• עובד עם משימות בנתיב הקריטי + עומס = צוואר בקבוק\n• 2+ משימות חסומות = סיכון שחיקה\n\nמוצג בדף ניהול סיכונים עם גרף FTE וקו בטיחות 80%.",
      en: "AI detects: FTE >80% (warning), >100% (critical), critical-path + overloaded user = bottleneck. Shown with FTE bar and 80% safety line.",
    },
  },
  // ============================================================
  // AI & ASSISTANT
  // ============================================================
  {
    id: "personal-assistant",
    category: "assistant",
    keywords: { he: ["עוזר אישי", "קולי", "הקלטה", "מיקרופון", "דיבור", "שמע"], en: ["personal assistant", "voice", "recording", "microphone", "speak"] },
    question: { he: "איך משתמשים בעוזר האישי?", en: "How to use the Personal Assistant?" },
    answer: {
      he: "לחץ על הכפתור הסגול ✨ בפינה. אפשר:\n🎤 **להקליט** - לחץ על מיקרופון, דבר, ההודעה נשלחת אוטומטית\n⌨️ **לכתוב** - הקלד טקסט ולחץ Enter\n🔊 **העוזר עונה בקול** (TTS מופעל כברירת מחדל)\n\nדוגמאות: \"פתח משימה\", \"מה הסיכונים?\", \"הסבר נתיב קריטי\", \"סיכום יומי\", \"שייך מחדש\"",
      en: "Click the purple ✨ button. Record (mic → auto-submit), type (Enter), or both. Assistant speaks back (TTS on by default). Examples: 'Create task', 'What are risks?', 'Daily summary'.",
    },
  },
  {
    id: "assistant-capabilities",
    category: "assistant",
    keywords: { he: ["מה העוזר יכול", "יכולות", "פקודות", "אפשרויות"], en: ["assistant capabilities", "what can", "commands", "options"] },
    question: { he: "מה העוזר האישי יכול לעשות?", en: "What can the assistant do?" },
    answer: {
      he: "📋 **פתיחת משימה** - \"פתח משימה חדשה ל...\"\n📊 **סטטוס** - \"מה המצב?\" / \"סיכום יומי\"\n⚠️ **סיכונים** - \"מה הסיכונים?\" / \"מה בסיכון?\"\n🎯 **נתיב קריטי** - \"הסבר נתיב קריטי\"\n🛡️ **תכנית גידור** - \"מה תכנית ניהול הסיכונים?\"\n👥 **עומסים** - \"מי הכי עמוס?\" / \"מי פנוי?\"\n🔄 **שיוך מחדש** - \"שייך מחדש את X ל-Y\"\n📝 **פגישות** - \"סכם את הפגישה\"\n📅 **סיכום יומי** - \"תן לי סיכום יומי\"\n❓ **עזרה** - \"עזרה\" / \"מה אתה יכול?\"",
      en: "Create tasks, status check, risks, critical path, mitigation plan, workload, reassign, meeting summary, daily summary, help.",
    },
  },
  {
    id: "ai-sidekick-vs-help",
    category: "ai",
    keywords: { he: ["ai", "סייד קיק", "בוט", "צאט", "עוזר חכם", "הבדל", "שני בוטים"], en: ["sidekick", "bot", "chat", "difference", "two bots"] },
    question: { he: "מה ההבדל בין AI Sidekick, העוזר האישי, ובוט העזרה?", en: "Difference between AI Sidekick, Personal Assistant, and Help Bot?" },
    answer: {
      he: "שלושה כלים שונים:\n\n✨ **עוזר אישי** (כפתור סגול) - מנהל דו-שיח קולי/טקסטי, מבצע פעולות (פתיחת משימות, שיוך), נותן סיכומים.\n\n🪄 **AI Sidekick** (במרכז AI) - שואל שאלות מורכבות על הנתונים: 'מי הכי עמוס?', 'אילו פרויקטים בסיכון?'\n\n❓ **בוט עזרה** (כפתור ירוק) - עונה על שאלות על השימוש במערכת: 'איך מוסיפים משימה?', 'מה זה FTE?'",
      en: "Three tools: ✨ Personal Assistant (purple, voice/text, performs actions), 🪄 AI Sidekick (AI Center, data queries), ❓ Help Bot (green, usage questions).",
    },
  },
  // ============================================================
  // AUTOMATIONS
  // ============================================================
  {
    id: "automations",
    category: "automations",
    keywords: { he: ["אוטומציה", "אוטומציות", "טריגר", "תנאי", "פעולה", "זרימה", "ללא קוד"], en: ["automation", "trigger", "condition", "action", "no code", "workflow"] },
    question: { he: "איך יוצרים אוטומציה?", en: "How to create an automation?" },
    answer: {
      he: "לחץ 'אוטומציה חדשה' בדף אוטומציות. שני מסלולים:\n\n🎯 **תבניות מוכנות** (5) - התראה על איחור, הסלמת SLA, יצירת תת-משימות AI, התראה על השלמה, הסלמת חסימות.\n\n🔧 **בנייה מאפס** - 3 שלבים ויזואליים ללא קוד:\n1️⃣ **טריגר** (כחול) - 8 סוגים (סטטוס השתנה, דדליין, חדשה, הוקצתה...)\n2️⃣ **תנאי** (צהוב) - אופציונלי (עדיפות, פרויקט, תגית...)\n3️⃣ **פעולה** (ירוק) - 8 פעולות כולל AI (התראה, שנה סטטוס, צור תת-משימות AI...)",
      en: "Click 'New Automation'. 5 templates or build from scratch: Trigger (8 types) → Condition (optional) → Action (8 types including AI). No code needed.",
    },
  },
  // ============================================================
  // TEAM & ADMIN
  // ============================================================
  {
    id: "invite-member",
    category: "team",
    keywords: { he: ["הזמנה", "הזמן חבר", "משתמש חדש", "צוות", "להזמין"], en: ["invite", "new member", "team", "add user"] },
    question: { he: "איך מזמינים חבר צוות חדש?", en: "How to invite a team member?" },
    answer: {
      he: "בדף 'צוות' לחץ 'הזמן חבר'. מלא: שם מלא*, תפקיד, חטיבה, אגף, טלפון נייד*, מייל*. המערכת שולחת קישור הזמנה למייל - המוזמן לוחץ ומשלים את פרטיו.",
      en: "In Team page, click 'Invite member'. Fill: name*, role, division, department, phone*, email*. System sends invite link by email.",
    },
  },
  {
    id: "rbac",
    category: "admin",
    keywords: { he: ["הרשאות", "תפקיד", "rbac", "אדמין", "מנהל", "צופה", "אורח"], en: ["permissions", "role", "rbac", "admin", "manager", "viewer"] },
    question: { he: "איך עובדות ההרשאות?", en: "How do permissions work?" },
    answer: {
      he: "5 תפקידים:\n👑 **Admin** - הכל (12/12 הרשאות)\n📊 **Manager** - יצירה/עריכה/דוחות (8/12)\n🧑‍💻 **Member** - עדכון משימות שהוקצו (5/12)\n👁️ **Viewer** - צפייה בלבד + תגובות (2/12)\n🚪 **Guest** - גישה מוגבלת (0/12)\n\nמטריצת הרשאות מלאה בדף 'ניהול מערכת' → 'תפקידים והרשאות'.",
      en: "5 roles: Admin (12/12), Manager (8/12), Member (5/12), Viewer (2/12), Guest (0/12). Full matrix in Admin → Roles & Permissions.",
    },
  },
  {
    id: "admin-panel",
    category: "admin",
    keywords: { he: ["ניהול מערכת", "אדמין", "משתמשים", "סוגי", "שיוך היררכי"], en: ["admin", "system", "users", "types", "hierarchy"] },
    question: { he: "מה אפשר לעשות בניהול מערכת?", en: "What can I do in Admin?" },
    answer: {
      he: "4 טאבים (רק Admin):\n👤 **משתמשים** - הוספה, עריכה, מחיקה, חיפוש, סינון לפי תפקיד\n🛡️ **תפקידים והרשאות** - מטריצה 12×5, יצירת תפקיד מותאם\n🏷️ **סוגי משימות/פרויקטים** - 13+ סוגים עם אייקון, צבע, תיאור\n🌳 **שיוך היררכי** - העברת פרויקטים בין פרוגרמות, שיוך משימות ל-WBS",
      en: "4 tabs (Admin only): Users (CRUD), Roles & Permissions (12×5 matrix), Item Types (13+ with icons/colors), Hierarchy (move projects between programs).",
    },
  },
  // ============================================================
  // DASHBOARDS & KPIs
  // ============================================================
  {
    id: "pm-vs-pmo-dashboard",
    category: "navigation",
    keywords: { he: ["pm", "pmo", "מנהל פרויקט", "פורטפוליו", "תפעולי", "אסטרטגי", "בורר"], en: ["pm", "pmo", "project manager", "portfolio", "operational", "strategic"] },
    question: { he: "מה ההבדל בין דשבורד PM ל-PMO?", en: "PM vs PMO dashboard?" },
    answer: {
      he: "**מנהל פרויקט (PM)** - תפעולי:\n⏰ חריגת לו\"ז, 🚩 Milestones באיחור, ⚡ Throughput, 💰 ניצול תקציב\n+ גרף Throughput + עומס צוות\n\n**מנהל PMO** - אסטרטגי:\n🎯 יישור אסטרטגי, 📈 ROI, 👥 ניצולת משאבים (80% warning), 📊 מגמת סיכונים\n+ RAG (ירוק/כתום/אדום), EVM (CPI/SPI), CapEx vs OpEx",
      en: "PM: Schedule Variance, Milestones, Throughput, Budget. PMO: Strategic Alignment, ROI, Capacity (80% warning), Risk Trend, RAG, EVM (CPI/SPI), Cost Analysis.",
    },
  },
  // ============================================================
  // CALENDAR & REPORTS
  // ============================================================
  {
    id: "calendar",
    category: "navigation",
    keywords: { he: ["יומן", "calendar", "google", "סנכרון", "חודשי"], en: ["calendar", "google", "sync", "monthly"] },
    question: { he: "איך עובד היומן?", en: "How does the calendar work?" },
    answer: {
      he: "תצוגה חודשית עם משימות לפי תאריכי דדליין. צבעים לפי סטטוס. ניווט חודש קדימה/אחורה. מוכן לסנכרון 2-כיווני עם Google Calendar (דורש הגדרת OAuth).",
      en: "Monthly view with tasks by due date, color-coded by status. Navigate months forward/back. Ready for 2-way Google Calendar sync (needs OAuth setup).",
    },
  },
  {
    id: "reports-pdf",
    category: "navigation",
    keywords: { he: ["דוחות", "pdf", "ייצוא", "הדפסה", "אנליטיקה"], en: ["reports", "pdf", "export", "print", "analytics"] },
    question: { he: "איך מייצאים דוחות ל-PDF?", en: "How to export reports to PDF?" },
    answer: {
      he: "בדף 'דוחות וניתוחים' לחץ 'ייצוא PDF'. נפתח חלון הדפסה של הדפדפן → בחר 'שמור כ-PDF'. הדוח כולל: Velocity, בריאות כוללת, עומס עבודה, התפלגות סטטוסים - עם כל הגרפים בצבע.",
      en: "In Reports page, click 'Export PDF'. Browser print dialog opens → select 'Save as PDF'. Includes all charts in color.",
    },
  },
  // ============================================================
  // DAILY SUMMARY
  // ============================================================
  {
    id: "daily-summary",
    category: "assistant",
    keywords: { he: ["סיכום יומי", "מה עשיתי", "דוח יומי", "recap", "מה קורה"], en: ["daily summary", "what did i do", "daily report", "recap"] },
    question: { he: "איך מקבלים סיכום יומי?", en: "How to get a daily summary?" },
    answer: {
      he: "אמור או כתוב לעוזר האישי: \"סיכום יומי\" או \"תן לי סיכום\". תקבל:\n✅ כמה הושלמו\n🔵 כמה בביצוע (עם שמות)\n🚫 כמה חסומות\n⚠️ כמה באיחור\n🎯 המלצה למוקד (למשל: \"פתרון חסימה ב-X\")",
      en: "Say or type 'daily summary' to the assistant. Shows: completed, in-progress (with names), blocked, overdue, and focus recommendation.",
    },
  },
];

/**
 * Find matching help entries by keywords.
 */
export function findHelpByKeywords(query: string, locale: "he" | "en"): HelpEntry[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const scored = HELP_ENTRIES.map((entry) => {
    let score = 0;
    const keywords = entry.keywords[locale];
    for (const kw of keywords) {
      if (q.includes(kw.toLowerCase())) {
        score += kw.length;
      }
    }
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
 * Format knowledge base as system prompt context.
 */
export function formatKnowledgeBaseForAI(locale: "he" | "en"): string {
  return HELP_ENTRIES.map(
    (e) => `Q: ${e.question[locale]}\nA: ${e.answer[locale]}\n[${e.category}]`
  ).join("\n\n---\n\n");
}
