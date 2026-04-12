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
  const statusLabels: Record<string, Record<string, string>> = {
    not_started: { he: "לא התחיל", en: "Not started", ru: "Не начата", fr: "Non démarré", es: "No iniciada" },
    in_progress: { he: "בביצוע", en: "In progress", ru: "В работе", fr: "En cours", es: "En progreso" },
    review: { he: "בבדיקה", en: "Review", ru: "Проверка", fr: "En revue", es: "En revisión" },
    done: { he: "הושלם", en: "Done", ru: "Завершена", fr: "Terminé", es: "Completada" },
    blocked: { he: "חסום", en: "Blocked", ru: "Заблокирована", fr: "Bloqué", es: "Bloqueada" },
    cancelled: { he: "בוטל", en: "Cancelled", ru: "Отменена", fr: "Annulé", es: "Cancelada" },
  };

  const priorityLabels: Record<string, Record<string, string>> = {
    low: { he: "נמוכה", en: "Low", ru: "Низкий", fr: "Basse", es: "Baja" },
    medium: { he: "בינונית", en: "Medium", ru: "Средний", fr: "Moyenne", es: "Media" },
    high: { he: "גבוהה", en: "High", ru: "Высокий", fr: "Haute", es: "Alta" },
    critical: { he: "קריטית", en: "Critical", ru: "Критический", fr: "Critique", es: "Crítica" },
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
                    {statusLabels[task.status][locale]}
                  </span>
                </td>
                <td className="py-3 hidden md:table-cell">
                  <span className={cn("status-badge", `priority-${task.priority}`)}>
                    {priorityLabels[task.priority][locale]}
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
                  {formatDate(task.plannedEnd, locale)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
