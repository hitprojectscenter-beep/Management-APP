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
      const addedRaw = window.localStorage.getItem("pmo_added_users");
      if (addedRaw) {
        const list = JSON.parse(addedRaw) as MockUser[];
        for (const u of list) {
          if (u?.id && !mockUsers.some((m) => m.id === u.id)) {
            mockUsers.push(u);
          }
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
