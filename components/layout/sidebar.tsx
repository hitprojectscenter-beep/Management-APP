"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link, usePathname } from "@/lib/i18n/routing";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-items";

/**
 * Shared sidebar content used by both desktop aside and mobile drawer.
 */
export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const tApp = useTranslations("app");
  const locale = useLocale();
  const pathname = usePathname();
  const isHe = locale === "he";

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      <div className="px-5 py-5 border-b border-sidebar-border">
        <Link href="/" onClick={onNavigate} className="flex items-center gap-3 group">
          <div className="size-12 rounded-lg bg-white/95 flex items-center justify-center shadow-lg shrink-0 p-1.5">
            <Image
              src="/mapi-logo.svg"
              alt="המרכז למיפוי ישראל"
              width={36}
              height={36}
              priority
            />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-white leading-tight">
              {isHe ? "המרכז למיפוי ישראל" : "Israel Mapping Center"}
            </div>
            <div className="text-[11px] text-sidebar-foreground/70 truncate">
              {tApp("name")} · {tApp("tagline")}
            </div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
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
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors min-h-[44px]",
                isActive
                  ? "bg-sidebar-accent text-white shadow-sm"
                  : "text-sidebar-foreground hover:bg-white/5 hover:text-white active:bg-white/10"
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
