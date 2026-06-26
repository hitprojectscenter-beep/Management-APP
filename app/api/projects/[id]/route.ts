import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import {
  getAppProjectById,
  upsertAppProject,
  deleteAppProject,
  canViewerAccess,
  type AppProjectNode,
  type Viewer,
} from "@/lib/db/app-projects-repo";

export const runtime = "nodejs";

async function resolve(): Promise<Viewer | null> {
  const user = await requireUser();
  return user ? { id: user.id, role: user.role } : null;
}

/** GET /api/projects/:id — one created project (if the viewer may see it). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "db_not_configured" }, { status: 503 });
  const viewer = await resolve();
  if (!viewer) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const project = await getAppProjectById(id);
  if (!project) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!(await canViewerAccess(viewer, project))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return NextResponse.json({ project });
}

/** PATCH /api/projects/:id — merge changes (owner/subtree/admin). */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "db_not_configured" }, { status: 503 });
  const viewer = await resolve();
  if (!viewer) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const existing = await getAppProjectById(id);
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!(await canViewerAccess(viewer, existing))) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as Partial<AppProjectNode> | null;
  if (!body) return NextResponse.json({ error: "bad_json" }, { status: 400 });
  const merged = { ...existing, ...body, id };
  const saved = await upsertAppProject(merged, existing.creatorId ?? viewer.id);
  return NextResponse.json({ ok: true, project: saved });
}

/** DELETE /api/projects/:id — remove a created project (owner/subtree/admin). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "db_not_configured" }, { status: 503 });
  const viewer = await resolve();
  if (!viewer) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const existing = await getAppProjectById(id);
  if (!existing) return NextResponse.json({ ok: true });
  if (!(await canViewerAccess(viewer, existing))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  await deleteAppProject(id);
  return NextResponse.json({ ok: true });
}
