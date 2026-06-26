/**
 * Data-access for `app_projects` — projects created through the app UI. Mirrors
 * app-tasks-repo: server-only, per-user access enforced here (never trust the
 * client). A row converts to a `MockWbsNode`-shaped object (level "project") so
 * the existing projects UI can render it next to the seeded projects.
 *
 * Access model (same as app_tasks):
 *   • admin                   → all created projects.
 *   • manager                 → own + everyone in the reporting subtree.
 *   • member/viewer/guest     → own only.
 */

import "server-only";
import { eq, or, inArray, desc } from "drizzle-orm";
import { getDb } from "./client";
import { appProjects, users, type AppProject, type NewAppProject } from "./schema";
import type { MockWbsNode } from "./mock-data";

/** A created project rendered as a WBS "project" node, plus its extra fields. */
export type AppProjectNode = MockWbsNode & {
  methodology?: string;
  plannedStart?: string;
  plannedEnd?: string;
  budget?: number | null;
  status?: string;
  creatorId?: string | null;
};

export interface Viewer {
  id: string;
  role: "admin" | "manager" | "member" | "viewer" | "guest";
}

function intOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? n : null;
}

/** DB row → WBS-node shaped object the projects UI already renders. */
export function rowToNode(r: AppProject): AppProjectNode {
  return {
    id: r.id,
    parentId: r.programId || null,
    level: "project",
    name: r.name,
    nameEn: r.nameEn ?? undefined,
    description: r.description ?? undefined,
    methodology: r.methodology ?? undefined,
    position: 0,
    plannedStart: r.plannedStart ?? "",
    plannedEnd: r.plannedEnd ?? "",
    budget: r.budget ?? null,
    status: r.status ?? "active",
    creatorId: r.creatorId ?? null,
  };
}

/** Incoming client project → DB insert row. Sanitizes; never trusts shape. */
function toRow(p: Partial<AppProjectNode> & { id: string; name: string }, creatorId: string | null): NewAppProject {
  const methodology = ["waterfall", "agile", "kanban"].includes(String(p.methodology)) ? String(p.methodology) : "waterfall";
  return {
    id: p.id,
    name: String(p.name).slice(0, 300),
    nameEn: p.nameEn ?? null,
    description: p.description ?? null,
    programId: (p as { programId?: string }).programId ?? p.parentId ?? "",
    methodology,
    plannedStart: p.plannedStart ?? "",
    plannedEnd: p.plannedEnd ?? "",
    budget: intOrNull(p.budget),
    status: p.status ?? "active",
    creatorId,
    updatedAt: new Date(),
  };
}

/** [viewerId, ...everyone in their reporting subtree]. Small team → one scan. */
async function visibleUserIds(viewerId: string): Promise<string[]> {
  const all = await getDb().select({ id: users.id, managerId: users.managerId }).from(users);
  const childrenOf = new Map<string, string[]>();
  for (const u of all) {
    if (u.managerId) {
      const list = childrenOf.get(u.managerId) ?? [];
      list.push(u.id);
      childrenOf.set(u.managerId, list);
    }
  }
  const result = new Set<string>([viewerId]);
  const queue = [viewerId];
  while (queue.length) {
    const cur = queue.shift() as string;
    for (const child of childrenOf.get(cur) ?? []) {
      if (!result.has(child)) {
        result.add(child);
        queue.push(child);
      }
    }
  }
  return [...result];
}

/** All created projects the viewer may see, newest first. */
export async function listAppProjectsForViewer(viewer: Viewer): Promise<AppProjectNode[]> {
  const db = getDb();
  if (viewer.role === "admin") {
    const rows = await db.select().from(appProjects).orderBy(desc(appProjects.createdAt));
    return rows.map(rowToNode);
  }
  const ids = viewer.role === "manager" ? await visibleUserIds(viewer.id) : [viewer.id];
  const rows = await db
    .select()
    .from(appProjects)
    .where(or(inArray(appProjects.creatorId, ids)))
    .orderBy(desc(appProjects.createdAt));
  return rows.map(rowToNode);
}

export async function getAppProjectById(id: string): Promise<AppProjectNode | null> {
  const rows = await getDb().select().from(appProjects).where(eq(appProjects.id, id)).limit(1);
  return rows[0] ? rowToNode(rows[0]) : null;
}

export async function canViewerAccess(viewer: Viewer, project: AppProjectNode): Promise<boolean> {
  if (viewer.role === "admin") return true;
  const ids = viewer.role === "manager" ? await visibleUserIds(viewer.id) : [viewer.id];
  return !!project.creatorId && new Set(ids).has(project.creatorId);
}

/** Insert or update a project. On update keeps the original creator + createdAt. */
export async function upsertAppProject(
  project: Partial<AppProjectNode> & { id: string; name: string },
  creatorId: string | null,
): Promise<AppProjectNode> {
  const row = toRow(project, creatorId);
  const { id: _id, creatorId: _c, ...mutable } = row;
  void _id;
  void _c;
  const [saved] = await getDb()
    .insert(appProjects)
    .values(row)
    .onConflictDoUpdate({ target: appProjects.id, set: mutable })
    .returning();
  return rowToNode(saved);
}

export async function upsertAppProjects(
  projects: (Partial<AppProjectNode> & { id: string; name: string })[],
  creatorId: string | null,
): Promise<number> {
  let n = 0;
  for (const p of projects) {
    try {
      await upsertAppProject(p, creatorId);
      n++;
    } catch {
      /* skip the bad row */
    }
  }
  return n;
}

export async function deleteAppProject(id: string): Promise<void> {
  await getDb().delete(appProjects).where(eq(appProjects.id, id));
}
