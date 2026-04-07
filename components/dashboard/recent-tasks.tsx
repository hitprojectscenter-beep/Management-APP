import type { MockTask, MockUser } from "@/lib/db/mock-data";
import { Avatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Link } from "@/lib/i18n/routing";

export function RecentTasks({
  tasks,
  users,
  locale,
}: {
  tasks: MockTask[];
  users: MockUser[];
  locale: string;
}) {
  const statusLabels: Record<string, { he: string; en: string }> = {
    not_started: { he: "לא התחיל", en: "Not started" },
    in_progress: { he: "בביצוע", en: "In progress" },
    review: { he: "בבדיקה", en: "Review" },
    done: { he: "הושלם", en: "Done" },
    blocked: { he: "חסום", en: "Blocked" },
    cancelled: { he: "בוטל", en: "Cancelled" },
  };

  const priorityLabels: Record<string, { he: string; en: string }> = {
    low: { he: "נמוכה", en: "Low" },
    medium: { he: "בינונית", en: "Medium" },
    high: { he: "גבוהה", en: "High" },
    critical: { he: "קריטית", en: "Critical" },
  };

  return (
    <div className="overflow-x-auto -mx-6">
      <table className="w-full text-sm">
        <thead className="text-xs text-muted-foreground border-b">
          <tr>
            <th className="text-start ps-6 py-2 font-medium">
              {locale === "he" ? "משימה" : "Task"}
            </th>
            <th className="text-start py-2 font-medium hidden sm:table-cell">
              {locale === "he" ? "סטטוס" : "Status"}
            </th>
            <th className="text-start py-2 font-medium hidden md:table-cell">
              {locale === "he" ? "עדיפות" : "Priority"}
            </th>
            <th className="text-start py-2 font-medium hidden lg:table-cell">
              {locale === "he" ? "אחראי" : "Assignee"}
            </th>
            <th className="text-start py-2 font-medium hidden lg:table-cell">
              {locale === "he" ? "התקדמות" : "Progress"}
            </th>
            <th className="text-end pe-6 py-2 font-medium hidden md:table-cell">
              {locale === "he" ? "תאריך יעד" : "Due date"}
            </th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => {
            const assignee = users.find((u) => u.id === task.assigneeId);
            return (
              <tr
                key={task.id}
                className="border-b last:border-0 hover:bg-muted/40 transition-colors"
              >
                <td className="ps-6 py-3">
                  <Link
                    href={`/tasks/${task.id}`}
                    className="font-medium hover:text-primary line-clamp-1"
                  >
                    {locale === "he" ? task.title : task.titleEn || task.title}
                  </Link>
                </td>
                <td className="py-3 hidden sm:table-cell">
                  <span className={cn("status-badge", `status-${task.status}`)}>
                    {statusLabels[task.status][locale as "he" | "en"]}
                  </span>
                </td>
                <td className="py-3 hidden md:table-cell">
                  <span className={cn("status-badge", `priority-${task.priority}`)}>
                    {priorityLabels[task.priority][locale as "he" | "en"]}
                  </span>
                </td>
                <td className="py-3 hidden lg:table-cell">
                  {assignee && (
                    <div className="flex items-center gap-2">
                      <Avatar src={assignee.image} fallback={assignee.name[0]} className="size-6" />
                      <span className="text-xs">{assignee.name}</span>
                    </div>
                  )}
                </td>
                <td className="py-3 hidden lg:table-cell w-32">
                  <div className="flex items-center gap-2">
                    <Progress value={task.progressPercent} className="h-1.5 w-20" />
                    <span className="text-xs text-muted-foreground w-8">
                      {task.progressPercent}%
                    </span>
                  </div>
                </td>
                <td className="pe-6 py-3 text-end hidden md:table-cell text-xs text-muted-foreground">
                  {formatDate(task.plannedEnd, locale as "he" | "en")}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
