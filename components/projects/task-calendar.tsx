"use client";
import { useMemo, useState } from "react";
import type { MockTask, MockUser } from "@/lib/db/mock-data";
import { ChevronLeft, ChevronRight, X, User, Calendar as CalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { STATUS_COLORS } from "@/lib/db/types";
import { txt, WEEKDAYS_ML, INTL_LOCALE, COMMON_LABELS, STATUS_LABELS_ML } from "@/lib/utils/locale-text";
import { Link } from "@/lib/i18n/routing";

export function TaskCalendar({
  tasks,
  users,
  locale,
}: {
  tasks: MockTask[];
  users: MockUser[];
  locale: string;
}) {
  const isRtl = locale === "he";
  const [current, setCurrent] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState<MockTask | null>(null);

  const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
  const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
  const startDay = monthStart.getDay();
  const daysInMonth = monthEnd.getDate();

  // Build calendar grid
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(current.getFullYear(), current.getMonth(), d));
  }

  const intlLocale = INTL_LOCALE[locale] || "en-US";
  const monthName = current.toLocaleDateString(intlLocale, {
    month: "long",
    year: "numeric",
  });

  const weekdays = WEEKDAYS_ML[locale] || WEEKDAYS_ML.en;

  const tasksByDay = useMemo(() => {
    const map = new Map<string, MockTask[]>();
    for (const task of tasks) {
      if (!task.plannedEnd) continue;
      const key = new Date(task.plannedEnd).toDateString();
      const arr = map.get(key) || [];
      arr.push(task);
      map.set(key, arr);
    }
    return map;
  }, [tasks]);

  const getTaskTitle = (task: MockTask) =>
    locale === "he" ? task.title : task.titleEn || task.title;

  return (
    <div className="space-y-4">
      {/* Header with navigation */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{monthName}</h3>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrent(new Date(current.getFullYear(), current.getMonth() - 1, 1))}
          >
            {isRtl ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrent(new Date())}>
            {txt(locale, COMMON_LABELS.today)}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrent(new Date(current.getFullYear(), current.getMonth() + 1, 1))}
          >
            {isRtl ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
          </Button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden border">
        {weekdays.map((d, i) => (
          <div key={`${d}-${i}`} className="bg-muted/50 text-center text-xs font-semibold py-2">
            {d}
          </div>
        ))}
        {cells.map((cell, idx) => {
          const isToday = cell?.toDateString() === new Date().toDateString();
          const dayTasks = cell ? tasksByDay.get(cell.toDateString()) || [] : [];
          return (
            <div
              key={idx}
              className={cn(
                "bg-background min-h-[80px] sm:min-h-[100px] p-1.5 transition-colors",
                !cell && "bg-muted/20",
                isToday && "ring-2 ring-primary ring-inset",
                dayTasks.length > 0 && "hover:bg-accent/30 cursor-pointer"
              )}
            >
              {cell && (
                <>
                  <div className={cn("text-xs font-semibold mb-1", isToday && "text-primary")}>
                    {cell.getDate()}
                  </div>
                  <div className="space-y-1">
                    {dayTasks.slice(0, 3).map((task) => (
                      <button
                        key={task.id}
                        onClick={() => setSelectedTask(task)}
                        className="w-full text-start text-[10px] px-1.5 py-0.5 rounded truncate text-white hover:opacity-80 transition-opacity"
                        style={{ backgroundColor: STATUS_COLORS[task.status] }}
                        title={getTaskTitle(task)}
                      >
                        {getTaskTitle(task)}
                      </button>
                    ))}
                    {dayTasks.length > 3 && (
                      <div className="text-[10px] text-muted-foreground text-center">
                        +{dayTasks.length - 3}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Task detail popup */}
      {selectedTask && (
        <TaskDetailPopup
          task={selectedTask}
          users={users}
          locale={locale}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}

function TaskDetailPopup({
  task,
  users,
  locale,
  onClose,
}: {
  task: MockTask;
  users: MockUser[];
  locale: string;
  onClose: () => void;
}) {
  const assignee = users.find((u) => u.id === task.assigneeId);
  const intlLocale = INTL_LOCALE[locale] || "en-US";
  const title = locale === "he" ? task.title : task.titleEn || task.title;

  const formatD = (d: string) =>
    new Date(d).toLocaleDateString(intlLocale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  return (
    <div className="border rounded-lg p-4 bg-card shadow-lg space-y-3 animate-in slide-in-from-top-2 duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm">{title}</h4>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge
              variant="outline"
              style={{ borderColor: STATUS_COLORS[task.status], color: STATUS_COLORS[task.status] }}
            >
              {STATUS_LABELS_ML[task.status] ? txt(locale, STATUS_LABELS_ML[task.status]) : task.status}
            </Badge>
            <Badge variant="secondary" className="text-[10px]">
              {task.progressPercent}%
            </Badge>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="size-7 shrink-0" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        {assignee && (
          <div className="flex items-center gap-2">
            <User className="size-3 text-muted-foreground" />
            <span>{assignee.name}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <CalIcon className="size-3 text-muted-foreground" />
          <span>
            {task.plannedStart ? formatD(task.plannedStart) : "—"} → {task.plannedEnd ? formatD(task.plannedEnd) : "—"}
          </span>
        </div>
      </div>

      <div className="flex justify-end pt-1">
        <Link href={`/tasks/${task.id}`}>
          <Button size="sm" variant="outline" className="text-xs">
            {txt(locale, { he: "פתח משימה", en: "Open task", ru: "Открыть задачу", fr: "Ouvrir", es: "Abrir tarea" })}
          </Button>
        </Link>
      </div>
    </div>
  );
}
