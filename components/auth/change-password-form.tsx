"use client";

import { useMemo, useState } from "react";
import { Check, X, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { txt } from "@/lib/utils/locale-text";
import { apiChangePassword } from "@/lib/auth/client-auth";

/** Live mirror of the server password policy — for instant feedback only;
 *  the server (checkPasswordPolicy) remains authoritative. */
function rules(pw: string, locale: string) {
  return [
    { ok: pw.length >= 12, label: txt(locale, { he: "לפחות 12 תווים", en: "At least 12 characters" }) },
    { ok: /[a-z]/.test(pw), label: txt(locale, { he: "אות לטינית קטנה", en: "A lowercase letter" }) },
    { ok: /[A-Z]/.test(pw), label: txt(locale, { he: "אות לטינית גדולה", en: "An uppercase letter" }) },
    { ok: /[0-9]/.test(pw), label: txt(locale, { he: "ספרה", en: "A digit" }) },
    { ok: /[^A-Za-z0-9]/.test(pw), label: txt(locale, { he: "תו מיוחד (!@#$...)", en: "A special character" }) },
  ];
}

export function ChangePasswordForm({
  locale,
  forced = false,
  onDone,
  onCancel,
}: {
  locale: string;
  /** true = first-login forced change (no cancel, different copy). */
  forced?: boolean;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverErrors, setServerErrors] = useState<string[]>([]);
  const [topError, setTopError] = useState<string | null>(null);

  const checks = useMemo(() => rules(next, locale), [next, locale]);
  const policyOk = checks.every((c) => c.ok);
  const matchOk = next.length > 0 && next === confirm;
  const canSubmit = current.length > 0 && policyOk && matchOk && !submitting;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTopError(null);
    setServerErrors([]);
    if (!matchOk) {
      setTopError(txt(locale, { he: "האימות אינו תואם לסיסמה החדשה", en: "Confirmation doesn't match" }) as string);
      return;
    }
    setSubmitting(true);
    const res = await apiChangePassword(current, next);
    setSubmitting(false);
    if (res.ok) {
      toast.success(txt(locale, { he: "הסיסמה עודכנה בהצלחה", en: "Password changed" }) as string);
      onDone();
      return;
    }
    if (res.error === "invalid_current") {
      setTopError(txt(locale, { he: "הסיסמה הנוכחית שגויה", en: "Current password is incorrect" }) as string);
    } else if (res.error === "weak") {
      setServerErrors(res.errors ?? []);
      setTopError(txt(locale, { he: "הסיסמה החדשה אינה עומדת במדיניות", en: "New password doesn't meet the policy" }) as string);
    } else {
      setTopError(txt(locale, { he: "אירעה תקלה. נסה/י שוב.", en: "Something went wrong. Try again." }) as string);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" dir={locale === "en" ? "ltr" : "rtl"}>
      {forced && (
        <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-3 text-sm text-amber-800 dark:text-amber-200">
          <ShieldCheck className="size-4 mt-0.5 shrink-0" />
          <span>
            {txt(locale, {
              he: "מטעמי אבטחה, יש להחליף את הסיסמה הראשונית לפני הכניסה למערכת.",
              en: "For security, you must replace your initial password before continuing.",
            })}
          </span>
        </div>
      )}

      {topError && (
        <div className="rounded-md border border-red-300 bg-red-50 dark:bg-red-950/20 p-2.5 text-sm text-red-700 dark:text-red-300">
          {topError}
          {serverErrors.length > 0 && (
            <ul className="mt-1 list-disc list-inside text-xs space-y-0.5">
              {serverErrors.map((er, i) => <li key={i}>{er}</li>)}
            </ul>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-sm font-medium">{txt(locale, { he: "סיסמה נוכחית", en: "Current password" })}</label>
        <Input
          type={show ? "text" : "password"}
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          autoComplete="current-password"
          required
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">{txt(locale, { he: "סיסמה חדשה", en: "New password" })}</label>
        <div className="relative">
          <Input
            type={show ? "text" : "password"}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            autoComplete="new-password"
            required
            className="pe-10"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute inset-y-0 end-2 flex items-center text-muted-foreground hover:text-foreground"
            aria-label={txt(locale, { he: "הצג/הסתר סיסמה", en: "Toggle visibility" }) as string}
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {/* Live policy checklist */}
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 pt-1">
          {checks.map((c, i) => (
            <li key={i} className={cn("flex items-center gap-1.5 text-xs", c.ok ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
              {c.ok ? <Check className="size-3.5" /> : <X className="size-3.5" />}
              {c.label}
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">{txt(locale, { he: "אימות סיסמה חדשה", en: "Confirm new password" })}</label>
        <Input
          type={show ? "text" : "password"}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          required
          className={cn(confirm.length > 0 && !matchOk && "border-red-500")}
        />
        {confirm.length > 0 && !matchOk && (
          <p className="text-xs text-red-600">{txt(locale, { he: "לא תואם", en: "Doesn't match" })}</p>
        )}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Button type="submit" disabled={!canSubmit} className="min-w-[44px]">
          {submitting && <Loader2 className="size-4 animate-spin me-2" />}
          {txt(locale, { he: "עדכן סיסמה", en: "Update password" })}
        </Button>
        {!forced && onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            {txt(locale, { he: "ביטול", en: "Cancel" })}
          </Button>
        )}
      </div>
    </form>
  );
}
