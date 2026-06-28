import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import { canAccessThread, type ThreadViewer } from "@/lib/db/task-thread-repo";
import { setMemberDone } from "@/lib/db/task-activity-repo";
import { dispatchToUsers } from "@/lib/notify/dispatch";
import { mockUsers } from "@/lib/db/mock-data";

export const runtime = "nodejs";

/**
 * POST /api/tasks/:id/member-status — the current user marks THEIR part of the
 * task done ("בוצע") or undoes it. Body: { done, note }. The note is MANDATORY.
 * When every assigned team member is done, the task auto-completes (→ הושלם).
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
  const done = !!body?.done;
  const note = typeof body?.note === "string" ? body.note.trim() : "";
  if (!note) return NextResponse.json({ error: "note_required" }, { status: 400 });

  const result = await setMemberDone(id, viewer.id, done, note);

  const actor = mockUsers.find((u) => u.id === viewer.id)?.name || "";
  const taskTitle = participants.title || "";
  const recipients = participants.ids.filter((uid) => uid !== viewer.id);

  if (recipients.length > 0) {
    void dispatchToUsers({
      recipientIds: recipients,
      type: "task_member_status",
      taskId: id,
      title: taskTitle ? `עדכון ביצוע במשימה: ${taskTitle}` : "עדכון ביצוע במשימה",
      body: `${actor ? actor + " " : ""}${done ? "סימן/ה 'בוצע'" : "ביטל/ה 'בוצע'"} (${result.doneCount}/${result.neededCount}). פירוט: ${note}`,
      actorId: viewer.id,
    });
  }

  // Everyone signed off → the task is closed. Tell the whole team.
  if (result.autoCompleted) {
    void dispatchToUsers({
      recipientIds: participants.ids.filter((uid) => uid !== viewer.id),
      type: "task_completed",
      taskId: id,
      title: taskTitle ? `המשימה הושלמה: ${taskTitle}` : "המשימה הושלמה",
      body: "כל חברי הצוות סימנו 'בוצע' — המשימה עברה אוטומטית לסטטוס 'הושלם'.",
      actorId: viewer.id,
    });
  }

  return NextResponse.json({ ok: true, ...result });
}
