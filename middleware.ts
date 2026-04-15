import createMiddleware from "next-intl/middleware";
import { routing } from "./lib/i18n/routing";

/**
 * next-intl middleware:
 * - localeDetection: false — do NOT auto-detect from Accept-Language header.
 *   This prevents the browser's OS language from overriding the user's
 *   explicit language choice. The user switches language via the UI toggle,
 *   and next-intl stores the preference in a NEXT_LOCALE cookie.
 * - Locale is determined by: 1) URL prefix (/en, /ru...) 2) Cookie 3) defaultLocale (he)
 */
export default createMiddleware({
  ...routing,
  localeDetection: false,
});

export const config = {
  // Match all paths except api, _next, _vercel, and static files
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
