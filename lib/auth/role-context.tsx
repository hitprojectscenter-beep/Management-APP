"use client";
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { mockUsers, type MockUser } from "@/lib/db/mock-data";
import type { UserRole } from "@/lib/db/types";

/**
 * localStorage key for the active-user-id. The invite acceptance flow
 * writes here so that after a new member clicks the invite link, the
 * next page load picks them up as the active user instead of always
 * defaulting to u1 (Mark). The role switcher in the topbar also
 * writes here so a manual switch survives a reload.
 */
const ACTIVE_USER_KEY = "pmo_active_user_id";
const ADDED_USERS_KEY = "pmo_added_users";

/**
 * Decode the base64url ?invite= token the invite email links to. Mirrors
 * buildInviteToken in app/api/team/invite/route.ts. atob yields a binary
 * string, so we re-decode the bytes as UTF-8 — otherwise Hebrew names
 * come back as mojibake.
 */
function decodeInviteToken(token: string): MockUser | null {
  try {
    const b64 = token.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const json = new TextDecoder("utf-8").decode(bytes);
    const p = JSON.parse(json);
    if (typeof p?.uid !== "string" || typeof p?.name !== "string") return null;
    return {
      id: p.uid,
      name: p.name,
      email: p.email || "",
      phone: p.phone,
      title: p.title,
      image: p.image || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(p.name)}`,
      locale: p.locale === "en" ? "en" : "he",
      role: (p.role as UserRole) || "member",
      skills: [],
      performanceScore: 80,
      hourlyCapacity: 40,
    };
  } catch {
    return null;
  }
}

interface RoleContextType {
  /** Currently active user */
  currentUser: MockUser;
  /** Switch to a different user (by ID) */
  switchUser: (userId: string) => void;
  /** Convenience: current role */
  role: UserRole;
  /** Check if current role has a specific permission */
  can: (permission: string) => boolean;
}

// Permission matrix
const ROLE_PERMISSIONS: Record<UserRole, Set<string>> = {
  admin: new Set([
    "view_all", "create_task", "edit_task", "delete_task",
    "create_project", "delete_project", "manage_team", "manage_roles",
    "manage_settings", "view_reports", "manage_automations", "ai_access",
  ]),
  manager: new Set([
    "view_all", "create_task", "edit_task", "delete_task",
    "create_project", "view_reports", "manage_automations", "ai_access",
  ]),
  member: new Set(["view_all", "create_task", "edit_task", "view_reports", "ai_access"]),
  viewer: new Set(["view_all", "view_reports"]),
  guest: new Set([]),
};

const RoleContext = createContext<RoleContextType | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState("u1"); // default: admin

  // Hydrate from localStorage on mount so that:
  //   1. A manual role switch in the topbar survives a page reload.
  //   2. Members added via the invite dialog get re-injected into
  //      mockUsers — the server-side mockUsers wipes on Vercel cold
  //      starts, so the operator's localStorage is the only durable
  //      record of who they've added.
  // SSR-safety: useEffect only runs in the browser, so window is defined.
  useEffect(() => {
    try {
      // Re-inject any members added via the dialog. Stored as an array
      // (pmo_added_users) so multiple invites in a session accumulate
      // instead of overwriting each other.
      const addedRaw = window.localStorage.getItem(ADDED_USERS_KEY);
      if (addedRaw) {
        const list = JSON.parse(addedRaw) as MockUser[];
        for (const u of list) {
          if (u?.id && !mockUsers.some((m) => m.id === u.id)) {
            mockUsers.push(u);
          }
        }
      }

      // ?invite=<token> — recipient opened the invite email link. Decode
      // the member, register them, persist them, and make them the active
      // user so they enter the app as THEMSELVES (not as the default u1).
      // Then strip the param from the URL so a refresh doesn't re-run it.
      const params = new URLSearchParams(window.location.search);
      const inviteToken = params.get("invite");
      if (inviteToken) {
        const invited = decodeInviteToken(inviteToken);
        if (invited) {
          if (!mockUsers.some((u) => u.id === invited.id)) mockUsers.push(invited);
          // Persist to the added-users array so they survive future loads
          // and show on /team.
          try {
            const raw = window.localStorage.getItem(ADDED_USERS_KEY);
            const list: MockUser[] = raw ? JSON.parse(raw) : [];
            if (!list.some((u) => u.id === invited.id)) {
              list.push(invited);
              window.localStorage.setItem(ADDED_USERS_KEY, JSON.stringify(list));
            }
          } catch { /* ignore */ }
          window.localStorage.setItem(ACTIVE_USER_KEY, invited.id);
          setUserId(invited.id);
          // Clean the URL: drop ?invite= but keep the rest of the path.
          params.delete("invite");
          const clean = window.location.pathname + (params.toString() ? `?${params}` : "");
          window.history.replaceState({}, "", clean);
          return; // invite wins over any stored active-user
        }
      }

      const stored = window.localStorage.getItem(ACTIVE_USER_KEY);
      if (stored && mockUsers.some((u) => u.id === stored)) {
        setUserId(stored);
      }
    } catch {
      // Private-browsing/Safari edge-cases throw on localStorage access.
      // Falling back to the default u1 is the right behavior here.
    }
  }, []);

  const currentUser = mockUsers.find((u) => u.id === userId) || mockUsers[0];
  const role = currentUser.role;
  const perms = ROLE_PERMISSIONS[role] || new Set();

  const switchUser = useCallback((id: string) => {
    setUserId(id);
    try {
      window.localStorage.setItem(ACTIVE_USER_KEY, id);
    } catch {
      // ignore — see hydrate-effect comment above
    }
  }, []);

  const can = useCallback((permission: string) => {
    return perms.has(permission);
  }, [perms]);

  return (
    <RoleContext.Provider value={{ currentUser, switchUser, role, can }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
}
