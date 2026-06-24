"use client";

import type { MockTask, MockUser } from "@/lib/db/mock-data";
import { TaskList } from "@/components/projects/task-list";
import { useLiveTasks } from "@/lib/db/local-tasks";
import { txt } from "@/lib/utils/locale-text";

/**
 * Client wrapper around <TaskList> that merges in tasks created during
 * this session (localStorage) on top of the server snapshot, kept live
 * via the "pmo:tasks-changed" event. Without this, a task created via
 * the dialog never appeared on the server-rendered /tasks page.
 */
export function LiveTaskList({
  serverTasks,
  users,
  locale,
}: {
  serverTasks: MockTask[];
  users: MockUser[];
  locale: string;
}) {
  const tasks = useLiveTasks(serverTasks);
  return (
    <>
      <p className="text-muted-foreground -mt-2 mb-3 text-sm">
        {tasks.length} {txt(locale, { he: "משימות בסך הכל", en: "total tasks" })}
      </p>
      <TaskList tasks={tasks} users={users} locale={locale} />
    </>
  );
}
