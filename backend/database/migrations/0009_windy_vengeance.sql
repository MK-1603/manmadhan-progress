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
ALTER TABLE "personal"."personal_books" ADD COLUMN "asin" text;--> statement-breakpoint
ALTER TABLE "personal"."personal_books" ADD COLUMN "edition" text;--> statement-breakpoint
ALTER TABLE "personal"."personal_books" ADD COLUMN "language" text;--> statement-breakpoint
ALTER TABLE "personal"."personal_books" ADD COLUMN "format" text;--> statement-breakpoint
ALTER TABLE "personal"."personal_books" ADD COLUMN "dimensions" text;--> statement-breakpoint
ALTER TABLE "personal"."personal_books" ADD COLUMN "weight" text;--> statement-breakpoint
ALTER TABLE "personal"."personal_books" ADD COLUMN "metadata_provider" text;--> statement-breakpoint
ALTER TABLE "personal"."personal_books" ADD COLUMN "categories" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "personal"."personal_books" ADD COLUMN "subjects" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "personal"."personal_books" ADD COLUMN "tags" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "personal"."personal_books" ADD COLUMN "personal_rating" integer;--> statement-breakpoint
ALTER TABLE "personal"."personal_books" ADD COLUMN "personal_review" text;--> statement-breakpoint
ALTER TABLE "personal"."personal_reading_sessions" ADD COLUMN "start_time" timestamp;--> statement-breakpoint
ALTER TABLE "personal"."personal_reading_sessions" ADD COLUMN "end_time" timestamp;--> statement-breakpoint
ALTER TABLE "personal"."personal_reading_sessions" ADD COLUMN "notes" text;--> statement-breakpoint
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
ALTER TABLE "personal"."personal_book_series_links" ADD CONSTRAINT "personal_book_series_links_series_id_personal_book_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "personal"."personal_book_series"("id") ON DELETE cascade ON UPDATE no action;