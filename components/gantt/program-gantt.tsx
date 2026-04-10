"use client";
import { useMemo, useState } from "react";
import type { MockTask, MockUser, MockWbsNode } from "@/lib/db/mock-data";
import { computeWbsNumbering, computeAllRollups } from "@/lib/gantt/rollup";
import { computeCriticalPath, getTaskHealth } from "@/lib/gantt/critical-path";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar } from "@/components/ui/avatar";
import {
  ChevronDown,
  ChevronRight,
  Zap,
  ZoomIn,
  ZoomOut,
  Flag,
  Target,
  Activity,
  CheckSquare,
  Folder,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { Link } from "@/lib/i18n/routing";

const STATUS_COLORS: Record<string, string> = {
  not_started: "#94a3b8",
  in_progress: "#3b82f6",
  review: "#f59e0b",
  done: "#10b981",
  blocked: "#ef4444",
  cancelled: "#64748b",
};

const HEALTH_COLORS = {
  green: "#10b981",
  amber: "#f59e0b",
  red: "#ef4444",
};

const LEVEL_ICONS: Record<string, typeof Folder> = {
  portfolio: Folder, program: Folder, project: Folder,
  goal: Target, milestone: Flag, activity: Activity,
  task: CheckSquare, subtask: CheckSquare,
};

const ROW_HEIGHT = 40;
const DAY_WIDTH_DEFAULT = 24;

interface Props {
  rootNodeId: string;
  allNodes: MockWbsNode[];
  allTasks: MockTask[];
  users: MockUser[];
  locale: string;
}

export function ProgramGantt({ rootNodeId, allNodes, allTasks, users, locale }: Props) {
  const isHe = locale === "he";
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [dayWidth, setDayWidth] = useState(DAY_WIDTH_DEFAULT);
  const [showCritical, setShowCritical] = useState(false);

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  // Compute numbering and rollups
  const numbering = useMemo(() => computeWbsNumbering(allNodes, [rootNodeId]), [allNodes, rootNodeId]);
  const rollups = useMemo(() => computeAllRollups(allNodes, allTasks), [allNodes, allTasks]);

  // All tasks under this root
  const rootDescendantIds = useMemo(() => {
    const ids = new Set([rootNodeId]);
    let queue = [rootNodeId];
    while (queue.length) {
      const next: string[] = [];
      for (const id of queue) {
        allNodes.filter((n) => n.parentId === id).forEach((c) => { ids.add(c.id); next.push(c.id); });
      }
      queue = next;
    }
    return ids;
  }, [allNodes, rootNodeId]);

  const scopeTasks = useMemo(
    () => allTasks.filter((t) => rootDescendantIds.has(t.wbsNodeId)),
    [allTasks, rootDescendantIds]
  );
  const cpm = useMemo(() => computeCriticalPath(scopeTasks), [scopeTasks]);

  // Build visible rows: WBS nodes (hierarchy) + their direct tasks
  type Row =
    | { kind: "wbs"; node: MockWbsNode; depth: number }
    | { kind: "task"; task: MockTask; depth: number };

  const rows: Row[] = useMemo(() => {
    const result: Row[] = [];
    function walk(parentId: string, depth: number) {
      const children = allNodes
        .filter((n) => n.parentId === parentId && rootDescendantIds.has(n.id))
        .sort((a, b) => a.position - b.position);
      for (const node of children) {
        result.push({ kind: "wbs", node, depth });
        if (!collapsed.has(node.id)) {
          // Direct tasks on this node
          const nodeTasks = scopeTasks.filter((t) => t.wbsNodeId === node.id);
          for (const task of nodeTasks) {
            result.push({ kind: "task", task, depth: depth + 1 });
          }
          walk(node.id, depth + 1);
        }
      }
    }
    // Start from root node itself
    const rootNode = allNodes.find((n) => n.id === rootNodeId);
    if (rootNode) {
      result.push({ kind: "wbs", node: rootNode, depth: 0 });
      if (!collapsed.has(rootNodeId)) {
        const rootTasks = scopeTasks.filter((t) => t.wbsNodeId === rootNodeId);
        for (const t of rootTasks) result.push({ kind: "task", task: t, depth: 1 });
        walk(rootNodeId, 1);
      }
    }
    return result;
  }, [allNodes, rootNodeId, rootDescendantIds, collapsed, scopeTasks]);

  // Date range
  const { startDate, totalDays, days } = useMemo(() => {
    const dates: number[] = [];
    for (const t of scopeTasks) {
      if (t.plannedStart) dates.push(new Date(t.plannedStart).getTime());
      if (t.plannedEnd) dates.push(new Date(t.plannedEnd).getTime());
    }
    // Also include rollup dates
    for (const id of rootDescendantIds) {
      const r = rollups.get(id);
      if (r?.plannedStart) dates.push(new Date(r.plannedStart).getTime());
      if (r?.plannedEnd) dates.push(new Date(r.plannedEnd).getTime());
    }
    if (!dates.length) {
      const t = new Date();
      return { startDate: t, totalDays: 30, days: Array.from({ length: 30 }, (_, i) => { const d = new Date(t); d.setDate(d.getDate() + i); return d; }) };
    }
    let min = new Date(Math.min(...dates));
    let max = new Date(Math.max(...dates));
    min.setDate(min.getDate() - 5);
    max.setDate(max.getDate() + 10);
    const total = Math.ceil((max.getTime() - min.getTime()) / 86400000);
    const list: Date[] = [];
    for (let i = 0; i <= total; i++) { const d = new Date(min); d.setDate(d.getDate() + i); list.push(d); }
    return { startDate: min, totalDays: total, days: list };
  }, [scopeTasks, rollups, rootDescendantIds]);

  const offsetForDate = (iso: string | null): number => {
    if (!iso) return 0;
    return ((new Date(iso).getTime() - startDate.getTime()) / 86400000) * dayWidth;
  };
  const widthForDates = (s: string | null, e: string | null): number => {
    if (!s || !e) return 0;
    return Math.max(((new Date(e).getTime() - new Date(s).getTime()) / 86400000) * dayWidth, 4);
  };

  const today = new Date();
  const todayOffset = ((today.getTime() - startDate.getTime()) / 86400000) * dayWidth;
  const WBS_WIDTH = 420;

  return (
    <div className="border rounded-lg overflow-hidden bg-card flex flex-col" style={{ height: "calc(100vh - 200px)", minHeight: 400 }}>
      {/* Toolbar */}
      <div className="px-3 py-2 border-b bg-muted/20 flex items-center justify-between gap-2 flex-wrap text-xs">
        <div className="flex items-center gap-2">
          <Button
            size="sm" variant={showCritical ? "default" : "outline"}
            onClick={() => setShowCritical(!showCritical)}
            className={cn("h-8", showCritical && "bg-red-600 hover:bg-red-700 text-white")}
          >
            <Zap className="size-3" />
            {isHe ? "נתיב קריטי" : "Critical Path"}
            {showCritical && <Badge variant="secondary" className="ms-1 text-[9px]">{cpm.criticalTaskIds.size}</Badge>}
          </Button>
          <Button size="sm" variant="outline" className="h-8"
            onClick={() => setCollapsed(new Set())}
          >
            {isHe ? "הרחב הכל" : "Expand"}
          </Button>
          <Button size="sm" variant="outline" className="h-8"
            onClick={() => setCollapsed(new Set(allNodes.map((n) => n.id)))}
          >
            {isHe ? "כווץ" : "Collapse"}
          </Button>
        </div>
        <div className="flex items-center bg-muted rounded-md">
          <button onClick={() => setDayWidth((w) => Math.max(8, w - 4))} className="size-7 flex items-center justify-center hover:bg-accent rounded-s-md">
            <ZoomOut className="size-3" />
          </button>
          <span className="px-1.5 font-mono">{dayWidth}</span>
          <button onClick={() => setDayWidth((w) => Math.min(60, w + 4))} className="size-7 flex items-center justify-center hover:bg-accent rounded-e-md">
            <ZoomIn className="size-3" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="px-3 py-1.5 border-b bg-background flex items-center gap-3 text-[10px] flex-wrap">
        <div className="flex items-center gap-1"><div className="w-3 h-1.5 rounded bg-slate-300/60 border border-slate-400" /><span>{isHe ? "מתוכנן" : "Planned"}</span></div>
        <div className="flex items-center gap-1"><div className="w-3 h-1.5 rounded bg-blue-500" /><span>{isHe ? "בביצוע" : "In Progress"}</span></div>
        <div className="flex items-center gap-1"><div className="w-3 h-1.5 rounded bg-emerald-500" /><span>{isHe ? "הושלם" : "Done"}</span></div>
        <div className="flex items-center gap-1"><div className="w-3 h-1.5 rounded bg-red-500" /><span>{isHe ? "באיחור/חסום" : "Overdue/Blocked"}</span></div>
        <div className="flex items-center gap-1"><Flag className="size-3 text-purple-600" /><span>{isHe ? "אבן דרך" : "Milestone"}</span></div>
        {showCritical && <div className="flex items-center gap-1"><Zap className="size-3 text-red-600" /><span>{isHe ? "קריטי" : "Critical"}</span></div>}
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* WBS Table */}
        <div className="shrink-0 border-e bg-background overflow-y-auto overflow-x-hidden" style={{ width: WBS_WIDTH }}>
          {/* Header */}
          <div className="flex items-center bg-muted/40 border-b px-2 text-[10px] font-semibold text-muted-foreground" style={{ height: 36 }}>
            <div className="w-10 px-1">#</div>
            <div className="flex-1 px-1">{isHe ? "שם" : "Name"}</div>
            <div className="w-12 text-end px-1">%</div>
          </div>
          {rows.map((row, idx) => {
            if (row.kind === "wbs") {
              const n = row.node;
              const num = numbering.get(n.id) || "";
              const r = rollups.get(n.id);
              const hasChildren = allNodes.some((c) => c.parentId === n.id) || scopeTasks.some((t) => t.wbsNodeId === n.id);
              const isCollapsedNode = collapsed.has(n.id);
              const Icon = LEVEL_ICONS[n.level] || Folder;
              return (
                <div key={`w-${n.id}`} className="flex items-center px-2 border-b hover:bg-accent/30" style={{ height: ROW_HEIGHT }}>
                  <div className="w-10 text-[9px] font-mono text-muted-foreground">{num}</div>
                  <div className="flex-1 flex items-center gap-1 min-w-0" style={{ paddingInlineStart: row.depth * 16 }}>
                    {hasChildren ? (
                      <button onClick={() => toggleCollapse(n.id)} className="size-4 flex items-center justify-center text-muted-foreground hover:text-foreground">
                        {isCollapsedNode ? <ChevronRight className="size-3 rtl:rotate-180" /> : <ChevronDown className="size-3" />}
                      </button>
                    ) : <span className="w-4" />}
                    <Icon className="size-3 shrink-0 text-muted-foreground" />
                    <Link href={n.level === "project" ? `/projects/${n.id}` : "#"} className="text-[11px] font-semibold truncate hover:text-primary">
                      {isHe ? n.name : n.nameEn || n.name}
                    </Link>
                  </div>
                  <div className="w-12 px-1">
                    {r && (
                      <div className="flex items-center gap-1">
                        <Progress value={r.weightedProgress} className="h-1 flex-1" />
                        <span className="text-[8px] text-muted-foreground">{Math.round(r.weightedProgress)}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            }
            // Task row
            const t = row.task;
            const assignee = users.find((u) => u.id === t.assigneeId);
            const isCrit = showCritical && cpm.criticalTaskIds.has(t.id);
            return (
              <div key={`t-${t.id}`} className={cn("flex items-center px-2 border-b hover:bg-accent/30", isCrit && "bg-red-50/50 dark:bg-red-950/10")} style={{ height: ROW_HEIGHT }}>
                <div className="w-10" />
                <div className="flex-1 flex items-center gap-1.5 min-w-0" style={{ paddingInlineStart: row.depth * 16 }}>
                  {isCrit && <Zap className="size-3 text-red-600 shrink-0" />}
                  {assignee && <Avatar src={assignee.image} fallback={assignee.name[0]} className="size-5 shrink-0" />}
                  <Link href={`/tasks/${t.id}`} className="text-[11px] truncate hover:text-primary">
                    {isHe ? t.title : t.titleEn || t.title}
                  </Link>
                </div>
                <div className="w-12 px-1">
                  <div className="flex items-center gap-0.5">
                    <Progress value={t.progressPercent} className="h-1 flex-1" />
                    <span className="text-[8px] text-muted-foreground">{t.progressPercent}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Gantt Chart */}
        <div className="flex-1 overflow-auto bg-background">
          <div style={{ minWidth: (totalDays + 1) * dayWidth, direction: "ltr" }}>
            {/* Date header */}
            <div className="sticky top-0 z-10 bg-muted/40 border-b flex" style={{ height: 36 }}>
              {days.map((d, i) => {
                const isToday = d.toDateString() === today.toDateString();
                const isFirstOfMonth = d.getDate() === 1;
                return (
                  <div key={i} className={cn(
                    "shrink-0 text-center border-e text-[8px] flex flex-col justify-center",
                    isToday && "bg-primary/15 font-bold text-primary",
                    (d.getDay() === 5 || d.getDay() === 6) && "bg-muted/30"
                  )} style={{ width: dayWidth }}>
                    {isFirstOfMonth && <div className="text-[7px] font-bold text-primary">{d.toLocaleDateString(isHe ? "he-IL" : "en-US", { month: "short" })}</div>}
                    <div>{d.getDate()}</div>
                  </div>
                );
              })}
            </div>

            {/* Rows */}
            <div className="relative" style={{ height: rows.length * ROW_HEIGHT }}>
              {/* Today line */}
              {todayOffset > 0 && todayOffset < totalDays * dayWidth && (
                <div className="absolute top-0 bottom-0 w-px bg-primary z-10" style={{ left: todayOffset }}>
                  <div className="absolute -top-0.5 -translate-x-1/2 size-2 rounded-full bg-primary" />
                </div>
              )}

              {rows.map((row, idx) => {
                const y = idx * ROW_HEIGHT;

                if (row.kind === "wbs") {
                  const r = rollups.get(row.node.id);
                  if (row.node.level === "milestone" && r?.plannedEnd) {
                    // Diamond milestone marker
                    const x = offsetForDate(r.plannedEnd);
                    return (
                      <div key={`g-w-${row.node.id}`} className="absolute inset-x-0 border-b border-border/20" style={{ top: y, height: ROW_HEIGHT }}>
                        <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-purple-600 border border-white shadow-sm" style={{ left: x - 8, transform: "translateY(-50%) rotate(45deg)" }} />
                      </div>
                    );
                  }
                  // Summary roll-up bar
                  if (r?.plannedStart && r?.plannedEnd) {
                    const x = offsetForDate(r.plannedStart);
                    const w = widthForDates(r.plannedStart, r.plannedEnd);
                    return (
                      <div key={`g-w-${row.node.id}`} className="absolute inset-x-0 border-b border-border/20" style={{ top: y, height: ROW_HEIGHT }}>
                        <div className="absolute top-1/2 -translate-y-1/2 h-1.5 bg-slate-600 dark:bg-slate-400 rounded-sm" style={{ left: x, width: w }} />
                        <div className="absolute top-1/2 -translate-y-1/2 size-2 bg-slate-600 dark:bg-slate-400" style={{ left: x }} />
                        <div className="absolute top-1/2 -translate-y-1/2 size-2 bg-slate-600 dark:bg-slate-400" style={{ left: x + w - 8 }} />
                      </div>
                    );
                  }
                  return <div key={`g-w-${row.node.id}`} className="absolute inset-x-0 border-b border-border/20" style={{ top: y, height: ROW_HEIGHT }} />;
                }

                // Task bar
                const t = row.task;
                const isCrit = showCritical && cpm.criticalTaskIds.has(t.id);
                const health = getTaskHealth(t);
                const barColor = t.status === "done" ? HEALTH_COLORS.green
                  : t.status === "blocked" ? HEALTH_COLORS.red
                  : health === "red" ? HEALTH_COLORS.red
                  : health === "amber" ? HEALTH_COLORS.amber
                  : STATUS_COLORS[t.status] || "#3b82f6";

                const plannedX = offsetForDate(t.plannedStart);
                const plannedW = widthForDates(t.plannedStart, t.plannedEnd);

                // Actual bar
                let actualEnd = t.actualEnd;
                if (!actualEnd && t.actualStart && t.plannedEnd) {
                  const s = new Date(t.actualStart).getTime();
                  const e = new Date(t.plannedEnd).getTime();
                  actualEnd = new Date(s + (e - s) * t.progressPercent / 100).toISOString();
                }
                const actualX = offsetForDate(t.actualStart);
                const actualW = t.actualStart && actualEnd ? widthForDates(t.actualStart, actualEnd) : 0;

                return (
                  <div key={`g-t-${t.id}`} className={cn("absolute inset-x-0 border-b border-border/20", isCrit && "bg-red-50/30 dark:bg-red-950/10")} style={{ top: y, height: ROW_HEIGHT }}>
                    {/* Planned (baseline) bar */}
                    {plannedW > 0 && (
                      <div className={cn("absolute h-2.5 rounded-sm border bg-slate-200/50 dark:bg-slate-700/30", isCrit ? "border-red-400" : "border-slate-400/50")}
                        style={{ left: plannedX, width: plannedW, top: 8 }}
                        title={`${isHe ? "מתוכנן" : "Planned"}: ${formatDate(t.plannedStart, locale as "he" | "en")} → ${formatDate(t.plannedEnd, locale as "he" | "en")}`}
                      />
                    )}
                    {/* Actual bar */}
                    {actualW > 0 && (
                      <div className={cn("absolute h-2.5 rounded-sm shadow-sm", isCrit && "ring-1 ring-red-500")}
                        style={{ left: actualX, width: actualW, top: 22, backgroundColor: barColor }}
                        title={`${t.title} - ${t.progressPercent}%`}
                      >
                        <div className="absolute inset-0 bg-black/15 rounded-sm" style={{ width: `${t.progressPercent}%` }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 border-t bg-muted/20 flex items-center justify-between text-[10px] text-muted-foreground">
        <div className="flex gap-3">
          <span><strong className="text-foreground">{rows.filter((r) => r.kind === "wbs").length}</strong> {isHe ? "חבילות עבודה" : "work packages"}</span>
          <span><strong className="text-foreground">{scopeTasks.length}</strong> {isHe ? "משימות" : "tasks"}</span>
          <span><strong className="text-foreground">{cpm.criticalTaskIds.size}</strong> {isHe ? "קריטיות" : "critical"}</span>
        </div>
      </div>
    </div>
  );
}
