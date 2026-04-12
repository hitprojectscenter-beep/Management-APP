"use client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, Crown, Shield, User, Eye, UserX, Plus, Info } from "lucide-react";
import { ROLE_LABELS } from "@/lib/rbac/abilities";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/db/types";

const ROLE_ICONS: Record<UserRole, typeof Crown> = {
  admin: Crown,
  manager: Shield,
  member: User,
  viewer: Eye,
  guest: UserX,
};

const ROLE_COLORS: Record<UserRole, string> = {
  admin: "from-red-500 to-rose-600",
  manager: "from-blue-500 to-indigo-600",
  member: "from-emerald-500 to-teal-600",
  viewer: "from-amber-500 to-orange-600",
  guest: "from-slate-400 to-slate-600",
};

const PERMISSIONS = [
  { key: "view_all", labelHe: "צפייה בכל הנתונים", labelEn: "View all data" },
  { key: "create_task", labelHe: "יצירת משימות", labelEn: "Create tasks" },
  { key: "edit_task", labelHe: "עריכת משימות", labelEn: "Edit tasks" },
  { key: "delete_task", labelHe: "מחיקת משימות", labelEn: "Delete tasks" },
  { key: "create_project", labelHe: "יצירת פרויקטים", labelEn: "Create projects" },
  { key: "delete_project", labelHe: "מחיקת פרויקטים", labelEn: "Delete projects" },
  { key: "manage_team", labelHe: "ניהול חברי צוות", labelEn: "Manage team members" },
  { key: "manage_roles", labelHe: "ניהול תפקידים", labelEn: "Manage roles" },
  { key: "manage_settings", labelHe: "ניהול הגדרות מערכת", labelEn: "Manage system settings" },
  { key: "view_reports", labelHe: "צפייה בדוחות", labelEn: "View reports" },
  { key: "manage_automations", labelHe: "ניהול אוטומציות", labelEn: "Manage automations" },
  { key: "ai_access", labelHe: "גישה ל-AI", labelEn: "AI access" },
] as const;

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

export function RolesManager({ locale }: { locale: string }) {
  const isHe = locale === "he";
  const roles: UserRole[] = ["admin", "manager", "member", "viewer", "guest"];

  return (
    <div className="space-y-6">
      {/* Role cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {roles.map((role) => {
          const Icon = ROLE_ICONS[role];
          const permCount = ROLE_PERMISSIONS[role].size;
          return (
            <Card key={role} className="overflow-hidden">
              <div className={cn("h-1.5 bg-gradient-to-r", ROLE_COLORS[role])} />
              <CardContent className="p-4 text-center">
                <div className={cn("size-12 rounded-full bg-gradient-to-br mx-auto mb-2 flex items-center justify-center", ROLE_COLORS[role])}>
                  <Icon className="size-6 text-white" />
                </div>
                <div className="font-semibold text-sm">{ROLE_LABELS[role][locale]}</div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  {permCount} {isHe ? "הרשאות" : "permissions"}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Permissions matrix */}
      <Card>
        <div className="p-4 border-b bg-muted/30">
          <h3 className="font-semibold flex items-center gap-2">
            <Info className="size-4 text-blue-500" />
            {isHe ? "מטריצת הרשאות מלאה" : "Full Permissions Matrix"}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {isHe
              ? "כל תא מציג האם התפקיד יכול לבצע את הפעולה. ירוק = מאופשר, אפור = חסום."
              : "Each cell shows whether the role can perform the action. Green = allowed, gray = blocked."}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs">
              <tr>
                <th className="text-start px-4 py-3 font-medium sticky start-0 bg-muted/30">
                  {isHe ? "הרשאה" : "Permission"}
                </th>
                {roles.map((role) => {
                  const Icon = ROLE_ICONS[role];
                  return (
                    <th key={role} className="px-3 py-3 text-center font-medium">
                      <div className="flex flex-col items-center gap-1">
                        <Icon className="size-4" />
                        <span className="text-[10px] whitespace-nowrap">
                          {ROLE_LABELS[role][locale]}
                        </span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.map((perm) => (
                <tr key={perm.key} className="border-t hover:bg-accent/20">
                  <td className="px-4 py-3 font-medium sticky start-0 bg-background">
                    {isHe ? perm.labelHe : perm.labelEn}
                  </td>
                  {roles.map((role) => {
                    const allowed = ROLE_PERMISSIONS[role].has(perm.key);
                    return (
                      <td key={role} className="px-3 py-3 text-center">
                        {allowed ? (
                          <div className="size-6 rounded-full bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center mx-auto">
                            <Check className="size-3.5 text-emerald-600" />
                          </div>
                        ) : (
                          <div className="size-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto">
                            <X className="size-3.5 text-slate-400" />
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button variant="outline">
          <Plus className="size-4" />
          {isHe ? "צור תפקיד מותאם" : "Create Custom Role"}
        </Button>
      </div>
    </div>
  );
}
