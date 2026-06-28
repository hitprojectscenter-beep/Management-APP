import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import { canAccessThread, type ThreadViewer } from "@/lib/db/task-thread-repo";
import { updateMemberRoles } from "@/lib/db/task-activity-repo";
import { dispatchToUsers } from "@/lib/notify/dispatch";
import { mockUsers } from "@/lib/db/mock-data";

export const runtime = "nodejs";

const VALID_ROLE = new Set([
  "execute", "provide_info", "meeting", "report", "review", "coordinate", "consult", "other",
]);

/**
 * PATCH /api/tasks/:id/member-roles — update the per-member responsibility map
 * (who does what). Body: { memberRoles: { userId: { type, detail } } }. Only the
 * task creator (or an admin) may set responsibilities; the change is logged and
 * the team is notified.
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
  // The team owner (creator) — or an admin — assigns/edits responsibilities.
  if (participants.creatorId !== viewer.id && viewer.role !== "admin") {
    return NextResponse.json({ error: "only_creator" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const raw = body && typeof body.memberRoles === "object" && body.memberRoles ? body.memberRoles : null;
  if (!raw) return NextResponse.json({ error: "bad_input" }, { status: 400 });

  // Sanitize: keep only real participants + a valid role type.
  const partSet = new Set(participants.ids);
  const roles: Record<string, { type: string; detail?: string }> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!partSet.has(k)) continue;
    if (v && typeof v === "object" && typeof (v as { type?: unknown }).type === "string") {
      const type = VALID_ROLE.has((v as { type: string }).type) ? (v as { type: string }).type : "execute";
      const d = (v as { detail?: unknown }).detail;
      const detail = typeof d === "string" ? d.trim().slice(0, 300) : "";
      roles[k] = { type, ...(detail ? { detail } : {}) };
    }
  }

  const result = await updateMemberRoles(id, viewer.id, roles);

  const actor = mockUsers.find((u) => u.id === viewer.id)?.name || "";
  const taskTitle = participants.title || "";
  const recipients = participants.ids.filter((uid) => uid !== viewer.id);
  if (recipients.length > 0) {
    void dispatchToUsers({
      recipientIds: recipients,
      type: "task_roles_updated",
      taskId: id,
      title: taskTitle ? `עודכנו תפקידי הצוות: ${taskTitle}` : "עודכנו תפקידי הצוות במשימה",
      body: `${actor ? actor + " " : ""}עדכן/ה את חלוקת התפקידים במשימה.`,
      actorId: viewer.id,
    });
  }

  return NextResponse.json({ ok: true, ...result });
}
