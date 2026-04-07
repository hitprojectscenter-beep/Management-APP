import createMiddleware from "next-intl/middleware";
import { routing } from "./lib/i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Match all paths except api, _next, _vercel, and static files
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
