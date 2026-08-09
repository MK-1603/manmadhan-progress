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
ALTER TABLE "personal"."integration_accounts" ADD COLUMN "integration_type" text;--> statement-breakpoint
ALTER TABLE "personal"."integration_accounts" ADD COLUMN "account_name" text;--> statement-breakpoint
ALTER TABLE "personal"."integration_accounts" ADD COLUMN "token_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "personal"."integration_accounts" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "personal"."integration_accounts" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "personal"."integration_github_issues" ADD CONSTRAINT "integration_github_issues_repo_id_integration_github_repos_id_fk" FOREIGN KEY ("repo_id") REFERENCES "personal"."integration_github_repos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal"."integration_github_repos" ADD CONSTRAINT "integration_github_repos_account_id_integration_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "personal"."integration_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal"."integration_google_calendar_events" ADD CONSTRAINT "integration_google_calendar_events_calendar_id_integration_google_calendars_id_fk" FOREIGN KEY ("calendar_id") REFERENCES "personal"."integration_google_calendars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal"."integration_google_calendars" ADD CONSTRAINT "integration_google_calendars_account_id_integration_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "personal"."integration_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal"."integration_rss_articles" ADD CONSTRAINT "integration_rss_articles_feed_id_integration_rss_feeds_id_fk" FOREIGN KEY ("feed_id") REFERENCES "personal"."integration_rss_feeds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal"."integration_rss_feeds" ADD CONSTRAINT "integration_rss_feeds_account_id_integration_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "personal"."integration_accounts"("id") ON DELETE cascade ON UPDATE no action;