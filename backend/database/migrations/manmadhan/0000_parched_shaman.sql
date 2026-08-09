CREATE SCHEMA "manmadhan";
--> statement-breakpoint
CREATE TABLE "manmadhan"."manmadhan_projects" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"owner_user_id" text NOT NULL,
	"manager_user_id" text,
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
CREATE TABLE "manmadhan"."manmadhan_tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text,
	"created_by_user_id" text NOT NULL,
	"assignee_user_id" text,
	"title" text NOT NULL,
	"description" text,
	"expected_output" text,
	"status" text DEFAULT 'ASSIGNED' NOT NULL,
	"priority" text DEFAULT 'Medium' NOT NULL,
	"deadline" timestamp,
	"estimated_minutes" integer,
	"actual_minutes" integer,
	"score" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"archived_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "manmadhan"."task_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"reviewed_by_user_id" text NOT NULL,
	"decision" text NOT NULL,
	"feedback" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "manmadhan"."task_submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"submitted_by_user_id" text NOT NULL,
	"content" text,
	"attachments" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "manmadhan"."manmadhan_tasks" ADD CONSTRAINT "manmadhan_tasks_project_id_manmadhan_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "manmadhan"."manmadhan_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manmadhan"."task_reviews" ADD CONSTRAINT "task_reviews_task_id_manmadhan_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "manmadhan"."manmadhan_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manmadhan"."task_submissions" ADD CONSTRAINT "task_submissions_task_id_manmadhan_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "manmadhan"."manmadhan_tasks"("id") ON DELETE cascade ON UPDATE no action;