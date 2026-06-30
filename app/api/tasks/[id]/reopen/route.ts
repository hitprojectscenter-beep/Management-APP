import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import { canAccessThread, type ThreadViewer } from "@/lib/db/task-thread-repo";
import { isSupervisorOfTask, reopenTask } from "@/lib/db/task-activity-repo";
import { dispatchToUsers } from "@/lib/notify/dispatch";
import { mockUsers } from "@/lib/db/mock-data";

export const runtime = "nodejs";

/**
 * POST /api/tasks/:id/reopen — reopen a REJECTED/CANCELLED task back into the
 * workflow (restoring its pre-close status) with a mandatory reason. Allowed for
 * the task creator, a supervisor of the assignee, or an admin. Logged + the team
 * is notified. Body: { note }.
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

  const isCreator = participants.creatorId === viewer.id;
  const supervises = await isSupervisorOfTask(viewer.id, id);
  if (!isCreator && !supervises && viewer.role !== "admin") {
    return NextResponse.json({ error: "not_allowed" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const note = typeof body?.note === "string" ? body.note.trim() : "";
  if (!note) return NextResponse.json({ error: "note_required" }, { status: 400 });

  let result;
  try {
    result = await reopenTask(id, viewer.id, note);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    if (msg === "not_closed") return NextResponse.json({ error: "not_closed" }, { status: 400 });
    return NextResponse.json({ error: "error" }, { status: 500 });
  }

  const actor = mockUsers.find((u) => u.id === viewer.id)?.name || "";
  const taskTitle = participants.title || "";
  const recipients = participants.ids.filter((uid) => uid !== viewer.id);
  if (recipients.length > 0) {
    void dispatchToUsers({
      recipientIds: recipients,
      type: "task_reopened",
      taskId: id,
      title: taskTitle ? `המשימה נפתחה מחדש: ${taskTitle}` : "המשימה נפתחה מחדש",
      body: `${actor ? actor + " " : ""}פתח/ה מחדש את המשימה. סיבה: ${note}`,
      actorId: viewer.id,
    });
  }

  return NextResponse.json({ ok: true, ...result });
}
