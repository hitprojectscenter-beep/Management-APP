import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import AcceptInviteClient from "./accept-invite-client";

/**
 * Invite acceptance landing page.
 *
 * Renders outside the dashboard layout (no sidebar/topbar) so the
 * recipient sees a clean welcome screen instead of being dropped into
 * the default-user dashboard chrome before they've activated their
 * account. The actual UX is in accept-invite-client.tsx (client
 * component) because it needs URL params and localStorage.
 *
 * The Suspense wrapper is required: AcceptInviteClient calls
 * useSearchParams(), and Next.js 15 bails out of static prerender
 * (with a build-time error) unless any component using that hook is
 * inside a Suspense boundary. The fallback renders a minimal skeleton
 * while the client component hydrates and reads the URL.
 */
export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
          <div className="max-w-md w-full bg-card border rounded-2xl shadow-xl p-8 text-center">
            <div className="size-12 rounded-full bg-violet-100 dark:bg-violet-950/40 animate-pulse mx-auto mb-4" />
            <div className="h-6 bg-muted rounded animate-pulse mx-auto w-3/4 mb-2" />
            <div className="h-4 bg-muted rounded animate-pulse mx-auto w-1/2" />
          </div>
        </div>
      }
    >
      <AcceptInviteClient locale={locale} />
    </Suspense>
  );
}
