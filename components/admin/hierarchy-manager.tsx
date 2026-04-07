"use client";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  mockWbsNodes,
  mockTasks,
  type MockWbsNode,
} from "@/lib/db/mock-data";
import { Briefcase, FolderTree, Boxes, ArrowRight, ArrowLeft, Save, GitBranch, CheckSquare } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function HierarchyManager({ locale }: { locale: string }) {
  const isHe = locale === "he";
  const [nodes, setNodes] = useState<MockWbsNode[]>(mockWbsNodes);
  const [mode, setMode] = useState<"projects" | "tasks">("projects");

  const portfolios = nodes.filter((n) => n.level === "portfolio");
  const programs = nodes.filter((n) => n.level === "program");
  const projects = nodes.filter((n) => n.level === "project");

  const handleMoveProject = (projectId: string, newParentId: string) => {
    setNodes((prev) => prev.map((n) => (n.id === projectId ? { ...n, parentId: newParentId } : n)));
    const project = nodes.find((n) => n.id === projectId);
    const newParent = nodes.find((n) => n.id === newParentId);
    toast.success(
      isHe
        ? `${project?.name} הועבר ל-${newParent?.name}`
        : `${project?.nameEn || project?.name} moved to ${newParent?.nameEn || newParent?.name}`
    );
  };

  const handleMoveTask = (taskId: string, newWbsNodeId: string) => {
    // Tasks live in mock state separately - just show toast for demo
    const task = mockTasks.find((t) => t.id === taskId);
    const newNode = nodes.find((n) => n.id === newWbsNodeId);
    toast.success(
      isHe
        ? `המשימה "${task?.title}" שויכה ל-${newNode?.name}`
        : `Task "${task?.titleEn || task?.title}" assigned to ${newNode?.nameEn || newNode?.name}`
    );
  };

  return (
    <div className="space-y-5">
      {/* Mode toggle */}
      <div className="inline-flex bg-muted/50 p-1 rounded-lg gap-1">
        <button
          onClick={() => setMode("projects")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
            mode === "projects" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Briefcase className="size-4" />
          {isHe ? "שיוך פרויקטים לפרוגרמות" : "Projects → Programs"}
        </button>
        <button
          onClick={() => setMode("tasks")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
            mode === "tasks" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <CheckSquare className="size-4" />
          {isHe ? "שיוך משימות" : "Tasks → Items"}
        </button>
      </div>

      {mode === "projects" && (
        <ProjectsHierarchy
          portfolios={portfolios}
          programs={programs}
          projects={projects}
          onMove={handleMoveProject}
          locale={locale}
        />
      )}

      {mode === "tasks" && (
        <TasksHierarchy nodes={nodes} onMove={handleMoveTask} locale={locale} />
      )}
    </div>
  );
}

function ProjectsHierarchy({
  portfolios,
  programs,
  projects,
  onMove,
  locale,
}: {
  portfolios: MockWbsNode[];
  programs: MockWbsNode[];
  projects: MockWbsNode[];
  onMove: (projectId: string, newParentId: string) => void;
  locale: string;
}) {
  const isHe = locale === "he";

  return (
    <div className="space-y-4">
      <Card className="bg-blue-50/30 dark:bg-blue-950/10 border-blue-200 dark:border-blue-900">
        <CardContent className="p-4 flex items-start gap-3">
          <div className="size-8 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center shrink-0">
            <GitBranch className="size-4 text-blue-600" />
          </div>
          <div className="text-sm">
            <div className="font-semibold text-blue-900 dark:text-blue-300">
              {isHe ? "שיוך פרויקטים לתוכניות (Programs)" : "Assign projects to programs"}
            </div>
            <div className="text-xs text-blue-700 dark:text-blue-400 mt-1">
              {isHe
                ? "השתמש ברשימה הנפתחת ליד כל פרויקט כדי להעביר אותו לתוכנית אחרת. השינויים נשמרים מיד."
                : "Use the dropdown next to each project to move it to a different program. Changes save immediately."}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {projects.map((project) => {
          const currentProgram = programs.find((p) => p.id === project.parentId);
          return (
            <Card key={project.id} className="card-hover">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="size-10 rounded-lg bg-blue-100 dark:bg-blue-950/30 flex items-center justify-center shrink-0">
                  <Briefcase className="size-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold line-clamp-1">
                    {isHe ? project.name : project.nameEn || project.name}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                    <span>{isHe ? "כעת ב:" : "Currently in:"}</span>
                    <Badge variant="outline" className="text-[10px]">
                      <FolderTree className="size-2.5 me-0.5" />
                      {currentProgram
                        ? isHe
                          ? currentProgram.name
                          : currentProgram.nameEn || currentProgram.name
                        : isHe
                          ? "ללא תוכנית"
                          : "No program"}
                    </Badge>
                  </div>
                </div>
                <div className="hidden md:block">
                  <ArrowRight className="size-4 text-muted-foreground rtl:rotate-180" />
                </div>
                <select
                  value={project.parentId || ""}
                  onChange={(e) => onMove(project.id, e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm min-w-[200px] max-w-[260px]"
                >
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {isHe ? p.name : p.nameEn || p.name}
                    </option>
                  ))}
                </select>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function TasksHierarchy({
  nodes,
  onMove,
  locale,
}: {
  nodes: MockWbsNode[];
  onMove: (taskId: string, newWbsNodeId: string) => void;
  locale: string;
}) {
  const isHe = locale === "he";

  // Show only "leaf" nodes (project, goal, milestone, activity) where tasks can attach
  const attachableNodes = nodes.filter((n) =>
    ["project", "goal", "milestone", "activity"].includes(n.level)
  );

  return (
    <div className="space-y-4">
      <Card className="bg-purple-50/30 dark:bg-purple-950/10 border-purple-200 dark:border-purple-900">
        <CardContent className="p-4 flex items-start gap-3">
          <div className="size-8 rounded-lg bg-purple-100 dark:bg-purple-950 flex items-center justify-center shrink-0">
            <CheckSquare className="size-4 text-purple-600" />
          </div>
          <div className="text-sm">
            <div className="font-semibold text-purple-900 dark:text-purple-300">
              {isHe ? "שיוך משימות לפריטי WBS" : "Assign tasks to WBS items"}
            </div>
            <div className="text-xs text-purple-700 dark:text-purple-400 mt-1">
              {isHe
                ? "כל משימה יכולה להשתייך ל-Project, Goal, Milestone או Activity."
                : "Each task can be assigned to a Project, Goal, Milestone, or Activity."}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2 max-h-[60vh] overflow-y-auto">
        {mockTasks.slice(0, 12).map((task) => {
          const currentNode = nodes.find((n) => n.id === task.wbsNodeId);
          return (
            <Card key={task.id} className="card-hover">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="size-10 rounded-lg bg-purple-100 dark:bg-purple-950/30 flex items-center justify-center shrink-0">
                  <CheckSquare className="size-5 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm line-clamp-1">
                    {isHe ? task.title : task.titleEn || task.title}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                    <span>{isHe ? "תחת:" : "Under:"}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {currentNode
                        ? isHe
                          ? currentNode.name
                          : currentNode.nameEn || currentNode.name
                        : "—"}
                    </Badge>
                  </div>
                </div>
                <select
                  defaultValue={task.wbsNodeId}
                  onChange={(e) => onMove(task.id, e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm min-w-[200px] max-w-[260px]"
                >
                  {attachableNodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      [{n.level}] {isHe ? n.name : n.nameEn || n.name}
                    </option>
                  ))}
                </select>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="text-xs text-muted-foreground text-center">
        {isHe
          ? `מציג 12 משימות ראשונות מתוך ${mockTasks.length}`
          : `Showing first 12 of ${mockTasks.length} tasks`}
      </div>
    </div>
  );
}
