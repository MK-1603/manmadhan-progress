CREATE TABLE "deadline_extensions" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"user_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'Pending' NOT NULL,
	"proposed_deadline" timestamp NOT NULL,
	"reviewer_id" text,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "score_ledger" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"task_id" text,
	"project_id" text,
	"event" text NOT NULL,
	"points" integer NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "reviewer_id" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "submitted_at" timestamp;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "approved_at" timestamp;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "rejection_feedback" text;--> statement-breakpoint
ALTER TABLE "time_tracking" ADD COLUMN "status" text DEFAULT 'Active' NOT NULL;--> statement-breakpoint
ALTER TABLE "time_tracking" ADD COLUMN "paused_at" timestamp;--> statement-breakpoint
ALTER TABLE "time_tracking" ADD COLUMN "resumed_at" timestamp;--> statement-breakpoint
ALTER TABLE "deadline_extensions" ADD CONSTRAINT "deadline_extensions_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deadline_extensions" ADD CONSTRAINT "deadline_extensions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deadline_extensions" ADD CONSTRAINT "deadline_extensions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deadline_extensions" ADD CONSTRAINT "deadline_extensions_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "score_ledger" ADD CONSTRAINT "score_ledger_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "score_ledger" ADD CONSTRAINT "score_ledger_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "score_ledger" ADD CONSTRAINT "score_ledger_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "score_ledger" ADD CONSTRAINT "score_ledger_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;