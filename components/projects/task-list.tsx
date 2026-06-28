"use client";
import type { MockTask, MockUser } from "@/lib/db/mock-data";
import { Avatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { formatDate, isOverdue, cn } from "@/lib/utils";
import { Link } from "@/lib/i18n/routing";
import { AlertTriangle } from "lucide-react";
import { txt, STATUS_LABELS_ML, PRIORITY_LABELS_ML } from "@/lib/utils/locale-text";
import { STATUS_COLORS, type TaskStatus } from "@/lib/db/types";

export function TaskList({
  tasks,
  users,
  locale,
}: {
  tasks: MockTask[];
  users: MockUser[];
  locale: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-xs text-muted-foreground border-b">
          <tr>
            <th className="text-start py-2 font-medium px-2">{locale === "he" ? "משימה" : "Task"}</th>
            <th className="text-start py-2 font-medium px-2">{locale === "he" ? "סטטוס" : "Status"}</th>
            <th className="text-start py-2 font-medium px-2">{locale === "he" ? "עדיפות" : "Priority"}</th>
            <th className="text-start py-2 font-medium px-2">{locale === "he" ? "אחראי" : "Assignee"}</th>
            <th className="text-start py-2 font-medium px-2">{locale === "he" ? "תאריך יעד" : "Due"}</th>
            <th className="text-start py-2 font-medium px-2">{locale === "he" ? "התקדמות" : "Progress"}</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => {
            const user = users.find((u) => u.id === task.assigneeId);
            const overdue = isOverdue(task.plannedEnd, task.status);
            return (
              <tr key={task.id} className="border-b hover:bg-muted/40">
                <td className="py-3 px-2">
                  <Link href={`/tasks/${task.id}`} className="font-medium hover:text-primary">
                    {locale === "he" ? task.title : task.titleEn || task.title}
                  </Link>
                  {task.tags.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {task.tags.map((tag) => (
                        <span key={tag} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="py-3 px-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap">
                    <span className="size-1.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[task.status as TaskStatus] || "hsl(220,9%,46%)" }} />
                    {txt(locale, STATUS_LABELS_ML[task.status]) || task.status}
                  </span>
                </td>
                <td className="py-3 px-2">
                  <span className={cn("status-badge", `priority-${task.priority}`)}>
                    {txt(locale, PRIORITY_LABELS_ML[task.priority]) || task.priority}
                  </span>
                </td>
                <td className="py-3 px-2">
                  {user && (
                    <div className="flex items-center gap-2">
                      <Avatar src={user.image} fallback={user.name[0]} className="size-6" />
                      <span className="text-xs">{user.name.split(" ")[0]}</span>
                    </div>
                  )}
                </td>
                <td className="py-3 px-2 text-xs">
                  <div className={cn("flex items-center gap-1", overdue && "text-red-600 font-medium")}>
                    {overdue && <AlertTriangle className="size-3" />}
                    {formatDate(task.plannedEnd, locale)}
                  </div>
                </td>
                <td className="py-3 px-2 w-32">
                  <div className="flex items-center gap-2">
                    <Progress value={task.progressPercent} className="h-1.5" />
                    <span className="text-[10px] text-muted-foreground w-7">{task.progressPercent}%</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
