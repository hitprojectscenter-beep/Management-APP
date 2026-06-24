"use client";

import { useState } from "react";
import { LogIn, Mail, Lock, AlertTriangle } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { login, loginAsUser, DEMO_PASSWORD } from "@/lib/auth/session";
import { txt } from "@/lib/utils/locale-text";

interface SeededUser {
  id: string;
  name: string;
  email: string;
  image: string;
  title?: string;
  role: string;
}

export default function LoginClient({
  locale,
  seededUsers,
}: {
  locale: string;
  seededUsers: SeededUser[];
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Hard-navigate to the dashboard root so RoleProvider re-hydrates from
  // the freshly-written session.
  const goToApp = () => {
    window.location.href = `/${locale}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = login(email, password);
    if (res.ok) {
      goToApp();
      return;
    }
    setError(
      res.reason === "no_user"
        ? (txt(locale, { he: "המייל לא רשום במערכת. בקש ממנהל המערכת להוסיף אותך.", en: "Email not registered. Ask an admin to add you." }) as string)
        : (txt(locale, { he: "סיסמה שגויה.", en: "Incorrect password." }) as string),
    );
  };

  const quickLogin = (userId: string) => {
    if (loginAsUser(userId)) goToApp();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-white shadow-md mb-3 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/mapi-logo.png" alt="Mapi" className="size-12 object-contain" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">PMO++</h1>
          <p className="text-sm text-muted-foreground">{txt(locale, { he: "המרכז למיפוי ישראל", en: "Survey of Israel" })}</p>
        </div>

        {/* Login card */}
        <div className="bg-card border rounded-2xl shadow-xl p-6">
          <h2 className="text-lg font-semibold mb-4">{txt(locale, { he: "כניסה למערכת", en: "Sign in" })}</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <Mail className="size-3.5" /> {txt(locale, { he: "דואר אלקטרוני", en: "Email" })}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@mapi.gov.il"
                dir="ltr"
                autoComplete="email"
                className="w-full min-h-[44px] px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <Lock className="size-3.5" /> {txt(locale, { he: "סיסמה", en: "Password" })}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                dir="ltr"
                autoComplete="current-password"
                className="w-full min-h-[44px] px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md p-2">
                <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 transition"
            >
              <LogIn className="size-4" /> {txt(locale, { he: "כניסה", en: "Sign in" })}
            </button>
          </form>

          {/* Demo-mode hint */}
          <div className="mt-3 text-[11px] text-muted-foreground bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-md p-2">
            {txt(locale, {
              he: `מצב הדגמה — סיסמה לכל המשתמשים: `,
              en: `Demo mode — password for all users: `,
            })}
            <code className="font-mono font-semibold">{DEMO_PASSWORD}</code>
          </div>
        </div>

        {/* Quick login as a team member */}
        <div className="bg-card/60 border rounded-2xl p-4">
          <p className="text-xs text-muted-foreground mb-2 text-center">
            {txt(locale, { he: "כניסה מהירה כחבר צוות (הדגמה)", en: "Quick sign-in as a team member (demo)" })}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {seededUsers.map((u) => (
              <button
                key={u.id}
                onClick={() => quickLogin(u.id)}
                className="flex items-center gap-2 p-2 rounded-lg border hover:bg-accent transition text-start min-h-[44px]"
              >
                <Avatar src={u.image} fallback={u.name[0]} className="size-8 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-medium truncate">{u.name}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{u.title || u.role}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
