"use client";
import { useState } from "react";
import type { MockTask, MockUser, MockWbsNode } from "@/lib/db/mock-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GanttChartSquare, Briefcase, Boxes, FolderTree } from "lucide-react";
import { cn } from "@/lib/utils";
import { txt } from "@/lib/utils/locale-text";
import { ProgramGantt } from "./program-gantt";

export function GanttPageClient({
  allNodes,
  allTasks,
  users,
  locale,
}: {
  allNodes: MockWbsNode[];
  allTasks: MockTask[];
  users: MockUser[];
  locale: string;
}) {
  // Selectable roots: portfolios, programs, projects
  const selectableNodes = allNodes.filter((n) =>
    ["portfolio", "program", "project"].includes(n.level)
  );

  const programs = selectableNodes.filter((n) => n.level === "program");
  const projects = selectableNodes.filter((n) => n.level === "project");
  const portfolios = selectableNodes.filter((n) => n.level === "portfolio");

  // Default to first program (Salesforce)
  const sfProgram = programs.find((p) => p.name.includes("Salesforce"));
  const [selectedId, setSelectedId] = useState<string>(sfProgram?.id || programs[0]?.id || projects[0]?.id || "");

  const selectedNode = allNodes.find((n) => n.id === selectedId);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1800px] mx-auto space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="size-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
              <GanttChartSquare className="size-5 text-white" />
            </div>
            {txt(locale, { he: "לוח גאנט ו-WBS", en: "Gantt Chart & WBS", ru: "Диаграмма Ганта и WBS", fr: "Diagramme de Gantt et WBS", es: "Diagrama de Gantt y WBS" })}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {txt(locale, { he: "תצוגת תכנון מול ביצוע עם מבנה חבילות עבודה היררכי, נתיב קריטי ואבני דרך", en: "Planned vs Actual with hierarchical work packages, critical path and milestones" })}
          </p>
        </div>
      </div>

      {/* Scope selector */}
      <div className="flex flex-wrap gap-1.5">
        {/* Programs */}
        {programs.length > 0 && (
          <>
            <span className="text-[10px] text-muted-foreground uppercase font-semibold self-center me-1">
              <FolderTree className="size-3 inline me-0.5" />
              {txt(locale, { he: "פרוגרמות:", en: "Programs:" })}
            </span>
            {programs.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium border transition-all min-h-[36px]",
                  selectedId === p.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:bg-accent"
                )}
              >
                {locale === "he" ? p.name : p.nameEn || p.name}
              </button>
            ))}
          </>
        )}
        {/* Projects */}
        {projects.length > 0 && (
          <>
            <span className="text-[10px] text-muted-foreground uppercase font-semibold self-center ms-2 me-1">
              <Briefcase className="size-3 inline me-0.5" />
              {txt(locale, { he: "פרויקטים:", en: "Projects:" })}
            </span>
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium border transition-all min-h-[36px]",
                  selectedId === p.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:bg-accent"
                )}
              >
                {locale === "he" ? p.name : p.nameEn || p.name}
              </button>
            ))}
          </>
        )}
      </div>

      {/* Gantt chart */}
      {selectedId ? (
        <ProgramGantt
          key={selectedId}
          rootNodeId={selectedId}
          allNodes={allNodes}
          allTasks={allTasks}
          users={users}
          locale={locale}
        />
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {txt(locale, { he: "בחר פרוגרמה או פרויקט להצגת הגאנט", en: "Select a program or project to display the Gantt chart" })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
