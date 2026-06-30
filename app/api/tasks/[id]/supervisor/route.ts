import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import { canAccessThread, type ThreadViewer } from "@/lib/db/task-thread-repo";
import {
  isSupervisorOfTask,
  supervisorAction,
  supervisorChainUpToVP,
  type SupervisorAction,
} from "@/lib/db/task-activity-repo";
import { dispatchToUsers } from "@/lib/notify/dispatch";
import { mockUsers } from "@/lib/db/mock-data";
import { formatDateDDMMYYYY } from "@/lib/utils";

export const runtime = "nodejs";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ACTIONS = new Set<SupervisorAction>(["note", "reject", "cancel", "extend"]);

/**
 * POST /api/tasks/:id/supervisor — a supervisor (ממונה) acts on a SUBORDINATE's
 * task. Body: { action: note|reject|cancel|extend, note, newDueDate? }. The
 * reason (note) is MANDATORY. A supervisor can add a note, reject, cancel, or
 * add execution time — but NOT delete. The result is logged and pushed to: the
 * task creator + assignee + team, AND the acting supervisor's own managers up
 * to + including the division head (סמנכ"ל).
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

  // Only a supervisor of the task's assignee (or an admin) may act.
  const supervises = await isSupervisorOfTask(viewer.id, id);
  if (!supervises && viewer.role !== "admin") {
    return NextResponse.json({ error: "not_supervisor" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const action = body?.action as SupervisorAction;
  const note = typeof body?.note === "string" ? body.note.trim() : "";
  const newDueDate = typeof body?.newDueDate === "string" ? body.newDueDate.trim() : "";
  const reasonCode = typeof body?.reasonCode === "string" ? body.reasonCode : undefined;
  if (!ACTIONS.has(action)) return NextResponse.json({ error: "bad_action" }, { status: 400 });
  if (!note) return NextResponse.json({ error: "note_required" }, { status: 400 });
  if (action === "extend" && !ISO_DATE.test(newDueDate)) return NextResponse.json({ error: "bad_date" }, { status: 400 });

  const result = await supervisorAction(id, viewer.id, action, note, newDueDate, reasonCode);

  // Recipients: task people + the supervisor's chain up to the VP, minus the actor.
  const chain = await supervisorChainUpToVP(viewer.id);
  const recipients = [...new Set([...participants.ids, ...chain])].filter((uid) => uid !== viewer.id);
  if (recipients.length > 0) {
    const actor = mockUsers.find((u) => u.id === viewer.id)?.name || "";
    const A = actor ? actor + " " : "";
    const taskTitle = participants.title || "";
    const titleMap: Record<SupervisorAction, string> = {
      note: "הערת ממונה",
      reject: 'המשימה נדחתה ע"י ממונה',
      cancel: 'המשימה בוטלה ע"י ממונה',
      extend: 'עודכן זמן ביצוע ע"י ממונה',
    };
    const bodyMap: Record<SupervisorAction, string> = {
      note: `${A}(ממונה) הוסיף/ה הערה: ${note}`,
      reject: `${A}(ממונה) דחה/תה את המשימה. סיבה: ${note}`,
      cancel: `${A}(ממונה) ביטל/ה את המשימה. סיבה: ${note}`,
      extend: `${A}(ממונה) הוסיף/ה זמן ביצוע — יעד חדש ${formatDateDDMMYYYY(newDueDate)}. סיבה: ${note}`,
    };
    void dispatchToUsers({
      recipientIds: recipients,
      type: "task_supervisor_" + action,
      taskId: id,
      title: titleMap[action] + (taskTitle ? `: ${taskTitle}` : ""),
      body: bodyMap[action],
      actorId: viewer.id,
    });
  }

  return NextResponse.json({ ok: true, ...result });
}
