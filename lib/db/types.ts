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
  | "not_started"
  | "in_progress"
  | "review"
  | "done"
  | "blocked"
  | "cancelled";

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
