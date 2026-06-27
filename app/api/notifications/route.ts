import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import { listForUser, unreadCount } from "@/lib/db/notifications-repo";

export const runtime = "nodejs";

/** GET /api/notifications — the signed-in user's recent notifications + unread count. */
export async function GET() {
  if (!isDatabaseConfigured()) return NextResponse.json({ notifications: [], unreadCount: 0, dbConfigured: false });
  const user = await requireUser();
  if (!user) return NextResponse.json({ notifications: [], unreadCount: 0, dbConfigured: true });
  try {
    const [notifications, unread] = await Promise.all([listForUser(user.id), unreadCount(user.id)]);
    return NextResponse.json({ notifications, unreadCount: unread, dbConfigured: true });
  } catch (e) {
    return NextResponse.json({ notifications: [], unreadCount: 0, error: String(e) }, { status: 500 });
  }
}
