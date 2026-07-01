"use client";

import { useMemo, useState } from "react";
import { Check, X, Eye, EyeOff, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { txt } from "@/lib/utils/locale-text";
import { apiChangePassword } from "@/lib/auth/client-auth";
import { FieldHint } from "@/components/ui/field-hint";

/** Live mirror of the server password policy — for instant feedback only;
 *  the server (checkPasswordPolicy) remains authoritative. */
function rules(pw: string, locale: string) {
  return [
    { ok: pw.length >= 9, label: txt(locale, { he: "לפחות 9 תווים", en: "At least 9 characters" }) },
    { ok: /[a-z]/.test(pw), label: txt(locale, { he: "אות אנגלית קטנה (a-z)", en: "A lowercase letter" }) },
    { ok: /[A-Z]/.test(pw), label: txt(locale, { he: "אות אנגלית גדולה (A-Z)", en: "An uppercase letter" }) },
    { ok: /[0-9]/.test(pw), label: txt(locale, { he: "ספרה (0-9)", en: "A digit" }) },
    { ok: /[^A-Za-z0-9]/.test(pw), label: txt(locale, { he: "תו מיוחד (!@#$...)", en: "A special character" }) },
  ];
}

/** Generate a strong, policy-compliant password (client-side helper button). */
function generateStrongPassword(): string {
  const U = "ABCDEFGHJKLMNPQRSTUVWXYZ", L = "abcdefghijkmnpqrstuvwxyz", D = "23456789", S = "!@#$%^&*";
  const all = U + L + D + S;
  const pick = (set: string, n: number) =>
    Array.from({ length: n }, () => set[Math.floor((crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32) * set.length)]).join("");
  const base = pick(U, 2) + pick(L, 6) + pick(D, 3) + pick(S, 2) + pick(all, 2);
  return base.split("").map((ch) => ({ ch, k: crypto.getRandomValues(new Uint32Array(1))[0] })).sort((a, b) => a.k - b.k).map((x) => x.ch).join("");
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

  const fillGenerated = () => {
    const p = generateStrongPassword();
    setNext(p);
    setConfirm(p);
    setShow(true);
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTopError(null);
    setServerErrors([]);
    // Validate on click and explain exactly what's missing — never a silent "dead" button.
    if (current.length === 0) {
      setTopError(txt(locale, { he: "יש להזין את הסיסמה הנוכחית", en: "Enter your current password" }) as string);
      return;
    }
    if (!policyOk) {
      setTopError(txt(locale, { he: "הסיסמה החדשה אינה עומדת בכל הדרישות — ראה/י את הסימון הירוק מתחת לשדה", en: "New password doesn't meet all requirements — see the checklist" }) as string);
      return;
    }
    if (!matchOk) {
      setTopError(txt(locale, { he: "אימות הסיסמה אינו תואם לסיסמה החדשה", en: "Confirmation doesn't match" }) as string);
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
        <label className="text-sm font-medium inline-flex items-center gap-1.5">
          {txt(locale, { he: "סיסמה נוכחית", en: "Current password" })}
          <FieldHint text={txt(locale, { he: "הסיסמה שאיתה את/ה מחובר/ת כעת (בכניסה ראשונה — הסיסמה הראשונית מהמייל). נדרשת לאימות זהותך לפני ההחלפה.", en: "The password you're currently signed in with (on first login, the initial one from the email). Required to verify your identity before changing." }) as string} />
        </label>
        <Input
          type={show ? "text" : "password"}
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          autoComplete="current-password"
          required
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <label className="text-sm font-medium inline-flex items-center gap-1.5">
            {txt(locale, { he: "סיסמה חדשה", en: "New password" })}
            <FieldHint text={txt(locale, { he: "הסיסמה שתשמש אותך מעתה. חייבת לעמוד בכל הדרישות המסומנות למטה (9+ תווים, אותיות אנגלית גדולה+קטנה, ספרה ותו מיוחד). אפשר ללחוץ 'צור סיסמה חזקה'.", en: "The password you'll use from now on. Must meet all the requirements below (9+ chars, English upper+lower, a digit and a symbol). You can click 'Generate strong'." }) as string} />
          </label>
          <button
            type="button"
            onClick={fillGenerated}
            className="text-xs text-primary hover:underline inline-flex items-center gap-1"
          >
            <Sparkles className="size-3.5" />
            {txt(locale, { he: "צור סיסמה חזקה", en: "Generate strong" })}
          </button>
        </div>
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
        <p className="text-[11px] text-muted-foreground pt-0.5">
          {txt(locale, {
            he: "השתמש/י באותיות אנגלית (גדולות וקטנות), מספרים ותו מיוחד — או לחצ/י 'צור סיסמה חזקה'.",
            en: "Use English letters (upper & lower), digits and a symbol — or click 'Generate strong'.",
          })}
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium inline-flex items-center gap-1.5">
          {txt(locale, { he: "אימות סיסמה חדשה", en: "Confirm new password" })}
          <FieldHint text={txt(locale, { he: "הקלד/י שוב את הסיסמה החדשה, בדיוק כפי שהוקלדה למעלה, כדי לוודא שאין טעות הקלדה.", en: "Re-type the new password exactly as above, to make sure there's no typo." }) as string} />
        </label>
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
        <Button type="submit" disabled={submitting} className="min-w-[44px]">
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
