"use client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AddTaskDialog } from "@/components/landing/add-task-dialog";
import { txt } from "@/lib/utils/locale-text";
import type { MockUser, MockWbsNode } from "@/lib/db/mock-data";

/**
 * Header action button for the /tasks page. Same reason as
 * ProjectHeaderActions: keeping the Dialog + asChild Button inside one
 * Client Component avoids a server→client serialization quirk that left
 * the trigger Button missing from the rendered DOM.
 */
export function TasksPageActions({
  projects,
  users,
  locale,
}: {
  projects: MockWbsNode[];
  users: MockUser[];
  locale: string;
}) {
  return (
    <AddTaskDialog projects={projects} users={users} locale={locale}>
      <Button>
        <Plus className="size-4" />
        {txt(locale, { he: "משימה חדשה", en: "New Task", ru: "Новая задача", fr: "Nouvelle tâche", es: "Nueva tarea" })}
      </Button>
    </AddTaskDialog>
  );
}
