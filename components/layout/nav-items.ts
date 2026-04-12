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
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  key: string;
  icon: LucideIcon;
  href: string;
  /** Labels keyed by locale code (he, en, ru, fr, es) */
  labels: Record<string, string>;
}

export const NAV_ITEMS: NavItem[] = [
  { key: "home",        icon: Home,               href: "/",              labels: { he: "המשימות שלי",        en: "My Tasks",          ru: "Мои задачи",        fr: "Mes tâches",           es: "Mis tareas"        } },
  { key: "dashboard",   icon: LayoutDashboard,     href: "/dashboard",     labels: { he: "דשבורדים ו-KPI",     en: "Dashboards & KPI",  ru: "Панель управления",  fr: "Tableaux de bord",     es: "Paneles y KPI"     } },
  { key: "gantt",       icon: GanttChartSquare,    href: "/gantt",         labels: { he: "לוח גאנט",           en: "Gantt Chart",       ru: "Диаграмма Ганта",    fr: "Diagramme de Gantt",   es: "Diagrama de Gantt" } },
  { key: "wbs",         icon: GitBranch,           href: "/wbs",           labels: { he: "WBS - חבילות עבודה", en: "WBS - Work Packages", ru: "WBS - Пакеты работ", fr: "WBS - Lots de travail", es: "WBS - Paquetes" } },
  { key: "risks",       icon: ShieldAlert,         href: "/risks",         labels: { he: "ניהול סיכונים",      en: "Risk Management",   ru: "Управление рисками",  fr: "Gestion des risques",  es: "Gestión de riesgos"} },
  { key: "portfolios",  icon: Boxes,               href: "/portfolios",    labels: { he: "פורטפוליו",          en: "Portfolios",        ru: "Портфолио",           fr: "Portefeuilles",        es: "Portafolios"       } },
  { key: "projects",    icon: Briefcase,           href: "/projects",      labels: { he: "פרויקטים",           en: "Projects",          ru: "Проекты",             fr: "Projets",              es: "Proyectos"         } },
  { key: "tasks",       icon: CheckSquare,         href: "/tasks",         labels: { he: "משימות",             en: "Tasks",             ru: "Задачи",              fr: "Tâches",               es: "Tareas"            } },
  { key: "calendar",    icon: Calendar,            href: "/calendar",      labels: { he: "יומן",               en: "Calendar",          ru: "Календарь",           fr: "Calendrier",           es: "Calendario"        } },
  { key: "ai",          icon: Sparkles,            href: "/ai",            labels: { he: "מרכז AI",            en: "AI Center",         ru: "Центр AI",            fr: "Centre IA",            es: "Centro IA"         } },
  { key: "reports",     icon: BarChart3,           href: "/reports",       labels: { he: "דוחות",              en: "Reports",           ru: "Отчёты",              fr: "Rapports",             es: "Informes"          } },
  { key: "automations", icon: Workflow,            href: "/automations",   labels: { he: "אוטומציות",          en: "Automations",       ru: "Автоматизация",       fr: "Automatisations",      es: "Automatizaciones"  } },
  { key: "team",        icon: Users,               href: "/team",          labels: { he: "צוות",               en: "Team",              ru: "Команда",             fr: "Équipe",               es: "Equipo"            } },
  { key: "admin",       icon: Shield,              href: "/admin",         labels: { he: "ניהול מערכת",        en: "Admin",             ru: "Администрирование",   fr: "Administration",       es: "Administración"    } },
  { key: "settings",    icon: Settings,            href: "/settings",      labels: { he: "הגדרות",             en: "Settings",          ru: "Настройки",           fr: "Paramètres",           es: "Configuración"     } },
];
