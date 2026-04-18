"use client";
import type { MockProjectMember, MockUser } from "@/lib/db/mock-data";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Users, UserPlus, Briefcase } from "lucide-react";
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
          <Button size="sm" variant="outline">
            <UserPlus className="size-3" />
            {txt(locale, { he: "הוסף", en: "Add" })}
          </Button>
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
