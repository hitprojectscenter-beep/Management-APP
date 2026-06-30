import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import { canAccessThread, type ThreadViewer } from "@/lib/db/task-thread-repo";
import { isSupervisorOfTask, reassignTask, reportingSubtree, supervisorChainUpToVP } from "@/lib/db/task-activity-repo";
import { dispatchToUsers } from "@/lib/notify/dispatch";
import { mockUsers } from "@/lib/db/mock-data";

export const runtime = "nodejs";

/**
 * POST /api/tasks/:id/reassign — a supervisor (ממונה) delegates a subordinate's
 * task to a DIFFERENT user, with a mandatory reason. Body: { newAssigneeId, note }.
 * The target must be in the actor's reporting subtree (admins may target anyone).
 * Logged + notified to the previous & new assignee, the creator, and the actor's
 * own managers up to the division head.
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

  const isAdmin = viewer.role === "admin";
  const supervises = await isSupervisorOfTask(viewer.id, id);
  if (!supervises && !isAdmin) return NextResponse.json({ error: "not_supervisor" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const newAssigneeId = typeof body?.newAssigneeId === "string" ? body.newAssigneeId.trim() : "";
  const note = typeof body?.note === "string" ? body.note.trim() : "";
  if (!newAssigneeId) return NextResponse.json({ error: "target_required" }, { status: 400 });
  if (!note) return NextResponse.json({ error: "note_required" }, { status: 400 });

  // The target must report under the actor (admins may delegate to anyone).
  if (!isAdmin) {
    const subtree = await reportingSubtree(viewer.id);
    if (!subtree.has(newAssigneeId)) return NextResponse.json({ error: "target_not_subordinate" }, { status: 403 });
  }

  let result;
  try {
    result = await reassignTask(id, viewer.id, newAssigneeId, note);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    if (msg === "same_assignee") return NextResponse.json({ error: "same_assignee" }, { status: 400 });
    return NextResponse.json({ error: "error" }, { status: 500 });
  }

  const name = (uid: string | null) => (uid ? mockUsers.find((u) => u.id === uid)?.name || "" : "");
  const actor = name(viewer.id);
  const taskTitle = participants.title || "";
  const chain = await supervisorChainUpToVP(viewer.id);
  const recipients = [...new Set([result.from, newAssigneeId, participants.creatorId, ...chain].filter((x): x is string => !!x))].filter((uid) => uid !== viewer.id);
  if (recipients.length > 0) {
    void dispatchToUsers({
      recipientIds: recipients,
      type: "task_reassigned",
      taskId: id,
      title: taskTitle ? `המשימה הועברה: ${taskTitle}` : "המשימה הועברה לאחראי אחר",
      body: `${actor ? actor + " " : ""}(ממונה) העביר/ה את המשימה${result.from ? ` מ${name(result.from)}` : ""} ל${name(newAssigneeId)}. סיבה: ${note}`,
      actorId: viewer.id,
    });
  }

  return NextResponse.json({ ok: true, ...result });
}
