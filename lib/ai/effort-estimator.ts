/**
 * Effort estimator for tasks.
 *
 * Catalog from spec (Hebrew baseline):
 *   מצגת        → 4 שעות
 *   מסמך אפיון → שבוע עבודה (40 שעות)
 *   מכתב        → 2 שעות
 *   סיכום פגישה → 1 שעה
 *   מסמך כללי   → 8 שעות (יום עבודה)
 *
 * Strategy:
 *   1) Match the task title + description against a dictionary of work patterns.
 *      Returns hours + the matched pattern name (so the UI can explain).
 *   2) If nothing matches and a Gemini API key is available, ask Gemini for a
 *      grounded estimate. Gemini is told the catalog so its output stays
 *      consistent with the heuristic.
 *   3) Default fallback: 8 hours (one work day).
 */

import { askGemini, isGeminiAvailable } from "./gemini";

export interface EffortRule {
  /** Hebrew + English regex patterns matched against title or description */
  patterns: RegExp[];
  /** Estimated work hours */
  hours: number;
  /** Short label shown in the UI ("מצגת", "Document spec", …) */
  label: { he: string; en: string };
}

export const EFFORT_CATALOG: EffortRule[] = [
  {
    patterns: [/לייצר\s+מצגת/, /הכין\s+מצגת/, /מצגת/, /presentation/i, /\bppt\b/i, /slide deck/i],
    hours: 4,
    label: { he: "מצגת", en: "Presentation" },
  },
  {
    patterns: [/מסמך\s+אפיון/, /מסמך\s+דרישות/, /אפיון\s+טכני/, /spec\s+document/i, /requirements\s+doc/i, /technical\s+spec/i],
    hours: 40,
    label: { he: "מסמך אפיון", en: "Spec / Requirements" },
  },
  {
    patterns: [/לכתוב\s+מכתב/, /מכתב\s+(רשמי|תגובה)?/, /letter/i, /memo/i],
    hours: 2,
    label: { he: "מכתב", en: "Letter / Memo" },
  },
  {
    patterns: [/סיכום\s+פגישה/, /סיכום\s+ישיבה/, /meeting\s+summary/i, /minutes/i, /\bmom\b/i],
    hours: 1,
    label: { he: "סיכום פגישה", en: "Meeting summary" },
  },
  {
    patterns: [/הכנה\s+לפגישה/, /הכנת\s+חומר\s+ל[פפ]גישה/, /meeting\s+prep/i],
    hours: 2,
    label: { he: "הכנה לפגישה", en: "Meeting prep" },
  },
  {
    patterns: [/מענה\s+על\s+פניה/, /מענה\s+ללקוח/, /reply/i, /respond/i, /customer\s+response/i],
    hours: 2,
    label: { he: "מענה על פניה", en: "Customer reply" },
  },
  {
    patterns: [/דו["״]?ח/, /report/i, /reporting/i],
    hours: 6,
    label: { he: "דוח", en: "Report" },
  },
  {
    patterns: [/אפיון/, /design\s+doc/i],
    hours: 24,
    label: { he: "אפיון", en: "Design" },
  },
  {
    patterns: [/פיתוח/, /development/i, /\bcoding\b/i, /implement/i],
    hours: 32,
    label: { he: "פיתוח", en: "Development" },
  },
  {
    patterns: [/בדיקות/, /\bqa\b/i, /testing/i, /uat/i],
    hours: 16,
    label: { he: "בדיקות", en: "Testing" },
  },
  {
    patterns: [/אינטגרציה/, /integration/i],
    hours: 24,
    label: { he: "אינטגרציה", en: "Integration" },
  },
  {
    patterns: [/הדרכה/, /training/i, /workshop/i],
    hours: 8,
    label: { he: "הדרכה", en: "Training" },
  },
  {
    patterns: [/סקירה/, /review/i, /code review/i],
    hours: 2,
    label: { he: "סקירה", en: "Review" },
  },
  {
    patterns: [/מחקר/, /research/i, /poc/i, /proof of concept/i],
    hours: 24,
    label: { he: "מחקר", en: "Research" },
  },
  {
    patterns: [/מסמך/, /document/i],
    hours: 8,
    label: { he: "מסמך", en: "Document" },
  },
];

export interface EffortEstimate {
  hours: number;
  /** "heuristic" — matched from the catalog; "ai" — from Gemini; "default" — 8h fallback */
  source: "heuristic" | "ai" | "default";
  /** Hebrew + English label, e.g. {he:"מצגת", en:"Presentation"} */
  matchedLabel?: { he: string; en: string };
  /** Human-readable rationale for tooltip display */
  rationale: string;
}

export function estimateEffortHeuristic(input: { title?: string; description?: string }): EffortEstimate | null {
  const haystack = `${input.title || ""}\n${input.description || ""}`.trim();
  if (!haystack) return null;
  for (const rule of EFFORT_CATALOG) {
    if (rule.patterns.some((p) => p.test(haystack))) {
      return {
        hours: rule.hours,
        source: "heuristic",
        matchedLabel: rule.label,
        rationale: `התאמה לסוג עבודה: ${rule.label.he} — ${rule.hours} שעות`,
      };
    }
  }
  return null;
}

/** Try heuristic first, fall back to Gemini, fall back to 8h. */
export async function estimateEffort(input: { title?: string; description?: string; lang?: string }): Promise<EffortEstimate> {
  const heuristic = estimateEffortHeuristic(input);
  if (heuristic) return heuristic;

  if (isGeminiAvailable() && (input.title || input.description)) {
    try {
      const lang = input.lang || "he";
      const catalog = EFFORT_CATALOG.map((r) => `${r.label.he} (${r.label.en}) → ${r.hours}h`).join(", ");
      const question = `העריך את המאמץ הדרוש (בשעות עבודה) למשימה הבאה. החזר JSON בלבד בפורמט: {"hours": <number>, "type": "<short Hebrew label>"}.\n\nקטלוג ייחוס: ${catalog}.\n\nכותרת: ${input.title || ""}\nתיאור: ${input.description || ""}`;
      const reply = await askGemini(question, "", lang);
      const m = reply.match(/\{[^{}]*"hours"\s*:\s*(\d+(?:\.\d+)?)[^{}]*\}/);
      if (m) {
        const hours = Math.max(0.5, Math.min(200, parseFloat(m[1])));
        const typeMatch = reply.match(/"type"\s*:\s*"([^"]+)"/);
        return {
          hours,
          source: "ai",
          rationale: typeMatch ? `הערכת AI: ${typeMatch[1]} — ${hours} שעות` : `הערכת AI: ${hours} שעות`,
        };
      }
    } catch {
      // fall through to default
    }
  }

  return {
    hours: 8,
    source: "default",
    rationale: "ברירת מחדל: יום עבודה (8 שעות)",
  };
}
