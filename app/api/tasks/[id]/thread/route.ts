import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import {
  canAccessThread,
  listMessages,
  listReceipts,
  postMessage,
  recordSeen,
  type ThreadViewer,
} from "@/lib/db/task-thread-repo";
import { getActivity, isSupervisorOfTask } from "@/lib/db/task-activity-repo";
import { dispatchToUsers } from "@/lib/notify/dispatch";
import { mockUsers } from "@/lib/db/mock-data";

export const runtime = "nodejs";

/**
 * GET /api/tasks/:id/thread — the task's chat + receipts, for a participant.
 * Side effect: records that the viewer has SEEN the task (delivery receipt).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "db_not_configured" }, { status: 503 });
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const viewer: ThreadViewer = { id: user.id, role: user.role };

  const { ok, participants } = await canAccessThread(viewer, id);
  if (!ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  // Stamp a delivery receipt for a participant who isn't the task creator.
  if (participants.isCreatedTask && participants.creatorId !== viewer.id && participants.ids.includes(viewer.id)) {
    try {
      await recordSeen(id, viewer.id);
    } catch {
      /* non-fatal */
    }
  }

  const [messages, receipts, activity, isSupervisor] = await Promise.all([
    listMessages(id),
    listReceipts(id),
    getActivity(id),
    isSupervisorOfTask(viewer.id, id), // viewer supervises the assignee → can act as ממונה
  ]);
  return NextResponse.json({
    messages,
    receipts,
    activity, // workflow status + history timeline + per-member sign-off (null for seeded tasks)
    participants: participants.ids,
    creatorId: participants.creatorId,
    isCreatedTask: participants.isCreatedTask,
    me: viewer.id,
    meRole: viewer.role,
    isSupervisor,
  });
}

/** POST /api/tasks/:id/thread — post a chat message (participant only). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "db_not_configured" }, { status: 503 });
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const viewer: ThreadViewer = { id: user.id, role: user.role };

  const { ok, participants } = await canAccessThread(viewer, id);
  if (!ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const text = typeof body?.body === "string" ? body.body.trim() : "";
  if (!text) return NextResponse.json({ error: "empty" }, { status: 400 });

  // @mentions: only ids that are real participants (and not the author).
  const mentions: string[] = Array.isArray(body?.mentions)
    ? [...new Set(body.mentions.filter((m: unknown) => typeof m === "string" && participants.ids.includes(m as string) && m !== viewer.id))] as string[]
    : [];
  const mentionSet = new Set(mentions);

  const message = await postMessage(id, viewer.id, text);

  const author = mockUsers.find((u) => u.id === viewer.id)?.name || "";
  const taskTitle = participants.title || "";

  // Generic "new message" → every other participant EXCEPT those mentioned
  // (mentioned users get the focused mention notification instead, no dupes).
  const generic = participants.ids.filter((uid) => uid !== viewer.id && !mentionSet.has(uid));
  if (generic.length > 0) {
    void dispatchToUsers({
      recipientIds: generic,
      type: "task_message",
      taskId: id,
      title: taskTitle ? `הודעה חדשה במשימה: ${taskTitle}` : "הודעה חדשה במשימה",
      body: author ? `${author}: ${text}` : text,
      actorId: viewer.id,
    });
  }

  // Focused @mention notification.
  if (mentions.length > 0) {
    void dispatchToUsers({
      recipientIds: mentions,
      type: "task_mention",
      taskId: id,
      title: taskTitle ? `📣 ${author || "מישהו"} מזכיר/ה אותך במשימה: ${taskTitle}` : "מוזכרת במשימה",
      body: author ? `${author}: ${text}` : text,
      actorId: viewer.id,
    });
  }

  return NextResponse.json({ ok: true, message, mentioned: mentions });
}
