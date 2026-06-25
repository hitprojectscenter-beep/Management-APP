/**
 * Password hashing + policy (server-only).
 *
 * Hashing: bcrypt with cost factor 12 (≈250ms/hash) — meets OWASP ASVS
 * and the INCD methodology's "strong, salted, slow" requirement. bcrypt is
 * pure-JS here (bcryptjs) so it deploys to Vercel serverless with zero
 * native-build risk. A per-deployment PASSWORD_PEPPER (env secret) is mixed
 * in so a DB leak alone can't be brute-forced offline.
 *
 * Policy: aligned with the Privacy-Protection (Data Security) Regulations
 * 2017 ("strong authentication") and INCD password guidance — min 12 chars,
 * mixed character classes, and a block-list of trivial/common passwords.
 */

import "server-only";
import bcrypt from "bcryptjs";

const BCRYPT_COST = 12;

/** Optional server-side pepper (env secret), appended before hashing. */
function withPepper(password: string): string {
  const pepper = process.env.PASSWORD_PEPPER || "";
  return password + pepper;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(withPepper(password), BCRYPT_COST);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!hash) return false;
  try {
    return await bcrypt.compare(withPepper(password), hash);
  } catch {
    return false;
  }
}

// A small block-list of the most common/trivial passwords (and local terms).
// Not exhaustive — a defense-in-depth nudge, not the only control.
const COMMON_PASSWORDS = new Set([
  "password", "password1", "123456", "12345678", "123456789", "qwerty",
  "111111", "123123", "abc123", "letmein", "welcome", "admin", "admin123",
  "iloveyou", "monkey", "dragon", "passw0rd", "p@ssw0rd", "changeme",
  "mapi", "mapi2026", "israel", "aaaaaa", "qwerty123", "1q2w3e4r",
]);

export interface PasswordPolicyResult {
  ok: boolean;
  errors: string[]; // Hebrew, user-facing
}

/**
 * Enforce the password policy. Returns all violations so the UI can show
 * them together. Locale-Hebrew messages (the app is RTL-Hebrew first).
 */
export function checkPasswordPolicy(password: string, opts?: { name?: string; email?: string }): PasswordPolicyResult {
  const errors: string[] = [];
  const pw = password || "";

  if (pw.length < 12) errors.push("לפחות 12 תווים");
  if (pw.length > 128) errors.push("עד 128 תווים");
  if (!/[a-z]/.test(pw)) errors.push("אות לטינית קטנה אחת לפחות");
  if (!/[A-Z]/.test(pw)) errors.push("אות לטינית גדולה אחת לפחות");
  if (!/[0-9]/.test(pw)) errors.push("ספרה אחת לפחות");
  if (!/[^A-Za-z0-9]/.test(pw)) errors.push("תו מיוחד אחד לפחות (!@#$...)");
  if (/(.)\1{3,}/.test(pw)) errors.push("ללא חזרה של אותו תו 4 פעמים ברצף");

  const lower = pw.toLowerCase();
  if (COMMON_PASSWORDS.has(lower)) errors.push("סיסמה נפוצה מדי — בחר/י סיסמה ייחודית");

  // Don't allow the password to contain the email local-part or the name.
  const emailLocal = opts?.email?.split("@")[0]?.toLowerCase();
  if (emailLocal && emailLocal.length >= 3 && lower.includes(emailLocal))
    errors.push("הסיסמה לא יכולה להכיל את שם המשתמש");
  if (opts?.name) {
    for (const part of opts.name.toLowerCase().split(/\s+/)) {
      if (part.length >= 3 && lower.includes(part)) {
        errors.push("הסיסמה לא יכולה להכיל את שמך");
        break;
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

/** Generate a strong random temporary password (for admin-created accounts). */
export function generateTempPassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const special = "!@#$%^&*";
  const all = upper + lower + digits + special;
  const pick = (set: string, n: number) =>
    Array.from({ length: n }, () => set[Math.floor((globalThis.crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32) * set.length)]).join("");
  // Guarantee one of each class, then fill to length 16, then shuffle.
  const base = pick(upper, 2) + pick(lower, 6) + pick(digits, 4) + pick(special, 2) + pick(all, 2);
  return base
    .split("")
    .map((c) => ({ c, r: globalThis.crypto.getRandomValues(new Uint32Array(1))[0] }))
    .sort((a, b) => a.r - b.r)
    .map((x) => x.c)
    .join("");
}
