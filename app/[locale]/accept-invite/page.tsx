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
 */
export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AcceptInviteClient locale={locale} />;
}
