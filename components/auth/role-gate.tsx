"use client";
import { useRole } from "@/lib/auth/role-context";
import type { ReactNode } from "react";

/**
 * Only renders children if the current role has the specified permission.
 * Usage: <RoleGate permission="manage_team">...</RoleGate>
 * Or:    <RoleGate role="admin">...</RoleGate>
 */
export function RoleGate({
  permission,
  role: requiredRole,
  children,
  fallback,
}: {
  permission?: string;
  role?: string;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { can, role } = useRole();

  if (requiredRole && role !== requiredRole) return <>{fallback}</> || null;
  if (permission && !can(permission)) return <>{fallback}</> || null;

  return <>{children}</>;
}

/**
 * Shows the current user info from context (for server-page integration).
 */
export function CurrentUserBanner({ locale }: { locale: string }) {
  const { currentUser, role } = useRole();
  const isHe = locale === "he";

  return (
    <div className="text-xs text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-md flex items-center gap-2">
      <span>{isHe ? "מחובר כ:" : "Logged in as:"}</span>
      <span className="font-semibold">{currentUser.name}</span>
      <span className="text-[10px] bg-background px-1.5 py-0.5 rounded">{role}</span>
    </div>
  );
}
