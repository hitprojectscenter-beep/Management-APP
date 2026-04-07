"use client";
import { useMemo, useState, useRef, useEffect } from "react";
import type { MockTask, MockUser, MockWbsNode } from "@/lib/db/mock-data";
import { computeCriticalPath, getTaskHealth } from "@/lib/gantt/critical-path";
import { computeAllRollups, computeWbsNumbering, getDescendants } from "@/lib/gantt/rollup";
import { exportToCsv, buildExportRows, printAsPdf } from "@/lib/gantt/export";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Zap,
  Download,
  Printer,
  ZoomIn,
  ZoomOut,
  Flag,
  ChevronRight,
  ChevronDown,
  Info,
  ShieldAlert,
  Target,
  Clock,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

const HEALTH_COLORS = {
  green: { bar: "#10B981", text: "text-emerald-600", bg: "bg-emerald-100", border: "border-emerald-500" },
  amber: { bar: "#F59E0B", text: "text-amber-600", bg: "bg-amber-100", border: "border-amber-500" },
  red: { bar: "#EF4444", text: "text-red-600", bg: "bg-red-100", border: "border-red-500" },
} as const;

const LEVEL_INDENT = 18;
const ROW_HEIGHT = 44;
const HEADER_HEIGHT = 60;
const WBS_TABLE_WIDTH = 480;
const DEFAULT_DAY_WIDTH = 32;

interface Props {
  tasks: MockTask[];
  users: MockUser[];
  allWbsNodes: MockWbsNode[];
  rootNodeId: string; // the project node we're displaying
  locale: string;
}

export function AdvancedGantt({ tasks, users, allWbsNodes, rootNodeId, locale }: Props) {
  const isHe = locale === "he";

  // ============================================================
  // State
  // ============================================================
  const [showCriticalPath, setShowCriticalPath] = useState(false);
  const [showBuffer, setShowBuffer] = useState(true);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [dayWidth, setDayWidth] = useState(DEFAULT_DAY_WIDTH);
  const ganttScrollRef = useRef<HTMLDivElement>(null);
  const wbsScrollRef = useRef<HTMLDivElement>(null);

  // ============================================================
  // Computations
  // ============================================================

  // Get all WBS nodes within the project (root + descendants) - sorted hierarchically
  const projectNodes = useMemo(() => {
    const root = allWbsNodes.find((n) => n.id === rootNodeId);
    if (!root) return [];
    const all: MockWbsNode[] = [];

    function walk(nodes: MockWbsNode[], depth: number) {
      const sorted = [...nodes].sort((a, b) => a.position - b.position);
      for (const node of sorted) {
        all.push(node);
        const children = allWbsNodes.filter((n) => n.parentId === node.id);
        if (children.length > 0 && !collapsed.has(node.id)) {
          walk(children, depth + 1);
        }
      }
    }

    walk([root], 0);
    return all;
  }, [allWbsNodes, rootNodeId, collapsed]);

  // Filter to only WBS nodes IN this project (collapsed-aware)
  const visibleNodes = projectNodes;

  // Get all tasks within this project (regardless of collapse)
  const projectTaskIds = useMemo(() => {
    const allDescendants = getDescendants(rootNodeId, allWbsNodes);
    const nodeIds = new Set([rootNodeId, ...allDescendants.map((n) => n.id)]);
    return new Set(tasks.filter((t) => nodeIds.has(t.wbsNodeId)).map((t) => t.id));
  }, [allWbsNodes, rootNodeId, tasks]);

  const projectTasks = useMemo(
    () => tasks.filter((t) => projectTaskIds.has(t.id)),
    [tasks, projectTaskIds]
  );

  // Visible tasks - only those whose parent node is visible (not collapsed)
  const visibleNodeIds = new Set(visibleNodes.map((n) => n.id));
  const visibleTasks = projectTasks.filter((t) => visibleNodeIds.has(t.wbsNodeId));

  // Critical Path
  const cpm = useMemo(() => computeCriticalPath(projectTasks), [projectTasks]);

  // Roll-ups (recursive aggregation)
  const rollups = useMemo(
    () => computeAllRollups(allWbsNodes, tasks),
    [allWbsNodes, tasks]
  );

  // Auto-numbering (1.1, 1.2.1 etc.)
  const numbering = useMemo(
    () => computeWbsNumbering(allWbsNodes, [rootNodeId]),
    [allWbsNodes, rootNodeId]
  );

  // Date range
  const { startDate, endDate, totalDays, days } = useMemo(() => {
    const dates: number[] = [];
    for (const t of projectTasks) {
      if (t.plannedStart) dates.push(new Date(t.plannedStart).getTime());
      if (t.plannedEnd) dates.push(new Date(t.plannedEnd).getTime());
      if (t.actualStart) dates.push(new Date(t.actualStart).getTime());
      if (t.actualEnd) dates.push(new Date(t.actualEnd).getTime());
    }
    if (dates.length === 0) {
      const today = new Date();
      return { startDate: today, endDate: today, totalDays: 0, days: [] };
    }
    let min = new Date(Math.min(...dates));
    let max = new Date(Math.max(...dates));
    min.setDate(min.getDate() - 3);
    max.setDate(max.getDate() + 7); // extra space for buffer
    const total = Math.ceil((max.getTime() - min.getTime()) / (1000 * 60 * 60 * 24));
    const list: Date[] = [];
    for (let i = 0; i <= total; i++) {
      const d = new Date(min);
      d.setDate(d.getDate() + i);
      list.push(d);
    }
    return { startDate: min, endDate: max, totalDays: total, days: list };
  }, [projectTasks]);

  // ============================================================
  // Helpers
  // ============================================================

  const offsetForDate = (iso: string | null): number => {
    if (!iso) return 0;
    const t = new Date(iso).getTime();
    return ((t - startDate.getTime()) / (1000 * 60 * 60 * 24)) * dayWidth;
  };

  const widthForDates = (startIso: string | null, endIso: string | null): number => {
    if (!startIso || !endIso) return 0;
    const s = new Date(startIso).getTime();
    const e = new Date(endIso).getTime();
    return Math.max(((e - s) / (1000 * 60 * 60 * 24)) * dayWidth, 4);
  };

  const today = new Date();
  const todayOffset = ((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) * dayWidth;

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Expand all / Collapse all
  const expandAll = () => setCollapsed(new Set());
  const collapseAll = () => setCollapsed(new Set(allWbsNodes.map((n) => n.id)));

  // Sync scroll between WBS table and Gantt chart
  useEffect(() => {
    const wbs = wbsScrollRef.current;
    const gantt = ganttScrollRef.current;
    if (!wbs || !gantt) return;
    let syncing = false;
    const syncFromWbs = () => {
      if (syncing) return;
      syncing = true;
      gantt.scrollTop = wbs.scrollTop;
      requestAnimationFrame(() => (syncing = false));
    };
    const syncFromGantt = () => {
      if (syncing) return;
      syncing = true;
      wbs.scrollTop = gantt.scrollTop;
      requestAnimationFrame(() => (syncing = false));
    };
    wbs.addEventListener("scroll", syncFromWbs);
    gantt.addEventListener("scroll", syncFromGantt);
    return () => {
      wbs.removeEventListener("scroll", syncFromWbs);
      gantt.removeEventListener("scroll", syncFromGantt);
    };
  }, []);

  // Export handler
  const handleExportCsv = () => {
    const rows = buildExportRows(visibleNodes, projectTasks, rollups, numbering, users);
    exportToCsv(rows, `gantt-${rootNodeId}-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  // ============================================================
  // Render
  // ============================================================

  // Build the row list - mix WBS nodes and their direct tasks
  type Row =
    | { kind: "wbs"; node: MockWbsNode; depth: number }
    | { kind: "task"; task: MockTask; depth: number; parentNumber: string };

  const rows: Row[] = useMemo(() => {
    const result: Row[] = [];
    const depthMap = new Map<string, number>();
    depthMap.set(rootNodeId, 0);

    function getDepth(nodeId: string): number {
      if (depthMap.has(nodeId)) return depthMap.get(nodeId)!;
      const node = allWbsNodes.find((n) => n.id === nodeId);
      if (!node || !node.parentId) {
        depthMap.set(nodeId, 0);
        return 0;
      }
      const d = getDepth(node.parentId) + 1;
      depthMap.set(nodeId, d);
      return d;
    }

    for (const node of visibleNodes) {
      const depth = getDepth(node.id);
      result.push({ kind: "wbs", node, depth });
      // Tasks directly attached to this node
      const directTasks = visibleTasks.filter((t) => t.wbsNodeId === node.id);
      for (const task of directTasks) {
        result.push({
          kind: "task",
          task,
          depth: depth + 1,
          parentNumber: numbering.get(node.id) || "",
        });
      }
    }
    return result;
  }, [visibleNodes, visibleTasks, allWbsNodes, rootNodeId, numbering]);

  const totalRows = rows.length;
  const ganttContentHeight = totalRows * ROW_HEIGHT;

  return (
    <div className="flex flex-col bg-card border rounded-lg overflow-hidden h-[calc(100vh-280px)] min-h-[500px]">
      {/* ===== Toolbar ===== */}
      <div className="px-4 py-2.5 border-b bg-muted/20 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={showCriticalPath ? "default" : "outline"}
            size="sm"
            onClick={() => setShowCriticalPath(!showCriticalPath)}
            className={showCriticalPath ? "bg-red-600 hover:bg-red-700 text-white" : ""}
          >
            <Zap className="size-3.5" />
            {isHe ? "נתיב קריטי" : "Critical Path"}
            {showCriticalPath && cpm.criticalTaskIds.size > 0 && (
              <Badge variant="secondary" className="text-[9px] ms-1">{cpm.criticalTaskIds.size}</Badge>
            )}
          </Button>
          <Button
            variant={showBuffer ? "default" : "outline"}
            size="sm"
            onClick={() => setShowBuffer(!showBuffer)}
          >
            <Target className="size-3.5" />
            {isHe ? "חוצץ זמן" : "Buffer"}
          </Button>
          <div className="h-6 w-px bg-border mx-1" />
          <Button variant="outline" size="sm" onClick={expandAll}>
            <ChevronDown className="size-3.5" />
            {isHe ? "הרחב הכל" : "Expand All"}
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>
            <ChevronRight className="size-3.5" />
            {isHe ? "כווץ הכל" : "Collapse All"}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-muted rounded-md">
            <button
              onClick={() => setDayWidth((w) => Math.max(16, w - 8))}
              className="size-7 flex items-center justify-center hover:bg-accent rounded-s-md"
              title={isHe ? "התרחק" : "Zoom out"}
            >
              <ZoomOut className="size-3.5" />
            </button>
            <span className="px-2 text-xs font-mono">{dayWidth}px</span>
            <button
              onClick={() => setDayWidth((w) => Math.min(80, w + 8))}
              className="size-7 flex items-center justify-center hover:bg-accent rounded-e-md"
              title={isHe ? "התקרב" : "Zoom in"}
            >
              <ZoomIn className="size-3.5" />
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={handleExportCsv}>
            <Download className="size-3.5" />
            {isHe ? "Excel" : "CSV"}
          </Button>
          <Button variant="outline" size="sm" onClick={printAsPdf}>
            <Printer className="size-3.5" />
            {isHe ? "PDF" : "Print"}
          </Button>
        </div>
      </div>

      {/* ===== Legend ===== */}
      <div className="px-4 py-2 border-b bg-background flex items-center gap-4 text-[11px] flex-wrap">
        <div className="flex items-center gap-1.5">
          <Info className="size-3 text-blue-500" />
          <span className="text-muted-foreground">{isHe ? "מקרא:" : "Legend:"}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-2 rounded bg-slate-300/50 border border-slate-400" />
          <span>{isHe ? "מתוכנן" : "Planned (Baseline)"}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-2.5 rounded bg-emerald-500" />
          <span>{isHe ? "ביצוע" : "Actual"}</span>
        </div>
        <div className="flex items-center gap-1">
          <Flag className="size-3 text-purple-600" />
          <span>{isHe ? "אבן דרך" : "Milestone"}</span>
        </div>
        <div className="flex items-center gap-1">
          <Zap className="size-3 text-red-600" />
          <span>{isHe ? "נתיב קריטי" : "Critical"}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-2 rounded bg-blue-200 border border-blue-400 border-dashed" />
          <span>{isHe ? "חוצץ זמן" : "Buffer"}</span>
        </div>
      </div>

      {/* ===== Main content (WBS table + Gantt chart side by side) ===== */}
      <div className="flex flex-1 overflow-hidden">
        {/* WBS table (left side) */}
        <div className="shrink-0 border-e bg-background flex flex-col" style={{ width: WBS_TABLE_WIDTH }}>
          {/* WBS header */}
          <div
            className="flex items-center bg-muted/40 border-b px-2 text-[11px] font-semibold text-muted-foreground"
            style={{ height: HEADER_HEIGHT }}
          >
            <div className="w-12 px-1">{isHe ? "מס׳" : "#"}</div>
            <div className="flex-1 px-2">{isHe ? "שם פריט" : "Item Name"}</div>
            <div className="w-16 text-end px-1">{isHe ? "שעות" : "Hours"}</div>
            <div className="w-14 text-end px-1">{isHe ? "התקדמות" : "Progress"}</div>
          </div>
          {/* WBS rows - scrollable */}
          <div ref={wbsScrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
            <div style={{ height: ganttContentHeight }}>
              {rows.map((row, idx) => {
                if (row.kind === "wbs") {
                  const node = row.node;
                  const number = numbering.get(node.id) || "";
                  const rollup = rollups.get(node.id);
                  const hasChildren =
                    allWbsNodes.some((n) => n.parentId === node.id) ||
                    projectTasks.some((t) => t.wbsNodeId === node.id);
                  const isCollapsed = collapsed.has(node.id);
                  return (
                    <div
                      key={`wbs-${node.id}`}
                      className="flex items-center px-2 border-b hover:bg-accent/40 group"
                      style={{ height: ROW_HEIGHT }}
                    >
                      <div className="w-12 px-1 text-[10px] font-mono text-muted-foreground">{number}</div>
                      <div className="flex-1 px-2 flex items-center gap-1 min-w-0" style={{ paddingInlineStart: row.depth * LEVEL_INDENT + 8 }}>
                        {hasChildren ? (
                          <button
                            onClick={() => toggleCollapse(node.id)}
                            className="size-4 flex items-center justify-center text-muted-foreground hover:text-foreground"
                          >
                            {isCollapsed ? (
                              <ChevronRight className="size-3 rtl:rotate-180" />
                            ) : (
                              <ChevronDown className="size-3" />
                            )}
                          </button>
                        ) : (
                          <span className="w-4" />
                        )}
                        <Badge variant="outline" className="text-[8px] py-0 px-1 uppercase font-mono">
                          {node.level.slice(0, 4)}
                        </Badge>
                        <span className="text-xs font-semibold truncate" title={node.name}>
                          {isHe ? node.name : node.nameEn || node.name}
                        </span>
                      </div>
                      <div className="w-16 text-end px-1 text-[10px] text-muted-foreground font-mono">
                        {rollup ? `${Math.round(rollup.totalActualHours)}/${Math.round(rollup.totalEstimateHours)}` : "—"}
                      </div>
                      <div className="w-14 px-1">
                        {rollup && (
                          <div className="flex items-center gap-1">
                            <Progress value={rollup.weightedProgress} className="h-1 flex-1" />
                            <span className="text-[9px] text-muted-foreground w-6 text-end">
                              {Math.round(rollup.weightedProgress)}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                } else {
                  const task = row.task;
                  const isCritical = cpm.criticalTaskIds.has(task.id);
                  const assignee = users.find((u) => u.id === task.assigneeId);
                  return (
                    <div
                      key={`task-${task.id}`}
                      className={cn(
                        "flex items-center px-2 border-b hover:bg-accent/40",
                        isCritical && showCriticalPath && "bg-red-50/50 dark:bg-red-950/10"
                      )}
                      style={{ height: ROW_HEIGHT }}
                    >
                      <div className="w-12 px-1" />
                      <div
                        className="flex-1 px-2 flex items-center gap-1.5 min-w-0"
                        style={{ paddingInlineStart: row.depth * LEVEL_INDENT + 16 }}
                      >
                        {isCritical && showCriticalPath && (
                          <Zap className="size-3 text-red-600 shrink-0" />
                        )}
                        {assignee && (
                          <Avatar src={assignee.image} fallback={assignee.name[0]} className="size-5 shrink-0" />
                        )}
                        <span className="text-xs truncate" title={task.title}>
                          {isHe ? task.title : task.titleEn || task.title}
                        </span>
                      </div>
                      <div className="w-16 text-end px-1 text-[10px] text-muted-foreground font-mono">
                        {task.actualHours}/{task.estimateHours}
                      </div>
                      <div className="w-14 px-1">
                        <div className="flex items-center gap-1">
                          <Progress value={task.progressPercent} className="h-1 flex-1" />
                          <span className="text-[9px] text-muted-foreground w-6 text-end">
                            {task.progressPercent}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          </div>
        </div>

        {/* Gantt chart (right side) */}
        <div ref={ganttScrollRef} className="flex-1 overflow-auto bg-background relative">
          <div
            style={{
              minWidth: (totalDays + 1) * dayWidth,
              direction: "ltr",
            }}
          >
            {/* Date header */}
            <div
              className="sticky top-0 z-20 bg-muted/40 border-b flex"
              style={{ height: HEADER_HEIGHT }}
            >
              {/* Month labels (top row) */}
              <div className="absolute top-0 inset-x-0 h-7 flex border-b border-border/50">
                {(() => {
                  const monthGroups: { month: string; year: number; start: number; width: number }[] = [];
                  let currentMonth = -1;
                  let currentYear = -1;
                  let groupStart = 0;
                  days.forEach((d, i) => {
                    if (d.getMonth() !== currentMonth || d.getFullYear() !== currentYear) {
                      if (currentMonth !== -1) {
                        monthGroups.push({
                          month: new Date(currentYear, currentMonth, 1).toLocaleDateString(
                            isHe ? "he-IL" : "en-US",
                            { month: "long", year: "numeric" }
                          ),
                          year: currentYear,
                          start: groupStart * dayWidth,
                          width: (i - groupStart) * dayWidth,
                        });
                      }
                      currentMonth = d.getMonth();
                      currentYear = d.getFullYear();
                      groupStart = i;
                    }
                  });
                  monthGroups.push({
                    month: new Date(currentYear, currentMonth, 1).toLocaleDateString(
                      isHe ? "he-IL" : "en-US",
                      { month: "long", year: "numeric" }
                    ),
                    year: currentYear,
                    start: groupStart * dayWidth,
                    width: (days.length - groupStart) * dayWidth,
                  });
                  return monthGroups.map((g, i) => (
                    <div
                      key={i}
                      className="border-e text-[10px] font-bold flex items-center justify-center bg-muted/60"
                      style={{ width: g.width, minWidth: g.width }}
                    >
                      {g.month}
                    </div>
                  ));
                })()}
              </div>
              {/* Day cells (bottom row) */}
              <div className="absolute top-7 inset-x-0 bottom-0 flex">
                {days.map((day, idx) => {
                  const isToday = day.toDateString() === today.toDateString();
                  const isWeekend = day.getDay() === 5 || day.getDay() === 6;
                  return (
                    <div
                      key={idx}
                      className={cn(
                        "shrink-0 text-[9px] text-center border-e flex flex-col justify-center",
                        isToday && "bg-primary/15 font-bold text-primary",
                        isWeekend && "bg-muted/30"
                      )}
                      style={{ width: dayWidth }}
                    >
                      <div className="text-muted-foreground">
                        {day.toLocaleDateString(isHe ? "he-IL" : "en-US", { weekday: "narrow" })}
                      </div>
                      <div className="font-semibold">{day.getDate()}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Rows area */}
            <div className="relative" style={{ height: ganttContentHeight }}>
              {/* Today line */}
              {todayOffset >= 0 && todayOffset <= totalDays * dayWidth && (
                <div
                  className="absolute top-0 bottom-0 w-px bg-primary z-10 pointer-events-none"
                  style={{ left: todayOffset }}
                >
                  <div className="absolute -top-1 -translate-x-1/2 size-2 rounded-full bg-primary" />
                </div>
              )}

              {/* Weekend background stripes */}
              {days.map((day, idx) => {
                if (day.getDay() !== 5 && day.getDay() !== 6) return null;
                return (
                  <div
                    key={`wknd-${idx}`}
                    className="absolute top-0 bottom-0 bg-muted/20 pointer-events-none"
                    style={{ left: idx * dayWidth, width: dayWidth }}
                  />
                );
              })}

              {/* Task rows */}
              {rows.map((row, rowIdx) => {
                if (row.kind === "wbs") {
                  const node = row.node;
                  const rollup = rollups.get(node.id);
                  const isProject = node.level === "project";
                  const isMilestone = node.level === "milestone";

                  if (isMilestone && rollup?.plannedEnd) {
                    // Render as diamond marker
                    const x = offsetForDate(rollup.plannedEnd);
                    return (
                      <div
                        key={`row-${rowIdx}`}
                        className="absolute inset-x-0 border-b border-border/30"
                        style={{ top: rowIdx * ROW_HEIGHT, height: ROW_HEIGHT }}
                      >
                        <div
                          className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-purple-600 border-2 border-white shadow-md flex items-center justify-center"
                          style={{
                            left: x - 10,
                            transform: "translateY(-50%) rotate(45deg)",
                          }}
                          title={node.name}
                        >
                          <Flag className="size-2.5 text-white" style={{ transform: "rotate(-45deg)" }} />
                        </div>
                      </div>
                    );
                  }

                  if (rollup?.plannedStart && rollup?.plannedEnd) {
                    // Roll-up bar (summary)
                    const x = offsetForDate(rollup.plannedStart);
                    const w = widthForDates(rollup.plannedStart, rollup.plannedEnd);
                    return (
                      <div
                        key={`row-${rowIdx}`}
                        className="absolute inset-x-0 border-b border-border/30"
                        style={{ top: rowIdx * ROW_HEIGHT, height: ROW_HEIGHT }}
                      >
                        <div
                          className="absolute top-1/2 -translate-y-1/2 h-1.5 bg-slate-700 dark:bg-slate-300 rounded-sm"
                          style={{ left: x, width: w }}
                          title={`${node.name}: ${formatDate(rollup.plannedStart, locale as "he" | "en")} → ${formatDate(rollup.plannedEnd, locale as "he" | "en")}`}
                        />
                        {/* End caps */}
                        <div className="absolute top-1/2 -translate-y-1/2 size-2 bg-slate-700 dark:bg-slate-300" style={{ left: x }} />
                        <div className="absolute top-1/2 -translate-y-1/2 size-2 bg-slate-700 dark:bg-slate-300" style={{ left: x + w - 8 }} />
                      </div>
                    );
                  }

                  return (
                    <div
                      key={`row-${rowIdx}`}
                      className="absolute inset-x-0 border-b border-border/30"
                      style={{ top: rowIdx * ROW_HEIGHT, height: ROW_HEIGHT }}
                    />
                  );
                }

                // Task row
                const task = row.task;
                const isCritical = cpm.criticalTaskIds.has(task.id);
                const isHighlightCritical = isCritical && showCriticalPath;
                const health = getTaskHealth(task);
                const colors = HEALTH_COLORS[health];

                // Planned bar
                const plannedX = offsetForDate(task.plannedStart);
                const plannedW = widthForDates(task.plannedStart, task.plannedEnd);

                // Actual bar - either actualEnd if done, or based on progress
                let actualEnd = task.actualEnd;
                if (!actualEnd && task.actualStart && task.plannedEnd) {
                  // In progress: estimate based on progress%
                  const start = new Date(task.actualStart).getTime();
                  const plannedEnd = new Date(task.plannedEnd).getTime();
                  const total = plannedEnd - start;
                  const completed = (total * task.progressPercent) / 100;
                  actualEnd = new Date(start + completed).toISOString();
                }
                const actualX = offsetForDate(task.actualStart);
                const actualW = task.actualStart && actualEnd ? widthForDates(task.actualStart, actualEnd) : 0;

                return (
                  <div
                    key={`row-${rowIdx}`}
                    className={cn(
                      "absolute inset-x-0 border-b border-border/30 group",
                      isHighlightCritical && "bg-red-50/50 dark:bg-red-950/10"
                    )}
                    style={{ top: rowIdx * ROW_HEIGHT, height: ROW_HEIGHT }}
                  >
                    {/* Planned bar (baseline) */}
                    {plannedW > 0 && (
                      <div
                        className={cn(
                          "absolute top-2 h-3 rounded-sm border bg-slate-200/60 dark:bg-slate-700/40",
                          isHighlightCritical ? "border-red-400" : "border-slate-400 dark:border-slate-600"
                        )}
                        style={{ left: plannedX, width: plannedW }}
                        title={`${isHe ? "מתוכנן" : "Planned"}: ${formatDate(task.plannedStart, locale as "he" | "en")} → ${formatDate(task.plannedEnd, locale as "he" | "en")}`}
                      />
                    )}

                    {/* Actual bar (overlay below planned) */}
                    {actualW > 0 && (
                      <div
                        className={cn(
                          "absolute h-3 rounded-sm shadow-sm transition-all",
                          isHighlightCritical && "ring-2 ring-red-500 ring-offset-1"
                        )}
                        style={{
                          left: actualX,
                          width: actualW,
                          top: 22,
                          backgroundColor: colors.bar,
                        }}
                        title={`${task.title} - ${task.progressPercent}% (${health})`}
                      >
                        <div
                          className="absolute inset-0 bg-black/20 rounded-sm"
                          style={{ width: `${task.progressPercent}%` }}
                        />
                      </div>
                    )}

                    {/* Critical zap indicator */}
                    {isHighlightCritical && plannedW > 0 && (
                      <div
                        className="absolute top-1 size-3 flex items-center justify-center"
                        style={{ left: plannedX + plannedW - 14 }}
                      >
                        <Zap className="size-3 text-red-600" fill="currentColor" />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Buffer at end of critical path */}
              {showBuffer && cpm.criticalTaskIds.size > 0 && (() => {
                // Find the latest end of critical path tasks
                const criticalTasks = projectTasks.filter((t) => cpm.criticalTaskIds.has(t.id));
                if (criticalTasks.length === 0) return null;
                const latestEnd = Math.max(
                  ...criticalTasks.map((t) =>
                    t.plannedEnd ? new Date(t.plannedEnd).getTime() : 0
                  )
                );
                if (latestEnd === 0) return null;
                const bufferDays = 7; // 7-day buffer
                const x = ((latestEnd - startDate.getTime()) / (1000 * 60 * 60 * 24)) * dayWidth;
                const w = bufferDays * dayWidth;
                return (
                  <div
                    className="absolute pointer-events-none"
                    style={{ top: 0, bottom: 0, left: x, width: w }}
                  >
                    <div className="absolute inset-y-2 w-full bg-blue-100/40 dark:bg-blue-950/20 border-2 border-dashed border-blue-400 rounded">
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 text-[8px] font-bold bg-blue-500 text-white rounded uppercase tracking-wider whitespace-nowrap">
                        {isHe ? "חוצץ זמן" : "Time Buffer"}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* ===== Footer stats ===== */}
      <div className="px-4 py-2 border-t bg-muted/20 flex items-center justify-between text-[11px] text-muted-foreground">
        <div className="flex gap-4">
          <span>
            <strong className="text-foreground">{visibleNodes.length}</strong>{" "}
            {isHe ? "פריטי WBS" : "WBS items"}
          </span>
          <span>
            <strong className="text-foreground">{projectTasks.length}</strong>{" "}
            {isHe ? "משימות" : "tasks"}
          </span>
          <span>
            <strong className="text-foreground">{cpm.criticalTaskIds.size}</strong>{" "}
            {isHe ? "במסלול קריטי" : "on critical path"}
          </span>
          <span>
            <strong className="text-foreground">{Math.round(cpm.totalDays)}</strong>{" "}
            {isHe ? "ימי עבודה" : "work days"}
          </span>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <Clock className="size-3" />
          {isHe ? "עדכון אחרון:" : "Updated:"} {new Date().toLocaleString(isHe ? "he-IL" : "en-US")}
        </div>
      </div>
    </div>
  );
}
