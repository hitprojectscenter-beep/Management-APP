"use client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GitBranch, ArrowRight, ArrowLeft, Info, Zap, AlertOctagon } from "lucide-react";
import { Link } from "@/lib/i18n/routing";
import { cn } from "@/lib/utils";
import { txt } from "@/lib/utils/locale-text";
import type { DependencyImpact as DI } from "@/lib/ai/risk-engine";
import type { MockTask } from "@/lib/db/mock-data";

export function DependencyImpactCard({
  impacts,
  tasks,
  locale,
}: {
  impacts: DI[];
  tasks: MockTask[];
  locale: string;
}) {
  const isHe = locale === "he";
  const Arrow = isHe ? ArrowLeft : ArrowRight;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="size-5 text-orange-600" />
          {txt(locale, { he: "ניתוח אפקט שרשרת", en: "Dependency Impact Analysis" })}
          <Badge variant="outline" className="ms-auto">
            <Zap className="size-3 me-1" />
            {txt(locale, { he: "ניתוח AI", en: "AI Analysis" })}
          </Badge>
        </CardTitle>
        <CardDescription className="flex items-start gap-1.5">
          <Info className="size-3.5 mt-0.5 shrink-0 text-blue-500" />
          <span>
            {txt(locale, {
              he: "ה-AI מחשב כיצד עיכוב במשימה אחת זולג למשימות תלויות. גם משימות שאינן ישירות בנתיב הקריטי יכולות לגרור אותו לעיכוב.",
              en: "AI computes how a delay in one task cascades to dependent tasks. Even non-critical tasks can drag the critical path.",
            })}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {impacts.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <GitBranch className="size-10 mx-auto opacity-30 mb-2" />
            {txt(locale, { he: "אין אפקטי שרשרת פעילים 🎉", en: "No active cascade effects 🎉" })}
          </div>
        ) : (
          <div className="space-y-3">
            {impacts.map((impact) => {
              const sourceTask = tasks.find((t) => t.id === impact.delayedTaskId);
              return (
                <div
                  key={impact.delayedTaskId}
                  className={cn(
                    "p-4 rounded-lg border border-s-4",
                    impact.affectsCriticalPath
                      ? "bg-red-50 dark:bg-red-950/20 border-red-500"
                      : "bg-amber-50 dark:bg-amber-950/20 border-amber-500"
                  )}
                >
                  {/* Source task */}
                  <div className="flex items-center gap-2 mb-3">
                    {impact.affectsCriticalPath && <AlertOctagon className="size-4 text-red-600 shrink-0" />}
                    <Link
                      href={`/tasks/${impact.delayedTaskId}`}
                      className="font-semibold text-sm hover:underline text-foreground"
                    >
                      {impact.delayedTaskTitle}
                    </Link>
                    {impact.affectsCriticalPath && (
                      <Badge variant="destructive" className="text-[9px]">
                        <Zap className="size-2.5 me-0.5" />
                        {txt(locale, { he: "משפיע על נתיב קריטי", en: "Affects critical path" })}
                      </Badge>
                    )}
                  </div>

                  {/* Cascade visualization */}
                  <div className="flex items-center gap-2 my-3 bg-background/60 rounded p-3">
                    <div className="text-center min-w-[60px]">
                      <div className="text-2xl font-bold text-orange-600">{impact.affectedCount}</div>
                      <div className="text-[9px] text-muted-foreground uppercase">
                        {txt(locale, { he: "משימות מושפעות", en: "tasks affected" })}
                      </div>
                    </div>
                    <Arrow className="size-4 text-muted-foreground" />
                    <div className="text-center min-w-[60px]">
                      <div className="text-2xl font-bold text-red-600">{impact.affectedCriticalIds.length}</div>
                      <div className="text-[9px] text-muted-foreground uppercase">
                        {txt(locale, { he: "בנתיב קריטי", en: "on critical path" })}
                      </div>
                    </div>
                    <Arrow className="size-4 text-muted-foreground" />
                    <div className="text-center min-w-[60px]">
                      <div className="text-2xl font-bold text-purple-600">+{impact.cascadeDays}</div>
                      <div className="text-[9px] text-muted-foreground uppercase">
                        {txt(locale, { he: "ימי איחור", en: "days delay" })}
                      </div>
                    </div>
                  </div>

                  {/* Message */}
                  <p className="text-sm text-muted-foreground">{impact.message}</p>

                  {/* Recommendation */}
                  <div className="mt-3 text-xs bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 px-3 py-2 rounded flex items-start gap-1.5">
                    <span>💡</span>
                    <div>
                      <span className="font-semibold">{txt(locale, { he: "המלצה: ", en: "Recommendation: " })}</span>
                      {impact.recommendation}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
