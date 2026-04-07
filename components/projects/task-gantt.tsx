"use client";
import { useMemo } from "react";
import type { MockTask, MockUser } from "@/lib/db/mock-data";
import { Avatar } from "@/components/ui/avatar";
import { cn, formatDate } from "@/lib/utils";
import { STATUS_COLORS } from "@/lib/db/types";

/**
 * RTL-aware Gantt chart - implementation מותאמת אישית.
 * תמיכה בעברית מלאה (ימין-לשמאל) - בניגוד לרוב הספריות.
 */
export function TaskGantt({
  tasks,
  users,
  locale,
}: {
  tasks: MockTask[];
  users: MockUser[];
  locale: string;
}) {
  const isRTL = locale === "he";

  // Calculate timeline range
  const { startDate, endDate, totalDays, days } = useMemo(() => {
    const allDates = tasks.flatMap((t) => [
      t.plannedStart ? new Date(t.plannedStart) : null,
      t.plannedEnd ? new Date(t.plannedEnd) : null,
    ]).filter((d): d is Date => d !== null);

    if (allDates.length === 0) {
      const today = new Date();
      return { startDate: today, endDate: today, totalDays: 0, days: [] };
    }

    let min = new Date(Math.min(...allDates.map((d) => d.getTime())));
    let max = new Date(Math.max(...allDates.map((d) => d.getTime())));
    min.setDate(min.getDate() - 2);
    max.setDate(max.getDate() + 2);
    const total = Math.ceil((max.getTime() - min.getTime()) / (1000 * 60 * 60 * 24));

    const dayList: Date[] = [];
    for (let i = 0; i <= total; i++) {
      const d = new Date(min);
      d.setDate(d.getDate() + i);
      dayList.push(d);
    }

    return { startDate: min, endDate: max, totalDays: total, days: dayList };
  }, [tasks]);

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {locale === "he" ? "אין משימות להצגה" : "No tasks to display"}
      </div>
    );
  }

  const dayWidth = 36;
  const labelWidth = 240;
  const today = new Date();
  const todayOffset = ((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) * dayWidth;

  return (
    <div className="border rounded-lg overflow-auto">
      <div style={{ minWidth: labelWidth + (totalDays + 1) * dayWidth }}>
        {/* Header */}
        <div className="flex border-b bg-muted/30 sticky top-0 z-10">
          <div
            className="shrink-0 px-3 py-2 text-xs font-semibold border-e bg-muted/50"
            style={{ width: labelWidth }}
          >
            {locale === "he" ? "משימה" : "Task"}
          </div>
          <div className="flex" style={{ direction: "ltr" }}>
            {days.map((day, idx) => {
              const isToday = day.toDateString() === today.toDateString();
              const isWeekend = day.getDay() === 5 || day.getDay() === 6;
              return (
                <div
                  key={idx}
                  className={cn(
                    "shrink-0 text-[10px] text-center border-e py-1 flex flex-col",
                    isToday && "bg-primary/10 font-bold",
                    isWeekend && "bg-muted/40"
                  )}
                  style={{ width: dayWidth }}
                >
                  <div className="text-muted-foreground">
                    {day.toLocaleDateString(locale === "he" ? "he-IL" : "en-US", { weekday: "narrow" })}
                  </div>
                  <div className="font-semibold">{day.getDate()}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Rows */}
        <div className="relative">
          {/* Today line */}
          {todayOffset >= 0 && todayOffset <= totalDays * dayWidth && (
            <div
              className="absolute top-0 bottom-0 w-px bg-red-500 z-10 pointer-events-none"
              style={{ insetInlineStart: labelWidth + todayOffset }}
            />
          )}
          {tasks.map((task) => {
            const taskStart = new Date(task.plannedStart);
            const taskEnd = new Date(task.plannedEnd);
            const offset =
              ((taskStart.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) * dayWidth;
            const width =
              ((taskEnd.getTime() - taskStart.getTime()) / (1000 * 60 * 60 * 24)) * dayWidth;
            const user = users.find((u) => u.id === task.assigneeId);

            return (
              <div key={task.id} className="flex border-b hover:bg-muted/30 group">
                <div
                  className="shrink-0 px-3 py-2 border-e flex items-center gap-2"
                  style={{ width: labelWidth }}
                >
                  {user && <Avatar src={user.image} fallback={user.name[0]} className="size-5" />}
                  <span className="text-xs font-medium truncate">
                    {locale === "he" ? task.title : task.titleEn || task.title}
                  </span>
                </div>
                <div className="relative flex-1 h-10" style={{ direction: "ltr" }}>
                  <div
                    className="absolute top-1/2 -translate-y-1/2 h-6 rounded-md gantt-bar shadow-sm group-hover:shadow-md flex items-center px-2 overflow-hidden"
                    style={{
                      insetInlineStart: offset,
                      width: Math.max(width, 24),
                      backgroundColor: STATUS_COLORS[task.status],
                    }}
                    title={`${task.title} - ${formatDate(task.plannedStart, locale as "he" | "en")} → ${formatDate(task.plannedEnd, locale as "he" | "en")}`}
                  >
                    {/* Progress overlay */}
                    <div
                      className="absolute inset-y-0 start-0 bg-black/20"
                      style={{ width: `${task.progressPercent}%` }}
                    />
                    <span className="relative text-[10px] font-semibold text-white truncate">
                      {task.progressPercent}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
