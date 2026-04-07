"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link, usePathname } from "@/lib/i18n/routing";
import {
  Home,
  LayoutDashboard,
  FolderKanban,
  Briefcase,
  CheckSquare,
  Calendar,
  Sparkles,
  BarChart3,
  Settings,
  Users,
  Workflow,
  Boxes,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { key: "home", icon: Home, href: "/", labelHe: "המשימות שלי", labelEn: "My Tasks" },
  { key: "dashboard", icon: LayoutDashboard, href: "/dashboard", labelHe: "לוח מחוונים", labelEn: "Dashboard" },
  { key: "portfolios", icon: Boxes, href: "/portfolios", labelHe: "פורטפוליו", labelEn: "Portfolios" },
  { key: "projects", icon: Briefcase, href: "/projects", labelHe: "פרויקטים", labelEn: "Projects" },
  { key: "tasks", icon: CheckSquare, href: "/tasks", labelHe: "משימות", labelEn: "Tasks" },
  { key: "calendar", icon: Calendar, href: "/calendar", labelHe: "יומן", labelEn: "Calendar" },
  { key: "ai", icon: Sparkles, href: "/ai", labelHe: "מרכז AI", labelEn: "AI Center" },
  { key: "reports", icon: BarChart3, href: "/reports", labelHe: "דוחות", labelEn: "Reports" },
  { key: "automations", icon: Workflow, href: "/automations", labelHe: "אוטומציות", labelEn: "Automations" },
  { key: "team", icon: Users, href: "/team", labelHe: "צוות", labelEn: "Team" },
  { key: "settings", icon: Settings, href: "/settings", labelHe: "הגדרות", labelEn: "Settings" },
] as const;

export function Sidebar() {
  const tApp = useTranslations("app");
  const locale = useLocale();
  const pathname = usePathname();
  const isHe = locale === "he";

  return (
    <aside
      className="hidden lg:flex w-64 flex-col bg-sidebar text-sidebar-foreground border-e border-sidebar-border"
      data-tour="sidebar"
    >
      <div className="px-6 py-5 border-b border-sidebar-border">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="size-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <FolderKanban className="size-5 text-white" />
          </div>
          <div>
            <div className="text-base font-bold text-white">{tApp("name")}</div>
            <div className="text-[11px] text-sidebar-foreground/70 truncate max-w-[160px]">
              {tApp("tagline")}
            </div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
          return (
            <Link
              key={item.key}
              href={item.href}
              data-tour={item.key === "ai" ? "ai-link" : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-white shadow-sm"
                  : "text-sidebar-foreground hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span>{isHe ? item.labelHe : item.labelEn}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-sidebar-border">
        <div className="text-[11px] text-sidebar-foreground/60">v0.1.0 · Demo Mode</div>
      </div>
    </aside>
  );
}
