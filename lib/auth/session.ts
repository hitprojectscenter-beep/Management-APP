"use client";

/**
 * Demo-grade login/session.
 *
 * The app has no database, so this is NOT production-grade auth (no
 * hashed passwords, no server-side session). It authenticates an email
 * against the known users (seeded + invited) plus a shared demo
 * password, and records the logged-in identity in localStorage so the
 * app opens as THAT person ("שלום ניסוי", their tasks, their view) —
 * which is exactly the "each person logs in and sees their own" UX the
 * operator asked for.
 *
 * For real production auth (per-user passwords, OAuth, secure sessions)
 * the app needs a database + Auth.js — a separate infrastructure step.
 */

import { mockUsers, type MockUser } from "@/lib/db/mock-data";

const SESSION_KEY = "pmo_session_user_id";
const ACTIVE_USER_KEY = "pmo_active_user_id";
const ADDED_USERS_KEY = "pmo_added_users";

/** Shared demo password (shown on the login screen). Replace with real
 *  per-user credentials once a DB is wired up. */
export const DEMO_PASSWORD = "mapi2026";

/** All users the app knows about: seeded + invited (localStorage). */
export function allKnownUsers(): MockUser[] {
  try {
    const raw = window.localStorage.getItem(ADDED_USERS_KEY);
    const added = raw ? (JSON.parse(raw) as MockUser[]) : [];
    const seen = new Set(mockUsers.map((u) => u.id));
    return [...mockUsers, ...added.filter((u) => u?.id && !seen.has(u.id))];
  } catch {
    return mockUsers;
  }
}

export function findUserByEmail(email: string): MockUser | null {
  const e = email.trim().toLowerCase();
  if (!e) return null;
  return allKnownUsers().find((u) => u.email.toLowerCase() === e) || null;
}

export type LoginResult =
  | { ok: true; user: MockUser }
  | { ok: false; reason: "no_user" | "bad_password" };

export function login(email: string, password: string): LoginResult {
  const user = findUserByEmail(email);
  if (!user) return { ok: false, reason: "no_user" };
  if (password !== DEMO_PASSWORD) return { ok: false, reason: "bad_password" };
  try {
    window.localStorage.setItem(SESSION_KEY, user.id);
    // The active user (greeting, task filters, etc.) follows the session.
    window.localStorage.setItem(ACTIVE_USER_KEY, user.id);
  } catch {
    // private-mode — session won't persist but the in-memory switch still works
  }
  return { ok: true, user };
}

/** Log in directly as a known user id (quick-login buttons). */
export function loginAsUser(userId: string): MockUser | null {
  const user = allKnownUsers().find((u) => u.id === userId);
  if (!user) return null;
  try {
    window.localStorage.setItem(SESSION_KEY, user.id);
    window.localStorage.setItem(ACTIVE_USER_KEY, user.id);
  } catch { /* ignore */ }
  return user;
}

export function logout(): void {
  try {
    window.localStorage.removeItem(SESSION_KEY);
    window.localStorage.removeItem(ACTIVE_USER_KEY);
  } catch { /* ignore */ }
}

export function getSessionUserId(): string | null {
  try {
    return window.localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}
