"use client";
import type { MockTask, MockUser } from "@/lib/db/mock-data";
import { mockWbsNodes } from "@/lib/db/mock-data";
import { AdvancedGantt } from "@/components/gantt/advanced-gantt";

/**
 * Wrapper that re-uses the AdvancedGantt component.
 * Determines the project root by walking up from the first task.
 */
export function TaskGantt({
  tasks,
  users,
  locale,
}: {
  tasks: MockTask[];
  users: MockUser[];
  locale: string;
}) {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {locale === "he" ? "אין משימות להצגה" : "No tasks to display"}
      </div>
    );
  }

  // Find common project ancestor of these tasks
  const firstTask = tasks[0];
  let nodeId: string | null = firstTask.wbsNodeId;
  let rootNodeId: string = firstTask.wbsNodeId;
  while (nodeId) {
    const node = mockWbsNodes.find((n) => n.id === nodeId);
    if (!node) break;
    if (node.level === "project") {
      rootNodeId = node.id;
      break;
    }
    if (!node.parentId) {
      rootNodeId = node.id;
      break;
    }
    nodeId = node.parentId;
  }

  return (
    <AdvancedGantt
      tasks={tasks}
      users={users}
      allWbsNodes={mockWbsNodes}
      rootNodeId={rootNodeId}
      locale={locale}
    />
  );
}
