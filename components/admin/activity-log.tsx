"use client";
import { useState, useMemo } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  LogIn, Edit, PlusCircle, Trash2, Eye, Download, Bot,
  Clock, Activity, TrendingUp, Users, ChevronDown, ChevronUp,
} from "lucide-react";
import { mockUsers } from "@/lib/db/mock-data";
import { getAllActivity, computeUserStats, getUserActivity, type ActivityEntry } from "@/lib/db/activity-log";
import { ROLE_LABELS } from "@/lib/rbac/abilities";
import { cn } from "@/lib/utils";
import { txt } from "@/lib/utils/locale-text";

const ACTION_ICONS: Record<string, typeof LogIn> = {
  login: LogIn,
  create: PlusCircle,
  update: Edit,
  delete: Trash2,
  view: Eye,
  export: Download,
  assistant: Bot,
};

const ACTION_COLORS: Record<string, string> = {
  login: "text-blue-600 bg-blue-100 dark:bg-blue-950/30",
  create: "text-emerald-600 bg-emerald-100 dark:bg-emerald-950/30",
  update: "text-amber-600 bg-amber-100 dark:bg-amber-950/30",
  delete: "text-red-600 bg-red-100 dark:bg-red-950/30",
  view: "text-slate-600 bg-slate-100 dark:bg-slate-800",
  export: "text-purple-600 bg-purple-100 dark:bg-purple-950/30",
  assistant: "text-violet-600 bg-violet-100 dark:bg-violet-950/30",
};

export function ActivityLog({ locale }: { locale: string }) {
  const [view, setView] = useState<"summary" | "timeline">("summary");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const allStats = useMemo(() =>
    mockUsers.map((u) => ({ user: u, stats: computeUserStats(u.id) })),
    []
  );

  const recentActivity = useMemo(() => getAllActivity(30), []);

  const fmtDate = (iso: string) => {
    if (!iso) return "—";
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return txt(locale, { he: "עכשיו", en: "Just now" });
    if (diffMins < 60) return txt(locale, { he: `לפני ${diffMins} דקות`, en: `${diffMins}m ago` });
    if (diffHours < 24) return txt(locale, { he: `לפני ${diffHours} שעות`, en: `${diffHours}h ago` });
    if (diffDays < 7) return txt(locale, { he: `לפני ${diffDays} ימים`, en: `${diffDays}d ago` });
    return d.toLocaleDateString(locale === "he" ? "he-IL" : "en-US", { day: "2-digit", month: "2-digit", year: "2-digit" });
  };

  return (
    <div className="space-y-4">
      {/* View toggle */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={view === "summary" ? "default" : "outline"}
          onClick={() => setView("summary")}
          className="text-xs"
        >
          <Users className="size-3" />
          {txt(locale, { he: "סיכום לפי משתמש", en: "Per-User Summary" })}
        </Button>
        <Button
          size="sm"
          variant={view === "timeline" ? "default" : "outline"}
          onClick={() => setView("timeline")}
          className="text-xs"
        >
          <Activity className="size-3" />
          {txt(locale, { he: "ציר זמן", en: "Timeline" })}
        </Button>
      </div>

      {view === "summary" ? (
        /* ======== PER-USER SUMMARY ======== */
        <div className="space-y-3">
          {allStats.map(({ user, stats }) => {
            const isExpanded = expandedUser === user.id;
            const userActivity = isExpanded ? getUserActivity(user.id, 8) : [];

            return (
              <Card key={user.id} className="overflow-hidden">
                <button
                  onClick={() => setExpandedUser(isExpanded ? null : user.id)}
                  className="w-full text-start"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar src={user.image} fallback={user.name[0]} className="size-10" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{user.name}</span>
                          <Badge variant="outline" className="text-[9px]">
                            {ROLE_LABELS[user.role]?.[locale] || user.role}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {txt(locale, { he: "כניסה אחרונה:", en: "Last login:" })} {fmtDate(stats.lastLogin)}
                          {stats.lastAction && (
                            <span className="ms-2">· {stats.lastAction}</span>
                          )}
                        </div>
                      </div>

                      {/* Quick stats */}
                      <div className="hidden sm:flex items-center gap-4 text-xs text-center">
                        <div>
                          <div className="text-lg font-bold text-blue-600">{stats.loginCount}</div>
                          <div className="text-[10px] text-muted-foreground">{txt(locale, { he: "כניסות", en: "Logins" })}</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-emerald-600">{stats.totalActions}</div>
                          <div className="text-[10px] text-muted-foreground">{txt(locale, { he: "פעולות", en: "Actions" })}</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-amber-600">{stats.actionsThisWeek}</div>
                          <div className="text-[10px] text-muted-foreground">{txt(locale, { he: "השבוע", en: "This week" })}</div>
                        </div>
                      </div>

                      {isExpanded ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
                    </div>

                    {/* Mobile stats row */}
                    <div className="sm:hidden flex gap-4 mt-2 text-xs">
                      <span><strong className="text-blue-600">{stats.loginCount}</strong> {txt(locale, { he: "כניסות", en: "logins" })}</span>
                      <span><strong className="text-emerald-600">{stats.totalActions}</strong> {txt(locale, { he: "פעולות", en: "actions" })}</span>
                      <span><strong className="text-amber-600">{stats.actionsThisWeek}</strong> {txt(locale, { he: "השבוע", en: "this week" })}</span>
                    </div>
                  </CardContent>
                </button>

                {/* Expanded: detailed stats + recent activity */}
                {isExpanded && (
                  <div className="border-t bg-muted/20 p-4 space-y-3">
                    {/* Stat cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="bg-background rounded-md p-2.5 text-center">
                        <div className="text-xs text-muted-foreground">{txt(locale, { he: "משימות נוצרו", en: "Tasks Created" })}</div>
                        <div className="text-xl font-bold text-emerald-600">{stats.tasksCreated}</div>
                      </div>
                      <div className="bg-background rounded-md p-2.5 text-center">
                        <div className="text-xs text-muted-foreground">{txt(locale, { he: "משימות עודכנו", en: "Tasks Updated" })}</div>
                        <div className="text-xl font-bold text-amber-600">{stats.tasksUpdated}</div>
                      </div>
                      <div className="bg-background rounded-md p-2.5 text-center">
                        <div className="text-xs text-muted-foreground">{txt(locale, { he: "משימות הושלמו", en: "Completed" })}</div>
                        <div className="text-xl font-bold text-blue-600">{stats.tasksCompleted}</div>
                      </div>
                      <div className="bg-background rounded-md p-2.5 text-center">
                        <div className="text-xs text-muted-foreground">{txt(locale, { he: "סה״כ כניסות", en: "Total Logins" })}</div>
                        <div className="text-xl font-bold">{stats.loginCount}</div>
                      </div>
                    </div>

                    {/* Recent activity list */}
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase">
                        {txt(locale, { he: "פעולות אחרונות", en: "Recent Activity" })}
                      </div>
                      <div className="space-y-1.5">
                        {userActivity.map((entry) => (
                          <ActivityRow key={entry.id} entry={entry} locale={locale} showUser={false} fmtDate={fmtDate} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        /* ======== TIMELINE VIEW ======== */
        <Card>
          <CardContent className="p-4 space-y-1.5">
            <div className="text-xs font-semibold text-muted-foreground mb-3 uppercase">
              {txt(locale, { he: `30 פעולות אחרונות`, en: `Last 30 actions` })}
            </div>
            {recentActivity.map((entry) => (
              <ActivityRow key={entry.id} entry={entry} locale={locale} showUser={true} fmtDate={fmtDate} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ActivityRow({
  entry,
  locale,
  showUser,
  fmtDate,
}: {
  entry: ActivityEntry;
  locale: string;
  showUser: boolean;
  fmtDate: (iso: string) => string;
}) {
  const Icon = ACTION_ICONS[entry.actionType] || Activity;
  const colorClass = ACTION_COLORS[entry.actionType] || ACTION_COLORS.view;
  const user = showUser ? mockUsers.find((u) => u.id === entry.userId) : null;

  return (
    <div className="flex items-center gap-3 py-1.5 px-2 rounded-md hover:bg-accent/20 text-xs">
      <div className={cn("size-7 rounded-full flex items-center justify-center shrink-0", colorClass)}>
        <Icon className="size-3.5" />
      </div>
      {showUser && user && (
        <Avatar src={user.image} fallback={user.name[0]} className="size-6 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <span className="font-medium">
          {showUser && user ? `${user.name.split(" ")[0]}: ` : ""}
          {entry.action}
        </span>
        {entry.target && (
          <span className="text-muted-foreground"> — {entry.target}</span>
        )}
      </div>
      <div className="text-[10px] text-muted-foreground shrink-0">{fmtDate(entry.timestamp)}</div>
    </div>
  );
}
