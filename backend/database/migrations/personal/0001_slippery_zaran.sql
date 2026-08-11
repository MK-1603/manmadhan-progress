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
	"integration_type" text,
	"account_id" text,
	"account_name" text,
	"status" text DEFAULT 'Connected',
	"access_token" text,
	"refresh_token" text,
	"token_expires_at" timestamp,
	"permissions" jsonb DEFAULT '[]'::jsonb,
	"metadata" jsonb,
	"last_sync_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal"."integration_github_issues" (
	"id" text PRIMARY KEY NOT NULL,
	"repo_id" text NOT NULL,
	"provider_issue_id" integer NOT NULL,
	"number" integer NOT NULL,
	"title" text NOT NULL,
	"state" text,
	"html_url" text,
	"is_pull_request" boolean DEFAULT false,
	"provider_created_at" timestamp,
	"provider_updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "personal"."integration_github_repos" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"repo_id" integer NOT NULL,
	"name" text NOT NULL,
	"full_name" text NOT NULL,
	"description" text,
	"html_url" text,
	"language" text,
	"stargazers_count" integer,
	"is_selected" boolean DEFAULT true,
	"last_sync_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "personal"."integration_google_calendar_events" (
	"id" text PRIMARY KEY NOT NULL,
	"calendar_id" text NOT NULL,
	"provider_event_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"start_time" timestamp,
	"end_time" timestamp,
	"time_zone" text,
	"location" text,
	"status" text,
	"organizer" text,
	"event_url" text,
	"provider_created_at" timestamp,
	"provider_updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "personal"."integration_google_calendars" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"calendar_id" text NOT NULL,
	"summary" text NOT NULL,
	"time_zone" text,
	"background_color" text,
	"is_selected" boolean DEFAULT true,
	"last_sync_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "personal"."integration_rss_articles" (
	"id" text PRIMARY KEY NOT NULL,
	"feed_id" text NOT NULL,
	"guid" text NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"content" text,
	"link" text,
	"author" text,
	"pub_date" timestamp,
	"is_read" boolean DEFAULT false,
	"is_saved" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal"."integration_rss_feeds" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"feed_url" text NOT NULL,
	"title" text,
	"description" text,
	"site_url" text,
	"image_url" text,
	"category" text,
	"is_active" boolean DEFAULT true,
	"last_sync_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "personal"."personal_book_activity_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"book_id" text NOT NULL,
	"owner_user_id" text NOT NULL,
	"action" text NOT NULL,
	"details" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal"."personal_book_author_links" (
	"id" text PRIMARY KEY NOT NULL,
	"book_id" text NOT NULL,
	"author_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal"."personal_book_authors" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"name" text NOT NULL,
	"biography" text,
	"website" text,
	"photo_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal"."personal_book_chapters" (
	"id" text PRIMARY KEY NOT NULL,
	"book_id" text NOT NULL,
	"number" text,
	"title" text,
	"start_page" integer,
	"end_page" integer,
	"is_completed" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal"."personal_book_collection_links" (
	"id" text PRIMARY KEY NOT NULL,
	"book_id" text NOT NULL,
	"collection_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal"."personal_book_collections" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal"."personal_book_files" (
	"id" text PRIMARY KEY NOT NULL,
	"book_id" text NOT NULL,
	"file_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal"."personal_book_highlights" (
	"id" text PRIMARY KEY NOT NULL,
	"book_id" text NOT NULL,
	"owner_user_id" text NOT NULL,
	"text" text NOT NULL,
	"comment" text,
	"page_number" integer,
	"chapter_id" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal"."personal_book_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"book_id" text NOT NULL,
	"owner_user_id" text NOT NULL,
	"title" text NOT NULL,
	"content" text,
	"page_number" integer,
	"chapter_id" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"note_type" text DEFAULT 'General',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal"."personal_book_series" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal"."personal_book_series_links" (
	"id" text PRIMARY KEY NOT NULL,
	"book_id" text NOT NULL,
	"series_id" text NOT NULL,
	"series_number" text
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
	"asin" text,
	"publisher" text,
	"publication_date" text,
	"edition" text,
	"language" text,
	"page_count" integer,
	"format" text,
	"dimensions" text,
	"weight" text,
	"cover_url" text,
	"source_url" text,
	"metadata_provider" text,
	"categories" jsonb DEFAULT '[]'::jsonb,
	"subjects" jsonb DEFAULT '[]'::jsonb,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"status" text DEFAULT 'Want to Read' NOT NULL,
	"personal_rating" integer,
	"personal_review" text,
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
CREATE TABLE "personal"."personal_daily_motivations" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"text" text NOT NULL,
	"date" text NOT NULL,
	"is_hidden" boolean DEFAULT false NOT NULL,
	"is_saved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
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
CREATE TABLE "personal"."personal_document_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"document_id" text NOT NULL,
	"owner_user_id" text NOT NULL,
	"content" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal"."personal_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"title" text NOT NULL,
	"content" text,
	"url" text,
	"original_name" text,
	"folder" text DEFAULT 'Root',
	"file_type" text DEFAULT 'markdown',
	"size_bytes" integer DEFAULT 0,
	"status" text DEFAULT 'Active',
	"project_id" text,
	"task_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal"."personal_features" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"priority" text DEFAULT 'MEDIUM' NOT NULL,
	"status" text DEFAULT 'PLANNED' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
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
	"user_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"project_id" text,
	"task_id" text,
	"started_at" timestamp NOT NULL,
	"paused_at" timestamp,
	"resumed_at" timestamp,
	"finished_at" timestamp,
	"active_duration" integer DEFAULT 0 NOT NULL,
	"total_duration" integer DEFAULT 0 NOT NULL,
	"paused_duration" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'IDLE' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
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
CREATE TABLE "personal"."personal_prompt_library" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text DEFAULT 'Custom' NOT NULL,
	"body" text NOT NULL,
	"variables" jsonb DEFAULT '[]'::jsonb,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"is_favorite" boolean DEFAULT false NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal"."personal_reading_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"book_id" text NOT NULL,
	"owner_user_id" text NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"start_time" timestamp,
	"end_time" timestamp,
	"pages_read" integer NOT NULL,
	"duration_minutes" integer,
	"start_page" integer,
	"end_page" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal"."personal_requirements" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"category" text DEFAULT 'Functional' NOT NULL,
	"status" text DEFAULT 'PLANNED' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
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
CREATE TABLE "personal"."personal_task_submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"owner_user_id" text NOT NULL,
	"content" text,
	"github_pr_url" text,
	"attachments" jsonb DEFAULT '[]'::jsonb,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
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
ALTER TABLE "personal"."personal_activity_logs" ADD COLUMN "project_id" text;--> statement-breakpoint
ALTER TABLE "personal"."personal_activity_logs" ADD COLUMN "task_id" text;--> statement-breakpoint
ALTER TABLE "personal"."personal_activity_logs" ADD COLUMN "milestone_id" text;--> statement-breakpoint
ALTER TABLE "personal"."personal_projects" ADD COLUMN "type" text DEFAULT 'Personal';--> statement-breakpoint
ALTER TABLE "personal"."personal_projects" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "personal"."personal_projects" ADD COLUMN "goal" text;--> statement-breakpoint
ALTER TABLE "personal"."personal_projects" ADD COLUMN "tags" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "personal"."personal_projects" ADD COLUMN "estimated_effort" integer;--> statement-breakpoint
ALTER TABLE "personal"."personal_projects" ADD COLUMN "remind_at" timestamp;--> statement-breakpoint
ALTER TABLE "personal"."personal_projects" ADD COLUMN "sync_to_calendar" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "personal"."personal_tasks" ADD COLUMN "milestone_id" text;--> statement-breakpoint
ALTER TABLE "personal"."personal_tasks" ADD COLUMN "type" text DEFAULT 'Task';--> statement-breakpoint
ALTER TABLE "personal"."personal_tasks" ADD COLUMN "tags" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "personal"."personal_tasks" ADD COLUMN "remind_at" timestamp;--> statement-breakpoint
ALTER TABLE "personal"."personal_tasks" ADD COLUMN "sync_to_calendar" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "personal"."personal_tasks" ADD COLUMN "calendar_event_id" text;--> statement-breakpoint
ALTER TABLE "personal"."personal_tasks" ADD COLUMN "scheduled_start" timestamp;--> statement-breakpoint
ALTER TABLE "personal"."personal_tasks" ADD COLUMN "scheduled_end" timestamp;--> statement-breakpoint
ALTER TABLE "personal"."personal_tasks" ADD COLUMN "focus_duration" integer;--> statement-breakpoint
ALTER TABLE "personal"."personal_tasks" ADD COLUMN "feature_id" text;--> statement-breakpoint
ALTER TABLE "personal"."personal_tasks" ADD COLUMN "requires_document" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "personal"."personal_tasks" ADD COLUMN "requires_github" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "personal"."personal_tasks" ADD COLUMN "github_pr_url" text;--> statement-breakpoint
ALTER TABLE "personal"."personal_tasks" ADD COLUMN "dependencies" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "personal"."assistant_messages" ADD CONSTRAINT "assistant_messages_conversation_id_assistant_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "personal"."assistant_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal"."integration_github_issues" ADD CONSTRAINT "integration_github_issues_repo_id_integration_github_repos_id_fk" FOREIGN KEY ("repo_id") REFERENCES "personal"."integration_github_repos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal"."integration_github_repos" ADD CONSTRAINT "integration_github_repos_account_id_integration_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "personal"."integration_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal"."integration_google_calendar_events" ADD CONSTRAINT "integration_google_calendar_events_calendar_id_integration_google_calendars_id_fk" FOREIGN KEY ("calendar_id") REFERENCES "personal"."integration_google_calendars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal"."integration_google_calendars" ADD CONSTRAINT "integration_google_calendars_account_id_integration_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "personal"."integration_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal"."integration_rss_articles" ADD CONSTRAINT "integration_rss_articles_feed_id_integration_rss_feeds_id_fk" FOREIGN KEY ("feed_id") REFERENCES "personal"."integration_rss_feeds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal"."integration_rss_feeds" ADD CONSTRAINT "integration_rss_feeds_account_id_integration_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "personal"."integration_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal"."personal_book_activity_logs" ADD CONSTRAINT "personal_book_activity_logs_book_id_personal_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "personal"."personal_books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal"."personal_book_author_links" ADD CONSTRAINT "personal_book_author_links_book_id_personal_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "personal"."personal_books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal"."personal_book_author_links" ADD CONSTRAINT "personal_book_author_links_author_id_personal_book_authors_id_fk" FOREIGN KEY ("author_id") REFERENCES "personal"."personal_book_authors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal"."personal_book_chapters" ADD CONSTRAINT "personal_book_chapters_book_id_personal_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "personal"."personal_books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal"."personal_book_collection_links" ADD CONSTRAINT "personal_book_collection_links_book_id_personal_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "personal"."personal_books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal"."personal_book_collection_links" ADD CONSTRAINT "personal_book_collection_links_collection_id_personal_book_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "personal"."personal_book_collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal"."personal_book_files" ADD CONSTRAINT "personal_book_files_book_id_personal_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "personal"."personal_books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal"."personal_book_highlights" ADD CONSTRAINT "personal_book_highlights_book_id_personal_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "personal"."personal_books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal"."personal_book_highlights" ADD CONSTRAINT "personal_book_highlights_chapter_id_personal_book_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "personal"."personal_book_chapters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal"."personal_book_notes" ADD CONSTRAINT "personal_book_notes_book_id_personal_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "personal"."personal_books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal"."personal_book_notes" ADD CONSTRAINT "personal_book_notes_chapter_id_personal_book_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "personal"."personal_book_chapters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal"."personal_book_series_links" ADD CONSTRAINT "personal_book_series_links_book_id_personal_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "personal"."personal_books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal"."personal_book_series_links" ADD CONSTRAINT "personal_book_series_links_series_id_personal_book_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "personal"."personal_book_series"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal"."personal_document_versions" ADD CONSTRAINT "personal_document_versions_document_id_personal_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "personal"."personal_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal"."personal_features" ADD CONSTRAINT "personal_features_project_id_personal_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "personal"."personal_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal"."personal_file_attachments" ADD CONSTRAINT "personal_file_attachments_file_id_personal_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "personal"."personal_files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal"."personal_focus_sessions" ADD CONSTRAINT "personal_focus_sessions_project_id_personal_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "personal"."personal_projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal"."personal_focus_sessions" ADD CONSTRAINT "personal_focus_sessions_task_id_personal_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "personal"."personal_tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal"."personal_habit_logs" ADD CONSTRAINT "personal_habit_logs_habit_id_personal_habits_id_fk" FOREIGN KEY ("habit_id") REFERENCES "personal"."personal_habits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal"."personal_learning_sessions" ADD CONSTRAINT "personal_learning_sessions_skill_id_personal_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "personal"."personal_skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal"."personal_milestones" ADD CONSTRAINT "personal_milestones_project_id_personal_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "personal"."personal_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal"."personal_note_links" ADD CONSTRAINT "personal_note_links_source_note_id_personal_notes_id_fk" FOREIGN KEY ("source_note_id") REFERENCES "personal"."personal_notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal"."personal_note_links" ADD CONSTRAINT "personal_note_links_target_note_id_personal_notes_id_fk" FOREIGN KEY ("target_note_id") REFERENCES "personal"."personal_notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal"."personal_podcast_episodes" ADD CONSTRAINT "personal_podcast_episodes_podcast_id_personal_podcasts_id_fk" FOREIGN KEY ("podcast_id") REFERENCES "personal"."personal_podcasts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal"."personal_project_files" ADD CONSTRAINT "personal_project_files_project_id_personal_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "personal"."personal_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal"."personal_reading_sessions" ADD CONSTRAINT "personal_reading_sessions_book_id_personal_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "personal"."personal_books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal"."personal_requirements" ADD CONSTRAINT "personal_requirements_project_id_personal_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "personal"."personal_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal"."personal_success_criteria" ADD CONSTRAINT "personal_success_criteria_project_id_personal_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "personal"."personal_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal"."personal_task_files" ADD CONSTRAINT "personal_task_files_task_id_personal_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "personal"."personal_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal"."personal_task_submissions" ADD CONSTRAINT "personal_task_submissions_task_id_personal_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "personal"."personal_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal"."personal_activity_logs" ADD CONSTRAINT "personal_activity_logs_project_id_personal_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "personal"."personal_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal"."personal_activity_logs" ADD CONSTRAINT "personal_activity_logs_task_id_personal_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "personal"."personal_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal"."personal_activity_logs" ADD CONSTRAINT "personal_activity_logs_milestone_id_personal_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "personal"."personal_milestones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal"."personal_tasks" ADD CONSTRAINT "personal_tasks_milestone_id_personal_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "personal"."personal_milestones"("id") ON DELETE set null ON UPDATE no action;