import { setRequestLocale, getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { getProjects } from "@/lib/db/mock-data";
import { AddProjectDialog } from "@/components/projects/add-project-dialog";
import { LiveProjectsGrid } from "@/components/projects/live-projects-grid";

export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("projects");

  const projects = getProjects();

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <AddProjectDialog>
          <Button>
            <Plus className="size-4" />
            {t("newProject")}
          </Button>
        </AddProjectDialog>
      </div>

      {/* Merges user-created projects (DB + cache) on top of the seeded ones. */}
      <LiveProjectsGrid serverProjects={projects} locale={locale} />
    </div>
  );
}
