import { setRequestLocale } from "next-intl/server";
import { getProjects, mockTasks } from "@/lib/db/mock-data";
import { AnalyticsCenter } from "@/components/analytics/analytics-center";

/**
 * מרכז דוחות ואנליטיקה — separate task-view / project-view dashboards, a
 * multi-attribute + date-range report builder with keyword search, and
 * RBAC-scoped distribution dashboards (חטיבה / אגף / עובד). The heavy lifting
 * is client-side (live tasks/projects + the viewer's role), so this page only
 * seeds the snapshot.
 */
export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
      <AnalyticsCenter serverTasks={mockTasks} serverProjects={getProjects()} locale={locale} />
    </div>
  );
}
