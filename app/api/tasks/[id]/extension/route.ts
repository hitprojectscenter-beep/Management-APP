import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import { canAccessThread, type ThreadViewer } from "@/lib/db/task-thread-repo";
import { requestExtension, decideExtension } from "@/lib/db/task-activity-repo";
import { dispatchToUsers } from "@/lib/notify/dispatch";
import { mockUsers } from "@/lib/db/mock-data";
import { formatDateDDMMYYYY } from "@/lib/utils";

export const runtime = "nodejs";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * POST /api/tasks/:id/extension — a team member requests a new due date.
 * Body: { newDueDate (yyyy-mm-dd), note }. The note (why) is MANDATORY; the
 * request is sent to the task creator, who can later approve/reject it.
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
  const newDueDate = typeof body?.newDueDate === "string" ? body.newDueDate.trim() : "";
  const note = typeof body?.note === "string" ? body.note.trim() : "";
  if (!ISO_DATE.test(newDueDate)) return NextResponse.json({ error: "bad_date" }, { status: 400 });
  if (!note) return NextResponse.json({ error: "note_required" }, { status: 400 });

  const result = await requestExtension(id, viewer.id, newDueDate, note);

  // Notify the task creator (the decision-maker) — fall back to the team.
  const actor = mockUsers.find((u) => u.id === viewer.id)?.name || "";
  const taskTitle = participants.title || "";
  const recipients = participants.creatorId && participants.creatorId !== viewer.id
    ? [participants.creatorId]
    : participants.ids.filter((uid) => uid !== viewer.id);
  if (recipients.length > 0) {
    void dispatchToUsers({
      recipientIds: recipients,
      type: "task_extension_request",
      taskId: id,
      title: taskTitle ? `בקשת עדכון יעד: ${taskTitle}` : "בקשת עדכון יעד למשימה",
      body: `${actor ? actor + " " : ""}מבקש/ת לעדכן את תאריך היעד ל-${formatDateDDMMYYYY(newDueDate)}. סיבה: ${note}`,
      actorId: viewer.id,
    });
  }

  return NextResponse.json({ ok: true, ...result });
}

/**
 * PATCH /api/tasks/:id/extension — the task creator approves/rejects a request.
 * Body: { requestId, approve, note }. Approving applies the new due date.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "db_not_configured" }, { status: 503 });
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const viewer: ThreadViewer = { id: user.id, role: user.role };

  const { ok, participants } = await canAccessThread(viewer, id);
  if (!ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!participants.isCreatedTask) return NextResponse.json({ error: "not_a_workflow_task" }, { status: 400 });

  // Only the creator (or an admin) decides on extension requests.
  const isCreator = participants.creatorId === viewer.id;
  if (!isCreator && viewer.role !== "admin") return NextResponse.json({ error: "only_creator" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const requestId = typeof body?.requestId === "string" ? body.requestId : "";
  const approve = !!body?.approve;
  const note = typeof body?.note === "string" ? body.note.trim() : "";
  if (!requestId) return NextResponse.json({ error: "request_required" }, { status: 400 });
  if (!note) return NextResponse.json({ error: "note_required" }, { status: 400 });

  let result;
  try {
    result = await decideExtension(id, viewer.id, requestId, approve, note);
  } catch {
    return NextResponse.json({ error: "request_not_found" }, { status: 404 });
  }

  const actor = mockUsers.find((u) => u.id === viewer.id)?.name || "";
  const taskTitle = participants.title || "";
  const recipients = participants.ids.filter((uid) => uid !== viewer.id);
  if (recipients.length > 0) {
    void dispatchToUsers({
      recipientIds: recipients,
      type: "task_extension_decision",
      taskId: id,
      title: taskTitle ? `החלטה על בקשת יעד: ${taskTitle}` : "החלטה על בקשת עדכון יעד",
      body: `${actor ? actor + " " : ""}${approve ? "אישר/ה" : "דחה/תה"} את הבקשה${result.applied ? ` — היעד עודכן ל-${formatDateDDMMYYYY(result.newDueDate)}` : ""}. הערה: ${note}`,
      actorId: viewer.id,
    });
  }

  return NextResponse.json({ ok: true, ...result });
}
