import { setRequestLocale } from "next-intl/server";
import {
  CURRENT_USER_ID,
  getUserById,
  mockProjectMembers,
  mockTasks,
  mockUsers,
  mockWbsNodes,
  getProjects,
} from "@/lib/db/mock-data";
import { ActiveUserGreeting } from "@/components/landing/active-user-greeting";
import { MyDashboardContent } from "@/components/landing/my-dashboard-content";
import { TrainingBanner } from "@/components/landing/training-banner";

/**
 * Home page. The shell + greeting are server-rendered; everything
 * scoped to the active user (stats, tasks, projects, FTE) is moved
 * into the MyDashboardContent client component so it can follow the
 * role-switcher / accept-invite flow instead of being pinned to the
 * static CURRENT_USER_ID constant.
 */
export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const fallbackUser = getUserById(CURRENT_USER_ID);
  const projects = getProjects();

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-[1600px] mx-auto">
      <ActiveUserGreeting locale={locale} fallbackUser={fallbackUser} />
      <TrainingBanner locale={locale} />
      <MyDashboardContent
        allTasks={mockTasks}
        allUsers={mockUsers}
        allWbsNodes={mockWbsNodes}
        allMembers={mockProjectMembers}
        projects={projects}
        locale={locale}
      />
    </div>
  );
}
