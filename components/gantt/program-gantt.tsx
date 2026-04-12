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
  ChevronDown, ChevronRight, Zap, ZoomIn, ZoomOut, Flag, Target,
  Activity, CheckSquare, Folder, X, Calendar, Clock, User as UserIcon,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { Link } from "@/lib/i18n/routing";

const ROW_HEIGHT = 32;
const DAY_WIDTH_DEFAULT = 22;

interface Props {
  rootNodeId: string;
  allNodes: MockWbsNode[];
  allTasks: MockTask[];
  users: MockUser[];
  locale: string;
}

// Popup detail for clicked entity
interface SelectedEntity {
  type: "wbs" | "task";
  id: string;
  x: number;
  y: number;
}

export function ProgramGantt({ rootNodeId, allNodes, allTasks, users, locale }: Props) {
  const isHe = locale === "he";
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [dayWidth, setDayWidth] = useState(DAY_WIDTH_DEFAULT);
  const [showCritical, setShowCritical] = useState(false);
  const [selected, setSelected] = useState<SelectedEntity | null>(null);

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const numbering = useMemo(() => computeWbsNumbering(allNodes, [rootNodeId]), [allNodes, rootNodeId]);
  const rollups = useMemo(() => computeAllRollups(allNodes, allTasks), [allNodes, allTasks]);

  const rootDescendantIds = useMemo(() => {
    const ids = new Set([rootNodeId]);
    let queue = [rootNodeId];
    while (queue.length) {
      const next: string[] = [];
      for (const id of queue) allNodes.filter((n) => n.parentId === id).forEach((c) => { ids.add(c.id); next.push(c.id); });
      queue = next;
    }
    return ids;
  }, [allNodes, rootNodeId]);

  const scopeTasks = useMemo(() => allTasks.filter((t) => rootDescendantIds.has(t.wbsNodeId)), [allTasks, rootDescendantIds]);
  const cpm = useMemo(() => computeCriticalPath(scopeTasks), [scopeTasks]);

  // Build rows
  type Row = { kind: "wbs"; node: MockWbsNode; depth: number } | { kind: "task"; task: MockTask; depth: number };

  const rows: Row[] = useMemo(() => {
    const result: Row[] = [];
    function walk(parentId: string, depth: number) {
      const children = allNodes.filter((n) => n.parentId === parentId && rootDescendantIds.has(n.id)).sort((a, b) => a.position - b.position);
      for (const node of children) {
        result.push({ kind: "wbs", node, depth });
        if (!collapsed.has(node.id)) {
          scopeTasks.filter((t) => t.wbsNodeId === node.id).forEach((t) => result.push({ kind: "task", task: t, depth: depth + 1 }));
          walk(node.id, depth + 1);
        }
      }
    }
    const rootNode = allNodes.find((n) => n.id === rootNodeId);
    if (rootNode) {
      result.push({ kind: "wbs", node: rootNode, depth: 0 });
      if (!collapsed.has(rootNodeId)) {
        scopeTasks.filter((t) => t.wbsNodeId === rootNodeId).forEach((t) => result.push({ kind: "task", task: t, depth: 1 }));
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
    for (const id of rootDescendantIds) {
      const r = rollups.get(id);
      if (r?.plannedStart) dates.push(new Date(r.plannedStart).getTime());
      if (r?.plannedEnd) dates.push(new Date(r.plannedEnd).getTime());
    }
    if (!dates.length) {
      const t = new Date();
      return { startDate: t, totalDays: 60, days: Array.from({ length: 60 }, (_, i) => { const d = new Date(t); d.setDate(d.getDate() + i); return d; }) };
    }
    let min = new Date(Math.min(...dates)); let max = new Date(Math.max(...dates));
    min.setDate(min.getDate() - 7); max.setDate(max.getDate() + 14);
    const total = Math.ceil((max.getTime() - min.getTime()) / 86400000);
    const list: Date[] = [];
    for (let i = 0; i <= total; i++) { const d = new Date(min); d.setDate(d.getDate() + i); list.push(d); }
    return { startDate: min, totalDays: total, days: list };
  }, [scopeTasks, rollups, rootDescendantIds]);

  const offsetForDate = (iso: string | null) => iso ? ((new Date(iso).getTime() - startDate.getTime()) / 86400000) * dayWidth : 0;
  const widthForDates = (s: string | null, e: string | null) => (s && e) ? Math.max(((new Date(e).getTime() - new Date(s).getTime()) / 86400000) * dayWidth, 4) : 0;

  const today = new Date();
  const todayOffset = ((today.getTime() - startDate.getTime()) / 86400000) * dayWidth;
  const TABLE_WIDTH = 520; // desktop; on mobile we use CSS classes instead

  // Get duration in days
  const getDuration = (start: string | null, end: string | null) => {
    if (!start || !end) return "—";
    const d = Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / 86400000);
    return `${d} ${isHe ? "ימים" : "d"}`;
  };

  // Selected entity detail popup
  const selectedData = useMemo(() => {
    if (!selected) return null;
    if (selected.type === "task") {
      const task = scopeTasks.find((t) => t.id === selected.id);
      if (!task) return null;
      const assignee = users.find((u) => u.id === task.assigneeId);
      return { task, assignee, wbs: allNodes.find((n) => n.id === task.wbsNodeId) };
    }
    const node = allNodes.find((n) => n.id === selected.id);
    const rollup = rollups.get(selected.id);
    return { node, rollup };
  }, [selected, scopeTasks, users, allNodes, rollups]);

  return (
    <div className="border rounded-lg overflow-hidden bg-card flex flex-col relative" style={{ height: "calc(100vh - 200px)", minHeight: 300 }}>
      {/* Toolbar */}
      <div className="px-3 py-2 border-b bg-muted/30 flex items-center justify-between gap-2 flex-wrap text-xs">
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant={showCritical ? "default" : "outline"} onClick={() => setShowCritical(!showCritical)}
            className={cn("h-7 text-[11px]", showCritical && "bg-red-600 hover:bg-red-700 text-white")}>
            <Zap className="size-3" /> {isHe ? "נתיב קריטי" : "Critical"} {showCritical && `(${cpm.criticalTaskIds.size})`}
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setCollapsed(new Set())}>
            {isHe ? "הרחב" : "Expand"}
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setCollapsed(new Set(allNodes.map((n) => n.id)))}>
            {isHe ? "כווץ" : "Collapse"}
          </Button>
        </div>
        <div className="flex items-center bg-muted rounded text-[10px]">
          <button onClick={() => setDayWidth((w) => Math.max(8, w - 4))} className="size-6 flex items-center justify-center hover:bg-accent rounded-s"><ZoomOut className="size-3" /></button>
          <span className="px-1 font-mono">{dayWidth}</span>
          <button onClick={() => setDayWidth((w) => Math.min(50, w + 4))} className="size-6 flex items-center justify-center hover:bg-accent rounded-e"><ZoomIn className="size-3" /></button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* === LEFT TABLE (MS Project style) === */}
        <div className="shrink-0 border-e bg-background overflow-y-auto overflow-x-auto w-[200px] sm:w-[520px]">
          {/* Column headers */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-900 border-b text-[10px] font-semibold text-muted-foreground sticky top-0 z-10" style={{ height: 28 }}>
            <div className="w-8 px-1 text-center border-e shrink-0">#</div>
            <div className="flex-1 px-2 border-e min-w-0">{isHe ? "שם משימה" : "Task Name"}</div>
            <div className="w-16 px-1 text-center border-e hidden sm:block shrink-0">{isHe ? "משך" : "Duration"}</div>
            <div className="w-20 px-1 text-center border-e hidden sm:block shrink-0">{isHe ? "התחלה" : "Start"}</div>
            <div className="w-20 px-1 text-center border-e hidden sm:block shrink-0">{isHe ? "סיום" : "Finish"}</div>
            <div className="w-20 px-1 text-center hidden sm:block shrink-0">{isHe ? "אחראי" : "Resource"}</div>
          </div>
          {/* Rows */}
          {rows.map((row, idx) => {
            const isWbs = row.kind === "wbs";
            const isCrit = row.kind === "task" && showCritical && cpm.criticalTaskIds.has(row.task.id);
            const n = isWbs ? row.node : null;
            const t = !isWbs ? row.task : null;
            const num = isWbs ? numbering.get(n!.id) || "" : "";
            const r = isWbs ? rollups.get(n!.id) : null;
            const hasChildren = isWbs && (allNodes.some((c) => c.parentId === n!.id) || scopeTasks.some((tk) => tk.wbsNodeId === n!.id));
            const assignee = t ? users.find((u) => u.id === t.assigneeId) : null;
            const start = isWbs ? r?.plannedStart : t?.plannedStart;
            const end = isWbs ? r?.plannedEnd : t?.plannedEnd;

            return (
              <div
                key={`row-${idx}`}
                className={cn(
                  "flex items-center border-b text-[11px] sm:text-[11px] text-[12px] cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/20",
                  isCrit && "bg-red-50/60 dark:bg-red-950/10",
                  isWbs && "font-semibold bg-slate-50/50 dark:bg-slate-900/30"
                )}
                style={{ height: ROW_HEIGHT, minHeight: 44 }}
                onClick={(e) => setSelected({ type: isWbs ? "wbs" : "task", id: isWbs ? n!.id : t!.id, x: e.clientX, y: e.clientY })}
              >
                <div className="w-8 px-1 text-center text-[9px] text-muted-foreground border-e font-mono shrink-0">{num || idx + 1}</div>
                <div className="flex-1 px-1 border-e flex items-center gap-0.5 min-w-0" style={{ paddingInlineStart: (row.depth * 14) + 4 }}>
                  {isWbs && hasChildren && (
                    <button onClick={(e) => { e.stopPropagation(); toggleCollapse(n!.id); }} className="size-6 sm:size-4 flex items-center justify-center shrink-0">
                      {collapsed.has(n!.id) ? <ChevronRight className="size-4 sm:size-3 rtl:rotate-180" /> : <ChevronDown className="size-4 sm:size-3" />}
                    </button>
                  )}
                  {!isWbs && <span className="w-4 shrink-0" />}
                  {isCrit && <Zap className="size-3 text-red-500 shrink-0" />}
                  <span className="truncate">{isWbs ? (isHe ? n!.name : n!.nameEn || n!.name) : (isHe ? t!.title : t!.titleEn || t!.title)}</span>
                </div>
                <div className="w-16 px-1 text-center text-[10px] text-muted-foreground border-e hidden sm:block shrink-0">{getDuration(start || null, end || null)}</div>
                <div className="w-20 px-1 text-center text-[10px] text-muted-foreground border-e hidden sm:block shrink-0">{start ? new Date(start).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit" }) : "—"}</div>
                <div className="w-20 px-1 text-center text-[10px] text-muted-foreground border-e hidden sm:block shrink-0">{end ? new Date(end).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit" }) : "—"}</div>
                <div className="w-20 px-1 text-[10px] text-muted-foreground truncate hidden sm:block shrink-0">{assignee?.name?.split(" ")[0] || "—"}</div>
              </div>
            );
          })}
        </div>

        {/* === RIGHT: GANTT BARS === */}
        <div className="flex-1 overflow-auto bg-white dark:bg-background" onClick={() => setSelected(null)}>
          <div style={{ minWidth: (totalDays + 1) * dayWidth, direction: "ltr" }}>
            {/* Date header */}
            <div className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-900 border-b flex" style={{ height: 28 }}>
              {days.map((d, i) => {
                const isToday = d.toDateString() === today.toDateString();
                const isFirstOfMonth = d.getDate() === 1;
                const isWeekend = d.getDay() === 5 || d.getDay() === 6;
                return (
                  <div key={i} className={cn(
                    "shrink-0 text-center border-e text-[8px] flex flex-col justify-center leading-tight",
                    isToday && "bg-blue-100 dark:bg-blue-950 font-bold text-blue-700",
                    isWeekend && !isToday && "bg-gray-50 dark:bg-gray-900/50"
                  )} style={{ width: dayWidth }}>
                    {isFirstOfMonth && <div className="text-[7px] font-bold text-blue-600">{d.toLocaleDateString(isHe ? "he-IL" : "en-US", { month: "short" })}</div>}
                    <div>{d.getDate()}</div>
                  </div>
                );
              })}
            </div>

            {/* Gantt rows */}
            <div className="relative" style={{ height: rows.length * ROW_HEIGHT }}>
              {/* Today line */}
              {todayOffset > 0 && todayOffset < totalDays * dayWidth && (
                <div className="absolute top-0 bottom-0 w-px bg-red-500 z-20 pointer-events-none" style={{ left: todayOffset }}>
                  <div className="absolute -top-0.5 -translate-x-1/2 size-2 bg-red-500 rounded-full" />
                </div>
              )}

              {/* Weekend stripes */}
              {days.map((d, i) => (d.getDay() === 5 || d.getDay() === 6) ? (
                <div key={`wk-${i}`} className="absolute top-0 bottom-0 bg-gray-50/60 dark:bg-gray-900/20 pointer-events-none" style={{ left: i * dayWidth, width: dayWidth }} />
              ) : null)}

              {/* Dependency arrows (task → successor) */}
              {rows.map((row, idx) => {
                if (row.kind !== "task") return null;
                const t = row.task;
                return t.dependencies.map((depId) => {
                  const depIdx = rows.findIndex((r) => r.kind === "task" && r.task.id === depId);
                  if (depIdx < 0) return null;
                  const depTask = (rows[depIdx] as any).task;
                  if (!depTask.plannedEnd || !t.plannedStart) return null;
                  const fromX = offsetForDate(depTask.plannedEnd);
                  const fromY = depIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
                  const toX = offsetForDate(t.plannedStart);
                  const toY = idx * ROW_HEIGHT + ROW_HEIGHT / 2;
                  const midX = fromX + 8;
                  return (
                    <svg key={`dep-${depId}-${t.id}`} className="absolute top-0 left-0 pointer-events-none" style={{ width: "100%", height: rows.length * ROW_HEIGHT, overflow: "visible" }}>
                      <polyline
                        points={`${fromX},${fromY} ${midX},${fromY} ${midX},${toY} ${toX},${toY}`}
                        fill="none" stroke="#6366f1" strokeWidth="1.5" markerEnd="url(#arrowhead)"
                      />
                      <defs>
                        <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                          <polygon points="0 0, 8 3, 0 6" fill="#6366f1" />
                        </marker>
                      </defs>
                    </svg>
                  );
                });
              })}

              {/* Bars */}
              {rows.map((row, idx) => {
                const y = idx * ROW_HEIGHT;

                if (row.kind === "wbs") {
                  const n = row.node;
                  const r = rollups.get(n.id);

                  // Milestone = diamond
                  if (n.level === "milestone" && r?.plannedEnd) {
                    const x = offsetForDate(r.plannedEnd);
                    return (
                      <div key={`g-${n.id}`} className="absolute inset-x-0 border-b border-gray-100 dark:border-gray-800" style={{ top: y, height: ROW_HEIGHT }}
                        onClick={(e) => { e.stopPropagation(); setSelected({ type: "wbs", id: n.id, x: e.clientX, y: e.clientY }); }}>
                        <div className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-black dark:bg-white border border-gray-400"
                          style={{ left: x - 7, transform: "translateY(-50%) rotate(45deg)" }}
                          title={`${isHe ? "אבן דרך" : "Milestone"}: ${n.name}`}
                        />
                        {dayWidth >= 16 && (
                          <span className="absolute text-[9px] text-gray-600 dark:text-gray-400 whitespace-nowrap" style={{ left: x + 10, top: y > 0 ? 4 : 8 }}>
                            {isHe ? n.name : n.nameEn || n.name}
                          </span>
                        )}
                      </div>
                    );
                  }

                  // Summary bar (black bracket-style)
                  if (r?.plannedStart && r?.plannedEnd) {
                    const x = offsetForDate(r.plannedStart);
                    const w = widthForDates(r.plannedStart, r.plannedEnd);
                    return (
                      <div key={`g-${n.id}`} className="absolute inset-x-0 border-b border-gray-100 dark:border-gray-800" style={{ top: y, height: ROW_HEIGHT }}
                        onClick={(e) => { e.stopPropagation(); setSelected({ type: "wbs", id: n.id, x: e.clientX, y: e.clientY }); }}>
                        {/* Summary bracket: top bar with down caps */}
                        <div className="absolute h-[5px] bg-black dark:bg-gray-300" style={{ left: x, width: w, top: ROW_HEIGHT / 2 - 2 }} />
                        <div className="absolute w-[3px] h-[8px] bg-black dark:bg-gray-300" style={{ left: x, top: ROW_HEIGHT / 2 - 2 }} />
                        <div className="absolute w-[3px] h-[8px] bg-black dark:bg-gray-300" style={{ left: x + w - 3, top: ROW_HEIGHT / 2 - 2 }} />
                      </div>
                    );
                  }
                  return <div key={`g-${n.id}`} className="absolute inset-x-0 border-b border-gray-100 dark:border-gray-800" style={{ top: y, height: ROW_HEIGHT }} />;
                }

                // === TASK BAR (MS Project style - blue with resource name) ===
                const t = row.task;
                const isCrit = showCritical && cpm.criticalTaskIds.has(t.id);
                const health = getTaskHealth(t);
                const barColor = isCrit ? "#dc2626" : t.status === "done" ? "#22c55e" : t.status === "blocked" ? "#ef4444" : health === "amber" ? "#f59e0b" : "#4472C4"; // MS Project blue
                const assignee = users.find((u) => u.id === t.assigneeId);
                const plannedX = offsetForDate(t.plannedStart);
                const plannedW = widthForDates(t.plannedStart, t.plannedEnd);

                return (
                  <div key={`g-${t.id}`}
                    className={cn("absolute inset-x-0 border-b border-gray-100 dark:border-gray-800", isCrit && "bg-red-50/30 dark:bg-red-950/10")}
                    style={{ top: y, height: ROW_HEIGHT }}
                    onClick={(e) => { e.stopPropagation(); setSelected({ type: "task", id: t.id, x: e.clientX, y: e.clientY }); }}
                  >
                    {plannedW > 0 && (
                      <>
                        {/* Main bar */}
                        <div className="absolute rounded-sm shadow-sm cursor-pointer hover:brightness-110 transition-all"
                          style={{ left: plannedX, width: plannedW, height: 14, top: (ROW_HEIGHT - 14) / 2, backgroundColor: barColor }}
                          title={`${t.title} (${t.progressPercent}%)`}
                        >
                          {/* Progress fill (darker overlay) */}
                          <div className="absolute inset-y-0 start-0 rounded-sm bg-black/20" style={{ width: `${t.progressPercent}%` }} />
                          {/* Progress % text inside bar */}
                          {plannedW > 40 && (
                            <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white">
                              {t.progressPercent}%
                            </span>
                          )}
                        </div>
                        {/* Resource name to the right of the bar (MS Project style) */}
                        {dayWidth >= 14 && assignee && (
                          <span className="absolute text-[9px] text-gray-600 dark:text-gray-400 whitespace-nowrap"
                            style={{ left: plannedX + plannedW + 4, top: (ROW_HEIGHT - 12) / 2 }}>
                            {assignee.name}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* === DETAIL POPUP (click on any entity) === */}
      {selected && selectedData && (
        <div className="fixed z-50 bg-card border-2 border-blue-300 rounded-xl shadow-2xl p-4 animate-in fade-in zoom-in-95 duration-150 inset-x-3 sm:inset-x-auto sm:min-w-[280px] sm:max-w-[360px] max-w-none bottom-4 sm:bottom-auto"
          style={{ left: typeof window !== "undefined" && window.innerWidth >= 640 ? Math.min(selected.x, window.innerWidth - 380) : undefined, top: typeof window !== "undefined" && window.innerWidth >= 640 ? Math.min(selected.y - 20, window.innerHeight - 300) : undefined }}>
          <button onClick={() => setSelected(null)} className="absolute top-2 end-2 size-8 sm:size-6 rounded-full bg-muted hover:bg-accent flex items-center justify-center">
            <X className="size-3.5" />
          </button>
          {"task" in selectedData && selectedData.task ? (() => {
            const t = selectedData.task;
            const a = selectedData.assignee;
            const isCrit = cpm.criticalTaskIds.has(t.id);
            const depTasks = t.dependencies.map((dId) => scopeTasks.find((st) => st.id === dId)).filter(Boolean);
            const successors = scopeTasks.filter((st) => st.dependencies.includes(t.id));
            const durDays = t.plannedStart && t.plannedEnd ? Math.ceil((new Date(t.plannedEnd).getTime() - new Date(t.plannedStart).getTime()) / 86400000) : null;
            const fmtD = (d: string) => new Date(d).toLocaleDateString(isHe ? "he-IL" : "en-US", { day: "2-digit", month: "2-digit", year: "2-digit" });
            return (
              <div className="space-y-2.5">
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                    <Badge variant={t.status === "done" ? "secondary" : t.status === "blocked" ? "destructive" : "default"} className="text-[10px]">{t.status}</Badge>
                    <Badge variant="outline" className="text-[10px]">{t.priority}</Badge>
                    {isCrit && <Badge className="text-[10px] bg-red-600">⚡ {isHe ? "קריטי" : "Critical"}</Badge>}
                  </div>
                  <h3 className="font-bold text-sm leading-tight">{isHe ? t.title : t.titleEn || t.title}</h3>
                </div>
                {t.description && <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>}

                {/* Dates section */}
                <div className="bg-muted/30 rounded-md p-2 space-y-1.5 text-xs">
                  <div className="font-semibold text-[10px] uppercase text-muted-foreground">{isHe ? "תאריכים" : "Dates"}</div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                    <div className="flex items-center gap-1"><Calendar className="size-3 text-blue-600" />{isHe ? "תכנון" : "Plan"}: <strong>{t.plannedStart ? fmtD(t.plannedStart) : "—"}</strong></div>
                    <div className="flex items-center gap-1"><Calendar className="size-3 text-blue-600" />{isHe ? "עד" : "Due"}: <strong>{t.plannedEnd ? fmtD(t.plannedEnd) : "—"}</strong></div>
                    {(t.actualStart || t.actualEnd) && (
                      <>
                        <div className="flex items-center gap-1"><Calendar className="size-3 text-emerald-600" />{isHe ? "בפועל" : "Actual"}: <strong>{t.actualStart ? fmtD(t.actualStart) : "—"}</strong></div>
                        <div className="flex items-center gap-1"><Calendar className="size-3 text-emerald-600" />{isHe ? "סיום" : "End"}: <strong>{t.actualEnd ? fmtD(t.actualEnd) : "—"}</strong></div>
                      </>
                    )}
                  </div>
                  {durDays && <div className="text-[10px] text-muted-foreground">{isHe ? "משך" : "Duration"}: {durDays} {isHe ? "ימים" : "days"}</div>}
                </div>

                {/* Progress */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1"><Clock className="size-3" />{isHe ? "שעות" : "Hours"}: <strong>{t.actualHours}/{t.estimateHours}</strong></div>
                  <div className="flex items-center gap-1"><Target className="size-3" />{isHe ? "התקדמות" : "Progress"}: <strong>{t.progressPercent}%</strong></div>
                </div>
                <Progress value={t.progressPercent} className="h-2" />

                {/* Dependencies */}
                {(depTasks.length > 0 || successors.length > 0) && (
                  <div className="bg-indigo-50 dark:bg-indigo-950/20 rounded-md p-2 space-y-1 text-xs">
                    <div className="font-semibold text-[10px] uppercase text-indigo-600">{isHe ? "תלויות" : "Dependencies"}</div>
                    {depTasks.length > 0 && (
                      <div>
                        <span className="text-muted-foreground">{isHe ? "תלוי ב:" : "Depends on:"}</span>
                        {depTasks.map((dep) => (
                          <div key={dep!.id} className="flex items-center gap-1 ms-2">
                            <span className="text-indigo-600">←</span>
                            <span className="truncate">{isHe ? dep!.title : dep!.titleEn || dep!.title}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {successors.length > 0 && (
                      <div>
                        <span className="text-muted-foreground">{isHe ? "חוסם את:" : "Blocks:"}</span>
                        {successors.map((suc) => (
                          <div key={suc.id} className="flex items-center gap-1 ms-2">
                            <span className="text-red-500">→</span>
                            <span className="truncate">{isHe ? suc.title : suc.titleEn || suc.title}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Tags */}
                {t.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {t.tags.map((tag) => (
                      <span key={tag} className="text-[9px] bg-muted px-1.5 py-0.5 rounded">{tag}</span>
                    ))}
                  </div>
                )}

                {/* Assignee */}
                {a && (
                  <div className="flex items-center gap-2 pt-1 border-t">
                    <Avatar src={a.image} fallback={a.name[0]} className="size-6" />
                    <div className="text-xs">
                      <div className="font-medium">{a.name}</div>
                      <div className="text-[10px] text-muted-foreground">{a.role}</div>
                    </div>
                  </div>
                )}
                <Link href={`/tasks/${t.id}`} className="text-xs text-blue-600 hover:underline block pt-1">
                  → {isHe ? "פתח דף משימה" : "Open task page"}
                </Link>
              </div>
            );
          })() : "node" in selectedData && selectedData.node ? (() => {
            const n = selectedData.node!;
            const r = selectedData.rollup;
            const fmtD = (d: string) => new Date(d).toLocaleDateString(isHe ? "he-IL" : "en-US", { day: "2-digit", month: "2-digit", year: "2-digit" });
            return (
              <div className="space-y-2.5">
                <div>
                  <Badge variant="outline" className="text-[10px] mb-1.5 uppercase">{n.level}</Badge>
                  <h3 className="font-bold text-sm">{isHe ? n.name : n.nameEn || n.name}</h3>
                  {n.description && <p className="text-xs text-muted-foreground mt-1">{n.description}</p>}
                  {n.deliverable && <p className="text-xs mt-1">📦 {isHe ? "תוצר" : "Deliverable"}: {n.deliverable}</p>}
                </div>

                {/* Dates from rollup */}
                {r && (r.plannedStart || r.plannedEnd) && (
                  <div className="bg-muted/30 rounded-md p-2 text-xs space-y-1">
                    <div className="font-semibold text-[10px] uppercase text-muted-foreground">{isHe ? "תאריכים (אגרגציה)" : "Dates (rolled up)"}</div>
                    <div className="grid grid-cols-2 gap-2">
                      {r.plannedStart && <div><Calendar className="size-3 text-blue-600 inline me-1" />{isHe ? "התחלה" : "Start"}: <strong>{fmtD(r.plannedStart)}</strong></div>}
                      {r.plannedEnd && <div><Calendar className="size-3 text-blue-600 inline me-1" />{isHe ? "סיום" : "End"}: <strong>{fmtD(r.plannedEnd)}</strong></div>}
                    </div>
                  </div>
                )}

                {r && (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>{isHe ? "משימות" : "Tasks"}: <strong>{r.taskCount}</strong></div>
                    <div>{isHe ? "הושלמו" : "Done"}: <strong>{r.doneCount}</strong></div>
                    <div>{isHe ? "חסומות" : "Blocked"}: <strong>{r.blockedCount}</strong></div>
                    <div>{isHe ? "באיחור" : "Overdue"}: <strong>{r.overdueCount}</strong></div>
                    <div>{isHe ? "שעות" : "Hours"}: <strong>{Math.round(r.totalActualHours)}/{Math.round(r.totalEstimateHours)}</strong></div>
                    <div>{isHe ? "התקדמות" : "Progress"}: <strong>{Math.round(r.weightedProgress)}%</strong></div>
                  </div>
                )}
                {r && <Progress value={r.weightedProgress} className="h-2" />}
                {n.level === "project" && (
                  <Link href={`/projects/${n.id}`} className="text-xs text-blue-600 hover:underline block pt-1">
                    → {isHe ? "פתח דף פרויקט" : "Open project page"}
                  </Link>
                )}
              </div>
            );
          })() : null}
        </div>
      )}

      {/* Footer */}
      <div className="px-3 py-1.5 border-t bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between text-[10px] text-muted-foreground flex-wrap gap-1">
        <div className="flex gap-2 sm:gap-3 flex-wrap">
          <span><strong>{rows.filter((r) => r.kind === "wbs").length}</strong> {isHe ? "חבילות עבודה" : "work packages"}</span>
          <span><strong>{scopeTasks.length}</strong> {isHe ? "משימות" : "tasks"}</span>
          <span className="text-red-600"><strong>{cpm.criticalTaskIds.size}</strong> {isHe ? "קריטיות" : "critical"}</span>
          <span className="text-indigo-600"><strong>{scopeTasks.reduce((s, t) => s + t.dependencies.length, 0)}</strong> {isHe ? "תלויות" : "dependencies"}</span>
        </div>
        <span className="hidden sm:inline">{isHe ? "לחץ על פס או שם לפרטים" : "Click bar or name for details"}</span>
      </div>
    </div>
  );
}
