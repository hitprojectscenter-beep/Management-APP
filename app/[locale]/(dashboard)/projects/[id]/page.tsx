import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Briefcase, Plus, GitBranch, Target } from "lucide-react";
import {
  getWbsNodeById,
  getTasksByProject,
  mockUsers,
  mockWbsNodes,
  getAllMembersOfNodeRecursive,
} from "@/lib/db/mock-data";
import { calculateProjectHealth } from "@/lib/ai/risk-engine";
import { ProjectViews } from "@/components/projects/project-views";
import { WbsTree } from "@/components/wbs/wbs-tree";
import { ProjectMembers } from "@/components/members/project-members";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const tProj = await getTranslations("projects");
  const tCommon = await getTranslations("common");

  const project = getWbsNodeById(id);
  if (!project) notFound();

  const tasks = getTasksByProject(id);
  const health = calculateProjectHealth(tasks);
  const members = getAllMembersOfNodeRecursive(id);
  const completion = tasks.length > 0
    ? Math.round((tasks.filter((t) => t.status === "done").length / tasks.length) * 100)
    : 0;

  // Build WBS tree starting from this project
  const childNodes = mockWbsNodes.filter((n) => n.parentId === id);

  return (
    <div className="p-6 lg:p-8 max-w-[1800px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Briefcase className="size-4" />
            <span>{locale === "he" ? "פרויקט" : "Project"}</span>
            <span>·</span>
            <Badge variant="outline">
              <Target className="size-3 me-1" />
              {locale === "he" ? "בריאות" : "Health"}: {health.score}
            </Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            {locale === "he" ? project.name : project.nameEn || project.name}
          </h1>
          {project.description && (
            <p className="text-muted-foreground max-w-2xl">{project.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <GitBranch className="size-4" />
            {locale === "he" ? "פצל פעילות" : "Branch activity"}
          </Button>
          <Button>
            <Plus className="size-4" />
            {locale === "he" ? "משימה חדשה" : "New task"}
          </Button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="text-xs text-muted-foreground uppercase">
              {locale === "he" ? "סך משימות" : "Total tasks"}
            </div>
            <div className="text-3xl font-bold mt-1">{tasks.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs text-muted-foreground uppercase">
              {locale === "he" ? "הושלמו" : "Completed"}
            </div>
            <div className="text-3xl font-bold mt-1 text-emerald-600">
              {health.metrics.completed}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs text-muted-foreground uppercase">
              {locale === "he" ? "באיחור" : "Overdue"}
            </div>
            <div className="text-3xl font-bold mt-1 text-red-600">
              {health.metrics.overdue}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs text-muted-foreground uppercase mb-2">
              {tCommon("progress")}
            </div>
            <Progress value={completion} />
            <div className="text-sm font-semibold mt-2">{completion}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Project Views (Kanban/Gantt/List/Calendar) - full width for mobile */}
      <Card>
        <CardContent className="p-0">
          <ProjectViews tasks={tasks} users={mockUsers} locale={locale} />
        </CardContent>
      </Card>

      {/* WBS Tree + Team - side by side on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="max-h-[50vh] overflow-auto">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <GitBranch className="size-4" />
              {locale === "he" ? "מבנה היררכי (WBS)" : "Work Breakdown Structure"}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <WbsTree nodes={childNodes} allNodes={mockWbsNodes} locale={locale} />
          </CardContent>
        </Card>

        <ProjectMembers
          members={members}
          users={mockUsers}
          locale={locale}
          title={locale === "he" ? "צוות הפרויקט" : "Project Team"}
        />
      </div>
    </div>
  );
}
