CREATE SCHEMA IF NOT EXISTS "personal";
--> statement-breakpoint
CREATE TABLE "activities" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"project_id" text,
	"task_id" text,
	"milestone_id" text,
	"user_id" text NOT NULL,
	"action" text NOT NULL,
	"details" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_files" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"file_id" text NOT NULL,
	"attached_by_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "success_criteria" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"description" text NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "task_files" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"file_id" text NOT NULL,
	"attached_by_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal"."assistant_conversations" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal"."assistant_memory" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"preference_key" text NOT NULL,
	"preference_value" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal"."assistant_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"role" text NOT NULL,
	"content" text,
	"tool_calls" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal"."integration_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"provider" text NOT NULL,
	"account_id" text,
	"status" text DEFAULT 'Connected',
	"access_token" text,
	"refresh_token" text,
	"permissions" jsonb DEFAULT '[]'::jsonb,
	"last_sync_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal"."personal_activity_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"project_id" text,
	"task_id" text,
	"milestone_id" text,
	"event_type" text NOT NULL,
	"details" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal"."personal_books" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"title" text NOT NULL,
	"subtitle" text,
	"author" text,
	"description" text,
	"isbn10" text,
	"isbn13" text,
	"publisher" text,
	"publication_date" text,
	"page_count" integer,
	"cover_url" text,
	"source_url" text,
	"status" text DEFAULT 'Want to Read' NOT NULL,
	"start_date" timestamp,
	"target_date" timestamp,
	"current_page" integer DEFAULT 0,
	"daily_page_target" integer DEFAULT 20,
	"preferred_reading_time" text DEFAULT 'Morning',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal"."personal_calendar_events" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"source_type" text,
	"source_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal"."personal_daily_scores" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"date" text NOT NULL,
	"score" integer DEFAULT 0,
	"tasks_completed" integer DEFAULT 0,
	"focus_minutes" integer DEFAULT 0,
	"habits_completed" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal"."personal_file_attachments" (
	"id" text PRIMARY KEY NOT NULL,
	"file_id" text NOT NULL,
	"source_type" text NOT NULL,
	"source_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal"."personal_files" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"folder_id" text,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"file_type" text,
	"file_size" integer,
	"is_vault" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "personal"."personal_focus_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"task_id" text,
	"project_id" text,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp,
	"duration_minutes" integer,
	"status" text DEFAULT 'Completed',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal"."personal_folders" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"parent_id" text,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal"."personal_goals" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text DEFAULT 'Personal',
	"start_date" timestamp,
	"target_date" timestamp,
	"priority" text DEFAULT 'Medium',
	"status" text DEFAULT 'Active' NOT NULL,
	"progress" integer DEFAULT 0,
	"target_value" integer,
	"current_value" integer,
	"unit" text,
	"motivation" text,
	"success_criteria" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"archived_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "personal"."personal_habit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"habit_id" text NOT NULL,
	"owner_user_id" text NOT NULL,
	"date" text NOT NULL,
	"completed" boolean DEFAULT true NOT NULL,
	"value" integer DEFAULT 1,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal"."personal_habits" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text,
	"frequency" text DEFAULT 'Daily' NOT NULL,
	"target" integer DEFAULT 1,
	"start_date" timestamp DEFAULT now() NOT NULL,
	"remind_at" timestamp,
	"preferred_time" text,
	"current_streak" integer DEFAULT 0,
	"longest_streak" integer DEFAULT 0,
	"status" text DEFAULT 'Active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"archived_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "personal"."personal_journal_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"mood" text,
	"energy" integer,
	"location" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"is_memory" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal"."personal_learning_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"skill_id" text NOT NULL,
	"owner_user_id" text NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"topic" text,
	"duration_minutes" integer NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal"."personal_milestones" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'Pending' NOT NULL,
	"priority" text DEFAULT 'Medium',
	"deadline" timestamp,
	"order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal"."personal_note_links" (
	"id" text PRIMARY KEY NOT NULL,
	"source_note_id" text NOT NULL,
	"target_note_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal"."personal_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"folder" text DEFAULT 'All',
	"tags" jsonb DEFAULT '[]'::jsonb,
	"is_pinned" boolean DEFAULT false,
	"is_favorite" boolean DEFAULT false,
	"status" text DEFAULT 'Active',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal"."personal_podcast_episodes" (
	"id" text PRIMARY KEY NOT NULL,
	"podcast_id" text NOT NULL,
	"owner_user_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"published_date" timestamp,
	"duration_seconds" integer,
	"audio_url" text,
	"status" text DEFAULT 'Saved' NOT NULL,
	"progress_seconds" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal"."personal_podcasts" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"title" text NOT NULL,
	"publisher" text,
	"description" text,
	"cover_url" text,
	"rss_url" text,
	"website_url" text,
	"category" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal"."personal_project_files" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"file_name" text NOT NULL,
	"file_type" text,
	"file_size" integer,
	"url" text NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal"."personal_projects" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"type" text DEFAULT 'Personal',
	"category" text,
	"goal" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"status" text DEFAULT 'Planning' NOT NULL,
	"priority" text DEFAULT 'Medium',
	"start_date" timestamp,
	"deadline" timestamp,
	"progress" integer DEFAULT 0,
	"estimated_effort" integer,
	"remind_at" timestamp,
	"sync_to_calendar" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"archived_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "personal"."personal_reading_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"book_id" text NOT NULL,
	"owner_user_id" text NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"pages_read" integer NOT NULL,
	"duration_minutes" integer,
	"start_page" integer,
	"end_page" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal"."personal_secure_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal"."personal_skills" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text,
	"current_level" text DEFAULT 'Beginner',
	"target_level" text DEFAULT 'Expert',
	"progress_percent" integer DEFAULT 0,
	"status" text DEFAULT 'Learning' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal"."personal_success_criteria" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"description" text NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "personal"."personal_task_files" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"file_name" text NOT NULL,
	"file_type" text,
	"file_size" integer,
	"url" text NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal"."personal_tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"project_id" text,
	"milestone_id" text,
	"title" text NOT NULL,
	"description" text,
	"type" text DEFAULT 'Task',
	"tags" jsonb DEFAULT '[]'::jsonb,
	"status" text DEFAULT 'TODO' NOT NULL,
	"priority" text DEFAULT 'Medium' NOT NULL,
	"deadline" timestamp,
	"estimated_minutes" integer,
	"actual_minutes" integer,
	"remind_at" timestamp,
	"sync_to_calendar" boolean DEFAULT false,
	"calendar_event_id" text,
	"focus_duration" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"archived_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "personal"."personal_time_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"category" text NOT NULL,
	"duration_minutes" integer NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal"."personal_vault_audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"action" text NOT NULL,
	"details" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal"."personal_vault_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal"."user_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"preferences" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_settings_owner_user_id_unique" UNIQUE("owner_user_id")
);
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "type" text DEFAULT 'Personal';--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "type" text DEFAULT 'Task';--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "milestone_id" text;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_milestone_id_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."milestones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_files" ADD CONSTRAINT "project_files_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_files" ADD CONSTRAINT "project_files_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_files" ADD CONSTRAINT "project_files_attached_by_id_users_id_fk" FOREIGN KEY ("attached_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "success_criteria" ADD CONSTRAINT "success_criteria_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_files" ADD CONSTRAINT "task_files_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_files" ADD CONSTRAINT "task_files_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_files" ADD CONSTRAINT "task_files_attached_by_id_users_id_fk" FOREIGN KEY ("attached_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal"."assistant_messages" ADD CONSTRAINT "assistant_messages_conversation_id_assistant_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "personal"."assistant_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal"."personal_activity_logs" ADD CONSTRAINT "personal_activity_logs_project_id_personal_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "personal"."personal_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal"."personal_activity_logs" ADD CONSTRAINT "personal_activity_logs_task_id_personal_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "personal"."personal_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal"."personal_activity_logs" ADD CONSTRAINT "personal_activity_logs_milestone_id_personal_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "personal"."personal_milestones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal"."personal_file_attachments" ADD CONSTRAINT "personal_file_attachments_file_id_personal_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "personal"."personal_files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal"."personal_focus_sessions" ADD CONSTRAINT "personal_focus_sessions_task_id_personal_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "personal"."personal_tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal"."personal_focus_sessions" ADD CONSTRAINT "personal_focus_sessions_project_id_personal_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "personal"."personal_projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal"."personal_habit_logs" ADD CONSTRAINT "personal_habit_logs_habit_id_personal_habits_id_fk" FOREIGN KEY ("habit_id") REFERENCES "personal"."personal_habits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal"."personal_learning_sessions" ADD CONSTRAINT "personal_learning_sessions_skill_id_personal_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "personal"."personal_skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal"."personal_milestones" ADD CONSTRAINT "personal_milestones_project_id_personal_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "personal"."personal_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal"."personal_note_links" ADD CONSTRAINT "personal_note_links_source_note_id_personal_notes_id_fk" FOREIGN KEY ("source_note_id") REFERENCES "personal"."personal_notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal"."personal_note_links" ADD CONSTRAINT "personal_note_links_target_note_id_personal_notes_id_fk" FOREIGN KEY ("target_note_id") REFERENCES "personal"."personal_notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal"."personal_podcast_episodes" ADD CONSTRAINT "personal_podcast_episodes_podcast_id_personal_podcasts_id_fk" FOREIGN KEY ("podcast_id") REFERENCES "personal"."personal_podcasts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal"."personal_project_files" ADD CONSTRAINT "personal_project_files_project_id_personal_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "personal"."personal_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal"."personal_reading_sessions" ADD CONSTRAINT "personal_reading_sessions_book_id_personal_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "personal"."personal_books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal"."personal_success_criteria" ADD CONSTRAINT "personal_success_criteria_project_id_personal_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "personal"."personal_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal"."personal_task_files" ADD CONSTRAINT "personal_task_files_task_id_personal_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "personal"."personal_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal"."personal_tasks" ADD CONSTRAINT "personal_tasks_project_id_personal_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "personal"."personal_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal"."personal_tasks" ADD CONSTRAINT "personal_tasks_milestone_id_personal_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "personal"."personal_milestones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_milestone_id_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."milestones"("id") ON DELETE set null ON UPDATE no action;