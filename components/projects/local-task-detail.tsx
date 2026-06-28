"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Calendar, Clock, User as UserIcon, Tag, Paperclip, FileText, Loader2, ArrowRight } from "lucide-react";
import { Link } from "@/lib/i18n/routing";
import { cn, formatDateDDMMYYYY } from "@/lib/utils";
import { txt, PRIORITY_LABELS_ML } from "@/lib/utils/locale-text";
import { loadAddedTasks, fetchTaskFromDb } from "@/lib/db/local-tasks";
import { mockUsers, type MockTask } from "@/lib/db/mock-data";
import { TaskThread } from "@/components/projects/task-thread";

const STATUS_LABELS: Record<string, Record<string, string>> = {
  not_started: { he: "לא התחיל", en: "Not started" },
  in_progress: { he: "בביצוע", en: "In progress" },
  review: { he: "בבדיקה", en: "Review" },
  done: { he: "הושלם", en: "Done" },
  blocked: { he: "חסום", en: "Blocked" },
  cancelled: { he: "בוטל", en: "Cancelled" },
};

/**
 * Client-side task detail for user-created tasks (intake extraction, add-task
 * dialog). These aren't in the server-rendered mockTasks snapshot, so the
 * server page can't find them and would 404. This loads the task from the
 * database (durable, cross-device) and falls back to the local cache when the
 * DB isn't configured or is offline.
 */
export function LocalTaskDetail({ id, locale }: { id: string; locale: string }) {
  const [task, setTask] = useState<MockTask | null | undefined>(undefined); // undefined = loading

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // DB first (durable, cross-device); fall back to the local cache when the
      // DB isn't configured or is unreachable (mock/offline mode).
      const fromDb = await fetchTaskFromDb(id);
      if (cancelled) return;
      if (fromDb) {
        setTask(fromDb);
        return;
      }
      const local = loadAddedTasks().find((t) => t.id === id) || null;
      if (!cancelled) setTask(local);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (task === undefined) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin me-2" /> {txt(locale, { he: "טוען משימה...", en: "Loading task..." })}
      </div>
    );
  }

  if (!task) {
    return (
      <div className="p-6 lg:p-8 max-w-2xl mx-auto">
        <Card className="border-amber-200">
          <CardContent className="p-8 text-center space-y-3">
            <h2 className="text-xl font-bold">{txt(locale, { he: "המשימה לא נמצאה", en: "Task not found" })}</h2>
            <p className="text-sm text-muted-foreground">
              {txt(locale, {
                he: "ייתכן שהמשימה נוצרה בדפדפן אחר או נמחקה. משימות שנוצרות מחילוץ נשמרות מקומית עד שנעבור לבסיס נתונים מלא.",
                en: "It may have been created in another browser or removed. Tasks created from extraction are stored locally until full-DB migration.",
              })}
            </p>
            <Link href="/tasks" className="inline-flex items-center gap-1.5 text-primary hover:underline text-sm">
              <ArrowRight className="size-4" />
              {txt(locale, { he: "חזרה לרשימת המשימות", en: "Back to tasks" })}
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const assignee = task.assigneeId ? mockUsers.find((u) => u.id === task.assigneeId) : null;
  const title = locale === "he" ? task.title : task.titleEn || task.title;
  const sourceFile = (task as MockTask & { sourceFile?: { name?: string } }).sourceFile;
  const resources = (task as MockTask & { resources?: string[] }).resources;

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div className="space-y-3">
        <Link href="/tasks" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ArrowRight className="size-3" /> {txt(locale, { he: "המשימות", en: "Tasks" })}
        </Link>
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <div className="flex gap-2">
            <span className={cn("status-badge", `status-${task.status}`)}>
              {STATUS_LABELS[task.status]?.[locale] || task.status}
            </span>
            <span className={cn("status-badge", `priority-${task.priority}`)}>{txt(locale, PRIORITY_LABELS_ML[task.priority]) || task.priority}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {task.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{txt(locale, { he: "תיאור", en: "Description" })}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">{task.description}</p>
              </CardContent>
            </Card>
          )}

          {sourceFile?.name && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Paperclip className="size-4" /> {txt(locale, { he: "מקור המשימה", en: "Source" })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="size-4 text-muted-foreground" />
                  <span className="truncate">{sourceFile.name}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Internal chat + delivery/acknowledgment receipts. */}
          <TaskThread taskId={task.id} locale={locale} />
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="p-5 space-y-4">
              <div>
                <div className="text-xs text-muted-foreground mb-1">{txt(locale, { he: "התקדמות", en: "Progress" })}</div>
                <Progress value={task.progressPercent} className="h-2" />
                <div className="text-sm font-semibold mt-1">{task.progressPercent}%</div>
              </div>

              <div className="space-y-3 pt-3 border-t">
                {assignee && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <UserIcon className="size-4" /> {txt(locale, { he: "אחראי", en: "Assignee" })}
                    </span>
                    <div className="flex items-center gap-2">
                      <Avatar src={assignee.image} fallback={assignee.name[0]} className="size-6" />
                      <span className="font-medium">{assignee.name}</span>
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Calendar className="size-4" /> {txt(locale, { he: "תאריך התחלה", en: "Start" })}
                  </span>
                  <span className="font-medium">{formatDateDDMMYYYY(task.plannedStart)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Calendar className="size-4" /> {txt(locale, { he: "תאריך יעד", en: "Due" })}
                  </span>
                  <span className="font-medium">{formatDateDDMMYYYY(task.plannedEnd)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Clock className="size-4" /> {txt(locale, { he: "הערכה", en: "Estimate" })}
                  </span>
                  <span className="font-medium">{task.actualHours}/{task.estimateHours}{locale === "he" ? " שעות" : "h"}</span>
                </div>
              </div>

              {resources && resources.length > 0 && (
                <div className="pt-3 border-t">
                  <div className="text-xs text-muted-foreground mb-2">{txt(locale, { he: "משאבים / מאמץ", en: "Resources" })}</div>
                  <div className="flex gap-1 flex-wrap">
                    {resources.map((r) => <Badge key={r} variant="secondary">{r}</Badge>)}
                  </div>
                </div>
              )}

              {task.tags && task.tags.length > 0 && (
                <div className="pt-3 border-t">
                  <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                    <Tag className="size-3" /> {txt(locale, { he: "תגיות", en: "Tags" })}
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {task.tags.map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
