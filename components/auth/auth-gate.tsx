"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSessionUserId } from "@/lib/auth/session";

/**
 * Client-side gate: if there's no logged-in session, send the visitor to
 * /login. Renders nothing until the check completes (avoids a flash of the
 * dashboard before redirect). The /login route lives OUTSIDE the dashboard
 * group, so it's never gated — no redirect loop.
 */
export function AuthGate({ locale, children }: { locale: string; children: React.ReactNode }) {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    if (getSessionUserId()) {
      setAuthed(true);
    } else {
      setAuthed(false);
      router.replace(`/${locale}/login`);
    }
  }, [locale, router]);

  if (authed !== true) {
    // Brief neutral placeholder while we check / redirect.
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20">
        <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }
  return <>{children}</>;
}
