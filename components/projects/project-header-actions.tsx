"use client";
import { Button } from "@/components/ui/button";
import { GitBranch, Plus } from "lucide-react";
import { AddTaskDialog } from "@/components/landing/add-task-dialog";
import { toast } from "sonner";
import { txt } from "@/lib/utils/locale-text";
import type { MockUser, MockWbsNode } from "@/lib/db/mock-data";

/**
 * Header action buttons on the project-detail page. Extracted into a Client
 * Component because the page itself is a Server Component, and Radix's
 * Dialog wrapped around <Button asChild> doesn't always survive the
 * server→client boundary cleanly. Keeping it in one client island keeps
 * the buttons reliably interactive.
 */
export function ProjectHeaderActions({
  projects,
  users,
  locale,
}: {
  projects: MockWbsNode[];
  users: MockUser[];
  locale: string;
}) {
  const handleBranchActivity = () => {
    toast.info(
      txt(locale, {
        he: "פיצול פעילות — מצב הדגמה",
        en: "Branch activity — demo mode",
      }),
      {
        description: txt(locale, {
          he: "בייצור: יצירת סניף חדש מהפעילות הנוכחית לתת-פרויקט מקביל.",
          en: "Production: spin off a parallel sub-project from this activity.",
        }),
      }
    );
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" onClick={handleBranchActivity}>
        <GitBranch className="size-4" />
        {txt(locale, { he: "פצל פעילות", en: "Branch activity" })}
      </Button>
      <AddTaskDialog projects={projects} users={users} locale={locale}>
        <Button>
          <Plus className="size-4" />
          {txt(locale, { he: "משימה חדשה", en: "New task" })}
        </Button>
      </AddTaskDialog>
    </div>
  );
}
