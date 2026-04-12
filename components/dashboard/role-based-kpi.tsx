"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar } from "@/components/ui/avatar";
import {
  Briefcase,
  Building2,
  TrendingUp,
  TrendingDown,
  Clock,
  DollarSign,
  Target,
  Users,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Info,
  Flag,
  Layers,
  Sparkles,
  BarChart3,
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar, Legend, PieChart, Pie, Cell,
} from "recharts";
import { cn } from "@/lib/utils";
import type { MockTask, MockUser, MockWbsNode } from "@/lib/db/mock-data";
import { mockProjectMembers } from "@/lib/db/mock-data";

type Role = "pm" | "pmo";

// ============================================
// Reusable Info Popup (tooltip bubble)
// ============================================
function InfoPopup({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute top-full start-0 end-0 mt-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
        <div className="bg-popover border rounded-lg shadow-lg p-4 max-h-[300px] overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-sm">{title}</h4>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground size-5 flex items-center justify-center">
              ✕
            </button>
          </div>
          <div className="text-xs space-y-1.5">{children}</div>
        </div>
      </div>
    </>
  );
}

// Clickable KPI Card wrapper
function ClickableKpiCard({
  children,
  popupTitle,
  popupContent,
  borderColor,
}: {
  children: React.ReactNode;
  popupTitle: string;
  popupContent: React.ReactNode;
  borderColor?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Card
      className={cn("cursor-pointer hover:shadow-md transition-shadow relative", borderColor)}
      onClick={() => setOpen(!open)}
    >
      {children}
      <InfoPopup open={open} onClose={() => setOpen(false)} title={popupTitle}>
        {popupContent}
      </InfoPopup>
    </Card>
  );
}

export function RoleBasedKpi({
  tasks,
  users,
  projects,
  programs,
  locale,
}: {
  tasks: MockTask[];
  users: MockUser[];
  projects: MockWbsNode[];
  programs: MockWbsNode[];
  locale: string;
}) {
  const isHe = locale === "he";
  const [role, setRole] = useState<Role>("pm");

  return (
    <div className="space-y-6">
      {/* Role switcher */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="grid grid-cols-2 divide-x rtl:divide-x-reverse">
            <button
              onClick={() => setRole("pm")}
              className={cn(
                "p-5 text-start transition-all relative",
                role === "pm" ? "bg-blue-50 dark:bg-blue-950/20" : "hover:bg-accent/30"
              )}
            >
              {role === "pm" && (
                <div className="absolute top-0 start-0 end-0 h-1 bg-blue-600" />
              )}
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "size-12 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                    role === "pm" ? "bg-blue-600 text-white" : "bg-muted text-muted-foreground"
                  )}
                >
                  <Briefcase className="size-6" />
                </div>
                <div>
                  <div className="font-bold text-base">
                    {isHe ? "מנהל פרויקט" : "Project Manager"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {isHe ? "Project Manager · תצוגה תפעולית" : "Operational tactical view"}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-2 line-clamp-2">
                    {isHe
                      ? '"האם המשימות בפרויקט מסתיימות בזמן ובתקציב?"'
                      : '"Are project tasks completing on time and on budget?"'}
                  </div>
                </div>
              </div>
            </button>

            <button
              onClick={() => setRole("pmo")}
              className={cn(
                "p-5 text-start transition-all relative",
                role === "pmo" ? "bg-purple-50 dark:bg-purple-950/20" : "hover:bg-accent/30"
              )}
            >
              {role === "pmo" && (
                <div className="absolute top-0 start-0 end-0 h-1 bg-purple-600" />
              )}
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "size-12 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                    role === "pmo" ? "bg-purple-600 text-white" : "bg-muted text-muted-foreground"
                  )}
                >
                  <Building2 className="size-6" />
                </div>
                <div>
                  <div className="font-bold text-base">
                    {isHe ? "מנהל פורטפוליו / PMO" : "Portfolio / PMO Manager"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {isHe ? "PMO · ראיית-על אסטרטגית" : "Strategic oversight view"}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-2 line-clamp-2">
                    {isHe
                      ? '"האם אנו עובדים על הפרויקטים הנכונים?"'
                      : '"Are we working on the right projects?"'}
                  </div>
                </div>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      {role === "pm" && <ProjectManagerView tasks={tasks} users={users} projects={projects} locale={locale} />}
      {role === "pmo" && (
        <PmoManagerView tasks={tasks} users={users} projects={projects} programs={programs} locale={locale} />
      )}
    </div>
  );
}

// ============================================
// PROJECT MANAGER VIEW
// ============================================
function ProjectManagerView({
  tasks,
  users,
  projects,
  locale,
}: {
  tasks: MockTask[];
  users: MockUser[];
  projects: MockWbsNode[];
  locale: string;
}) {
  const isHe = locale === "he";

  // KPI 1: Schedule Variance (in days)
  const completedTasks = tasks.filter((t) => t.status === "done" && t.actualEnd && t.plannedEnd);
  const schedVar =
    completedTasks.length > 0
      ? completedTasks.reduce((sum, t) => {
          const planned = new Date(t.plannedEnd).getTime();
          const actual = new Date(t.actualEnd!).getTime();
          return sum + (actual - planned) / (1000 * 60 * 60 * 24);
        }, 0) / completedTasks.length
      : 0;

  // Milestone slippage
  const milestonesSlipped = tasks.filter(
    (t) =>
      t.priority === "critical" &&
      t.plannedEnd &&
      new Date(t.plannedEnd).getTime() < Date.now() &&
      t.status !== "done"
  ).length;

  // KPI 2: Throughput (planned vs delivered, last 6 weeks)
  const throughputData = [
    { week: "W1", planned: 14, actual: 11 },
    { week: "W2", planned: 16, actual: 14 },
    { week: "W3", planned: 15, actual: 12 },
    { week: "W4", planned: 18, actual: 16 },
    { week: "W5", planned: 17, actual: 15 },
    { week: "W6", planned: 16, actual: 13 },
  ];

  // KPI 3: Budget adherence (mock)
  const budgetTotal = 850000;
  const budgetSpent = 612000;
  const budgetRemaining = budgetTotal - budgetSpent;
  const budgetPercent = (budgetSpent / budgetTotal) * 100;
  const isOverBudget = budgetPercent > 80;

  // KPI 4: Workload (per user)
  const workloadData = users.slice(0, 5).map((u) => {
    const userTasks = tasks.filter((t) => t.assigneeId === u.id);
    return {
      name: u.name.split(" ")[0],
      open: userTasks.filter((t) => t.status === "in_progress" || t.status === "not_started").length,
      done: userTasks.filter((t) => t.status === "done").length,
      blocked: userTasks.filter((t) => t.status === "blocked").length,
    };
  });

  return (
    <div className="space-y-5">
      <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4 flex items-start gap-3">
        <div className="size-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
          <Briefcase className="size-5" />
        </div>
        <div>
          <div className="font-semibold text-blue-900 dark:text-blue-300">
            {isHe ? "תצוגת מנהל פרויקט - דשבורד תפעולי" : "Project Manager Dashboard - Operational view"}
          </div>
          <div className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">
            {isHe
              ? "מדדי ביצוע ברמת הפרויקט הבודד: לוחות זמנים, throughput, תקציב, ועומס צוות"
              : "Project-level KPIs: schedule, throughput, budget, and team workload"}
          </div>
        </div>
      </div>

      {/* Top KPIs — clickable with info popups */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Schedule Variance */}
        <ClickableKpiCard
          borderColor={schedVar > 3 ? "border-red-300" : schedVar > 0 ? "border-amber-300" : "border-emerald-300"}
          popupTitle={isHe ? "פרויקטים עם חריגות לו״ז" : "Projects with Schedule Variance"}
          popupContent={
            <div className="space-y-2">
              {projects.map((p) => {
                const pTasks = tasks.filter((t) => t.status === "done" && t.actualEnd && t.plannedEnd);
                const variance = pTasks.length > 0
                  ? pTasks.slice(0, 3).reduce((sum, t) => sum + (new Date(t.actualEnd!).getTime() - new Date(t.plannedEnd).getTime()) / 86400000, 0) / Math.min(pTasks.length, 3)
                  : 0;
                return (
                  <div key={p.id} className="flex items-center justify-between p-2 rounded-md bg-muted/30">
                    <span className="font-medium">{isHe ? p.name : p.nameEn || p.name}</span>
                    <Badge variant={variance > 3 ? "destructive" : variance > 0 ? "outline" : "secondary"}>
                      {variance > 0 ? "+" : ""}{variance.toFixed(1)} {isHe ? "ימים" : "days"}
                    </Badge>
                  </div>
                );
              })}
              <div className="text-muted-foreground pt-1">{isHe ? "💡 חיובי = איחור, שלילי = מוקדם" : "💡 Positive = late, Negative = early"}</div>
            </div>
          }
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-muted-foreground uppercase">
                {isHe ? "חריגת לו״ז" : "Schedule Variance"}
              </div>
              <Clock className={cn("size-4", schedVar > 3 ? "text-red-600" : schedVar > 0 ? "text-amber-600" : "text-emerald-600")} />
            </div>
            <div className={cn("text-3xl font-bold", schedVar > 3 ? "text-red-600" : schedVar > 0 ? "text-amber-600" : "text-emerald-600")}>
              {schedVar > 0 ? "+" : ""}{schedVar.toFixed(1)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {isHe ? "ימים בממוצע · לחץ לפרטים" : "days average · click for details"}
            </div>
          </CardContent>
        </ClickableKpiCard>

        {/* Milestone Slippage */}
        <ClickableKpiCard
          borderColor={milestonesSlipped > 0 ? "border-red-300" : "border-emerald-300"}
          popupTitle={isHe ? "אבני דרך קריטיות" : "Critical Milestones"}
          popupContent={
            <div className="space-y-2">
              {tasks.filter((t) => t.priority === "critical" && t.plannedEnd).slice(0, 6).map((t) => {
                const isLate = new Date(t.plannedEnd).getTime() < Date.now() && t.status !== "done";
                return (
                  <div key={t.id} className="flex items-center justify-between p-2 rounded-md bg-muted/30">
                    <span className="font-medium truncate flex-1">{isHe ? t.title : t.titleEn || t.title}</span>
                    <Badge variant={isLate ? "destructive" : t.status === "done" ? "secondary" : "outline"}>
                      {isLate ? (isHe ? "באיחור" : "Late") : t.status === "done" ? "✅" : (isHe ? "בזמן" : "On time")}
                    </Badge>
                  </div>
                );
              })}
            </div>
          }
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-muted-foreground uppercase">
                {isHe ? "אבני דרך באיחור" : "Milestone Slippage"}
              </div>
              <Flag className={cn("size-4", milestonesSlipped > 0 ? "text-red-600" : "text-emerald-600")} />
            </div>
            <div className={cn("text-3xl font-bold", milestonesSlipped > 0 ? "text-red-600" : "text-emerald-600")}>
              {milestonesSlipped}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {isHe ? "לחץ לרשימת אבני דרך" : "click for milestone list"}
            </div>
          </CardContent>
        </ClickableKpiCard>

        {/* Throughput Avg */}
        <ClickableKpiCard
          borderColor="border-blue-300"
          popupTitle={isHe ? "Throughput — פירוט שבועי" : "Weekly Throughput Breakdown"}
          popupContent={
            <div className="space-y-2">
              {throughputData.map((w) => (
                <div key={w.week} className="flex items-center justify-between p-2 rounded-md bg-muted/30">
                  <span className="font-medium">{w.week}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-600">{isHe ? "תכנון" : "Plan"}: {w.planned}</span>
                    <span className="text-emerald-600">{isHe ? "ביצוע" : "Actual"}: {w.actual}</span>
                    <Badge variant={w.actual >= w.planned ? "secondary" : "outline"}>
                      {((w.actual / w.planned) * 100).toFixed(0)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          }
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-muted-foreground uppercase">
                {isHe ? "Throughput שבועי" : "Weekly Throughput"}
              </div>
              <Activity className="size-4 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-blue-600">13.5/16</div>
            <div className="text-xs text-muted-foreground mt-1">
              {isHe ? "ביצוע מול תכנון · לחץ לפרטים" : "actual vs planned · click for details"}
            </div>
          </CardContent>
        </ClickableKpiCard>

        {/* Budget Adherence */}
        <ClickableKpiCard
          borderColor={isOverBudget ? "border-red-300" : "border-emerald-300"}
          popupTitle={isHe ? "פירוט תקציבי לפי פרויקט" : "Budget Breakdown by Project"}
          popupContent={
            <div className="space-y-2">
              {projects.map((p, i) => {
                const allocated = Math.round(budgetTotal / projects.length);
                const spent = Math.round(allocated * (0.5 + Math.random() * 0.4));
                const pct = Math.round((spent / allocated) * 100);
                return (
                  <div key={p.id} className="p-2 rounded-md bg-muted/30">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{isHe ? p.name : p.nameEn || p.name}</span>
                      <Badge variant={pct > 85 ? "destructive" : "secondary"}>{pct}%</Badge>
                    </div>
                    <Progress value={pct} className="h-1 mt-1" />
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      ₪{(spent / 1000).toFixed(0)}k / ₪{(allocated / 1000).toFixed(0)}k
                    </div>
                  </div>
                );
              })}
            </div>
          }
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-muted-foreground uppercase">
                {isHe ? "ניצול תקציב" : "Budget Adherence"}
              </div>
              <DollarSign className={cn("size-4", isOverBudget ? "text-red-600" : "text-emerald-600")} />
            </div>
            <div className={cn("text-3xl font-bold", isOverBudget ? "text-red-600" : "text-emerald-600")}>
              {budgetPercent.toFixed(0)}%
            </div>
            <Progress value={budgetPercent} className="h-1.5 mt-2" />
            <div className="text-xs text-muted-foreground mt-1">
              ₪{(budgetSpent / 1000).toFixed(0)}k / ₪{(budgetTotal / 1000).toFixed(0)}k · {isHe ? "לחץ" : "click"}
            </div>
          </CardContent>
        </ClickableKpiCard>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Throughput chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{isHe ? "Throughput - מתוכנן מול ביצוע" : "Throughput - Planned vs Actual"}</CardTitle>
            <CardDescription className="flex items-start gap-1.5">
              <Info className="size-3.5 mt-0.5 shrink-0 text-blue-500" />
              <span>
                {isHe
                  ? "השוואה שבועית של מספר המשימות שתוכננו לעומת אלו שנסגרו בפועל. פער מתמשך מצביע על קצב עבודה איטי מהצפוי."
                  : "Weekly comparison of planned vs actually closed tasks. Persistent gap = slower than expected pace."}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={throughputData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="planned" name={isHe ? "מתוכנן" : "Planned"} fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actual" name={isHe ? "ביצוע" : "Actual"} fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Workload chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{isHe ? "עומס וניצולת הצוות" : "Team Workload & Utilization"}</CardTitle>
            <CardDescription className="flex items-start gap-1.5">
              <Info className="size-3.5 mt-0.5 shrink-0 text-blue-500" />
              <span>
                {isHe
                  ? "התפלגות משימות לכל חבר צוות (פתוחות / הושלמו / חסומות). מאפשר זיהוי צווארי בקבוק או עומס יתר נקודתי."
                  : "Per-member task distribution. Helps spot bottlenecks or pinpoint overload."}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={workloadData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="open" name={isHe ? "פתוחות" : "Open"} stackId="a" fill="hsl(217, 91%, 60%)" />
                <Bar dataKey="done" name={isHe ? "הושלמו" : "Done"} stackId="a" fill="hsl(142, 71%, 45%)" />
                <Bar dataKey="blocked" name={isHe ? "חסומות" : "Blocked"} stackId="a" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================
// PMO MANAGER VIEW
// ============================================
function PmoManagerView({
  tasks,
  users,
  projects,
  programs,
  locale,
}: {
  tasks: MockTask[];
  users: MockUser[];
  projects: MockWbsNode[];
  programs: MockWbsNode[];
  locale: string;
}) {
  const isHe = locale === "he";

  // Strategic alignment - mock score (% of projects aligned with goals)
  const strategicAlignment = 78;
  const totalROI = "247%";

  // Capacity vs Demand - critical metric
  const capacityUsed = 87; // > 85% is warning
  const isCapacityWarning = capacityUsed > 85;

  // Portfolio health - RAG status
  const ragStatus = projects.map((p) => {
    const random = Math.random();
    return {
      project: p,
      status: random > 0.6 ? "G" : random > 0.3 ? "A" : "R",
    };
  });
  const ragGreen = ragStatus.filter((r) => r.status === "G").length;
  const ragAmber = ragStatus.filter((r) => r.status === "A").length;
  const ragRed = ragStatus.filter((r) => r.status === "R").length;

  // EVM metrics (mock)
  const cpi = 0.92; // Cost Performance Index (>1 = under budget)
  const spi = 0.88; // Schedule Performance Index (>1 = ahead)

  // Cost analysis
  const costData = [
    { name: "CapEx", value: 4200000, color: "#3B82F6" },
    { name: "OpEx", value: 1800000, color: "#10B981" },
  ];
  const totalCost = costData.reduce((sum, c) => sum + c.value, 0);

  // Risk trend
  const riskTrend = [
    { week: "W1", risks: 8 },
    { week: "W2", risks: 7 },
    { week: "W3", risks: 9 },
    { week: "W4", risks: 11 },
    { week: "W5", risks: 12 },
    { week: "W6", risks: 14 },
  ];

  return (
    <div className="space-y-5">
      <div className="bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 rounded-lg p-4 flex items-start gap-3">
        <div className="size-9 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0">
          <Building2 className="size-5" />
        </div>
        <div>
          <div className="font-semibold text-purple-900 dark:text-purple-300">
            {isHe ? "תצוגת PMO / מנהל פורטפוליו - ראייה אסטרטגית" : "PMO / Portfolio Manager - Strategic view"}
          </div>
          <div className="text-xs text-purple-700 dark:text-purple-400 mt-0.5">
            {isHe
              ? "מדדים רוחביים: יישור אסטרטגי, ROI, קיבולת ארגונית, בריאות פורטפוליו, ועלויות EVM"
              : "Cross-portfolio: alignment, ROI, capacity, health (RAG), EVM cost analysis"}
          </div>
        </div>
      </div>

      {/* Top KPIs - PMO specific — clickable with info popups */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Strategic Alignment */}
        <ClickableKpiCard
          borderColor="border-purple-300"
          popupTitle={isHe ? "פרויקטים פעילים" : "Active Projects"}
          popupContent={
            <div className="space-y-2">
              {projects.map((p) => {
                const pTasks = tasks.filter((t) => t.wbsNodeId === p.id || true);
                const aligned = Math.random() > 0.3;
                return (
                  <div key={p.id} className="flex items-center justify-between p-2 rounded-md bg-muted/30">
                    <span className="font-medium">{isHe ? p.name : p.nameEn || p.name}</span>
                    <Badge variant={aligned ? "secondary" : "destructive"}>
                      {aligned ? "✅ " + (isHe ? "מיושר" : "Aligned") : "⚠️ " + (isHe ? "לא מיושר" : "Misaligned")}
                    </Badge>
                  </div>
                );
              })}
              <div className="text-muted-foreground pt-1">💡 {isHe ? "ציון כולל:" : "Overall:"} {strategicAlignment}%</div>
            </div>
          }
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-muted-foreground uppercase">{isHe ? "יישור אסטרטגי" : "Strategic Alignment"}</div>
              <Target className="size-4 text-purple-600" />
            </div>
            <div className="text-3xl font-bold text-purple-600">{strategicAlignment}%</div>
            <Progress value={strategicAlignment} className="h-1.5 mt-2" />
            <div className="text-xs text-muted-foreground mt-1">{isHe ? "לחץ לפרויקטים" : "click for projects"}</div>
          </CardContent>
        </ClickableKpiCard>

        {/* ROI */}
        <ClickableKpiCard
          borderColor="border-emerald-300"
          popupTitle={isHe ? "ROI לפי פרויקט" : "ROI by Project"}
          popupContent={
            <div className="space-y-2">
              {projects.map((p) => {
                const roi = Math.round(100 + Math.random() * 200);
                return (
                  <div key={p.id} className="flex items-center justify-between p-2 rounded-md bg-muted/30">
                    <span className="font-medium">{isHe ? p.name : p.nameEn || p.name}</span>
                    <Badge variant="secondary">{roi}%</Badge>
                  </div>
                );
              })}
              <div className="text-muted-foreground pt-1">📈 {isHe ? "ROI משוקלל כולל:" : "Weighted total:"} {totalROI}</div>
            </div>
          }
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-muted-foreground uppercase">{isHe ? "החזר השקעה" : "Portfolio ROI"}</div>
              <TrendingUp className="size-4 text-emerald-600" />
            </div>
            <div className="text-3xl font-bold text-emerald-600">{totalROI}</div>
            <div className="text-xs text-muted-foreground mt-1">{isHe ? "לחץ לפירוט" : "click for breakdown"}</div>
          </CardContent>
        </ClickableKpiCard>

        {/* Capacity vs Demand */}
        <ClickableKpiCard
          borderColor={isCapacityWarning ? "border-amber-300" : "border-blue-300"}
          popupTitle={isHe ? "ניצולת משאבים לפי חבר צוות" : "Resource Utilization by Member"}
          popupContent={
            <div className="space-y-2">
              {users.map((u) => {
                const fte = mockProjectMembers.filter((m) => m.userId === u.id).reduce((s, m) => s + m.ftePercent, 0);
                const openTasks = tasks.filter((t) => t.assigneeId === u.id && t.status !== "done" && t.status !== "cancelled").length;
                return (
                  <div key={u.id} className="p-2 rounded-md bg-muted/30">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{u.name}</span>
                      <Badge variant={fte > 85 ? "destructive" : "secondary"}>{fte}%</Badge>
                    </div>
                    <Progress value={Math.min(fte, 100)} className="h-1 mt-1" />
                    <div className="text-[10px] text-muted-foreground">{openTasks} {isHe ? "משימות פתוחות" : "open tasks"}</div>
                  </div>
                );
              })}
            </div>
          }
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-muted-foreground uppercase">{isHe ? "ניצולת משאבים" : "Capacity vs Demand"}</div>
              <Users className={cn("size-4", isCapacityWarning ? "text-amber-600" : "text-blue-600")} />
            </div>
            <div className={cn("text-3xl font-bold", isCapacityWarning ? "text-amber-600" : "text-blue-600")}>{capacityUsed}%</div>
            <Progress value={capacityUsed} className="h-1.5 mt-2" />
            {isCapacityWarning && (
              <div className="text-[10px] text-amber-700 dark:text-amber-400 mt-1 flex items-center gap-1">
                <AlertTriangle className="size-3" />
                {isHe ? "שחיקה אפשרית! · לחץ" : "Burnout risk! · click"}
              </div>
            )}
          </CardContent>
        </ClickableKpiCard>

        {/* Active Risk Trend */}
        <ClickableKpiCard
          borderColor="border-red-300"
          popupTitle={isHe ? "סיכונים פעילים" : "Active Risks"}
          popupContent={
            <div className="space-y-2">
              {tasks.filter((t) => t.status === "blocked" || (t.plannedEnd && new Date(t.plannedEnd).getTime() < Date.now() && t.status !== "done" && t.status !== "cancelled")).slice(0, 8).map((t) => (
                <div key={t.id} className="flex items-center justify-between p-2 rounded-md bg-muted/30">
                  <span className="font-medium truncate flex-1">{isHe ? t.title : t.titleEn || t.title}</span>
                  <Badge variant={t.status === "blocked" ? "destructive" : "outline"}>
                    {t.status === "blocked" ? "🚫" : "⚠️"} {t.status === "blocked" ? (isHe ? "חסום" : "Blocked") : (isHe ? "באיחור" : "Overdue")}
                  </Badge>
                </div>
              ))}
              <div className="text-muted-foreground pt-1">📊 {isHe ? "עלייה של 75% ב-6 שבועות" : "75% increase in 6 weeks"}</div>
            </div>
          }
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-muted-foreground uppercase">{isHe ? "מגמת סיכונים" : "Risk Trend"}</div>
              <TrendingUp className="size-4 text-red-600" />
            </div>
            <div className="text-3xl font-bold text-red-600">14</div>
            <div className="text-xs text-red-600 mt-1 flex items-center gap-1">
              <TrendingUp className="size-3" />
              +75% {isHe ? "· לחץ לרשימה" : "· click for list"}
            </div>
          </CardContent>
        </ClickableKpiCard>
      </div>

      {/* Portfolio Health (RAG) + Risk Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* RAG status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{isHe ? "בריאות פורטפוליו (RAG)" : "Portfolio Health (RAG)"}</CardTitle>
            <CardDescription className="flex items-start gap-1.5">
              <Info className="size-3.5 mt-0.5 shrink-0 text-blue-500" />
              <span>
                {isHe
                  ? "מצב כל פרויקט בצבעי רמזור: ירוק / כתום / אדום (בהתאם למגמת ביצוע)."
                  : "Each project's traffic-light status: Green / Amber / Red."}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between p-2.5 rounded-md bg-emerald-50 dark:bg-emerald-950/20">
                <div className="flex items-center gap-2">
                  <div className="size-3 rounded-full bg-emerald-500" />
                  <span className="text-sm font-semibold">{isHe ? "ירוק" : "Green"}</span>
                </div>
                <span className="text-xl font-bold text-emerald-600">{ragGreen}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-md bg-amber-50 dark:bg-amber-950/20">
                <div className="flex items-center gap-2">
                  <div className="size-3 rounded-full bg-amber-500" />
                  <span className="text-sm font-semibold">{isHe ? "כתום" : "Amber"}</span>
                </div>
                <span className="text-xl font-bold text-amber-600">{ragAmber}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-md bg-red-50 dark:bg-red-950/20">
                <div className="flex items-center gap-2">
                  <div className="size-3 rounded-full bg-red-500" />
                  <span className="text-sm font-semibold">{isHe ? "אדום" : "Red"}</span>
                </div>
                <span className="text-xl font-bold text-red-600">{ragRed}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Risk trend chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{isHe ? "מגמת סיכונים פעילים" : "Active Risks Trend"}</CardTitle>
            <CardDescription className="flex items-start gap-1.5">
              <Info className="size-3.5 mt-0.5 shrink-0 text-blue-500" />
              <span>
                {isHe
                  ? "כמות הסיכונים הפעילים ברחבי הפורטפוליו לאורך זמן. עלייה מצביעה על לחץ תפעולי שדורש התערבות."
                  : "Active risks across the portfolio over time. Rise indicates operational pressure needing intervention."}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={riskTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                <Line
                  type="monotone"
                  dataKey="risks"
                  stroke="hsl(0, 84%, 60%)"
                  strokeWidth={3}
                  dot={{ r: 5, fill: "hsl(0, 84%, 60%)" }}
                  name={isHe ? "סיכונים" : "Risks"}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* EVM Metrics + Cost Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* EVM */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{isHe ? "מדדי EVM (ניהול ערך מזוכה)" : "EVM Metrics (Earned Value)"}</CardTitle>
            <CardDescription className="flex items-start gap-1.5">
              <Info className="size-3.5 mt-0.5 shrink-0 text-blue-500" />
              <span>
                {isHe
                  ? "CPI = ביצוע עלות, SPI = ביצוע לו״ז. מעל 1 = טוב יותר מהמתוכנן. מתחת ל-1 = חריגה."
                  : "CPI = Cost Performance, SPI = Schedule Performance. >1 = better than planned, <1 = lagging."}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 rounded-lg border-2 border-amber-300 bg-amber-50/50 dark:bg-amber-950/10">
                <div className="text-[10px] text-muted-foreground uppercase mb-1">CPI</div>
                <div className="text-4xl font-bold text-amber-600">{cpi.toFixed(2)}</div>
                <div className="text-[11px] text-muted-foreground mt-2">
                  {isHe ? "Cost Performance Index" : "Cost Performance Index"}
                </div>
                <div className="text-[10px] text-amber-700 dark:text-amber-400 mt-1">
                  {cpi < 1 ? (isHe ? "חריגה תקציבית" : "Over budget") : (isHe ? "בתקציב" : "On budget")}
                </div>
              </div>
              <div className="text-center p-4 rounded-lg border-2 border-orange-300 bg-orange-50/50 dark:bg-orange-950/10">
                <div className="text-[10px] text-muted-foreground uppercase mb-1">SPI</div>
                <div className="text-4xl font-bold text-orange-600">{spi.toFixed(2)}</div>
                <div className="text-[11px] text-muted-foreground mt-2">
                  {isHe ? "Schedule Performance Index" : "Schedule Performance Index"}
                </div>
                <div className="text-[10px] text-orange-700 dark:text-orange-400 mt-1">
                  {spi < 1 ? (isHe ? "מאחורי הלו״ז" : "Behind schedule") : (isHe ? "בזמן" : "On schedule")}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cost Analysis - CapEx vs OpEx */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{isHe ? "ניתוח עלויות פורטפוליו" : "Portfolio Cost Analysis"}</CardTitle>
            <CardDescription className="flex items-start gap-1.5">
              <Info className="size-3.5 mt-0.5 shrink-0 text-blue-500" />
              <span>
                {isHe
                  ? "פיצול הוצאות הוניות (CapEx) מול תפעוליות (OpEx) ברחבי הפורטפוליו."
                  : "Capital (CapEx) vs Operational (OpEx) split across the portfolio."}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie data={costData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                    {costData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                    formatter={(value: number) => `₪${(value / 1000000).toFixed(1)}M`}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {costData.map((c) => {
                  const pct = (c.value / totalCost) * 100;
                  return (
                    <div key={c.name}>
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <div className="size-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                          <span className="font-semibold">{c.name}</span>
                        </div>
                        <span className="text-muted-foreground">{pct.toFixed(0)}%</span>
                      </div>
                      <div className="text-base font-bold">₪{(c.value / 1000000).toFixed(1)}M</div>
                    </div>
                  );
                })}
                <div className="pt-2 mt-2 border-t">
                  <div className="text-[10px] text-muted-foreground uppercase">{isHe ? "סך הכל" : "Total"}</div>
                  <div className="text-lg font-bold text-primary">₪{(totalCost / 1000000).toFixed(1)}M</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
