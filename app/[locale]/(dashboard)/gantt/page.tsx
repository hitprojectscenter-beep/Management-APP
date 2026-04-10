import { setRequestLocale } from "next-intl/server";
import { mockTasks, mockUsers, mockWbsNodes } from "@/lib/db/mock-data";
import { GanttPageClient } from "@/components/gantt/gantt-page-client";

export default async function GanttPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <GanttPageClient
      allNodes={mockWbsNodes}
      allTasks={mockTasks}
      users={mockUsers}
      locale={locale}
    />
  );
}
