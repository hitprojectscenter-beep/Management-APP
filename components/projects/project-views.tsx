"use client";
import { useState } from "react";
import type { MockTask, MockUser } from "@/lib/db/mock-data";
import { List, Kanban, GanttChartSquare, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskList } from "./task-list";
import { TaskKanban } from "./task-kanban";
import { TaskGantt } from "./task-gantt";
import { TaskCalendar } from "./task-calendar";

type View = "list" | "kanban" | "gantt" | "calendar";

export function ProjectViews({
  tasks,
  users,
  locale,
}: {
  tasks: MockTask[];
  users: MockUser[];
  locale: string;
}) {
  const [view, setView] = useState<View>("kanban");

  const tabs: { key: View; icon: typeof List; label: { he: string; en: string } }[] = [
    { key: "list", icon: List, label: { he: "רשימה", en: "List" } },
    { key: "kanban", icon: Kanban, label: { he: "קנבן", en: "Kanban" } },
    { key: "gantt", icon: GanttChartSquare, label: { he: "גאנט", en: "Gantt" } },
    { key: "calendar", icon: CalendarIcon, label: { he: "יומן", en: "Calendar" } },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-4 flex items-center gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = view === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setView(tab.key)}
              className={cn(
                "flex items-center gap-2 px-3 py-3 text-sm font-medium border-b-2 transition-colors",
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="size-4" />
              {tab.label[locale as "he" | "en"]}
            </button>
          );
        })}
      </div>

      <div className="p-4">
        {view === "list" && <TaskList tasks={tasks} users={users} locale={locale} />}
        {view === "kanban" && <TaskKanban tasks={tasks} users={users} locale={locale} />}
        {view === "gantt" && <TaskGantt tasks={tasks} users={users} locale={locale} />}
        {view === "calendar" && <TaskCalendar tasks={tasks} users={users} locale={locale} />}
      </div>
    </div>
  );
}
