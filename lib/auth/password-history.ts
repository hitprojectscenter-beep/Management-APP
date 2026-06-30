/**
 * Password history (server-only): remembers the last N bcrypt HASHES per user
 * so a password change can reject reuse of the current or a recent previous
 * password. Stores hashes only — never plaintext. Best-effort bookkeeping must
 * never block a legitimate change, so writes are wrapped defensively.
 */
import "server-only";
import { eq, desc, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { passwordHistory } from "@/lib/db/schema";
import { verifyPassword } from "./password";

/** How many previous passwords to remember (and forbid reusing). */
export const PASSWORD_HISTORY_LIMIT = 5;

/** Push a just-replaced password hash into history, pruning to the last N. */
export async function recordOldPasswordHash(userId: string, oldHash: string | null | undefined): Promise<void> {
  if (!oldHash) return;
  const db = getDb();
  try {
    await db.insert(passwordHistory).values({ userId, passwordHash: oldHash });
    const rows = await db
      .select({ id: passwordHistory.id })
      .from(passwordHistory)
      .where(eq(passwordHistory.userId, userId))
      .orderBy(desc(passwordHistory.createdAt));
    const stale = rows.slice(PASSWORD_HISTORY_LIMIT).map((r) => r.id);
    if (stale.length) await db.delete(passwordHistory).where(inArray(passwordHistory.id, stale));
  } catch {
    /* never block a password change on history bookkeeping */
  }
}

/**
 * True if `newPassword` matches the user's current hash OR any stored history
 * hash (i.e. it's a reused/recent password). Uses the same pepper+bcrypt verify
 * as login.
 */
export async function isPasswordReused(
  userId: string,
  newPassword: string,
  currentHash: string | null | undefined,
): Promise<boolean> {
  if (currentHash && (await verifyPassword(newPassword, currentHash))) return true;
  const rows = await getDb()
    .select({ hash: passwordHistory.passwordHash })
    .from(passwordHistory)
    .where(eq(passwordHistory.userId, userId));
  for (const r of rows) {
    if (await verifyPassword(newPassword, r.hash)) return true;
  }
  return false;
}
