"use client";

/**
 * Client helpers for the real (DB-backed) auth endpoints. Thin wrappers over
 * /api/auth/* so the gate, login screen and topbar share one implementation.
 * When no database is configured the `me` endpoint reports dbConfigured:false
 * and callers fall back to the localStorage demo flow.
 */

export interface SessionUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
  image: string | null;
  locale: string;
  title: string | null;
  managerId: string | null;
}

export interface SessionInfo {
  user: SessionUser | null;
  dbConfigured: boolean;
}

export async function fetchSession(): Promise<SessionInfo> {
  try {
    const res = await fetch("/api/auth/me", { cache: "no-store" });
    const data = await res.json();
    return { user: data.user ?? null, dbConfigured: !!data.dbConfigured };
  } catch {
    return { user: null, dbConfigured: false };
  }
}

export async function apiLogout(): Promise<void> {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch {
    // ignore — the caller still clears local state + redirects
  }
}
