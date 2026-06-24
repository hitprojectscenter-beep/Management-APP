import { setRequestLocale } from "next-intl/server";
import { mockUsers } from "@/lib/db/mock-data";
import LoginClient from "./login-client";

/**
 * Login page — rendered OUTSIDE the dashboard layout so it isn't gated
 * by AuthGate (which would cause a redirect loop). Demo-grade auth; see
 * lib/auth/session.ts.
 */
export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  // Pass the seeded users so the client can offer quick-login buttons
  // without reaching into the module on the server boundary.
  const seeded = mockUsers.map((u) => ({ id: u.id, name: u.name, email: u.email, image: u.image, title: u.title, role: u.role }));
  return <LoginClient locale={locale} seededUsers={seeded} />;
}
