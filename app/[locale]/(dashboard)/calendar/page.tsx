import { setRequestLocale, getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, RefreshCw, CheckCircle2 } from "lucide-react";
import { mockTasks, mockUsers } from "@/lib/db/mock-data";
import { TaskCalendar } from "@/components/projects/task-calendar";

export default async function CalendarPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("calendar");

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground mt-1">
            {locale === "he" ? "כל המשימות שלך במבט יומני" : "All your tasks in calendar view"}
          </p>
        </div>
        <Card className="flex items-center gap-3 px-4 py-2">
          <div className="size-8 rounded bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center">
            <CheckCircle2 className="size-4 text-emerald-600" />
          </div>
          <div className="text-xs">
            <div className="font-semibold">{t("syncStatus")}</div>
            <div className="text-muted-foreground">Google Calendar · {locale === "he" ? "מסונכרן" : "Synced"}</div>
          </div>
          <Button size="sm" variant="outline">
            <RefreshCw className="size-3" />
            {t("syncNow")}
          </Button>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <TaskCalendar tasks={mockTasks} users={mockUsers} locale={locale} />
        </CardContent>
      </Card>
    </div>
  );
}
