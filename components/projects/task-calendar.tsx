"use client";
import { useMemo, useState } from "react";
import type { MockTask, MockUser } from "@/lib/db/mock-data";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { STATUS_COLORS } from "@/lib/db/types";

export function TaskCalendar({
  tasks,
  users,
  locale,
}: {
  tasks: MockTask[];
  users: MockUser[];
  locale: string;
}) {
  const [current, setCurrent] = useState(new Date());

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

  const monthName = current.toLocaleDateString(locale === "he" ? "he-IL" : "en-US", {
    month: "long",
    year: "numeric",
  });

  const weekdays = locale === "he"
    ? ["א", "ב", "ג", "ד", "ה", "ו", "ש"]
    : ["S", "M", "T", "W", "T", "F", "S"];

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{monthName}</h3>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrent(new Date(current.getFullYear(), current.getMonth() - 1, 1))}
          >
            {locale === "he" ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrent(new Date())}>
            {locale === "he" ? "היום" : "Today"}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrent(new Date(current.getFullYear(), current.getMonth() + 1, 1))}
          >
            {locale === "he" ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden border">
        {weekdays.map((d) => (
          <div key={d} className="bg-muted/50 text-center text-xs font-semibold py-2">
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
                "bg-background min-h-[80px] p-1.5",
                !cell && "bg-muted/20",
                isToday && "ring-2 ring-primary ring-inset"
              )}
            >
              {cell && (
                <>
                  <div className={cn("text-xs font-semibold mb-1", isToday && "text-primary")}>
                    {cell.getDate()}
                  </div>
                  <div className="space-y-1">
                    {dayTasks.slice(0, 3).map((task) => (
                      <div
                        key={task.id}
                        className="text-[10px] px-1.5 py-0.5 rounded truncate text-white"
                        style={{ backgroundColor: STATUS_COLORS[task.status] }}
                        title={task.title}
                      >
                        {locale === "he" ? task.title : task.titleEn || task.title}
                      </div>
                    ))}
                    {dayTasks.length > 3 && (
                      <div className="text-[10px] text-muted-foreground">+{dayTasks.length - 3}</div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
