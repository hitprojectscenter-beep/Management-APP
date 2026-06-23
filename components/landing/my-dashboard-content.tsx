"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckSquare, Clock, AlertTriangle, Calendar as CalendarIcon, Sparkles, Briefcase } from "lucide-react";
import { Link } from "@/lib/i18n/routing";
import { MyTasksTabs } from "@/components/landing/my-tasks-tabs";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { txt } from "@/lib/utils/locale-text";
import { useRole } from "@/lib/auth/role-context";
import type { MockUser, MockTask, MockWbsNode, MockProjectMember } from "@/lib/db/mock-data";

/**
 * Personalized dashboard content (stats + open tasks + my projects +
 * my participation/FTE).
 *
 * Why this is a client component: until recently the home page was a
 * server component reading the static CURRENT_USER_ID constant, which
 * meant accepting an invite (which only changes localStorage) never
 * actually personalized anything below the greeting — every new user
 * still saw Mark's stats and Mark's tasks. Moving the personalized
 * data path to the client lets it read the active user from the role
 * context that the topbar role-switcher and /accept-invite both
 * write to.
 *
 * The trade-off: all of this now hydrates on the client instead of
 * SSR. The page still renders a stable shell first; this block fills
 * in once React mounts. Worth it because the alternative (cookie-
 * backed session) is a bigger refactor for an MVP demo.
 */
export function MyDashboardContent({
  allTasks,
  allUsers,
  allWbsNodes,
  allMembers,
  projects,
  locale,
}: {
  allTasks: MockTask[];
  allUsers: MockUser[];
  allWbsNodes: MockWbsNode[];
  allMembers: MockProjectMember[];
  projects: MockWbsNode[];
  locale: string;
}) {
  const { currentUser } = useRole();
  const userId = currentUser?.id || "u1";

  // Derive everything the original server component computed, but from
  // the *active* user. Memoize so a re-render from any other source
  // doesn't re-filter every list.
  const derived = useMemo(() => {
    const myMemberships = allMembers.filter((m) => m.userId === userId);
    const myNodeIds = new Set(myMemberships.map((m) => m.wbsNodeId));
    const myNodes = allWbsNodes.filter((n) => myNodeIds.has(n.id));
    const myProjects = myNodes.filter((n) => n.level === "project");
    const myOpenTasks = allTasks.filter(
      (t) => t.assigneeId === userId && t.status !== "done" && t.status !== "cancelled",
    );
    const totalFte = myMemberships.reduce((sum, m) => sum + m.ftePercent, 0);
    const now = Date.now();
    const dayMs = 1000 * 60 * 60 * 24;
    const inProgress = myOpenTasks.filter((t) => t.status === "in_progress").length;
    const overdue = myOpenTasks.filter((t) => t.plannedEnd && new Date(t.plannedEnd).getTime() < now).length;
    const dueThisWeek = myOpenTasks.filter((t) => {
      if (!t.plannedEnd) return false;
      const days = (new Date(t.plannedEnd).getTime() - now) / dayMs;
      return days >= 0 && days <= 7;
    }).length;
    return { myMemberships, myNodes, myProjects, myOpenTasks, totalFte, inProgress, overdue, dueThisWeek };
  }, [userId, allTasks, allWbsNodes, allMembers]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-tour="stats">
        <StatCard
          icon={CheckSquare}
          label={txt(locale, { he: "סך משימות פתוחות", en: "Total Open Tasks", ru: "Открытые задачи", fr: "Tâches ouvertes", es: "Tareas abiertas" })}
          value={derived.myOpenTasks.length}
          color="from-blue-500 to-indigo-600"
          tooltip={txt(locale, { he: "כל המשימות שעוד לא הושלמו או בוטלו", en: "All tasks not yet completed or cancelled", ru: "Все незавершённые задачи", fr: "Toutes les tâches non terminées", es: "Todas las tareas no completadas" })}
        />
        <StatCard
          icon={Clock}
          label={txt(locale, { he: "בביצוע", en: "In Progress", ru: "В работе", fr: "En cours", es: "En progreso" })}
          value={derived.inProgress}
          color="from-emerald-500 to-teal-600"
          tooltip={txt(locale, { he: "משימות שכבר התחלת לעבוד עליהן", en: "Tasks you've started working on", ru: "Задачи, над которыми вы работаете", fr: "Tâches en cours de réalisation", es: "Tareas en las que estás trabajando" })}
        />
        <StatCard
          icon={AlertTriangle}
          label={txt(locale, { he: "באיחור", en: "Overdue", ru: "Просрочено", fr: "En retard", es: "Retrasadas" })}
          value={derived.overdue}
          color="from-red-500 to-rose-600"
          tooltip={txt(locale, { he: "משימות שעברו את תאריך היעד", en: "Tasks past their due date", ru: "Задачи с истёкшим сроком", fr: "Tâches en retard", es: "Tareas vencidas" })}
        />
        <StatCard
          icon={CalendarIcon}
          label={txt(locale, { he: "השבוע", en: "Due This Week", ru: "На этой неделе", fr: "Cette semaine", es: "Esta semana" })}
          value={derived.dueThisWeek}
          color="from-amber-500 to-orange-600"
          tooltip={txt(locale, { he: "תאריך היעד שלהן בתוך 7 הימים הקרובים", en: "Due within the next 7 days", ru: "Срок — в ближайшие 7 дней", fr: "Échéance dans les 7 prochains jours", es: "Vencen en los próximos 7 días" })}
        />
      </div>

      {/* Main content: tasks tabs + side panel */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3">
          <CollapsibleSection
            id="home:open-tasks"
            title={
              <span className="flex items-center gap-2">
                <CheckSquare className="size-4 text-blue-600" />
                {txt(locale, { he: "משימות פתוחות", en: "Open Tasks", ru: "Открытые задачи", fr: "Tâches ouvertes", es: "Tareas abiertas" })}
              </span>
            }
            badge={<Badge variant="outline">{derived.myOpenTasks.length}</Badge>}
          >
            <div className="p-4">
              <MyTasksTabs
                tasks={derived.myOpenTasks}
                users={allUsers}
                projects={projects}
                wbsNodes={allWbsNodes}
                locale={locale}
              />
            </div>
          </CollapsibleSection>
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          <CollapsibleSection
            id="home:my-projects"
            title={
              <span className="flex items-center gap-2">
                <Briefcase className="size-4 text-blue-600" />
                {txt(locale, { he: "הפרויקטים שלי", en: "My Projects", ru: "Мои проекты", fr: "Mes projets", es: "Mis proyectos" })}
              </span>
            }
            badge={<Badge variant="outline">{derived.myProjects.length}</Badge>}
          >
            <div className="p-4 space-y-2">
              {derived.myProjects.map((project) => {
                const myMembership = derived.myMemberships.find((m) => m.wbsNodeId === project.id);
                return (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="block p-2 rounded-md hover:bg-accent transition-colors"
                  >
                    <div className="text-sm font-medium line-clamp-1">
                      {locale === "he" ? project.name : project.nameEn || project.name}
                    </div>
                    {myMembership && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-muted-foreground truncate">
                          {locale === "he" ? myMembership.roleInProject : myMembership.roleInProjectEn || myMembership.roleInProject}
                        </span>
                        <Badge variant="outline" className="text-[9px] py-0">
                          {myMembership.ftePercent}%
                        </Badge>
                      </div>
                    )}
                  </Link>
                );
              })}
              {derived.myProjects.length === 0 && (
                <div className="text-xs text-muted-foreground px-2 py-3 text-center">
                  {txt(locale, { he: "עדיין אין שיוך לפרויקט", en: "Not assigned to any project yet", ru: "Пока нет проектов", fr: "Pas encore assigné à un projet", es: "Aún no asignado a ningún proyecto" })}
                </div>
              )}
            </div>
          </CollapsibleSection>

          <Card data-tour="fte-panel">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="size-4 text-purple-600" />
                <h3 className="font-semibold text-sm">
                  {txt(locale, { he: "ההשתתפות שלי", en: "My Participation", ru: "Моё участие", fr: "Ma participation", es: "Mi participación" })}
                </h3>
              </div>
              <div className="text-xs text-muted-foreground mb-3">
                {txt(locale, {
                  he: "סך אחוזי המשרה שלך בכל הפרויקטים",
                  en: "Total FTE % across all your projects",
                  ru: "Общая загрузка по всем проектам",
                  fr: "% total d'allocation sur tous vos projets",
                  es: "Asignación total en todos sus proyectos",
                })}
              </div>
              <div className="space-y-2">
                {derived.myMemberships.map((m) => {
                  const node = allWbsNodes.find((n) => n.id === m.wbsNodeId);
                  if (!node) return null;
                  return (
                    <div key={m.id} className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs font-medium line-clamp-1 flex-1">
                          {locale === "he" ? node.name : node.nameEn || node.name}
                        </div>
                        <span className="text-xs font-bold text-primary">{m.ftePercent}%</span>
                      </div>
                      <Progress value={m.ftePercent} className="h-1" />
                    </div>
                  );
                })}
                {derived.myMemberships.length === 0 && (
                  <div className="text-xs text-muted-foreground py-2 text-center">
                    {txt(locale, { he: "אין הקצאת FTE עדיין", en: "No FTE allocation yet", ru: "Загрузка не назначена", fr: "Aucune allocation FTE", es: "Sin asignación FTE" })}
                  </div>
                )}
              </div>
              <div className="mt-4 pt-3 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold">
                    {txt(locale, { he: "סה״כ", en: "Total", ru: "Итого", fr: "Total", es: "Total" })}
                  </span>
                  <span className={derived.totalFte > 100 ? "text-red-600 font-bold" : "text-emerald-600 font-bold"}>
                    {derived.totalFte}%
                  </span>
                </div>
                {derived.totalFte > 100 && (
                  <div className="text-[10px] text-red-600 mt-1">
                    {txt(locale, { he: "⚠️ הקצאת יתר!", en: "⚠️ Over-allocated!", ru: "⚠️ Перегрузка!", fr: "⚠️ Sur-alloué !", es: "⚠️ Sobre-asignado!" })}
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
  tooltip,
}: {
  icon: typeof CheckSquare;
  label: string;
  value: number;
  color: string;
  tooltip: string;
}) {
  return (
    <div className={`stat-gradient bg-gradient-to-br ${color} animate-fade-up`} title={tooltip}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-white/80 font-medium">{label}</div>
          <div className="text-4xl font-bold mt-2">{value}</div>
        </div>
        <div className="size-12 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
          <Icon className="size-6 text-white" />
        </div>
      </div>
    </div>
  );
}
