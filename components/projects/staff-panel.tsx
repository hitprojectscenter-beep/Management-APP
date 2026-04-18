"use client";

import { useState } from "react";
import {
  mockUsers,
  mockProjectMembers,
  mockWbsNodes,
  type MockProjectMember,
} from "@/lib/db/mock-data";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { txt } from "@/lib/utils/locale-text";
import { toast } from "sonner";
import { Users, UserPlus, Trash2, Edit, Percent } from "lucide-react";
import { formatDate } from "@/lib/utils";

// ============================================
// Role category classification for badges
// ============================================
type RoleCategory = "pm" | "developer" | "qa" | "admin" | "other";

const ROLE_CATEGORY_COLORS: Record<RoleCategory, string> = {
  pm: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  developer: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  qa: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  admin: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
  other: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

function classifyRole(role: string): RoleCategory {
  const lower = role.toLowerCase();
  if (
    lower.includes("pm") ||
    lower.includes("מנהל פרויקט") ||
    lower.includes("מנהל פרוגרמ") ||
    lower.includes("manager") ||
    lower.includes("program") ||
    lower.includes("project") ||
    lower.includes("תכניות") ||
    lower.includes("פיקוח") ||
    lower.includes("oversight") ||
    lower.includes("plans")
  ) {
    return "pm";
  }
  if (
    lower.includes("developer") ||
    lower.includes("מפתח") ||
    lower.includes("פיתוח") ||
    lower.includes("dev") ||
    lower.includes("technical") ||
    lower.includes("טכני")
  ) {
    return "developer";
  }
  if (
    lower.includes("qa") ||
    lower.includes("בדיקות") ||
    lower.includes("test") ||
    lower.includes("quality")
  ) {
    return "qa";
  }
  if (
    lower.includes("admin") ||
    lower.includes("מנהל מערכת") ||
    lower.includes("חסות") ||
    lower.includes("sponsor") ||
    lower.includes("מנכ") ||
    lower.includes("ceo")
  ) {
    return "admin";
  }
  return "other";
}

// ============================================
// Bilingual labels
// ============================================
const LABELS = {
  title: { he: "צוות הפרויקט", en: "Project Staff" },
  addStaff: { he: "הוסף חבר צוות", en: "Add Staff" },
  removeStaff: { he: "הסר", en: "Remove" },
  removeConfirm: { he: "חבר הצוות הוסר בהצלחה", en: "Staff member removed" },
  addSuccess: { he: "חבר צוות חדש נוסף", en: "New staff member added" },
  editSuccess: { he: "פרטי חבר הצוות עודכנו", en: "Staff details updated" },
  name: { he: "שם", en: "Name" },
  role: { he: "תפקיד בפרויקט", en: "Role in Project" },
  fte: { he: "% משרה", en: "FTE %" },
  joinDate: { he: "תאריך הצטרפות", en: "Join Date" },
  selectUser: { he: "בחר משתמש", en: "Select User" },
  roleInProject: { he: "תפקיד בפרויקט", en: "Role in Project" },
  ftePercent: { he: "אחוז משרה (FTE)", en: "FTE Percentage" },
  cancel: { he: "ביטול", en: "Cancel" },
  save: { he: "שמור", en: "Save" },
  add: { he: "הוסף", en: "Add" },
  noStaff: { he: "אין חברי צוות משויכים לפרויקט זה", en: "No staff assigned to this project" },
  confirmRemove: { he: "האם להסיר את חבר הצוות?", en: "Remove this staff member?" },
  members: { he: "חברי צוות", en: "members" },
  editRole: { he: "עריכת תפקיד", en: "Edit Role" },
};

// ============================================
// Helpers
// ============================================
function getDescendantNodeIds(projectId: string): Set<string> {
  const ids = new Set<string>([projectId]);
  let queue = [projectId];
  while (queue.length > 0) {
    const next: string[] = [];
    for (const id of queue) {
      const children = mockWbsNodes.filter((n) => n.parentId === id).map((n) => n.id);
      children.forEach((c) => {
        ids.add(c);
        next.push(c);
      });
    }
    queue = next;
  }
  return ids;
}

// ============================================
// Component
// ============================================
export function StaffPanel({ projectId, locale }: { projectId: string; locale: string }) {
  const nodeIds = getDescendantNodeIds(projectId);

  // Local state seeded from mock data
  const [members, setMembers] = useState<MockProjectMember[]>(() =>
    mockProjectMembers.filter((m) => nodeIds.has(m.wbsNodeId))
  );

  // Add dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [newUserId, setNewUserId] = useState("");
  const [newRole, setNewRole] = useState("");
  const [newFte, setNewFte] = useState(50);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState("");
  const [editFte, setEditFte] = useState(0);

  // Resolve user from userId
  const getUser = (userId: string) => mockUsers.find((u) => u.id === userId);

  // Users not yet assigned
  const assignedUserIds = new Set(members.map((m) => m.userId));
  const availableUsers = mockUsers.filter((u) => !assignedUserIds.has(u.id));

  // ---- Handlers ----
  const handleAdd = () => {
    if (!newUserId || !newRole) return;
    const member: MockProjectMember = {
      id: `pm-new-${Date.now()}`,
      wbsNodeId: projectId,
      userId: newUserId,
      roleInProject: newRole,
      ftePercent: Math.max(1, Math.min(100, newFte)),
      joinedAt: new Date().toISOString().split("T")[0],
    };
    setMembers((prev) => [...prev, member]);
    toast.success(txt(locale, LABELS.addSuccess));
    setAddOpen(false);
    setNewUserId("");
    setNewRole("");
    setNewFte(50);
  };

  const handleRemove = (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
    toast.success(txt(locale, LABELS.removeConfirm));
  };

  const startEdit = (member: MockProjectMember) => {
    setEditingId(member.id);
    setEditRole(member.roleInProject);
    setEditFte(member.ftePercent);
  };

  const saveEdit = (id: string) => {
    setMembers((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, roleInProject: editRole, ftePercent: Math.max(1, Math.min(100, editFte)) } : m
      )
    );
    setEditingId(null);
    toast.success(txt(locale, LABELS.editSuccess));
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <div className="flex items-center gap-2">
          <Users className="size-5 text-blue-600" />
          <CardTitle className="text-base">
            {txt(locale, LABELS.title)}{" "}
            <span className="text-muted-foreground font-normal text-sm">
              ({members.length} {txt(locale, LABELS.members)})
            </span>
          </CardTitle>
        </div>

        {/* Add Staff Dialog */}
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <UserPlus className="size-4" />
              <span className="hidden sm:inline">{txt(locale, LABELS.addStaff)}</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{txt(locale, LABELS.addStaff)}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-2">
              {/* User selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">{txt(locale, LABELS.selectUser)}</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  value={newUserId}
                  onChange={(e) => setNewUserId(e.target.value)}
                >
                  <option value="">--</option>
                  {availableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Role in project */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">{txt(locale, LABELS.roleInProject)}</label>
                <Input
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  placeholder={txt(locale, LABELS.roleInProject)}
                />
              </div>

              {/* FTE % */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">{txt(locale, LABELS.ftePercent)}</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={newFte}
                    onChange={(e) => setNewFte(Number(e.target.value))}
                    className="w-24"
                  />
                  <Percent className="size-4 text-muted-foreground" />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>
                {txt(locale, LABELS.cancel)}
              </Button>
              <Button onClick={handleAdd} disabled={!newUserId || !newRole}>
                {txt(locale, LABELS.add)}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            {txt(locale, LABELS.noStaff)}
          </p>
        ) : (
          <div className="space-y-2">
            {members.map((member) => {
              const user = getUser(member.userId);
              if (!user) return null;
              const category = classifyRole(member.roleInProject);
              const isEditing = editingId === member.id;

              return (
                <div
                  key={member.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 rounded-lg border bg-card hover:bg-muted/40 transition-colors"
                >
                  {/* Avatar + Name */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Avatar src={user.image} fallback={user.name[0]} className="size-9 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{user.name}</p>
                      {isEditing ? (
                        <Input
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value)}
                          className="mt-1 h-7 text-xs"
                        />
                      ) : (
                        <Badge
                          className={`mt-0.5 text-[10px] font-medium border-0 ${ROLE_CATEGORY_COLORS[category]}`}
                        >
                          {locale !== "en" ? member.roleInProject : member.roleInProjectEn || member.roleInProject}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* FTE */}
                  <div className="flex items-center gap-2 text-sm shrink-0">
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          value={editFte}
                          onChange={(e) => setEditFte(Number(e.target.value))}
                          className="w-16 h-7 text-xs"
                        />
                        <Percent className="size-3 text-muted-foreground" />
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {member.ftePercent}% {txt(locale, LABELS.fte)}
                      </span>
                    )}
                  </div>

                  {/* Join date */}
                  <div className="text-xs text-muted-foreground shrink-0 hidden md:block">
                    {formatDate(member.joinedAt, locale)}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0 ms-auto sm:ms-0">
                    {isEditing ? (
                      <>
                        <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={cancelEdit}>
                          {txt(locale, LABELS.cancel)}
                        </Button>
                        <Button size="sm" className="h-7 text-xs px-2" onClick={() => saveEdit(member.id)}>
                          {txt(locale, LABELS.save)}
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          title={txt(locale, LABELS.editRole)}
                          onClick={() => startEdit(member)}
                        >
                          <Edit className="size-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                          title={txt(locale, LABELS.removeStaff)}
                          onClick={() => handleRemove(member.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
