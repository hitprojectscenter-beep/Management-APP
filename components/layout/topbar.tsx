"use client";

import { useTranslations, useLocale } from "next-intl";
import { useRouter, usePathname } from "@/lib/i18n/routing";
import { Search, Bell, Sun, Moon, Globe, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { HelpTrigger } from "@/components/help/help-trigger";
import { SidebarContent } from "./sidebar";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { CURRENT_USER_ID, getUserById } from "@/lib/db/mock-data";
import { ROLE_LABELS } from "@/lib/rbac/abilities";

export function Topbar() {
  const t = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const currentUser = getUserById(CURRENT_USER_ID);
  const isHe = locale === "he";

  useEffect(() => setMounted(true), []);

  const switchLocale = () => {
    const next = locale === "he" ? "en" : "he";
    router.replace(pathname, { locale: next });
  };

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

      {/* Search - shrinks on mobile, full on tablet+ */}
      <div className="flex-1 max-w-md relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder={t("search") + "..."}
          className="ps-9 h-9 bg-muted/30 border-0"
        />
      </div>

      <div className="flex items-center gap-0.5 sm:gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={switchLocale}
          title="Switch language"
          data-tour="language-toggle"
          className="min-w-[44px] min-h-[44px]"
        >
          <Globe className="size-4" />
          <span className="text-xs font-semibold ms-1 hidden sm:inline">
            {locale === "he" ? "EN" : "עב"}
          </span>
        </Button>

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

        {currentUser && (
          <div className="ms-1 sm:ms-2 flex items-center gap-2 px-1.5 sm:px-2 py-1 rounded-md hover:bg-accent cursor-pointer">
            <Avatar
              src={currentUser.image}
              fallback={currentUser.name[0]}
              className="size-8"
            />
            <div className="hidden md:block">
              <div className="text-xs font-medium">{currentUser.name}</div>
              <div className="text-[10px] text-muted-foreground">
                {ROLE_LABELS[currentUser.role][locale as "he" | "en"]}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
