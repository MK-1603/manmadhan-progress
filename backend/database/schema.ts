import { relations } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	json,
	jsonb,
	pgTable,
	text,
	timestamp,
} from "drizzle-orm/pg-core";

// 1. Users Table
export const users = pgTable("users", {
	id: text("id").primaryKey(),
	email: text("email").notNull().unique(),
	name: text("name").notNull(),
	displayName: text("display_name"),
	passwordHash: text("password_hash"),
	timezone: text("timezone").default("UTC"),
	language: text("language").default("en"),
	dateFormat: text("date_format").default("MM/DD/YYYY"),
	timeFormat: text("time_format").default("12h"),
	batchNumber: text("batch_number"),
	avatar: text("avatar"),
	googleId: text("google_id").unique(),
	role: text("role").default("user").notNull(), // CEO, CO-CEO, MEMBER
	status: text("status").default("Created").notNull(), // Created, Invitation Sent, Activated, Suspended, Locked, Disabled, Deleted
	isVerified: boolean("is_verified").default(false).notNull(),
	isGoogleEnabled: boolean("is_google_enabled").default(false).notNull(),
	firstLoginCompleted: boolean("first_login_completed").default(false).notNull(),
	onboardingStatus: text("onboarding_status").default("FIRST_LOGIN_REQUIRED").notNull(),
	isOtpEnabled: boolean("is_otp_enabled").default(false).notNull(),
	isInvited: boolean("is_invited").default(false).notNull(),
	systemOwner: boolean("system_owner").default(false).notNull(),
	employeeId: text("employee_id"),
	managerId: text("manager_id").references((): any => users.id, {
		onDelete: "set null",
	}),
	lastLoginAt: timestamp("last_login_at"),
	lastActiveAt: timestamp("last_active_at"),
	lastInactivityNotificationAt: timestamp("last_inactivity_notification_at"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 1.01 Recovery Codes Table
export const recoveryCodes = pgTable(
	"recovery_codes",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		codeHash: text("code_hash").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		usedAt: timestamp("used_at"),
		revokedAt: timestamp("revoked_at"),
	},
	(table) => ({
		userIdIdx: index("recovery_codes_user_id_idx").on(table.userId),
	}),
);

// 1.1 Workspaces Table
export const workspaces = pgTable("workspaces", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	shortName: text("short_name"),
	batchNumber: text("batch_number"),
	description: text("description"),
	logoUrl: text("logo_url"),
	website: text("website"),
	contactEmail: text("contact_email"),
	type: text("type").default("personal").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 1.2 Workspace Members Table
export const workspaceMembers = pgTable("workspace_members", {
	id: text("id").primaryKey(),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id, { onDelete: "cascade" }),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	role: text("role").default("MEMBER").notNull(),
	permissions: json("permissions").$type<string[]>(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 1.3 OTP Codes Table
export const otpCodes = pgTable("otp_codes", {
	id: text("id").primaryKey(),
	email: text("email").notNull(),
	otpHash: text("otp_hash").notNull(),
	attempts: integer("attempts").default(0).notNull(),
	used: boolean("used").default(false).notNull(),
	resendCount: integer("resend_count").default(0).notNull(),
	lastResentAt: timestamp("last_resent_at"),
	expiresAt: timestamp("expires_at").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 1.4 Device Sessions Table
export const deviceSessions = pgTable("device_sessions", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	deviceId: text("device_id").notNull(),
	deviceName: text("device_name"),
	browser: text("browser"),
	os: text("os"),
	ipAddress: text("ip_address"),
	location: text("location"),
	isRevoked: boolean("is_revoked").default(false).notNull(),
	loginTime: timestamp("login_time").defaultNow().notNull(),
	lastActive: timestamp("last_active").defaultNow().notNull(),
});

// 1.5 Audit Logs Table
export const auditLogs = pgTable("audit_logs", {
	id: text("id").primaryKey(),
	userId: text("user_id").references(() => users.id, { onDelete: "set null" }), // Can be null if failed login
	workspaceId: text("workspace_id").references(() => workspaces.id, {
		onDelete: "cascade",
	}),
	eventType: text("event_type").notNull(),
	details: text("details"),
	ipAddress: text("ip_address"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 1.6 Invitations Table
export const invitations = pgTable("invitations", {
	id: text("id").primaryKey(),
	token: text("token").notNull().unique(),
	email: text("email").notNull(),
	role: text("role").notNull(),
	organizationId: text("organization_id").references(() => workspaces.id, {
		onDelete: "cascade",
	}),
	invitedById: text("invited_by_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	departmentId: text("department_id"), // Optional
	managerId: text("manager_id").references((): any => users.id, {
		onDelete: "set null",
	}),
	batchNumber: text("batch_number"),
	employeeId: text("employee_id"),
	message: text("message"),
	permissions: json("permissions").$type<string[]>(),
	status: text("status").default("Pending").notNull(), // Draft, Pending, Queued, Sending, Delivered, Opened, Clicked, Accepted, OTP Verified, Password Created, Profile Completed, Workspace Assigned, Activated, Completed, Expired, Cancelled, Rejected, Failed, Revoked, Bounced

	// Email Tracking & Lifecycle
	smtpResponse: text("smtp_response"),
	providerMessageId: text("provider_message_id"),
	emailDeliveryTime: timestamp("email_delivery_time"),
	emailOpenTime: timestamp("email_open_time"),
	emailClickTime: timestamp("email_click_time"),

	otpVerifiedAt: timestamp("otp_verified_at"),
	passwordCreatedAt: timestamp("password_created_at"),
	profileCompletedAt: timestamp("profile_completed_at"),
	workspaceAssignedAt: timestamp("workspace_assigned_at"),
	activatedAt: timestamp("activated_at"),

	expiresAt: timestamp("expires_at").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 1.7 Push Subscriptions Table
export const pushSubscriptions = pgTable("push_subscriptions", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	endpoint: text("endpoint").notNull(),
	p256dh: text("p256dh").notNull(),
	auth: text("auth").notNull(),
	userAgent: text("user_agent"),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 1.8 Password History Table
export const passwordHistory = pgTable("password_history", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	passwordHash: text("password_hash").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 2. Media Assets Table
export const mediaAssets = pgTable("media_assets", {
	id: text("id").primaryKey(),
	publicId: text("public_id").notNull(),
	url: text("url").notNull(),
	sizeFormatted: text("size_formatted"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 3. Notification Logs Table
export const notificationLogs = pgTable("notification_logs", {
	id: text("id").primaryKey(),
	title: text("title").notNull(),
	body: text("body").notNull(),
	recipient: text("recipient"),
	status: text("status").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 4. AI Conversations Table
export const aiConversations = pgTable("ai_conversations", {
	id: text("id").primaryKey(),
	provider: text("provider").notNull(),
	model: text("model").notNull(),
	prompt: text("prompt").notNull(),
	response: text("response").notNull(),
	executionTimeMs: integer("execution_time_ms"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- ENTERPRISE UPGRADE v2.0 TABLES ---

// 5. Departments
export const departments = pgTable("departments", {
	id: text("id").primaryKey(),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	managerId: text("manager_id").references(() => users.id, {
		onDelete: "set null",
	}),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 6. Projects
export const projects = pgTable("projects", {
	id: text("id").primaryKey(),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id, { onDelete: "cascade" }),
	departmentId: text("department_id").references(() => departments.id, {
		onDelete: "set null",
	}),
	name: text("name").notNull(),
	slug: text("slug"),
	type: text("type").default("PERSONAL").notNull(), // PERSONAL, ORGANIZATION
	category: text("category"),
	description: text("description"),
	objective: text("objective"),
	status: text("status").default("PLANNING").notNull(), // DRAFT, PLANNING, READY, ACTIVE, ON_HOLD, AT_RISK, COMPLETED, CANCELLED, ARCHIVED
	priority: text("priority").default("MEDIUM").notNull(), // LOW, MEDIUM, HIGH, CRITICAL
	progress: integer("progress").default(0).notNull(),
	health: text("health").default("HEALTHY").notNull(), // HEALTHY, AT_RISK, BLOCKED, OFF_TRACK, COMPLETED
	riskLevel: text("risk_level").default("LOW"),
	startDate: timestamp("start_date"),
	deadline: timestamp("deadline"),
	scope: jsonb("scope").default([]),
	outOfScope: jsonb("out_of_scope").default([]),
	goalId: text("goal_id").references((): any => goals.id, {
		onDelete: "set null",
	}),
	tags: jsonb("tags").default([]),
	plan: jsonb("plan"),
	projectPlanStatus: text("project_plan_status").default("PENDING").notNull(), // PENDING, ACCEPTED, CHANGES_REQUESTED
	ownerId: text("owner_id")
		.notNull()
		.references(() => users.id),
	executionLeadId: text("execution_lead_id").references(() => users.id, {
		onDelete: "set null",
	}),
	createdBy: text("created_by").references(() => users.id),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
	completedAt: timestamp("completed_at"),
	archivedAt: timestamp("archived_at"),
});

// 6.0.1 Project Members
export const projectMembers = pgTable("project_members", {
	id: text("id").primaryKey(),
	projectId: text("project_id")
		.notNull()
		.references(() => projects.id, { onDelete: "cascade" }),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	role: text("role").default("MEMBER").notNull(), // OWNER, EXECUTION_LEAD, MEMBER
	status: text("status").default("INVITED").notNull(), // INVITED, ACCEPTED, DECLINED
	assignedById: text("assigned_by_id").references(() => users.id, { onDelete: "set null" }),
	assignedAt: timestamp("assigned_at").defaultNow().notNull(),
});

// 6.0.2 Project Work Packages
export const projectWork = pgTable("project_work", {
	id: text("id").primaryKey(),
	projectId: text("project_id")
		.notNull()
		.references(() => projects.id, { onDelete: "cascade" }),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id, { onDelete: "cascade" }),
	title: text("title").notNull(),
	description: text("description"),
	category: text("category").default("Development").notNull(),
	status: text("status").default("Draft").notNull(), // Draft, Active, Blocked, Completed
	ownerId: text("owner_id").references(() => users.id, { onDelete: "set null" }),
	milestoneId: text("milestone_id").references(() => milestones.id, { onDelete: "set null" }),
	startDate: timestamp("start_date"),
	deadline: timestamp("deadline"),
	deliverable: text("deliverable"),
	createdById: text("created_by_id").references(() => users.id, { onDelete: "set null" }),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 6.1 Milestones
export const milestones = pgTable("milestones", {
	id: text("id").primaryKey(),
	projectId: text("project_id")
		.notNull()
		.references(() => projects.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	description: text("description"),
	deadline: timestamp("deadline"),
	status: text("status").default("Pending").notNull(), // Pending, Active, Completed, Cancelled
	order: integer("order").default(0),
	ownerId: text("owner_id").references(() => users.id, {
		onDelete: "set null",
	}),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	completedAt: timestamp("completed_at"),
});

// 6.2 Project Requirements
export const projectRequirements = pgTable("project_requirements", {
	id: text("id").primaryKey(),
	projectId: text("project_id")
		.notNull()
		.references(() => projects.id, { onDelete: "cascade" }),
	title: text("title").notNull(),
	description: text("description"),
	category: text("category").default("Functional").notNull(), // Business Objective, Functional, Non-functional, Constraint, Risk, Acceptance Criteria
	status: text("status").default("Draft").notNull(), // Draft, Approved, Needs Revision
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 6.3 Project Documents Checklist
export const projectDocuments = pgTable("project_documents", {
	id: text("id").primaryKey(),
	projectId: text("project_id")
		.notNull()
		.references(() => projects.id, { onDelete: "cascade" }),
	docType: text("doc_type").notNull(), // PRD, TRD, Application Workflow, User Manual, GitHub, Requirement Verification, Technical Review, Execution Review, Final Verification, Other
	title: text("title").notNull(),
	url: text("url"),
	status: text("status").default("Required").notNull(), // Required, Uploaded, Under Review, Approved, Needs Revision
	uploadedById: text("uploaded_by_id").references(() => users.id, {
		onDelete: "set null",
	}),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 6.4 Project Roadmaps
export const projectRoadmaps = pgTable("project_roadmaps", {
	id: text("id").primaryKey(),
	projectId: text("project_id")
		.notNull()
		.references(() => projects.id, { onDelete: "cascade" }),
	title: text("title").notNull(),
	description: text("description"),
	phase: text("phase"),
	startDate: timestamp("start_date"),
	deadline: timestamp("deadline"),
	status: text("status").default("Planning").notNull(),
	order: integer("order").default(0),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 6.5 Project Features
export const projectFeatures = pgTable("project_features", {
	id: text("id").primaryKey(),
	projectId: text("project_id")
		.notNull()
		.references(() => projects.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	description: text("description"),
	priority: text("priority").default("MEDIUM").notNull(), // LOW, MEDIUM, HIGH, CRITICAL
	status: text("status").default("PLANNED").notNull(), // PLANNED, IN_PROGRESS, COMPLETED, CANCELLED
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 6.6 Project GitHub Integration
export const projectGithub = pgTable("project_github", {
	id: text("id").primaryKey(),
	projectId: text("project_id")
		.notNull()
		.references(() => projects.id, { onDelete: "cascade" }),
	repositoryUrl: text("repository_url").notNull(),
	owner: text("owner"),
	repoName: text("repo_name"),
	defaultBranch: text("default_branch").default("main").notNull(),
	status: text("status").default("Connected").notNull(), // Connected, Disconnected, Error
	connectedById: text("connected_by_id").references(() => users.id, {
		onDelete: "set null",
	}),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 6.7 Project Submissions
export const projectSubmissions = pgTable("project_submissions", {
	id: text("id").primaryKey(),
	projectId: text("project_id")
		.notNull()
		.references(() => projects.id, { onDelete: "cascade" }),
	workspaceId: text("workspace_id").notNull(),
	title: text("title").notNull(),
	description: text("description").notNull(),
	submittedBy: text("submitted_by").notNull(),
	submittedRole: text("submitted_role").default("CO-CEO"),
	status: text("status").default("Under Review").notNull(), // Under Review, Approved, Changes Requested, Rejected
	fileUrl: text("file_url"),
	fileName: text("file_name"),
	fileSize: integer("file_size"),
	deploymentUrl: text("deployment_url"),
	applicationUrl: text("application_url"),
	repositoryUrl: text("repository_url"),
	versionTag: text("version_tag"),
	reviewerNotes: text("reviewer_notes"),
	reviewedBy: text("reviewed_by"),
	reviewedAt: timestamp("reviewed_at"),
	submittedAt: timestamp("submitted_at").defaultNow().notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 7. Tasks
export const tasks = pgTable(
	"tasks",
	{
		id: text("id").primaryKey(),
		projectId: text("project_id").references(() => projects.id, {
			onDelete: "cascade",
		}),
		workspaceId: text("workspace_id")
			.notNull()
			.references(() => workspaces.id, { onDelete: "cascade" }),
		featureId: text("feature_id").references(() => projectFeatures.id, {
			onDelete: "set null",
		}),
		title: text("title").notNull(),
		description: text("description"),
		status: text("status").default("Draft").notNull(), // Draft, Assigned, Accepted, In Progress, Blocked, Review, Approved, Completed, Archived
		priority: text("priority").default("Medium").notNull(), // Low, Medium, High
		assigneeId: text("assignee_id").references(() => users.id, {
			onDelete: "set null",
		}),
		reviewerId: text("reviewer_id").references(() => users.id, {
			onDelete: "set null",
		}),
		deadline: timestamp("deadline"),
		submittedAt: timestamp("submitted_at"),
		approvedAt: timestamp("approved_at"),
		completedAt: timestamp("completed_at"),
		rejectionFeedback: text("rejection_feedback"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		goalId: text("goal_id").references((): any => goals.id, {
			onDelete: "set null",
		}),
		parentTaskId: text("parent_task_id").references((): any => tasks.id, {
			onDelete: "cascade",
		}),
		estimatedMinutes: integer("estimated_minutes"),
		tags: jsonb("tags").default([]),
		archivedAt: timestamp("archived_at"),
		order: integer("order").default(0),
		type: text("type").default("Task"), // Task, Study, Development, Research, Meeting, Review, Other
		milestoneId: text("milestone_id").references(() => milestones.id, {
			onDelete: "set null",
		}),
		sourceType: text("source_type"), // REQUIREMENTS, MILESTONE, DEPENDENCY, ROADMAP, DOCUMENTATION
		sourceId: text("source_id"),
		requiresDocument: boolean("requires_document").default(false).notNull(),
		requiresGithub: boolean("requires_github").default(false).notNull(),
		githubPrUrl: text("github_pr_url"),
		githubCommitSha: text("github_commit_sha"),
		createdBy: text("created_by").references(() => users.id, {
			onDelete: "set null",
		}),
		startTime: timestamp("start_time"),
		endTime: timestamp("end_time"),
		approvalRequired: boolean("approval_required").default(false).notNull(),
		verificationRequired: boolean("verification_required")
			.default(false)
			.notNull(),
		deliverable: text("deliverable"),
		workId: text("work_id").references(() => projectWork.id, {
			onDelete: "set null",
		}),
	},
	(table) => ({
		idxTasksWorkspaceAssigneeStatus: index(
			"idx_tasks_workspace_assignee_status",
		).on(table.workspaceId, table.assigneeId, table.status),
		idxTasksWorkspaceProject: index("idx_tasks_workspace_project").on(
			table.workspaceId,
			table.projectId,
		),
		idxTasksAssigneeDeadline: index("idx_tasks_assignee_deadline").on(
			table.assigneeId,
			table.deadline,
		),
	}),
);

// 7.1 Task Dependencies
export const taskDependencies = pgTable("task_dependencies", {
	id: text("id").primaryKey(),
	taskId: text("task_id")
		.notNull()
		.references(() => tasks.id, { onDelete: "cascade" }),
	dependsOnTaskId: text("depends_on_task_id")
		.notNull()
		.references(() => tasks.id, { onDelete: "cascade" }),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 8. Password Resets
export const passwordResets = pgTable("password_resets", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	tokenHash: text("token_hash").notNull(),
	used: boolean("used").default(false).notNull(),
	expiresAt: timestamp("expires_at").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 9. Time Tracking (Timers)
export const timeTracking = pgTable("time_tracking", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id, { onDelete: "cascade" }),
	taskId: text("task_id").references(() => tasks.id, { onDelete: "set null" }),
	projectId: text("project_id").references(() => projects.id, {
		onDelete: "set null",
	}),
	sourceType: text("source_type").default("TASK").notNull(), // TASK, PROJECT, CEO_ACTIVITY
	title: text("title"),
	description: text("description"),
	category: text("category").default("Other"), // Strategy, Planning, Product, Technical, Architecture, Review, Approval, Documentation, Research, Organization, Other
	priority: text("priority").default("Medium"), // Low, Medium, High, Critical
	objective: text("objective"),
	estimatedDuration: integer("estimated_duration"), // in minutes
	status: text("status").default("Active").notNull(), // Active, Paused, Completed, Interrupted, SYSTEM_STOPPED
	startTime: timestamp("start_time").notNull(),
	pausedAt: timestamp("paused_at"),
	resumedAt: timestamp("resumed_at"),
	endTime: timestamp("end_time"),
	durationSeconds: integer("duration_seconds"),
	pausedDurationSeconds: integer("paused_duration_seconds").default(0),
	outcome: text("outcome"), // Completed, Partially Completed, Blocked, No Meaningful Progress
	notes: text("notes"),
	blockerType: text("blocker_type"), // Waiting for CO-CEO, Waiting for Member, Waiting for Approval, Missing Information, Technical Issue, External Dependency, Other
	blockerNote: text("blocker_note"),
	followUpTaskId: text("follow_up_task_id").references(() => tasks.id, {
		onDelete: "set null",
	}),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 9.1 Deadline Extensions
export const deadlineExtensions = pgTable("deadline_extensions", {
	id: text("id").primaryKey(),
	taskId: text("task_id")
		.notNull()
		.references(() => tasks.id, { onDelete: "cascade" }),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id, { onDelete: "cascade" }),
	reason: text("reason").notNull(),
	status: text("status").default("Pending").notNull(), // Pending, Approved, Rejected
	proposedDeadline: timestamp("proposed_deadline").notNull(),
	reviewerId: text("reviewer_id").references(() => users.id, {
		onDelete: "set null",
	}),
	reviewedAt: timestamp("reviewed_at"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 9.2 Score Ledger
export const scoreLedger = pgTable("score_ledger", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id, { onDelete: "cascade" }),
	taskId: text("task_id").references(() => tasks.id, { onDelete: "set null" }),
	projectId: text("project_id").references(() => projects.id, {
		onDelete: "set null",
	}),
	event: text("event").notNull(),
	points: integer("points").notNull(),
	reason: text("reason"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 10. Organization Spaces
export const spaces = pgTable("spaces", {
	id: text("id").primaryKey(),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	type: text("type").notNull(), // General, Leadership, Custom
	createdById: text("created_by_id")
		.notNull()
		.references(() => users.id),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 11. Space Documents / Announcements
export const spaceDocuments = pgTable("space_documents", {
	id: text("id").primaryKey(),
	spaceId: text("space_id")
		.notNull()
		.references(() => spaces.id, { onDelete: "cascade" }),
	title: text("title").notNull(),
	content: text("content"),
	authorId: text("author_id")
		.notNull()
		.references(() => users.id),
	isPinned: boolean("is_pinned").default(false).notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 12. Folders & Files
export const folders = pgTable("folders", {
	id: text("id").primaryKey(),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	parentId: text("parent_id"), // Self reference omitted for simplicity in Drizzle def
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const files = pgTable("files", {
	id: text("id").primaryKey(),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id, { onDelete: "cascade" }),
	folderId: text("folder_id").references(() => folders.id, {
		onDelete: "set null",
	}),
	name: text("name").notNull(),
	url: text("url").notNull(),
	size: integer("size"),
	uploadedById: text("uploaded_by_id")
		.notNull()
		.references(() => users.id),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 13. Workspace Settings (Execution Policy)
export const workspaceSettings = pgTable("workspace_settings", {
	id: text("id").primaryKey(),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id, { onDelete: "cascade" }),
	timezone: text("timezone").default("Asia/Kolkata").notNull(),
	allowAfterHoursWork: boolean("allow_after_hours_work")
		.default(false)
		.notNull(),
	enforceWorkingHours: boolean("enforce_working_hours").default(true).notNull(),
	workingHoursStart: text("working_hours_start").default("04:00").notNull(),
	workingHoursEnd: text("working_hours_end").default("23:00").notNull(),
	blockTaskExecution: boolean("block_task_execution").default(true).notNull(),
	blockTaskSubmission: boolean("block_task_submission").default(true).notNull(),
	blockProjectSubmission: boolean("block_project_submission").default(true).notNull(),
	blockApprovalActions: boolean("block_approval_actions").default(true).notNull(),
	blockTimerTracking: boolean("block_timer_tracking").default(true).notNull(),
	deadlinePolicy: text("deadline_policy").default("preserve_calendar").notNull(),
	notifyBeforeEnd: boolean("notify_before_end").default(true).notNull(),
	notifyBeforeEndMinutes: integer("notify_before_end_minutes").default(15).notNull(),
	notifyRestrictedStart: boolean("notify_restricted_start").default(true).notNull(),
	notifyOperationalStart: boolean("notify_operational_start").default(true).notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 13b. Organization Weekly Schedules
export const organizationWeeklySchedules = pgTable("organization_weekly_schedules", {
	id: text("id").primaryKey(),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id, { onDelete: "cascade" }),
	dayOfWeek: integer("day_of_week").notNull(),
	isWorkingDay: boolean("is_working_day").default(true).notNull(),
	startTime: text("start_time").default("04:00").notNull(),
	endTime: text("end_time").default("23:00").notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 13c. Organization Schedule Exceptions & Holidays
export const organizationScheduleExceptions = pgTable("organization_schedule_exceptions", {
	id: text("id").primaryKey(),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id, { onDelete: "cascade" }),
	date: text("date").notNull(),
	reason: text("reason").notNull(),
	exceptionType: text("exception_type").default("CLOSED").notNull(),
	isClosed: boolean("is_closed").default(true).notNull(),
	startTime: text("start_time"),
	endTime: text("end_time"),
	createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 13d. Organization Emergency Overrides
export const organizationEmergencyOverrides = pgTable("organization_emergency_overrides", {
	id: text("id").primaryKey(),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id, { onDelete: "cascade" }),
	activatedBy: text("activated_by").notNull().references(() => users.id, { onDelete: "cascade" }),
	reason: text("reason").notNull(),
	durationMinutes: integer("duration_minutes").default(60).notNull(),
	startTime: timestamp("start_time").defaultNow().notNull(),
	endTime: timestamp("end_time").notNull(),
	allowedActions: jsonb("allowed_actions").$type<string[]>().notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 13e. Organization Policy Audit History
export const organizationPolicyHistory = pgTable("organization_policy_history", {
	id: text("id").primaryKey(),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id, { onDelete: "cascade" }),
	changedBy: text("changed_by").notNull().references(() => users.id, { onDelete: "cascade" }),
	changeType: text("change_type").notNull(),
	beforeState: jsonb("before_state"),
	afterState: jsonb("after_state"),
	reason: text("reason"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 14. Notifications
export const notifications = pgTable("notifications", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	workspaceId: text("workspace_id").references(() => workspaces.id, {
		onDelete: "cascade",
	}),
	title: text("title").notNull(),
	message: text("message").notNull(),
	type: text("type").notNull(),
	priority: text("priority").default("Low").notNull(),
	isRead: boolean("is_read").default(false).notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 15. AI Context
export const aiContext = pgTable("ai_context", {
	id: text("id").primaryKey(),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id, { onDelete: "cascade" }),
	userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
	content: text("content").notNull(),
	type: text("type").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- NEW TABLES FOR PHASE 1 ---

// 16. Attendance
export const attendance = pgTable("attendance", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id, { onDelete: "cascade" }),
	date: timestamp("date").notNull(),
	checkInTime: timestamp("check_in_time"),
	checkOutTime: timestamp("check_out_time"),
	status: text("status").default("Present").notNull(), // Present, Absent, Half-Day, Late
	notes: text("notes"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 17. Leaves
export const leaves = pgTable("leaves", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id, { onDelete: "cascade" }),
	type: text("type").notNull(), // Sick, Casual, Annual
	startDate: timestamp("start_date").notNull(),
	endDate: timestamp("end_date").notNull(),
	reason: text("reason"),
	status: text("status").default("Pending").notNull(), // Pending, Approved, Rejected
	approvedById: text("approved_by_id").references(() => users.id, {
		onDelete: "set null",
	}),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const leaveBalances = pgTable("leave_balances", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id, { onDelete: "cascade" }),
	sickLeaveTotal: integer("sick_leave_total").default(12).notNull(),
	sickLeaveUsed: integer("sick_leave_used").default(0).notNull(),
	casualLeaveTotal: integer("casual_leave_total").default(12).notNull(),
	casualLeaveUsed: integer("casual_leave_used").default(0).notNull(),
	annualLeaveTotal: integer("annual_leave_total").default(20).notNull(),
	annualLeaveUsed: integer("annual_leave_used").default(0).notNull(),
	year: integer("year").notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 18. Progress Updates
export const progressUpdates = pgTable("progress_updates", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id, { onDelete: "cascade" }),
	projectId: text("project_id").references(() => projects.id, {
		onDelete: "cascade",
	}),
	taskId: text("task_id").references(() => tasks.id, { onDelete: "cascade" }),
	content: text("content").notNull(),
	type: text("type").default("Daily").notNull(), // Daily, Weekly, Monthly
	mood: text("mood"), // Productivity rating
	blockers: text("blockers"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 19. Task Assignments (Many-to-Many)
export const taskAssignments = pgTable("task_assignments", {
	id: text("id").primaryKey(),
	taskId: text("task_id")
		.notNull()
		.references(() => tasks.id, { onDelete: "cascade" }),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	role: text("role").default("Assignee").notNull(), // Assignee, Reviewer, Watcher
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 19.1 Task Assignment Tracker (Acceptance Workflow)
export const taskAssignmentTracker = pgTable("task_assignment_tracker", {
	id: text("id").primaryKey(),
	taskId: text("task_id")
		.notNull()
		.references(() => tasks.id, { onDelete: "cascade" }),
	assigneeId: text("assignee_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	assignedById: text("assigned_by_id")
		.notNull()
		.references(() => users.id),
	assigneeRole: text("assignee_role").notNull(), // CO-CEO, MEMBER
	status: text("status").default("PENDING_ACCEPTANCE").notNull(), // PENDING_ACCEPTANCE, ACCEPTED, DECLINED, REASSIGNED, CANCELLED
	declineReason: text("decline_reason"),
	acceptedAt: timestamp("accepted_at"),
	declinedAt: timestamp("declined_at"),
	reassignedAt: timestamp("reassigned_at"),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id, { onDelete: "cascade" }),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 20. Comments
export const comments = pgTable("comments", {
	id: text("id").primaryKey(),
	authorId: text("author_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id, { onDelete: "cascade" }),
	entityType: text("entity_type").notNull(), // Task, Project, ProgressUpdate
	entityId: text("entity_id").notNull(),
	content: text("content").notNull(),
	parentId: text("parent_id"), // For threaded replies
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 21. Attachments
export const attachments = pgTable("attachments", {
	id: text("id").primaryKey(),
	uploadedById: text("uploaded_by_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id, { onDelete: "cascade" }),
	entityType: text("entity_type").notNull(), // Task, Project, Comment
	entityId: text("entity_id").notNull(),
	fileUrl: text("file_url").notNull(),
	fileName: text("file_name").notNull(),
	fileSize: integer("file_size"),
	mimeType: text("mime_type"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 22. Leaderboard Cache
export const leaderboardCache = pgTable("leaderboard_cache", {
	id: text("id").primaryKey(),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id, { onDelete: "cascade" }),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	period: text("period").notNull(), // Weekly, Monthly, AllTime
	score: integer("score").default(0).notNull(),
	tasksCompleted: integer("tasks_completed").default(0).notNull(),
	onTimeDeliveryRate: integer("on_time_delivery_rate").default(0).notNull(),
	rank: integer("rank"),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 23. Reports
export const reports = pgTable("reports", {
	id: text("id").primaryKey(),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id, { onDelete: "cascade" }),
	generatedById: text("generated_by_id").references(() => users.id, {
		onDelete: "set null",
	}),
	type: text("type").notNull(), // Performance, Workload, Attendance
	title: text("title").notNull(),
	data: json("data"), // Stores the aggregated report data
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 24. Announcements
export const announcements = pgTable("announcements", {
	id: text("id").primaryKey(),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id, { onDelete: "cascade" }),
	authorId: text("author_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	title: text("title").notNull(),
	content: text("content").notNull(),
	priority: text("priority").default("Normal").notNull(),
	isPublished: boolean("is_published").default(true).notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 25. Chat Messages (For Real-time Comm)
export const chatMessages = pgTable("chat_messages", {
	id: text("id").primaryKey(),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id, { onDelete: "cascade" }),
	senderId: text("sender_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	channelId: text("channel_id").notNull(), // Generic channel identifier
	content: text("content").notNull(),
	isRead: boolean("is_read").default(false).notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- NEW TABLES FOR PERSONAL DASHBOARD ---

// 26. Goals
export const goals = pgTable("goals", {
	id: text("id").primaryKey(),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id, { onDelete: "cascade" }),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	title: text("title").notNull(),
	description: text("description"),
	status: text("status").default("Active").notNull(), // Active, Completed, Paused, Archived
	progress: integer("progress").default(0).notNull(),
	deadline: timestamp("deadline"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 27. Habits
export const habits = pgTable("habits", {
	id: text("id").primaryKey(),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id, { onDelete: "cascade" }),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	title: text("title").notNull(),
	description: text("description"),
	frequency: text("frequency").default("Daily").notNull(), // Daily, Weekly
	streak: integer("streak").default(0).notNull(),
	lastCompletedAt: timestamp("last_completed_at"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 28. Reminders
export const reminders = pgTable("reminders", {
	id: text("id").primaryKey(),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id, { onDelete: "cascade" }),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	taskId: text("task_id").references((): any => tasks.id, {
		onDelete: "cascade",
	}),
	title: text("title").notNull(),
	remindAt: timestamp("remind_at").notNull(),
	isCompleted: boolean("is_completed").default(false).notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 29. Ideas
export const ideas = pgTable("ideas", {
	id: text("id").primaryKey(),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id, { onDelete: "cascade" }),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	title: text("title").notNull(),
	content: text("content"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 30. Notes (Personal)
export const notes = pgTable("notes", {
	id: text("id").primaryKey(),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id, { onDelete: "cascade" }),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	taskId: text("task_id").references((): any => tasks.id, {
		onDelete: "cascade",
	}),
	title: text("title").notNull(),
	content: text("content"),
	folderId: text("folder_id").references(() => folders.id, {
		onDelete: "set null",
	}),
	isPinned: boolean("is_pinned").default(false).notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 31. Journals
export const journals = pgTable("journals", {
	id: text("id").primaryKey(),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id, { onDelete: "cascade" }),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	content: text("content").notNull(),
	mood: text("mood"), // Productive, Happy, Muted, Stressed, etc.
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 32. Books and learning sessions
export const books = pgTable("books", {
	id: text("id").primaryKey(),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id, { onDelete: "cascade" }),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	title: text("title").notNull(),
	author: text("author"),
	status: text("status").default("Want to Read").notNull(),
	totalPages: integer("total_pages"),
	currentPage: integer("current_page").default(0).notNull(),
	startedAt: timestamp("started_at"),
	targetDate: timestamp("target_date"),
	completedAt: timestamp("completed_at"),
	rating: integer("rating"),
	review: text("review"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const readingSessions = pgTable("reading_sessions", {
	id: text("id").primaryKey(),
	bookId: text("book_id")
		.notNull()
		.references(() => books.id, { onDelete: "cascade" }),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	startedAt: timestamp("started_at").notNull(),
	endedAt: timestamp("ended_at"),
	durationSeconds: integer("duration_seconds").default(0).notNull(),
	pagesStart: integer("pages_start").default(0).notNull(),
	pagesEnd: integer("pages_end").default(0).notNull(),
});

// 33. Podcasts and listening sessions
export const podcasts = pgTable("podcasts", {
	id: text("id").primaryKey(),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id, { onDelete: "cascade" }),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	title: text("title").notNull(),
	feedUrl: text("feed_url"),
	status: text("status").default("Saved").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const podcastEpisodes = pgTable("podcast_episodes", {
	id: text("id").primaryKey(),
	podcastId: text("podcast_id")
		.notNull()
		.references(() => podcasts.id, { onDelete: "cascade" }),
	title: text("title").notNull(),
	audioUrl: text("audio_url"),
	durationSeconds: integer("duration_seconds").default(0).notNull(),
	positionSeconds: integer("position_seconds").default(0).notNull(),
	lastListenedAt: timestamp("last_listened_at"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const listeningSessions = pgTable("listening_sessions", {
	id: text("id").primaryKey(),
	episodeId: text("episode_id")
		.notNull()
		.references(() => podcastEpisodes.id, { onDelete: "cascade" }),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	startedAt: timestamp("started_at").notNull(),
	endedAt: timestamp("ended_at"),
	durationSeconds: integer("duration_seconds").default(0).notNull(),
	positionStart: integer("position_start").default(0).notNull(),
	positionEnd: integer("position_end").default(0).notNull(),
});

// RELATIONS DEFINITIONS FOR DRIZZLE ORM QUERY ENGINE
export const tasksRelations = relations(tasks, ({ one }) => ({
	project: one(projects, {
		fields: [tasks.projectId],
		references: [projects.id],
	}),
	assignee: one(users, {
		fields: [tasks.assigneeId],
		references: [users.id],
	}),
	workspace: one(workspaces, {
		fields: [tasks.workspaceId],
		references: [workspaces.id],
	}),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
	workspace: one(workspaces, {
		fields: [projects.workspaceId],
		references: [workspaces.id],
	}),
	tasks: many(tasks),
	milestones: many(milestones),
}));

export const milestonesRelations = relations(milestones, ({ one }) => ({
	project: one(projects, {
		fields: [milestones.projectId],
		references: [projects.id],
	}),
}));

// --- PROJECT & TASK CREATION UPGRADE TABLES ---

export const successCriteria = pgTable("success_criteria", {
	id: text("id").primaryKey(),
	projectId: text("project_id")
		.notNull()
		.references(() => projects.id, { onDelete: "cascade" }),
	description: text("description").notNull(),
	isCompleted: boolean("is_completed").default(false).notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	completedAt: timestamp("completed_at"),
});

export const projectFiles = pgTable("project_files", {
	id: text("id").primaryKey(),
	projectId: text("project_id")
		.notNull()
		.references(() => projects.id, { onDelete: "cascade" }),
	fileId: text("file_id")
		.notNull()
		.references(() => files.id, { onDelete: "cascade" }),
	attachedById: text("attached_by_id")
		.notNull()
		.references(() => users.id),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const taskFiles = pgTable("task_files", {
	id: text("id").primaryKey(),
	taskId: text("task_id")
		.notNull()
		.references(() => tasks.id, { onDelete: "cascade" }),
	fileId: text("file_id")
		.notNull()
		.references(() => files.id, { onDelete: "cascade" }),
	attachedById: text("attached_by_id")
		.notNull()
		.references(() => users.id),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const activities = pgTable("activities", {
	id: text("id").primaryKey(),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id, { onDelete: "cascade" }),
	projectId: text("project_id").references(() => projects.id, {
		onDelete: "cascade",
	}),
	taskId: text("task_id").references(() => tasks.id, { onDelete: "cascade" }),
	milestoneId: text("milestone_id").references(() => milestones.id, {
		onDelete: "cascade",
	}),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	action: text("action").notNull(), // Project created, Task completed, File uploaded, etc.
	details: text("details"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Central Requests & Approvals System
export const centralRequests = pgTable("central_requests", {
	id: text("id").primaryKey(),
	workspaceId: text("workspace_id").references(() => workspaces.id, {
		onDelete: "cascade",
	}),
	requestType: text("request_type").notNull(), // PROJECT_ASSIGNMENT, PROJECT_CHANGE, TASK_APPROVAL, TASK_CHANGE, DOCUMENT_REVIEW, DEADLINE_CHANGE, LEAVE_REQUEST, POLICY_REQUEST, OTHER
	title: text("title").notNull(),
	description: text("description"),
	requesterId: text("requester_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	responsibleId: text("responsible_id").references(() => users.id, {
		onDelete: "set null",
	}),
	accountableId: text("accountable_id").references(() => users.id, {
		onDelete: "set null",
	}),
	approverId: text("approver_id").references(() => users.id, {
		onDelete: "set null",
	}),
	status: text("status").default("PENDING").notNull(), // PENDING, UNDER_REVIEW, APPROVED, CHANGES_REQUESTED, REJECTED, EXPIRED, CANCELLED
	priority: text("priority").default("Medium").notNull(), // Low, Medium, High, Urgent
	rejectionReason: text("rejection_reason"),
	comment: text("comment"),
	entityType: text("entity_type"), // PROJECT, TASK, DOCUMENT, LEAVE, EXTENSION, GITHUB
	entityId: text("entity_id"),
	metadata: jsonb("metadata").default({}),
	dueAt: timestamp("due_at"),
	openedAt: timestamp("opened_at"),
	decisionAt: timestamp("decision_at"),
	decisionActorId: text("decision_actor_id").references(() => users.id, {
		onDelete: "set null",
	}),
	slaStatus: text("sla_status").default("ON_TIME").notNull(), // ON_TIME, APPROACHING, OVERDUE
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Project Assignment Tracker
export const projectAssignments = pgTable("project_assignments", {
	id: text("id").primaryKey(),
	projectId: text("project_id")
		.notNull()
		.references(() => projects.id, { onDelete: "cascade" }),
	workspaceId: text("workspace_id").references(() => workspaces.id),
	createdByUserId: text("created_by_user_id")
		.notNull()
		.references(() => users.id),
	assignedToUserId: text("assigned_to_user_id")
		.notNull()
		.references(() => users.id),
	responsibleCoCeoId: text("responsible_co_ceo_id").references(() => users.id),
	assignmentType: text("assignment_type").default("CEO_TO_CO_CEO").notNull(), // CEO_TO_CO_CEO, CEO_TO_MEMBER, CO_CEO_TO_MEMBER
	status: text("status").default("PENDING_ACCEPTANCE").notNull(), // PENDING_ACCEPTANCE, ACCEPTED, DECLINED, REASSIGNED, CANCELLED
	rejectionReason: text("rejection_reason"),
	acceptedAt: timestamp("accepted_at"),
	declinedAt: timestamp("declined_at"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 7-Stage Project Milestones Engine V2
export const projectMilestonesV2 = pgTable("project_milestones_v2", {
	id: text("id").primaryKey(),
	projectId: text("project_id")
		.notNull()
		.references(() => projects.id, { onDelete: "cascade" }),
	stageNumber: integer("stage_number").notNull(), // 1 to 7
	milestoneCode: text("milestone_code").notNull(), // STAGE_01_ACTIVATION, STAGE_02_PRD, STAGE_03_TRD, STAGE_04_WORKFLOW, STAGE_05_UIUX, STAGE_06_DATABASE, STAGE_07_IMPLEMENTATION
	name: text("name").notNull(),
	description: text("description"),
	state: text("state").default("LOCKED").notNull(), // LOCKED, AVAILABLE, IN_PROGRESS, DRAFT, SUBMITTED, VALIDATING, UNDER_REVIEW, APPROVED, CHANGES_REQUESTED, REJECTED
	ownerUserId: text("owner_user_id").references(() => users.id),
	reviewerUserId: text("reviewer_user_id").references(() => users.id),
	approvedAt: timestamp("approved_at"),
	dependencies: jsonb("dependencies").default([]),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Project Documents Registry V2
export const projectDocumentsV2 = pgTable("project_documents_v2", {
	id: text("id").primaryKey(),
	projectId: text("project_id")
		.notNull()
		.references(() => projects.id, { onDelete: "cascade" }),
	milestoneId: text("milestone_id").references(() => projectMilestonesV2.id, {
		onDelete: "cascade",
	}),
	stageNumber: integer("stage_number").notNull(),
	documentType: text("document_type").notNull(), // ACTIVATION, PRD, TRD, WORKFLOW, UIUX_BRIEF, DATABASE_PLAN, IMPLEMENTATION_PLAN
	title: text("title").notNull(),
	category: text("category").default("Documents").notNull(), // Documents, Design Assets, Code / Builds, Evidence, Media, Other
	isRequired: boolean("is_required").default(true).notNull(),
	assignedToUserId: text("assigned_to_user_id").references(() => users.id),
	reviewerUserId: text("reviewer_user_id").references(() => users.id),
	dueDate: timestamp("due_date"),
	currentVersion: integer("current_version").default(1).notNull(),
	status: text("status").default("NOT_STARTED").notNull(), // NOT_STARTED, IN_PROGRESS, SUBMITTED, IN_REVIEW, CHANGES_REQUESTED, APPROVED, REJECTED
	wordCount: integer("word_count").default(0),
	sizeBytes: integer("size_bytes").default(0),
	fileUrl: text("file_url"),
	fileName: text("file_name"),
	mimeType: text("mime_type"),
	folderPath: text("folder_path").notNull(),
	createdById: text("created_by_id")
		.notNull()
		.references(() => users.id),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Document Version History
export const documentVersions = pgTable("document_versions", {
	id: text("id").primaryKey(),
	documentId: text("document_id")
		.notNull()
		.references(() => projectDocumentsV2.id, { onDelete: "cascade" }),
	versionNumber: integer("version_number").notNull(),
	content: text("content").default("").notNull(),
	fileName: text("file_name"),
	fileUrl: text("file_url"),
	mimeType: text("mime_type"),
	sizeBytes: integer("size_bytes").default(0).notNull(),
	storageReference: text("storage_reference"),
	status: text("status").default("SUBMITTED").notNull(), // SUBMITTED, IN_REVIEW, APPROVED, CHANGES_REQUESTED, REJECTED
	authorId: text("author_id")
		.notNull()
		.references(() => users.id),
	reviewedById: text("reviewed_by_id").references(() => users.id),
	reviewedAt: timestamp("reviewed_at"),
	reviewComment: text("review_comment"),
	wordCount: integer("word_count").default(0).notNull(),
	validationStatus: text("validation_status").default("PENDING").notNull(), // PENDING, PASSED, FAILED
	validationErrors: jsonb("validation_errors").default([]),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Active Work Sessions
export const workSessions = pgTable("work_sessions", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	taskId: text("task_id")
		.notNull()
		.references(() => tasks.id, { onDelete: "cascade" }),
	projectId: text("project_id").references(() => projects.id, {
		onDelete: "cascade",
	}),
	startedAt: timestamp("started_at").defaultNow().notNull(),
	pausedAt: timestamp("paused_at"),
	resumedAt: timestamp("resumed_at"),
	endedAt: timestamp("ended_at"),
	durationMinutes: integer("duration_minutes").default(0).notNull(),
	notes: text("notes"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Dual GitHub Account Connections
export const githubConnections = pgTable("github_connections", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	accountSlot: text("account_slot").notNull(), // ACCOUNT_A, ACCOUNT_B
	githubUserId: text("github_user_id").notNull(),
	username: text("username").notNull(),
	email: text("email"),
	avatarUrl: text("avatar_url"),
	accessTokenEncrypted: text("access_token_encrypted").notNull(),
	connectionStatus: text("connection_status").default("CONNECTED").notNull(), // CONNECTED, EXPIRED, DISCONNECTED, ERROR
	lastSyncAt: timestamp("last_sync_at"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Project GitHub Repository Bindings
export const githubProjectBindings = pgTable("github_project_bindings", {
	id: text("id").primaryKey(),
	projectId: text("project_id")
		.notNull()
		.references(() => projects.id, { onDelete: "cascade" }),
	githubConnectionId: text("github_connection_id")
		.notNull()
		.references(() => githubConnections.id, { onDelete: "cascade" }),
	repositoryId: text("repository_id").notNull(),
	repositoryName: text("repository_name").notNull(),
	repositoryOwner: text("repository_owner").notNull(),
	defaultBranch: text("default_branch").default("main").notNull(),
	isVerified: boolean("is_verified").default(false).notNull(),
	verificationError: text("verification_error"),
	lastSyncAt: timestamp("last_sync_at"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Daily Work Reports & Verification
export const dailyWorkReports = pgTable("daily_work_reports", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	workspaceId: text("workspace_id").references(() => workspaces.id, {
		onDelete: "cascade",
	}),
	date: text("date").notNull(), // YYYY-MM-DD
	scheduledMinutes: integer("scheduled_minutes").default(0).notNull(),
	actualMinutes: integer("actual_minutes").default(0).notNull(),
	tasksCompleted: integer("tasks_completed").default(0).notNull(),
	tasksPending: integer("tasks_pending").default(0).notNull(),
	tasksCarriedForward: integer("tasks_carried_forward").default(0).notNull(),
	documentsSubmitted: integer("documents_submitted").default(0).notNull(),
	githubCommitsCount: integer("github_commits_count").default(0).notNull(),
	verificationPercentage: integer("verification_percentage")
		.default(0)
		.notNull(),
	verificationStatus: text("verification_status")
		.default("COMPLETED")
		.notNull(),
	summary: jsonb("summary").default({}),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Organization Prompts & Prompt Library
export const organizationPrompts = pgTable("organization_prompts", {
	id: text("id").primaryKey(),
	workspaceId: text("workspace_id").references(() => workspaces.id, {
		onDelete: "cascade",
	}),
	createdByUserId: text("created_by_user_id").references(() => users.id, {
		onDelete: "set null",
	}),
	title: text("title").notNull(),
	description: text("description"),
	category: text("category").default("Projects").notNull(),
	content: text("content").notNull(),
	variables: jsonb("variables").default([]).notNull(),
	isBuiltin: boolean("is_builtin").default(false).notNull(),
	isFavorite: boolean("is_favorite").default(false).notNull(),
	usageCount: integer("usage_count").default(0).notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Real Automation Engine Tables
export const automations = pgTable("automations", {
	id: text("id").primaryKey(),
	workspaceId: text("workspace_id").references(() => workspaces.id, {
		onDelete: "cascade",
	}),
	createdByUserId: text("created_by_user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	description: text("description"),
	creationMode: text("creation_mode").default("PROMPT").notNull(), // PROMPT, VISUAL
	originalPrompt: text("original_prompt"),
	triggerType: text("trigger_type").notNull(),
	triggerConfig: jsonb("trigger_config").default({}).notNull(),
	conditionConfig: jsonb("condition_config").default({}).notNull(),
	actionType: text("action_type").notNull(),
	actionConfig: jsonb("action_config").default({}).notNull(),
	status: text("status").default("ACTIVE").notNull(), // DRAFT, ACTIVE, PAUSED, FAILED, COMPLETED, DISABLED
	requiresConfirmation: boolean("requires_confirmation").default(false).notNull(),
	lastRunAt: timestamp("last_run_at"),
	nextRunAt: timestamp("next_run_at"),
	runCount: integer("run_count").default(0).notNull(),
	failureCount: integer("failure_count").default(0).notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const automationLogs = pgTable("automation_logs", {
	id: text("id").primaryKey(),
	automationId: text("automation_id")
		.notNull()
		.references(() => automations.id, { onDelete: "cascade" }),
	workspaceId: text("workspace_id").references(() => workspaces.id, {
		onDelete: "cascade",
	}),
	userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
	status: text("status").notNull(), // COMPLETED, FAILED, SKIPPED, PENDING
	triggeredBy: text("triggered_by").notNull(),
	executionDetails: jsonb("execution_details").default({}).notNull(),
	errorMessage: text("error_message"),
	reason: text("reason"),
	executedAt: timestamp("executed_at").defaultNow().notNull(),
});

// Command Sessions Table
export const commandSessions = pgTable("command_sessions", {
	id: text("id").primaryKey(),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id, { onDelete: "cascade" }),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	title: text("title").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Command Messages Table
export const commandMessages = pgTable("command_messages", {
	id: text("id").primaryKey(),
	sessionId: text("session_id")
		.notNull()
		.references(() => commandSessions.id, { onDelete: "cascade" }),
	sender: text("sender").notNull(), // user | ai
	text: text("text").notNull(),
	previewJson: jsonb("preview_json"),
	executed: boolean("executed").default(false).notNull(),
	executedLink: text("executed_link"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Command Executions Audit Table
export const commandExecutions = pgTable("command_executions", {
	id: text("id").primaryKey(),
	commandId: text("command_id").notNull(),
	sessionId: text("session_id").references(() => commandSessions.id, { onDelete: "set null" }),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id, { onDelete: "cascade" }),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	actionType: text("action_type").notNull(),
	entityType: text("entity_type"),
	entityId: text("entity_id"),
	status: text("status").default("COMPLETED").notNull(),
	errorMessage: text("error_message"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	completedAt: timestamp("completed_at"),
});

// Project AI Tools Table (Referencing ManMadhan Hub Tools)
export const projectAiTools = pgTable("project_ai_tools", {
	id: text("id").primaryKey(),
	projectId: text("project_id")
		.notNull()
		.references(() => projects.id, { onDelete: "cascade" }),
	hubToolId: text("hub_tool_id").notNull(),
	toolName: text("tool_name").notNull(),
	toolCategory: text("tool_category"),
	toolWebsite: text("tool_website"),
	purpose: text("purpose").notNull(),
	assignedToUserId: text("assigned_to_user_id").references(() => users.id, {
		onDelete: "set null",
	}),
	projectPhase: text("project_phase").default("Execution"),
	notes: text("notes"),
	addedById: text("added_by_id")
		.notNull()
		.references(() => users.id),
	status: text("status").default("ACTIVE").notNull(), // ACTIVE, ARCHIVED, UNAVAILABLE
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Calendar Events Table
export const calendarEvents = pgTable("calendar_events", {
	id: text("id").primaryKey(),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id, { onDelete: "cascade" }),
	projectId: text("project_id").references(() => projects.id, { onDelete: "cascade" }),
	title: text("title").notNull(),
	description: text("description"),
	startTime: timestamp("start_time").notNull(),
	endTime: timestamp("end_time").notNull(),
	createdById: text("created_by_id")
		.notNull()
		.references(() => users.id),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User Sessions Table for Token Rotation & Session Management
export const userSessions = pgTable("user_sessions", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	refreshTokenHash: text("refresh_token_hash").notNull(),
	deviceId: text("device_id"),
	userAgent: text("user_agent"),
	ipAddress: text("ip_address"),
	status: text("status").default("ACTIVE").notNull(), // ACTIVE, REVOKED, EXPIRED, SUSPENDED
	expiresAt: timestamp("expires_at").notNull(),
	lastUsedAt: timestamp("last_used_at").defaultNow().notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Organization Learning Workspace Schema V1 ───────────────────────────────
export const learningPlans = pgTable("learning_plans", {
	id: text("id").primaryKey(),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	description: text("description"),
	objective: text("objective"),
	status: text("status").default("ACTIVE").notNull(), // DRAFT, ACTIVE, PAUSED, COMPLETED, ARCHIVED
	priority: text("priority").default("MEDIUM").notNull(), // LOW, MEDIUM, HIGH, CRITICAL
	ownerId: text("owner_id").references(() => users.id),
	targetDate: timestamp("target_date"),
	createdByUserId: text("created_by_user_id")
		.notNull()
		.references(() => users.id),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const learningTopics = pgTable("learning_topics", {
	id: text("id").primaryKey(),
	learningPlanId: text("learning_plan_id")
		.notNull()
		.references(() => learningPlans.id, { onDelete: "cascade" }),
	title: text("title").notNull(),
	description: text("description"),
	category: text("category").default("General"),
	orderIndex: integer("order_index").default(0).notNull(),
	status: text("status").default("NOT_STARTED").notNull(), // NOT_STARTED, IN_PROGRESS, COMPLETED, BLOCKED
	priority: text("priority").default("MEDIUM").notNull(),
	targetDate: timestamp("target_date"),
	assigneeId: text("assignee_id").references(() => users.id),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const learningAssignments = pgTable("learning_assignments", {
	id: text("id").primaryKey(),
	learningPlanId: text("learning_plan_id")
		.notNull()
		.references(() => learningPlans.id, { onDelete: "cascade" }),
	topicId: text("topic_id").references(() => learningTopics.id, { onDelete: "cascade" }),
	assigneeId: text("assignee_id")
		.notNull()
		.references(() => users.id),
	assignedByUserId: text("assigned_by_user_id")
		.notNull()
		.references(() => users.id),
	status: text("status").default("PENDING").notNull(),
	dueDate: timestamp("due_date"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const learningProgress = pgTable("learning_progress", {
	id: text("id").primaryKey(),
	topicId: text("topic_id")
		.notNull()
		.references(() => learningTopics.id, { onDelete: "cascade" }),
	userId: text("user_id")
		.notNull()
		.references(() => users.id),
	progressPercent: integer("progress_percent").default(0).notNull(),
	status: text("status").default("NOT_STARTED").notNull(),
	startedAt: timestamp("started_at"),
	completedAt: timestamp("completed_at"),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const learningResources = pgTable("learning_resources", {
	id: text("id").primaryKey(),
	topicId: text("topic_id")
		.notNull()
		.references(() => learningTopics.id, { onDelete: "cascade" }),
	title: text("title").notNull(),
	type: text("type").default("URL").notNull(), // URL, ARTICLE, VIDEO, PDF, REPO, COURSE
	url: text("url").notNull(),
	description: text("description"),
	createdByUserId: text("created_by_user_id").references(() => users.id),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const learningDocuments = pgTable("learning_documents", {
	id: text("id").primaryKey(),
	learningPlanId: text("learning_plan_id")
		.notNull()
		.references(() => learningPlans.id, { onDelete: "cascade" }),
	topicId: text("topic_id").references(() => learningTopics.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	type: text("type").default("HANDBOOK").notNull(), // HANDBOOK, NOTES, SUMMARY, GUIDE
	storageReference: text("storage_reference").notNull(),
	createdByUserId: text("created_by_user_id").references(() => users.id),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const learningActivities = pgTable("learning_activities", {
	id: text("id").primaryKey(),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id, { onDelete: "cascade" }),
	learningPlanId: text("learning_plan_id").references(() => learningPlans.id, { onDelete: "cascade" }),
	topicId: text("topic_id").references(() => learningTopics.id, { onDelete: "cascade" }),
	actorId: text("actor_id")
		.notNull()
		.references(() => users.id),
	action: text("action").notNull(),
	details: text("details"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const motivations = pgTable("motivations", {
	id: text("id").primaryKey(),
	workspaceId: text("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
	createdByUserId: text("created_by_user_id").references(() => users.id, { onDelete: "cascade" }),
	message: text("message").notNull(),
	category: text("category").default("FOCUS").notNull(),
	tone: text("tone").default("PROFESSIONAL").notNull(),
	active: boolean("active").default(true).notNull(),
	usageCount: integer("usage_count").default(0).notNull(),
	lastUsedAt: timestamp("last_used_at"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const motivationDeliveries = pgTable("motivation_deliveries", {
	id: text("id").primaryKey(),
	motivationId: text("motivation_id").references(() => motivations.id, { onDelete: "cascade" }),
	workspaceId: text("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
	userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
	automationId: text("automation_id").references(() => automations.id, { onDelete: "set null" }),
	deliveredAt: timestamp("delivered_at").defaultNow().notNull(),
	channel: text("channel").default("WEB_PUSH").notNull(),
	status: text("status").default("DELIVERED").notNull(),
});

export * from "./schema/personal.schema";





