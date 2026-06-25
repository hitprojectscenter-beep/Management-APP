"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSessionUserId } from "@/lib/auth/session";
import { fetchSession } from "@/lib/auth/client-auth";

/**
 * Client-side gate. When a database is configured (real auth), the source of
 * truth is the server session (httpOnly cookie) resolved via /api/auth/me —
 * we also mirror the user id into localStorage so the existing role-context
 * (which keys off localStorage) shows the right person. With no DB it falls
 * back to the localStorage demo session. No session → /login. Renders nothing
 * until the check resolves (avoids a dashboard flash before redirect). /login
 * lives outside the dashboard group, so it's never gated — no redirect loop.
 */
export function AuthGate({ locale, children }: { locale: string; children: React.ReactNode }) {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { user, dbConfigured } = await fetchSession();
      if (!active) return;

      if (dbConfigured) {
        if (user) {
          try {
            window.localStorage.setItem("pmo_session_user_id", user.id);
            window.localStorage.setItem("pmo_active_user_id", user.id);
          } catch {
            /* private mode — in-memory still works */
          }
          setAuthed(true);
        } else {
          setAuthed(false);
          router.replace(`/${locale}/login`);
        }
        return;
      }

      // No DB — demo mode gates on the localStorage session.
      if (getSessionUserId()) {
        setAuthed(true);
      } else {
        setAuthed(false);
        router.replace(`/${locale}/login`);
      }
    })();
    return () => {
      active = false;
    };
  }, [locale, router]);

  if (authed !== true) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20">
        <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }
  return <>{children}</>;
}
