"use client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Users, AlertTriangle, Info, Zap, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { txt } from "@/lib/utils/locale-text";
import type { ResourceBottleneck } from "@/lib/ai/risk-engine";
import type { MockUser } from "@/lib/db/mock-data";

const SEVERITY_STYLES = {
  critical: { bg: "bg-red-50 dark:bg-red-950/20", border: "border-red-500", text: "text-red-700 dark:text-red-300", badge: "destructive" as const },
  high: { bg: "bg-orange-50 dark:bg-orange-950/20", border: "border-orange-500", text: "text-orange-700 dark:text-orange-300", badge: "destructive" as const },
  medium: { bg: "bg-amber-50 dark:bg-amber-950/20", border: "border-amber-500", text: "text-amber-700 dark:text-amber-300", badge: "warning" as const },
  low: { bg: "bg-blue-50 dark:bg-blue-950/20", border: "border-blue-500", text: "text-blue-700 dark:text-blue-300", badge: "secondary" as const },
};

export function ResourceBottlenecks({
  bottlenecks,
  users,
  locale,
}: {
  bottlenecks: ResourceBottleneck[];
  users: MockUser[];
  locale: string;
}) {
  const isHe = locale === "he";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="size-5 text-violet-600" />
          {isHe ? "צווארי בקבוק במשאבים" : "Resource Bottlenecks"}
          <Badge variant="outline" className="ms-auto">
            <Zap className="size-3 me-1" />
            {isHe ? "ניתוח AI" : "AI Analysis"}
          </Badge>
        </CardTitle>
        <CardDescription className="flex items-start gap-1.5">
          <Info className="size-3.5 mt-0.5 shrink-0 text-blue-500" />
          <span>
            {isHe
              ? "ה-AI מנתח את הקיבולת של חברי הצוות אל מול המשימות שהוקצו להם. אם חבר צוות שאחראי על משימה בנתיב הקריטי מוקצה ב-80%+, זה מסומן כצוואר בקבוק עוד לפני שהעבודה מתחילה."
              : "AI analyzes team capacity vs assigned work. If a team member responsible for critical-path tasks is allocated >80%, it's flagged as a bottleneck before work begins."}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {bottlenecks.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <Users className="size-10 mx-auto opacity-30 mb-2" />
            {isHe ? "אין צווארי בקבוק - העומסים מאוזנים 🎉" : "No bottlenecks - workloads are balanced 🎉"}
          </div>
        ) : (
          <div className="space-y-3">
            {bottlenecks.map((b) => {
              const user = users.find((u) => u.id === b.userId);
              const styles = SEVERITY_STYLES[b.severity];
              return (
                <div
                  key={b.userId}
                  className={cn("p-4 rounded-lg border border-s-4", styles.bg, styles.border)}
                >
                  <div className="flex items-start gap-4">
                    {user && <Avatar src={user.image} fallback={user.name[0]} className="size-12 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <h4 className="font-semibold">{b.userName}</h4>
                        <Badge variant={styles.badge}>{b.severity}</Badge>
                        {b.criticalAssignments > 0 && (
                          <Badge variant="outline" className="border-red-400 text-red-700">
                            <Zap className="size-2.5 me-0.5" />
                            {b.criticalAssignments} {isHe ? "קריטיות" : "critical"}
                          </Badge>
                        )}
                      </div>
                      <p className={cn("text-sm font-medium", styles.text)}>{b.message}</p>

                      {/* FTE bar */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="text-muted-foreground">
                            {isHe ? "הקצאה" : "Allocation"}
                          </span>
                          <span className={cn("font-bold", b.totalFte > 100 ? "text-red-600" : b.totalFte > 80 ? "text-amber-600" : "text-emerald-600")}>
                            {b.totalFte}%
                          </span>
                        </div>
                        <div className="relative h-2.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "absolute inset-y-0 start-0 rounded-full",
                              b.totalFte > 100 ? "bg-red-500" : b.totalFte > 80 ? "bg-amber-500" : "bg-emerald-500"
                            )}
                            style={{ width: `${Math.min(100, b.totalFte)}%` }}
                          />
                          {/* 80% safety line */}
                          <div className="absolute top-0 bottom-0 w-px bg-red-700" style={{ insetInlineStart: "80%" }} />
                        </div>
                        <div className="flex items-center justify-between text-[9px] text-muted-foreground mt-0.5">
                          <span>0%</span>
                          <span className="text-red-600 font-semibold">80% {isHe ? "סף בטיחות" : "safety line"}</span>
                          <span>100%</span>
                        </div>
                      </div>

                      {/* Recommendation */}
                      <div className="mt-3 text-xs bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 px-3 py-2 rounded flex items-start gap-1.5">
                        <span>💡</span>
                        <div>
                          <span className="font-semibold">{isHe ? "המלצה: " : "Recommendation: "}</span>
                          {b.recommendation}
                        </div>
                      </div>
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
