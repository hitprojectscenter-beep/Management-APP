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
  /** True when an admin set an initial password the user must replace. */
  mustChangePassword?: boolean;
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

export interface ChangePasswordResponse {
  ok: boolean;
  /** "invalid_current" | "weak" | "network" | ... when ok is false. */
  error?: string;
  /** Hebrew policy violations to show under the field, when error === "weak". */
  errors?: string[];
}

/** Self-service password change (also used for the forced first-login change). */
export async function apiChangePassword(
  currentPassword: string,
  newPassword: string,
): Promise<ChangePasswordResponse> {
  try {
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok) return { ok: true };
    return { ok: false, error: data.error || "failed", errors: data.errors };
  } catch {
    return { ok: false, error: "network" };
  }
}
