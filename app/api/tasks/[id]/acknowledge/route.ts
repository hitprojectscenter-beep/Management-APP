import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import { canAccessThread, type ThreadViewer } from "@/lib/db/task-thread-repo";
import { acknowledgeDecision } from "@/lib/db/task-activity-repo";
import { dispatchToUsers } from "@/lib/notify/dispatch";
import { mockUsers } from "@/lib/db/mock-data";

export const runtime = "nodejs";

/**
 * POST /api/tasks/:id/acknowledge — a participant (typically the assignee)
 * acknowledges a supervisor DECISION (read-receipt). Body: { historyId }. The
 * acknowledgment is logged and the decision-maker (supervisor) + creator are
 * notified, closing the transparency loop.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "db_not_configured" }, { status: 503 });
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const viewer: ThreadViewer = { id: user.id, role: user.role };

  const { ok, participants } = await canAccessThread(viewer, id);
  if (!ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!participants.isCreatedTask) return NextResponse.json({ error: "not_a_workflow_task" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const historyId = typeof body?.historyId === "string" ? body.historyId : "";
  if (!historyId) return NextResponse.json({ error: "history_required" }, { status: 400 });

  const result = await acknowledgeDecision(id, viewer.id, historyId);

  const actor = mockUsers.find((u) => u.id === viewer.id)?.name || "";
  const taskTitle = participants.title || "";
  const recipients = [...new Set([result.refActorId, participants.creatorId].filter((x): x is string => !!x))].filter((uid) => uid !== viewer.id);
  if (recipients.length > 0) {
    void dispatchToUsers({
      recipientIds: recipients,
      type: "task_decision_acknowledged",
      taskId: id,
      title: taskTitle ? `אושרה קבלת ההחלטה: ${taskTitle}` : "אושרה קבלת ההחלטה",
      body: `${actor ? actor + " " : ""}אישר/ה שקרא/ה את החלטת הממונה.`,
      actorId: viewer.id,
    });
  }

  return NextResponse.json({ ok: true, ...result });
}
