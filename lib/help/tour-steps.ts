/**
 * Interactive tour configuration.
 * Each step highlights an element (by data-tour attribute) and shows a popover.
 */

export interface TourStep {
  id: string;
  selector: string; // data-tour="..." selector or CSS selector
  title: Record<string, string>;
  content: Record<string, string>;
  placement?: "top" | "bottom" | "start" | "end" | "center";
  scrollIntoView?: boolean;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    selector: "body",
    placement: "center",
    title: {
      he: "ברוכים הבאים ל-PMO++ של המרכז למיפוי ישראל 👋",
      en: "Welcome to PMO++ - Israel Mapping Center 👋",
    },
    content: {
      he: "PMO++ היא פלטפורמת ניהול הפרויקטים הפנים-ארגונית של המרכז למיפוי ישראל. היא מאגדת במקום אחד את כל הפרוגרמות, הפרויקטים, המשימות והמשתתפים שלך - עם תמיכה מלאה בעברית, תובנות AI, עוזר אישי קולי, וניהול סיכונים פרואקטיבי.\n\nהסיור הקצר הזה (כ-2 דקות) יציג לך את הפונקציונליות העיקרית. בכל שלב תוכל לדלג או לסגור - אפשר להפעיל את הסיור מחדש בכל עת מכפתור העזרה (?) בראש הדף.",
      en: "PMO++ is the Israel Mapping Center's internal project management platform. It unifies all your programs, projects, tasks and team members in one place - with full Hebrew support, AI insights, a voice-enabled personal assistant, and proactive risk management.\n\nThis quick tour (~2 minutes) will walk you through the main features. You can skip or close at any step - the tour can be restarted anytime from the help button (?) at the top.",
    },
  },
  {
    id: "sidebar",
    selector: '[data-tour="sidebar"]',
    placement: "end",
    title: {
      he: "תפריט הניווט הראשי",
      en: "Main Navigation",
    },
    content: {
      he: "מכאן תגיע לכל חלקי המערכת: המשימות שלך, פרויקטים, פורטפוליו, מרכז AI, יומן, דוחות והגדרות.",
      en: "Access every part of the system: your tasks, projects, portfolios, AI center, calendar, reports, and settings.",
    },
  },
  {
    id: "language-toggle",
    selector: '[data-tour="language-toggle"]',
    placement: "bottom",
    title: {
      he: "החלפת שפה ⚡",
      en: "Switch Language ⚡",
    },
    content: {
      he: "המערכת תומכת בעברית ואנגלית. לחיצה אחת והכל מתחלף - כולל כיוון הכתיבה (RTL/LTR).",
      en: "The system supports Hebrew and English. One click switches everything - including text direction (RTL/LTR).",
    },
  },
  {
    id: "theme-toggle",
    selector: '[data-tour="theme-toggle"]',
    placement: "bottom",
    title: {
      he: "מצב כהה / בהיר",
      en: "Dark / Light Mode",
    },
    content: {
      he: "עיניים עייפות? עבור למצב כהה. כל הצבעים מותאמים לשני המצבים.",
      en: "Tired eyes? Switch to dark mode. All colors are tuned for both.",
    },
  },
  {
    id: "stats",
    selector: '[data-tour="stats"]',
    placement: "bottom",
    title: {
      he: "סטטיסטיקות אישיות",
      en: "Personal Stats",
    },
    content: {
      he: "ארבעה מספרים שאומרים לך הכל: כמה משימות פתוחות יש לך, כמה בביצוע, כמה באיחור, וכמה ייסגרו השבוע.",
      en: "Four numbers that tell you everything: how many open tasks you have, how many in progress, overdue, and due this week.",
    },
    scrollIntoView: true,
  },
  {
    id: "tabs",
    selector: '[data-tour="tabs"]',
    placement: "bottom",
    title: {
      he: "סינון לפי קטגוריות",
      en: "Filter by Category",
    },
    content: {
      he: "לחץ על כל טאב לסינון מהיר: כל המשימות, רק בביצוע, רק חסומות, באיחור, או קיבוץ לפי פרויקט.",
      en: "Click any tab to filter: all tasks, in-progress only, blocked, overdue, or grouped by project.",
    },
    scrollIntoView: true,
  },
  {
    id: "add-task",
    selector: '[data-tour="add-task"]',
    placement: "start",
    title: {
      he: "הוספת משימה חדשה ➕",
      en: "Add a New Task ➕",
    },
    content: {
      he: "לחיצה על כפתור ה-+ פותחת חלון מהיר ליצירת משימה חדשה - בחר פרויקט, אחראי, תאריכים, ועדיפות.",
      en: "Clicking the + button opens a quick dialog to create a new task - select project, assignee, dates, and priority.",
    },
  },
  {
    id: "task-card",
    selector: '[data-tour="task-list"] > a:first-child',
    placement: "top",
    title: {
      he: "כרטיס משימה",
      en: "Task Card",
    },
    content: {
      he: "כל משימה מציגה בבת אחת: שם, סטטוס, עדיפות, תאריך, התקדמות, וזמן נותר עד הדדליין. הצבע משתנה לאדום כשמתקרב המועד.",
      en: "Every task shows at a glance: name, status, priority, date, progress, and time remaining. Color turns red as deadline approaches.",
    },
    scrollIntoView: true,
  },
  {
    id: "fte-panel",
    selector: '[data-tour="fte-panel"]',
    placement: "start",
    title: {
      he: "ההקצאה שלך לפרויקטים",
      en: "Your Project Allocations",
    },
    content: {
      he: "כאן תראה את כל הפרויקטים שאתה משתתף בהם, התפקיד שלך בכל אחד, ואחוז המשרה (FTE) המוקצה. אם הסך עובר 100% - תקבל אזהרה!",
      en: "See all projects you're part of, your role in each, and FTE % allocated. If total exceeds 100% - you'll get a warning!",
    },
    scrollIntoView: true,
  },
  {
    id: "ai-mention",
    selector: '[data-tour="ai-link"]',
    placement: "end",
    title: {
      he: "מרכז ה-AI 🪄",
      en: "AI Center 🪄",
    },
    content: {
      he: "מנוע ה-AI סורק את כל הפרויקטים שלך וזיהה סיכונים אוטומטית. בנוסף, יש שם 'סייד-קיק' - בוט שיענה על שאלות מורכבות על הנתונים שלך.",
      en: "The AI engine scans all your projects and detects risks automatically. Plus a 'sidekick' bot that answers complex questions about your data.",
    },
  },
  {
    id: "help-trigger",
    selector: '[data-tour="help-trigger"]',
    placement: "bottom",
    title: {
      he: "תקוע? יש עזרה תמיד! ❓",
      en: "Stuck? Help is always here! ❓",
    },
    content: {
      he: "כפתור העזרה הזה תמיד זמין. ממנו תוכל להפעיל מחדש את הסיור הזה, או לפתוח את 'בוט העזרה' שיענה על כל שאלה על השימוש במערכת.",
      en: "This help button is always available. Use it to restart this tour, or open the 'Help Bot' that answers any question about using the system.",
    },
  },
  {
    id: "complete",
    selector: "body",
    placement: "center",
    title: {
      he: "סיימת! 🎉",
      en: "All done! 🎉",
    },
    content: {
      he: "עכשיו אתה מוכן להתחיל. זכור: כפתור העזרה (?) למעלה תמיד זמין. בהצלחה!",
      en: "You're ready to go. Remember: the help button (?) at the top is always there. Good luck!",
    },
  },
];
