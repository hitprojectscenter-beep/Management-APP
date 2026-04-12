"use client";

import { useTranslations, useLocale } from "next-intl";
import { useRouter, usePathname } from "@/lib/i18n/routing";
import { Search, Bell, Sun, Moon, Globe, Menu, ChevronDown, Crown, Shield, User as UserIcon, Eye, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { HelpTrigger } from "@/components/help/help-trigger";
import { SidebarContent } from "./sidebar";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { mockUsers } from "@/lib/db/mock-data";
import { ROLE_LABELS } from "@/lib/rbac/abilities";
import { locales, localeNames, localeFlags, type Locale } from "@/lib/i18n/config";
import { useRole } from "@/lib/auth/role-context";
import type { UserRole } from "@/lib/db/types";

const ROLE_ICONS: Record<UserRole, typeof Crown> = {
  admin: Crown,
  manager: Shield,
  member: UserIcon,
  viewer: Eye,
  guest: UserX,
};

const ROLE_BADGE_COLORS: Record<UserRole, string> = {
  admin: "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-300",
  manager: "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300",
  member: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300",
  viewer: "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300",
  guest: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

export function Topbar() {
  const t = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const { currentUser, switchUser, role } = useRole();
  const isHe = locale === "he";

  useEffect(() => setMounted(true), []);

  const switchToLocale = (next: string) => {
    router.replace(pathname, { locale: next });
    setLangMenuOpen(false);
  };

  const RoleIcon = ROLE_ICONS[role] || Shield;

  return (
    <header className="h-14 bg-background border-b border-border flex items-center px-3 sm:px-4 lg:px-6 gap-2 sm:gap-4 sticky top-0 z-30 backdrop-blur-md bg-background/80">
      {/* Mobile hamburger */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden min-w-[44px] min-h-[44px]"
            aria-label={isHe ? "פתח תפריט" : "Open menu"}
          >
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side={isHe ? "end" : "start"} className="p-0 w-72 max-w-[85vw]">
          <SheetTitle className="sr-only">{isHe ? "תפריט ניווט" : "Navigation menu"}</SheetTitle>
          <SidebarContent onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Search */}
      <div className="flex-1 max-w-md relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder={t("search") + "..."}
          className="ps-9 h-9 bg-muted/30 border-0"
        />
      </div>

      <div className="flex items-center gap-0.5 sm:gap-1">
        {/* ==== ROLE SWITCHER ==== */}
        <div className="relative" data-tour="role-switcher">
          <button
            onClick={() => setRoleMenuOpen(!roleMenuOpen)}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors min-h-[36px]",
              ROLE_BADGE_COLORS[role],
              "hover:opacity-80"
            )}
            title={isHe ? "החלף תפקיד" : "Switch role"}
          >
            <RoleIcon className="size-3.5" />
            <span className="hidden sm:inline">{ROLE_LABELS[role]?.[locale] || role}</span>
            <ChevronDown className="size-3" />
          </button>
          {roleMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setRoleMenuOpen(false)} />
              <div className="absolute z-50 mt-1 w-64 rounded-lg bg-card border shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 end-0">
                <div className="px-3 py-2 border-b bg-muted/30">
                  <div className="text-[10px] text-muted-foreground uppercase font-semibold">
                    {isHe ? "החלף תפקיד / משתמש" : "Switch Role / User"}
                  </div>
                </div>
                {mockUsers.map((user) => {
                  const Icon = ROLE_ICONS[user.role] || Shield;
                  const isActive = currentUser.id === user.id;
                  return (
                    <button
                      key={user.id}
                      onClick={() => { switchUser(user.id); setRoleMenuOpen(false); }}
                      className={cn(
                        "w-full px-3 py-2.5 text-sm flex items-center gap-3 min-h-[44px] transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary font-semibold"
                          : "hover:bg-accent"
                      )}
                    >
                      <Avatar src={user.image} fallback={user.name[0]} className="size-7" />
                      <div className="flex-1 text-start min-w-0">
                        <div className="text-xs font-medium truncate">{user.name}</div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Icon className="size-2.5" />
                          {ROLE_LABELS[user.role]?.[locale] || user.role}
                        </div>
                      </div>
                      {isActive && <span className="text-xs">✓</span>}
                    </button>
                  );
                })}
                <div className="px-3 py-2 border-t bg-muted/20 text-[10px] text-muted-foreground">
                  {isHe ? "💡 הממשק ישתנה בהתאם להרשאות התפקיד" : "💡 UI adapts to the selected role's permissions"}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Language */}
        <div className="relative" data-tour="language-toggle">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLangMenuOpen(!langMenuOpen)}
            title="Switch language"
            className="min-w-[44px] min-h-[44px]"
          >
            <Globe className="size-4" />
            <span className="text-xs font-semibold ms-1 hidden sm:inline">
              {localeFlags[locale as Locale]}
            </span>
          </Button>
          {langMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setLangMenuOpen(false)} />
              <div className="absolute z-50 mt-1 w-44 rounded-lg bg-card border shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 end-0">
                {locales.map((loc) => (
                  <button
                    key={loc}
                    onClick={() => switchToLocale(loc)}
                    className={cn(
                      "w-full px-3 py-2.5 text-sm flex items-center gap-2 min-h-[44px] transition-colors",
                      locale === loc
                        ? "bg-primary/10 text-primary font-semibold"
                        : "hover:bg-accent"
                    )}
                  >
                    <span className="text-base">{localeFlags[loc]}</span>
                    <span>{localeNames[loc]}</span>
                    {locale === loc && <span className="ms-auto text-xs">✓</span>}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {mounted && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title="Toggle theme"
            data-tour="theme-toggle"
            className="min-w-[44px] min-h-[44px]"
          >
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
        )}

        <HelpTrigger />

        <Button
          variant="ghost"
          size="icon"
          className="relative min-w-[44px] min-h-[44px] hidden sm:inline-flex"
          title="Notifications"
        >
          <Bell className="size-4" />
          <span className="absolute top-1.5 end-1.5 size-2 rounded-full bg-red-500" />
        </Button>

        {/* User avatar */}
        <div className="ms-1 sm:ms-2 flex items-center gap-2 px-1.5 sm:px-2 py-1 rounded-md hover:bg-accent cursor-pointer">
          <Avatar
            src={currentUser.image}
            fallback={currentUser.name[0]}
            className="size-8"
          />
          <div className="hidden md:block">
            <div className="text-xs font-medium">{currentUser.name}</div>
            <div className="text-[10px] text-muted-foreground">
              {ROLE_LABELS[currentUser.role]?.[locale] || currentUser.role}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
