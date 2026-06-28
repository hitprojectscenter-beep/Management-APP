export type WbsLevel =
  | "portfolio"
  | "program"
  | "project"
  | "goal"
  | "milestone"
  | "activity"
  | "task"
  | "subtask";

export type TaskStatus =
  // Legacy keys (seeded data / older tasks) — kept for back-compat.
  | "not_started"
  | "in_progress"
  | "review"
  | "done"
  | "blocked"
  | "cancelled"
  // Task workflow statuses (user spec): חדשה / בטיפול / הוקפאה / ממתינה /
  // טופל / נדחתה — plus "completed" (הושלם), set automatically once every
  // assigned team member has signed off ("בוצע").
  | "new"
  | "frozen"
  | "waiting"
  | "handled"
  | "rejected"
  | "completed";

/** The statuses a user may choose from the task screen, in display order.
 *  "completed" is intentionally absent — it's reached only when ALL team
 *  members mark their part done, never set by hand. ("בטיפול" = in_progress.) */
export const WORKFLOW_STATUSES: TaskStatus[] = [
  "new",
  "in_progress",
  "frozen",
  "waiting",
  "handled",
  "rejected",
];

export type TaskPriority = "low" | "medium" | "high" | "critical";

export type DependencyType = "FS" | "SS" | "FF" | "SF";

export type RiskSeverity = "low" | "medium" | "high" | "critical";

export type UserRole = "admin" | "manager" | "member" | "viewer" | "guest";

export type ProjectMethodology = "waterfall" | "agile" | "kanban";

export const TASK_STATUSES: TaskStatus[] = [
  "not_started",
  "in_progress",
  "review",
  "done",
  "blocked",
  "cancelled",
];

export const TASK_PRIORITIES: TaskPriority[] = ["low", "medium", "high", "critical"];

export const STATUS_COLORS: Record<TaskStatus, string> = {
  not_started: "hsl(220, 13%, 70%)",
  in_progress: "hsl(217, 91%, 60%)",
  review: "hsl(45, 93%, 56%)",
  done: "hsl(142, 71%, 45%)",
  blocked: "hsl(0, 84%, 60%)",
  cancelled: "hsl(220, 9%, 46%)",
  // Workflow statuses
  new: "hsl(220, 13%, 70%)", // חדשה — neutral grey-blue
  frozen: "hsl(199, 89%, 60%)", // הוקפאה — ice/cyan
  waiting: "hsl(45, 93%, 56%)", // ממתינה — amber
  handled: "hsl(168, 70%, 42%)", // טופל — teal
  rejected: "hsl(0, 72%, 56%)", // נדחתה — red
  completed: "hsl(142, 71%, 45%)", // הושלם — green
};

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: "hsl(220, 13%, 70%)",
  medium: "hsl(217, 91%, 60%)",
  high: "hsl(35, 92%, 56%)",
  critical: "hsl(0, 84%, 60%)",
};

export const SEVERITY_COLORS: Record<RiskSeverity, string> = {
  low: "hsl(217, 91%, 60%)",
  medium: "hsl(45, 93%, 56%)",
  high: "hsl(25, 95%, 53%)",
  critical: "hsl(0, 84%, 60%)",
};
