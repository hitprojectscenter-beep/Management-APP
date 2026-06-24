"use client";

/**
 * Client-side persistence for tasks created in-session.
 *
 * Why this exists: the task list pages (/tasks, home) are server-
 * rendered and receive `mockTasks` as a serialized snapshot taken at
 * render time on the server. When the Add-Task dialog pushes a new task
 * to the in-memory mockTasks module on the CLIENT, that mutation never
 * reaches the server snapshot — so the task "disappears" (the user's
 * bug report: "המשימה לא התווספה לרשימת המשימות").
 *
 * Mirroring the team-members fix, we persist created tasks to
 * localStorage and have the (client) task views merge them on top of
 * the server snapshot, plus a "pmo:tasks-changed" event for live
 * updates without a refresh. On a fresh load the role context also
 * re-injects them into the mockTasks module so module-level readers
 * (e.g. the workload calculator) see them too.
 */

import { useEffect, useState } from "react";
import { mockTasks, type MockTask } from "@/lib/db/mock-data";

export const ADDED_TASKS_KEY = "pmo_added_tasks";
export const TASKS_CHANGED_EVENT = "pmo:tasks-changed";

/** Read the locally-stored created tasks (safe on SSR / private mode). */
export function loadAddedTasks(): MockTask[] {
  try {
    const raw = window.localStorage.getItem(ADDED_TASKS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? (list as MockTask[]) : [];
  } catch {
    return [];
  }
}

/**
 * Persist a newly-created task: push into the in-memory module (so
 * same-session module readers see it immediately), append to
 * localStorage (so it survives reloads / server snapshots), and notify
 * listeners. Idempotent on id.
 */
export function persistAddedTask(task: MockTask): void {
  // In-memory module (dedupe on id).
  if (!mockTasks.some((t) => t.id === task.id)) mockTasks.push(task);
  try {
    const list = loadAddedTasks();
    if (!list.some((t) => t.id === task.id)) {
      list.push(task);
      window.localStorage.setItem(ADDED_TASKS_KEY, JSON.stringify(list));
    }
    window.dispatchEvent(new CustomEvent(TASKS_CHANGED_EVENT, { detail: task }));
  } catch {
    // Private-browsing/Safari — module push above still works this session.
  }
}

/** Re-inject locally-stored tasks into the in-memory module. Called once
 *  on app mount so module-level readers (workload, etc.) are complete
 *  even after a hard reload. */
export function rehydrateAddedTasksIntoModule(): void {
  for (const t of loadAddedTasks()) {
    if (t?.id && !mockTasks.some((m) => m.id === t.id)) mockTasks.push(t);
  }
}

/** Merge server-snapshot tasks with locally-added ones (dedupe on id). */
export function mergeWithAdded(serverTasks: MockTask[]): MockTask[] {
  const added = loadAddedTasks();
  if (added.length === 0) return serverTasks;
  const seen = new Set(serverTasks.map((t) => t.id));
  const fresh = added.filter((t) => t?.id && !seen.has(t.id));
  return fresh.length ? [...serverTasks, ...fresh] : serverTasks;
}

/**
 * Hook: returns the server tasks merged with locally-added ones, kept
 * live via the "pmo:tasks-changed" event and cross-tab "storage".
 */
export function useLiveTasks(serverTasks: MockTask[]): MockTask[] {
  const [tasks, setTasks] = useState<MockTask[]>(serverTasks);
  useEffect(() => {
    const recompute = () => setTasks(mergeWithAdded(serverTasks));
    recompute();
    window.addEventListener(TASKS_CHANGED_EVENT, recompute);
    window.addEventListener("storage", recompute);
    return () => {
      window.removeEventListener(TASKS_CHANGED_EVENT, recompute);
      window.removeEventListener("storage", recompute);
    };
  }, [serverTasks]);
  return tasks;
}
