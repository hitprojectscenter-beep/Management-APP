/**
 * Personal Assistant Engine (Agentic AI)
 *
 * Handles the full conversational lifecycle:
 *   1. Intent recognition (which action the user wants)
 *   2. Entity extraction (task name, dates, assignee, project, etc.)
 *   3. Gap analysis (which required fields are missing)
 *   4. Conflict detection (scheduling overload, SoD violations, dependencies)
 *   5. Dialog state management (clarification loop)
 *   6. RBAC enforcement before execution
 *   7. Audit logging of all actions
 */
import type { MockTask, MockUser, MockWbsNode, MockProjectMember } from "../db/mock-data";
import type { TaskStatus, TaskPriority, UserRole } from "../db/types";
import { defineAbilitiesFor } from "../rbac/abilities";

// ============================================================
// Types
// ============================================================

export type AssistantAction =
  | "create_task"
  | "create_project"
  | "assign_task"
  | "update_task_status"
  | "summarize_meeting"
  | "query_risks"
  | "query_tasks"
  | "query_workload"
  | "unknown";

export interface TaskEntities {
  title?: string;
  description?: string;
  projectId?: string;
  projectNameHint?: string; // raw text before resolution
  programId?: string;
  programNameHint?: string;
  assigneeId?: string;
  assigneeNameHint?: string;
  plannedStart?: string; // ISO date
  plannedEnd?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  estimateHours?: number;
  tags?: string[];
}

export interface ParsedIntent {
  action: AssistantAction;
  entities: TaskEntities;
  rawText: string;
  confidence: number; // 0-1
  responseText?: string; // assistant's natural-language response
}

export type DialogStage =
  | "idle"
  | "listening"
  | "processing"
  | "awaiting_clarification"
  | "awaiting_confirmation"
  | "executing"
  | "completed"
  | "error";

export interface Gap {
  field: keyof TaskEntities;
  prompt: Record<string, string>;
  required: boolean;
  suggestions?: { value: string; label: string }[];
}

export interface Conflict {
  type: "overload" | "dependency" | "sod_violation" | "permission_denied" | "date_logic";
  message: Record<string, string>;
  suggestion?: Record<string, string>;
  blocking: boolean;
}

export interface AssistantTurn {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  type?: "text" | "voice" | "clarification" | "confirmation" | "action" | "error";
  intent?: ParsedIntent;
}

// ============================================================
// Required fields per action
// ============================================================

const REQUIRED_FIELDS_FOR_ACTION: Record<AssistantAction, (keyof TaskEntities)[]> = {
  create_task: ["title", "projectId", "assigneeId", "plannedStart", "plannedEnd"],
  create_project: ["title", "programId"],
  assign_task: ["title", "assigneeId"],
  update_task_status: ["title", "status"],
  summarize_meeting: [],
  query_risks: [],
  query_tasks: [],
  query_workload: [],
  unknown: [],
};

// ============================================================
// Gap Analysis
// ============================================================

export function analyzeGaps(
  intent: ParsedIntent,
  projects: MockWbsNode[],
  users: MockUser[]
): Gap[] {
  const gaps: Gap[] = [];
  const required = REQUIRED_FIELDS_FOR_ACTION[intent.action] || [];
  const entities = intent.entities;

  for (const field of required) {
    const value = entities[field];
    if (value) continue;

    switch (field) {
      case "title":
        gaps.push({
          field: "title",
          required: true,
          prompt: {
            he: "מה תרצה לקרוא למשימה?",
            en: "What should we call this task?",
          },
        });
        break;

      case "projectId":
        gaps.push({
          field: "projectId",
          required: true,
          prompt: {
            he: "לאיזה פרויקט לשייך את המשימה?",
            en: "Which project should this task belong to?",
          },
          suggestions: projects.map((p) => ({
            value: p.id,
            label: p.name,
          })),
        });
        break;

      case "programId":
        gaps.push({
          field: "programId",
          required: true,
          prompt: {
            he: "לאיזו תוכנית לשייך את הפרויקט?",
            en: "Which program should this project belong to?",
          },
        });
        break;

      case "assigneeId":
        gaps.push({
          field: "assigneeId",
          required: true,
          prompt: {
            he: "מי מחברי הצוות יהיה אחראי על המשימה?",
            en: "Who should be responsible for this task?",
          },
          suggestions: users
            .filter((u) => u.role !== "guest" && u.role !== "viewer")
            .map((u) => ({ value: u.id, label: u.name })),
        });
        break;

      case "plannedStart":
        gaps.push({
          field: "plannedStart",
          required: true,
          prompt: {
            he: "מתי המשימה אמורה להתחיל?",
            en: "When should the task start?",
          },
        });
        break;

      case "plannedEnd":
        gaps.push({
          field: "plannedEnd",
          required: true,
          prompt: {
            he: "מתי המשימה אמורה להסתיים?",
            en: "When should the task end?",
          },
        });
        break;

      case "status":
        gaps.push({
          field: "status",
          required: true,
          prompt: {
            he: "לאיזה סטטוס לעדכן?",
            en: "What status should we set?",
          },
        });
        break;
    }
  }

  return gaps;
}

// ============================================================
// Conflict Detection
// ============================================================

export function detectConflicts(
  intent: ParsedIntent,
  currentUser: MockUser,
  tasks: MockTask[],
  members: MockProjectMember[]
): Conflict[] {
  const conflicts: Conflict[] = [];
  const entities = intent.entities;

  // RBAC check for actions that mutate
  const ability = defineAbilitiesFor(currentUser.role);
  if (intent.action === "create_task" && ability.cannot("create", "Task")) {
    conflicts.push({
      type: "permission_denied",
      blocking: true,
      message: {
        he: `אין לך הרשאה ליצור משימות (תפקידך: ${currentUser.role}).`,
        en: `You don't have permission to create tasks (your role: ${currentUser.role}).`,
      },
      suggestion: {
        he: "פנה למנהל המערכת או בקש ממנהל להקצות את המשימה עבורך.",
        en: "Contact your admin or ask a manager to create the task for you.",
      },
    });
    return conflicts;
  }
  if (intent.action === "create_project" && ability.cannot("create", "Project")) {
    conflicts.push({
      type: "permission_denied",
      blocking: true,
      message: {
        he: `אין לך הרשאה ליצור פרויקטים (תפקידך: ${currentUser.role}).`,
        en: `You don't have permission to create projects (your role: ${currentUser.role}).`,
      },
      suggestion: {
        he: "פנה למנהל הפרוגרמה שלך.",
        en: "Contact your program manager.",
      },
    });
    return conflicts;
  }

  // Date logic conflict
  if (entities.plannedStart && entities.plannedEnd) {
    const start = new Date(entities.plannedStart).getTime();
    const end = new Date(entities.plannedEnd).getTime();
    if (end < start) {
      conflicts.push({
        type: "date_logic",
        blocking: true,
        message: {
          he: "תאריך הסיום הוא לפני תאריך ההתחלה. חייב לתקן.",
          en: "End date is before start date. Must be fixed.",
        },
        suggestion: {
          he: "האם התכוונת להפוך את התאריכים?",
          en: "Did you mean to swap the dates?",
        },
      });
    }
  }

  // Overload check - if assignee is already > 80% FTE
  if (entities.assigneeId) {
    const userMemberships = members.filter((m) => m.userId === entities.assigneeId);
    const totalFte = userMemberships.reduce((sum, m) => sum + m.ftePercent, 0);
    if (totalFte > 80) {
      const assignee = // find via users list externally
        { name: entities.assigneeNameHint || entities.assigneeId };
      conflicts.push({
        type: "overload",
        blocking: false,
        message: {
          he: `${assignee.name} כבר מוקצה ב-${totalFte}% (מעל סף הבטיחות 80%).`,
          en: `${assignee.name} is already allocated at ${totalFte}% (above 80% safety).`,
        },
        suggestion: {
          he: "האם תרצה שאמליץ על חבר צוות אחר פנוי יותר?",
          en: "Would you like me to recommend a more available team member?",
        },
      });
    }
  }

  return conflicts;
}

// ============================================================
// Fuzzy name → ID resolution
// Used to map "דנה", "CRM", "שיווק" etc. into DB IDs
// ============================================================

export function resolveProjectByName(
  hint: string | undefined,
  projects: MockWbsNode[]
): string | undefined {
  if (!hint) return undefined;
  const normalized = hint.toLowerCase().trim();

  // Exact match
  let match = projects.find(
    (p) =>
      p.name.toLowerCase() === normalized ||
      (p.nameEn && p.nameEn.toLowerCase() === normalized)
  );
  if (match) return match.id;

  // Partial match
  match = projects.find(
    (p) =>
      p.name.toLowerCase().includes(normalized) ||
      normalized.includes(p.name.toLowerCase()) ||
      (p.nameEn && (p.nameEn.toLowerCase().includes(normalized) || normalized.includes(p.nameEn.toLowerCase())))
  );
  if (match) return match.id;

  return undefined;
}

export function resolveUserByName(
  hint: string | undefined,
  users: MockUser[]
): string | undefined {
  if (!hint) return undefined;
  const normalized = hint.toLowerCase().trim();

  // First name, last name, or full match
  const match = users.find((u) => {
    const parts = u.name.toLowerCase().split(/\s+/);
    return (
      u.name.toLowerCase() === normalized ||
      u.name.toLowerCase().includes(normalized) ||
      parts.some((p) => p === normalized || normalized.includes(p))
    );
  });
  return match?.id;
}

// ============================================================
// Merge entities across dialog turns
// ============================================================

export function mergeEntities(base: TaskEntities, update: TaskEntities): TaskEntities {
  const merged = { ...base };
  for (const key of Object.keys(update) as (keyof TaskEntities)[]) {
    const value = update[key];
    if (value !== undefined && value !== null && value !== "") {
      (merged as any)[key] = value;
    }
  }
  return merged;
}

// ============================================================
// Build a natural-language summary of an intent for confirmation
// ============================================================

export function buildConfirmationSummary(
  intent: ParsedIntent,
  projects: MockWbsNode[],
  users: MockUser[],
  locale: "he" | "en"
): string {
  const e = intent.entities;
  const isHe = locale === "he";

  if (intent.action === "create_task") {
    const project = e.projectId ? projects.find((p) => p.id === e.projectId) : null;
    const assignee = e.assigneeId ? users.find((u) => u.id === e.assigneeId) : null;

    const parts: string[] = [];
    parts.push(isHe ? `יצירת משימה חדשה:` : `Create new task:`);
    if (e.title) parts.push(`• ${isHe ? "כותרת" : "Title"}: ${e.title}`);
    if (e.description) parts.push(`• ${isHe ? "תיאור" : "Description"}: ${e.description}`);
    if (project) parts.push(`• ${isHe ? "פרויקט" : "Project"}: ${isHe ? project.name : project.nameEn || project.name}`);
    if (assignee) parts.push(`• ${isHe ? "אחראי" : "Assignee"}: ${assignee.name}`);
    if (e.plannedStart)
      parts.push(
        `• ${isHe ? "התחלה" : "Start"}: ${new Date(e.plannedStart).toLocaleDateString(isHe ? "he-IL" : "en-US")}`
      );
    if (e.plannedEnd)
      parts.push(
        `• ${isHe ? "סיום" : "End"}: ${new Date(e.plannedEnd).toLocaleDateString(isHe ? "he-IL" : "en-US")}`
      );
    if (e.priority) parts.push(`• ${isHe ? "עדיפות" : "Priority"}: ${e.priority}`);
    if (e.estimateHours) parts.push(`• ${isHe ? "הערכת שעות" : "Hours"}: ${e.estimateHours}`);

    return parts.join("\n");
  }

  if (intent.action === "create_project") {
    return isHe
      ? `יצירת פרויקט חדש: ${e.title || "(ללא שם)"}`
      : `Create new project: ${e.title || "(unnamed)"}`;
  }

  return intent.responseText || (isHe ? "פעולה לא מוגדרת" : "Action unspecified");
}

// ============================================================
// Audit logging
// ============================================================

export interface AuditEntry {
  id: string;
  timestamp: string;
  actorUserId: string;
  actorUserName: string;
  action: string;
  entityType: string;
  entityId?: string;
  details: Record<string, any>;
  performedBy: "human" | "ai_assistant";
  viaAssistant: boolean;
}

const auditLog: AuditEntry[] = [];

export function logAssistantAction(entry: Omit<AuditEntry, "id" | "timestamp" | "performedBy" | "viaAssistant">): void {
  const full: AuditEntry = {
    ...entry,
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    performedBy: "ai_assistant",
    viaAssistant: true,
  };
  auditLog.push(full);
  // In production: send to audit_logs DB table
  console.info("[ASSISTANT AUDIT]", full);
}

export function getAuditLog(): AuditEntry[] {
  return [...auditLog];
}
