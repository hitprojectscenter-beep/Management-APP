"use client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Calendar, Target, Info, Sparkles, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { txt } from "@/lib/utils/locale-text";
import type { ProjectForecast } from "@/lib/ai/risk-engine";

export function PredictiveForecast({
  forecast,
  locale,
}: {
  forecast: ProjectForecast | null;
  locale: string;
}) {
  const isHe = locale === "he";

  if (!forecast) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-cyan-600" />
            {txt(locale, { he: "חיזוי AI - תאריך סיום צפוי", en: "AI Forecast - Predicted Completion" })}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8 text-sm text-muted-foreground">
          {txt(locale, { he: "אין מספיק נתונים לחיזוי", en: "Not enough data to forecast" })}
        </CardContent>
      </Card>
    );
  }

  const isOnTrack = forecast.delayDays <= 0;
  const isWarning = forecast.delayDays > 0 && forecast.delayDays <= 14;
  const isCritical = forecast.delayDays > 14;

  const accent = isOnTrack ? "text-emerald-600" : isWarning ? "text-amber-600" : "text-red-600";
  const accentBg = isOnTrack
    ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300"
    : isWarning
      ? "bg-amber-50 dark:bg-amber-950/20 border-amber-300"
      : "bg-red-50 dark:bg-red-950/20 border-red-300";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-5 text-cyan-600" />
          {txt(locale, { he: "חיזוי AI - תאריך סיום צפוי", en: "AI Forecast - Predicted Completion" })}
          <Badge variant="outline" className="ms-auto">
            <Sparkles className="size-3 me-1" />
            {forecast.confidence === "high"
              ? txt(locale, { he: "ביטחון גבוה", en: "High confidence" })
              : forecast.confidence === "medium"
                ? txt(locale, { he: "ביטחון בינוני", en: "Medium confidence" })
                : txt(locale, { he: "ביטחון נמוך", en: "Low confidence" })}
          </Badge>
        </CardTitle>
        <CardDescription className="flex items-start gap-1.5">
          <Info className="size-3.5 mt-0.5 shrink-0 text-blue-500" />
          <span>
            {txt(locale, {
              he: "ה-AI לומד מהיסטוריית הביצועים: קצב סגירת משימות, ממוצע פיגור, וחריגת שעות. על בסיס זה הוא חוזה את תאריך הסיום הריאליסטי.",
              en: "AI learns from past performance: completion rate, average slip, and hour overruns. Based on this it forecasts a realistic end date.",
            })}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Planned end */}
          <div className="p-4 rounded-lg border bg-muted/20">
            <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase mb-2">
              <Calendar className="size-3.5" />
              {txt(locale, { he: "תאריך מתוכנן", en: "Planned end" })}
            </div>
            <div className="text-xl font-bold">
              {forecast.plannedEnd.toLocaleDateString(isHe ? "he-IL" : "en-US", { year: "numeric", month: "short", day: "numeric" })}
            </div>
          </div>

          {/* Forecast end */}
          <div className={cn("p-4 rounded-lg border-2", accentBg)}>
            <div className="flex items-center gap-2 text-xs uppercase mb-2">
              <Target className={cn("size-3.5", accent)} />
              <span className={accent}>{txt(locale, { he: "צפוי AI", en: "AI Forecast" })}</span>
            </div>
            <div className={cn("text-xl font-bold", accent)}>
              {forecast.forecastEnd.toLocaleDateString(isHe ? "he-IL" : "en-US", { year: "numeric", month: "short", day: "numeric" })}
            </div>
          </div>

          {/* Delay */}
          <div className={cn("p-4 rounded-lg border-2", accentBg)}>
            <div className="flex items-center gap-2 text-xs uppercase mb-2">
              {isOnTrack ? <TrendingDown className={cn("size-3.5", accent)} /> : <TrendingUp className={cn("size-3.5", accent)} />}
              <span className={accent}>{txt(locale, { he: "סטיית AI", en: "AI Variance" })}</span>
            </div>
            <div className={cn("text-3xl font-bold", accent)}>
              {forecast.delayDays > 0 ? "+" : ""}
              {forecast.delayDays}
            </div>
            <div className="text-xs text-muted-foreground">{txt(locale, { he: "ימים", en: "days" })}</div>
          </div>
        </div>

        {/* Velocity comparison */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="p-3 rounded-md border bg-background flex items-center gap-3">
            <Activity className="size-4 text-blue-600" />
            <div>
              <div className="text-[10px] text-muted-foreground uppercase">{txt(locale, { he: "מהירות בפועל", en: "Actual velocity" })}</div>
              <div className="text-sm font-bold">
                {forecast.velocityActual.toFixed(1)} {txt(locale, { he: "משימות/שבוע", en: "tasks/week" })}
              </div>
            </div>
          </div>
          <div className="p-3 rounded-md border bg-background flex items-center gap-3">
            <Target className="size-4 text-purple-600" />
            <div>
              <div className="text-[10px] text-muted-foreground uppercase">{txt(locale, { he: "מהירות נדרשת", en: "Required velocity" })}</div>
              <div className="text-sm font-bold">
                {forecast.velocityRequired.toFixed(1)} {txt(locale, { he: "משימות/שבוע", en: "tasks/week" })}
              </div>
            </div>
          </div>
        </div>

        {/* Insight */}
        <div className={cn("mt-4 p-3 rounded-md text-sm flex items-start gap-2", accentBg)}>
          <Sparkles className={cn("size-4 mt-0.5 shrink-0", accent)} />
          <p className={accent}>{forecast.insight}</p>
        </div>
      </CardContent>
    </Card>
  );
}
