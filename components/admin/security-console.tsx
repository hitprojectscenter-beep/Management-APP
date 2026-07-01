"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { KeyRound, Unlock, Lock, ShieldAlert, Copy, X, Loader2, Search, RefreshCw } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { txt } from "@/lib/utils/locale-text";

interface SecUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
  image: string | null;
  isActive: boolean;
  lockedUntil: string | null;
  mustChangePassword: boolean;
}

/**
 * Admin-only security console — the single place to manage users' sign-in:
 * reset a password (issues a one-time temp password + forces a change), release
 * a brute-force lockout, and see who is locked or must change their password.
 * Reachable only from /admin (admin-gated) and talks to the RBAC-checked
 * /api/admin/users endpoints.
 */
export function SecurityConsole({ locale }: { locale: string }) {
  const isHe = locale === "he";
  const [users, setUsers] = useState<SecUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [tempPw, setTempPw] = useState<{ name: string; password: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setUsers(data.users || []);
      else toast.error(isHe ? "טעינת המשתמשים נכשלה" : "Failed to load users");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isLocked = (u: SecUser) => !!u.lockedUntil && new Date(u.lockedUntil).getTime() > Date.now();

  const resetPassword = async (u: SecUser) => {
    if (!confirm(isHe ? `לאפס סיסמה עבור ${u.name || u.email}? תופק סיסמה זמנית חדשה והמשתמש יתבקש להחליפה בכניסה הבאה.` : `Reset password for ${u.name || u.email}?`)) return;
    setBusyId(u.id);
    try {
      const res = await fetch(`/api/admin/users/${u.id}/password`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setTempPw({ name: u.name || u.email, password: data.tempPassword });
        setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, mustChangePassword: true, lockedUntil: null } : x)));
      } else toast.error(isHe ? "איפוס הסיסמה נכשל" : "Reset failed");
    } finally {
      setBusyId(null);
    }
  };

  const unlock = async (u: SecUser) => {
    setBusyId(u.id);
    try {
      const res = await fetch(`/api/admin/users/${u.id}/unlock`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, ...data.user } : x)));
        toast.success(isHe ? `הנעילה של ${u.name || u.email} שוחררה` : "Account unlocked");
      } else toast.error(isHe ? "שחרור הנעילה נכשל" : "Unlock failed");
    } finally {
      setBusyId(null);
    }
  };

  const term = q.trim().toLowerCase();
  const shown = term ? users.filter((u) => `${u.name ?? ""} ${u.email}`.toLowerCase().includes(term)) : users;
  const lockedCount = users.filter(isLocked).length;
  const mustChangeCount = users.filter((u) => u.mustChangePassword).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="size-5 animate-spin me-2" /> {isHe ? "טוען..." : "Loading..."}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Explanatory header — the security model at a glance */}
      <div className="rounded-xl border border-blue-200/60 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20 p-4 text-sm">
        <div className="flex items-center gap-2 font-semibold text-blue-900 dark:text-blue-100">
          <ShieldAlert className="size-4" /> {isHe ? "ניהול הזדהות ואבטחה — למנהל המערכת בלבד" : "Identity & Security — admin only"}
        </div>
        <ul className="mt-2 space-y-1 text-blue-900/80 dark:text-blue-200/80 text-[13px] list-disc list-inside">
          <li>{isHe ? "אפס סיסמה (🔑) — מפיק סיסמה זמנית חד-פעמית; המשתמש יתבקש להחליפה בכניסה הבאה." : "Reset password (🔑) — issues a one-time temp password; user must change it next login."}</li>
          <li>{isHe ? "שחרור נעילה (🔓) — חשבון ננעל ל-2 דקות אחרי 5 ניסיונות כושלים; כאן משחררים מיד (בלי לשנות סיסמה)." : "Unlock (🔓) — accounts lock for 2 min after 5 failed attempts; release immediately here."}</li>
          <li>{isHe ? "מדיניות סיסמה: לפחות 9 תווים, אות גדולה+קטנה, ספרה ותו מיוחד; אין לחזור ל-5 האחרונות. המייל אינו תלוי-רישיות." : "Policy: 9+ chars, upper+lower, digit, symbol; no reuse of last 5. Email is case-insensitive."}</li>
        </ul>
      </div>

      {/* One-time temp password banner */}
      {tempPw && (
        <div className="flex items-start gap-3 p-3 rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800">
          <KeyRound className="size-5 text-emerald-700 dark:text-emerald-300 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0 text-sm">
            <div className="font-semibold text-emerald-900 dark:text-emerald-100">
              {isHe ? `סיסמה זמנית עבור ${tempPw.name}:` : `Temporary password for ${tempPw.name}:`}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <code className="font-mono font-bold text-base bg-white dark:bg-black/30 px-2 py-1 rounded border" dir="ltr">{tempPw.password}</code>
              <button
                onClick={() => { navigator.clipboard?.writeText(tempPw.password); toast.success(isHe ? "הועתק" : "Copied"); }}
                className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300 hover:underline"
              >
                <Copy className="size-3.5" /> {isHe ? "העתק" : "Copy"}
              </button>
            </div>
            <p className="text-[11px] text-emerald-800/80 dark:text-emerald-200/80 mt-1">
              {isHe ? "מסור/י אותה למשתמש (מוצגת פעם אחת בלבד)." : "Hand it to the user (shown once)."}
            </p>
          </div>
          <button onClick={() => setTempPw(null)} className="text-emerald-700 dark:text-emerald-300 shrink-0"><X className="size-4" /></button>
        </div>
      )}

      {/* Toolbar: search + counts + refresh */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={isHe ? "חיפוש משתמש…" : "Search user…"}
            className="w-full h-9 ps-8 pe-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex items-center gap-2 text-xs">
          {lockedCount > 0 && <Badge variant="outline" className="border-red-300 text-red-600 gap-1"><Lock className="size-3" /> {lockedCount} {isHe ? "נעולים" : "locked"}</Badge>}
          {mustChangeCount > 0 && <Badge variant="outline" className="border-amber-300 text-amber-600">{mustChangeCount} {isHe ? "חייבים החלפת סיסמה" : "must change"}</Badge>}
          <button onClick={load} className="inline-flex items-center gap-1 h-9 px-3 rounded-md border text-muted-foreground hover:text-foreground hover:bg-accent">
            <RefreshCw className="size-3.5" /> {isHe ? "רענן" : "Refresh"}
          </button>
        </div>
      </div>

      {/* Users table */}
      <div className="rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="text-start font-medium px-3 py-2.5">{isHe ? "משתמש" : "User"}</th>
                <th className="text-start font-medium px-3 py-2.5">{isHe ? "מצב כניסה" : "Sign-in status"}</th>
                <th className="text-end font-medium px-3 py-2.5">{isHe ? "פעולות אבטחה" : "Security actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {shown.map((u) => (
                <tr key={u.id} className={cn("hover:bg-accent/30 transition-colors", busyId === u.id && "opacity-50")}>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar src={u.image || undefined} fallback={(u.name || u.email)[0]} className="size-8 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium truncate">{u.name}</div>
                        <div className="text-[11px] text-muted-foreground truncate" dir="ltr">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {!u.isActive && <Badge variant="outline" className="border-slate-300 text-muted-foreground">{isHe ? "מושבת" : "Disabled"}</Badge>}
                      {isLocked(u) && <Badge variant="outline" className="border-red-300 text-red-600 gap-1"><Lock className="size-3" /> {isHe ? "נעול" : "Locked"}</Badge>}
                      {u.mustChangePassword && <Badge variant="outline" className="border-amber-300 text-amber-600">{isHe ? "חייב החלפת סיסמה" : "Must change pw"}</Badge>}
                      {u.isActive && !isLocked(u) && !u.mustChangePassword && <Badge variant="outline" className="border-emerald-300 text-emerald-700 dark:text-emerald-300">{isHe ? "תקין" : "OK"}</Badge>}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => unlock(u)}
                        disabled={busyId === u.id}
                        title={isHe ? "שחרור נעילת חשבון (איפוס מונה הניסיונות; אינו משנה סיסמה)" : "Unlock account (reset attempt counter)"}
                        className={cn("inline-flex items-center gap-1 px-2.5 h-8 rounded-lg border text-xs", isLocked(u) ? "border-amber-300 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30" : "text-muted-foreground hover:bg-accent")}
                      >
                        <Unlock className="size-3.5" /> {isHe ? "שחרור נעילה" : "Unlock"}
                      </button>
                      <button
                        onClick={() => resetPassword(u)}
                        disabled={busyId === u.id}
                        title={isHe ? "איפוס סיסמה — הפקת סיסמה זמנית חד-פעמית ואילוץ החלפה בכניסה הבאה" : "Reset password — issue a one-time temp password"}
                        className="inline-flex items-center gap-1 px-2.5 h-8 rounded-lg border text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        <KeyRound className="size-3.5" /> {isHe ? "אפס סיסמה" : "Reset password"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {shown.length === 0 && (
                <tr><td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">{isHe ? "לא נמצאו משתמשים." : "No users."}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        {isHe
          ? "כל פעולה נשמרת מיידית ב-PostgreSQL ונרשמת ב-audit log. ניהול תפקידים, הוספה/מחיקה ופרטי משתמש נמצאים בלשונית 'משתמשים'."
          : "Every action persists to PostgreSQL and is written to the audit log. Roles, add/delete and profile edits live in the 'Users' tab."}
      </p>
    </div>
  );
}
