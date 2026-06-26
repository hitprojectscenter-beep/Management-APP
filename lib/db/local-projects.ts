"use client";

/**
 * Client persistence for user-created projects (the "new project" dialog).
 *
 * Until now creating a project only showed a toast and saved nothing. Projects
 * now persist to PostgreSQL (table `app_projects`, via /api/projects) — durable,
 * per-user, cross-device — with localStorage kept as an optimistic/offline
 * cache. Mirrors lib/db/local-tasks.ts (same per-user cache + confirmed-ids
 * ledger so deletes propagate and nothing is resurrected), minus the
 * single-user legacy migration (there was no prior project cache).
 */

import { useEffect, useState } from "react";
import { mockWbsNodes, type MockWbsNode } from "@/lib/db/mock-data";

export type LiveProject = MockWbsNode & {
  methodology?: string;
  plannedStart?: string;
  plannedEnd?: string;
  budget?: number | null;
  status?: string;
  creatorId?: string | null;
};

export const PROJECTS_CHANGED_EVENT = "pmo:projects-changed";
const CACHE_KEY = "pmo_added_projects";
const SYNCED_IDS_KEY = "pmo_synced_project_ids";
const ACTIVE_USER_KEY = "pmo_active_user_id";

function activeUserId(): string {
  try {
    return window.localStorage.getItem(ACTIVE_USER_KEY) || "u1";
  } catch {
    return "u1";
  }
}
const cacheKey = (uid: string = activeUserId()) => `${CACHE_KEY}::${uid}`;

export function loadAddedProjects(): LiveProject[] {
  try {
    const raw = window.localStorage.getItem(cacheKey());
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? (list as LiveProject[]) : [];
  } catch {
    return [];
  }
}

function saveAddedProjects(list: LiveProject[], uid: string = activeUserId()): void {
  try {
    window.localStorage.setItem(cacheKey(uid), JSON.stringify(list));
  } catch {
    /* private mode */
  }
}

function loadSyncedIds(uid: string): Set<string> {
  try {
    const raw = window.localStorage.getItem(`${SYNCED_IDS_KEY}::${uid}`);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? (arr as string[]) : []);
  } catch {
    return new Set();
  }
}
function saveSyncedIds(uid: string, ids: Set<string>): void {
  try {
    window.localStorage.setItem(`${SYNCED_IDS_KEY}::${uid}`, JSON.stringify([...ids]));
  } catch {
    /* ignore */
  }
}

function injectIntoModule(projects: LiveProject[]): void {
  for (const p of projects) {
    if (p?.id && !mockWbsNodes.some((n) => n.id === p.id)) mockWbsNodes.push(p);
  }
}

/** Persist a new project: optimistic cache (instant) + durable DB write. */
export function persistAddedProject(project: LiveProject): void {
  if (!mockWbsNodes.some((n) => n.id === project.id)) mockWbsNodes.push(project);
  const list = loadAddedProjects();
  if (!list.some((p) => p.id === project.id)) {
    list.push(project);
    saveAddedProjects(list);
  }
  try {
    window.dispatchEvent(new CustomEvent(PROJECTS_CHANGED_EVENT, { detail: project }));
  } catch {
    /* ignore */
  }
  void postProjectsToDb({ project });
}

async function postProjectsToDb(body: { project: LiveProject } | { projects: LiveProject[] }): Promise<void> {
  try {
    await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    /* offline / mock mode — optimistic cache covers this device */
  }
}

export function rehydrateAddedProjectsIntoModule(): void {
  injectIntoModule(loadAddedProjects());
}

/** Reconcile the cache against the DB (backfill new, drop deleted-elsewhere). */
export async function syncProjectsFromDb(): Promise<boolean> {
  let dbProjects: LiveProject[] | null = null;
  try {
    const res = await fetch("/api/projects", { headers: { Accept: "application/json" } });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.projects)) dbProjects = data.projects as LiveProject[];
    }
  } catch {
    /* unreachable */
  }
  if (dbProjects === null) return false;

  const uid = activeUserId();
  const dbIds = new Set(dbProjects.map((p) => p.id));
  const known = loadSyncedIds(uid);
  for (const id of dbIds) known.add(id);

  const cache = loadAddedProjects();
  const trulyNew = cache.filter((p) => p?.id && !dbIds.has(p.id) && !known.has(p.id));
  if (trulyNew.length > 0) void postProjectsToDb({ projects: trulyNew });

  const merged = [...dbProjects, ...trulyNew];
  saveAddedProjects(merged, uid);
  saveSyncedIds(uid, known);
  injectIntoModule(merged);
  try {
    window.dispatchEvent(new CustomEvent(PROJECTS_CHANGED_EVENT, { detail: merged }));
  } catch {
    /* ignore */
  }
  return true;
}

/** Fetch one created project from the DB (deep links). Falls back to the local
 *  cache; null if absent/forbidden/offline. */
export async function fetchProjectFromDb(id: string): Promise<LiveProject | null> {
  try {
    const res = await fetch(`/api/projects/${encodeURIComponent(id)}`, { headers: { Accept: "application/json" } });
    if (res.ok) {
      const data = await res.json();
      if (data?.project) return data.project as LiveProject;
    }
  } catch {
    /* offline / mock */
  }
  return loadAddedProjects().find((p) => p.id === id) ?? null;
}

/** Merge server-snapshot projects with cached (per-user) ones (dedupe on id). */
export function mergeWithAddedProjects(serverProjects: LiveProject[]): LiveProject[] {
  const added = loadAddedProjects();
  if (added.length === 0) return serverProjects;
  const seen = new Set(serverProjects.map((p) => p.id));
  const fresh = added.filter((p) => p?.id && !seen.has(p.id));
  return fresh.length ? [...serverProjects, ...fresh] : serverProjects;
}

/** Hook: server projects merged with this user's created ones, kept live. */
export function useLiveProjects(serverProjects: LiveProject[]): LiveProject[] {
  const [projects, setProjects] = useState<LiveProject[]>(serverProjects);
  useEffect(() => {
    const recompute = () => setProjects(mergeWithAddedProjects(serverProjects));
    recompute();
    void syncProjectsFromDb();
    window.addEventListener(PROJECTS_CHANGED_EVENT, recompute);
    window.addEventListener("storage", recompute);
    return () => {
      window.removeEventListener(PROJECTS_CHANGED_EVENT, recompute);
      window.removeEventListener("storage", recompute);
    };
  }, [serverProjects]);
  return projects;
}
