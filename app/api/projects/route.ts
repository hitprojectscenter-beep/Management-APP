import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import {
  listAppProjectsForViewer,
  upsertAppProject,
  upsertAppProjects,
  type AppProjectNode,
  type Viewer,
} from "@/lib/db/app-projects-repo";

export const runtime = "nodejs";

type Incoming = Partial<AppProjectNode> & { id?: string; name?: string };

function valid(p: Incoming): p is Partial<AppProjectNode> & { id: string; name: string } {
  return !!p && typeof p.id === "string" && p.id.length > 0 && typeof p.name === "string" && p.name.trim().length > 0;
}

/** GET /api/projects — the signed-in user's visible created projects. */
export async function GET() {
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "db_not_configured" }, { status: 503 });
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const viewer: Viewer = { id: user.id, role: user.role };
  try {
    return NextResponse.json({ projects: await listAppProjectsForViewer(viewer) });
  } catch (e) {
    return NextResponse.json({ error: "list_failed", detail: String(e) }, { status: 500 });
  }
}

/** POST /api/projects — create/update project(s). creatorId comes from the session. */
export async function POST(req: Request) {
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "db_not_configured" }, { status: 503 });
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "bad_json" }, { status: 400 });

  try {
    if (Array.isArray(body.projects)) {
      const ok = (body.projects as Incoming[]).filter(valid);
      return NextResponse.json({ ok: true, saved: await upsertAppProjects(ok, user.id) });
    }
    const project = body.project as Incoming;
    if (!valid(project)) return NextResponse.json({ error: "id_and_name_required" }, { status: 400 });
    return NextResponse.json({ ok: true, project: await upsertAppProject(project, user.id) });
  } catch (e) {
    return NextResponse.json({ error: "save_failed", detail: String(e) }, { status: 500 });
  }
}
