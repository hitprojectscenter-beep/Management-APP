CREATE TYPE "public"."dependency_type" AS ENUM('FS', 'SS', 'FF', 'SF');--> statement-breakpoint
CREATE TYPE "public"."risk_severity" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."task_priority" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('not_started', 'in_progress', 'review', 'done', 'blocked', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'manager', 'member', 'viewer', 'guest');--> statement-breakpoint
CREATE TYPE "public"."wbs_level" AS ENUM('portfolio', 'program', 'project', 'goal', 'milestone', 'activity', 'task', 'subtask');--> statement-breakpoint
CREATE TABLE "accounts" (
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "ai_risks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"severity" "risk_severity" NOT NULL,
	"type" text NOT NULL,
	"message" text NOT NULL,
	"suggestion" text,
	"detected_at" timestamp DEFAULT now() NOT NULL,
	"dismissed" boolean DEFAULT false NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"uploader_id" text,
	"file_name" text NOT NULL,
	"file_url" text NOT NULL,
	"mime_type" text,
	"size_bytes" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" text,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"action" text NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"email" text,
	"event" text NOT NULL,
	"success" boolean DEFAULT false NOT NULL,
	"ip" text,
	"user_agent" text,
	"detail" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"board_id" uuid,
	"name" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"trigger" jsonb NOT NULL,
	"conditions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"actions" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "baselines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"snapshot_at" timestamp DEFAULT now() NOT NULL,
	"planned_start" timestamp,
	"planned_end" timestamp,
	"variance_days" integer,
	"reason" text
);
--> statement-breakpoint
CREATE TABLE "board_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"board_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role_id" uuid NOT NULL,
	"column_permissions" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "boards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wbs_node_id" uuid NOT NULL,
	"name" text NOT NULL,
	"default_view" text DEFAULT 'list' NOT NULL,
	"custom_fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"gcal_event_id" text NOT NULL,
	"etag" text,
	"last_synced" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar_sync" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"google_calendar_id" text NOT NULL,
	"channel_id" text,
	"resource_id" text,
	"expiration" timestamp,
	"sync_token" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_sync_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"author_id" text NOT NULL,
	"body" text NOT NULL,
	"mentions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "project_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wbs_node_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role_in_project" text NOT NULL,
	"fte_percent" integer DEFAULT 100 NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"left_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"name" text NOT NULL,
	"permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_dependencies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_task_id" uuid NOT NULL,
	"to_task_id" uuid NOT NULL,
	"type" "dependency_type" DEFAULT 'FS' NOT NULL,
	"lag_minutes" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wbs_node_id" uuid NOT NULL,
	"board_id" uuid,
	"parent_task_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"status" "task_status" DEFAULT 'not_started' NOT NULL,
	"priority" "task_priority" DEFAULT 'medium' NOT NULL,
	"assignee_id" text,
	"creator_id" text,
	"planned_start" timestamp,
	"planned_end" timestamp,
	"actual_start" timestamp,
	"actual_end" timestamp,
	"estimate_hours" integer,
	"actual_hours" integer,
	"progress_percent" integer DEFAULT 0 NOT NULL,
	"sla_minutes" integer,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"custom_fields" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_used_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"revoked_at" timestamp,
	"ip" text,
	"user_agent" text,
	CONSTRAINT "user_sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"email_verified" timestamp,
	"image" text,
	"locale" text DEFAULT 'he' NOT NULL,
	"role" "user_role" DEFAULT 'member' NOT NULL,
	"phone" text,
	"title" text,
	"manager_id" text,
	"password_hash" text,
	"must_change_password" boolean DEFAULT false NOT NULL,
	"password_changed_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"failed_login_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp,
	"last_login_at" timestamp,
	"mfa_enabled" boolean DEFAULT false NOT NULL,
	"mfa_secret" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "wbs_nodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"parent_id" uuid,
	"level" "wbs_level" NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"deliverable" text,
	"position" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_risks" ADD CONSTRAINT "ai_risks_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploader_id_users_id_fk" FOREIGN KEY ("uploader_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automations" ADD CONSTRAINT "automations_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "baselines" ADD CONSTRAINT "baselines_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_roles" ADD CONSTRAINT "board_roles_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_roles" ADD CONSTRAINT "board_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_roles" ADD CONSTRAINT "board_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boards" ADD CONSTRAINT "boards_wbs_node_id_wbs_nodes_id_fk" FOREIGN KEY ("wbs_node_id") REFERENCES "public"."wbs_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_sync" ADD CONSTRAINT "calendar_sync_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_wbs_node_id_wbs_nodes_id_fk" FOREIGN KEY ("wbs_node_id") REFERENCES "public"."wbs_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_from_task_id_tasks_id_fk" FOREIGN KEY ("from_task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_to_task_id_tasks_id_fk" FOREIGN KEY ("to_task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_wbs_node_id_wbs_nodes_id_fk" FOREIGN KEY ("wbs_node_id") REFERENCES "public"."wbs_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wbs_nodes" ADD CONSTRAINT "wbs_nodes_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_risks_task_idx" ON "ai_risks" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "ai_risks_severity_idx" ON "ai_risks" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "audit_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_actor_idx" ON "audit_logs" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "members_wbs_idx" ON "project_members" USING btree ("wbs_node_id");--> statement-breakpoint
CREATE INDEX "members_user_idx" ON "project_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tasks_wbs_idx" ON "tasks" USING btree ("wbs_node_id");--> statement-breakpoint
CREATE INDEX "tasks_board_idx" ON "tasks" USING btree ("board_id");--> statement-breakpoint
CREATE INDEX "tasks_status_idx" ON "tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tasks_assignee_idx" ON "tasks" USING btree ("assignee_id");--> statement-breakpoint
CREATE INDEX "wbs_parent_idx" ON "wbs_nodes" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "wbs_workspace_idx" ON "wbs_nodes" USING btree ("workspace_id");