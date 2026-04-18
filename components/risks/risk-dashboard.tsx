"use client";

import { useState, useMemo } from "react";
import {
  mockTasks,
  mockUsers,
  mockWbsNodes,
  mockProjectMembers,
  getTaskById,
  getUserById,
  getTasksByProject,
  getProjects,
  getAllMembersOfNodeRecursive,
} from "@/lib/db/mock-data";
import {
  scanTasksForRisks,
  calculateProjectHealth,
  scanMethodologyRisks,
} from "@/lib/ai/risk-engine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar } from "@/components/ui/avatar";
import {
  ShieldAlert,
  AlertTriangle,
  Target,
  Calendar,
  Users,
  TrendingUp,
  Activity,
  ChevronDown,
  ChevronUp,
  Info,
  CheckCircle2,
  Clock,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { txt } from "@/lib/utils/locale-text";

// ─── Severity helpers ─────────────────────────────────────────
const SEVERITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

const SEVERITY_STRIP: Record<string, string> = {
  critical: "bg-gradient-to-b from-red-500 to-red-700",
  high: "bg-gradient-to-b from-orange-400 to-orange-600",
  medium: "bg-gradient-to-b from-amber-400 to-amber-500",
  low: "bg-gradient-to-b from-blue-400 to-blue-500",
};

const SEVERITY_BG: Record<string, string> = {
  critical: "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800",
  high: "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800",
  medium: "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800",
  low: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800",
};

const SEVERITY_TEXT: Record<string, string> = {
  critical: "text-red-700 dark:text-red-300",
  high: "text-orange-700 dark:text-orange-300",
  medium: "text-amber-700 dark:text-amber-300",
  low: "text-blue-700 dark:text-blue-300",
};

const METHODOLOGY_BADGE: Record<string, { color: string; bg: string; icon: typeof Zap }> = {
  waterfall: { color: "text-blue-700 dark:text-blue-300", bg: "bg-blue-100 dark:bg-blue-900/40 border-blue-300", icon: TrendingUp },
  agile: { color: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-100 dark:bg-emerald-900/40 border-emerald-300", icon: Zap },
  kanban: { color: "text-orange-700 dark:text-orange-300", bg: "bg-orange-100 dark:bg-orange-900/40 border-orange-300", icon: Activity },
};

// Map severity to matrix cell (probability x impact)
function severityToCell(severity: string): { prob: number; impact: number } {
  switch (severity) {
    case "critical": return { prob: 5, impact: 5 };
    case "high": return { prob: 4, impact: 4 };
    case "medium": return { prob: 3, impact: 3 };
    case "low": return { prob: 2, impact: 2 };
    default: return { prob: 1, impact: 1 };
  }
}

// Matrix cell color based on score (prob * impact)
function matrixCellColor(score: number): string {
  if (score >= 20) return "bg-red-500/80 text-white";
  if (score >= 12) return "bg-orange-400/80 text-white";
  if (score >= 6) return "bg-amber-400/80 text-gray-900";
  if (score >= 2) return "bg-emerald-400/60 text-gray-900";
  return "bg-emerald-200/50 text-gray-700";
}

// ─── Component ────────────────────────────────────────────────
export function RiskDashboard({ locale }: { locale: string }) {
  const projects = useMemo(() => getProjects(), []);
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id ?? "");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    info: true, risks: true, matrix: true, timeline: true
  });
  const toggle = (key: string) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  // Derived data
  const selectedProject = useMemo(
    () => mockWbsNodes.find((n) => n.id === selectedProjectId),
    [selectedProjectId]
  );

  const projectTasks = useMemo(
    () => (selectedProjectId ? getTasksByProject(selectedProjectId) : []),
    [selectedProjectId]
  );

  const health = useMemo(
    () => calculateProjectHealth(projectTasks),
    [projectTasks]
  );

  const genericRisks = useMemo(
    () => scanTasksForRisks(projectTasks),
    [projectTasks]
  );

  const methodologyRisks = useMemo(
    () =>
      selectedProject?.methodology
        ? scanMethodologyRisks(projectTasks, selectedProject.methodology)
        : [],
    [projectTasks, selectedProject]
  );

  const allRisks = useMemo(() => {
    const combined = [...genericRisks, ...methodologyRisks];
    // Deduplicate by taskId+type
    const seen = new Set<string>();
    return combined
      .filter((r) => {
        const key = `${r.taskId}:${r.type}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9));
  }, [genericRisks, methodologyRisks]);

  const top7Risks = useMemo(() => allRisks.slice(0, 7), [allRisks]);

  const projectMembers = useMemo(
    () => (selectedProjectId ? getAllMembersOfNodeRecursive(selectedProjectId) : []),
    [selectedProjectId]
  );

  // Project date range
  const dateRange = useMemo(() => {
    if (projectTasks.length === 0) return { start: "", end: "" };
    const starts = projectTasks.filter((t) => t.plannedStart).map((t) => t.plannedStart);
    const ends = projectTasks.filter((t) => t.plannedEnd).map((t) => t.plannedEnd);
    return {
      start: starts.length > 0 ? starts.sort()[0] : "",
      end: ends.length > 0 ? ends.sort().reverse()[0] : "",
    };
  }, [projectTasks]);

  const completedPct = useMemo(() => {
    if (projectTasks.length === 0) return 0;
    return Math.round((projectTasks.filter((t) => t.status === "done").length / projectTasks.length) * 100);
  }, [projectTasks]);

  const overdueCount = useMemo(() => {
    const now = Date.now();
    return projectTasks.filter(
      (t) => t.plannedEnd && new Date(t.plannedEnd).getTime() < now && t.status !== "done" && t.status !== "cancelled"
    ).length;
  }, [projectTasks]);

  // Health score color
  const healthColor =
    health.status === "healthy"
      ? "text-emerald-500"
      : health.status === "at-risk"
        ? "text-amber-500"
        : "text-red-500";

  const healthRing =
    health.status === "healthy"
      ? "border-emerald-400"
      : health.status === "at-risk"
        ? "border-amber-400"
        : "border-red-400";

  // Matrix data: build 5x5 grid count
  const matrixData = useMemo(() => {
    const grid: number[][] = Array.from({ length: 5 }, () => Array(5).fill(0));
    for (const risk of allRisks) {
      const { prob, impact } = severityToCell(risk.severity);
      grid[5 - impact][prob - 1] += 1;
    }
    return grid;
  }, [allRisks]);

  // Format date
  const fmt = (d: string) => {
    if (!d) return "-";
    try {
      return new Intl.DateTimeFormat(locale === "he" ? "he-IL" : "en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(d));
    } catch {
      return d;
    }
  };

  // ─── Render ───────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ===== SECTION 1: Project Selector ===== */}
      <div className="relative">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className={cn(
            "w-full flex items-center justify-between rounded-xl border-2 px-5 py-4",
            "bg-gradient-to-l from-slate-50 to-white dark:from-slate-900 dark:to-slate-800",
            "border-indigo-200 dark:border-indigo-800 shadow-md hover:shadow-lg transition-all"
          )}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow">
              <Target className="size-5" />
            </div>
            <div className="text-start">
              <p className="text-xs text-muted-foreground">
                {txt(locale, { he: "פרויקט נבחר", en: "Selected Project" })}
              </p>
              <p className="font-semibold text-base">
                {selectedProject
                  ? locale === "en" && selectedProject.nameEn
                    ? selectedProject.nameEn
                    : selectedProject.name
                  : txt(locale, { he: "בחר פרויקט", en: "Select a project" })}
              </p>
            </div>
          </div>
          <ChevronDown className={cn("size-5 text-muted-foreground transition-transform", dropdownOpen && "rotate-180")} />
        </button>

        {dropdownOpen && (
          <div className="absolute inset-x-0 top-full z-50 mt-2 rounded-xl border bg-popover shadow-xl max-h-80 overflow-y-auto">
            {projects.map((proj) => {
              const pTasks = getTasksByProject(proj.id);
              const pH = calculateProjectHealth(pTasks);
              const meth = proj.methodology ?? "waterfall";
              const methCfg = METHODOLOGY_BADGE[meth] ?? METHODOLOGY_BADGE.waterfall;
              const MethIcon = methCfg.icon;
              return (
                <button
                  key={proj.id}
                  onClick={() => {
                    setSelectedProjectId(proj.id);
                    setDropdownOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-5 py-3 text-start hover:bg-accent/50 transition-colors",
                    proj.id === selectedProjectId && "bg-accent"
                  )}
                >
                  <div className={cn("flex items-center justify-center size-8 rounded-md border", methCfg.bg)}>
                    <MethIcon className={cn("size-4", methCfg.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {locale === "en" && proj.nameEn ? proj.nameEn : proj.name}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">{meth}</p>
                  </div>
                  <Badge
                    variant={pH.status === "healthy" ? "success" : pH.status === "at-risk" ? "warning" : "destructive"}
                    className="text-[10px]"
                  >
                    {pH.score}%
                  </Badge>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ===== SECTION 2: Project Info Summary ===== */}
      {selectedProject && (
        <Card className="border-2 border-indigo-200 dark:border-indigo-800 bg-gradient-to-bl from-indigo-50/50 via-white to-purple-50/30 dark:from-indigo-950/20 dark:via-background dark:to-purple-950/10 shadow-lg">
          <CardHeader className="pb-3 cursor-pointer hover:bg-accent/20 transition-colors" onClick={() => toggle("info")}>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldAlert className="size-5 text-indigo-600" />
              {txt(locale, { he: "סיכום פרויקט", en: "Project Summary" })}
              {expanded.info ? <ChevronUp className="size-5 text-muted-foreground ms-auto" /> : <ChevronDown className="size-5 text-muted-foreground ms-auto" />}
            </CardTitle>
          </CardHeader>
          {expanded.info && <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {/* Name + methodology */}
              <div className="col-span-2 sm:col-span-3 lg:col-span-2 flex flex-col gap-2">
                <p className="font-bold text-base leading-tight">
                  {locale === "en" && selectedProject.nameEn ? selectedProject.nameEn : selectedProject.name}
                </p>
                {(() => {
                  const meth = selectedProject.methodology ?? "waterfall";
                  const cfg = METHODOLOGY_BADGE[meth] ?? METHODOLOGY_BADGE.waterfall;
                  const MIcon = cfg.icon;
                  return (
                    <Badge className={cn("w-fit gap-1 border", cfg.bg, cfg.color)}>
                      <MIcon className="size-3" />
                      {meth.charAt(0).toUpperCase() + meth.slice(1)}
                    </Badge>
                  );
                })()}
              </div>

              {/* Total tasks */}
              <div className="flex flex-col items-center rounded-xl bg-white/60 dark:bg-white/5 p-3 border">
                <span className="text-2xl font-bold text-indigo-600">{projectTasks.length}</span>
                <span className="text-[11px] text-muted-foreground">
                  {txt(locale, { he: "משימות", en: "Tasks" })}
                </span>
              </div>

              {/* Completed */}
              <div className="flex flex-col items-center rounded-xl bg-white/60 dark:bg-white/5 p-3 border">
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="size-4 text-emerald-500" />
                  <span className="text-2xl font-bold text-emerald-600">{completedPct}%</span>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  {txt(locale, { he: "הושלם", en: "Completed" })}
                </span>
                <Progress value={completedPct} className="h-1.5 mt-1" indicatorClassName="bg-emerald-500" />
              </div>

              {/* Overdue */}
              <div className="flex flex-col items-center rounded-xl bg-white/60 dark:bg-white/5 p-3 border">
                <div className="flex items-center gap-1">
                  <AlertTriangle className="size-4 text-red-500" />
                  <span className="text-2xl font-bold text-red-600">{overdueCount}</span>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  {txt(locale, { he: "באיחור", en: "Overdue" })}
                </span>
              </div>

              {/* Health */}
              <div className="flex flex-col items-center rounded-xl bg-white/60 dark:bg-white/5 p-3 border">
                <div className={cn("flex items-center justify-center size-12 rounded-full border-4", healthRing)}>
                  <span className={cn("text-xl font-bold", healthColor)}>{health.score}</span>
                </div>
                <span className="text-[11px] text-muted-foreground mt-1">
                  {txt(locale, { he: "בריאות", en: "Health" })}
                </span>
              </div>
            </div>

            {/* Bottom row: dates + team size */}
            <div className="flex flex-wrap gap-4 mt-4 pt-3 border-t text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Calendar className="size-4" />
                <span>
                  {fmt(dateRange.start)} — {fmt(dateRange.end)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="size-4" />
                <span>
                  {projectMembers.length} {txt(locale, { he: "חברי צוות", en: "team members" })}
                </span>
              </div>
            </div>
          </CardContent>}
        </Card>
      )}

      {/* ===== SECTION 3: Top 7 Risks ===== */}
      <Card className="shadow-lg border-2 border-rose-200 dark:border-rose-800 bg-gradient-to-br from-rose-50/30 to-orange-50/20 dark:from-rose-950/10 dark:to-orange-950/10">
        <CardHeader className="cursor-pointer hover:bg-accent/20 transition-colors" onClick={() => toggle("risks")}>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-rose-600" />
            {txt(locale, { he: "7 סיכונים מובילים", en: "Top 7 Risks" })}
            <Badge variant="outline" className="bg-background">
              {allRisks.length} {txt(locale, { he: "סה״כ", en: "total" })}
            </Badge>
            {expanded.risks ? <ChevronUp className="size-5 text-muted-foreground ms-auto" /> : <ChevronDown className="size-5 text-muted-foreground ms-auto" />}
          </CardTitle>
        </CardHeader>
        {expanded.risks && <CardContent>
          {top7Risks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {txt(locale, { he: "לא נמצאו סיכונים - מצוין!", en: "No risks found - excellent!" })}
            </div>
          ) : (
            <div className="grid gap-3">
              {top7Risks.map((risk, idx) => {
                const task = getTaskById(risk.taskId);
                const assignee = task?.assigneeId ? getUserById(task.assigneeId) : undefined;
                return (
                  <div
                    key={`${risk.taskId}-${risk.type}-${idx}`}
                    className={cn(
                      "flex rounded-xl border overflow-hidden shadow-sm hover:shadow-md transition-shadow",
                      SEVERITY_BG[risk.severity]
                    )}
                  >
                    {/* Severity strip */}
                    <div className={cn("w-1.5 shrink-0", SEVERITY_STRIP[risk.severity])} />

                    <div className="flex-1 p-3 flex flex-col sm:flex-row sm:items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            className={cn(
                              "text-[10px] uppercase tracking-wider border",
                              risk.severity === "critical"
                                ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-300"
                                : risk.severity === "high"
                                  ? "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border-orange-300"
                                  : risk.severity === "medium"
                                    ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-300"
                                    : "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-300"
                            )}
                          >
                            {risk.severity}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground font-mono">{risk.type}</span>
                        </div>
                        <p className={cn("text-sm mt-1 leading-snug font-medium", SEVERITY_TEXT[risk.severity])}>
                          {risk.message}
                        </p>
                        {task && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {txt(locale, { he: "משימה:", en: "Task:" })} {task.title}
                          </p>
                        )}
                      </div>

                      {assignee && (
                        <div className="flex items-center gap-2 shrink-0">
                          <Avatar
                            src={assignee.image}
                            alt={assignee.name}
                            fallback={assignee.name.charAt(0)}
                            className="size-7"
                          />
                          <span className="text-xs text-muted-foreground hidden sm:inline">
                            {assignee.name}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>}
      </Card>

      {/* ===== SECTION 4: Risk Assessment Matrix (5x5) ===== */}
      <Card className="shadow-lg border-2 border-violet-200 dark:border-violet-800 bg-gradient-to-br from-violet-50/30 to-indigo-50/20 dark:from-violet-950/10 dark:to-indigo-950/10">
        <CardHeader className="cursor-pointer hover:bg-accent/20 transition-colors" onClick={() => toggle("matrix")}>
          <CardTitle className="flex items-center gap-2">
            <Target className="size-5 text-violet-600" />
            {txt(locale, { he: "מטריצת הערכת סיכונים", en: "Risk Assessment Matrix" })}
            {expanded.matrix ? <ChevronUp className="size-5 text-muted-foreground ms-auto" /> : <ChevronDown className="size-5 text-muted-foreground ms-auto" />}
          </CardTitle>
        </CardHeader>
        {expanded.matrix && <CardContent>
          <div className="overflow-x-auto">
            <div className="min-w-[420px]">
              {/* Y-axis label */}
              <div className="flex">
                {/* Y axis header */}
                <div className="w-24 shrink-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-violet-600 -rotate-90 whitespace-nowrap">
                    {txt(locale, { he: "השפעה", en: "Impact" })}
                  </span>
                </div>

                {/* Grid */}
                <div className="flex-1">
                  {/* Y labels */}
                  {[
                    txt(locale, { he: "קטסטרופלי", en: "Catastrophic" }),
                    txt(locale, { he: "משמעותי", en: "Major" }),
                    txt(locale, { he: "בינוני", en: "Moderate" }),
                    txt(locale, { he: "קטן", en: "Minor" }),
                    txt(locale, { he: "זניח", en: "Negligible" }),
                  ].map((label, rowIdx) => (
                    <div key={rowIdx} className="flex items-stretch">
                      <div className="w-20 shrink-0 flex items-center pe-2">
                        <span className="text-[11px] text-muted-foreground text-end w-full">{label}</span>
                      </div>
                      <div className="flex-1 grid grid-cols-5 gap-1">
                        {[1, 2, 3, 4, 5].map((colIdx) => {
                          const impactLevel = 5 - rowIdx;
                          const probLevel = colIdx;
                          const score = impactLevel * probLevel;
                          const count = matrixData[rowIdx][colIdx - 1];
                          return (
                            <div
                              key={colIdx}
                              className={cn(
                                "flex items-center justify-center rounded-lg h-12 sm:h-14 text-sm font-bold transition-all",
                                matrixCellColor(score),
                                count > 0 && "ring-2 ring-white dark:ring-gray-700 shadow-md scale-105"
                              )}
                              title={`P=${probLevel}, I=${impactLevel}, Score=${score}`}
                            >
                              {count > 0 ? (
                                <span className="flex items-center justify-center size-7 rounded-full bg-white/40 text-sm font-bold shadow-inner">
                                  {count}
                                </span>
                              ) : (
                                <span className="text-[10px] opacity-50">{score}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {/* X axis labels */}
                  <div className="flex items-stretch mt-1">
                    <div className="w-20 shrink-0" />
                    <div className="flex-1 grid grid-cols-5 gap-1">
                      {[
                        txt(locale, { he: "נדיר", en: "Rare" }),
                        txt(locale, { he: "נמוך", en: "Unlikely" }),
                        txt(locale, { he: "אפשרי", en: "Possible" }),
                        txt(locale, { he: "סביר", en: "Likely" }),
                        txt(locale, { he: "כמעט ודאי", en: "Almost Certain" }),
                      ].map((label, i) => (
                        <div key={i} className="text-center text-[10px] text-muted-foreground leading-tight pt-1">
                          {label}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* X axis title */}
                  <div className="flex justify-center mt-2">
                    <span className="text-xs font-bold text-violet-600">
                      {txt(locale, { he: "הסתברות", en: "Probability" })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Explanation */}
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <Info className="size-4 shrink-0 text-violet-500 mt-0.5" />
              <p className="leading-relaxed">
                {txt(locale, {
                  he: "מטריצת הסיכונים ממפה כל סיכון לפי הסתברות (ציר X) והשפעה (ציר Y). הציון הוא מכפלת שני הערכים (1-25). תאים ירוקים מציינים סיכון נמוך, צהוב בינוני, כתום גבוה, ואדום קריטי. בועות מספריות מצביעות על כמות הסיכונים בכל תא. מומלץ לטפל קודם בסיכונים בפינה הימנית-עליונה.",
                  en: "The risk matrix maps each risk by probability (X axis) and impact (Y axis). The score is the product of both values (1-25). Green cells indicate low risk, yellow medium, orange high, and red critical. Numbered bubbles show the risk count per cell. Address risks in the upper-right corner first.",
                })}
              </p>
            </div>

            {/* Legend row */}
            <div className="flex flex-wrap gap-3 mt-3">
              {[
                { label: txt(locale, { he: "נמוך (1-5)", en: "Low (1-5)" }), cls: "bg-emerald-300" },
                { label: txt(locale, { he: "בינוני (6-11)", en: "Medium (6-11)" }), cls: "bg-amber-400" },
                { label: txt(locale, { he: "גבוה (12-19)", en: "High (12-19)" }), cls: "bg-orange-400" },
                { label: txt(locale, { he: "קריטי (20-25)", en: "Critical (20-25)" }), cls: "bg-red-500" },
              ].map((leg) => (
                <div key={leg.label} className="flex items-center gap-1.5">
                  <div className={cn("size-3 rounded", leg.cls)} />
                  <span className="text-[11px] text-muted-foreground">{leg.label}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>}
      </Card>

      {/* ===== SECTION 5: Risk Management Timeline (enriched) ===== */}
      <Card className="shadow-lg border-2 border-cyan-200 dark:border-cyan-800 bg-gradient-to-br from-cyan-50/30 to-sky-50/20 dark:from-cyan-950/10 dark:to-sky-950/10">
        <CardHeader className="cursor-pointer hover:bg-accent/20 transition-colors" onClick={() => toggle("timeline")}>
          <CardTitle className="flex items-center gap-2">
            <Clock className="size-5 text-cyan-600" />
            {txt(locale, { he: "ציר זמן לניהול סיכונים", en: "Risk Management Timeline" })}
            {expanded.timeline ? <ChevronUp className="size-5 text-muted-foreground ms-auto" /> : <ChevronDown className="size-5 text-muted-foreground ms-auto" />}
          </CardTitle>
          {expanded.timeline && (
            <p className="text-xs text-muted-foreground mt-1">
              {txt(locale, {
                he: "סדר לוגי: זיהוי → הערכה (מטריצה) → תכנית גידור → מעקב → סגירה. כל סיכון מוצג לפי תאריך זיהוי עם יעד פתרון.",
                en: "Logical order: Detection → Assessment (matrix) → Mitigation plan → Monitoring → Closure. Each risk shown by detection date with resolution target.",
              })}
            </p>
          )}
        </CardHeader>
        {expanded.timeline && <CardContent>
          {top7Risks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {txt(locale, { he: "אין סיכונים להצגה", en: "No risks to display" })}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Timeline legend: flow stages */}
              <div className="flex items-center gap-2 flex-wrap text-[10px] text-muted-foreground bg-muted/30 rounded-lg p-2">
                <span className="font-semibold">{txt(locale, { he: "שלבים:", en: "Stages:" })}</span>
                {[
                  { he: "🔍 זיהוי", en: "🔍 Detection" },
                  { he: "📐 הערכה", en: "📐 Assessment" },
                  { he: "🛡️ גידור", en: "🛡️ Mitigation" },
                  { he: "👁️ מעקב", en: "👁️ Monitoring" },
                  { he: "✅ סגירה", en: "✅ Closure" },
                ].map((s, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {i > 0 && <span className="text-muted-foreground/50">→</span>}
                    {txt(locale, s)}
                  </span>
                ))}
              </div>

              {/* Vertical timeline (better for mobile + rich content) */}
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute start-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-red-400 via-amber-400 to-emerald-400" />

                <div className="space-y-4">
                  {top7Risks.map((risk, idx) => {
                    const task = getTaskById(risk.taskId);
                    const assignee = task?.assigneeId ? getUserById(task.assigneeId) : null;
                    const detectedDate = risk.detectedAt || new Date().toISOString();
                    const mitigationDays = risk.severity === "critical" ? 7 : risk.severity === "high" ? 14 : risk.severity === "medium" ? 21 : 30;
                    const targetDate = new Date(new Date(detectedDate).getTime() + mitigationDays * 86400000).toISOString();
                    const matrixScore = risk.severity === "critical" ? "5×5=25" : risk.severity === "high" ? "4×4=16" : risk.severity === "medium" ? "3×3=9" : "2×2=4";

                    const dotColor = risk.severity === "critical" ? "bg-red-500" : risk.severity === "high" ? "bg-orange-500" : risk.severity === "medium" ? "bg-amber-400" : "bg-blue-400";
                    const borderColor = risk.severity === "critical" ? "border-red-300" : risk.severity === "high" ? "border-orange-300" : risk.severity === "medium" ? "border-amber-300" : "border-blue-300";

                    // Determine current stage
                    const now = Date.now();
                    const detected = new Date(detectedDate).getTime();
                    const target = new Date(targetDate).getTime();
                    const progress = Math.min(100, Math.round(((now - detected) / (target - detected)) * 100));
                    const stage = progress >= 100 ? "closing" : progress > 60 ? "monitoring" : progress > 30 ? "mitigating" : "assessing";

                    const mitigationAction = risk.suggestion || (risk.severity === "critical"
                      ? txt(locale, { he: "הסלמה מיידית למנהל בכיר + תגבור משאבים", en: "Immediate escalation + resource reinforcement" })
                      : risk.severity === "high"
                        ? txt(locale, { he: "שיבוץ מחדש + סקירת תלויות", en: "Reassignment + dependency review" })
                        : txt(locale, { he: "מעקב שבועי + התאמת לו\"ז", en: "Weekly monitoring + schedule adjustment" }));

                    return (
                      <div key={`tl-${risk.taskId}-${risk.type}-${idx}`} className="relative flex gap-4 ps-12">
                        {/* Dot on vertical line */}
                        <div className={cn("absolute start-3.5 size-4 rounded-full border-2 border-white dark:border-gray-800 shadow-lg z-10", dotColor)} />
                        {/* Step number */}
                        <div className="absolute start-1 top-5 text-[9px] font-bold text-muted-foreground">{idx + 1}</div>

                        {/* Risk card */}
                        <div className={cn("flex-1 rounded-xl border-2 bg-background/80 backdrop-blur-sm p-4 shadow-sm hover:shadow-md transition-shadow", borderColor)}>
                          {/* Header row */}
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className={cn("text-[9px] uppercase", risk.severity === "critical" ? "bg-red-100 text-red-700" : risk.severity === "high" ? "bg-orange-100 text-orange-700" : risk.severity === "medium" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700")}>
                                {risk.severity}
                              </Badge>
                              <span className="text-[10px] font-mono text-muted-foreground">{risk.type}</span>
                              <Badge variant="outline" className="text-[9px]">
                                {txt(locale, { he: "מטריצה:", en: "Matrix:" })} {matrixScore}
                              </Badge>
                            </div>
                            {assignee && <Avatar src={assignee.image} fallback={assignee.name[0]} className="size-6" />}
                          </div>

                          {/* Task title + risk message */}
                          <h4 className="font-semibold text-sm mt-2">{task?.title ?? risk.type}</h4>
                          <p className="text-xs text-muted-foreground mt-1">{risk.message}</p>

                          {/* Timeline dates + progress */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-[10px]">
                            <div className="bg-muted/30 rounded-md p-2">
                              <div className="text-muted-foreground">🔍 {txt(locale, { he: "זיהוי", en: "Detected" })}</div>
                              <div className="font-semibold">{fmt(detectedDate)}</div>
                            </div>
                            <div className="bg-muted/30 rounded-md p-2">
                              <div className="text-muted-foreground">📐 {txt(locale, { he: "הערכה", en: "Assessed" })}</div>
                              <div className="font-semibold">{matrixScore}</div>
                            </div>
                            <div className="bg-muted/30 rounded-md p-2">
                              <div className="text-muted-foreground">🛡️ {txt(locale, { he: "גידור", en: "Mitigate" })}</div>
                              <div className="font-semibold">{fmt(targetDate)}</div>
                            </div>
                            <div className="bg-muted/30 rounded-md p-2">
                              <div className="text-muted-foreground">📊 {txt(locale, { he: "שלב נוכחי", en: "Current" })}</div>
                              <div className="font-semibold capitalize">{stage}</div>
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div className="mt-2">
                            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                              <span>{txt(locale, { he: "התקדמות טיפול", en: "Treatment progress" })}</span>
                              <span>{progress}%</span>
                            </div>
                            <Progress value={progress} className="h-1.5" />
                          </div>

                          {/* AI Mitigation Plan */}
                          <div className="mt-3 p-3 rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 border border-indigo-200 dark:border-indigo-800">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <Zap className="size-3.5 text-indigo-600" />
                              <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase">
                                {txt(locale, { he: "תכנית AI לטיפול בסיכון", en: "AI Risk Mitigation Plan" })}
                              </span>
                            </div>
                            <div className="text-xs text-indigo-900 dark:text-indigo-200 space-y-1">
                              <p className="font-medium">{mitigationAction}</p>
                              <div className="text-[10px] text-indigo-600 dark:text-indigo-400 space-y-0.5">
                                <p>1️⃣ {txt(locale, {
                                  he: risk.severity === "critical" ? "הסלמה מיידית — דיווח להנהלה בכירה תוך 24 שעות" : risk.severity === "high" ? "זימון פגישת חירום עם בעלי עניין" : "תיעוד הסיכון ועדכון רשימת סיכונים",
                                  en: risk.severity === "critical" ? "Immediate escalation — report to senior management within 24h" : risk.severity === "high" ? "Emergency meeting with stakeholders" : "Document risk and update risk register",
                                })}</p>
                                <p>2️⃣ {txt(locale, {
                                  he: risk.severity === "critical" ? "הקצאת משאבים נוספים + תגבור צוות" : risk.severity === "high" ? "שיבוץ מחדש של משימות + עדכון לו\"ז" : "מעקב שבועי + סקירת התקדמות",
                                  en: risk.severity === "critical" ? "Allocate additional resources + team reinforcement" : risk.severity === "high" ? "Task reassignment + schedule update" : "Weekly monitoring + progress review",
                                })}</p>
                                <p>3️⃣ {txt(locale, {
                                  he: `סקירת אפקטיביות תוך ${mitigationDays} ימים`,
                                  en: `Effectiveness review within ${mitigationDays} days`,
                                })}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </CardContent>}
      </Card>
    </div>
  );
}
