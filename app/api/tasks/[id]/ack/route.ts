import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import { canAccessThread, acknowledge, type ThreadViewer } from "@/lib/db/task-thread-repo";

export const runtime = "nodejs";

/**
 * POST /api/tasks/:id/ack — the signed-in user explicitly acknowledges receipt
 * of the task ("קיבלתי"). Only a task participant may acknowledge.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "db_not_configured" }, { status: 503 });
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const viewer: ThreadViewer = { id: user.id, role: user.role };

  const { ok, participants } = await canAccessThread(viewer, id);
  if (!ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  // The creator doesn't acknowledge their own task.
  if (participants.creatorId === viewer.id) return NextResponse.json({ error: "creator_cannot_ack" }, { status: 400 });

  await acknowledge(id, viewer.id);
  return NextResponse.json({ ok: true });
}
