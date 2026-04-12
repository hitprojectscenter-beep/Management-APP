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

  const tabs: { key: View; icon: typeof List; label: Record<string, string> }[] = [
    { key: "list", icon: List, label: { he: "רשימה", en: "List", ru: "Список", fr: "Liste", es: "Lista" } },
    { key: "kanban", icon: Kanban, label: { he: "קנבן", en: "Kanban", ru: "Канбан", fr: "Kanban", es: "Kanban" } },
    { key: "gantt", icon: GanttChartSquare, label: { he: "גאנט", en: "Gantt", ru: "Гант", fr: "Gantt", es: "Gantt" } },
    { key: "calendar", icon: CalendarIcon, label: { he: "יומן", en: "Calendar", ru: "Календарь", fr: "Calendrier", es: "Calendario" } },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-2 sm:px-4 flex items-center gap-0.5 sm:gap-1 overflow-x-auto scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = view === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setView(tab.key)}
              className={cn(
                "flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap min-h-[44px]",
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground active:text-foreground"
              )}
            >
              <Icon className="size-4" />
              {tab.label[locale]}
            </button>
          );
        })}
      </div>

      <div className="p-2 sm:p-4">
        {view === "list" && <TaskList tasks={tasks} users={users} locale={locale} />}
        {view === "kanban" && <TaskKanban tasks={tasks} users={users} locale={locale} />}
        {view === "gantt" && <TaskGantt tasks={tasks} users={users} locale={locale} />}
        {view === "calendar" && <TaskCalendar tasks={tasks} users={users} locale={locale} />}
      </div>
    </div>
  );
}
