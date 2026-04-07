import { setRequestLocale } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart3, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
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
        <Button variant="outline">
          <Download className="size-4" />
          {locale === "he" ? "ייצוא PDF" : "Export PDF"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{locale === "he" ? "מהירות צוות (Velocity)" : "Team Velocity"}</CardTitle>
            <CardDescription>
              {locale === "he" ? "כמות משימות שהושלמו לאורך 6 שבועות" : "Tasks completed over 6 weeks"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProgressChart locale={locale} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{locale === "he" ? "בריאות כוללת" : "Overall Health"}</CardTitle>
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
          </CardHeader>
          <CardContent>
            <WorkloadChart users={mockUsers} tasks={mockTasks} locale={locale} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{locale === "he" ? "התפלגות סטטוס" : "Status Distribution"}</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusDistribution tasks={mockTasks} locale={locale} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
