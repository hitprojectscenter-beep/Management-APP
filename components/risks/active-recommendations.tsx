"use client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lightbulb, Info, Zap, Clock, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { txt } from "@/lib/utils/locale-text";
import type { ActiveRecommendation } from "@/lib/ai/risk-engine";

const PRIORITY_STYLES = {
  now: {
    label: "עכשיו",
    labelEn: "Now",
    icon: Zap,
    bg: "bg-red-50 dark:bg-red-950/20",
    border: "border-red-500",
    text: "text-red-700 dark:text-red-300",
    badge: "destructive" as const,
  },
  soon: {
    label: "בקרוב",
    labelEn: "Soon",
    icon: Clock,
    bg: "bg-amber-50 dark:bg-amber-950/20",
    border: "border-amber-500",
    text: "text-amber-700 dark:text-amber-300",
    badge: "warning" as const,
  },
  watch: {
    label: "במעקב",
    labelEn: "Watch",
    icon: Eye,
    bg: "bg-blue-50 dark:bg-blue-950/20",
    border: "border-blue-500",
    text: "text-blue-700 dark:text-blue-300",
    badge: "secondary" as const,
  },
};

const CATEGORY_LABELS: Record<string, Record<string, string>> = {
  blocker: { he: "חסימה", en: "Blocker", ru: "Блокировка", fr: "Bloqueur", es: "Bloqueador" },
  resource: { he: "משאבים", en: "Resource", ru: "Ресурсы", fr: "Ressource", es: "Recurso" },
  schedule: { he: "לו״ז", en: "Schedule", ru: "Расписание", fr: "Calendrier", es: "Cronograma" },
  scope: { he: "תכולה", en: "Scope", ru: "Объём", fr: "Périmètre", es: "Alcance" },
  quality: { he: "איכות", en: "Quality", ru: "Качество", fr: "Qualité", es: "Calidad" },
};

export function ActiveRecommendations({
  recommendations,
  locale,
}: {
  recommendations: ActiveRecommendation[];
  locale: string;
}) {
  return (
    <Card className="border-2 border-orange-300 bg-gradient-to-br from-orange-50/40 to-pink-50/30 dark:from-orange-950/10 dark:to-pink-950/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="size-5 text-orange-600" />
          {txt(locale, { he: "המלצות פעולה של ה-AI", en: "AI Active Recommendations" })}
          <Badge variant="outline" className="ms-auto bg-background">
            <Zap className="size-3 me-1" />
            {recommendations.length}
          </Badge>
        </CardTitle>
        <CardDescription className="flex items-start gap-1.5">
          <Info className="size-3.5 mt-0.5 shrink-0 text-blue-500" />
          <span>
            {txt(locale, {
              he: 'במקום לחפש סיכונים בדאשבורדים, ה-AI מציג ישירות מה לעשות עכשיו - לפי דחיפות ועם פעולה ספציפית להפעיל.',
              en: "Instead of digging through dashboards, AI shows you exactly what to do now - by priority with specific actions.",
            })}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {recommendations.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            🎉 {txt(locale, { he: "אין פעולות דחופות - הפרויקטים במצב טוב", en: "No urgent actions - projects are in good shape" })}
          </div>
        ) : (
          <div className="space-y-2.5">
            {recommendations.map((rec, idx) => {
              const styles = PRIORITY_STYLES[rec.priority];
              const Icon = styles.icon;
              return (
                <div
                  key={idx}
                  className={cn(
                    "p-3.5 rounded-lg border border-s-4 flex items-start gap-3",
                    styles.bg,
                    styles.border
                  )}
                >
                  <div className={cn("size-9 rounded-full bg-white dark:bg-background flex items-center justify-center shrink-0", styles.text)}>
                    <Icon className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant={styles.badge} className="text-[9px]">
                        {txt(locale, { he: styles.label, en: styles.labelEn })}
                      </Badge>
                      <Badge variant="outline" className="text-[9px]">
                        {CATEGORY_LABELS[rec.category][locale]}
                      </Badge>
                    </div>
                    <h4 className="font-semibold text-sm">{rec.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{rec.detail}</p>
                  </div>
                  <Button size="sm" variant="outline" className="shrink-0 hidden sm:flex">
                    {rec.actionLabel}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
