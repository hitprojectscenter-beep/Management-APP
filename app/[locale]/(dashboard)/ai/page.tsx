import { setRequestLocale, getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Brain, Workflow, Bot, Zap, MessageSquare } from "lucide-react";
import { mockRisks, mockTasks, getTaskById, getUserById } from "@/lib/db/mock-data";
import { calculateProjectHealth } from "@/lib/ai/risk-engine";
import { AiSidekick } from "@/components/ai/ai-sidekick";
import { cn } from "@/lib/utils";

export default async function AiCenterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("ai");

  const health = calculateProjectHealth(mockTasks);
  const activeRisks = mockRisks.filter((r) => !r.dismissed);
  const criticalCount = activeRisks.filter((r) => r.severity === "critical").length;
  const highCount = activeRisks.filter((r) => r.severity === "high").length;

  const severityColors: Record<string, string> = {
    critical: "border-red-500 bg-red-50/50 dark:bg-red-950/20",
    high: "border-orange-500 bg-orange-50/50 dark:bg-orange-950/20",
    medium: "border-amber-500 bg-amber-50/50 dark:bg-amber-950/20",
    low: "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20",
  };

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="size-10 rounded-lg bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center">
              <Sparkles className="size-5 text-white" />
            </div>
            {t("title")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {locale === "he"
              ? "תובנות חכמות, זיהוי סיכונים ועוזר חכם לפרויקטים שלך"
              : "Smart insights, risk detection, and an intelligent assistant for your projects"}
          </p>
        </div>
        <Badge variant="outline" className="gap-2 py-1.5">
          <Zap className="size-3" />
          {locale === "he" ? "23,400 / 25,000 קרדיטים" : "23,400 / 25,000 credits"}
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-red-100 dark:bg-red-950/30 flex items-center justify-center">
                <Brain className="size-5 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{criticalCount}</div>
                <div className="text-xs text-muted-foreground">
                  {locale === "he" ? "סיכונים קריטיים" : "Critical risks"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-orange-100 dark:bg-orange-950/30 flex items-center justify-center">
                <Brain className="size-5 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{highCount}</div>
                <div className="text-xs text-muted-foreground">
                  {locale === "he" ? "סיכונים גבוהים" : "High risks"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center">
                <Bot className="size-5 text-emerald-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{health.score}/100</div>
                <div className="text-xs text-muted-foreground">
                  {locale === "he" ? "ציון בריאות כללי" : "Overall health"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-violet-100 dark:bg-violet-950/30 flex items-center justify-center">
                <Workflow className="size-5 text-violet-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">3</div>
                <div className="text-xs text-muted-foreground">
                  {locale === "he" ? "Digital Workers פעילים" : "Active Digital Workers"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risks */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="size-5 text-orange-500" />
              {t("risks")}
            </CardTitle>
            <CardDescription>
              {locale === "he"
                ? "Claude סורק את הפרויקטים שלך באופן רציף לאיתור סיכונים"
                : "Claude continuously scans your projects for risks"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeRisks.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {t("noRisks")}
              </div>
            )}
            {activeRisks.map((risk) => {
              const task = getTaskById(risk.taskId);
              return (
                <div
                  key={risk.id}
                  className={cn(
                    "flex gap-3 p-4 rounded-lg border-s-4 border bg-card",
                    severityColors[risk.severity]
                  )}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant={risk.severity === "critical" || risk.severity === "high" ? "destructive" : "warning"}
                      >
                        {risk.severity}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{risk.type}</span>
                    </div>
                    <div className="font-semibold text-sm mb-1">
                      {locale === "he" ? risk.message : risk.messageEn || risk.message}
                    </div>
                    {task && (
                      <div className="text-xs text-muted-foreground mb-2">
                        {locale === "he" ? "משימה" : "Task"}: {locale === "he" ? task.title : task.titleEn || task.title}
                      </div>
                    )}
                    <div className="text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 px-2 py-1 rounded">
                      💡 {risk.suggestion}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Sidekick chat */}
        <Card className="lg:col-span-1 h-[700px] flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="size-5 text-primary" />
              {t("sidekick")}
            </CardTitle>
            <CardDescription>
              {locale === "he" ? "שאל את Claude על הפרויקטים שלך" : "Ask Claude about your projects"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col overflow-hidden">
            <AiSidekick locale={locale} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
