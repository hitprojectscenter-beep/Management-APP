import { setRequestLocale, getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  Calendar as CalendarIcon,
  Sparkles,
  Briefcase,
  TrendingUp,
} from "lucide-react";
import { Link } from "@/lib/i18n/routing";
import {
  CURRENT_USER_ID,
  getOpenTasksForUser,
  getUserById,
  getNodesForUser,
  mockProjectMembers,
  mockUsers,
  mockWbsNodes,
  getProjects,
  getMembersOfNode,
} from "@/lib/db/mock-data";
import { MyTasksTabs } from "@/components/landing/my-tasks-tabs";
import { ProjectMembers } from "@/components/members/project-members";

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isHe = locale === "he";
  const t = await getTranslations("landing");

  const currentUser = getUserById(CURRENT_USER_ID);
  const myOpenTasks = getOpenTasksForUser(CURRENT_USER_ID);
  const myNodes = getNodesForUser(CURRENT_USER_ID);
  const myProjects = myNodes.filter((n) => n.level === "project");
  const myMemberships = mockProjectMembers.filter((m) => m.userId === CURRENT_USER_ID);
  const totalFte = myMemberships.reduce((sum, m) => sum + m.ftePercent, 0);

  // Stats
  const inProgress = myOpenTasks.filter((t) => t.status === "in_progress").length;
  const overdue = myOpenTasks.filter((t) => {
    if (!t.plannedEnd) return false;
    return new Date(t.plannedEnd).getTime() < Date.now();
  }).length;
  const dueThisWeek = myOpenTasks.filter((t) => {
    if (!t.plannedEnd) return false;
    const days = (new Date(t.plannedEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return days >= 0 && days <= 7;
  }).length;

  const projects = getProjects();

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          {currentUser && (
            <Avatar
              src={currentUser.image}
              fallback={currentUser.name[0]}
              className="size-12 sm:size-14 ring-2 ring-primary/20"
            />
          )}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {isHe ? `שלום, ${currentUser?.name?.split(" ")[0]} 👋` : `Hello, ${currentUser?.name?.split(" ")[0]} 👋`}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              {isHe
                ? "כל המשימות שעדיין לא נסגרו - מסודרות לפי דחיפות"
                : "All tasks that are still open - sorted by urgency"}
            </p>
          </div>
        </div>
        <Link href="/reports">
          <Card className="cursor-pointer card-hover">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="size-9 rounded-lg bg-purple-100 dark:bg-purple-950/30 flex items-center justify-center">
                <TrendingUp className="size-4 text-purple-600" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{isHe ? "סך הקצאה שלי" : "My total allocation"}</div>
                <div className="text-lg font-bold">{totalFte}%</div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-tour="stats">
        <StatCard
          icon={CheckSquare}
          label={isHe ? "סך משימות פתוחות" : "Total Open Tasks"}
          value={myOpenTasks.length}
          color="from-blue-500 to-indigo-600"
          bg="bg-blue-500/10"
          iconColor="text-blue-600"
          tooltip={isHe ? "כל המשימות שעוד לא הושלמו או בוטלו" : "All tasks not yet completed or cancelled"}
        />
        <StatCard
          icon={Clock}
          label={isHe ? "בביצוע" : "In Progress"}
          value={inProgress}
          color="from-emerald-500 to-teal-600"
          bg="bg-emerald-500/10"
          iconColor="text-emerald-600"
          tooltip={isHe ? "משימות שכבר התחלת לעבוד עליהן" : "Tasks you've started working on"}
        />
        <StatCard
          icon={AlertTriangle}
          label={isHe ? "באיחור" : "Overdue"}
          value={overdue}
          color="from-red-500 to-rose-600"
          bg="bg-red-500/10"
          iconColor="text-red-600"
          tooltip={isHe ? "משימות שעברו את תאריך היעד" : "Tasks past their due date"}
        />
        <StatCard
          icon={CalendarIcon}
          label={isHe ? "השבוע" : "Due This Week"}
          value={dueThisWeek}
          color="from-amber-500 to-orange-600"
          bg="bg-amber-500/10"
          iconColor="text-amber-600"
          tooltip={isHe ? "תאריך היעד שלהן בתוך 7 הימים הקרובים" : "Due within the next 7 days"}
        />
      </div>

      {/* Main content: tasks tabs + side panel */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3">
          <MyTasksTabs
            tasks={myOpenTasks}
            users={mockUsers}
            projects={projects}
            wbsNodes={mockWbsNodes}
            locale={locale}
          />
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          {/* My Projects */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Briefcase className="size-4 text-blue-600" />
                <h3 className="font-semibold text-sm">{isHe ? "הפרויקטים שלי" : "My Projects"}</h3>
                <Badge variant="outline" className="ms-auto">{myProjects.length}</Badge>
              </div>
              <div className="space-y-2">
                {myProjects.map((project) => {
                  const myMembership = myMemberships.find((m) => m.wbsNodeId === project.id);
                  return (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className="block p-2 rounded-md hover:bg-accent transition-colors"
                    >
                      <div className="text-sm font-medium line-clamp-1">
                        {isHe ? project.name : project.nameEn || project.name}
                      </div>
                      {myMembership && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-muted-foreground truncate">
                            {isHe ? myMembership.roleInProject : myMembership.roleInProjectEn || myMembership.roleInProject}
                          </span>
                          <Badge variant="outline" className="text-[9px] py-0">
                            {myMembership.ftePercent}%
                          </Badge>
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* My participation - all WBS nodes */}
          <Card data-tour="fte-panel">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="size-4 text-purple-600" />
                <h3 className="font-semibold text-sm">{isHe ? "ההשתתפות שלי" : "My Participation"}</h3>
              </div>
              <div className="text-xs text-muted-foreground mb-3">
                {isHe
                  ? "סך אחוזי המשרה שלך בכל הפרויקטים"
                  : "Total FTE % across all your projects"}
              </div>
              <div className="space-y-2">
                {myMemberships.map((m) => {
                  const node = mockWbsNodes.find((n) => n.id === m.wbsNodeId);
                  if (!node) return null;
                  return (
                    <div key={m.id} className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs font-medium line-clamp-1 flex-1">
                          {isHe ? node.name : node.nameEn || node.name}
                        </div>
                        <span className="text-xs font-bold text-primary">{m.ftePercent}%</span>
                      </div>
                      <Progress value={m.ftePercent} className="h-1" />
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 pt-3 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold">{isHe ? "סה״כ" : "Total"}</span>
                  <span
                    className={
                      totalFte > 100
                        ? "text-red-600 font-bold"
                        : "text-emerald-600 font-bold"
                    }
                  >
                    {totalFte}%
                  </span>
                </div>
                {totalFte > 100 && (
                  <div className="text-[10px] text-red-600 mt-1">
                    {isHe ? "⚠️ הקצאת יתר!" : "⚠️ Over-allocated!"}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  bg,
  iconColor,
  tooltip,
}: {
  icon: typeof CheckSquare;
  label: string;
  value: number;
  color: string;
  bg: string;
  iconColor: string;
  tooltip: string;
}) {
  return (
    <Card className="card-hover" title={tooltip}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm text-muted-foreground">{label}</div>
            <div className="text-3xl font-bold mt-2">{value}</div>
          </div>
          <div className={`size-11 rounded-lg ${bg} flex items-center justify-center`}>
            <Icon className={`size-5 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
