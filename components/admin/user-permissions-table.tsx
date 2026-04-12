"use client";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Check, X, Crown, Shield, User, Eye, UserX, Info } from "lucide-react";
import { mockUsers } from "@/lib/db/mock-data";
import { ROLE_LABELS } from "@/lib/rbac/abilities";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/db/types";

// ============================================
// Permission keys - same as roles-manager.tsx
// ============================================
const PERMISSIONS = [
  { key: "view_all", labelHe: "צפייה בכל הנתונים", labelEn: "View All" },
  { key: "create_task", labelHe: "יצירת משימות", labelEn: "Create Task" },
  { key: "edit_task", labelHe: "עריכת משימות", labelEn: "Edit Task" },
  { key: "delete_task", labelHe: "מחיקת משימות", labelEn: "Delete Task" },
  { key: "create_project", labelHe: "יצירת פרויקטים", labelEn: "Create Project" },
  { key: "delete_project", labelHe: "מחיקת פרויקטים", labelEn: "Delete Project" },
  { key: "manage_team", labelHe: "ניהול צוות", labelEn: "Manage Team" },
  { key: "manage_roles", labelHe: "ניהול תפקידים", labelEn: "Manage Roles" },
  { key: "manage_settings", labelHe: "הגדרות מערכת", labelEn: "Settings" },
  { key: "view_reports", labelHe: "דוחות", labelEn: "Reports" },
  { key: "manage_automations", labelHe: "אוטומציות", labelEn: "Automations" },
  { key: "ai_access", labelHe: "גישה ל-AI", labelEn: "AI Access" },
] as const;

// ============================================
// Per-role permission sets
// ============================================
const ROLE_PERMISSIONS: Record<UserRole, Set<string>> = {
  admin: new Set(PERMISSIONS.map((p) => p.key)),
  manager: new Set([
    "view_all", "create_task", "edit_task", "delete_task",
    "create_project", "view_reports", "manage_automations", "ai_access",
  ]),
  member: new Set(["view_all", "create_task", "edit_task", "view_reports", "ai_access"]),
  viewer: new Set(["view_all", "view_reports"]),
  guest: new Set([]),
};

// ============================================
// CEO (u6) override - same as manager but explicitly
// noted: no user management (manage_team / manage_roles)
// ============================================
const CEO_USER_ID = "u6";

function getUserPermissions(userId: string, role: UserRole): Set<string> {
  // CEO gets exactly the manager set - no extra overrides needed
  // The distinction is documented in the notes column
  return ROLE_PERMISSIONS[role] ?? new Set();
}

// ============================================
// Role styling
// ============================================
const ROLE_ICONS: Record<UserRole, typeof Crown> = {
  admin: Crown,
  manager: Shield,
  member: User,
  viewer: Eye,
  guest: UserX,
};

const ROLE_BADGE_COLORS: Record<UserRole, string> = {
  admin: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
  manager: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
  member: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  viewer: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  guest: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

// ============================================
// Component
// ============================================
export function UserPermissionsTable({ locale }: { locale: string }) {
  const isHe = locale === "he";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Info className="size-4" />
        {isHe
          ? "טבלה זו מציגה את מטריצת ההרשאות בפועל עבור כל משתמש במערכת."
          : "This table shows the actual permissions matrix for every user in the system."}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="sticky start-0 z-10 bg-muted/50 px-4 py-3 text-start font-semibold min-w-[200px]">
                {isHe ? "משתמש" : "User"}
              </th>
              <th className="px-3 py-3 text-start font-semibold min-w-[110px]">
                {isHe ? "תפקיד" : "Role"}
              </th>
              {PERMISSIONS.map((p) => (
                <th
                  key={p.key}
                  className="px-2 py-3 text-center font-medium min-w-[80px] text-xs"
                  title={isHe ? p.labelHe : p.labelEn}
                >
                  <span className="block truncate max-w-[80px]">
                    {isHe ? p.labelHe : p.labelEn}
                  </span>
                </th>
              ))}
              <th className="px-3 py-3 text-start font-semibold min-w-[160px]">
                {isHe ? "הערות" : "Notes"}
              </th>
            </tr>
          </thead>
          <tbody>
            {mockUsers.map((user, idx) => {
              const perms = getUserPermissions(user.id, user.role as UserRole);
              const RoleIcon = ROLE_ICONS[user.role as UserRole] ?? User;
              const isCeo = user.id === CEO_USER_ID;

              return (
                <tr
                  key={user.id}
                  className={cn(
                    "border-t transition-colors hover:bg-muted/30",
                    idx % 2 === 0 ? "bg-background" : "bg-muted/10",
                    isCeo && "bg-violet-50/50 dark:bg-violet-950/10"
                  )}
                >
                  {/* User cell */}
                  <td className="sticky start-0 z-10 bg-inherit px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar src={user.image} fallback={user.name[0]} className="size-8" />
                      <div>
                        <div className="font-medium leading-tight">{user.name}</div>
                      </div>
                    </div>
                  </td>

                  {/* Role badge */}
                  <td className="px-3 py-3">
                    <Badge
                      variant="secondary"
                      className={cn("gap-1 text-xs", ROLE_BADGE_COLORS[user.role as UserRole])}
                    >
                      <RoleIcon className="size-3" />
                      {ROLE_LABELS[user.role as UserRole]?.[locale] ?? user.role}
                    </Badge>
                  </td>

                  {/* Permission cells */}
                  {PERMISSIONS.map((p) => {
                    const has = perms.has(p.key);
                    return (
                      <td key={p.key} className="px-2 py-3 text-center">
                        {has ? (
                          <Check className="size-4 text-emerald-600 dark:text-emerald-400 mx-auto" />
                        ) : (
                          <X className="size-4 text-red-400 dark:text-red-500/60 mx-auto" />
                        )}
                      </td>
                    );
                  })}

                  {/* Notes */}
                  <td className="px-3 py-3 text-xs text-muted-foreground">
                    {isCeo && (
                      <span className="text-violet-600 dark:text-violet-400 font-medium">
                        {isHe
                          ? "מנכ\"ל - ללא ניהול משתמשים"
                          : "CEO - no user management"}
                      </span>
                    )}
                    {(user.role as UserRole) === "admin" && !isCeo && (
                      <span className="text-red-600 dark:text-red-400 font-medium">
                        {isHe ? "הרשאות מלאות" : "Full access"}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-2">
        <span className="flex items-center gap-1">
          <Check className="size-3.5 text-emerald-600" />
          {isHe ? "= הרשאה פעילה" : "= Permission granted"}
        </span>
        <span className="flex items-center gap-1">
          <X className="size-3.5 text-red-400" />
          {isHe ? "= ללא הרשאה" : "= No permission"}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-full bg-violet-400" />
          {isHe ? "= שורת מנכ\"ל מודגשת" : "= CEO row highlighted"}
        </span>
      </div>
    </div>
  );
}
