import { setRequestLocale, getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { mockTasks, mockUsers, mockWbsNodes } from "@/lib/db/mock-data";
import { LiveTaskList } from "@/components/projects/live-task-list";
import { TasksPageActions } from "@/components/landing/tasks-page-actions";

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
          {/* Count rendered inside LiveTaskList so it reflects tasks added
              this session (no refresh). */}
        </div>
        <TasksPageActions projects={mockWbsNodes} users={mockUsers} locale={locale} />
      </div>

      <Card>
        <CardContent className="p-4">
          {/* LiveTaskList merges session-created tasks (localStorage) on top
              of the server snapshot so they appear without a refresh. */}
          <LiveTaskList serverTasks={mockTasks} users={mockUsers} locale={locale} />
        </CardContent>
      </Card>
    </div>
  );
}
