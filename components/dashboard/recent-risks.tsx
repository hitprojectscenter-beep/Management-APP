import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import type { MockRisk } from "@/lib/db/mock-data";
import { cn } from "@/lib/utils";

export function RecentRisks({ risks, locale }: { risks: MockRisk[]; locale: string }) {
  if (risks.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        {locale === "he" ? "אין סיכונים פעילים 🎉" : "No active risks 🎉"}
      </div>
    );
  }

  const severityIcon = (sev: string) => {
    if (sev === "critical" || sev === "high") return AlertTriangle;
    if (sev === "medium") return AlertCircle;
    return Info;
  };

  const severityColors: Record<string, string> = {
    critical: "text-red-600 bg-red-50 dark:bg-red-950/30",
    high: "text-orange-600 bg-orange-50 dark:bg-orange-950/30",
    medium: "text-amber-600 bg-amber-50 dark:bg-amber-950/30",
    low: "text-blue-600 bg-blue-50 dark:bg-blue-950/30",
  };

  return (
    <div className="space-y-3">
      {risks.map((risk) => {
        const Icon = severityIcon(risk.severity);
        return (
          <div
            key={risk.id}
            className={cn(
              "flex gap-3 p-3 rounded-lg border-s-4",
              severityColors[risk.severity]
            )}
          >
            <Icon className="size-4 shrink-0 mt-0.5" />
            <div className="text-xs flex-1">
              <div className="font-medium leading-snug">
                {locale === "he" ? risk.message : risk.messageEn || risk.message}
              </div>
              <div className="text-muted-foreground mt-1">{risk.suggestion}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
