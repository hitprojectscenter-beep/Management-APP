import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import { changeOwnPassword } from "@/lib/auth/auth-service";
import { readSessionCookie, revokeOtherUserSessions } from "@/lib/auth/server-session";
import { logAuthEvent } from "@/lib/auth/audit";

export const runtime = "nodejs";

/**
 * POST /api/auth/change-password — the signed-in user changes their own
 * password. Verifies the current password, enforces the policy, and on success
 * keeps THIS session alive while revoking every other session (a leaked old
 * credential can't keep a parallel session). Used by both the forced
 * first-login change and the self-service "change password" dialog.
 */
export async function POST(req: Request) {
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "db_not_configured" }, { status: 503 });
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const currentPassword = body?.currentPassword;
  const newPassword = body?.newPassword;
  if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const res = await changeOwnPassword(user.id, currentPassword, newPassword);
  if (!res.ok) {
    if (res.reason === "invalid_current") {
      await logAuthEvent({ userId: user.id, email: user.email, event: "password_change_failed", success: false, detail: "invalid_current" });
      return NextResponse.json({ ok: false, error: "invalid_current" }, { status: 400 });
    }
    return NextResponse.json({ ok: false, error: "weak", errors: res.errors ?? [] }, { status: 400 });
  }

  // Keep the current device signed in; invalidate every other session.
  const token = await readSessionCookie();
  if (token) {
    try {
      await revokeOtherUserSessions(user.id, token);
    } catch {
      /* non-fatal — the password is already changed */
    }
  }
  await logAuthEvent({ userId: user.id, email: user.email, event: "password_changed", success: true });
  return NextResponse.json({ ok: true });
}
