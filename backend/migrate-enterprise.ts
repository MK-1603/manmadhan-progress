import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { resolve } from "path";

config({ path: ".env" });

const sqlNeon = neon(process.env.DATABASE_URL!);
const db = drizzle(sqlNeon);

async function main() {
	console.log("Creating departments table...");
	await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "departments" (
      "id" text PRIMARY KEY NOT NULL,
      "workspace_id" text NOT NULL REFERENCES "workspaces"("id") ON DELETE cascade,
      "name" text NOT NULL,
      "manager_id" text REFERENCES "users"("id") ON DELETE set null,
      "created_at" timestamp DEFAULT now() NOT NULL
    );
  `);

	console.log("Creating projects table...");
	await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "projects" (
      "id" text PRIMARY KEY NOT NULL,
      "workspace_id" text NOT NULL REFERENCES "workspaces"("id") ON DELETE cascade,
      "department_id" text REFERENCES "departments"("id") ON DELETE set null,
      "name" text NOT NULL,
      "description" text,
      "status" text DEFAULT 'Planning' NOT NULL,
      "owner_id" text NOT NULL REFERENCES "users"("id"),
      "created_at" timestamp DEFAULT now() NOT NULL
    );
  `);

	console.log("Creating tasks table...");
	await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "tasks" (
      "id" text PRIMARY KEY NOT NULL,
      "project_id" text REFERENCES "projects"("id") ON DELETE cascade,
      "workspace_id" text NOT NULL REFERENCES "workspaces"("id") ON DELETE cascade,
      "title" text NOT NULL,
      "description" text,
      "status" text DEFAULT 'Draft' NOT NULL,
      "assignee_id" text REFERENCES "users"("id") ON DELETE set null,
      "deadline" timestamp,
      "created_at" timestamp DEFAULT now() NOT NULL
    );
  `);

	console.log("Creating password_resets table...");
	await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "password_resets" (
      "id" text PRIMARY KEY NOT NULL,
      "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
      "token_hash" text NOT NULL,
      "used" boolean DEFAULT false NOT NULL,
      "expires_at" timestamp NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL
    );
  `);

	console.log("Creating time_tracking table...");
	await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "time_tracking" (
      "id" text PRIMARY KEY NOT NULL,
      "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
      "workspace_id" text NOT NULL REFERENCES "workspaces"("id") ON DELETE cascade,
      "task_id" text REFERENCES "tasks"("id") ON DELETE set null,
      "start_time" timestamp NOT NULL,
      "end_time" timestamp,
      "duration_seconds" integer,
      "created_at" timestamp DEFAULT now() NOT NULL
    );
  `);

	console.log("Creating spaces table...");
	await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "spaces" (
      "id" text PRIMARY KEY NOT NULL,
      "workspace_id" text NOT NULL REFERENCES "workspaces"("id") ON DELETE cascade,
      "name" text NOT NULL,
      "type" text NOT NULL,
      "created_by_id" text NOT NULL REFERENCES "users"("id"),
      "created_at" timestamp DEFAULT now() NOT NULL
    );
  `);

	console.log("Creating space_documents table...");
	await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "space_documents" (
      "id" text PRIMARY KEY NOT NULL,
      "space_id" text NOT NULL REFERENCES "spaces"("id") ON DELETE cascade,
      "title" text NOT NULL,
      "content" text,
      "author_id" text NOT NULL REFERENCES "users"("id"),
      "is_pinned" boolean DEFAULT false NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL
    );
  `);

	console.log("Creating folders table...");
	await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "folders" (
      "id" text PRIMARY KEY NOT NULL,
      "workspace_id" text NOT NULL REFERENCES "workspaces"("id") ON DELETE cascade,
      "name" text NOT NULL,
      "parent_id" text,
      "created_at" timestamp DEFAULT now() NOT NULL
    );
  `);

	console.log("Creating files table...");
	await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "files" (
      "id" text PRIMARY KEY NOT NULL,
      "workspace_id" text NOT NULL REFERENCES "workspaces"("id") ON DELETE cascade,
      "folder_id" text REFERENCES "folders"("id") ON DELETE set null,
      "name" text NOT NULL,
      "url" text NOT NULL,
      "size" integer,
      "uploaded_by_id" text NOT NULL REFERENCES "users"("id"),
      "created_at" timestamp DEFAULT now() NOT NULL
    );
  `);

	console.log("Ensuring workspace_settings table and columns...");
	await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "workspace_settings" (
      "id" text PRIMARY KEY NOT NULL,
      "workspace_id" text NOT NULL REFERENCES "workspaces"("id") ON DELETE cascade,
      "timezone" text DEFAULT 'Asia/Kolkata' NOT NULL,
      "allow_after_hours_work" boolean DEFAULT false NOT NULL,
      "enforce_working_hours" boolean DEFAULT true NOT NULL,
      "working_hours_start" text DEFAULT '04:00' NOT NULL,
      "working_hours_end" text DEFAULT '23:00' NOT NULL,
      "block_task_execution" boolean DEFAULT true NOT NULL,
      "block_task_submission" boolean DEFAULT true NOT NULL,
      "block_project_submission" boolean DEFAULT true NOT NULL,
      "block_approval_actions" boolean DEFAULT true NOT NULL,
      "block_timer_tracking" boolean DEFAULT true NOT NULL,
      "deadline_policy" text DEFAULT 'preserve_calendar' NOT NULL,
      "notify_before_end" boolean DEFAULT true NOT NULL,
      "notify_before_end_minutes" integer DEFAULT 15 NOT NULL,
      "notify_restricted_start" boolean DEFAULT true NOT NULL,
      "notify_operational_start" boolean DEFAULT true NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    );
  `);
	await db.execute(sql`ALTER TABLE "workspace_settings" ADD COLUMN IF NOT EXISTS "timezone" text DEFAULT 'Asia/Kolkata' NOT NULL;`);
	await db.execute(sql`ALTER TABLE "workspace_settings" ADD COLUMN IF NOT EXISTS "block_task_execution" boolean DEFAULT true NOT NULL;`);
	await db.execute(sql`ALTER TABLE "workspace_settings" ADD COLUMN IF NOT EXISTS "block_task_submission" boolean DEFAULT true NOT NULL;`);
	await db.execute(sql`ALTER TABLE "workspace_settings" ADD COLUMN IF NOT EXISTS "block_project_submission" boolean DEFAULT true NOT NULL;`);
	await db.execute(sql`ALTER TABLE "workspace_settings" ADD COLUMN IF NOT EXISTS "block_approval_actions" boolean DEFAULT true NOT NULL;`);
	await db.execute(sql`ALTER TABLE "workspace_settings" ADD COLUMN IF NOT EXISTS "block_timer_tracking" boolean DEFAULT true NOT NULL;`);
	await db.execute(sql`ALTER TABLE "workspace_settings" ADD COLUMN IF NOT EXISTS "deadline_policy" text DEFAULT 'preserve_calendar' NOT NULL;`);
	await db.execute(sql`ALTER TABLE "workspace_settings" ADD COLUMN IF NOT EXISTS "notify_before_end" boolean DEFAULT true NOT NULL;`);
	await db.execute(sql`ALTER TABLE "workspace_settings" ADD COLUMN IF NOT EXISTS "notify_before_end_minutes" integer DEFAULT 15 NOT NULL;`);
	await db.execute(sql`ALTER TABLE "workspace_settings" ADD COLUMN IF NOT EXISTS "notify_restricted_start" boolean DEFAULT true NOT NULL;`);
	await db.execute(sql`ALTER TABLE "workspace_settings" ADD COLUMN IF NOT EXISTS "notify_operational_start" boolean DEFAULT true NOT NULL;`);

	console.log("Creating organization_weekly_schedules table...");
	await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "organization_weekly_schedules" (
      "id" text PRIMARY KEY NOT NULL,
      "workspace_id" text NOT NULL REFERENCES "workspaces"("id") ON DELETE cascade,
      "day_of_week" integer NOT NULL,
      "is_working_day" boolean DEFAULT true NOT NULL,
      "start_time" text DEFAULT '04:00' NOT NULL,
      "end_time" text DEFAULT '23:00' NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    );
  `);

	console.log("Creating organization_schedule_exceptions table...");
	await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "organization_schedule_exceptions" (
      "id" text PRIMARY KEY NOT NULL,
      "workspace_id" text NOT NULL REFERENCES "workspaces"("id") ON DELETE cascade,
      "date" text NOT NULL,
      "reason" text NOT NULL,
      "exception_type" text DEFAULT 'CLOSED' NOT NULL,
      "is_closed" boolean DEFAULT true NOT NULL,
      "start_time" text,
      "end_time" text,
      "created_by" text REFERENCES "users"("id") ON DELETE set null,
      "created_at" timestamp DEFAULT now() NOT NULL
    );
  `);

	console.log("Creating organization_emergency_overrides table...");
	await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "organization_emergency_overrides" (
      "id" text PRIMARY KEY NOT NULL,
      "workspace_id" text NOT NULL REFERENCES "workspaces"("id") ON DELETE cascade,
      "activated_by" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
      "reason" text NOT NULL,
      "duration_minutes" integer DEFAULT 60 NOT NULL,
      "start_time" timestamp DEFAULT now() NOT NULL,
      "end_time" timestamp NOT NULL,
      "allowed_actions" jsonb NOT NULL,
      "is_active" boolean DEFAULT true NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL
    );
  `);

	console.log("Creating organization_policy_history table...");
	await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "organization_policy_history" (
      "id" text PRIMARY KEY NOT NULL,
      "workspace_id" text NOT NULL REFERENCES "workspaces"("id") ON DELETE cascade,
      "changed_by" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
      "change_type" text NOT NULL,
      "before_state" jsonb,
      "after_state" jsonb,
      "reason" text,
      "created_at" timestamp DEFAULT now() NOT NULL
    );
  `);

	console.log("Creating notifications table...");
	await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "notifications" (
      "id" text PRIMARY KEY NOT NULL,
      "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
      "workspace_id" text REFERENCES "workspaces"("id") ON DELETE cascade,
      "title" text NOT NULL,
      "message" text NOT NULL,
      "type" text NOT NULL,
      "priority" text DEFAULT 'Low' NOT NULL,
      "is_read" boolean DEFAULT false NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL
    );
  `);

	console.log("Creating ai_context table...");
	await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "ai_context" (
      "id" text PRIMARY KEY NOT NULL,
      "workspace_id" text NOT NULL REFERENCES "workspaces"("id") ON DELETE cascade,
      "user_id" text REFERENCES "users"("id") ON DELETE cascade,
      "content" text NOT NULL,
      "type" text NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL
    );
  `);

	console.log("Ensuring central_requests table and columns...");
	await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "central_requests" (
      "id" text PRIMARY KEY NOT NULL,
      "workspace_id" text REFERENCES "workspaces"("id") ON DELETE cascade,
      "request_type" text NOT NULL,
      "title" text NOT NULL,
      "description" text,
      "requester_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
      "responsible_id" text REFERENCES "users"("id") ON DELETE set null,
      "accountable_id" text REFERENCES "users"("id") ON DELETE set null,
      "approver_id" text REFERENCES "users"("id") ON DELETE set null,
      "status" text DEFAULT 'PENDING' NOT NULL,
      "priority" text DEFAULT 'Medium' NOT NULL,
      "rejection_reason" text,
      "comment" text,
      "entity_type" text,
      "entity_id" text,
      "metadata" jsonb DEFAULT '{}'::jsonb,
      "due_at" timestamp,
      "opened_at" timestamp,
      "decision_at" timestamp,
      "decision_actor_id" text REFERENCES "users"("id") ON DELETE set null,
      "sla_status" text DEFAULT 'ON_TIME' NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    );
  `);
	await db.execute(sql`ALTER TABLE "central_requests" ADD COLUMN IF NOT EXISTS "responsible_id" text REFERENCES "users"("id") ON DELETE set null;`);
	await db.execute(sql`ALTER TABLE "central_requests" ADD COLUMN IF NOT EXISTS "accountable_id" text REFERENCES "users"("id") ON DELETE set null;`);
	await db.execute(sql`ALTER TABLE "central_requests" ADD COLUMN IF NOT EXISTS "priority" text DEFAULT 'Medium' NOT NULL;`);
	await db.execute(sql`ALTER TABLE "central_requests" ADD COLUMN IF NOT EXISTS "comment" text;`);
	await db.execute(sql`ALTER TABLE "central_requests" ADD COLUMN IF NOT EXISTS "due_at" timestamp;`);
	await db.execute(sql`ALTER TABLE "central_requests" ADD COLUMN IF NOT EXISTS "opened_at" timestamp;`);
	await db.execute(sql`ALTER TABLE "central_requests" ADD COLUMN IF NOT EXISTS "decision_at" timestamp;`);
	await db.execute(sql`ALTER TABLE "central_requests" ADD COLUMN IF NOT EXISTS "decision_actor_id" text REFERENCES "users"("id") ON DELETE set null;`);
	await db.execute(sql`ALTER TABLE "central_requests" ADD COLUMN IF NOT EXISTS "sla_status" text DEFAULT 'ON_TIME' NOT NULL;`);

	console.log("Migration complete!");
}

main().catch(console.error);
