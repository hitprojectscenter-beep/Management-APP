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
  ShieldAlert,
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar, Legend, PieChart, Pie, Cell,
} from "recharts";
import { cn } from "@/lib/utils";
import { txt } from "@/lib/utils/locale-text";
import type { MockTask, MockUser, MockWbsNode } from "@/lib/db/mock-data";
import { mockProjectMembers } from "@/lib/db/mock-data";
import {
  calculateCPI, calculateSPI, calculateReworkRate, calculateDecisionLatency,
  calculateNPS, calculateBurnoutRisk, calculateAiAdoptionRate,
} from "@/lib/kpis/advanced-kpis";

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
                    {txt(locale, { he: "מנהל פרויקט", en: "Project Manager", ru: "Менеджер проекта", fr: "Chef de projet", es: "Gerente de proyecto" })}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {txt(locale, { he: "Project Manager · תצוגה תפעולית", en: "Operational tactical view", ru: "Оперативный тактический обзор", fr: "Vue opérationnelle tactique", es: "Vista operativa táctica" })}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-2 line-clamp-2">
                    {txt(locale, { he: '"האם המשימות בפרויקט מסתיימות בזמן ובתקציב?"', en: '"Are project tasks completing on time and on budget?"' })}
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
                    {txt(locale, { he: "מנהל פורטפוליו / PMO", en: "Portfolio / PMO Manager", ru: "Менеджер портфеля / PMO", fr: "Responsable portefeuille / PMO", es: "Gestor de cartera / PMO" })}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {txt(locale, { he: "PMO · ראיית-על אסטרטגית", en: "Strategic oversight view", ru: "Стратегический обзор", fr: "Vue stratégique", es: "Vista estratégica" })}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-2 line-clamp-2">
                    {txt(locale, { he: '"האם אנו עובדים על הפרויקטים הנכונים?"', en: '"Are we working on the right projects?"' })}
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
            {txt(locale, { he: "תצוגת מנהל פרויקט - דשבורד תפעולי", en: "Project Manager Dashboard - Operational view", ru: "Панель менеджера проекта — оперативный обзор", fr: "Tableau de bord Chef de projet — vue opérationnelle", es: "Panel del Gerente de proyecto — vista operativa" })}
          </div>
          <div className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">
            {txt(locale, { he: "מדדי ביצוע ברמת הפרויקט הבודד: לוחות זמנים, throughput, תקציב, ועומס צוות", en: "Project-level KPIs: schedule, throughput, budget, and team workload" })}
          </div>
        </div>
      </div>

      {/* Top KPIs — clickable with info popups */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Schedule Variance */}
        <ClickableKpiCard
          borderColor={schedVar > 3 ? "border-red-300" : schedVar > 0 ? "border-amber-300" : "border-emerald-300"}
          popupTitle={txt(locale, { he: "פרויקטים עם חריגות לו״ז", en: "Projects with Schedule Variance" })}
          popupContent={
            <div className="space-y-2">
              {projects.map((p) => {
                const pTasks = tasks.filter((t) => t.status === "done" && t.actualEnd && t.plannedEnd);
                const variance = pTasks.length > 0
                  ? pTasks.slice(0, 3).reduce((sum, t) => sum + (new Date(t.actualEnd!).getTime() - new Date(t.plannedEnd).getTime()) / 86400000, 0) / Math.min(pTasks.length, 3)
                  : 0;
                return (
                  <div key={p.id} className="flex items-center justify-between p-2 rounded-md bg-muted/30">
                    <span className="font-medium">{locale === "he" ? p.name : p.nameEn || p.name}</span>
                    <Badge variant={variance > 3 ? "destructive" : variance > 0 ? "outline" : "secondary"}>
                      {variance > 0 ? "+" : ""}{variance.toFixed(1)} {txt(locale, { he: "ימים", en: "days" })}
                    </Badge>
                  </div>
                );
              })}
              <div className="text-muted-foreground pt-1">{txt(locale, { he: "💡 חיובי = איחור, שלילי = מוקדם", en: "💡 Positive = late, Negative = early" })}</div>
            </div>
          }
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-muted-foreground uppercase">
                {txt(locale, { he: "חריגת לו״ז", en: "Schedule Variance" })}
              </div>
              <Clock className={cn("size-4", schedVar > 3 ? "text-red-600" : schedVar > 0 ? "text-amber-600" : "text-emerald-600")} />
            </div>
            <div className={cn("text-3xl font-bold", schedVar > 3 ? "text-red-600" : schedVar > 0 ? "text-amber-600" : "text-emerald-600")}>
              {schedVar > 0 ? "+" : ""}{schedVar.toFixed(1)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {txt(locale, { he: "ימים בממוצע · לחץ לפרטים", en: "days average · click for details" })}
            </div>
          </CardContent>
        </ClickableKpiCard>

        {/* Milestone Slippage */}
        <ClickableKpiCard
          borderColor={milestonesSlipped > 0 ? "border-red-300" : "border-emerald-300"}
          popupTitle={txt(locale, { he: "אבני דרך קריטיות", en: "Critical Milestones" })}
          popupContent={
            <div className="space-y-2">
              {tasks.filter((t) => t.priority === "critical" && t.plannedEnd).slice(0, 6).map((t) => {
                const isLate = new Date(t.plannedEnd).getTime() < Date.now() && t.status !== "done";
                return (
                  <div key={t.id} className="flex items-center justify-between p-2 rounded-md bg-muted/30">
                    <span className="font-medium truncate flex-1">{locale === "he" ? t.title : t.titleEn || t.title}</span>
                    <Badge variant={isLate ? "destructive" : t.status === "done" ? "secondary" : "outline"}>
                      {isLate ? txt(locale, { he: "באיחור", en: "Late" }) : t.status === "done" ? "✅" : txt(locale, { he: "בזמן", en: "On time" })}
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
                {txt(locale, { he: "אבני דרך באיחור", en: "Milestone Slippage" })}
              </div>
              <Flag className={cn("size-4", milestonesSlipped > 0 ? "text-red-600" : "text-emerald-600")} />
            </div>
            <div className={cn("text-3xl font-bold", milestonesSlipped > 0 ? "text-red-600" : "text-emerald-600")}>
              {milestonesSlipped}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {txt(locale, { he: "לחץ לרשימת אבני דרך", en: "click for milestone list" })}
            </div>
          </CardContent>
        </ClickableKpiCard>

        {/* Throughput Avg */}
        <ClickableKpiCard
          borderColor="border-blue-300"
          popupTitle={txt(locale, { he: "Throughput — פירוט שבועי", en: "Weekly Throughput Breakdown" })}
          popupContent={
            <div className="space-y-2">
              {throughputData.map((w) => (
                <div key={w.week} className="flex items-center justify-between p-2 rounded-md bg-muted/30">
                  <span className="font-medium">{w.week}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-600">{txt(locale, { he: "תכנון", en: "Plan" })}: {w.planned}</span>
                    <span className="text-emerald-600">{txt(locale, { he: "ביצוע", en: "Actual" })}: {w.actual}</span>
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
                {txt(locale, { he: "Throughput שבועי", en: "Weekly Throughput" })}
              </div>
              <Activity className="size-4 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-blue-600">13.5/16</div>
            <div className="text-xs text-muted-foreground mt-1">
              {txt(locale, { he: "ביצוע מול תכנון · לחץ לפרטים", en: "actual vs planned · click for details" })}
            </div>
          </CardContent>
        </ClickableKpiCard>

        {/* Budget Adherence */}
        <ClickableKpiCard
          borderColor={isOverBudget ? "border-red-300" : "border-emerald-300"}
          popupTitle={txt(locale, { he: "פירוט תקציבי לפי פרויקט", en: "Budget Breakdown by Project" })}
          popupContent={
            <div className="space-y-2">
              {projects.map((p, i) => {
                const allocated = Math.round(budgetTotal / projects.length);
                const spent = Math.round(allocated * (0.5 + Math.random() * 0.4));
                const pct = Math.round((spent / allocated) * 100);
                return (
                  <div key={p.id} className="p-2 rounded-md bg-muted/30">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{locale === "he" ? p.name : p.nameEn || p.name}</span>
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
                {txt(locale, { he: "ניצול תקציב", en: "Budget Adherence" })}
              </div>
              <DollarSign className={cn("size-4", isOverBudget ? "text-red-600" : "text-emerald-600")} />
            </div>
            <div className={cn("text-3xl font-bold", isOverBudget ? "text-red-600" : "text-emerald-600")}>
              {budgetPercent.toFixed(0)}%
            </div>
            <Progress value={budgetPercent} className="h-1.5 mt-2" />
            <div className="text-xs text-muted-foreground mt-1">
              ₪{(budgetSpent / 1000).toFixed(0)}k / ₪{(budgetTotal / 1000).toFixed(0)}k · {txt(locale, { he: "לחץ", en: "click" })}
            </div>
          </CardContent>
        </ClickableKpiCard>
      </div>

      {/* NEW: Management Attention Index + Risk Response Compliance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Management Attention Index (MAI) — "Executive Engagement Score" */}
        <ClickableKpiCard
          borderColor="border-violet-300"
          popupTitle={txt(locale, { he: "מדד קשב ניהולי (MAI) — פירוט", en: "Management Attention Index (MAI) — Details" })}
          popupContent={
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground mb-2">
                {txt(locale, {
                  he: "מודד את מספר הכניסות של דרג ניהולי (בעלים, מנכ\"ל, מנהל חטיבה) למדדי הפרויקט ב-7 הימים האחרונים. ציון גבוה מעיד על מעורבות ניהולית פעילה.",
                  en: "Measures senior management logins (owners, CEO, division heads) to project KPIs in the last 7 days. High score indicates active executive engagement.",
                })}
              </div>
              {[
                { name: txt(locale, { he: "מנכ\"ל", en: "CEO" }), visits: 3, trend: "+1" },
                { name: txt(locale, { he: "מנהל כלל הפעילויות", en: "Operations Manager" }), visits: 7, trend: "+2" },
                { name: txt(locale, { he: "בעלים - שיווק", en: "Marketing Owner" }), visits: 4, trend: "0" },
                { name: txt(locale, { he: "בעלים - CRM", en: "CRM Owner" }), visits: 2, trend: "-1" },
              ].map((mgr, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-md bg-muted/30">
                  <span className="font-medium text-xs">{mgr.name}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{mgr.visits} {txt(locale, { he: "כניסות", en: "visits" })}</Badge>
                    <span className={`text-[10px] ${mgr.trend.startsWith("+") ? "text-emerald-600" : mgr.trend.startsWith("-") ? "text-red-600" : "text-muted-foreground"}`}>{mgr.trend}</span>
                  </div>
                </div>
              ))}
              <div className="text-[10px] text-muted-foreground pt-1">
                {txt(locale, { he: "📊 מקובל בספרות: Executive Engagement Score (EES) / Management Attention Index", en: "📊 Industry term: Executive Engagement Score (EES) / Management Attention Index" })}
              </div>
            </div>
          }
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-muted-foreground uppercase">
                {txt(locale, { he: "מדד קשב ניהולי (MAI)", en: "Mgmt Attention Index" })}
              </div>
              <Users className="size-4 text-violet-600" />
            </div>
            <div className="text-3xl font-bold text-violet-600">16</div>
            <div className="text-xs text-muted-foreground mt-1">
              {txt(locale, { he: "כניסות דרג ניהולי ב-7 ימים · לחץ", en: "executive visits in 7 days · click" })}
            </div>
            <Progress value={64} className="h-1.5 mt-2" />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>{txt(locale, { he: "יעד: 25 כניסות/שבוע", en: "Target: 25 visits/week" })}</span>
              <span>64%</span>
            </div>
          </CardContent>
        </ClickableKpiCard>

        {/* Risk Response Compliance (RRC) — "Risk Mitigation Adherence Rate" */}
        <ClickableKpiCard
          borderColor="border-rose-300"
          popupTitle={txt(locale, { he: "מדד ציות לניהול סיכונים (RRC) — פירוט", en: "Risk Response Compliance (RRC) — Details" })}
          popupContent={
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground mb-2">
                {txt(locale, {
                  he: "מודד עד כמה מנהל הפרויקט והצוות פועלים בהתאם להמלצות AI לניהול סיכונים. כולל: ביצוע פעולות גידור, עמידה ביעדי זמן, ותגובה להתראות.",
                  en: "Measures how well the PM and team follow AI risk recommendations. Includes: mitigation actions executed, timeline compliance, and alert responses.",
                })}
              </div>
              {[
                { action: txt(locale, { he: "פעולות גידור שבוצעו", en: "Mitigations executed" }), done: 5, total: 7 },
                { action: txt(locale, { he: "עמידה ביעדי זמן", en: "Timeline compliance" }), done: 4, total: 7 },
                { action: txt(locale, { he: "תגובה להתראות AI", en: "AI alert responses" }), done: 6, total: 8 },
              ].map((item, i) => (
                <div key={i} className="p-2 rounded-md bg-muted/30">
                  <div className="flex items-center justify-between text-xs">
                    <span>{item.action}</span>
                    <Badge variant={item.done / item.total > 0.7 ? "secondary" : "destructive"}>
                      {item.done}/{item.total}
                    </Badge>
                  </div>
                  <Progress value={(item.done / item.total) * 100} className="h-1 mt-1" />
                </div>
              ))}
              <div className="text-[10px] text-muted-foreground pt-1">
                {txt(locale, { he: "📊 מקובל בספרות: Risk Response Compliance Rate / Risk Mitigation Adherence", en: "📊 Industry term: Risk Response Compliance Rate / Mitigation Adherence" })}
              </div>
            </div>
          }
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-muted-foreground uppercase">
                {txt(locale, { he: "ציות לניהול סיכונים (RRC)", en: "Risk Response Compliance" })}
              </div>
              <ShieldAlert className="size-4 text-rose-600" />
            </div>
            <div className="text-3xl font-bold text-rose-600">68%</div>
            <div className="text-xs text-muted-foreground mt-1">
              {txt(locale, { he: "ציות להמלצות AI · לחץ לפרטים", en: "AI recommendation compliance · click" })}
            </div>
            <Progress value={68} className="h-1.5 mt-2" />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>{txt(locale, { he: "יעד: 80%+", en: "Target: 80%+" })}</span>
              <span className="text-amber-600">{txt(locale, { he: "דורש שיפור", en: "Needs improvement" })}</span>
            </div>
          </CardContent>
        </ClickableKpiCard>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Throughput chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{txt(locale, { he: "Throughput - מתוכנן מול ביצוע", en: "Throughput - Planned vs Actual" })}</CardTitle>
            <CardDescription className="flex items-start gap-1.5">
              <Info className="size-3.5 mt-0.5 shrink-0 text-blue-500" />
              <span>
                {txt(locale, { he: "השוואה שבועית של מספר המשימות שתוכננו לעומת אלו שנסגרו בפועל. פער מתמשך מצביע על קצב עבודה איטי מהצפוי.", en: "Weekly comparison of planned vs actually closed tasks. Persistent gap = slower than expected pace." })}
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
                <Bar dataKey="planned" name={txt(locale, { he: "מתוכנן", en: "Planned" })} fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actual" name={txt(locale, { he: "ביצוע", en: "Actual" })} fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Workload chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{txt(locale, { he: "עומס וניצולת הצוות", en: "Team Workload & Utilization" })}</CardTitle>
            <CardDescription className="flex items-start gap-1.5">
              <Info className="size-3.5 mt-0.5 shrink-0 text-blue-500" />
              <span>
                {txt(locale, { he: "התפלגות משימות לכל חבר צוות (פתוחות / הושלמו / חסומות). מאפשר זיהוי צווארי בקבוק או עומס יתר נקודתי.", en: "Per-member task distribution. Helps spot bottlenecks or pinpoint overload." })}
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
                <Bar dataKey="open" name={txt(locale, { he: "פתוחות", en: "Open" })} stackId="a" fill="hsl(217, 91%, 60%)" />
                <Bar dataKey="done" name={txt(locale, { he: "הושלמו", en: "Done" })} stackId="a" fill="hsl(142, 71%, 45%)" />
                <Bar dataKey="blocked" name={txt(locale, { he: "חסומות", en: "Blocked" })} stackId="a" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ===== ADVANCED KPIs — EVM + Quality Metrics ===== */}
      <AdvancedKpisPanel tasks={tasks} users={users} locale={locale} context="pm" />
    </div>
  );
}

// ============================================
// ADVANCED KPIs PANEL — shared between PM and PMO views
// ============================================
function AdvancedKpisPanel({
  tasks, users, locale, context,
}: {
  tasks: MockTask[];
  users: MockUser[];
  locale: string;
  context: "pm" | "pmo";
}) {
  const cpi = calculateCPI(tasks);
  const spi = calculateSPI(tasks);
  const rework = calculateReworkRate(tasks);
  const decisionLatency = calculateDecisionLatency();
  const nps = calculateNPS();
  const burnout = calculateBurnoutRisk(users, tasks, mockProjectMembers);
  const aiAdoption = calculateAiAdoptionRate();

  const statusColor = (s: "good" | "warning" | "critical") =>
    s === "good" ? "emerald" : s === "warning" ? "amber" : "red";
  const borderColor = (s: "good" | "warning" | "critical") =>
    s === "good" ? "border-emerald-300" : s === "warning" ? "border-amber-300" : "border-red-300";
  const textColor = (s: "good" | "warning" | "critical") =>
    s === "good" ? "text-emerald-600" : s === "warning" ? "text-amber-600" : "text-red-600";

  // PM sees: CPI, SPI, Rework. PMO sees: Decision Latency, NPS, Burnout, AI Adoption.
  const pmMetrics = (
    <>
      {/* CPI */}
      <ClickableKpiCard
        borderColor={borderColor(cpi.status)}
        popupTitle={txt(locale, { he: "CPI — Cost Performance Index", en: "CPI — Cost Performance Index" })}
        popupContent={
          <div className="space-y-2 text-xs">
            <p><strong>{txt(locale, { he: "מקור:", en: "Source:" })}</strong> PMBOK® Guide — EVM Standard</p>
            <p><strong>{txt(locale, { he: "נוסחה:", en: "Formula:" })}</strong> EV / AC</p>
            <p className="pt-2">{txt(locale, {
              he: "מדד יעילות עלות: יחס בין הערך שהושג (שעות מתוכננות של משימות שהושלמו) לעלות בפועל. מעל 1.0 = מתחת לתקציב. מתחת ל-1.0 = חריגה.",
              en: "Cost efficiency: ratio of Earned Value (planned hours of done tasks) to Actual Cost. >1.0 = under budget. <1.0 = over budget.",
            })}</p>
            <div className="bg-muted/30 rounded-md p-2 mt-2">
              <div className="flex justify-between"><span>{txt(locale, { he: "ערך נוכחי", en: "Current value" })}</span><strong>{cpi.value}</strong></div>
              <div className="flex justify-between"><span>{txt(locale, { he: "יעד תעשייתי", en: "Industry target" })}</span><strong>≥ 0.95</strong></div>
            </div>
          </div>
        }
      >
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-muted-foreground uppercase">CPI</div>
            <DollarSign className={cn("size-4", textColor(cpi.status))} />
          </div>
          <div className={cn("text-3xl font-bold", textColor(cpi.status))}>{cpi.value}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {txt(locale, { he: "יעילות עלות · יעד ≥ 0.95", en: "Cost efficiency · target ≥ 0.95" })}
          </div>
        </CardContent>
      </ClickableKpiCard>

      {/* SPI */}
      <ClickableKpiCard
        borderColor={borderColor(spi.status)}
        popupTitle={txt(locale, { he: "SPI — Schedule Performance Index", en: "SPI — Schedule Performance Index" })}
        popupContent={
          <div className="space-y-2 text-xs">
            <p><strong>{txt(locale, { he: "מקור:", en: "Source:" })}</strong> PMBOK® Guide — EVM</p>
            <p><strong>{txt(locale, { he: "נוסחה:", en: "Formula:" })}</strong> EV / PV</p>
            <p className="pt-2">{txt(locale, {
              he: "מדד ביצוע לוח זמנים: יחס בין עבודה שהושגה לעבודה שהייתה מתוכננת עד כה. מעל 1.0 = לפני הזמן. מתחת = פיגור.",
              en: "Schedule efficiency: ratio of Earned Value to Planned Value. >1.0 = ahead. <1.0 = behind schedule.",
            })}</p>
            <div className="bg-muted/30 rounded-md p-2 mt-2">
              <div className="flex justify-between"><span>{txt(locale, { he: "ערך נוכחי", en: "Current" })}</span><strong>{spi.value}</strong></div>
              <div className="flex justify-between"><span>{txt(locale, { he: "יעד", en: "Target" })}</span><strong>≥ 0.95</strong></div>
            </div>
          </div>
        }
      >
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-muted-foreground uppercase">SPI</div>
            <Clock className={cn("size-4", textColor(spi.status))} />
          </div>
          <div className={cn("text-3xl font-bold", textColor(spi.status))}>{spi.value}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {txt(locale, { he: "יעילות לו\"ז · יעד ≥ 0.95", en: "Schedule efficiency · target ≥ 0.95" })}
          </div>
        </CardContent>
      </ClickableKpiCard>

      {/* Rework Rate */}
      <ClickableKpiCard
        borderColor={borderColor(rework.status)}
        popupTitle={txt(locale, { he: "Rework Rate — אחוז עבודה חוזרת", en: "Rework Rate" })}
        popupContent={
          <div className="space-y-2 text-xs">
            <p><strong>{txt(locale, { he: "מקור:", en: "Source:" })}</strong> ISO 9001, Six Sigma</p>
            <p className="pt-2">{txt(locale, {
              he: "אחוז משימות שנזקקו לעבודה מחדש (שעות בפועל מעל 150% מההערכה). Rework גבוה = הגדרות דרישות לקויות, לחץ זמן, חוסר תקשורת.",
              en: "% of tasks needing rework (actual > 150% of estimate). High rework = poor requirements, time pressure, miscommunication.",
            })}</p>
            <div className="bg-muted/30 rounded-md p-2 mt-2">
              <div className="flex justify-between"><span>{txt(locale, { he: "משימות עם rework", en: "Reworked tasks" })}</span><strong>{rework.reworked}</strong></div>
              <div className="flex justify-between"><span>{txt(locale, { he: "יעד בריא", en: "Healthy target" })}</span><strong>&lt; 15%</strong></div>
            </div>
          </div>
        }
      >
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-muted-foreground uppercase">{txt(locale, { he: "Rework Rate", en: "Rework Rate" })}</div>
            <TrendingDown className={cn("size-4", textColor(rework.status))} />
          </div>
          <div className={cn("text-3xl font-bold", textColor(rework.status))}>{rework.value}%</div>
          <div className="text-xs text-muted-foreground mt-1">
            {txt(locale, { he: `${rework.reworked} משימות · יעד < 15%`, en: `${rework.reworked} tasks · target < 15%` })}
          </div>
        </CardContent>
      </ClickableKpiCard>
    </>
  );

  const pmoMetrics = (
    <>
      {/* Decision Latency */}
      <ClickableKpiCard
        borderColor={borderColor(decisionLatency.status)}
        popupTitle={txt(locale, { he: "Decision Latency — זמן קבלת החלטות", en: "Decision Latency" })}
        popupContent={
          <div className="space-y-2 text-xs">
            <p><strong>{txt(locale, { he: "מקור:", en: "Source:" })}</strong> McKinsey Organizational Health Index 2023</p>
            <p className="pt-2">{txt(locale, {
              he: "זמן ממוצע מהעלאת נושא/סיכון ועד החלטה סופית. ארגונים זריזים: < 48 שעות. איטיים: > 72 שעות — פוגע בתחרותיות.",
              en: "Avg hours from issue raised to decision made. Agile orgs: < 48h. Slow: > 72h — hurts competitiveness.",
            })}</p>
            <div className="bg-muted/30 rounded-md p-2 mt-2">
              <div className="flex justify-between"><span>{txt(locale, { he: "החלטות ממתינות", en: "Pending decisions" })}</span><strong>{decisionLatency.pending}</strong></div>
              <div className="flex justify-between"><span>{txt(locale, { he: "יעד", en: "Target" })}</span><strong>&lt; 48h</strong></div>
            </div>
            <p className="text-[10px] text-muted-foreground pt-1">
              📚 McKinsey: ארגונים זריזים צומחים ב-30% יותר (2023)
            </p>
          </div>
        }
      >
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-muted-foreground uppercase">{txt(locale, { he: "Decision Latency", en: "Decision Latency" })}</div>
            <Clock className={cn("size-4", textColor(decisionLatency.status))} />
          </div>
          <div className={cn("text-3xl font-bold", textColor(decisionLatency.status))}>{decisionLatency.avgHours}h</div>
          <div className="text-xs text-muted-foreground mt-1">
            {txt(locale, { he: `זמן קבלת החלטה · ${decisionLatency.pending} ממתינות`, en: `avg decision time · ${decisionLatency.pending} pending` })}
          </div>
        </CardContent>
      </ClickableKpiCard>

      {/* Stakeholder NPS */}
      <ClickableKpiCard
        borderColor={borderColor(nps.status)}
        popupTitle={txt(locale, { he: "Stakeholder NPS — שביעות רצון", en: "Stakeholder NPS" })}
        popupContent={
          <div className="space-y-2 text-xs">
            <p><strong>{txt(locale, { he: "מקור:", en: "Source:" })}</strong> Bain & Company NPS Methodology</p>
            <p><strong>{txt(locale, { he: "נוסחה:", en: "Formula:" })}</strong> %Promoters (9-10) − %Detractors (0-6)</p>
            <p className="pt-2">{txt(locale, {
              he: "מדד נטו של שביעות רצון בעלי עניין. מעל +50 = מצוין. בין 0 ל-30 = דורש שיפור. שלילי = בעיה קריטית.",
              en: "Net satisfaction of stakeholders. >+50 = excellent. 0-30 = needs improvement. Negative = critical.",
            })}</p>
            <div className="grid grid-cols-3 gap-1 mt-2 text-[10px]">
              <div className="bg-emerald-100 dark:bg-emerald-950/30 p-2 rounded text-center">
                <div className="font-bold text-emerald-700">{nps.promoters}</div>
                <div>{txt(locale, { he: "מקדמים", en: "Promoters" })}</div>
              </div>
              <div className="bg-amber-100 dark:bg-amber-950/30 p-2 rounded text-center">
                <div className="font-bold text-amber-700">{nps.passives}</div>
                <div>{txt(locale, { he: "פסיביים", en: "Passives" })}</div>
              </div>
              <div className="bg-red-100 dark:bg-red-950/30 p-2 rounded text-center">
                <div className="font-bold text-red-700">{nps.detractors}</div>
                <div>{txt(locale, { he: "מתנגדים", en: "Detractors" })}</div>
              </div>
            </div>
          </div>
        }
      >
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-muted-foreground uppercase">NPS</div>
            <Sparkles className={cn("size-4", textColor(nps.status))} />
          </div>
          <div className={cn("text-3xl font-bold", textColor(nps.status))}>{nps.value > 0 ? "+" : ""}{nps.value}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {txt(locale, { he: `${nps.total} תגובות · יעד > +30`, en: `${nps.total} responses · target > +30` })}
          </div>
        </CardContent>
      </ClickableKpiCard>

      {/* Burnout Risk */}
      <ClickableKpiCard
        borderColor={borderColor(burnout.status)}
        popupTitle={txt(locale, { he: "Burnout Risk — סיכון שחיקה", en: "Burnout Risk Index" })}
        popupContent={
          <div className="space-y-2 text-xs">
            <p><strong>{txt(locale, { he: "מקור:", en: "Source:" })}</strong> Maslach Burnout Inventory (MBI)</p>
            <p className="pt-2">{txt(locale, {
              he: "מדד סיכון שחיקה מבוסס FTE, משימות באיחור, וסיכונים קריטיים. ארגונים שלא עוקבים מאבדים 5-10% כוח אדם שנתי.",
              en: "Burnout risk based on FTE, overdue tasks, and critical items. Companies that don't track lose 5-10% staff/year.",
            })}</p>
            {burnout.atRiskUsers.length > 0 && (
              <div className="bg-red-50 dark:bg-red-950/20 rounded-md p-2 mt-2">
                <div className="font-semibold text-red-700 mb-1">⚠️ {txt(locale, { he: "בסיכון גבוה:", en: "High risk:" })}</div>
                {burnout.atRiskUsers.map((u) => (
                  <div key={u.userId} className="flex justify-between">
                    <span>{u.userName}</span>
                    <strong>{u.score}/100</strong>
                  </div>
                ))}
              </div>
            )}
          </div>
        }
      >
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-muted-foreground uppercase">{txt(locale, { he: "Burnout Risk", en: "Burnout Risk" })}</div>
            <AlertTriangle className={cn("size-4", textColor(burnout.status))} />
          </div>
          <div className={cn("text-3xl font-bold", textColor(burnout.status))}>{burnout.avgScore}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {txt(locale, { he: `ממוצע · ${burnout.atRiskUsers.length} בסיכון`, en: `avg · ${burnout.atRiskUsers.length} at risk` })}
          </div>
        </CardContent>
      </ClickableKpiCard>

      {/* AI Adoption */}
      <ClickableKpiCard
        borderColor={borderColor(aiAdoption.status)}
        popupTitle={txt(locale, { he: "AI Adoption Rate", en: "AI Recommendation Adoption Rate" })}
        popupContent={
          <div className="space-y-2 text-xs">
            <p><strong>{txt(locale, { he: "מקור:", en: "Source:" })}</strong> Gartner AI in Project Management 2024</p>
            <p className="pt-2">{txt(locale, {
              he: "אחוז המלצות AI שאומצו ויושמו. יישום גבוה (>60%) = תרבות אימוץ טכנולוגי בריאה. נמוך = התנגדות או חוסר אמון.",
              en: "% of AI recommendations adopted by PMs. High (>60%) = healthy tech adoption culture. Low = resistance or mistrust.",
            })}</p>
            <div className="bg-muted/30 rounded-md p-2 mt-2">
              <div className="flex justify-between"><span>{txt(locale, { he: "אומצו", en: "Adopted" })}</span><strong>{aiAdoption.adopted}</strong></div>
              <div className="flex justify-between"><span>{txt(locale, { he: "סה\"כ המלצות", en: "Total recs" })}</span><strong>{aiAdoption.total}</strong></div>
              <div className="flex justify-between"><span>{txt(locale, { he: "יעד", en: "Target" })}</span><strong>&gt; 60%</strong></div>
            </div>
          </div>
        }
      >
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-muted-foreground uppercase">{txt(locale, { he: "AI Adoption", en: "AI Adoption" })}</div>
            <Sparkles className={cn("size-4", textColor(aiAdoption.status))} />
          </div>
          <div className={cn("text-3xl font-bold", textColor(aiAdoption.status))}>{aiAdoption.value}%</div>
          <div className="text-xs text-muted-foreground mt-1">
            {txt(locale, { he: `${aiAdoption.adopted}/${aiAdoption.total} המלצות · יעד > 60%`, en: `${aiAdoption.adopted}/${aiAdoption.total} recs · target > 60%` })}
          </div>
        </CardContent>
      </ClickableKpiCard>
    </>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 pt-2">
        <BarChart3 className="size-5 text-primary" />
        <h3 className="font-bold text-lg">
          {txt(locale, { he: "⭐ מדדי KPI מתקדמים", en: "⭐ Advanced KPIs" })}
        </h3>
        <Badge variant="outline" className="text-[10px]">PMBOK · EVM · McKinsey · Bain · MBI · Gartner</Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        {txt(locale, {
          he: "מדדים מבוססי תקנים בינלאומיים. לחץ על כל כרטיס לפרטים ומקורות.",
          en: "Industry-standard metrics. Click any card for details and sources.",
        })}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {context === "pm" ? pmMetrics : pmoMetrics}
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
            {txt(locale, { he: "תצוגת PMO / מנהל פורטפוליו - ראייה אסטרטגית", en: "PMO / Portfolio Manager - Strategic view", ru: "PMO / Менеджер портфеля — стратегический обзор", fr: "PMO / Responsable portefeuille — vue stratégique", es: "PMO / Gestor de cartera — vista estratégica" })}
          </div>
          <div className="text-xs text-purple-700 dark:text-purple-400 mt-0.5">
            {txt(locale, { he: "מדדים רוחביים: יישור אסטרטגי, ROI, קיבולת ארגונית, בריאות פורטפוליו, ועלויות EVM", en: "Cross-portfolio: alignment, ROI, capacity, health (RAG), EVM cost analysis" })}
          </div>
        </div>
      </div>

      {/* Top KPIs - PMO specific — clickable with info popups */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Strategic Alignment */}
        <ClickableKpiCard
          borderColor="border-purple-300"
          popupTitle={txt(locale, { he: "פרויקטים פעילים", en: "Active Projects" })}
          popupContent={
            <div className="space-y-2">
              {projects.map((p) => {
                const pTasks = tasks.filter((t) => t.wbsNodeId === p.id || true);
                const aligned = Math.random() > 0.3;
                return (
                  <div key={p.id} className="flex items-center justify-between p-2 rounded-md bg-muted/30">
                    <span className="font-medium">{locale === "he" ? p.name : p.nameEn || p.name}</span>
                    <Badge variant={aligned ? "secondary" : "destructive"}>
                      {aligned ? "✅ " + txt(locale, { he: "מיושר", en: "Aligned" }) : "⚠️ " + txt(locale, { he: "לא מיושר", en: "Misaligned" })}
                    </Badge>
                  </div>
                );
              })}
              <div className="text-muted-foreground pt-1">💡 {txt(locale, { he: "ציון כולל:", en: "Overall:" })} {strategicAlignment}%</div>
            </div>
          }
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-muted-foreground uppercase">{txt(locale, { he: "יישור אסטרטגי", en: "Strategic Alignment" })}</div>
              <Target className="size-4 text-purple-600" />
            </div>
            <div className="text-3xl font-bold text-purple-600">{strategicAlignment}%</div>
            <Progress value={strategicAlignment} className="h-1.5 mt-2" />
            <div className="text-xs text-muted-foreground mt-1">{txt(locale, { he: "לחץ לפרויקטים", en: "click for projects" })}</div>
          </CardContent>
        </ClickableKpiCard>

        {/* ROI */}
        <ClickableKpiCard
          borderColor="border-emerald-300"
          popupTitle={txt(locale, { he: "ROI לפי פרויקט", en: "ROI by Project" })}
          popupContent={
            <div className="space-y-2">
              {projects.map((p) => {
                const roi = Math.round(100 + Math.random() * 200);
                return (
                  <div key={p.id} className="flex items-center justify-between p-2 rounded-md bg-muted/30">
                    <span className="font-medium">{locale === "he" ? p.name : p.nameEn || p.name}</span>
                    <Badge variant="secondary">{roi}%</Badge>
                  </div>
                );
              })}
              <div className="text-muted-foreground pt-1">📈 {txt(locale, { he: "ROI משוקלל כולל:", en: "Weighted total:" })} {totalROI}</div>
            </div>
          }
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-muted-foreground uppercase">{txt(locale, { he: "החזר השקעה", en: "Portfolio ROI" })}</div>
              <TrendingUp className="size-4 text-emerald-600" />
            </div>
            <div className="text-3xl font-bold text-emerald-600">{totalROI}</div>
            <div className="text-xs text-muted-foreground mt-1">{txt(locale, { he: "לחץ לפירוט", en: "click for breakdown" })}</div>
          </CardContent>
        </ClickableKpiCard>

        {/* Capacity vs Demand */}
        <ClickableKpiCard
          borderColor={isCapacityWarning ? "border-amber-300" : "border-blue-300"}
          popupTitle={txt(locale, { he: "ניצולת משאבים לפי חבר צוות", en: "Resource Utilization by Member" })}
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
                    <div className="text-[10px] text-muted-foreground">{openTasks} {txt(locale, { he: "משימות פתוחות", en: "open tasks" })}</div>
                  </div>
                );
              })}
            </div>
          }
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-muted-foreground uppercase">{txt(locale, { he: "ניצולת משאבים", en: "Capacity vs Demand" })}</div>
              <Users className={cn("size-4", isCapacityWarning ? "text-amber-600" : "text-blue-600")} />
            </div>
            <div className={cn("text-3xl font-bold", isCapacityWarning ? "text-amber-600" : "text-blue-600")}>{capacityUsed}%</div>
            <Progress value={capacityUsed} className="h-1.5 mt-2" />
            {isCapacityWarning && (
              <div className="text-[10px] text-amber-700 dark:text-amber-400 mt-1 flex items-center gap-1">
                <AlertTriangle className="size-3" />
                {txt(locale, { he: "שחיקה אפשרית! · לחץ", en: "Burnout risk! · click" })}
              </div>
            )}
          </CardContent>
        </ClickableKpiCard>

        {/* Active Risk Trend */}
        <ClickableKpiCard
          borderColor="border-red-300"
          popupTitle={txt(locale, { he: "סיכונים פעילים", en: "Active Risks" })}
          popupContent={
            <div className="space-y-2">
              {tasks.filter((t) => t.status === "blocked" || (t.plannedEnd && new Date(t.plannedEnd).getTime() < Date.now() && t.status !== "done" && t.status !== "cancelled")).slice(0, 8).map((t) => (
                <div key={t.id} className="flex items-center justify-between p-2 rounded-md bg-muted/30">
                  <span className="font-medium truncate flex-1">{locale === "he" ? t.title : t.titleEn || t.title}</span>
                  <Badge variant={t.status === "blocked" ? "destructive" : "outline"}>
                    {t.status === "blocked" ? "🚫" : "⚠️"} {t.status === "blocked" ? txt(locale, { he: "חסום", en: "Blocked" }) : txt(locale, { he: "באיחור", en: "Overdue" })}
                  </Badge>
                </div>
              ))}
              <div className="text-muted-foreground pt-1">📊 {txt(locale, { he: "עלייה של 75% ב-6 שבועות", en: "75% increase in 6 weeks" })}</div>
            </div>
          }
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-muted-foreground uppercase">{txt(locale, { he: "מגמת סיכונים", en: "Risk Trend" })}</div>
              <TrendingUp className="size-4 text-red-600" />
            </div>
            <div className="text-3xl font-bold text-red-600">14</div>
            <div className="text-xs text-red-600 mt-1 flex items-center gap-1">
              <TrendingUp className="size-3" />
              +75% {txt(locale, { he: "· לחץ לרשימה", en: "· click for list" })}
            </div>
          </CardContent>
        </ClickableKpiCard>
      </div>

      {/* Portfolio Health (RAG) + Risk Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* RAG status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{txt(locale, { he: "בריאות פורטפוליו (RAG)", en: "Portfolio Health (RAG)" })}</CardTitle>
            <CardDescription className="flex items-start gap-1.5">
              <Info className="size-3.5 mt-0.5 shrink-0 text-blue-500" />
              <span>
                {txt(locale, { he: "מצב כל פרויקט בצבעי רמזור: ירוק / כתום / אדום (בהתאם למגמת ביצוע).", en: "Each project's traffic-light status: Green / Amber / Red." })}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between p-2.5 rounded-md bg-emerald-50 dark:bg-emerald-950/20">
                <div className="flex items-center gap-2">
                  <div className="size-3 rounded-full bg-emerald-500" />
                  <span className="text-sm font-semibold">{txt(locale, { he: "ירוק", en: "Green" })}</span>
                </div>
                <span className="text-xl font-bold text-emerald-600">{ragGreen}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-md bg-amber-50 dark:bg-amber-950/20">
                <div className="flex items-center gap-2">
                  <div className="size-3 rounded-full bg-amber-500" />
                  <span className="text-sm font-semibold">{txt(locale, { he: "כתום", en: "Amber" })}</span>
                </div>
                <span className="text-xl font-bold text-amber-600">{ragAmber}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-md bg-red-50 dark:bg-red-950/20">
                <div className="flex items-center gap-2">
                  <div className="size-3 rounded-full bg-red-500" />
                  <span className="text-sm font-semibold">{txt(locale, { he: "אדום", en: "Red" })}</span>
                </div>
                <span className="text-xl font-bold text-red-600">{ragRed}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Risk trend chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{txt(locale, { he: "מגמת סיכונים פעילים", en: "Active Risks Trend" })}</CardTitle>
            <CardDescription className="flex items-start gap-1.5">
              <Info className="size-3.5 mt-0.5 shrink-0 text-blue-500" />
              <span>
                {txt(locale, { he: "כמות הסיכונים הפעילים ברחבי הפורטפוליו לאורך זמן. עלייה מצביעה על לחץ תפעולי שדורש התערבות.", en: "Active risks across the portfolio over time. Rise indicates operational pressure needing intervention." })}
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
                  name={txt(locale, { he: "סיכונים", en: "Risks" })}
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
            <CardTitle className="text-base">{txt(locale, { he: "מדדי EVM (ניהול ערך מזוכה)", en: "EVM Metrics (Earned Value)" })}</CardTitle>
            <CardDescription className="flex items-start gap-1.5">
              <Info className="size-3.5 mt-0.5 shrink-0 text-blue-500" />
              <span>
                {txt(locale, { he: "CPI = ביצוע עלות, SPI = ביצוע לו״ז. מעל 1 = טוב יותר מהמתוכנן. מתחת ל-1 = חריגה.", en: "CPI = Cost Performance, SPI = Schedule Performance. >1 = better than planned, <1 = lagging." })}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 rounded-lg border-2 border-amber-300 bg-amber-50/50 dark:bg-amber-950/10">
                <div className="text-[10px] text-muted-foreground uppercase mb-1">CPI</div>
                <div className="text-4xl font-bold text-amber-600">{cpi.toFixed(2)}</div>
                <div className="text-[11px] text-muted-foreground mt-2">
                  Cost Performance Index
                </div>
                <div className="text-[10px] text-amber-700 dark:text-amber-400 mt-1">
                  {cpi < 1 ? txt(locale, { he: "חריגה תקציבית", en: "Over budget" }) : txt(locale, { he: "בתקציב", en: "On budget" })}
                </div>
              </div>
              <div className="text-center p-4 rounded-lg border-2 border-orange-300 bg-orange-50/50 dark:bg-orange-950/10">
                <div className="text-[10px] text-muted-foreground uppercase mb-1">SPI</div>
                <div className="text-4xl font-bold text-orange-600">{spi.toFixed(2)}</div>
                <div className="text-[11px] text-muted-foreground mt-2">
                  Schedule Performance Index
                </div>
                <div className="text-[10px] text-orange-700 dark:text-orange-400 mt-1">
                  {spi < 1 ? txt(locale, { he: "מאחורי הלו״ז", en: "Behind schedule" }) : txt(locale, { he: "בזמן", en: "On schedule" })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cost Analysis - CapEx vs OpEx */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{txt(locale, { he: "ניתוח עלויות פורטפוליו", en: "Portfolio Cost Analysis" })}</CardTitle>
            <CardDescription className="flex items-start gap-1.5">
              <Info className="size-3.5 mt-0.5 shrink-0 text-blue-500" />
              <span>
                {txt(locale, { he: "פיצול הוצאות הוניות (CapEx) מול תפעוליות (OpEx) ברחבי הפורטפוליו.", en: "Capital (CapEx) vs Operational (OpEx) split across the portfolio." })}
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
                  <div className="text-[10px] text-muted-foreground uppercase">{txt(locale, { he: "סך הכל", en: "Total" })}</div>
                  <div className="text-lg font-bold text-primary">₪{(totalCost / 1000000).toFixed(1)}M</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ===== ADVANCED KPIs — McKinsey + Bain + MBI + Gartner ===== */}
      <AdvancedKpisPanel tasks={tasks} users={users} locale={locale} context="pmo" />
    </div>
  );
}
