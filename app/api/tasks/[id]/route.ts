import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import {
  getAppTaskById,
  upsertAppTask,
  deleteAppTask,
  canViewerAccess,
  type AppMockTask,
  type Viewer,
} from "@/lib/db/app-tasks-repo";

export const runtime = "nodejs";

async function resolve(): Promise<Viewer | null> {
  const user = await requireUser();
  return user ? { id: user.id, role: user.role } : null;
}

/** GET /api/tasks/:id — one task (if the viewer may see it). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "db_not_configured" }, { status: 503 });
  const viewer = await resolve();
  if (!viewer) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const task = await getAppTaskById(id);
  if (!task) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!(await canViewerAccess(viewer, task))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return NextResponse.json({ task });
}

/** PATCH /api/tasks/:id — merge changes into an existing task (owner/subtree/admin). */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "db_not_configured" }, { status: 503 });
  const viewer = await resolve();
  if (!viewer) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const existing = await getAppTaskById(id);
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!(await canViewerAccess(viewer, existing))) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as Partial<AppMockTask> | null;
  if (!body) return NextResponse.json({ error: "bad_json" }, { status: 400 });
  const merged = { ...existing, ...body, id }; // id is immutable
  const saved = await upsertAppTask(merged, existing.creatorId ?? viewer.id);
  return NextResponse.json({ ok: true, task: saved });
}

/** DELETE /api/tasks/:id — remove a task (owner/subtree/admin). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "db_not_configured" }, { status: 503 });
  const viewer = await resolve();
  if (!viewer) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const existing = await getAppTaskById(id);
  if (!existing) return NextResponse.json({ ok: true }); // already gone — idempotent
  if (!(await canViewerAccess(viewer, existing))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  await deleteAppTask(id);
  return NextResponse.json({ ok: true });
}
