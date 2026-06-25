"use client";

import { useState } from "react";
import { LogIn, Mail, Lock, AlertTriangle, ChevronDown, Sparkles } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { TopoBackdrop } from "@/components/brand/topo-backdrop";
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
  const [showDemo, setShowDemo] = useState(false);

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
    <div className="min-h-screen flex items-center justify-center bg-secondary/40 dark:bg-background p-4 relative overflow-hidden">
      {/* Page-level brand wash */}
      <TopoBackdrop className="text-primary opacity-40 dark:opacity-25" />

      <div className="w-full max-w-md relative">
        {/* Brand hero */}
        <div className="relative overflow-hidden rounded-t-3xl bg-primary text-primary-foreground px-6 pt-7 pb-9 text-center shadow-pop">
          <TopoBackdrop className="text-primary-foreground opacity-25" />
          <div className="relative">
            <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-white shadow-md mb-3 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/mapi-logo.png" alt="Mapi" className="size-12 object-contain" />
            </div>
            <h1 dir="ltr" className="text-2xl font-bold tracking-tight">PMO++</h1>
            <p className="text-sm text-primary-foreground/80">{txt(locale, { he: "המרכז למיפוי ישראל", en: "Survey of Israel" })}</p>
          </div>
        </div>

        {/* Login card — overlaps the hero for a layered, modern feel */}
        <div className="relative -mt-4 rounded-3xl bg-card border shadow-card p-6">
          <h2 className="text-lg font-semibold">{txt(locale, { he: "ברוך שובך", en: "Welcome back" })}</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {txt(locale, { he: "היכנס/י כדי להמשיך לעבודה", en: "Sign in to continue" })}
          </p>
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
                className="w-full min-h-[44px] px-3 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
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
                className="w-full min-h-[44px] px-3 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
                required
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-2.5">
                <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-medium shadow-card hover:shadow-pop hover:-translate-y-0.5 active:translate-y-0 transition-all"
            >
              <LogIn className="size-4" /> {txt(locale, { he: "כניסה", en: "Sign in" })}
            </button>
          </form>

          {/* Demo options — tucked behind a toggle so the default view stays
              clean and product-like (no password on display). */}
          <button
            type="button"
            onClick={() => setShowDemo((s) => !s)}
            className="mt-4 w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition min-h-[36px]"
          >
            <Sparkles className="size-3.5" />
            {txt(locale, { he: "אפשרויות הדגמה", en: "Demo options" })}
            <ChevronDown className={`size-3.5 transition-transform ${showDemo ? "rotate-180" : ""}`} />
          </button>

          {showDemo && (
            <div className="mt-2 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="text-[11px] text-muted-foreground bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl p-2.5">
                {txt(locale, { he: "סיסמת הדגמה לכל המשתמשים: ", en: "Demo password for all users: " })}
                <code className="font-mono font-semibold">{DEMO_PASSWORD}</code>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground mb-2 text-center">
                  {txt(locale, { he: "כניסה מהירה כחבר צוות", en: "Quick sign-in as a team member" })}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {seededUsers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => quickLogin(u.id)}
                      className="lift flex items-center gap-2 p-2 rounded-xl border bg-card hover:bg-accent text-start min-h-[44px]"
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
          )}
        </div>

        <p className="text-center text-[11px] text-muted-foreground mt-4">
          {txt(locale, { he: "מערכת ניהול תיק עבודות · המרכז למיפוי ישראל", en: "Project management workspace · Survey of Israel" })}
        </p>
      </div>
    </div>
  );
}
