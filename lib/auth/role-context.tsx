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
  //   1. The /accept-invite flow can pre-select the newly invited user
  //      before redirecting here.
  //   2. A manual role switch survives a page reload (previously a
  //      reload always snapped back to u1, which made the topbar's
  //      role-switcher feel broken).
  //   3. An invited user (created post-build via /accept-invite) gets
  //      re-injected into mockUsers after a hard refresh, so they
  //      remain visible in the team page and role switcher.
  // SSR-safety: useEffect only runs in the browser, so window is defined.
  useEffect(() => {
    try {
      // Re-inject the invited user payload if it's not already in
      // mockUsers — handles the case where the user accepted an invite,
      // then later did a hard reload and lost the in-memory push.
      const payloadRaw = window.localStorage.getItem("pmo_invited_user_payload");
      if (payloadRaw) {
        const payload = JSON.parse(payloadRaw) as MockUser;
        if (payload?.id && !mockUsers.some((u) => u.id === payload.id)) {
          mockUsers.push(payload);
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
