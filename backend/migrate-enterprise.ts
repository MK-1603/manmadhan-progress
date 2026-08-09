import { config } from "dotenv";
import { resolve } from "path";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";

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

  console.log("Creating workspace_settings table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "workspace_settings" (
      "id" text PRIMARY KEY NOT NULL,
      "workspace_id" text NOT NULL REFERENCES "workspaces"("id") ON DELETE cascade,
      "allow_after_hours_work" boolean DEFAULT false NOT NULL,
      "enforce_working_hours" boolean DEFAULT true NOT NULL,
      "working_hours_start" text DEFAULT '04:00' NOT NULL,
      "working_hours_end" text DEFAULT '23:00' NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
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

  console.log("Migration complete!");
}

main().catch(console.error);
