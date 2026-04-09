import { defineRouting } from "next-intl/routing";
import { createNavigation } from "next-intl/navigation";
import { locales, defaultLocale } from "./config";

export const routing = defineRouting({
  locales,
  defaultLocale,
  // "as-needed" means the default locale (Hebrew) is served without a prefix.
  // Visitors going to "/" get Hebrew directly; English users get "/en".
  localePrefix: "as-needed",
});

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
