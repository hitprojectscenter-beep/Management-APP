/**
 * Seniority ranking for auto-assigning task ownership.
 *
 * Org rule from spec:
 *   "אחראי על המשימה נקבע אוטומטית בהתאם לתפקיד — ראש אג"ף, מנהל חטיבה,
 *    סמנכ"ל וכד'. מי שהכי בכיר (למעט המנכ"ל) הוא האחראי."
 *
 * The user can override at task creation time by saying / writing:
 *   "אחראי על המשימה הוא X" / "אחריות לביצוע היא על X"
 */

import type { MockUser } from "../db/mock-data";

/** Lower rank = MORE senior. Ranks come from the title text — language-agnostic. */
const TITLE_RANKS: Array<{ patterns: RegExp[]; rank: number; label: string }> = [
  { patterns: [/מנכ["״ׂ]ל/, /\bceo\b/i, /chief executive/i], rank: 1, label: "CEO" },
  { patterns: [/סמנכ["״]ל/, /\bcoo\b/i, /\bcfo\b/i, /\bcto\b/i, /\bvp\b/i, /vice president/i, /סגן מנכ/], rank: 2, label: "VP" },
  { patterns: [/ראש אג["״]ף/, /מנהל אג["״]ף/, /head of division/i, /division head/i], rank: 3, label: "Division Head" },
  { patterns: [/מנהל חטיבה/, /head of department/i], rank: 4, label: "Department Head" },
  { patterns: [/מנהל כלל/, /מנהל פעיל/, /general manager/i], rank: 5, label: "General Manager" },
  { patterns: [/מנהל פרוגרמ/, /program manager/i], rank: 6, label: "Program Manager" },
  { patterns: [/מנהל פרויקט/, /project manager/i, /\bpm\b/i], rank: 7, label: "Project Manager" },
  { patterns: [/בעלים/, /owner/i, /product owner/i], rank: 8, label: "Owner" },
  { patterns: [/אחראי(ת)? תכנ?יות/, /אחראי(ת)? תוכנ?יות/, /programs lead/i], rank: 9, label: "Programs Lead" },
  { patterns: [/אחראי/, /lead/i, /team lead/i], rank: 10, label: "Lead" },
  { patterns: [/מפתח/, /מתכנת/, /developer/i, /engineer/i], rank: 11, label: "Engineer" },
  { patterns: [/אנליסט/, /analyst/i], rank: 12, label: "Analyst" },
  { patterns: [/.+/], rank: 20, label: "Member" }, // catch-all
];

const ROLE_RANK_FALLBACK: Record<string, number> = {
  admin: 2,
  manager: 5,
  member: 11,
  viewer: 15,
  guest: 18,
};

export interface SeniorityResult {
  rank: number;
  label: string;
}

/** Compute seniority from a user's `name` field (which in this app stores role title) + the `role` flag as tiebreaker. */
export function getSeniority(user: Pick<MockUser, "name" | "role">): SeniorityResult {
  const title = user.name || "";
  for (const tier of TITLE_RANKS) {
    if (tier.patterns.some((p) => p.test(title))) {
      return { rank: tier.rank, label: tier.label };
    }
  }
  // Fallback to system role
  return {
    rank: ROLE_RANK_FALLBACK[user.role] ?? 20,
    label: user.role,
  };
}

/** Pick the most senior user from a team, optionally excluding the CEO (default true). */
export function pickResponsible(
  team: Array<Pick<MockUser, "id" | "name" | "role">>,
  options: { excludeCEO?: boolean } = {}
): { user: Pick<MockUser, "id" | "name" | "role">; seniority: SeniorityResult } | null {
  const { excludeCEO = true } = options;
  if (team.length === 0) return null;

  const ranked = team
    .map((user) => ({ user, seniority: getSeniority(user) }))
    .filter(({ seniority }) => !excludeCEO || seniority.rank !== 1)
    .sort((a, b) => a.seniority.rank - b.seniority.rank);

  if (ranked.length === 0) {
    // Every team member was the CEO — keep them as last resort
    const fallback = team.map((u) => ({ user: u, seniority: getSeniority(u) }))[0];
    return fallback ?? null;
  }
  return ranked[0];
}

/**
 * Parse a free-text override phrase. Returns the candidate name string if the
 * user explicitly named a responsible person, otherwise null.
 *
 * Recognized patterns (Hebrew + English):
 *   "אחראי על המשימה הוא X"
 *   "אחראי(ת) הוא/היא X"
 *   "אחריות לביצוע היא על X"
 *   "הקצה ל-X" / "להקצות ל X"
 *   "responsible is X" / "assign to X" / "owner: X"
 */
export function parseResponsibleOverride(text: string): string | null {
  if (!text) return null;
  const patterns: RegExp[] = [
    /אחראי(?:ת|ות)?\s+(?:על\s+המשימה\s+)?(?:הוא|היא|הינו|הינה)\s+([^.,;:!?\n]+)/,
    /אחריות\s+לביצוע\s+(?:היא\s+)?על[:\s-]+([^.,;:!?\n]+)/,
    /אחראי(?:ת)?[:\s-]+([^.,;:!?\n]+)/,
    /הקצה\s+ל[-:\s]*([^.,;:!?\n]+)/,
    /להקצות\s+ל[-:\s]*([^.,;:!?\n]+)/,
    /responsible\s+(?:is|=)\s+([^.,;:!?\n]+)/i,
    /assign(?:ed)?\s+to[:\s]+([^.,;:!?\n]+)/i,
    /owner[:\s]+([^.,;:!?\n]+)/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]) return m[1].trim().replace(/^[-:\s]+|[-:\s]+$/g, "");
  }
  return null;
}
