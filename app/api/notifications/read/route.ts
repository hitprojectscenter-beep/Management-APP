import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import { markRead } from "@/lib/db/notifications-repo";

export const runtime = "nodejs";

/**
 * POST /api/notifications/read — mark the user's notifications read.
 * Body: { ids: string[] } to mark specific ones, or {} to mark all.
 */
export async function POST(req: Request) {
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "db_not_configured" }, { status: 503 });
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const ids = Array.isArray(body?.ids) ? body.ids.filter((x: unknown) => typeof x === "string") : undefined;
  await markRead(user.id, ids);
  return NextResponse.json({ ok: true });
}
