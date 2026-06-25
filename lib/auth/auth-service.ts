/**
 * Authentication service (server-only).
 *
 * The single entry point for verifying credentials. Implements the account
 * controls required by the Privacy-Protection (Data Security) Regulations
 * and INCD methodology:
 *   • bcrypt password verification (never plaintext)
 *   • brute-force lockout: after MAX_FAILED consecutive failures the account
 *     is locked for LOCKOUT_MS
 *   • disabled-account check (offboarding / least-privilege)
 *   • no user enumeration — a missing user and a wrong password return the
 *     same generic "invalid" result
 *   • full audit trail for every outcome
 *
 * On success it mints a server-side session (see server-session.ts) and
 * returns the public user (never the hash / mfa secret).
 */

import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { verifyPassword } from "./password";
import { createSession } from "./server-session";
import { logAuthEvent } from "./audit";
import type { UserRole } from "@/lib/db/types";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

export interface PublicUser {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
  image: string | null;
  locale: string;
  title: string | null;
  managerId: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
}

type DbUser = typeof users.$inferSelect;

/** Strip every sensitive field — only the safe, public columns leave here. */
export function toPublicUser(u: DbUser): PublicUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    image: u.image,
    locale: u.locale,
    title: u.title,
    managerId: u.managerId,
    isActive: u.isActive,
    mustChangePassword: u.mustChangePassword,
  };
}

export interface AuthInput {
  email: string;
  password: string;
  ip?: string | null;
  userAgent?: string | null;
}

export type AuthResult =
  | { ok: true; user: PublicUser; token: string; expiresAt: Date; mustChangePassword: boolean }
  | { ok: false; reason: "invalid" | "locked" | "disabled" };

export async function authenticate(input: AuthInput): Promise<AuthResult> {
  const db = getDb();
  const email = input.email.trim().toLowerCase();
  const meta = { ip: input.ip, userAgent: input.userAgent };

  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const u = rows[0];

  // Unknown email → generic "invalid" (no enumeration). Still audited.
  if (!u) {
    await logAuthEvent({ email, event: "login_failed", success: false, detail: "no_user", ...meta });
    return { ok: false, reason: "invalid" };
  }

  if (!u.isActive) {
    await logAuthEvent({ userId: u.id, email, event: "login_failed", success: false, detail: "disabled", ...meta });
    return { ok: false, reason: "disabled" };
  }

  if (u.lockedUntil && u.lockedUntil.getTime() > Date.now()) {
    await logAuthEvent({ userId: u.id, email, event: "login_locked", success: false, detail: "still_locked", ...meta });
    return { ok: false, reason: "locked" };
  }

  const passwordOk = u.passwordHash ? await verifyPassword(input.password, u.passwordHash) : false;

  if (!passwordOk) {
    const failed = (u.failedLoginAttempts ?? 0) + 1;
    const lockNow = failed >= MAX_FAILED_ATTEMPTS;
    await db
      .update(users)
      .set({
        failedLoginAttempts: failed,
        lockedUntil: lockNow ? new Date(Date.now() + LOCKOUT_MS) : u.lockedUntil ?? null,
      })
      .where(eq(users.id, u.id));
    await logAuthEvent({
      userId: u.id, email,
      event: lockNow ? "login_locked" : "login_failed",
      success: false,
      detail: `failed_attempts=${failed}`,
      ...meta,
    });
    return { ok: false, reason: lockNow ? "locked" : "invalid" };
  }

  // Success — reset the counters, stamp last login, mint a session.
  await db
    .update(users)
    .set({ failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() })
    .where(eq(users.id, u.id));
  const { token, expiresAt } = await createSession(u.id, meta);
  await logAuthEvent({ userId: u.id, email, event: "login_success", success: true, ...meta });

  return { ok: true, user: toPublicUser(u), token, expiresAt, mustChangePassword: u.mustChangePassword };
}

/** Resolve a user id to the public user (for the /me endpoint & guards). */
export async function getPublicUserById(id: string): Promise<PublicUser | null> {
  const rows = await getDb().select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ? toPublicUser(rows[0]) : null;
}
