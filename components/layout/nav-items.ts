import {
  Home,
  LayoutDashboard,
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
  labelHe: string;
  labelEn: string;
}

export const NAV_ITEMS: NavItem[] = [
  { key: "home", icon: Home, href: "/", labelHe: "המשימות שלי", labelEn: "My Tasks" },
  { key: "dashboard", icon: LayoutDashboard, href: "/dashboard", labelHe: "דשבורדים ו-KPI", labelEn: "Dashboards & KPI" },
  { key: "risks", icon: ShieldAlert, href: "/risks", labelHe: "ניהול סיכונים", labelEn: "Risk Management" },
  { key: "portfolios", icon: Boxes, href: "/portfolios", labelHe: "פורטפוליו", labelEn: "Portfolios" },
  { key: "projects", icon: Briefcase, href: "/projects", labelHe: "פרויקטים", labelEn: "Projects" },
  { key: "tasks", icon: CheckSquare, href: "/tasks", labelHe: "משימות", labelEn: "Tasks" },
  { key: "calendar", icon: Calendar, href: "/calendar", labelHe: "יומן", labelEn: "Calendar" },
  { key: "ai", icon: Sparkles, href: "/ai", labelHe: "מרכז AI", labelEn: "AI Center" },
  { key: "reports", icon: BarChart3, href: "/reports", labelHe: "דוחות", labelEn: "Reports" },
  { key: "automations", icon: Workflow, href: "/automations", labelHe: "אוטומציות", labelEn: "Automations" },
  { key: "team", icon: Users, href: "/team", labelHe: "צוות", labelEn: "Team" },
  { key: "admin", icon: Shield, href: "/admin", labelHe: "ניהול מערכת", labelEn: "Admin" },
  { key: "settings", icon: Settings, href: "/settings", labelHe: "הגדרות", labelEn: "Settings" },
];
