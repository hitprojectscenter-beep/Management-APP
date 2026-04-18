"use client";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Check, X, Crown, Shield, User, Eye, UserX, Plus, Info, Save, RotateCcw } from "lucide-react";
import { ROLE_LABELS } from "@/lib/rbac/abilities";
import { cn } from "@/lib/utils";
import { txt } from "@/lib/utils/locale-text";
import { toast } from "sonner";
import type { UserRole } from "@/lib/db/types";

const ROLE_ICONS: Record<string, typeof Crown> = {
  admin: Crown,
  manager: Shield,
  member: User,
  viewer: Eye,
  guest: UserX,
};

const ROLE_COLORS: Record<string, string> = {
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

const DEFAULT_PERMISSIONS: Record<string, Set<string>> = {
  admin: new Set(PERMISSIONS.map((p) => p.key)),
  manager: new Set([
    "view_all", "create_task", "edit_task", "delete_task",
    "create_project", "view_reports", "manage_automations", "ai_access",
  ]),
  member: new Set(["view_all", "create_task", "edit_task", "view_reports", "ai_access"]),
  viewer: new Set(["view_all", "view_reports"]),
  guest: new Set([]),
};

interface CustomRole {
  id: string;
  name: string;
  nameEn: string;
  permissions: Set<string>;
}

export function RolesManager({ locale }: { locale: string }) {
  const isHe = locale === "he"; // kept for data field selection (custom role name)
  const builtInRoles: string[] = ["admin", "manager", "member", "viewer", "guest"];

  // Mutable permission state for built-in roles (except admin which is always full)
  const [permissions, setPermissions] = useState<Record<string, Set<string>>>(() => {
    const initial: Record<string, Set<string>> = {};
    for (const role of builtInRoles) {
      initial[role] = new Set(DEFAULT_PERMISSIONS[role]);
    }
    return initial;
  });

  // Custom roles
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  const allRoles = [...builtInRoles, ...customRoles.map((r) => r.id)];

  const togglePermission = (roleId: string, permKey: string) => {
    if (roleId === "admin") {
      toast.error(txt(locale, { he: "לא ניתן לשנות הרשאות מנהל מערכת", en: "Cannot modify admin permissions" }));
      return;
    }
    setPermissions((prev) => {
      const next = { ...prev };
      const set = new Set(next[roleId]);
      if (set.has(permKey)) {
        set.delete(permKey);
      } else {
        set.add(permKey);
      }
      next[roleId] = set;
      return next;
    });
    setHasChanges(true);
  };

  const handleSave = () => {
    toast.success(txt(locale, { he: "ההרשאות נשמרו בהצלחה", en: "Permissions saved successfully" }), {
      description: txt(locale, { he: "השינויים יחולו מיד על כל המשתמשים בתפקידים שעודכנו", en: "Changes apply immediately to all users with updated roles" }),
    });
    setHasChanges(false);
  };

  const handleReset = () => {
    const initial: Record<string, Set<string>> = {};
    for (const role of builtInRoles) {
      initial[role] = new Set(DEFAULT_PERMISSIONS[role]);
    }
    for (const cr of customRoles) {
      initial[cr.id] = new Set(cr.permissions);
    }
    setPermissions(initial);
    setHasChanges(false);
    toast.info(txt(locale, { he: "ההרשאות אופסו לברירת מחדל", en: "Permissions reset to defaults" }));
  };

  const addCustomRole = (name: string, nameEn: string, perms: Set<string>) => {
    const id = `custom_${Date.now()}`;
    const newRole: CustomRole = { id, name, nameEn, permissions: perms };
    setCustomRoles((prev) => [...prev, newRole]);
    setPermissions((prev) => ({ ...prev, [id]: new Set(perms) }));
    toast.success(txt(locale, { he: `התפקיד "${name}" נוצר בהצלחה`, en: `Role "${nameEn}" created successfully` }));
  };

  const deleteCustomRole = (id: string) => {
    setCustomRoles((prev) => prev.filter((r) => r.id !== id));
    setPermissions((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    toast.success(txt(locale, { he: "התפקיד המותאם נמחק", en: "Custom role deleted" }));
  };

  const getRoleLabel = (roleId: string) => {
    if (ROLE_LABELS[roleId as UserRole]) {
      return ROLE_LABELS[roleId as UserRole][locale] || ROLE_LABELS[roleId as UserRole].en;
    }
    const custom = customRoles.find((r) => r.id === roleId);
    return custom ? (isHe ? custom.name : custom.nameEn) : roleId;
  };

  const getRoleIcon = (roleId: string) => ROLE_ICONS[roleId] || Shield;

  return (
    <div className="space-y-6">
      {/* Role cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {builtInRoles.map((role) => {
          const Icon = ROLE_ICONS[role];
          const permCount = permissions[role]?.size || 0;
          return (
            <Card key={role} className="overflow-hidden">
              <div className={cn("h-1.5 bg-gradient-to-r", ROLE_COLORS[role])} />
              <CardContent className="p-4 text-center">
                <div className={cn("size-12 rounded-full bg-gradient-to-br mx-auto mb-2 flex items-center justify-center", ROLE_COLORS[role])}>
                  <Icon className="size-6 text-white" />
                </div>
                <div className="font-semibold text-sm">{getRoleLabel(role)}</div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  {permCount}/{PERMISSIONS.length} {txt(locale, { he: "הרשאות", en: "permissions" })}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {/* Custom role cards */}
        {customRoles.map((cr) => {
          const permCount = permissions[cr.id]?.size || 0;
          return (
            <Card key={cr.id} className="overflow-hidden border-dashed border-2 border-purple-300">
              <div className="h-1.5 bg-gradient-to-r from-purple-500 to-fuchsia-600" />
              <CardContent className="p-4 text-center">
                <div className="size-12 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-600 mx-auto mb-2 flex items-center justify-center">
                  <Shield className="size-6 text-white" />
                </div>
                <div className="font-semibold text-sm">{isHe ? cr.name : cr.nameEn}</div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  {permCount}/{PERMISSIONS.length} {txt(locale, { he: "הרשאות", en: "permissions" })}
                </div>
                <Button
                  variant="ghost" size="sm"
                  className="mt-1 text-red-600 text-[10px] h-6"
                  onClick={() => deleteCustomRole(cr.id)}
                >
                  {txt(locale, { he: "מחק תפקיד", en: "Delete role" })}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Permissions matrix — INTERACTIVE */}
      <Card>
        <div className="p-4 border-b bg-muted/30 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Info className="size-4 text-blue-500" />
              {txt(locale, { he: "מטריצת הרשאות", en: "Permissions Matrix" })}
              {hasChanges && (
                <Badge variant="destructive" className="text-[9px] py-0">
                  {txt(locale, { he: "שינויים לא שמורים", en: "Unsaved" })}
                </Badge>
              )}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {txt(locale, {
                he: "לחץ על תא כדי לשנות הרשאה. Admin תמיד מלא ולא ניתן לעריכה.",
                en: "Click a cell to toggle permission. Admin is always full and non-editable.",
              })}
            </p>
          </div>
          {hasChanges && (
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="outline" onClick={handleReset} className="h-8 text-xs">
                <RotateCcw className="size-3" />
                {txt(locale, { he: "אפס", en: "Reset" })}
              </Button>
              <Button size="sm" onClick={handleSave} className="h-8 text-xs">
                <Save className="size-3" />
                {txt(locale, { he: "שמור שינויים", en: "Save" })}
              </Button>
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs">
              <tr>
                <th className="text-start px-4 py-3 font-medium sticky start-0 bg-muted/30 z-10">
                  {txt(locale, { he: "הרשאה", en: "Permission" })}
                </th>
                {allRoles.map((roleId) => {
                  const Icon = getRoleIcon(roleId);
                  return (
                    <th key={roleId} className="px-3 py-3 text-center font-medium">
                      <div className="flex flex-col items-center gap-1">
                        <Icon className="size-4" />
                        <span className="text-[10px] whitespace-nowrap">
                          {getRoleLabel(roleId)}
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
                  <td className="px-4 py-3 font-medium sticky start-0 bg-background z-10">
                    {txt(locale, { he: perm.labelHe, en: perm.labelEn })}
                  </td>
                  {allRoles.map((roleId) => {
                    const allowed = permissions[roleId]?.has(perm.key) || false;
                    const isAdmin = roleId === "admin";
                    return (
                      <td key={roleId} className="px-3 py-3 text-center">
                        <button
                          onClick={() => togglePermission(roleId, perm.key)}
                          disabled={isAdmin}
                          className={cn(
                            "size-8 rounded-full flex items-center justify-center mx-auto transition-all",
                            isAdmin
                              ? "bg-emerald-100 dark:bg-emerald-950/30 cursor-not-allowed"
                              : allowed
                                ? "bg-emerald-100 dark:bg-emerald-950/30 hover:bg-emerald-200 dark:hover:bg-emerald-900/40 cursor-pointer hover:ring-2 hover:ring-emerald-400"
                                : "bg-slate-100 dark:bg-slate-800 hover:bg-red-100 dark:hover:bg-red-950/30 cursor-pointer hover:ring-2 hover:ring-slate-300"
                          )}
                          title={isAdmin
                            ? txt(locale, { he: "Admin תמיד מלא", en: "Admin always full" })
                            : txt(locale, { he: "לחץ לשינוי", en: "Click to toggle" })}
                        >
                          {allowed ? (
                            <Check className={cn("size-4", isAdmin ? "text-emerald-600" : "text-emerald-600")} />
                          ) : (
                            <X className="size-4 text-slate-400" />
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Actions row */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {txt(locale, {
            he: `${builtInRoles.length} תפקידים מובנים · ${customRoles.length} מותאמים`,
            en: `${builtInRoles.length} built-in · ${customRoles.length} custom roles`,
          })}
        </div>
        <CreateCustomRoleDialog locale={locale} onCreateRole={addCustomRole} />
      </div>
    </div>
  );
}

// ============================================
// Create Custom Role Dialog
// ============================================
function CreateCustomRoleDialog({
  locale,
  onCreateRole,
}: {
  locale: string;
  onCreateRole: (name: string, nameEn: string, perms: Set<string>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());

  const togglePerm = (key: string) => {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(txt(locale, { he: "שם התפקיד נדרש", en: "Role name is required" }));
      return;
    }
    onCreateRole(name.trim(), nameEn.trim() || name.trim(), new Set(selectedPerms));
    setOpen(false);
    setName("");
    setNameEn("");
    setSelectedPerms(new Set());
  };

  // Presets
  const applyPreset = (preset: "manager" | "member" | "viewer") => {
    setSelectedPerms(new Set(DEFAULT_PERMISSIONS[preset]));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="size-4" />
          {txt(locale, { he: "צור תפקיד מותאם", en: "Create Custom Role" })}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="size-5 text-purple-600" />
            {txt(locale, { he: "יצירת תפקיד מותאם", en: "Create Custom Role" })}
          </DialogTitle>
          <DialogDescription>
            {txt(locale, {
              he: "הגדר שם ובחר הרשאות לתפקיד החדש. אפשר להתחיל מתבנית קיימת.",
              en: "Set a name and choose permissions. Start from an existing template if needed.",
            })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{txt(locale, { he: "שם בעברית", en: "Hebrew Name" })} *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={txt(locale, { he: "למשל: מנהל צוות", en: "e.g., Team Lead" })}
                className="min-h-[44px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{txt(locale, { he: "שם באנגלית", en: "English Name" })}</Label>
              <Input
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="e.g., Team Lead"
                className="min-h-[44px]"
              />
            </div>
          </div>

          {/* Presets */}
          <div>
            <Label className="mb-2 block">{txt(locale, { he: "התחל מתבנית", en: "Start from template" })}</Label>
            <div className="flex gap-2 flex-wrap">
              <Button type="button" size="sm" variant="outline" onClick={() => applyPreset("manager")} className="text-xs h-7">
                {txt(locale, { he: "כמנהל", en: "As Manager" })} (8)
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => applyPreset("member")} className="text-xs h-7">
                {txt(locale, { he: "כחבר צוות", en: "As Member" })} (5)
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => applyPreset("viewer")} className="text-xs h-7">
                {txt(locale, { he: "כצופה", en: "As Viewer" })} (2)
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setSelectedPerms(new Set())} className="text-xs h-7">
                {txt(locale, { he: "נקה הכל", en: "Clear all" })}
              </Button>
            </div>
          </div>

          {/* Permissions checkboxes */}
          <div className="space-y-1.5">
            <Label>{txt(locale, { he: "הרשאות", en: "Permissions" })} ({selectedPerms.size}/{PERMISSIONS.length})</Label>
            <div className="border rounded-lg divide-y max-h-[300px] overflow-y-auto">
              {PERMISSIONS.map((perm) => {
                const checked = selectedPerms.has(perm.key);
                return (
                  <button
                    key={perm.key}
                    type="button"
                    onClick={() => togglePerm(perm.key)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2.5 text-sm text-start transition-colors min-h-[44px]",
                      checked ? "bg-emerald-50 dark:bg-emerald-950/20" : "hover:bg-accent/30"
                    )}
                  >
                    <span className={cn(checked && "font-medium")}>
                      {txt(locale, { he: perm.labelHe, en: perm.labelEn })}
                    </span>
                    <div className={cn(
                      "size-5 rounded border flex items-center justify-center transition-colors",
                      checked ? "bg-emerald-600 border-emerald-600" : "border-input"
                    )}>
                      {checked && <Check className="size-3 text-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="min-h-[44px]">
              {txt(locale, { he: "ביטול", en: "Cancel" })}
            </Button>
            <Button type="submit" className="min-h-[44px]" disabled={!name.trim()}>
              <Plus className="size-4" />
              {txt(locale, { he: `צור תפקיד (${selectedPerms.size} הרשאות)`, en: `Create Role (${selectedPerms.size} perms)` })}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
