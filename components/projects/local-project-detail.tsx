"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Calendar, GitBranch, Coins, Loader2, ArrowRight } from "lucide-react";
import { Link } from "@/lib/i18n/routing";
import { formatDateDDMMYYYY } from "@/lib/utils";
import { txt } from "@/lib/utils/locale-text";
import { fetchProjectFromDb, type LiveProject } from "@/lib/db/local-projects";
import { mockWbsNodes } from "@/lib/db/mock-data";

const METHODOLOGY_LABELS: Record<string, Record<string, string>> = {
  waterfall: { he: "Waterfall — מפל מים", en: "Waterfall" },
  agile: { he: "Agile — זריז", en: "Agile" },
  kanban: { he: "Kanban", en: "Kanban" },
};

/**
 * Client-side detail for user-created projects. These aren't in the server's
 * mockWbsNodes snapshot, so the server page can't find them and would 404 —
 * this loads the project from the database (falling back to the local cache)
 * and renders its details. A created project has no WBS children or tasks yet,
 * so it shows its core attributes plus an empty-state hint.
 */
export function LocalProjectDetail({ id, locale }: { id: string; locale: string }) {
  const [project, setProject] = useState<LiveProject | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const found = await fetchProjectFromDb(id);
      if (!cancelled) setProject(found);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (project === undefined) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin me-2" /> {txt(locale, { he: "טוען פרויקט...", en: "Loading project..." })}
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6 lg:p-8 max-w-2xl mx-auto">
        <Card className="border-amber-200">
          <CardContent className="p-8 text-center space-y-3">
            <h2 className="text-xl font-bold">{txt(locale, { he: "הפרויקט לא נמצא", en: "Project not found" })}</h2>
            <p className="text-sm text-muted-foreground">
              {txt(locale, {
                he: "ייתכן שהפרויקט נמחק או שאין לך הרשאה לצפות בו.",
                en: "It may have been removed, or you don't have permission to view it.",
              })}
            </p>
            <Link href="/projects" className="inline-flex items-center gap-1.5 text-primary hover:underline text-sm">
              <ArrowRight className="size-4" />
              {txt(locale, { he: "חזרה לפרויקטים", en: "Back to projects" })}
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const title = locale === "he" ? project.name : project.nameEn || project.name;
  const program = project.parentId ? mockWbsNodes.find((n) => n.id === project.parentId) : null;
  const methodology = project.methodology ? METHODOLOGY_LABELS[project.methodology]?.[locale] || project.methodology : null;

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="space-y-3">
        <Link href="/projects" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ArrowRight className="size-3" /> {txt(locale, { he: "הפרויקטים", en: "Projects" })}
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Briefcase className="size-4" />
              <span>{txt(locale, { he: "פרויקט", en: "Project" })}</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            {project.description && <p className="text-muted-foreground max-w-2xl">{project.description}</p>}
          </div>
          {methodology && <Badge variant="secondary" className="shrink-0">{methodology}</Badge>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {program && (
          <Card>
            <CardContent className="p-5 flex items-center gap-3">
              <GitBranch className="size-4 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">{txt(locale, { he: "תוכנית הורה", en: "Parent program" })}</div>
                <div className="font-medium">{locale === "he" ? program.name : program.nameEn || program.name}</div>
              </div>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <Calendar className="size-4 text-muted-foreground" />
            <div>
              <div className="text-xs text-muted-foreground">{txt(locale, { he: "תאריכים", en: "Dates" })}</div>
              <div className="font-medium">
                {project.plannedStart ? formatDateDDMMYYYY(project.plannedStart) : "—"}
                {" → "}
                {project.plannedEnd ? formatDateDDMMYYYY(project.plannedEnd) : "—"}
              </div>
            </div>
          </CardContent>
        </Card>
        {project.budget != null && (
          <Card>
            <CardContent className="p-5 flex items-center gap-3">
              <Coins className="size-4 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">{txt(locale, { he: "תקציב מתוכנן", en: "Planned budget" })}</div>
                <div className="font-medium">₪{project.budget.toLocaleString()}</div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{txt(locale, { he: "משימות הפרויקט", en: "Project tasks" })}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {txt(locale, {
              he: "עדיין לא נוספו משימות או שלבי WBS לפרויקט החדש. אפשר ליצור משימות ולשייך אותן לפרויקט.",
              en: "No tasks or WBS items have been added to this new project yet. Create tasks and assign them to it.",
            })}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
