import {
  Home,
  LayoutDashboard,
  GanttChartSquare,
  GitBranch,
  Briefcase,
  CheckSquare,
  Calendar,
  Sparkles,
  BarChart3,
  Settings,
  Users,
  Workflow,
  Boxes,
  ShieldAlert,
  Shield,
  BookOpen,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  key: string;
  icon: LucideIcon;
  href: string;
  /** Labels keyed by locale code (he, en, ru, fr, es) */
  labels: Record<string, string>;
  /** Tooltip descriptions keyed by locale */
  tooltips: Record<string, string>;
}

export const NAV_ITEMS: NavItem[] = [
  { key: "home",        icon: Home,               href: "/",              labels: { he: "המשימות שלי",        en: "My Tasks",          ru: "Мои задачи",        fr: "Mes tâches",           es: "Mis tareas"        }, tooltips: { he: "כל המשימות הפתוחות שלך מסודרות לפי דחיפות", en: "All your open tasks sorted by urgency" } },
  { key: "dashboard",   icon: LayoutDashboard,     href: "/dashboard",     labels: { he: "דשבורדים ו-KPI",     en: "Dashboards & KPI",  ru: "Панель управления",  fr: "Tableaux de bord",     es: "Paneles y KPI"     }, tooltips: { he: "מדדי ביצוע ארגוניים עם בורר PM/PMO", en: "Organizational KPIs with PM/PMO role switcher" } },
  { key: "gantt",       icon: GanttChartSquare,    href: "/gantt",         labels: { he: "לוח גאנט",           en: "Gantt Chart",       ru: "Диаграмма Ганта",    fr: "Diagramme de Gantt",   es: "Diagrama de Gantt" }, tooltips: { he: "תצוגת ציר זמן עם תלויות, נתיב קריטי ואבני דרך", en: "Timeline view with dependencies, critical path & milestones" } },
  { key: "wbs",         icon: GitBranch,           href: "/wbs",           labels: { he: "WBS - חבילות עבודה", en: "WBS - Work Packages", ru: "WBS - Пакеты работ", fr: "WBS - Lots de travail", es: "WBS - Paquetes" }, tooltips: { he: "מבנה עבודה היררכי — 8 רמות מפורטפוליו עד תת-משימה", en: "Hierarchical work breakdown — 8 levels from portfolio to subtask" } },
  { key: "risks",       icon: ShieldAlert,         href: "/risks",         labels: { he: "ניהול סיכונים",      en: "Risk Management",   ru: "Управление рисками",  fr: "Gestion des risques",  es: "Gestión de riesgos"}, tooltips: { he: "זיהוי סיכונים, מטריצת הערכה, תכנית גידור ומעקב AI", en: "Risk detection, assessment matrix, mitigation planning & AI monitoring" } },
  { key: "portfolios",  icon: Boxes,               href: "/portfolios",    labels: { he: "פורטפוליו",          en: "Portfolios",        ru: "Портфолио",           fr: "Portefeuilles",        es: "Portafolios"       }, tooltips: { he: "תצוגת כל הפורטפוליו והפרוגרמות ברמה העליונה", en: "Top-level view of all portfolios and programs" } },
  { key: "projects",    icon: Briefcase,           href: "/projects",      labels: { he: "פרויקטים",           en: "Projects",          ru: "Проекты",             fr: "Projets",              es: "Proyectos"         }, tooltips: { he: "כל הפרויקטים עם סטטוס, התקדמות וציון בריאות", en: "All projects with status, progress and health score" } },
  { key: "tasks",       icon: CheckSquare,         href: "/tasks",         labels: { he: "משימות",             en: "Tasks",             ru: "Задачи",              fr: "Tâches",               es: "Tareas"            }, tooltips: { he: "רשימת כל המשימות עם סינון, מיון ותצוגות מרובות", en: "All tasks with filtering, sorting and multiple views" } },
  { key: "calendar",    icon: Calendar,            href: "/calendar",      labels: { he: "יומן",               en: "Calendar",          ru: "Календарь",           fr: "Calendrier",           es: "Calendario"        }, tooltips: { he: "תצוגה חודשית של משימות לפי תאריכי דדליין", en: "Monthly view of tasks by deadline dates" } },
  { key: "ai",          icon: Sparkles,            href: "/ai",            labels: { he: "מרכז AI",            en: "AI Center",         ru: "Центр AI",            fr: "Centre IA",            es: "Centro IA"         }, tooltips: { he: "שאילת שאלות מורכבות על הנתונים באמצעות AI", en: "Ask complex questions about your data using AI" } },
  { key: "reports",     icon: BarChart3,           href: "/reports",       labels: { he: "דוחות",              en: "Reports",           ru: "Отчёты",              fr: "Rapports",             es: "Informes"          }, tooltips: { he: "דוחות וניתוחים עם ייצוא ל-PDF ו-Excel", en: "Reports & analytics with PDF and Excel export" } },
  { key: "automations", icon: Workflow,            href: "/automations",   labels: { he: "אוטומציות",          en: "Automations",       ru: "Автоматизация",       fr: "Automatisations",      es: "Automatizaciones"  }, tooltips: { he: "בנה זרימות עבודה אוטומטיות ללא קוד — טריגר, תנאי, פעולה", en: "Build no-code automation workflows — trigger, condition, action" } },
  { key: "team",        icon: Users,               href: "/team",          labels: { he: "צוות",               en: "Team",              ru: "Команда",             fr: "Équipe",               es: "Equipo"            }, tooltips: { he: "ניהול חברי צוות, הקצאות והזמנות חדשות", en: "Manage team members, allocations and new invitations" } },
  { key: "admin",       icon: Shield,              href: "/admin",         labels: { he: "ניהול מערכת",        en: "Admin",             ru: "Администрирование",   fr: "Administration",       es: "Administración"    }, tooltips: { he: "ניהול משתמשים, תפקידים, הרשאות, סוגי פריטים ויומן פעילות", en: "Manage users, roles, permissions, item types & activity log" } },
  { key: "guides",      icon: BookOpen,            href: "/guides",        labels: { he: "מדריכי משתמש",       en: "User Guides",       ru: "Руководства",         fr: "Guides",               es: "Guías"             }, tooltips: { he: "מדריכי הפעלה מפורטים ל-PMO++ ב-5 שפות", en: "Detailed PMO++ guides in 5 languages" } },
  { key: "settings",    icon: Settings,            href: "/settings",      labels: { he: "הגדרות",             en: "Settings",          ru: "Настройки",           fr: "Paramètres",           es: "Configuración"     }, tooltips: { he: "הגדרות אישיות — שפה, ערכת נושא, התראות ואינטגרציות", en: "Personal settings — language, theme, notifications & integrations" } },
];
