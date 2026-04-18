"use client";
import { useState, useMemo } from "react";
import type { MockTask, MockUser, MockWbsNode } from "@/lib/db/mock-data";
import { getTimeRemaining } from "@/lib/db/mock-data";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatDate } from "@/lib/utils";
import { AlertTriangle, Clock, Plus, Layers, Briefcase, Calendar as CalIcon } from "lucide-react";
import { Link } from "@/lib/i18n/routing";
import { AddTaskDialog } from "@/components/landing/add-task-dialog";
import { txt, STATUS_LABELS_ML, PRIORITY_LABELS_ML, TAB_LABELS_ML } from "@/lib/utils/locale-text";
import { useRole } from "@/lib/auth/role-context";

type TabKey = "all" | "in_progress" | "not_started" | "blocked" | "review" | "overdue" | "by_project";

export function MyTasksTabs({
  tasks,
  users,
  projects,
  wbsNodes,
  locale,
}: {
  tasks: MockTask[];
  users: MockUser[];
  projects: MockWbsNode[];
  wbsNodes: MockWbsNode[];
  locale: string;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const { can } = useRole();

  const tabs: { key: TabKey; count?: number }[] = useMemo(() => {
    const counts = {
      all: tasks.length,
      in_progress: tasks.filter((t) => t.status === "in_progress").length,
      not_started: tasks.filter((t) => t.status === "not_started").length,
      blocked: tasks.filter((t) => t.status === "blocked").length,
      review: tasks.filter((t) => t.status === "review").length,
      overdue: tasks.filter((t) => {
        if (!t.plannedEnd) return false;
        return new Date(t.plannedEnd).getTime() < Date.now();
      }).length,
    };
    return [
      { key: "all" as TabKey, count: counts.all },
      { key: "in_progress" as TabKey, count: counts.in_progress },
      { key: "not_started" as TabKey, count: counts.not_started },
      { key: "review" as TabKey, count: counts.review },
      { key: "blocked" as TabKey, count: counts.blocked },
      { key: "overdue" as TabKey, count: counts.overdue },
      { key: "by_project" as TabKey },
    ];
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    if (activeTab === "all" || activeTab === "by_project") return tasks;
    if (activeTab === "overdue") {
      return tasks.filter((t) => {
        if (!t.plannedEnd) return false;
        return new Date(t.plannedEnd).getTime() < Date.now();
      });
    }
    return tasks.filter((t) => t.status === activeTab);
  }, [tasks, activeTab]);

  // Sort by urgency (overdue first, then closest to due, then by priority)
  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      const aEnd = new Date(a.plannedEnd).getTime();
      const bEnd = new Date(b.plannedEnd).getTime();
      return aEnd - bEnd;
    });
  }, [filteredTasks]);

  // Group by project for "by_project" view
  const tasksByProject = useMemo(() => {
    if (activeTab !== "by_project") return null;
    const map = new Map<string, { project: MockWbsNode; tasks: MockTask[] }>();
    for (const task of sortedTasks) {
      // Walk up to find the project
      let nodeId: string | null = task.wbsNodeId;
      let project: MockWbsNode | null = null;
      while (nodeId) {
        const node = wbsNodes.find((n) => n.id === nodeId);
        if (!node) break;
        if (node.level === "project") {
          project = node;
          break;
        }
        nodeId = node.parentId;
      }
      if (project) {
        const existing = map.get(project.id);
        if (existing) existing.tasks.push(task);
        else map.set(project.id, { project, tasks: [task] });
      }
    }
    return Array.from(map.values());
  }, [activeTab, sortedTasks, wbsNodes]);

  return (
    <div className="space-y-4">
      {/* Tabs row + Add button */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-none" data-tour="tabs">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <span>{txt(locale, TAB_LABELS_ML[tab.key])}</span>
                {tab.count !== undefined && (
                  <span
                    className={cn(
                      "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                      isActive ? "bg-white/20" : "bg-background"
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {can("create_task") && (
          <AddTaskDialog projects={wbsNodes} users={users} locale={locale}>
            <Button className="shrink-0 shadow-md" data-tour="add-task">
              <Plus className="size-4" />
              {txt(locale, { he: "הוסף משימה", en: "Add Task", ru: "Добавить", fr: "Ajouter", es: "Añadir" })}
            </Button>
          </AddTaskDialog>
        )}
      </div>

      {/* Tasks list */}
      {activeTab === "by_project" ? (
        <div className="space-y-6">
          {tasksByProject?.map(({ project, tasks: pTasks }) => (
            <div key={project.id}>
              <div className="flex items-center gap-2 mb-2 px-1">
                <Briefcase className="size-4 text-blue-600" />
                <h3 className="font-semibold">
                  {locale === "he" ? project.name : project.nameEn || project.name}
                </h3>
                <Badge variant="outline">{pTasks.length}</Badge>
              </div>
              <div className="space-y-2">
                {pTasks.map((task) => (
                  <TaskCard key={task.id} task={task} users={users} locale={locale} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : sortedTasks.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Layers className="size-10 mx-auto mb-3 opacity-30" />
            <div className="text-sm">{txt(locale, { he: "אין משימות פתוחות בקטגוריה זו", en: "No open tasks in this category", ru: "Нет открытых задач", fr: "Aucune tâche ouverte", es: "Sin tareas abiertas" })}</div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2" data-tour="task-list">
          {sortedTasks.map((task) => (
            <TaskCard key={task.id} task={task} users={users} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}

function TaskCard({
  task,
  users,
  locale,
}: {
  task: MockTask;
  users: MockUser[];
  locale: string;
}) {
  const assignee = users.find((u) => u.id === task.assigneeId);
  const remaining = task.plannedEnd ? getTimeRemaining(task.plannedEnd) : null;

  return (
    <Link href={`/tasks/${task.id}`} className="block">
      <Card className="card-hover overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* Status indicator */}
            <div
              className={cn(
                "w-1 self-stretch rounded-full",
                task.status === "blocked" && "bg-red-500",
                task.status === "in_progress" && "bg-blue-500",
                task.status === "review" && "bg-amber-500",
                task.status === "not_started" && "bg-slate-300"
              )}
            />

            {/* Title + meta */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-semibold text-sm line-clamp-1">
                  {locale === "he" ? task.title : task.titleEn || task.title}
                </h4>
                <span className={cn("status-badge text-[9px]", `priority-${task.priority}`)}>
                  {txt(locale, PRIORITY_LABELS_ML[task.priority])}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                <span className={cn("status-badge", `status-${task.status}`)}>
                  {STATUS_LABELS_ML[task.status] ? txt(locale, STATUS_LABELS_ML[task.status]) : task.status}
                </span>
                <div className="flex items-center gap-1">
                  <CalIcon className="size-3" />
                  {formatDate(task.plannedEnd, locale)}
                </div>
                {task.tags.slice(0, 2).map((tag) => (
                  <span key={tag} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Progress */}
            <div className="hidden md:block w-24">
              <Progress value={task.progressPercent} className="h-1.5" />
              <div className="text-[10px] text-muted-foreground text-center mt-1">
                {task.progressPercent}%
              </div>
            </div>

            {/* Time remaining */}
            {remaining && (
              <div
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap",
                  remaining.isOverdue
                    ? "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-300"
                    : remaining.days <= 2
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
                      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                )}
              >
                {remaining.isOverdue ? <AlertTriangle className="size-3" /> : <Clock className="size-3" />}
                {remaining.label[locale] || remaining.label.en}
              </div>
            )}

            {/* Assignee */}
            {assignee && (
              <Avatar src={assignee.image} fallback={assignee.name[0]} className="size-8 shrink-0" />
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
