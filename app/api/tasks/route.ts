import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import {
  listAppTasksForViewer,
  upsertAppTask,
  upsertAppTasks,
  type AppMockTask,
  type Viewer,
} from "@/lib/db/app-tasks-repo";

export const runtime = "nodejs";

type Incoming = Partial<AppMockTask> & { id?: string; title?: string };

function valid(t: Incoming): t is Partial<AppMockTask> & { id: string; title: string } {
  return !!t && typeof t.id === "string" && t.id.length > 0 && typeof t.title === "string" && t.title.trim().length > 0;
}

/** GET /api/tasks — the signed-in user's visible app tasks (own + assigned + subtree for managers). */
export async function GET() {
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "db_not_configured" }, { status: 503 });
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const viewer: Viewer = { id: user.id, role: user.role };
  try {
    return NextResponse.json({ tasks: await listAppTasksForViewer(viewer) });
  } catch (e) {
    return NextResponse.json({ error: "list_failed", detail: String(e) }, { status: 500 });
  }
}

/**
 * POST /api/tasks — create/update task(s) owned by the signed-in user.
 *   • single: { task: {...} }
 *   • bulk  : { tasks: [{...}, ...] }   (intake extraction)
 * creatorId always comes from the session, never the client body.
 */
export async function POST(req: Request) {
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "db_not_configured" }, { status: 503 });
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "bad_json" }, { status: 400 });

  try {
    if (Array.isArray(body.tasks)) {
      const ok = (body.tasks as Incoming[]).filter(valid);
      const saved = await upsertAppTasks(ok, user.id);
      return NextResponse.json({ ok: true, saved });
    }
    const task = body.task as Incoming;
    if (!valid(task)) return NextResponse.json({ error: "id_and_title_required" }, { status: 400 });
    const saved = await upsertAppTask(task, user.id);
    return NextResponse.json({ ok: true, task: saved });
  } catch (e) {
    return NextResponse.json({ error: "save_failed", detail: String(e) }, { status: 500 });
  }
}
