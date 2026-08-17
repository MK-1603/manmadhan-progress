import { db } from "../database/client";
import { sql } from "drizzle-orm";
import { logger } from "../src/services/logger.service";

async function syncLearningTables() {
  console.log("Creating Learning Workspace tables if not exists...");
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "learning_plans" (
        "id" text PRIMARY KEY NOT NULL,
        "workspace_id" text NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
        "name" text NOT NULL,
        "description" text,
        "objective" text,
        "status" text DEFAULT 'ACTIVE' NOT NULL,
        "priority" text DEFAULT 'MEDIUM' NOT NULL,
        "owner_id" text REFERENCES "users"("id"),
        "target_date" timestamp,
        "created_by_user_id" text NOT NULL REFERENCES "users"("id"),
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS "learning_topics" (
        "id" text PRIMARY KEY NOT NULL,
        "learning_plan_id" text NOT NULL REFERENCES "learning_plans"("id") ON DELETE CASCADE,
        "title" text NOT NULL,
        "description" text,
        "category" text DEFAULT 'General',
        "order_index" integer DEFAULT 0 NOT NULL,
        "status" text DEFAULT 'NOT_STARTED' NOT NULL,
        "priority" text DEFAULT 'MEDIUM' NOT NULL,
        "target_date" timestamp,
        "assignee_id" text REFERENCES "users"("id"),
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS "learning_assignments" (
        "id" text PRIMARY KEY NOT NULL,
        "learning_plan_id" text NOT NULL REFERENCES "learning_plans"("id") ON DELETE CASCADE,
        "topic_id" text REFERENCES "learning_topics"("id") ON DELETE CASCADE,
        "assignee_id" text NOT NULL REFERENCES "users"("id"),
        "assigned_by_user_id" text NOT NULL REFERENCES "users"("id"),
        "status" text DEFAULT 'PENDING' NOT NULL,
        "due_date" timestamp,
        "created_at" timestamp DEFAULT now() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS "learning_progress" (
        "id" text PRIMARY KEY NOT NULL,
        "topic_id" text NOT NULL REFERENCES "learning_topics"("id") ON DELETE CASCADE,
        "user_id" text NOT NULL REFERENCES "users"("id"),
        "progress_percent" integer DEFAULT 0 NOT NULL,
        "status" text DEFAULT 'NOT_STARTED' NOT NULL,
        "started_at" timestamp,
        "completed_at" timestamp,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS "learning_resources" (
        "id" text PRIMARY KEY NOT NULL,
        "topic_id" text NOT NULL REFERENCES "learning_topics"("id") ON DELETE CASCADE,
        "title" text NOT NULL,
        "type" text DEFAULT 'URL' NOT NULL,
        "url" text NOT NULL,
        "description" text,
        "created_by_user_id" text REFERENCES "users"("id"),
        "created_at" timestamp DEFAULT now() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS "learning_documents" (
        "id" text PRIMARY KEY NOT NULL,
        "learning_plan_id" text NOT NULL REFERENCES "learning_plans"("id") ON DELETE CASCADE,
        "topic_id" text REFERENCES "learning_topics"("id") ON DELETE CASCADE,
        "name" text NOT NULL,
        "type" text DEFAULT 'HANDBOOK' NOT NULL,
        "storage_reference" text NOT NULL,
        "created_by_user_id" text REFERENCES "users"("id"),
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS "learning_activities" (
        "id" text PRIMARY KEY NOT NULL,
        "workspace_id" text NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
        "learning_plan_id" text REFERENCES "learning_plans"("id") ON DELETE CASCADE,
        "topic_id" text REFERENCES "learning_topics"("id") ON DELETE CASCADE,
        "actor_id" text NOT NULL REFERENCES "users"("id"),
        "action" text NOT NULL,
        "details" text,
        "created_at" timestamp DEFAULT now() NOT NULL
      );
    `);
    console.log("Learning tables created successfully!");
    process.exit(0);
  } catch (err: any) {
    console.error("Failed to create Learning tables:", err);
    process.exit(1);
  }
}

syncLearningTables();
