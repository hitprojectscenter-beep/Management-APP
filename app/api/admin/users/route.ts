import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/client";
import { requireAdmin } from "@/lib/auth/require-admin";
import { listUsers, createUser } from "@/lib/auth/admin-users";
import { logAuthEvent } from "@/lib/auth/audit";

export const runtime = "nodejs";

const VALID_ROLES = ["admin", "manager", "member", "viewer", "guest"];

/** GET /api/admin/users — list all users (admin only). */
export async function GET() {
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "auth_db_not_configured" }, { status: 503 });
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return NextResponse.json({ users: await listUsers() });
}

/** POST /api/admin/users — create a user (admin only). Returns a one-time temp password. */
export async function POST(req: Request) {
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "auth_db_not_configured" }, { status: 503 });
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const name = body?.name?.trim();
  const email = body?.email?.trim();
  const role = body?.role;
  if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "name_and_valid_email_required" }, { status: 400 });
  }
  if (!VALID_ROLES.includes(role)) return NextResponse.json({ error: "invalid_role" }, { status: 400 });

  const res = await createUser({ name, email, role, managerId: body?.managerId ?? null, title: body?.title ?? null, phone: body?.phone ?? null });
  if ("error" in res) return NextResponse.json({ error: res.error }, { status: 409 });

  await logAuthEvent({ userId: res.user.id, email: res.user.email, event: "user_created", success: true, detail: `by ${admin.email}` });
  return NextResponse.json({ user: res.user, tempPassword: res.tempPassword });
}
