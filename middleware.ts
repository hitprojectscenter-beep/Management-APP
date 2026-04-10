import createMiddleware from "next-intl/middleware";
import { routing } from "./lib/i18n/routing";

/**
 * next-intl middleware with locale detection:
 * 1. URL prefix (explicit): /en, /ru, /fr, /es
 * 2. Accept-Language header (browser/geo): auto-detected
 * 3. Fallback: Hebrew (defaultLocale)
 *
 * The "localeDetection: true" flag tells next-intl to read
 * the Accept-Language header, which browsers set based on
 * the user's OS language / region settings.
 */
export default createMiddleware({
  ...routing,
  localeDetection: true,
});

export const config = {
  // Match all paths except api, _next, _vercel, and static files
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
