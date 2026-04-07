import { setRequestLocale, getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, Briefcase, Users, Calendar, ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "@/lib/i18n/routing";
import { mockWbsNodes, mockTasks, mockUsers, getProjects } from "@/lib/db/mock-data";
import { calculateProjectHealth } from "@/lib/ai/risk-engine";
import { Avatar } from "@/components/ui/avatar";

export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("projects");
  const tCommon = await getTranslations("common");

  const projects = getProjects();
  const Arrow = locale === "he" ? ArrowLeft : ArrowRight;

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground mt-1">
            {locale === "he" ? `${projects.length} פרויקטים פעילים` : `${projects.length} active projects`}
          </p>
        </div>
        <Button>
          <Plus className="size-4" />
          {t("newProject")}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {projects.map((project) => {
          // Get all tasks for this project (descendants)
          const descendantNodeIds = new Set<string>([project.id]);
          let queue = [project.id];
          while (queue.length > 0) {
            const next: string[] = [];
            for (const id of queue) {
              const children = mockWbsNodes.filter((n) => n.parentId === id).map((n) => n.id);
              children.forEach((c) => {
                descendantNodeIds.add(c);
                next.push(c);
              });
            }
            queue = next;
          }
          const projectTasks = mockTasks.filter((t) => descendantNodeIds.has(t.wbsNodeId));
          const health = calculateProjectHealth(projectTasks);
          const completion = projectTasks.length > 0
            ? Math.round((projectTasks.filter((t) => t.status === "done").length / projectTasks.length) * 100)
            : 0;
          const teamMembers = new Set(projectTasks.map((t) => t.assigneeId).filter(Boolean));
          const teamUsers = mockUsers.filter((u) => teamMembers.has(u.id));

          return (
            <Card key={project.id} className="card-hover overflow-hidden group">
              <div className="h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <Briefcase className="size-3" />
                      {locale === "he" ? "פרויקט" : "Project"}
                    </div>
                    <h3 className="font-semibold text-lg leading-tight line-clamp-1">
                      {locale === "he" ? project.name : project.nameEn || project.name}
                    </h3>
                    {project.description && (
                      <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                        {project.description}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant={
                      health.status === "healthy" ? "success" : health.status === "at-risk" ? "warning" : "destructive"
                    }
                    className="shrink-0"
                  >
                    {health.score}
                  </Badge>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground">{tCommon("progress")}</span>
                    <span className="font-medium">{completion}%</span>
                  </div>
                  <Progress value={completion} />
                </div>

                <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t">
                  <div>
                    <div className="text-lg font-bold text-emerald-600">{health.metrics.completed}</div>
                    <div className="text-[10px] text-muted-foreground uppercase">
                      {locale === "he" ? "הושלמו" : "Done"}
                    </div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-blue-600">{health.metrics.onTime}</div>
                    <div className="text-[10px] text-muted-foreground uppercase">
                      {locale === "he" ? "פתוחות" : "Open"}
                    </div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-red-600">
                      {health.metrics.overdue + health.metrics.blocked}
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase">
                      {locale === "he" ? "בסיכון" : "At Risk"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex -space-x-2 rtl:space-x-reverse">
                    {teamUsers.slice(0, 4).map((user) => (
                      <Avatar
                        key={user.id}
                        src={user.image}
                        fallback={user.name[0]}
                        className="size-7 ring-2 ring-background"
                      />
                    ))}
                    {teamUsers.length > 4 && (
                      <div className="size-7 ring-2 ring-background rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold">
                        +{teamUsers.length - 4}
                      </div>
                    )}
                  </div>
                  <Link
                    href={`/projects/${project.id}`}
                    className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"
                  >
                    {tCommon("view")}
                    <Arrow className="size-3" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
