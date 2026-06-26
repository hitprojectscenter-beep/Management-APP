"use client";

/**
 * Client persistence for user-created tasks (add-task form + intake
 * extraction).
 *
 * History: these tasks used to live ONLY in this browser's localStorage, so a
 * task was visible only on the device that created it and a deep link to it
 * 404'd anywhere else. They now have a durable, per-user, cross-device home in
 * PostgreSQL (table `app_tasks`, via /api/tasks). localStorage is kept as an
 * OPTIMISTIC CACHE so the UI stays instant and the app still works in mock mode
 * (no DATABASE_URL) or offline — but when a database is configured it is the
 * source of truth, and `syncTasksFromDb()` reconciles the cache to it.
 *
 * Per-user correctness: the cache is namespaced by the active user id
 * (`pmo_added_tasks::<uid>`), so a shared browser never shows one user's tasks
 * to the next. The DB query is already per-user (own + assigned + the manager
 * subtree), so a sync overwrites the cache with exactly what this user may see.
 */

import { useEffect, useState } from "react";
import { mockTasks, type MockTask } from "@/lib/db/mock-data";

export const TASKS_CHANGED_EVENT = "pmo:tasks-changed";
const LEGACY_KEY = "pmo_added_tasks"; // pre-namespacing key (single-user era)
const ACTIVE_USER_KEY = "pmo_active_user_id";
const SYNCED_IDS_KEY = "pmo_synced_task_ids"; // per-user: task ids ever confirmed present in the DB

// --- cache key (per active user) --------------------------------------------

function activeUserId(): string {
  try {
    return window.localStorage.getItem(ACTIVE_USER_KEY) || "u1";
  } catch {
    return "u1";
  }
}
function cacheKey(uid: string = activeUserId()): string {
  return `${LEGACY_KEY}::${uid}`;
}

// --- raw cache read/write ----------------------------------------------------

/** Read the active user's cached tasks (safe on SSR / private mode). */
export function loadAddedTasks(): MockTask[] {
  try {
    const uid = activeUserId();
    const raw = window.localStorage.getItem(cacheKey(uid));
    if (raw) {
      const list = JSON.parse(raw);
      return Array.isArray(list) ? (list as MockTask[]) : [];
    }
    // One-time migration of the old un-namespaced cache into the default
    // operator's namespace (u1 = Mark), so existing local tasks aren't lost.
    if (uid === "u1") {
      const legacy = window.localStorage.getItem(LEGACY_KEY);
      if (legacy) {
        const list = JSON.parse(legacy);
        if (Array.isArray(list) && list.length) {
          window.localStorage.setItem(cacheKey(uid), legacy);
          return list as MockTask[];
        }
      }
    }
    return [];
  } catch {
    return [];
  }
}

function saveAddedTasks(list: MockTask[], uid: string = activeUserId()): void {
  try {
    window.localStorage.setItem(cacheKey(uid), JSON.stringify(list));
  } catch {
    /* private-mode — module copy still works this session */
  }
}

/** Ids the DB has confirmed for this user. Lets a sync tell a never-synced
 *  task (→ backfill) from one that was synced and later deleted elsewhere
 *  (→ drop, don't resurrect). */
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

function injectIntoModule(tasks: MockTask[]): void {
  for (const t of tasks) {
    if (t?.id && !mockTasks.some((m) => m.id === t.id)) mockTasks.push(t);
  }
}

// --- writes ------------------------------------------------------------------

/**
 * Persist a newly-created task. Writes the OPTIMISTIC cache immediately (module
 * + localStorage + change event so live views update with no refresh) and, in
 * parallel, durably to the database (best-effort; if the DB is absent/offline
 * the cache still covers this device). Idempotent on id.
 */
export function persistAddedTask(task: MockTask): void {
  if (!mockTasks.some((t) => t.id === task.id)) mockTasks.push(task);
  const list = loadAddedTasks();
  if (!list.some((t) => t.id === task.id)) {
    list.push(task);
    saveAddedTasks(list);
  }
  try {
    window.dispatchEvent(new CustomEvent(TASKS_CHANGED_EVENT, { detail: task }));
  } catch {
    /* ignore */
  }
  // Durable write (cross-device). creatorId is taken from the session server-side.
  void postTasksToDb({ task });
}

/** Persist many tasks at once (intake extraction). One DB round-trip. */
export function persistAddedTasks(tasks: MockTask[]): void {
  if (tasks.length === 0) return;
  const list = loadAddedTasks();
  for (const task of tasks) {
    if (!mockTasks.some((t) => t.id === task.id)) mockTasks.push(task);
    if (!list.some((t) => t.id === task.id)) list.push(task);
  }
  saveAddedTasks(list);
  try {
    window.dispatchEvent(new CustomEvent(TASKS_CHANGED_EVENT, { detail: tasks }));
  } catch {
    /* ignore */
  }
  void postTasksToDb({ tasks });
}

async function postTasksToDb(body: { task: MockTask } | { tasks: MockTask[] }): Promise<void> {
  try {
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    // No need to reconcile here — the optimistic cache already shows the task;
    // the next syncTasksFromDb() (on navigation/mount) folds in the DB truth.
  } catch {
    /* offline / mock mode — optimistic cache covers this device */
  }
}

// --- reads / reconcile with DB ----------------------------------------------

/** Re-inject the cached tasks into the in-memory module (instant, no network). */
export function rehydrateAddedTasksIntoModule(): void {
  injectIntoModule(loadAddedTasks());
}

/**
 * Pull this user's tasks from the database and reconcile the optimistic cache
 * to them. The DB is authoritative + per-user; any cache entry not yet in the
 * DB (an in-flight create) is preserved. No-ops gracefully when the DB isn't
 * configured (503) or is unreachable — the cache is left untouched. Fires the
 * change event so live views re-render. Returns true if a DB sync happened.
 */
export async function syncTasksFromDb(): Promise<boolean> {
  let dbTasks: MockTask[] | null = null;
  try {
    const res = await fetch("/api/tasks", { headers: { Accept: "application/json" } });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.tasks)) dbTasks = data.tasks as MockTask[];
    }
  } catch {
    /* unreachable — fall through to no-op */
  }
  if (dbTasks === null) return false; // DB unavailable → keep cache as-is

  const uid = activeUserId();
  const dbIds = new Set(dbTasks.map((t) => t.id));
  const known = loadSyncedIds(uid);
  for (const id of dbIds) known.add(id); // everything currently in the DB is confirmed

  const cache = loadAddedTasks();
  // A cache task missing from the DB is one of two things:
  //   • never confirmed before  → a genuine create (made pre-DB, or whose
  //     original write failed) → BACKFILL it so it becomes durable + cross-device.
  //   • confirmed before, now gone → it was DELETED (or unshared) elsewhere →
  //     drop it; do NOT resurrect it.
  const trulyNew = cache.filter((t) => t?.id && !dbIds.has(t.id) && !known.has(t.id));
  if (trulyNew.length > 0) void postTasksToDb({ tasks: trulyNew });

  // The cache becomes exactly what the user may see now: the DB set + the
  // not-yet-acknowledged new ones. Deleted-elsewhere tasks fall away.
  const merged = [...dbTasks, ...trulyNew];
  saveAddedTasks(merged, uid);
  saveSyncedIds(uid, known);
  injectIntoModule(merged);
  try {
    window.dispatchEvent(new CustomEvent(TASKS_CHANGED_EVENT, { detail: merged }));
  } catch {
    /* ignore */
  }
  return true;
}

/** Fetch a single task from the DB (for deep links). null if absent/forbidden/offline. */
export async function fetchTaskFromDb(id: string): Promise<MockTask | null> {
  try {
    const res = await fetch(`/api/tasks/${encodeURIComponent(id)}`, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const data = await res.json();
    return (data?.task as MockTask) ?? null;
  } catch {
    return null;
  }
}

/** Merge server-snapshot tasks with cached (per-user) ones (dedupe on id). */
export function mergeWithAdded(serverTasks: MockTask[]): MockTask[] {
  const added = loadAddedTasks();
  if (added.length === 0) return serverTasks;
  const seen = new Set(serverTasks.map((t) => t.id));
  const fresh = added.filter((t) => t?.id && !seen.has(t.id));
  return fresh.length ? [...serverTasks, ...fresh] : serverTasks;
}

/**
 * Hook: server tasks merged with this user's tasks, kept live via the
 * change event + cross-tab storage. On mount it also reconciles against the
 * database (cross-device), so a task created on another device shows up here.
 */
export function useLiveTasks(serverTasks: MockTask[]): MockTask[] {
  const [tasks, setTasks] = useState<MockTask[]>(serverTasks);
  useEffect(() => {
    const recompute = () => setTasks(mergeWithAdded(serverTasks));
    recompute();
    // Reconcile with the DB once on mount (no-op in mock/offline mode).
    void syncTasksFromDb();
    window.addEventListener(TASKS_CHANGED_EVENT, recompute);
    window.addEventListener("storage", recompute);
    return () => {
      window.removeEventListener(TASKS_CHANGED_EVENT, recompute);
      window.removeEventListener("storage", recompute);
    };
  }, [serverTasks]);
  return tasks;
}
