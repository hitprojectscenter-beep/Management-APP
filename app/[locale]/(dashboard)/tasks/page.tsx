import { setRequestLocale, getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { mockTasks, mockUsers } from "@/lib/db/mock-data";
import { TaskList } from "@/components/projects/task-list";

export default async function TasksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("tasks");

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground mt-1">
            {locale === "he" ? `${mockTasks.length} משימות בסך הכל` : `${mockTasks.length} total tasks`}
          </p>
        </div>
        <Button>
          <Plus className="size-4" />
          {t("newTask")}
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <TaskList tasks={mockTasks} users={mockUsers} locale={locale} />
        </CardContent>
      </Card>
    </div>
  );
}
