"use client";
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { mockUsers, type MockUser } from "@/lib/db/mock-data";
import type { UserRole } from "@/lib/db/types";

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

  const currentUser = mockUsers.find((u) => u.id === userId) || mockUsers[0];
  const role = currentUser.role;
  const perms = ROLE_PERMISSIONS[role] || new Set();

  const switchUser = useCallback((id: string) => {
    setUserId(id);
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
