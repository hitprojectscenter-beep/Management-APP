"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, AlertTriangle, Loader2, ArrowLeft } from "lucide-react";
import { mockUsers, type MockUser } from "@/lib/db/mock-data";
import { txt } from "@/lib/utils/locale-text";

/**
 * Reverse of buildInviteToken on the server. Plain base64url-encoded
 * JSON — no signature check because the token's only job is to map
 * back to a user record (see comment on buildInviteToken in
 * app/api/team/invite/route.ts).
 *
 * Payload includes the full MockUser shape so we can rebuild the user
 * on the client without depending on the in-memory mockUsers array
 * (which gets wiped on every Fast Refresh in dev and every cold start
 * in Vercel production).
 */
interface DecodedInvite {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  title?: string;
  image: string;
  locale: "he" | "en";
  role: MockUser["role"];
  iat: number;
}

function decodeToken(token: string): DecodedInvite | null {
  try {
    // atob handles base64; to support base64url we swap chars first.
    const b64 = token.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    // atob returns a *binary* string (each char = 1 byte). For Hebrew
    // names we need to re-interpret those bytes as UTF-8 — otherwise
    // multi-byte chars come out as garbled mojibake (×××× ××××).
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const json = new TextDecoder("utf-8").decode(bytes);
    const parsed = JSON.parse(json);
    if (typeof parsed?.uid === "string" && typeof parsed?.name === "string") return parsed;
    return null;
  } catch {
    return null;
  }
}

/**
 * Reconstruct a MockUser from the decoded token. Used both for the
 * welcome screen display and to push into client-side mockUsers on
 * accept (so the new member shows up in the team page, role switcher,
 * assignee dropdowns, etc. for the rest of the session).
 */
function userFromToken(decoded: DecodedInvite): MockUser {
  return {
    id: decoded.uid,
    name: decoded.name,
    email: decoded.email,
    phone: decoded.phone,
    title: decoded.title,
    image: decoded.image,
    locale: decoded.locale,
    role: decoded.role,
    skills: [],
    performanceScore: 80,
    hourlyCapacity: 40,
  };
}

export default function AcceptInviteClient({ locale }: { locale: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  const [submitting, setSubmitting] = useState(false);

  // Resolve the invited user from the token. The token carries the
  // full user record (see route.ts buildInviteToken comment), so we
  // can render the welcome card without depending on mockUsers — that
  // array gets wiped between the invite POST and this page load.
  const invited = useMemo<MockUser | null>(() => {
    if (!token) return null;
    const decoded = decodeToken(token);
    if (!decoded) return null;
    // Prefer an existing in-memory entry if there is one (preserves
    // the original skills/score/capacity fields), otherwise rebuild
    // from the token payload.
    const existing = mockUsers.find((u) => u.id === decoded.uid);
    if (existing) return existing;
    return userFromToken(decoded);
  }, [token]);

  // Note: we intentionally DON'T flip localStorage automatically on
  // mount. The recipient has to actively click "Continue" to confirm —
  // otherwise visiting the link from a shared device would silently
  // hijack the active user, which is a confusing UX.

  const handleAccept = () => {
    if (!invited) return;
    setSubmitting(true);

    // Push the user into the client-side mockUsers array so they show
    // up in the team page, role switcher, and assignee dropdowns for
    // the rest of the session. Idempotent: dedupe on id.
    if (!mockUsers.some((u) => u.id === invited.id)) {
      mockUsers.push(invited);
    }

    try {
      window.localStorage.setItem("pmo_active_user_id", invited.id);
      // Also stash the full user payload so the next page load can
      // re-add them to mockUsers if a refresh wipes the array (e.g.
      // navigating away and back will lose the push above).
      window.localStorage.setItem("pmo_invited_user_payload", JSON.stringify(invited));
    } catch {
      // localStorage may throw in private mode — proceed anyway.
    }
    // Hard navigation so the dashboard's RoleProvider re-hydrates from
    // localStorage. router.push uses client-side nav which would keep
    // the old in-memory userId.
    window.location.href = `/${locale}`;
  };

  // ---------- Error state: token missing or invalid ----------
  if (!token || !invited) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
        <div className="max-w-md w-full bg-card border rounded-2xl shadow-xl p-8 text-center">
          <div className="size-16 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="size-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold mb-2">
            {txt(locale, { he: "קישור ההזמנה לא תקין", en: "Invalid invite link" })}
          </h1>
          <p className="text-muted-foreground text-sm mb-6">
            {txt(locale, {
              he: "ייתכן שהקישור נחתך, פג תוקפו, או שהמשתמש כבר אינו קיים. בקש מהשולח לשלוח הזמנה חדשה.",
              en: "The link may be truncated, expired, or the user no longer exists. Ask the sender to issue a new invitation.",
            })}
          </p>
          <button
            onClick={() => router.push(`/${locale}`)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-sm font-medium"
          >
            <ArrowLeft className="size-4" />
            {txt(locale, { he: "חזרה לדף הבית", en: "Back to home" })}
          </button>
        </div>
      </div>
    );
  }

  // ---------- Happy state: token resolves to a user ----------
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-slate-50 to-cyan-50 dark:from-violet-950/30 dark:via-slate-950 dark:to-cyan-950/30 p-4">
      <div className="max-w-md w-full bg-card border rounded-2xl shadow-2xl overflow-hidden">
        {/* Header with gradient */}
        <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 text-white p-6 text-center">
          <div className="size-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="size-9" />
          </div>
          <h1 className="text-2xl font-bold mb-1">
            {txt(locale, { he: `ברוך הבא, ${invited.name}!`, en: `Welcome, ${invited.name}!` })}
          </h1>
          <p className="text-white/80 text-sm">
            {txt(locale, {
              he: "ההזמנה לפלטפורמת PMO++ אומתה.",
              en: "Your invitation to PMO++ has been verified.",
            })}
          </p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Account summary */}
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-muted-foreground">{txt(locale, { he: "שם מלא", en: "Full name" })}</span>
              <span className="font-medium">{invited.name}</span>
            </div>
            {invited.title && (
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-muted-foreground">{txt(locale, { he: "תפקיד", en: "Role" })}</span>
                <span className="font-medium text-end">{invited.title}</span>
              </div>
            )}
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-muted-foreground">{txt(locale, { he: "הרשאות", en: "Permission level" })}</span>
              <span className="font-medium uppercase tracking-wide text-xs px-2 py-0.5 rounded bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300">
                {invited.role}
              </span>
            </div>
          </div>

          {/* Demo-mode disclosure — be honest that this is mock-mode */}
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 text-xs text-amber-900 dark:text-amber-100">
            <strong>{txt(locale, { he: "מצב הדגמה: ", en: "Demo mode: " })}</strong>
            {txt(locale, {
              he: "ביישום זה אין סיסמה נפרדת. בלחיצה על \"המשך\" אתה תיכנס מיד בזהותך — שאר חברי הצוות יוכלו לראות אותך ולשייך לך משימות.",
              en: "This demo has no separate password. Click \"Continue\" to enter as yourself — the rest of the team will see you and can assign tasks to you.",
            })}
          </div>

          {/* Continue */}
          <button
            onClick={handleAccept}
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-700 hover:from-violet-700 hover:to-indigo-800 text-white font-medium transition-all shadow-md hover:shadow-lg disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {txt(locale, { he: "מאמת...", en: "Verifying..." })}
              </>
            ) : (
              <>
                {txt(locale, { he: `המשך כ-${invited.name}`, en: `Continue as ${invited.name}` })}
                <ArrowLeft className="size-4 rtl:rotate-180" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
