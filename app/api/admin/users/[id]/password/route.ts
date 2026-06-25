import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/client";
import { requireAdmin } from "@/lib/auth/require-admin";
import { resetUserPassword } from "@/lib/auth/admin-users";
import { logAuthEvent } from "@/lib/auth/audit";

export const runtime = "nodejs";

/** POST /api/admin/users/:id/password — reset to a fresh temp password (admin only).
 *  Forces a change on next login, clears lockout, revokes sessions. Returns the temp pw once. */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "auth_db_not_configured" }, { status: 503 });
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await ctx.params;

  const res = await resetUserPassword(id);
  if (!res) return NextResponse.json({ error: "not_found" }, { status: 404 });
  await logAuthEvent({ userId: id, event: "password_set", success: true, detail: `reset by ${admin.email}` });
  return NextResponse.json({ tempPassword: res.tempPassword });
}
