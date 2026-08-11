import {
	boolean,
	integer,
	jsonb,
	pgSchema,
	text,
	timestamp,
} from "drizzle-orm/pg-core";

export const personalSchema = pgSchema("personal");

// Personal Projects
export const personalProjects = personalSchema.table("personal_projects", {
	id: text("id").primaryKey(),
	ownerUserId: text("owner_user_id").notNull(), // App-level reference to Auth DB users.id
	name: text("name").notNull(),
	description: text("description"),
	type: text("type").default("Personal"), // Learning, Development, Research, Career, Personal, Startup, Other
	category: text("category"),
	goal: text("goal"),
	tags: jsonb("tags").default([]),
	status: text("status").default("Planning").notNull(),
	priority: text("priority").default("Medium"),
	startDate: timestamp("start_date"),
	deadline: timestamp("deadline"),
	progress: integer("progress").default(0),
	estimatedEffort: integer("estimated_effort"),
	remindAt: timestamp("remind_at"),
	syncToCalendar: boolean("sync_to_calendar").default(false),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
	completedAt: timestamp("completed_at"),
	archivedAt: timestamp("archived_at"),
});

// Personal Milestones
export const personalMilestones = personalSchema.table("personal_milestones", {
	id: text("id").primaryKey(),
	projectId: text("project_id")
		.notNull()
		.references(() => personalProjects.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	description: text("description"),
	status: text("status").default("Pending").notNull(), // Pending, Active, Completed
	priority: text("priority").default("Medium"),
	deadline: timestamp("deadline"),
	order: integer("order").default(0),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Personal Tasks
export const personalTasks = personalSchema.table("personal_tasks", {
	id: text("id").primaryKey(),
	ownerUserId: text("owner_user_id").notNull(),
	projectId: text("project_id").references(() => personalProjects.id, {
		onDelete: "cascade",
	}),
	milestoneId: text("milestone_id").references(() => personalMilestones.id, {
		onDelete: "set null",
	}),
	title: text("title").notNull(),
	description: text("description"),
	type: text("type").default("Task"), // Task, Study, Development, Research, Meeting, Review, Other
	tags: jsonb("tags").default([]),
	status: text("status").default("TODO").notNull(), // TODO, IN_PROGRESS, COMPLETED, PAUSED
	priority: text("priority").default("Medium").notNull(),
	deadline: timestamp("deadline"),
	estimatedMinutes: integer("estimated_minutes"),
	actualMinutes: integer("actual_minutes"),
	remindAt: timestamp("remind_at"),
	syncToCalendar: boolean("sync_to_calendar").default(false),
	calendarEventId: text("calendar_event_id"),
	scheduledStart: timestamp("scheduled_start"),
	scheduledEnd: timestamp("scheduled_end"),
	focusDuration: integer("focus_duration"),
	featureId: text("feature_id"), // Optional feature association
	requiresDocument: boolean("requires_document").default(false),
	requiresGithub: boolean("requires_github").default(false),
	githubPrUrl: text("github_pr_url"),
	dependencies: jsonb("dependencies").default([]),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
	completedAt: timestamp("completed_at"),
	archivedAt: timestamp("archived_at"),
});

// Personal Success Criteria
export const personalSuccessCriteria = personalSchema.table(
	"personal_success_criteria",
	{
		id: text("id").primaryKey(),
		projectId: text("project_id")
			.notNull()
			.references(() => personalProjects.id, { onDelete: "cascade" }),
		description: text("description").notNull(),
		isCompleted: boolean("is_completed").default(false).notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		completedAt: timestamp("completed_at"),
	},
);

// Personal Project Files
export const personalProjectFiles = personalSchema.table(
	"personal_project_files",
	{
		id: text("id").primaryKey(),
		projectId: text("project_id")
			.notNull()
			.references(() => personalProjects.id, { onDelete: "cascade" }),
		fileName: text("file_name").notNull(),
		fileType: text("file_type"),
		fileSize: integer("file_size"),
		url: text("url").notNull(),
		uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
	},
);

// Personal Task Files
export const personalTaskFiles = personalSchema.table("personal_task_files", {
	id: text("id").primaryKey(),
	taskId: text("task_id")
		.notNull()
		.references(() => personalTasks.id, { onDelete: "cascade" }),
	fileName: text("file_name").notNull(),
	fileType: text("file_type"),
	fileSize: integer("file_size"),
	url: text("url").notNull(),
	uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

// Personal Activity Logs
export const personalActivityLogs = personalSchema.table(
	"personal_activity_logs",
	{
		id: text("id").primaryKey(),
		ownerUserId: text("owner_user_id").notNull(),
		projectId: text("project_id").references(() => personalProjects.id, {
			onDelete: "cascade",
		}),
		taskId: text("task_id").references(() => personalTasks.id, {
			onDelete: "cascade",
		}),
		milestoneId: text("milestone_id").references(() => personalMilestones.id, {
			onDelete: "cascade",
		}),
		eventType: text("event_type").notNull(),
		details: text("details"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
);

// Personal Goals
export const personalGoals = personalSchema.table("personal_goals", {
	id: text("id").primaryKey(),
	ownerUserId: text("owner_user_id").notNull(),
	name: text("name").notNull(),
	description: text("description"),
	category: text("category").default("Personal"), // Personal, Career, Learning, Financial, Health, Project, Custom
	startDate: timestamp("start_date"),
	targetDate: timestamp("target_date"),
	priority: text("priority").default("Medium"),
	status: text("status").default("Active").notNull(), // Active, Completed, Paused, Archived
	progress: integer("progress").default(0), // Percentage
	targetValue: integer("target_value"),
	currentValue: integer("current_value"),
	unit: text("unit"),
	motivation: text("motivation"),
	successCriteria: jsonb("success_criteria").default([]), // Array of strings/objects
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
	completedAt: timestamp("completed_at"),
	archivedAt: timestamp("archived_at"),
});

// Personal Habits
export const personalHabits = personalSchema.table("personal_habits", {
	id: text("id").primaryKey(),
	ownerUserId: text("owner_user_id").notNull(),
	name: text("name").notNull(),
	description: text("description"),
	category: text("category"),
	frequency: text("frequency").default("Daily").notNull(), // Daily, Weekly, Custom
	target: integer("target").default(1), // Target completions per frequency
	startDate: timestamp("start_date").defaultNow().notNull(),
	remindAt: timestamp("remind_at"), // Time of day for reminder
	preferredTime: text("preferred_time"), // Morning, Afternoon, Evening
	currentStreak: integer("current_streak").default(0),
	longestStreak: integer("longest_streak").default(0),
	status: text("status").default("Active").notNull(), // Active, Paused, Archived
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
	archivedAt: timestamp("archived_at"),
});

// Personal Habit Logs
export const personalHabitLogs = personalSchema.table("personal_habit_logs", {
	id: text("id").primaryKey(),
	habitId: text("habit_id")
		.notNull()
		.references(() => personalHabits.id, { onDelete: "cascade" }),
	ownerUserId: text("owner_user_id").notNull(),
	date: text("date").notNull(), // YYYY-MM-DD
	completed: boolean("completed").default(true).notNull(),
	value: integer("value").default(1), // If habits have numeric targets
	notes: text("notes"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Phase 3: Books - Complete Intelligence System
export const personalBooks = personalSchema.table("personal_books", {
	id: text("id").primaryKey(),
	ownerUserId: text("owner_user_id").notNull(),
	title: text("title").notNull(),
	subtitle: text("subtitle"),
	author: text("author"), // Primary author name for quick access
	description: text("description"),
	isbn10: text("isbn10"),
	isbn13: text("isbn13"),
	asin: text("asin"),
	publisher: text("publisher"),
	publicationDate: text("publication_date"),
	edition: text("edition"),
	language: text("language"),
	pageCount: integer("page_count"),
	format: text("format"),
	dimensions: text("dimensions"),
	weight: text("weight"),
	coverUrl: text("cover_url"),
	sourceUrl: text("source_url"), // URL the metadata was fetched from
	metadataProvider: text("metadata_provider"),
	categories: jsonb("categories").default([]),
	subjects: jsonb("subjects").default([]),
	tags: jsonb("tags").default([]),

	status: text("status").default("Want to Read").notNull(), // Want to Read, Planned, Reading, Paused, Completed, Abandoned
	personalRating: integer("personal_rating"),
	personalReview: text("personal_review"),

	startDate: timestamp("start_date"),
	targetDate: timestamp("target_date"),
	currentPage: integer("current_page").default(0),
	dailyPageTarget: integer("daily_page_target").default(20),
	preferredReadingTime: text("preferred_reading_time").default("Morning"),

	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const personalBookAuthors = personalSchema.table(
	"personal_book_authors",
	{
		id: text("id").primaryKey(),
		ownerUserId: text("owner_user_id").notNull(),
		name: text("name").notNull(),
		biography: text("biography"),
		website: text("website"),
		photoUrl: text("photo_url"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
);

// Many-to-Many Books <-> Authors
export const personalBookAuthorLinks = personalSchema.table(
	"personal_book_author_links",
	{
		id: text("id").primaryKey(),
		bookId: text("book_id")
			.notNull()
			.references(() => personalBooks.id, { onDelete: "cascade" }),
		authorId: text("author_id")
			.notNull()
			.references(() => personalBookAuthors.id, { onDelete: "cascade" }),
	},
);

export const personalBookSeries = personalSchema.table("personal_book_series", {
	id: text("id").primaryKey(),
	ownerUserId: text("owner_user_id").notNull(),
	name: text("name").notNull(),
	description: text("description"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Many-to-Many Books <-> Series
export const personalBookSeriesLinks = personalSchema.table(
	"personal_book_series_links",
	{
		id: text("id").primaryKey(),
		bookId: text("book_id")
			.notNull()
			.references(() => personalBooks.id, { onDelete: "cascade" }),
		seriesId: text("series_id")
			.notNull()
			.references(() => personalBookSeries.id, { onDelete: "cascade" }),
		seriesNumber: text("series_number"), // e.g. "1", "2", "3a"
	},
);

export const personalBookCollections = personalSchema.table(
	"personal_book_collections",
	{
		id: text("id").primaryKey(),
		ownerUserId: text("owner_user_id").notNull(),
		name: text("name").notNull(),
		description: text("description"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
);

// Many-to-Many Books <-> Collections
export const personalBookCollectionLinks = personalSchema.table(
	"personal_book_collection_links",
	{
		id: text("id").primaryKey(),
		bookId: text("book_id")
			.notNull()
			.references(() => personalBooks.id, { onDelete: "cascade" }),
		collectionId: text("collection_id")
			.notNull()
			.references(() => personalBookCollections.id, { onDelete: "cascade" }),
	},
);

export const personalBookChapters = personalSchema.table(
	"personal_book_chapters",
	{
		id: text("id").primaryKey(),
		bookId: text("book_id")
			.notNull()
			.references(() => personalBooks.id, { onDelete: "cascade" }),
		number: text("number"), // Could be "1" or "Epilogue"
		title: text("title"),
		startPage: integer("start_page"),
		endPage: integer("end_page"),
		isCompleted: boolean("is_completed").default(false),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
);

export const personalReadingSessions = personalSchema.table(
	"personal_reading_sessions",
	{
		id: text("id").primaryKey(),
		bookId: text("book_id")
			.notNull()
			.references(() => personalBooks.id, { onDelete: "cascade" }),
		ownerUserId: text("owner_user_id").notNull(),
		date: timestamp("date").defaultNow().notNull(),
		startTime: timestamp("start_time"),
		endTime: timestamp("end_time"),
		pagesRead: integer("pages_read").notNull(),
		durationMinutes: integer("duration_minutes"),
		startPage: integer("start_page"),
		endPage: integer("end_page"),
		notes: text("notes"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
);

export const personalBookNotes = personalSchema.table("personal_book_notes", {
	id: text("id").primaryKey(),
	bookId: text("book_id")
		.notNull()
		.references(() => personalBooks.id, { onDelete: "cascade" }),
	ownerUserId: text("owner_user_id").notNull(),
	title: text("title").notNull(),
	content: text("content"),
	pageNumber: integer("page_number"),
	chapterId: text("chapter_id").references(() => personalBookChapters.id, {
		onDelete: "set null",
	}),
	tags: jsonb("tags").default([]),
	noteType: text("note_type").default("General"), // Summary, Reflection, Action, Quote, General
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const personalBookHighlights = personalSchema.table(
	"personal_book_highlights",
	{
		id: text("id").primaryKey(),
		bookId: text("book_id")
			.notNull()
			.references(() => personalBooks.id, { onDelete: "cascade" }),
		ownerUserId: text("owner_user_id").notNull(),
		text: text("text").notNull(), // The highlighted content
		comment: text("comment"),
		pageNumber: integer("page_number"),
		chapterId: text("chapter_id").references(() => personalBookChapters.id, {
			onDelete: "set null",
		}),
		tags: jsonb("tags").default([]),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
);

export const personalBookActivityLogs = personalSchema.table(
	"personal_book_activity_logs",
	{
		id: text("id").primaryKey(),
		bookId: text("book_id")
			.notNull()
			.references(() => personalBooks.id, { onDelete: "cascade" }),
		ownerUserId: text("owner_user_id").notNull(),
		action: text("action").notNull(), // "Started Reading", "Session Logged", "Note Created"
		details: text("details"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
);

export const personalBookFiles = personalSchema.table("personal_book_files", {
	id: text("id").primaryKey(),
	bookId: text("book_id")
		.notNull()
		.references(() => personalBooks.id, { onDelete: "cascade" }),
	fileId: text("file_id").notNull(), // Links to central personalFiles (avoid foreign key here if not imported yet, or use text)
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Phase 3: Podcasts
export const personalPodcasts = personalSchema.table("personal_podcasts", {
	id: text("id").primaryKey(),
	ownerUserId: text("owner_user_id").notNull(),
	title: text("title").notNull(),
	publisher: text("publisher"),
	description: text("description"),
	coverUrl: text("cover_url"),
	rssUrl: text("rss_url"),
	websiteUrl: text("website_url"),
	category: text("category"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const personalPodcastEpisodes = personalSchema.table(
	"personal_podcast_episodes",
	{
		id: text("id").primaryKey(),
		podcastId: text("podcast_id")
			.notNull()
			.references(() => personalPodcasts.id, { onDelete: "cascade" }),
		ownerUserId: text("owner_user_id").notNull(),
		title: text("title").notNull(),
		description: text("description"),
		publishedDate: timestamp("published_date"),
		durationSeconds: integer("duration_seconds"),
		audioUrl: text("audio_url"),
		status: text("status").default("Saved").notNull(), // Saved, Listening, Completed, Skipped
		progressSeconds: integer("progress_seconds").default(0),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
);

// Phase 3: Learning & Skills
export const personalSkills = personalSchema.table("personal_skills", {
	id: text("id").primaryKey(),
	ownerUserId: text("owner_user_id").notNull(),
	name: text("name").notNull(),
	description: text("description"),
	category: text("category"),
	currentLevel: text("current_level").default("Beginner"), // Beginner, Intermediate, Advanced, Expert
	targetLevel: text("target_level").default("Expert"),
	progressPercent: integer("progress_percent").default(0),
	status: text("status").default("Learning").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const personalLearningSessions = personalSchema.table(
	"personal_learning_sessions",
	{
		id: text("id").primaryKey(),
		skillId: text("skill_id")
			.notNull()
			.references(() => personalSkills.id, { onDelete: "cascade" }),
		ownerUserId: text("owner_user_id").notNull(),
		date: timestamp("date").defaultNow().notNull(),
		topic: text("topic"),
		durationMinutes: integer("duration_minutes").notNull(),
		notes: text("notes"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
);

// Phase 3: Notes
export const personalNotes = personalSchema.table("personal_notes", {
	id: text("id").primaryKey(),
	ownerUserId: text("owner_user_id").notNull(),
	title: text("title").notNull(),
	body: text("body"), // Rich text / Markdown / HTML
	folder: text("folder").default("All"),
	tags: jsonb("tags").default([]),
	isPinned: boolean("is_pinned").default(false),
	isFavorite: boolean("is_favorite").default(false),
	status: text("status").default("Active"), // Active, Archived
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const personalNoteLinks = personalSchema.table("personal_note_links", {
	id: text("id").primaryKey(),
	sourceNoteId: text("source_note_id")
		.notNull()
		.references(() => personalNotes.id, { onDelete: "cascade" }),
	targetNoteId: text("target_note_id")
		.notNull()
		.references(() => personalNotes.id, { onDelete: "cascade" }),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Phase 3: Documents
export const personalDocuments = personalSchema.table("personal_documents", {
	id: text("id").primaryKey(),
	ownerUserId: text("owner_user_id").notNull(),
	title: text("title").notNull(),
	content: text("content"),
	url: text("url"),
	originalName: text("original_name"),
	folder: text("folder").default("Root"),
	fileType: text("file_type").default("markdown"),
	sizeBytes: integer("size_bytes").default(0),
	status: text("status").default("Active"), // Active, Archived
	projectId: text("project_id"), // Optional project association
	taskId: text("task_id"), // Optional task association
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const personalDocumentVersions = personalSchema.table(
	"personal_document_versions",
	{
		id: text("id").primaryKey(),
		documentId: text("document_id")
			.notNull()
			.references(() => personalDocuments.id, { onDelete: "cascade" }),
		ownerUserId: text("owner_user_id").notNull(),
		content: text("content"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
);

// Phase 3: Journal
export const personalJournalEntries = personalSchema.table(
	"personal_journal_entries",
	{
		id: text("id").primaryKey(),
		ownerUserId: text("owner_user_id").notNull(),
		date: timestamp("date").defaultNow().notNull(),
		title: text("title").notNull(),
		body: text("body"), // Rich text
		mood: text("mood"),
		energy: integer("energy"), // 1-10
		location: text("location"),
		tags: jsonb("tags").default([]),
		isMemory: boolean("is_memory").default(false), // Memories
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
);

// Phase 3: Unified Calendar Events
export const personalCalendarEvents = personalSchema.table(
	"personal_calendar_events",
	{
		id: text("id").primaryKey(),
		ownerUserId: text("owner_user_id").notNull(),
		title: text("title").notNull(),
		description: text("description"),
		startDate: timestamp("start_date").notNull(),
		endDate: timestamp("end_date"),
		sourceType: text("source_type"), // BOOK_READING, LEARNING_SESSION, TASK, EVENT
		sourceId: text("source_id"), // Polymorphic ID
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
);
// Phase 4: Storage (Files & Vault)
export const personalFolders = personalSchema.table("personal_folders", {
	id: text("id").primaryKey(),
	ownerUserId: text("owner_user_id").notNull(),
	parentId: text("parent_id"), // Self-referencing omitted for simplicity, handled in code
	name: text("name").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const personalFiles = personalSchema.table("personal_files", {
	id: text("id").primaryKey(),
	ownerUserId: text("owner_user_id").notNull(),
	folderId: text("folder_id"),
	name: text("name").notNull(),
	url: text("url").notNull(), // Cloudinary URL
	fileType: text("file_type"),
	fileSize: integer("file_size"),
	isVault: boolean("is_vault").default(false).notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
	deletedAt: timestamp("deleted_at"),
});

export const personalFileAttachments = personalSchema.table(
	"personal_file_attachments",
	{
		id: text("id").primaryKey(),
		fileId: text("file_id")
			.notNull()
			.references(() => personalFiles.id, { onDelete: "cascade" }),
		sourceType: text("source_type").notNull(), // Project, Task, Book, Note
		sourceId: text("source_id").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
);

export const personalVaultSessions = personalSchema.table(
	"personal_vault_sessions",
	{
		id: text("id").primaryKey(),
		ownerUserId: text("owner_user_id").notNull(),
		token: text("token").notNull(),
		expiresAt: timestamp("expires_at").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
);

export const personalSecureNotes = personalSchema.table(
	"personal_secure_notes",
	{
		id: text("id").primaryKey(),
		ownerUserId: text("owner_user_id").notNull(),
		title: text("title").notNull(),
		body: text("body"), // Encrypted or protected
		tags: jsonb("tags").default([]),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
);

export const personalVaultAuditLogs = personalSchema.table(
	"personal_vault_audit_logs",
	{
		id: text("id").primaryKey(),
		ownerUserId: text("owner_user_id").notNull(),
		action: text("action").notNull(), // unlocked, locked, file_accessed
		details: text("details"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
);

// Phase 5: Intelligence (Productivity & Analytics)
export const personalFocusSessions = personalSchema.table(
	"personal_focus_sessions",
	{
		id: text("id").primaryKey(),
		userId: text("user_id").notNull(),
		workspaceId: text("workspace_id").notNull(),
		projectId: text("project_id").references(() => personalProjects.id, {
			onDelete: "set null",
		}),
		taskId: text("task_id").references(() => personalTasks.id, {
			onDelete: "set null",
		}),
		startedAt: timestamp("started_at").notNull(),
		pausedAt: timestamp("paused_at"),
		resumedAt: timestamp("resumed_at"),
		finishedAt: timestamp("finished_at"),
		activeDuration: integer("active_duration").default(0).notNull(), // in seconds
		totalDuration: integer("total_duration").default(0).notNull(), // in seconds
		pausedDuration: integer("paused_duration").default(0).notNull(), // in seconds
		status: text("status").default("IDLE").notNull(), // IDLE, RUNNING, PAUSED, COMPLETED, CANCELLED
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
);

export const personalTimeEntries = personalSchema.table(
	"personal_time_entries",
	{
		id: text("id").primaryKey(),
		ownerUserId: text("owner_user_id").notNull(),
		category: text("category").notNull(), // Work, Learning, Personal
		durationMinutes: integer("duration_minutes").notNull(),
		date: timestamp("date").defaultNow().notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
);

export const personalDailyScores = personalSchema.table(
	"personal_daily_scores",
	{
		id: text("id").primaryKey(),
		ownerUserId: text("owner_user_id").notNull(),
		date: text("date").notNull(), // YYYY-MM-DD
		score: integer("score").default(0),
		tasksCompleted: integer("tasks_completed").default(0),
		focusMinutes: integer("focus_minutes").default(0),
		habitsCompleted: integer("habits_completed").default(0),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
);

// Phase 6-8: Assistant, Integrations, Settings
export const assistantConversations = personalSchema.table(
	"assistant_conversations",
	{
		id: text("id").primaryKey(),
		ownerUserId: text("owner_user_id").notNull(),
		title: text("title").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
);

export const assistantMessages = personalSchema.table("assistant_messages", {
	id: text("id").primaryKey(),
	conversationId: text("conversation_id")
		.notNull()
		.references(() => assistantConversations.id, { onDelete: "cascade" }),
	role: text("role").notNull(), // user, assistant, tool
	content: text("content"),
	toolCalls: jsonb("tool_calls"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const assistantMemory = personalSchema.table("assistant_memory", {
	id: text("id").primaryKey(),
	ownerUserId: text("owner_user_id").notNull(),
	preferenceKey: text("preference_key").notNull(),
	preferenceValue: text("preference_value").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const integrationAccounts = personalSchema.table(
	"integration_accounts",
	{
		id: text("id").primaryKey(),
		ownerUserId: text("owner_user_id").notNull(),
		provider: text("provider").notNull(), // GoogleCalendar, GitHub, RSS
		integrationType: text("integration_type"), // Calendar, VersionControl, Feed
		accountId: text("account_id"),
		accountName: text("account_name"),
		status: text("status").default("Connected"),
		accessToken: text("access_token"), // Encrypted now
		refreshToken: text("refresh_token"), // Encrypted now
		tokenExpiresAt: timestamp("token_expires_at"),
		permissions: jsonb("permissions").default([]),
		metadata: jsonb("metadata"),
		lastSyncAt: timestamp("last_sync_at"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
);

export const userSettings = personalSchema.table("user_settings", {
	id: text("id").primaryKey(),
	ownerUserId: text("owner_user_id").notNull().unique(),
	preferences: jsonb("preferences").default({}), // JSON blob for everything
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const integrationGoogleCalendars = personalSchema.table(
	"integration_google_calendars",
	{
		id: text("id").primaryKey(),
		accountId: text("account_id")
			.notNull()
			.references(() => integrationAccounts.id, { onDelete: "cascade" }),
		calendarId: text("calendar_id").notNull(),
		summary: text("summary").notNull(),
		timeZone: text("time_zone"),
		backgroundColor: text("background_color"),
		isSelected: boolean("is_selected").default(true),
		lastSyncAt: timestamp("last_sync_at"),
	},
);

export const integrationGoogleCalendarEvents = personalSchema.table(
	"integration_google_calendar_events",
	{
		id: text("id").primaryKey(),
		calendarId: text("calendar_id")
			.notNull()
			.references(() => integrationGoogleCalendars.id, { onDelete: "cascade" }),
		providerEventId: text("provider_event_id").notNull(),
		title: text("title").notNull(),
		description: text("description"),
		startTime: timestamp("start_time"),
		endTime: timestamp("end_time"),
		timeZone: text("time_zone"),
		location: text("location"),
		status: text("status"),
		organizer: text("organizer"),
		eventUrl: text("event_url"),
		providerCreatedAt: timestamp("provider_created_at"),
		providerUpdatedAt: timestamp("provider_updated_at"),
	},
);

export const integrationGithubRepos = personalSchema.table(
	"integration_github_repos",
	{
		id: text("id").primaryKey(),
		accountId: text("account_id")
			.notNull()
			.references(() => integrationAccounts.id, { onDelete: "cascade" }),
		repoId: integer("repo_id").notNull(),
		name: text("name").notNull(),
		fullName: text("full_name").notNull(),
		description: text("description"),
		htmlUrl: text("html_url"),
		language: text("language"),
		stargazersCount: integer("stargazers_count"),
		isSelected: boolean("is_selected").default(true),
		lastSyncAt: timestamp("last_sync_at"),
	},
);

export const integrationGithubIssues = personalSchema.table(
	"integration_github_issues",
	{
		id: text("id").primaryKey(),
		repoId: text("repo_id")
			.notNull()
			.references(() => integrationGithubRepos.id, { onDelete: "cascade" }),
		providerIssueId: integer("provider_issue_id").notNull(),
		number: integer("number").notNull(),
		title: text("title").notNull(),
		state: text("state"),
		htmlUrl: text("html_url"),
		isPullRequest: boolean("is_pull_request").default(false),
		providerCreatedAt: timestamp("provider_created_at"),
		providerUpdatedAt: timestamp("provider_updated_at"),
	},
);

export const integrationRssFeeds = personalSchema.table(
	"integration_rss_feeds",
	{
		id: text("id").primaryKey(),
		accountId: text("account_id")
			.notNull()
			.references(() => integrationAccounts.id, { onDelete: "cascade" }),
		feedUrl: text("feed_url").notNull(),
		title: text("title"),
		description: text("description"),
		siteUrl: text("site_url"),
		imageUrl: text("image_url"),
		category: text("category"),
		isActive: boolean("is_active").default(true),
		lastSyncAt: timestamp("last_sync_at"),
	},
);

export const integrationRssArticles = personalSchema.table(
	"integration_rss_articles",
	{
		id: text("id").primaryKey(),
		feedId: text("feed_id")
			.notNull()
			.references(() => integrationRssFeeds.id, { onDelete: "cascade" }),
		guid: text("guid").notNull(),
		title: text("title").notNull(),
		summary: text("summary"),
		content: text("content"),
		link: text("link"),
		author: text("author"),
		pubDate: timestamp("pub_date"),
		isRead: boolean("is_read").default(false),
		isSaved: boolean("is_saved").default(false),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
);

// Phase 9: Daily Motivation System
export const personalDailyMotivations = personalSchema.table(
	"personal_daily_motivations",
	{
		id: text("id").primaryKey(),
		ownerUserId: text("owner_user_id").notNull(),
		text: text("text").notNull(),
		date: text("date").notNull(), // YYYY-MM-DD local time string
		isHidden: boolean("is_hidden").default(false).notNull(),
		isSaved: boolean("is_saved").default(false).notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
);

import { relations } from "drizzle-orm";

export const personalProjectsRelations = relations(
	personalProjects,
	({ many }) => ({
		tasks: many(personalTasks),
		milestones: many(personalMilestones),
	}),
);

export const personalTasksRelations = relations(personalTasks, ({ one }) => ({
	project: one(personalProjects, {
		fields: [personalTasks.projectId],
		references: [personalProjects.id],
	}),
	milestone: one(personalMilestones, {
		fields: [personalTasks.milestoneId],
		references: [personalMilestones.id],
	}),
}));

export const personalMilestonesRelations = relations(
	personalMilestones,
	({ one, many }) => ({
		project: one(personalProjects, {
			fields: [personalMilestones.projectId],
			references: [personalProjects.id],
		}),
		tasks: many(personalTasks),
	}),
);

// Personal Project Features
export const personalFeatures = personalSchema.table("personal_features", {
	id: text("id").primaryKey(),
	projectId: text("project_id")
		.notNull()
		.references(() => personalProjects.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	description: text("description"),
	priority: text("priority").default("MEDIUM").notNull(), // LOW, MEDIUM, HIGH, CRITICAL
	status: text("status").default("PLANNED").notNull(), // PLANNED, IN_PROGRESS, COMPLETED, BLOCKED
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Personal Project Requirements
export const personalRequirements = personalSchema.table(
	"personal_requirements",
	{
		id: text("id").primaryKey(),
		projectId: text("project_id")
			.notNull()
			.references(() => personalProjects.id, { onDelete: "cascade" }),
		title: text("title").notNull(),
		description: text("description"),
		category: text("category").default("Functional").notNull(), // Business Objective, Functional, Non-functional, Constraint, Risk, Acceptance Criteria
		status: text("status").default("PLANNED").notNull(), // PLANNED, IN_PROGRESS, SUBMITTED, UNDER_REVIEW, VERIFIED, REJECTED
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
);

// Personal Prompt Library
export const personalPromptLibrary = personalSchema.table(
	"personal_prompt_library",
	{
		id: text("id").primaryKey(),
		ownerUserId: text("owner_user_id").notNull(),
		name: text("name").notNull(),
		description: text("description"),
		category: text("category").default("Custom").notNull(), // Projects, Tasks, PRD, TRD, Workflow, Documents, Reports, Development, Planning, Productivity, Custom
		body: text("body").notNull(),
		variables: jsonb("variables").default([]), // Array of { key: string, label: string, defaultValue?: string }
		tags: jsonb("tags").default([]),
		isFavorite: boolean("is_favorite").default(false).notNull(),
		isSystem: boolean("is_system").default(false).notNull(), // Built-in prompts
		usageCount: integer("usage_count").default(0).notNull(),
		lastUsedAt: timestamp("last_used_at"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
);

// Personal Task Submissions
export const personalTaskSubmissions = personalSchema.table(
	"personal_task_submissions",
	{
		id: text("id").primaryKey(),
		taskId: text("task_id")
			.notNull()
			.references(() => personalTasks.id, { onDelete: "cascade" }),
		ownerUserId: text("owner_user_id").notNull(),
		content: text("content"),
		githubPrUrl: text("github_pr_url"),
		attachments: jsonb("attachments").default([]),
		notes: text("notes"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
);
