"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/lib/i18n/routing";
import {
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
  { key: "dashboard", icon: LayoutDashboard, href: "/" },
  { key: "portfolios", icon: Boxes, href: "/portfolios" },
  { key: "projects", icon: Briefcase, href: "/projects" },
  { key: "tasks", icon: CheckSquare, href: "/tasks" },
  { key: "calendar", icon: Calendar, href: "/calendar" },
  { key: "ai", icon: Sparkles, href: "/ai" },
  { key: "reports", icon: BarChart3, href: "/reports" },
  { key: "automations", icon: Workflow, href: "/automations" },
  { key: "team", icon: Users, href: "/team" },
  { key: "settings", icon: Settings, href: "/settings" },
] as const;

export function Sidebar() {
  const t = useTranslations("nav");
  const tApp = useTranslations("app");
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex w-64 flex-col bg-sidebar text-sidebar-foreground border-e border-sidebar-border">
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
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-white shadow-sm"
                  : "text-sidebar-foreground hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span>{t(item.key)}</span>
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
