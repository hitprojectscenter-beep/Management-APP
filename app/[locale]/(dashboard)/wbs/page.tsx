import { setRequestLocale } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GitBranch } from "lucide-react";
import { mockWbsNodes, mockTasks, mockUsers } from "@/lib/db/mock-data";
import { txt } from "@/lib/utils/locale-text";
import { WbsTree } from "@/components/wbs/wbs-tree";
import { computeAllRollups } from "@/lib/gantt/rollup";
import { Progress } from "@/components/ui/progress";

export default async function WbsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const rollups = computeAllRollups(mockWbsNodes, mockTasks);
  const rootNodes = mockWbsNodes.filter((n) => !n.parentId);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3">
          <div className="size-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
            <GitBranch className="size-5 text-white" />
          </div>
          {txt(locale, { he: "מבנה חבילות עבודה (WBS)", en: "Work Breakdown Structure" })}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {txt(locale, {
            he: "פירוק היררכי של כלל העבודה: פורטפוליו → תוכנית → פרויקט → יעד → אבן דרך → פעילות → משימה",
            en: "Hierarchical breakdown: Portfolio → Program → Project → Goal → Milestone → Activity → Task",
          })}
        </p>
      </div>

      {rootNodes.map((root) => {
        const r = rollups.get(root.id);
        const childNodes = mockWbsNodes.filter((n) => n.parentId === root.id);
        return (
          <Card key={root.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <GitBranch className="size-5 text-emerald-600" />
                  {locale === "he" ? root.name : root.nameEn || root.name}
                </CardTitle>
                {r && (
                  <div className="flex items-center gap-2">
                    <Progress value={r.weightedProgress} className="h-2 w-24" />
                    <Badge variant="outline">{Math.round(r.weightedProgress)}%</Badge>
                    <Badge variant="secondary">{r.taskCount} {txt(locale, { he: "משימות", en: "tasks" })}</Badge>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <WbsTree nodes={childNodes} allNodes={mockWbsNodes} locale={locale} />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
