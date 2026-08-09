CREATE SCHEMA "personal";
--> statement-breakpoint
CREATE TABLE "personal"."personal_activity_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"event_type" text NOT NULL,
	"details" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal"."personal_projects" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'Planning' NOT NULL,
	"priority" text DEFAULT 'Medium',
	"start_date" timestamp,
	"deadline" timestamp,
	"progress" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"archived_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "personal"."personal_tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"project_id" text,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'TODO' NOT NULL,
	"priority" text DEFAULT 'Medium' NOT NULL,
	"deadline" timestamp,
	"estimated_minutes" integer,
	"actual_minutes" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"archived_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "personal"."personal_tasks" ADD CONSTRAINT "personal_tasks_project_id_personal_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "personal"."personal_projects"("id") ON DELETE cascade ON UPDATE no action;