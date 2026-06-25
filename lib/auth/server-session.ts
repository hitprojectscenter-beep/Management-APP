/**
 * Server-side session management (server-only).
 *
 * Model (defense-in-depth):
 *   • A session is a 256-bit random token. The RAW token is sent to the
 *     browser ONLY in an httpOnly + Secure + SameSite=Strict cookie — it is
 *     never readable by JS (XSS can't steal it) and never sent cross-site
 *     (CSRF mitigation).
 *   • The DB stores only the SHA-256 HASH of the token, so a database leak
 *     cannot be replayed as a live session.
 *   • Sessions are revocable (logout / logout-everywhere / incident response)
 *     and expire (absolute TTL). Every use is timestamped for the audit trail.
 *
 * This is the revocable, server-side session model required for access
 * control + monitoring (INCD / Privacy-Protection Regs) — stronger than a
 * stateless JWT, which can't be revoked before expiry.
 */

import "server-only";
import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { eq, and, isNull, gt } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { userSessions } from "@/lib/db/schema";

export const SESSION_COOKIE = "pmo_session";
/** Absolute session lifetime. 8h suits a workday; re-login after that. */
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Create a session row and return the RAW token (to put in the cookie). */
export async function createSession(
  userId: string,
  meta?: { ip?: string | null; userAgent?: string | null },
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url"); // 256-bit
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await getDb().insert(userSessions).values({
    userId,
    tokenHash: hashToken(token),
    expiresAt,
    ip: meta?.ip?.slice(0, 64),
    userAgent: meta?.userAgent?.slice(0, 256),
  });
  return { token, expiresAt };
}

/**
 * Validate a raw token: must exist, not be revoked, not be expired. Updates
 * lastUsedAt (sliding audit timestamp). Returns the userId or null.
 */
export async function validateSessionToken(token: string): Promise<string | null> {
  if (!token) return null;
  const db = getDb();
  const rows = await db
    .select({ id: userSessions.id, userId: userSessions.userId })
    .from(userSessions)
    .where(
      and(
        eq(userSessions.tokenHash, hashToken(token)),
        isNull(userSessions.revokedAt),
        gt(userSessions.expiresAt, new Date()),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  // Best-effort touch — don't fail the request if this write hiccups.
  try {
    await db.update(userSessions).set({ lastUsedAt: new Date() }).where(eq(userSessions.id, row.id));
  } catch { /* ignore */ }
  return row.userId;
}

/** Revoke a single session by its raw token (logout). */
export async function revokeSessionToken(token: string): Promise<void> {
  if (!token) return;
  await getDb()
    .update(userSessions)
    .set({ revokedAt: new Date() })
    .where(eq(userSessions.tokenHash, hashToken(token)));
}

/** Revoke ALL of a user's sessions (logout-everywhere / on password change). */
export async function revokeAllUserSessions(userId: string): Promise<void> {
  await getDb()
    .update(userSessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(userSessions.userId, userId), isNull(userSessions.revokedAt)));
}

// ---- Cookie helpers (Next 15: cookies() is async) ----

export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export async function readSessionCookie(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value || null;
}

/** Resolve the current request's session → userId (or null). */
export async function getCurrentUserId(): Promise<string | null> {
  const token = await readSessionCookie();
  return token ? validateSessionToken(token) : null;
}
