import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/client";
import { requireAdmin } from "@/lib/auth/require-admin";
import { unlockUser } from "@/lib/auth/admin-users";
import { logAuthEvent } from "@/lib/auth/audit";

export const runtime = "nodejs";

/** POST /api/admin/users/:id/unlock — clear a brute-force lockout (admin only).
 *  Resets the failed-attempt counter and unlocks immediately. Password untouched. */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "auth_db_not_configured" }, { status: 503 });
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await ctx.params;

  const user = await unlockUser(id);
  if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });
  await logAuthEvent({ userId: id, event: "account_unlocked", success: true, detail: `by ${admin.email}` });
  return NextResponse.json({ user });
}
