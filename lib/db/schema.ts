import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  primaryKey,
  pgEnum,
  uuid,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ============================================
// Enums
// ============================================
export const wbsLevelEnum = pgEnum("wbs_level", [
  "portfolio",
  "program",
  "project",
  "goal",
  "milestone",
  "activity",
  "task",
  "subtask",
]);

export const taskStatusEnum = pgEnum("task_status", [
  "not_started",
  "in_progress",
  "review",
  "done",
  "blocked",
  "cancelled",
]);

export const taskPriorityEnum = pgEnum("task_priority", [
  "low",
  "medium",
  "high",
  "critical",
]);

export const dependencyTypeEnum = pgEnum("dependency_type", [
  "FS", // Finish-to-Start
  "SS", // Start-to-Start
  "FF", // Finish-to-Finish
  "SF", // Start-to-Finish
]);

export const riskSeverityEnum = pgEnum("risk_severity", [
  "low",
  "medium",
  "high",
  "critical",
]);

export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "manager",
  "member",
  "viewer",
  "guest",
]);

// ============================================
// Users & Auth (Auth.js compatible)
// ============================================
export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique().notNull(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  locale: text("locale").default("he").notNull(),
  role: userRoleEnum("role").default("member").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    pk: primaryKey({ columns: [account.provider, account.providerAccountId] }),
  })
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

// ============================================
// Organizations & Workspaces
// ============================================
export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  settings: jsonb("settings").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const workspaces = pgTable("workspaces", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================
// WBS Hierarchy: Portfolio → Program → Project → Goal → Milestone → Activity → Task → Subtask
// ============================================
export const wbsNodes = pgTable(
  "wbs_nodes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id"),
    level: wbsLevelEnum("level").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    deliverable: text("deliverable"),
    position: integer("position").default(0).notNull(),
    metadata: jsonb("metadata").default({}).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    parentIdx: index("wbs_parent_idx").on(table.parentId),
    workspaceIdx: index("wbs_workspace_idx").on(table.workspaceId),
  })
);

// ============================================
// Boards (Views) - each project can have multiple boards (gantt, kanban, etc.)
// ============================================
export const boards = pgTable("boards", {
  id: uuid("id").defaultRandom().primaryKey(),
  wbsNodeId: uuid("wbs_node_id")
    .notNull()
    .references(() => wbsNodes.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  defaultView: text("default_view").default("list").notNull(),
  customFields: jsonb("custom_fields").default([]).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================
// Tasks
// ============================================
export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    wbsNodeId: uuid("wbs_node_id")
      .notNull()
      .references(() => wbsNodes.id, { onDelete: "cascade" }),
    boardId: uuid("board_id").references(() => boards.id, { onDelete: "set null" }),
    parentTaskId: uuid("parent_task_id"),
    title: text("title").notNull(),
    description: text("description"),
    status: taskStatusEnum("status").default("not_started").notNull(),
    priority: taskPriorityEnum("priority").default("medium").notNull(),
    assigneeId: text("assignee_id").references(() => users.id),
    creatorId: text("creator_id").references(() => users.id),
    plannedStart: timestamp("planned_start"),
    plannedEnd: timestamp("planned_end"),
    actualStart: timestamp("actual_start"),
    actualEnd: timestamp("actual_end"),
    estimateHours: integer("estimate_hours"),
    actualHours: integer("actual_hours"),
    progressPercent: integer("progress_percent").default(0).notNull(),
    slaMinutes: integer("sla_minutes"),
    tags: jsonb("tags").default([]).notNull(),
    customFields: jsonb("custom_fields").default({}).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    wbsIdx: index("tasks_wbs_idx").on(table.wbsNodeId),
    boardIdx: index("tasks_board_idx").on(table.boardId),
    statusIdx: index("tasks_status_idx").on(table.status),
    assigneeIdx: index("tasks_assignee_idx").on(table.assigneeId),
  })
);

// ============================================
// Task Dependencies (FS, SS, FF, SF)
// ============================================
export const taskDependencies = pgTable("task_dependencies", {
  id: uuid("id").defaultRandom().primaryKey(),
  fromTaskId: uuid("from_task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  toTaskId: uuid("to_task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  type: dependencyTypeEnum("type").default("FS").notNull(),
  lagMinutes: integer("lag_minutes").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================
// Baselines (planned vs actual snapshots)
// ============================================
export const baselines = pgTable("baselines", {
  id: uuid("id").defaultRandom().primaryKey(),
  taskId: uuid("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  snapshotAt: timestamp("snapshot_at").defaultNow().notNull(),
  plannedStart: timestamp("planned_start"),
  plannedEnd: timestamp("planned_end"),
  varianceDays: integer("variance_days"),
  reason: text("reason"),
});

// ============================================
// Comments
// ============================================
export const comments = pgTable("comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  taskId: uuid("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  authorId: text("author_id")
    .notNull()
    .references(() => users.id),
  body: text("body").notNull(),
  mentions: jsonb("mentions").default([]).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================
// Attachments
// ============================================
export const attachments = pgTable("attachments", {
  id: uuid("id").defaultRandom().primaryKey(),
  taskId: uuid("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  uploaderId: text("uploader_id").references(() => users.id),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  mimeType: text("mime_type"),
  sizeBytes: integer("size_bytes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================
// RBAC: Roles & Board-level Permissions
// ============================================
export const roles = pgTable("roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),
  name: text("name").notNull(),
  permissions: jsonb("permissions").default([]).notNull(),
  isSystem: boolean("is_system").default(false).notNull(),
});

export const boardRoles = pgTable("board_roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  boardId: uuid("board_id")
    .notNull()
    .references(() => boards.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  roleId: uuid("role_id")
    .notNull()
    .references(() => roles.id, { onDelete: "cascade" }),
  columnPermissions: jsonb("column_permissions").default({}).notNull(),
});

// ============================================
// Project Members - assignment of users to projects/programs/portfolios
// with role in project + FTE % allocation
// ============================================
export const projectMembers = pgTable(
  "project_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    wbsNodeId: uuid("wbs_node_id")
      .notNull()
      .references(() => wbsNodes.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleInProject: text("role_in_project").notNull(), // e.g. "Tech Lead", "PM", "QA"
    ftePercent: integer("fte_percent").default(100).notNull(), // 1-100
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
    leftAt: timestamp("left_at"),
  },
  (table) => ({
    wbsIdx: index("members_wbs_idx").on(table.wbsNodeId),
    userIdx: index("members_user_idx").on(table.userId),
  })
);

// ============================================
// Google Calendar Sync
// ============================================
export const calendarSync = pgTable("calendar_sync", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  googleCalendarId: text("google_calendar_id").notNull(),
  channelId: text("channel_id"),
  resourceId: text("resource_id"),
  expiration: timestamp("expiration"),
  syncToken: text("sync_token"),
  enabled: boolean("enabled").default(true).notNull(),
  lastSyncAt: timestamp("last_sync_at"),
});

export const calendarEvents = pgTable("calendar_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  taskId: uuid("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  gcalEventId: text("gcal_event_id").notNull(),
  etag: text("etag"),
  lastSynced: timestamp("last_synced").defaultNow().notNull(),
});

// ============================================
// AI Risks
// ============================================
export const aiRisks = pgTable(
  "ai_risks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    severity: riskSeverityEnum("severity").notNull(),
    type: text("type").notNull(),
    message: text("message").notNull(),
    suggestion: text("suggestion"),
    detectedAt: timestamp("detected_at").defaultNow().notNull(),
    dismissed: boolean("dismissed").default(false).notNull(),
    metadata: jsonb("metadata").default({}).notNull(),
  },
  (table) => ({
    taskIdx: index("ai_risks_task_idx").on(table.taskId),
    severityIdx: index("ai_risks_severity_idx").on(table.severity),
  })
);

// ============================================
// Automations
// ============================================
export const automations = pgTable("automations", {
  id: uuid("id").defaultRandom().primaryKey(),
  boardId: uuid("board_id").references(() => boards.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  trigger: jsonb("trigger").notNull(),
  conditions: jsonb("conditions").default([]).notNull(),
  actions: jsonb("actions").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================
// Audit Logs
// ============================================
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorId: text("actor_id").references(() => users.id),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    action: text("action").notNull(),
    before: jsonb("before"),
    after: jsonb("after"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    entityIdx: index("audit_entity_idx").on(table.entityType, table.entityId),
    actorIdx: index("audit_actor_idx").on(table.actorId),
  })
);

// ============================================
// Relations
// ============================================
export const usersRelations = relations(users, ({ many }) => ({
  assignedTasks: many(tasks),
  comments: many(comments),
}));

export const wbsNodesRelations = relations(wbsNodes, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [wbsNodes.workspaceId],
    references: [workspaces.id],
  }),
  parent: one(wbsNodes, {
    fields: [wbsNodes.parentId],
    references: [wbsNodes.id],
  }),
  tasks: many(tasks),
  boards: many(boards),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  wbsNode: one(wbsNodes, {
    fields: [tasks.wbsNodeId],
    references: [wbsNodes.id],
  }),
  board: one(boards, {
    fields: [tasks.boardId],
    references: [boards.id],
  }),
  assignee: one(users, {
    fields: [tasks.assigneeId],
    references: [users.id],
  }),
  comments: many(comments),
  attachments: many(attachments),
  baselines: many(baselines),
  risks: many(aiRisks),
}));

// Type exports
export type User = typeof users.$inferSelect;
export type WbsNode = typeof wbsNodes.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Board = typeof boards.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type AiRisk = typeof aiRisks.$inferSelect;
export type Automation = typeof automations.$inferSelect;
