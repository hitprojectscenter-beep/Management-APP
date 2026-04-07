import { setRequestLocale, getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Workflow, Plus, Zap, ArrowRight, ArrowLeft } from "lucide-react";
import { mockAutomations } from "@/lib/db/mock-data";

export default async function AutomationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const Arrow = locale === "he" ? ArrowLeft : ArrowRight;

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Workflow className="size-7 text-violet-500" />
            {locale === "he" ? "אוטומציות" : "Automations"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {locale === "he"
              ? "צור זרימות עבודה חכמות שמפחיתות עבודה ידנית"
              : "Build smart workflows that reduce manual work"}
          </p>
        </div>
        <Button>
          <Plus className="size-4" />
          {locale === "he" ? "אוטומציה חדשה" : "New automation"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {mockAutomations.map((auto) => (
          <Card key={auto.id} className="card-hover">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-violet-100 dark:bg-violet-950/30 flex items-center justify-center">
                    <Zap className="size-5 text-violet-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold leading-tight">{auto.name}</h3>
                    <Badge variant={auto.enabled ? "success" : "secondary"} className="mt-1.5">
                      {auto.enabled ? (locale === "he" ? "פעיל" : "Active") : (locale === "he" ? "כבוי" : "Disabled")}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs bg-muted/40 px-3 py-2 rounded-md">
                <span className="font-mono text-blue-600">{auto.trigger}</span>
                <Arrow className="size-3 text-muted-foreground shrink-0" />
                <span className="font-mono text-emerald-600 truncate">{auto.action}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
