"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSessionUserId } from "@/lib/auth/session";
import { fetchSession } from "@/lib/auth/client-auth";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { txt } from "@/lib/utils/locale-text";

/**
 * Client-side gate. When a database is configured (real auth), the source of
 * truth is the server session (httpOnly cookie) resolved via /api/auth/me —
 * we also mirror the user id into localStorage so the existing role-context
 * (which keys off localStorage) shows the right person. With no DB it falls
 * back to the localStorage demo session. No session → /login.
 *
 * If the signed-in user still carries an admin-set initial password
 * (mustChangePassword), the app is BLOCKED behind a forced change-password
 * screen until they replace it — the first-login control required for
 * admin-provisioned accounts.
 */
export function AuthGate({ locale, children }: { locale: string; children: React.ReactNode }) {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [mustChange, setMustChange] = useState(false);
  const [reload, setReload] = useState(0);

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
          setMustChange(!!user.mustChangePassword);
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
  }, [locale, router, reload]);

  if (authed !== true) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20">
        <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (mustChange) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">
              {txt(locale, { he: "החלפת סיסמה ראשונית", en: "Set your new password" })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm
              locale={locale}
              forced
              onDone={() => {
                // Re-fetch the session: the server cleared mustChangePassword.
                setMustChange(false);
                setReload((r) => r + 1);
              }}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
