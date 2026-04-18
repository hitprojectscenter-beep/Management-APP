import { setRequestLocale, getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase,
  CheckSquare,
  AlertTriangle,
  TrendingUp,
  Target,
  Sparkles,
  Info,
} from "lucide-react";
import { Link } from "@/lib/i18n/routing";
import { txt } from "@/lib/utils/locale-text";
import {
  mockTasks,
  mockUsers,
  mockRisks,
  getProjects,
  getPrograms,
} from "@/lib/db/mock-data";
import { RoleBasedKpi } from "@/components/dashboard/role-based-kpi";
import { calculateProjectHealth } from "@/lib/ai/risk-engine";
import { ProgressChart } from "@/components/dashboard/progress-chart";
import { StatusDistribution } from "@/components/dashboard/status-distribution";
import { WorkloadChart } from "@/components/dashboard/workload-chart";
import { RecentRisks } from "@/components/dashboard/recent-risks";
import { RecentTasks } from "@/components/dashboard/recent-tasks";

/**
 * Executive dashboard - תצוגה כללית של ביצועי הארגון.
 * זהו הדשבורד היישן (העמוד הראשי הוא עכשיו "המשימות שלי").
 */
export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("dashboard");
  const tCommon = await getTranslations("common");

  const health = calculateProjectHealth(mockTasks);
  const projects = getProjects();
  const activeProjects = projects.length;
  const openTasks = mockTasks.filter((t) => t.status !== "done" && t.status !== "cancelled").length;
  const completedThisWeek = mockTasks.filter((t) => {
    if (!t.actualEnd) return false;
    const days = (Date.now() - new Date(t.actualEnd).getTime()) / (1000 * 60 * 60 * 24);
    return days >= 0 && days <= 7;
  }).length;
  const atRisk = mockRisks.filter((r) => !r.dismissed).length;

  const stats = [
    {
      label: t("stats.activeProjects"),
      value: activeProjects,
      icon: Briefcase,
      bg: "bg-blue-500/10",
      iconColor: "text-blue-600",
      tip: txt(locale, { he: "מספר הפרויקטים הפעילים בארגון כרגע", en: "Number of currently active projects" }),
    },
    {
      label: t("stats.openTasks"),
      value: openTasks,
      icon: CheckSquare,
      bg: "bg-violet-500/10",
      iconColor: "text-violet-600",
      tip: txt(locale, { he: "כל המשימות שטרם הושלמו או בוטלו", en: "All tasks not yet completed or cancelled" }),
    },
    {
      label: t("stats.completedThisWeek"),
      value: completedThisWeek,
      icon: TrendingUp,
      bg: "bg-emerald-500/10",
      iconColor: "text-emerald-600",
      tip: txt(locale, { he: "משימות שהושלמו ב-7 הימים האחרונים", en: "Tasks completed in the last 7 days" }),
    },
    {
      label: t("stats.atRisk"),
      value: atRisk,
      icon: AlertTriangle,
      bg: "bg-orange-500/10",
      iconColor: "text-orange-600",
      tip: txt(locale, { he: "סיכונים פעילים שזוהו על ידי מנוע ה-AI", en: "Active risks detected by AI engine" }),
    },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="size-11 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
              <Target className="size-6 text-white" />
            </div>
            {txt(locale, { he: "דשבורדים ו-KPI", en: "Dashboards & KPIs" })}
          </h1>
          <p className="text-muted-foreground mt-1.5">
            {txt(locale, {
              he: "מדדי ביצוע מרכזיים, מגמות, ותמונת מצב מלאה של פעילות הארגון",
              en: "Key performance indicators, trends, and full organizational picture",
            })}
          </p>
        </div>
        <Badge variant={health.status === "healthy" ? "success" : health.status === "at-risk" ? "warning" : "destructive"}>
          <Target className="size-3 me-1" />
          {txt(locale, { he: "בריאות פרויקטים", en: "Project Health" })}: {health.score}/100
        </Badge>
      </div>

      {/* Role-based KPI dashboards (PM vs PMO) */}
      <RoleBasedKpi
        tasks={mockTasks}
        users={mockUsers}
        projects={getProjects()}
        programs={getPrograms()}
        locale={locale}
      />

      {/* General KPI Cards (always visible) */}
      <div className="border-t pt-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Info className="size-4 text-muted-foreground" />
          {txt(locale, { he: "מבט כללי על הארגון", en: "General organizational overview" })}
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="card-hover overflow-hidden" title={stat.tip}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                    <div className="text-3xl font-bold mt-2">{stat.value}</div>
                  </div>
                  <div className={`size-11 rounded-lg ${stat.bg} flex items-center justify-center`}>
                    <Icon className={`size-5 ${stat.iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {txt(locale, { he: "התקדמות לאורך זמן", en: "Progress Over Time" })}
            </CardTitle>
            <CardDescription className="flex items-start gap-1.5">
              <Info className="size-3.5 mt-0.5 shrink-0 text-blue-500" />
              <span>
                {txt(locale, { he: "גרף שטח שמראה כמה משימות הושלמו, היו בביצוע ונחסמו בכל אחד מ-6 השבועות האחרונים. עוזר לזהות מגמות במהירות הצוות (velocity) ולאתר שבועות בעייתיים.", en: "Area chart showing how many tasks were completed, in-progress, and blocked in each of the last 6 weeks. Helps identify team velocity trends and spot problem weeks." })}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProgressChart locale={locale} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{txt(locale, { he: "התפלגות סטטוס", en: "Status Distribution" })}</CardTitle>
            <CardDescription className="flex items-start gap-1.5">
              <Info className="size-3.5 mt-0.5 shrink-0 text-blue-500" />
              <span>
                {txt(locale, { he: "כמה משימות נמצאות בכל סטטוס כרגע. מאפשר לראות תמונת מצב מיידית של 'איפה תקועים'.", en: "How many tasks are in each status right now. Provides instant visibility into where work is stuck." })}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StatusDistribution tasks={mockTasks} locale={locale} />
          </CardContent>
        </Card>
      </div>

      {/* Workload + Risks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{txt(locale, { he: "עומס עבודה לפי חבר צוות", en: "Workload by Team Member" })}</CardTitle>
            <CardDescription className="flex items-start gap-1.5">
              <Info className="size-3.5 mt-0.5 shrink-0 text-blue-500" />
              <span>
                {txt(locale, { he: "גרף עמודות מצטבר המציג לכל חבר צוות כמה משימות פתוחות יש לו, כמה הושלמו וכמה חסומות. מאפשר לזהות הקצאת יתר או חוסר איזון.", en: "Stacked bar chart showing per team member how many open, done, and blocked tasks they have. Helps spot overload and imbalance." })}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WorkloadChart users={mockUsers} tasks={mockTasks} locale={locale} />
          </CardContent>
        </Card>

        <Card className="border-orange-200/50 bg-gradient-to-br from-orange-50/30 to-transparent dark:from-orange-950/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="size-4 text-orange-500" />
                {txt(locale, { he: "תובנות AI", en: "AI Insights" })}
              </CardTitle>
              <Link href="/ai" className="text-xs text-primary hover:underline">
                {tCommon("more")} →
              </Link>
            </div>
            <CardDescription className="flex items-start gap-1.5">
              <Info className="size-3.5 mt-0.5 shrink-0 text-blue-500" />
              <span>
                {txt(locale, { he: "סיכונים שמנוע ה-AI זיהה אוטומטית - איחורים, חסימות, חריגות תקציב והקצאת יתר.", en: "Risks the AI engine detected automatically - delays, blockers, budget overruns, over-allocation." })}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RecentRisks risks={mockRisks.slice(0, 3)} locale={locale} />
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{txt(locale, { he: "משימות עדכניות", en: "Recent Tasks" })}</CardTitle>
            <Link href="/tasks" className="text-xs text-primary hover:underline">
              {txt(locale, { he: "ראה הכל", en: "View all" })} →
            </Link>
          </div>
          <CardDescription className="flex items-start gap-1.5">
            <Info className="size-3.5 mt-0.5 shrink-0 text-blue-500" />
            <span>
              {txt(locale, { he: "המשימות שעודכנו לאחרונה ברחבי הארגון - לחץ לפתיחת כל משימה.", en: "Most recently updated tasks across the organization - click to open." })}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RecentTasks tasks={mockTasks.slice(0, 6)} users={mockUsers} locale={locale} />
        </CardContent>
      </Card>
    </div>
  );
}
