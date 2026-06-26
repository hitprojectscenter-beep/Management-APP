/**
 * Security audit log (server-only).
 *
 * Append-only trail of authentication & account events — required by the
 * Privacy-Protection (Data Security) Regulations (תיעוד אירועי גישה) and
 * INCD monitoring guidance. Writes are best-effort: a failed audit insert
 * must never block or fail the auth action itself.
 */

import "server-only";
import { getDb, isDatabaseConfigured } from "@/lib/db/client";
import { authAuditLog } from "@/lib/db/schema";

export type AuthEvent =
  | "login_success"
  | "login_failed"
  | "login_locked"
  | "logout"
  | "password_changed"
  | "password_change_failed"
  | "password_set"
  | "account_disabled"
  | "account_enabled"
  | "user_created"
  | "role_changed";

export interface AuthEventInput {
  userId?: string | null;
  email?: string | null;
  event: AuthEvent;
  success: boolean;
  ip?: string | null;
  userAgent?: string | null;
  detail?: string | null;
}

export async function logAuthEvent(e: AuthEventInput): Promise<void> {
  if (!isDatabaseConfigured()) return;
  try {
    await getDb().insert(authAuditLog).values({
      userId: e.userId ?? null,
      email: e.email ? e.email.slice(0, 256) : null,
      event: e.event,
      success: e.success,
      ip: e.ip ? e.ip.slice(0, 64) : null,
      userAgent: e.userAgent ? e.userAgent.slice(0, 256) : null,
      detail: e.detail ? e.detail.slice(0, 500) : null,
    });
  } catch {
    // best-effort — never block auth on an audit write
  }
}
