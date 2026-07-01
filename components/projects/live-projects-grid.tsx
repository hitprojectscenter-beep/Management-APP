"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar } from "@/components/ui/avatar";
import { Briefcase, ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "@/lib/i18n/routing";
import { mockWbsNodes, mockTasks, mockUsers } from "@/lib/db/mock-data";
import { calculateProjectHealth } from "@/lib/ai/risk-engine";
import { useLiveProjects, type LiveProject } from "@/lib/db/local-projects";
import { isClosedStatus } from "@/lib/db/types";
import { cn } from "@/lib/utils";
import { txt } from "@/lib/utils/locale-text";

/**
 * Client projects grid. Merges user-created projects (DB + optimistic cache,
 * via useLiveProjects) on top of the seeded server snapshot, so a project made
 * with the "new project" dialog appears immediately and on every device — the
 * projects analogue of LiveTaskList.
 */
export function LiveProjectsGrid({
  serverProjects,
  locale,
}: {
  serverProjects: LiveProject[];
  locale: string;
}) {
  const projects = useLiveProjects(serverProjects);
  const [bucket, setBucket] = useState<"all" | "open" | "closed" | "new" | "rejected">("all");

  // Derive each project's lifecycle bucket from its own status + its tasks:
  // rejected/cancelled → rejected; explicit closed status or all-tasks-finished
  // → closed; no tasks or nothing started → new; otherwise open.
  const bucketOf = useMemo(() => {
    const m: Record<string, "open" | "closed" | "new" | "rejected"> = {};
    for (const p of projects) {
      const ids = new Set<string>([p.id]);
      let q = [p.id];
      while (q.length) {
        const nx: string[] = [];
        for (const id of q) for (const n of mockWbsNodes.filter((n) => n.parentId === id)) { ids.add(n.id); nx.push(n.id); }
        q = nx;
      }
      const ts = mockTasks.filter((t) => ids.has(t.wbsNodeId));
      const st = String((p as { status?: string }).status || "").toLowerCase();
      let b: "open" | "closed" | "new" | "rejected";
      if (st === "rejected" || st === "cancelled") b = "rejected";
      else if (st === "completed" || st === "done" || st === "closed" || st === "archived") b = "closed";
      else if (ts.length === 0) b = "new";
      else if (ts.every((t) => isClosedStatus(t.status))) b = "closed";
      else if (!ts.some((t) => t.status !== "not_started" && t.status !== "new")) b = "new";
      else b = "open";
      m[p.id] = b;
    }
    return m;
  }, [projects]);
  const visibleProjects = bucket === "all" ? projects : projects.filter((p) => bucketOf[p.id] === bucket);

  const tCommon = useTranslations("common");
  const Arrow = locale === "he" ? ArrowLeft : ArrowRight;

  return (
    <>
      <p className="text-muted-foreground -mt-4">
        {bucket === "all"
          ? (locale === "he" ? `${projects.length} פרויקטים` : `${projects.length} projects`)
          : `${visibleProjects.length} / ${projects.length} ${locale === "he" ? "פרויקטים" : "projects"}`}
      </p>

      {/* Lifecycle filter: open / closed / new / rejected */}
      <div className="flex flex-wrap gap-1.5">
        {(["all", "open", "closed", "new", "rejected"] as const).map((f) => {
          const count = f === "all" ? projects.length : projects.filter((p) => bucketOf[p.id] === f).length;
          const label = {
            all: { he: "הכל", en: "All" },
            open: { he: "פתוחים", en: "Open" },
            closed: { he: "סגורים", en: "Closed" },
            new: { he: "חדשים", en: "New" },
            rejected: { he: "נדחו", en: "Rejected" },
          }[f];
          return (
            <button
              key={f}
              type="button"
              onClick={() => setBucket(f)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                bucket === f ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {txt(locale, label)} <span className="text-[10px] opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {visibleProjects.map((project) => {
          // Descendant tasks (created projects have none yet → zeroed metrics).
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
          const completion =
            projectTasks.length > 0
              ? Math.round((projectTasks.filter((t) => t.status === "done" || t.status === "completed" || t.status === "handled").length / projectTasks.length) * 100)
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
                      <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{project.description}</p>
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
    </>
  );
}
