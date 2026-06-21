"use client";

import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { Link, usePathname } from "@/lib/i18n/routing";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, NAV_GROUPS, NAV_GROUP_OF, type NavGroupKey } from "./nav-items";
import { txt, ORG_NAME } from "@/lib/utils/locale-text";
import { useRole } from "@/lib/auth/role-context";

const COLLAPSED_KEY = "pmo:sidebar:collapsed-groups";

/**
 * Shared sidebar content used by both desktop aside and mobile drawer.
 */
export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const tApp = useTranslations("app");
  const locale = useLocale();
  const pathname = usePathname();
  const isHe = locale === "he";
  const { role, can } = useRole();

  // Collapsed group state — persisted to localStorage so the user's layout
  // preference survives reloads. Default: everything expanded.
  const [collapsed, setCollapsed] = useState<Set<NavGroupKey>>(new Set());
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(COLLAPSED_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) setCollapsed(new Set(arr as NavGroupKey[]));
      }
    } catch {}
  }, []);
  const toggleGroup = (key: NavGroupKey) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      try {
        window.localStorage.setItem(COLLAPSED_KEY, JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  // Filter nav items based on role permissions
  const visibleNavItems = NAV_ITEMS.filter((item) => {
    // Admin page: only admin
    if (item.key === "admin") return role === "admin";
    // Automations: need manage_automations
    if (item.key === "automations") return can("manage_automations");
    // AI Center: need ai_access
    if (item.key === "ai") return can("ai_access");
    // Settings: need manage_settings or admin
    if (item.key === "settings") return role === "admin" || can("manage_settings");
    // Reports: need view_reports
    if (item.key === "reports") return can("view_reports");
    // Risks: need view_all (managers+)
    if (item.key === "risks") return can("view_all");
    // Everything else is visible to all
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-900 via-indigo-950 to-purple-950 text-sidebar-foreground">
      <div className="px-5 py-5 border-b border-sidebar-border">
        <Link href="/" onClick={onNavigate} className="flex items-center gap-3 group">
          <div className="size-12 rounded-lg bg-white shadow-lg shadow-indigo-500/30 ring-2 ring-white/20 flex items-center justify-center shrink-0 p-1">
            <Image
              src="/mapi-logo.png"
              alt="המרכז למיפוי ישראל"
              width={40}
              height={40}
              priority
              className="object-contain"
            />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-white leading-tight">
              {txt(locale, ORG_NAME)}
            </div>
            <div className="text-[11px] text-sidebar-foreground/70 truncate">
              {tApp("name")} · {tApp("tagline")}
            </div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_GROUPS.map((group) => {
          // Items belonging to this group that survived the RBAC filter
          const items = visibleNavItems.filter(
            (item) => NAV_GROUP_OF[item.key] === group.key
          );
          if (items.length === 0) return null;
          const isCollapsed = collapsed.has(group.key);
          const hasActiveInside = items.some((item) => {
            if (item.href === "/") return pathname === "/";
            if (item.href === "/dashboard") return pathname === "/dashboard";
            return pathname.startsWith(item.href);
          });
          // If the user is inside this group, force-expand it so they see the
          // active item even after a navigation.
          const effectivelyCollapsed = isCollapsed && !hasActiveInside;
          return (
            <div key={group.key} className="pt-3 first:pt-0">
              <button
                type="button"
                onClick={() => toggleGroup(group.key)}
                className="w-full flex items-center justify-between px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/60 hover:text-sidebar-foreground/90 transition-colors"
                aria-expanded={!effectivelyCollapsed}
              >
                <span>{group.labels[locale] || group.labels.en}</span>
                <ChevronDown
                  className={cn(
                    "size-3 shrink-0 transition-transform",
                    effectivelyCollapsed && "-rotate-90"
                  )}
                />
              </button>
              {!effectivelyCollapsed && (
                <div className="space-y-1">
                  {items.map((item) => {
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
                        onClick={onNavigate}
                        data-tour={item.key === "ai" ? "ai-link" : undefined}
                        title={item.tooltips?.[locale] || item.tooltips?.en || ""}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors min-h-[44px]",
                          isActive
                            ? "bg-white/15 text-white shadow-lg nav-glow backdrop-blur-sm"
                            : "text-sidebar-foreground/80 hover:bg-white/10 hover:text-white active:bg-white/15 transition-all duration-200"
                        )}
                      >
                        <Icon className="size-4 shrink-0" />
                        <span>{item.labels[locale] || item.labels.en}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-sidebar-border">
        <div className="text-[11px] text-sidebar-foreground/60">v0.1.0 · Demo Mode</div>
      </div>
    </div>
  );
}

/**
 * Desktop-only static sidebar (>= lg breakpoint).
 * On mobile/tablet, a drawer is opened via the topbar hamburger button.
 */
export function Sidebar() {
  return (
    <aside
      className="hidden lg:flex w-64 flex-col border-e border-sidebar-border"
      data-tour="sidebar"
    >
      <SidebarContent />
    </aside>
  );
}
