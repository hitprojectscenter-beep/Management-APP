"use client";
import { useState } from "react";
import type { MockProjectMember, MockUser } from "@/lib/db/mock-data";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Users, UserPlus, Briefcase, Percent } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { txt } from "@/lib/utils/locale-text";

const fteColor = (pct: number): string => {
  if (pct >= 80) return "text-emerald-600 bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300";
  if (pct >= 50) return "text-blue-600 bg-blue-100 dark:bg-blue-950/30 dark:text-blue-300";
  if (pct >= 25) return "text-amber-600 bg-amber-100 dark:bg-amber-950/30 dark:text-amber-300";
  return "text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300";
};

export function ProjectMembers({
  members,
  users,
  locale,
  title,
  variant = "card",
}: {
  members: MockProjectMember[];
  users: MockUser[];
  locale: string;
  title?: string;
  variant?: "card" | "compact";
}) {
  if (members.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          {txt(locale, { he: "אין משתתפים עדיין", en: "No members yet" })}
        </CardContent>
      </Card>
    );
  }

  const totalFte = members.reduce((sum, m) => sum + m.ftePercent, 0);

  if (variant === "compact") {
    return (
      <div className="space-y-2">
        {members.map((member) => {
          const user = users.find((u) => u.id === member.userId);
          if (!user) return null;
          return (
            <div key={member.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-accent">
              <Avatar src={user.image} fallback={user.name[0]} className="size-9 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{user.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {locale === "he" ? member.roleInProject : member.roleInProjectEn || member.roleInProject}
                </div>
              </div>
              <div className={cn("text-xs font-bold px-2 py-1 rounded-full", fteColor(member.ftePercent))}>
                {member.ftePercent}%
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="size-4" />
            {title || txt(locale, { he: "משתתפים", en: "Members" })}
            <span className="text-xs font-normal text-muted-foreground">
              ({members.length})
            </span>
          </CardTitle>
          <AddMemberDialog members={members} users={users} locale={locale} />
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {txt(locale, { he: "סך הקצאת משרה: ", en: "Total FTE allocation: " })}
          <span className="font-semibold text-foreground">{totalFte}%</span>
          {totalFte >= 100 && (
            <span className="ms-1 text-emerald-600">
              ({((totalFte / 100)).toFixed(1)} {txt(locale, { he: "משרות מלאות", en: "FTEs" })})
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {members.map((member) => {
          const user = users.find((u) => u.id === member.userId);
          if (!user) return null;
          return (
            <div
              key={member.id}
              className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/40 transition-colors"
            >
              <Avatar src={user.image} fallback={user.name[0]} className="size-11 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">{user.name}</div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                  <Briefcase className="size-3" />
                  {locale === "he" ? member.roleInProject : member.roleInProjectEn || member.roleInProject}
                </div>
              </div>
              <div className="text-end">
                <div className={cn("text-sm font-bold px-3 py-1 rounded-full inline-block", fteColor(member.ftePercent))}>
                  {member.ftePercent}%
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  {txt(locale, { he: "משרה", en: "FTE" })}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

/**
 * Add-member dialog that's used by the "הוסף" / "Add" button in the
 * ProjectMembers card header. In demo mode it shows a success toast and
 * closes — production would POST to /api/project-members and re-fetch.
 */
function AddMemberDialog({
  members,
  users,
  locale,
}: {
  members: MockProjectMember[];
  users: MockUser[];
  locale: string;
}) {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("");
  const [fte, setFte] = useState(20);

  const existingIds = new Set(members.map((m) => m.userId));
  const available = users.filter((u) => !existingIds.has(u.id));

  const handleAdd = () => {
    if (!userId) {
      toast.error(txt(locale, { he: "בחר משתמש", en: "Select a user" }));
      return;
    }
    if (!role.trim()) {
      toast.error(txt(locale, { he: "הזן תפקיד", en: "Enter a role" }));
      return;
    }
    const user = users.find((u) => u.id === userId);
    toast.success(
      txt(locale, {
        he: `${user?.name} נוסף/ה בהצלחה`,
        en: `${user?.name} added successfully`,
      }),
      {
        description: txt(locale, {
          he: `תפקיד: ${role} · משרה: ${fte}% · במצב הדגמה — בייצור יישמר ב-DB.`,
          en: `Role: ${role} · FTE: ${fte}% · Demo mode — production would persist to DB.`,
        }),
      }
    );
    setOpen(false);
    setUserId("");
    setRole("");
    setFte(20);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <UserPlus className="size-3" />
          {txt(locale, { he: "הוסף", en: "Add" })}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md w-[95vw] p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="size-5 text-primary" />
            {txt(locale, { he: "הוספת חבר צוות", en: "Add Team Member" })}
          </DialogTitle>
          <DialogDescription>
            {txt(locale, {
              he: "בחר משתמש, הגדר תפקיד באחוז משרה.",
              en: "Pick a user, set role and FTE %.",
            })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="add-mem-user">{txt(locale, { he: "משתמש", en: "User" })}</Label>
            <select
              id="add-mem-user"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[44px]"
            >
              <option value="">{txt(locale, { he: "-- בחר משתמש --", en: "-- Select user --" })}</option>
              {available.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            {available.length === 0 && (
              <p className="text-xs text-muted-foreground">
                {txt(locale, {
                  he: "כל המשתמשים כבר חברים בפרויקט.",
                  en: "All users are already members.",
                })}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="add-mem-role">{txt(locale, { he: "תפקיד בפרויקט", en: "Role in project" })}</Label>
            <Input
              id="add-mem-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder={txt(locale, { he: "לדוגמה: מפתח, אנליסט, מנהל פרויקט", en: "e.g. Developer, Analyst, PM" })}
              style={{ fontSize: "16px" }}
              className="min-h-[44px]"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="add-mem-fte">{txt(locale, { he: "אחוז משרה", en: "FTE %" })}</Label>
            <div className="flex items-center gap-2">
              <Input
                id="add-mem-fte"
                type="number"
                min={1}
                max={100}
                value={fte}
                onChange={(e) => setFte(Math.max(1, Math.min(100, Number(e.target.value) || 0)))}
                className="w-32 min-h-[44px]"
              />
              <Percent className="size-4 text-muted-foreground" />
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            {txt(locale, { he: "ביטול", en: "Cancel" })}
          </Button>
          <Button onClick={handleAdd} disabled={!userId || !role.trim()}>
            <UserPlus className="size-4" />
            {txt(locale, { he: "הוסף לפרויקט", en: "Add to project" })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
