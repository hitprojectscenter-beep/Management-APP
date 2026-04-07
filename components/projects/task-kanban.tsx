"use client";
import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import type { MockTask, MockUser } from "@/lib/db/mock-data";
import { Avatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { cn, formatDate, isOverdue } from "@/lib/utils";
import { AlertTriangle, MessageSquare, Paperclip, Calendar } from "lucide-react";
import type { TaskStatus } from "@/lib/db/types";

const COLUMNS: { id: TaskStatus; he: string; en: string; color: string }[] = [
  { id: "not_started", he: "לא התחילו", en: "Not Started", color: "bg-slate-100 dark:bg-slate-900" },
  { id: "in_progress", he: "בביצוע", en: "In Progress", color: "bg-blue-100 dark:bg-blue-950/30" },
  { id: "review", he: "בבדיקה", en: "Review", color: "bg-amber-100 dark:bg-amber-950/30" },
  { id: "done", he: "הושלמו", en: "Done", color: "bg-emerald-100 dark:bg-emerald-950/30" },
  { id: "blocked", he: "חסומות", en: "Blocked", color: "bg-red-100 dark:bg-red-950/30" },
];

export function TaskKanban({
  tasks: initialTasks,
  users,
  locale,
}: {
  tasks: MockTask[];
  users: MockUser[];
  locale: string;
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const overId = String(over.id);
    if (COLUMNS.some((c) => c.id === overId)) {
      setTasks((prev) =>
        prev.map((t) => (t.id === active.id ? { ...t, status: overId as TaskStatus } : t))
      );
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={(e) => setActiveId(String(e.active.id))}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex gap-3 overflow-x-auto pb-3">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            column={col}
            tasks={tasks.filter((t) => t.status === col.id)}
            users={users}
            locale={locale}
          />
        ))}
      </div>
      <DragOverlay>
        {activeId ? (
          <KanbanCard
            task={tasks.find((t) => t.id === activeId)!}
            users={users}
            locale={locale}
            isDragging
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function KanbanColumn({
  column,
  tasks,
  users,
  locale,
}: {
  column: (typeof COLUMNS)[number];
  tasks: MockTask[];
  users: MockUser[];
  locale: string;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: column.id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col w-72 shrink-0 rounded-lg border transition-all",
        column.color,
        isOver && "ring-2 ring-primary"
      )}
    >
      <div className="px-3 py-2.5 flex items-center justify-between border-b">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">{locale === "he" ? column.he : column.en}</span>
          <span className="text-xs bg-background/80 px-1.5 py-0.5 rounded-full font-medium">
            {tasks.length}
          </span>
        </div>
      </div>
      <div className="p-2 space-y-2 min-h-[120px] max-h-[60vh] overflow-y-auto">
        {tasks.map((task) => (
          <KanbanCard key={task.id} task={task} users={users} locale={locale} />
        ))}
      </div>
    </div>
  );
}

function KanbanCard({
  task,
  users,
  locale,
  isDragging,
}: {
  task: MockTask;
  users: MockUser[];
  locale: string;
  isDragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: task.id });
  const user = users.find((u) => u.id === task.assigneeId);
  const overdue = isOverdue(task.plannedEnd, task.status);

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "bg-background rounded-md border p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-all space-y-2",
        isDragging && "opacity-50 shadow-xl scale-105"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug line-clamp-2 flex-1">
          {locale === "he" ? task.title : task.titleEn || task.title}
        </p>
        <span className={cn("status-badge text-[9px]", `priority-${task.priority}`)}>
          {task.priority[0].toUpperCase()}
        </span>
      </div>

      {task.tags.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {task.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">
              {tag}
            </span>
          ))}
        </div>
      )}

      {task.progressPercent > 0 && task.progressPercent < 100 && (
        <Progress value={task.progressPercent} className="h-1" />
      )}

      <div className="flex items-center justify-between pt-1">
        <div className={cn("flex items-center gap-1.5 text-[10px]", overdue && "text-red-600 font-semibold")}>
          {overdue && <AlertTriangle className="size-3" />}
          <Calendar className="size-3" />
          {formatDate(task.plannedEnd, locale as "he" | "en")}
        </div>
        {user && <Avatar src={user.image} fallback={user.name[0]} className="size-6" />}
      </div>
    </div>
  );
}
