import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import { getAppTaskById, upsertAppTask, canViewerAccess, type Viewer, type AppMockTask } from "@/lib/db/app-tasks-repo";

export const runtime = "nodejs";

const PRIORITIES = new Set(["low", "medium", "high", "critical"]);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_BULK = 200;

/**
 * POST /api/tasks/bulk — apply ONE field change to MANY tasks at once.
 * Body: { taskIds: string[], action: "priority" | "dueDate", value: string }.
 * Each task is access-checked independently (owner / subtree / admin); tasks the
 * viewer can't touch, or that don't exist (e.g. seeded tasks), are skipped and
 * reported. Returns { updated: string[], skipped: {id, reason}[] }.
 */
export async function POST(req: Request) {
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "db_not_configured" }, { status: 503 });
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const viewer: Viewer = { id: user.id, role: user.role };

  const body = await req.json().catch(() => null);
  const taskIds: string[] = Array.isArray(body?.taskIds) ? body.taskIds.filter((x: unknown) => typeof x === "string") : [];
  const action = body?.action;
  const value = typeof body?.value === "string" ? body.value.trim() : "";
  if (taskIds.length === 0) return NextResponse.json({ error: "no_tasks" }, { status: 400 });
  if (taskIds.length > MAX_BULK) return NextResponse.json({ error: "too_many" }, { status: 400 });
  if (action !== "priority" && action !== "dueDate") return NextResponse.json({ error: "bad_action" }, { status: 400 });
  if (action === "priority" && !PRIORITIES.has(value)) return NextResponse.json({ error: "bad_value" }, { status: 400 });
  if (action === "dueDate" && !ISO_DATE.test(value)) return NextResponse.json({ error: "bad_value" }, { status: 400 });

  const updated: string[] = [];
  const skipped: { id: string; reason: string }[] = [];
  for (const id of [...new Set(taskIds)]) {
    const existing = await getAppTaskById(id);
    if (!existing) {
      skipped.push({ id, reason: "not_found" });
      continue;
    }
    if (!(await canViewerAccess(viewer, existing))) {
      skipped.push({ id, reason: "forbidden" });
      continue;
    }
    const patch = action === "priority" ? { priority: value } : { plannedEnd: value };
    await upsertAppTask({ ...existing, ...patch, id }, existing.creatorId ?? viewer.id);
    updated.push(id);
  }

  return NextResponse.json({ ok: true, updated, skipped });
}
