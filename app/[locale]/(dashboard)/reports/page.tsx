import { setRequestLocale } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart3, FileText, Info, PieChart, ArrowLeft, ArrowRight, Filter } from "lucide-react";
import { Link } from "@/lib/i18n/routing";
import { ExportPdfButton } from "@/components/reports/export-pdf-button";
import { mockTasks, mockUsers } from "@/lib/db/mock-data";
import { calculateProjectHealth } from "@/lib/ai/risk-engine";
import { ProgressChart } from "@/components/dashboard/progress-chart";
import { WorkloadChart } from "@/components/dashboard/workload-chart";
import { StatusDistribution } from "@/components/dashboard/status-distribution";

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const health = calculateProjectHealth(mockTasks);

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <BarChart3 className="size-7 text-blue-500" />
            {locale === "he" ? "דוחות וניתוחים" : "Reports & Analytics"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {locale === "he" ? "תובנות מעמיקות על ביצועי הצוות והפרויקטים" : "Deep insights into team and project performance"}
          </p>
        </div>
        <ExportPdfButton locale={locale} />
      </div>

      {/* Prominent entry to the adapted, filterable reporting center */}
      <Link
        href="/analytics"
        className="group flex items-center gap-4 rounded-2xl border border-blue-200/60 dark:border-blue-900/50 bg-gradient-to-l from-blue-600 to-indigo-600 text-white p-4 sm:p-5 shadow-card hover:shadow-pop transition-all hover:-translate-y-0.5"
      >
        <div className="shrink-0 inline-flex items-center justify-center size-12 rounded-xl bg-white/15 ring-1 ring-white/30">
          <PieChart className="size-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-lg">
            {locale === "he" ? "מרכז הדוחות המלא והמותאם →" : "Full adapted reporting center →"}
          </div>
          <p className="text-sm text-white/85 mt-0.5">
            {locale === "he"
              ? "דוחות ודשבורדים נפרדים למשימות ולפרויקטים, בונה דוח לפי מאפיינים וטווח תאריכים, חיפוש מילות מפתח, פילוח פתוח/סגור/חדש/נדחה, והתפלגות לפי חטיבה/אגף/עובד."
              : "Separate task/project dashboards, a report builder by attribute & date, keyword search, open/closed/new/rejected buckets, and distribution by division/department/employee."}
          </p>
        </div>
        <div className="shrink-0 hidden sm:inline-flex items-center gap-1.5 rounded-full bg-white/15 ring-1 ring-white/30 px-4 py-2 text-sm font-semibold">
          <Filter className="size-4" />
          {locale === "he" ? "פתח" : "Open"}
          {locale === "he" ? <ArrowLeft className="size-4" /> : <ArrowRight className="size-4" />}
        </div>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{locale === "he" ? "מהירות צוות (Velocity)" : "Team Velocity"}</CardTitle>
            <CardDescription className="flex items-start gap-1.5">
              <Info className="size-3.5 mt-0.5 shrink-0 text-blue-500" />
              <span>
                {locale === "he"
                  ? "כמות המשימות שהצוות סוגר כל שבוע. גרף עולה = הצוות מאיץ. גרף שטוח = ייתכן צוואר בקבוק. גרף יורד = משהו תקוע. ה-velocity הוא המדד הקלאסי בשיטת Scrum להערכת קיבולת הצוות וסיכוני זמן."
                  : "How many tasks the team closes each week. Up-trend = accelerating. Flat = bottleneck possible. Down-trend = something is stuck. Velocity is the classic Scrum metric for capacity planning and timing risk."}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProgressChart locale={locale} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{locale === "he" ? "בריאות כוללת" : "Overall Health"}</CardTitle>
            <CardDescription className="flex items-start gap-1.5">
              <Info className="size-3.5 mt-0.5 shrink-0 text-blue-500" />
              <span>
                {locale === "he"
                  ? "ציון משוקלל מ-0 עד 100 שמשקף את בריאות הפרויקטים: אחוז ביצוע, אחוז איחורים וחסימות. 70+ = בריא, 40-70 = בסיכון, מתחת ל-40 = קריטי."
                  : "A weighted score 0-100 reflecting project health: completion rate, overdue rate, blocker rate. 70+ = healthy, 40-70 = at-risk, <40 = critical."}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center py-8">
            <div className="text-7xl font-black gradient-text">{health.score}</div>
            <div className="text-sm text-muted-foreground mt-2">/ 100</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{locale === "he" ? "עומס עבודה" : "Workload Distribution"}</CardTitle>
            <CardDescription className="flex items-start gap-1.5">
              <Info className="size-3.5 mt-0.5 shrink-0 text-blue-500" />
              <span>
                {locale === "he"
                  ? "כמה משימות מוקצות לכל חבר צוות, מפוצלות לפתוחות / הושלמו / חסומות. הגרף עוזר לזהות עומס יתר על אנשים מסוימים, או מי 'פנוי' לקבל עוד משימות."
                  : "How many tasks are assigned to each team member, split into open / done / blocked. Helps spot people who are over-loaded vs available for more work."}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WorkloadChart users={mockUsers} tasks={mockTasks} locale={locale} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{locale === "he" ? "התפלגות סטטוס" : "Status Distribution"}</CardTitle>
            <CardDescription className="flex items-start gap-1.5">
              <Info className="size-3.5 mt-0.5 shrink-0 text-blue-500" />
              <span>
                {locale === "he"
                  ? "פילוח עוגתי של כל המשימות בארגון לפי הסטטוס שלהן (לא התחיל / בביצוע / בבדיקה / הושלם / חסום / בוטל). מאפשר להבין במבט אחד איפה התקיעות."
                  : "Pie chart of all organizational tasks by their status (not-started / in-progress / review / done / blocked / cancelled). Provides at-a-glance insight into where work is stuck."}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StatusDistribution tasks={mockTasks} locale={locale} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
