import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import { canAccessThread, type ThreadViewer } from "@/lib/db/task-thread-repo";
import { changeStatus, SETTABLE_STATUS_SET } from "@/lib/db/task-activity-repo";
import { dispatchToUsers } from "@/lib/notify/dispatch";
import { mockUsers } from "@/lib/db/mock-data";
import { STATUS_LABELS_ML } from "@/lib/utils/locale-text";

export const runtime = "nodejs";

/**
 * POST /api/tasks/:id/status — change the task's workflow status.
 * Body: { status, note }. The note (explanation) is MANDATORY. Any task
 * participant may change the status; the change is logged to history and the
 * rest of the team is notified.
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
  const status = typeof body?.status === "string" ? body.status : "";
  const note = typeof body?.note === "string" ? body.note.trim() : "";
  if (!SETTABLE_STATUS_SET.has(status)) return NextResponse.json({ error: "bad_status" }, { status: 400 });
  if (!note) return NextResponse.json({ error: "note_required" }, { status: 400 });

  const result = await changeStatus(id, viewer.id, status, note);

  const recipients = participants.ids.filter((uid) => uid !== viewer.id);
  if (recipients.length > 0) {
    const actor = mockUsers.find((u) => u.id === viewer.id)?.name || "";
    const label = STATUS_LABELS_ML[status]?.he || status;
    const taskTitle = participants.title || "";
    void dispatchToUsers({
      recipientIds: recipients,
      type: "task_status",
      taskId: id,
      title: taskTitle ? `עודכן סטטוס המשימה: ${taskTitle}` : "עודכן סטטוס המשימה",
      body: `${actor ? actor + " " : ""}שינה/תה את הסטטוס ל"${label}". סיבה: ${note}`,
      actorId: viewer.id,
    });
  }

  return NextResponse.json({ ok: true, ...result });
}
