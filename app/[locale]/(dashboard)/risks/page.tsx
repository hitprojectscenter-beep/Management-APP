import { setRequestLocale } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Link } from "@/lib/i18n/routing";
import {
  ShieldAlert,
  AlertTriangle,
  AlertOctagon,
  AlertCircle,
  Info,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Filter,
  Sparkles,
} from "lucide-react";
import {
  mockTasks,
  mockUsers,
  mockRisks,
  mockProjectMembers,
  getTaskById,
  getUserById,
  getWbsNodeById,
  mockWbsNodes,
} from "@/lib/db/mock-data";
import {
  scanTasksForRisks,
  calculateProjectHealth,
  detectResourceBottlenecks,
  predictProjectEndDate,
  computeDependencyImpact,
  generateActiveRecommendations,
} from "@/lib/ai/risk-engine";
import { ResourceBottlenecks } from "@/components/risks/resource-bottlenecks";
import { PredictiveForecast } from "@/components/risks/predictive-forecast";
import { DependencyImpactCard } from "@/components/risks/dependency-impact";
import { ActiveRecommendations } from "@/components/risks/active-recommendations";
import { MitigationPlanCard } from "@/components/risks/mitigation-plan";
import { generateMitigationPlan } from "@/lib/ai/mitigation-engine";
import { cn, formatDate } from "@/lib/utils";

export default async function RisksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isHe = locale === "he";

  // === New AI analyses ===
  const bottlenecks = detectResourceBottlenecks(mockUsers, mockProjectMembers, mockTasks);
  const forecast = predictProjectEndDate(mockTasks);
  const recommendations = generateActiveRecommendations(mockTasks, mockUsers, mockProjectMembers);
  const mitigationPlan = generateMitigationPlan(mockTasks, mockUsers, mockProjectMembers);

  // Compute dependency impacts for currently delayed/blocked tasks
  const delayedTasks = mockTasks.filter((t) => {
    if (t.status === "blocked") return true;
    if (!t.plannedEnd || t.status === "done" || t.status === "cancelled") return false;
    return new Date(t.plannedEnd).getTime() < Date.now();
  });
  const dependencyImpacts = delayedTasks
    .map((t) => {
      const delayDays =
        t.status === "blocked"
          ? 5
          : Math.max(
              1,
              Math.round((Date.now() - new Date(t.plannedEnd).getTime()) / (1000 * 60 * 60 * 24))
            );
      return computeDependencyImpact(t.id, delayDays, mockTasks);
    })
    .filter((i): i is NonNullable<typeof i> => i !== null && i.affectedCount > 0)
    .sort((a, b) => {
      // Critical-path-affecting first, then by cascade days
      if (a.affectsCriticalPath !== b.affectsCriticalPath) return a.affectsCriticalPath ? -1 : 1;
      return b.cascadeDays - a.cascadeDays;
    })
    .slice(0, 5);

  // Combine mock risks + dynamic risks from engine
  const dynamicRisks = scanTasksForRisks(mockTasks);
  const allRisks = [
    ...mockRisks
      .filter((r) => !r.dismissed)
      .map((r) => ({
        id: r.id,
        taskId: r.taskId,
        severity: r.severity,
        type: r.type,
        message: isHe ? r.message : r.messageEn || r.message,
        suggestion: r.suggestion,
        source: "manual" as const,
      })),
    ...dynamicRisks.map((r, i) => ({
      id: `dyn-${i}`,
      taskId: r.taskId,
      severity: r.severity,
      type: r.type,
      message: r.message,
      suggestion: r.suggestion,
      source: "ai" as const,
    })),
  ];

  // Dedupe by taskId+type
  const seen = new Set<string>();
  const uniqueRisks = allRisks.filter((r) => {
    const key = `${r.taskId}::${r.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Counts
  const counts = {
    total: uniqueRisks.length,
    critical: uniqueRisks.filter((r) => r.severity === "critical").length,
    high: uniqueRisks.filter((r) => r.severity === "high").length,
    medium: uniqueRisks.filter((r) => r.severity === "medium").length,
    low: uniqueRisks.filter((r) => r.severity === "low").length,
  };

  // Project-level health
  const projects = mockWbsNodes.filter((n) => n.level === "project");
  const projectHealthData = projects.map((p) => {
    const descendantIds = new Set([p.id]);
    let queue = [p.id];
    while (queue.length > 0) {
      const next: string[] = [];
      for (const id of queue) {
        const children = mockWbsNodes.filter((n) => n.parentId === id);
        children.forEach((c) => {
          descendantIds.add(c.id);
          next.push(c.id);
        });
      }
      queue = next;
    }
    const projectTasks = mockTasks.filter((t) => descendantIds.has(t.wbsNodeId));
    const health = calculateProjectHealth(projectTasks);
    const projectRisks = uniqueRisks.filter((r) => {
      const task = getTaskById(r.taskId);
      return task && descendantIds.has(task.wbsNodeId);
    });
    return { project: p, health, risksCount: projectRisks.length };
  });

  const SEVERITY_META = {
    critical: {
      labelHe: "קריטי",
      labelEn: "Critical",
      icon: AlertOctagon,
      color: "text-red-700 dark:text-red-300",
      bg: "bg-red-50 dark:bg-red-950/30",
      border: "border-red-500",
      badge: "destructive" as const,
    },
    high: {
      labelHe: "גבוה",
      labelEn: "High",
      icon: AlertTriangle,
      color: "text-orange-700 dark:text-orange-300",
      bg: "bg-orange-50 dark:bg-orange-950/30",
      border: "border-orange-500",
      badge: "destructive" as const,
    },
    medium: {
      labelHe: "בינוני",
      labelEn: "Medium",
      icon: AlertCircle,
      color: "text-amber-700 dark:text-amber-300",
      bg: "bg-amber-50 dark:bg-amber-950/30",
      border: "border-amber-500",
      badge: "warning" as const,
    },
    low: {
      labelHe: "נמוך",
      labelEn: "Low",
      icon: Info,
      color: "text-blue-700 dark:text-blue-300",
      bg: "bg-blue-50 dark:bg-blue-950/30",
      border: "border-blue-500",
      badge: "secondary" as const,
    },
  } as const;

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="size-11 rounded-lg bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-md">
              <ShieldAlert className="size-6 text-white" />
            </div>
            {isHe ? "ניהול סיכונים" : "Risk Management"}
          </h1>
          <p className="text-muted-foreground mt-1.5">
            {isHe
              ? "זיהוי, מעקב והפחתה של סיכונים בכל הפרויקטים שלך - כולל ניתוח אוטומטי של מנוע ה-AI"
              : "Identify, track and mitigate risks across all projects - with automatic AI engine analysis"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="size-4" />
            {isHe ? "סינון" : "Filter"}
          </Button>
          <Button>
            <Sparkles className="size-4" />
            {isHe ? "סרוק עכשיו" : "Scan Now"}
          </Button>
        </div>
      </div>

      {/* Severity stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-2">
          <CardContent className="p-5">
            <div className="text-xs text-muted-foreground uppercase">
              {isHe ? "סך סיכונים פעילים" : "Active Risks"}
            </div>
            <div className="text-4xl font-black mt-2">{counts.total}</div>
            <div className="text-[10px] text-muted-foreground mt-1">
              {isHe ? "מנותחים על ידי AI" : "Analyzed by AI"}
            </div>
          </CardContent>
        </Card>
        {(["critical", "high", "medium", "low"] as const).map((sev) => {
          const meta = SEVERITY_META[sev];
          const Icon = meta.icon;
          return (
            <Card key={sev} className={cn("border-2", meta.border)}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground uppercase">
                      {isHe ? meta.labelHe : meta.labelEn}
                    </div>
                    <div className={cn("text-4xl font-black mt-2", meta.color)}>
                      {counts[sev]}
                    </div>
                  </div>
                  <div className={cn("size-10 rounded-lg flex items-center justify-center", meta.bg)}>
                    <Icon className={cn("size-5", meta.color)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* AI Active Recommendations - top priority */}
      <ActiveRecommendations recommendations={recommendations} locale={locale} />

      {/* Comprehensive AI Mitigation Plan */}
      <MitigationPlanCard plan={mitigationPlan} users={mockUsers} locale={locale} />

      {/* AI Forecast + Resource Bottlenecks side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PredictiveForecast forecast={forecast} locale={locale} />
        <ResourceBottlenecks bottlenecks={bottlenecks} users={mockUsers} locale={locale} />
      </div>

      {/* Dependency Impact Analysis */}
      <DependencyImpactCard impacts={dependencyImpacts} tasks={mockTasks} locale={locale} />

      {/* Project Health Matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="size-5 text-primary" />
            {isHe ? "מטריצת בריאות פרויקטים" : "Project Health Matrix"}
          </CardTitle>
          <CardDescription className="flex items-start gap-1.5">
            <Info className="size-3.5 mt-0.5 shrink-0 text-blue-500" />
            <span>
              {isHe
                ? "מבט-על על כל הפרויקטים ומספר הסיכונים בכל אחד. הציון מחושב מאחוז ביצוע, איחורים וחסימות. מתחת ל-40 = קריטי, 40-70 = בסיכון, 70+ = בריא."
                : "Bird's-eye view of all projects and risk count per project. Score is computed from completion rate, overdue and blockers. <40 = critical, 40-70 = at-risk, 70+ = healthy."}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {projectHealthData.map(({ project, health, risksCount }) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent/50 transition-colors"
              >
                <div
                  className={cn(
                    "size-12 rounded-lg flex items-center justify-center font-bold text-lg shrink-0",
                    health.status === "healthy" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300",
                    health.status === "at-risk" && "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300",
                    health.status === "critical" && "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-300"
                  )}
                >
                  {health.score}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold line-clamp-1">
                    {isHe ? project.name : project.nameEn || project.name}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>
                      ✅ {health.metrics.completed} {isHe ? "הושלמו" : "done"}
                    </span>
                    <span>
                      🟡 {health.metrics.onTime} {isHe ? "פתוחות" : "open"}
                    </span>
                    {health.metrics.overdue > 0 && (
                      <span className="text-red-600">
                        ⚠️ {health.metrics.overdue} {isHe ? "באיחור" : "overdue"}
                      </span>
                    )}
                    {health.metrics.blocked > 0 && (
                      <span className="text-red-600">
                        🚫 {health.metrics.blocked} {isHe ? "חסומות" : "blocked"}
                      </span>
                    )}
                  </div>
                </div>
                <div className="hidden md:flex flex-col items-end gap-1">
                  <Badge variant={risksCount === 0 ? "success" : risksCount > 3 ? "destructive" : "warning"}>
                    {risksCount} {isHe ? "סיכונים" : "risks"}
                  </Badge>
                  <Progress
                    value={
                      health.metrics.total > 0
                        ? (health.metrics.completed / health.metrics.total) * 100
                        : 0
                    }
                    className="h-1.5 w-24"
                  />
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Risks list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertOctagon className="size-5 text-red-600" />
            {isHe ? "כל הסיכונים הפעילים" : "All Active Risks"}
          </CardTitle>
          <CardDescription className="flex items-start gap-1.5">
            <Info className="size-3.5 mt-0.5 shrink-0 text-blue-500" />
            <span>
              {isHe
                ? "כל סיכון מציג: דרגה (קריטי/גבוה/בינוני/נמוך), סוג, המשימה הקשורה, האחראי, והמלצה לפעולה. לחץ על משימה לצפייה."
                : "Each risk shows: severity (critical/high/medium/low), type, related task, assignee, and action recommendation. Click a task to view."}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {uniqueRisks.length === 0 && (
            <div className="text-center py-12">
              <CheckCircle2 className="size-12 mx-auto text-emerald-500 mb-3" />
              <div className="font-semibold">{isHe ? "אין סיכונים פעילים! 🎉" : "No active risks! 🎉"}</div>
              <div className="text-sm text-muted-foreground mt-1">
                {isHe ? "כל הפרויקטים שלך במצב טוב" : "All your projects are in good shape"}
              </div>
            </div>
          )}
          {uniqueRisks
            .sort((a, b) => {
              const order = { critical: 0, high: 1, medium: 2, low: 3 };
              return order[a.severity] - order[b.severity];
            })
            .map((risk) => {
              const meta = SEVERITY_META[risk.severity];
              const Icon = meta.icon;
              const task = getTaskById(risk.taskId);
              const assignee = task?.assigneeId ? getUserById(task.assigneeId) : null;
              const wbsNode = task ? getWbsNodeById(task.wbsNodeId) : null;
              return (
                <div
                  key={risk.id}
                  className={cn(
                    "flex items-start gap-4 p-4 rounded-lg border border-s-4 transition-colors hover:bg-accent/30",
                    meta.bg,
                    meta.border
                  )}
                >
                  <Icon className={cn("size-5 shrink-0 mt-0.5", meta.color)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge variant={meta.badge}>
                        {isHe ? meta.labelHe : meta.labelEn}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono">{risk.type}</span>
                      {risk.source === "ai" && (
                        <Badge variant="outline" className="text-[9px]">
                          <Sparkles className="size-2.5 me-0.5" />
                          AI
                        </Badge>
                      )}
                    </div>
                    <div className="font-semibold text-sm">{risk.message}</div>
                    {task && (
                      <Link
                        href={`/tasks/${task.id}`}
                        className="text-xs text-primary hover:underline mt-1 inline-block"
                      >
                        → {isHe ? task.title : task.titleEn || task.title}
                        {wbsNode && (
                          <span className="text-muted-foreground">
                            {" · "}
                            {isHe ? wbsNode.name : wbsNode.nameEn || wbsNode.name}
                          </span>
                        )}
                      </Link>
                    )}
                    <div className="mt-2 text-xs bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 px-3 py-1.5 rounded">
                      💡 <span className="font-semibold">{isHe ? "המלצה:" : "Recommendation:"}</span>{" "}
                      {risk.suggestion}
                    </div>
                  </div>
                  {assignee && (
                    <div className="hidden sm:flex flex-col items-center gap-1 shrink-0">
                      <Avatar src={assignee.image} fallback={assignee.name[0]} className="size-9" />
                      <span className="text-[10px] text-muted-foreground line-clamp-1 max-w-[80px] text-center">
                        {assignee.name.split(" ")[0]}
                      </span>
                    </div>
                  )}
                  <div className="hidden md:flex flex-col gap-1">
                    <Button size="sm" variant="outline">
                      <CheckCircle2 className="size-3" />
                      {isHe ? "מטופל" : "Acknowledge"}
                    </Button>
                    <Button size="sm" variant="ghost">
                      <XCircle className="size-3" />
                      {isHe ? "דחה" : "Dismiss"}
                    </Button>
                  </div>
                </div>
              );
            })}
        </CardContent>
      </Card>

      {/* Risk types legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{isHe ? "סוגי סיכונים שהמערכת מזהה" : "Risk Types Detected"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-start gap-2">
              <Clock className="size-4 mt-0.5 text-red-600 shrink-0" />
              <div>
                <div className="font-semibold">{isHe ? "באיחור (Overdue)" : "Overdue"}</div>
                <div className="text-xs text-muted-foreground">
                  {isHe ? "המשימה עברה את תאריך היעד וטרם הסתיימה" : "Task passed deadline but not done"}
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <AlertOctagon className="size-4 mt-0.5 text-red-600 shrink-0" />
              <div>
                <div className="font-semibold">{isHe ? "חסום (Blocked)" : "Blocked"}</div>
                <div className="text-xs text-muted-foreground">
                  {isHe ? "המשימה חסומה ולא מתקדמת" : "Task is blocked and not progressing"}
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <TrendingUp className="size-4 mt-0.5 text-orange-600 shrink-0" />
              <div>
                <div className="font-semibold">
                  {isHe ? "חריגת מאמץ (Effort Overrun)" : "Effort Overrun"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {isHe ? "שעות בפועל עברו את ההערכה ביותר מ-20%" : "Actual hours exceed estimate by >20%"}
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <AlertCircle className="size-4 mt-0.5 text-amber-600 shrink-0" />
              <div>
                <div className="font-semibold">
                  {isHe ? "התקדמות איטית (Schedule Slip)" : "Schedule Slip"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {isHe ? "התקדמות נמוכה משמעותית מהזמן שעבר" : "Progress significantly behind elapsed time"}
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <ShieldAlert className="size-4 mt-0.5 text-red-600 shrink-0" />
              <div>
                <div className="font-semibold">
                  {isHe ? "קריטי לא התחיל (Critical Not Started)" : "Critical Not Started"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {isHe
                    ? "משימה בעדיפות קריטית לא החלה ופחות מ-3 ימים לתאריך התחלה"
                    : "Critical priority task not started, <3 days to start"}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
