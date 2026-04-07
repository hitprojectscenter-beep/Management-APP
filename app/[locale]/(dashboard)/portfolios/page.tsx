import { setRequestLocale } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { Boxes, Briefcase, FolderTree } from "lucide-react";
import { mockWbsNodes, mockTasks, getPortfolios, getPrograms } from "@/lib/db/mock-data";
import { calculateProjectHealth } from "@/lib/ai/risk-engine";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link } from "@/lib/i18n/routing";

export default async function PortfoliosPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const portfolios = getPortfolios();
  const programs = getPrograms();

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Boxes className="size-7 text-purple-500" />
          {locale === "he" ? "פורטפוליו" : "Portfolios"}
        </h1>
        <p className="text-muted-foreground mt-1">
          {locale === "he" ? "תצוגה הוליסטית של כל היוזמות הארגוניות" : "Holistic view of all organizational initiatives"}
        </p>
      </div>

      {portfolios.map((portfolio) => {
        // Get all descendant tasks
        const descendantIds = new Set([portfolio.id]);
        let queue = [portfolio.id];
        while (queue.length) {
          const next: string[] = [];
          for (const id of queue) {
            const children = mockWbsNodes.filter((n) => n.parentId === id);
            children.forEach((c) => {
              descendantIds.add(c.id);
              next.push(c.id);
            });
          }
          queue = next;
        }
        const portfolioTasks = mockTasks.filter((t) => descendantIds.has(t.wbsNodeId));
        const health = calculateProjectHealth(portfolioTasks);
        const portfolioPrograms = programs.filter((p) => p.parentId === portfolio.id);
        const completion = portfolioTasks.length > 0
          ? Math.round((portfolioTasks.filter((t) => t.status === "done").length / portfolioTasks.length) * 100)
          : 0;

        return (
          <Card key={portfolio.id} className="overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500" />
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-2xl font-bold">
                    {locale === "he" ? portfolio.name : portfolio.nameEn || portfolio.name}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">{portfolio.description}</p>
                </div>
                <Badge
                  variant={
                    health.status === "healthy" ? "success" : health.status === "at-risk" ? "warning" : "destructive"
                  }
                  className="text-sm py-1.5 px-3"
                >
                  {locale === "he" ? "ציון" : "Score"}: {health.score}
                </Badge>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-muted/30 p-3 rounded-lg">
                  <div className="text-xs text-muted-foreground uppercase">
                    {locale === "he" ? "תוכניות" : "Programs"}
                  </div>
                  <div className="text-2xl font-bold mt-1">{portfolioPrograms.length}</div>
                </div>
                <div className="bg-muted/30 p-3 rounded-lg">
                  <div className="text-xs text-muted-foreground uppercase">
                    {locale === "he" ? "משימות" : "Tasks"}
                  </div>
                  <div className="text-2xl font-bold mt-1">{portfolioTasks.length}</div>
                </div>
                <div className="bg-muted/30 p-3 rounded-lg">
                  <div className="text-xs text-muted-foreground uppercase">
                    {locale === "he" ? "באיחור" : "Overdue"}
                  </div>
                  <div className="text-2xl font-bold mt-1 text-red-600">{health.metrics.overdue}</div>
                </div>
                <div className="bg-muted/30 p-3 rounded-lg">
                  <div className="text-xs text-muted-foreground uppercase">
                    {locale === "he" ? "התקדמות" : "Progress"}
                  </div>
                  <div className="text-2xl font-bold mt-1">{completion}%</div>
                </div>
              </div>

              <Progress value={completion} className="h-2 mb-5" />

              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                  {locale === "he" ? "תוכניות" : "Programs"}
                </div>
                {portfolioPrograms.map((program) => {
                  const programDescendantIds = new Set([program.id]);
                  let pq = [program.id];
                  while (pq.length) {
                    const next: string[] = [];
                    for (const id of pq) {
                      const c = mockWbsNodes.filter((n) => n.parentId === id);
                      c.forEach((cc) => {
                        programDescendantIds.add(cc.id);
                        next.push(cc.id);
                      });
                    }
                    pq = next;
                  }
                  const programTasks = mockTasks.filter((t) => programDescendantIds.has(t.wbsNodeId));
                  const programCompletion = programTasks.length > 0
                    ? Math.round((programTasks.filter((t) => t.status === "done").length / programTasks.length) * 100)
                    : 0;

                  return (
                    <div
                      key={program.id}
                      className="flex items-center gap-3 p-3 rounded-md hover:bg-accent transition-colors"
                    >
                      <FolderTree className="size-4 text-indigo-500" />
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          {locale === "he" ? program.name : program.nameEn || program.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {programTasks.length} {locale === "he" ? "משימות" : "tasks"}
                        </div>
                      </div>
                      <div className="w-32">
                        <Progress value={programCompletion} className="h-1.5" />
                      </div>
                      <div className="text-sm font-semibold w-10 text-end">{programCompletion}%</div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
