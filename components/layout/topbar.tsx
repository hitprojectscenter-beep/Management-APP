"use client";

import { useTranslations, useLocale } from "next-intl";
import { useRouter, usePathname } from "@/lib/i18n/routing";
import { Search, Bell, Sun, Moon, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function Topbar() {
  const t = useTranslations("common");
  const tNav = useTranslations("nav");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const switchLocale = () => {
    const next = locale === "he" ? "en" : "he";
    router.replace(pathname, { locale: next });
  };

  return (
    <header className="h-14 bg-background border-b border-border flex items-center px-4 lg:px-6 gap-4 sticky top-0 z-30 backdrop-blur-md bg-background/80">
      <div className="flex-1 max-w-md relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder={t("search") + "..."}
          className="ps-9 h-9 bg-muted/30 border-0"
        />
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={switchLocale} title="Switch language">
          <Globe className="size-4" />
          <span className="text-xs font-semibold ms-1">
            {locale === "he" ? "EN" : "עב"}
          </span>
        </Button>

        {mounted && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title="Toggle theme"
          >
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
        )}

        <Button variant="ghost" size="icon" className="relative" title="Notifications">
          <Bell className="size-4" />
          <span className="absolute top-1.5 end-1.5 size-2 rounded-full bg-red-500" />
        </Button>

        <div className="ms-2 flex items-center gap-2 px-2 py-1 rounded-md hover:bg-accent cursor-pointer">
          <Avatar
            src="https://api.dicebear.com/7.x/initials/svg?seed=Ori"
            fallback="או"
            className="size-7"
          />
          <div className="hidden md:block">
            <div className="text-xs font-medium">אורי מרקוביץ'</div>
            <div className="text-[10px] text-muted-foreground">{tNav("settings")}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
