import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/client";
import { requireAdmin } from "@/lib/auth/require-admin";
import { updateUser, deleteUser } from "@/lib/auth/admin-users";
import { logAuthEvent } from "@/lib/auth/audit";

export const runtime = "nodejs";

const VALID_ROLES = ["admin", "manager", "member", "viewer", "guest"];

/** PATCH /api/admin/users/:id — update role / manager / title / phone / active (admin only). */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "auth_db_not_configured" }, { status: 503 });
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);

  if (body?.role && !VALID_ROLES.includes(body.role)) {
    return NextResponse.json({ error: "invalid_role" }, { status: 400 });
  }
  // Footgun guard: an admin can't lock themselves out (deactivate / self-demote).
  if (id === admin.id && (body?.isActive === false || (body?.role && body.role !== "admin"))) {
    return NextResponse.json({ error: "cannot_modify_self" }, { status: 400 });
  }

  const user = await updateUser(id, {
    name: body?.name,
    role: body?.role,
    managerId: body?.managerId,
    title: body?.title,
    phone: body?.phone,
    isActive: body?.isActive,
  });
  if (!user) return NextResponse.json({ error: "not_found_or_no_changes" }, { status: 404 });

  if (body?.role) await logAuthEvent({ userId: id, event: "role_changed", success: true, detail: `→ ${body.role} by ${admin.email}` });
  if (body?.isActive === false) await logAuthEvent({ userId: id, event: "account_disabled", success: true, detail: `by ${admin.email}` });
  if (body?.isActive === true) await logAuthEvent({ userId: id, event: "account_enabled", success: true, detail: `by ${admin.email}` });
  return NextResponse.json({ user });
}

/** DELETE /api/admin/users/:id — remove a user (admin only; not yourself). */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "auth_db_not_configured" }, { status: 503 });
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  if (id === admin.id) return NextResponse.json({ error: "cannot_delete_self" }, { status: 400 });
  const ok = await deleteUser(id);
  if (!ok) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
