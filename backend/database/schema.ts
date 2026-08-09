import { pgTable, text, timestamp, integer, boolean, json, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

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
  isOtpEnabled: boolean("is_otp_enabled").default(false).notNull(),
  isInvited: boolean("is_invited").default(false).notNull(),
  systemOwner: boolean("system_owner").default(false).notNull(),
  employeeId: text("employee_id"),
  managerId: text("manager_id").references((): any => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 1.1 Workspaces Table
export const workspaces = pgTable("workspaces", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").default("personal").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 1.2 Workspace Members Table
export const workspaceMembers = pgTable("workspace_members", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
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
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 1.4 Device Sessions Table
export const deviceSessions = pgTable("device_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
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
  workspaceId: text("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
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
  organizationId: text("organization_id").references(() => workspaces.id, { onDelete: "cascade" }),
  invitedById: text("invited_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  departmentId: text("department_id"), // Optional
  managerId: text("manager_id").references((): any => users.id, { onDelete: "set null" }),
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
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
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
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
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
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  managerId: text("manager_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 6. Projects
export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  departmentId: text("department_id").references(() => departments.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  type: text("type").default("Personal"), // Learning, Development, Research, Career, Personal, Startup, Other
  category: text("category"),
  description: text("description"),
  objective: text("objective"),
  status: text("status").default("Planning").notNull(), // Planning, Active, On Hold, Completed, Archived, Cancelled
  priority: text("priority").default("Medium"), // Low, Medium, High, Urgent
  progress: integer("progress").default(0),
  health: text("health").default("Healthy"), // Healthy, At Risk, Off Track
  startDate: timestamp("start_date"),
  deadline: timestamp("deadline"),
  goalId: text("goal_id").references((): any => goals.id, { onDelete: "set null" }),
  tags: jsonb("tags").default([]),
  plan: jsonb("plan"), // e.g. { expectedOutcome, scope, outOfScope, risks, mitigation, successCriteria }
  ownerId: text("owner_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  archivedAt: timestamp("archived_at"),
});

// 6.1 Milestones
export const milestones = pgTable("milestones", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  deadline: timestamp("deadline"),
  status: text("status").default("Pending").notNull(), // Pending, Active, Completed, Cancelled
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

// 7. Tasks
export const tasks = pgTable("tasks", {
  id: text("id").primaryKey(),
  projectId: text("project_id").references(() => projects.id, { onDelete: "cascade" }),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").default("Draft").notNull(), // Draft, Assigned, Accepted, In Progress, Blocked, Review, Approved, Completed, Archived
  priority: text("priority").default("Medium").notNull(), // Low, Medium, High
  assigneeId: text("assignee_id").references(() => users.id, { onDelete: "set null" }),
  reviewerId: text("reviewer_id").references(() => users.id, { onDelete: "set null" }),
  deadline: timestamp("deadline"),
  submittedAt: timestamp("submitted_at"),
  approvedAt: timestamp("approved_at"),
  completedAt: timestamp("completed_at"),
  rejectionFeedback: text("rejection_feedback"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  goalId: text("goal_id").references((): any => goals.id, { onDelete: "set null" }),
  parentTaskId: text("parent_task_id").references((): any => tasks.id, { onDelete: "cascade" }),
  estimatedMinutes: integer("estimated_minutes"),
  tags: jsonb("tags").default([]),
  archivedAt: timestamp("archived_at"),
  order: integer("order").default(0),
  type: text("type").default("Task"), // Task, Study, Development, Research, Meeting, Review, Other
  milestoneId: text("milestone_id").references(() => milestones.id, { onDelete: "set null" }),
});

// 7.1 Task Dependencies
export const taskDependencies = pgTable("task_dependencies", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  dependsOnTaskId: text("depends_on_task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 8. Password Resets
export const passwordResets = pgTable("password_resets", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  used: boolean("used").default(false).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 9. Time Tracking (Timers)
export const timeTracking = pgTable("time_tracking", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  taskId: text("task_id").references(() => tasks.id, { onDelete: "set null" }),
  status: text("status").default("Active").notNull(), // Active, Paused, Completed
  startTime: timestamp("start_time").notNull(),
  pausedAt: timestamp("paused_at"),
  resumedAt: timestamp("resumed_at"),
  endTime: timestamp("end_time"),
  durationSeconds: integer("duration_seconds"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 9.1 Deadline Extensions
export const deadlineExtensions = pgTable("deadline_extensions", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  status: text("status").default("Pending").notNull(), // Pending, Approved, Rejected
  proposedDeadline: timestamp("proposed_deadline").notNull(),
  reviewerId: text("reviewer_id").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 9.2 Score Ledger
export const scoreLedger = pgTable("score_ledger", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  taskId: text("task_id").references(() => tasks.id, { onDelete: "set null" }),
  projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
  event: text("event").notNull(),
  points: integer("points").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 10. Organization Spaces
export const spaces = pgTable("spaces", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(), // General, Leadership, Custom
  createdById: text("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 11. Space Documents / Announcements
export const spaceDocuments = pgTable("space_documents", {
  id: text("id").primaryKey(),
  spaceId: text("space_id").notNull().references(() => spaces.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content"),
  authorId: text("author_id").notNull().references(() => users.id),
  isPinned: boolean("is_pinned").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 12. Folders & Files
export const folders = pgTable("folders", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  parentId: text("parent_id"), // Self reference omitted for simplicity in Drizzle def
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const files = pgTable("files", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  folderId: text("folder_id").references(() => folders.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  url: text("url").notNull(),
  size: integer("size"),
  uploadedById: text("uploaded_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 13. Workspace Settings (Execution Policy)
export const workspaceSettings = pgTable("workspace_settings", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  allowAfterHoursWork: boolean("allow_after_hours_work").default(false).notNull(),
  enforceWorkingHours: boolean("enforce_working_hours").default(true).notNull(),
  workingHoursStart: text("working_hours_start").default("04:00").notNull(),
  workingHoursEnd: text("working_hours_end").default("23:00").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});


// 14. Notifications
export const notifications = pgTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  workspaceId: text("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
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
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  type: text("type").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- NEW TABLES FOR PHASE 1 ---

// 16. Attendance
export const attendance = pgTable("attendance", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
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
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // Sick, Casual, Annual
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  reason: text("reason"),
  status: text("status").default("Pending").notNull(), // Pending, Approved, Rejected
  approvedById: text("approved_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const leaveBalances = pgTable("leave_balances", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
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
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  projectId: text("project_id").references(() => projects.id, { onDelete: "cascade" }),
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
  taskId: text("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").default("Assignee").notNull(), // Assignee, Reviewer, Watcher
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 20. Comments
export const comments = pgTable("comments", {
  id: text("id").primaryKey(),
  authorId: text("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  entityType: text("entity_type").notNull(), // Task, Project, ProgressUpdate
  entityId: text("entity_id").notNull(),
  content: text("content").notNull(),
  parentId: text("parent_id"), // For threaded replies
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 21. Attachments
export const attachments = pgTable("attachments", {
  id: text("id").primaryKey(),
  uploadedById: text("uploaded_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
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
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
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
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  generatedById: text("generated_by_id").references(() => users.id, { onDelete: "set null" }),
  type: text("type").notNull(), // Performance, Workload, Attendance
  title: text("title").notNull(),
  data: json("data"), // Stores the aggregated report data
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 24. Announcements
export const announcements = pgTable("announcements", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  authorId: text("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  priority: text("priority").default("Normal").notNull(),
  isPublished: boolean("is_published").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 25. Chat Messages (For Real-time Comm)
export const chatMessages = pgTable("chat_messages", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  senderId: text("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  channelId: text("channel_id").notNull(), // Generic channel identifier
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- NEW TABLES FOR PERSONAL DASHBOARD ---

// 26. Goals
export const goals = pgTable("goals", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
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
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
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
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  taskId: text("task_id").references((): any => tasks.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  remindAt: timestamp("remind_at").notNull(),
  isCompleted: boolean("is_completed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 29. Ideas
export const ideas = pgTable("ideas", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 30. Notes (Personal)
export const notes = pgTable("notes", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  taskId: text("task_id").references((): any => tasks.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content"),
  folderId: text("folder_id").references(() => folders.id, { onDelete: "set null" }),
  isPinned: boolean("is_pinned").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 31. Journals
export const journals = pgTable("journals", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  mood: text("mood"), // Productive, Happy, Muted, Stressed, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 32. Books and learning sessions
export const books = pgTable("books", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
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
  bookId: text("book_id").notNull().references(() => books.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at").notNull(),
  endedAt: timestamp("ended_at"),
  durationSeconds: integer("duration_seconds").default(0).notNull(),
  pagesStart: integer("pages_start").default(0).notNull(),
  pagesEnd: integer("pages_end").default(0).notNull(),
});

// 33. Podcasts and listening sessions
export const podcasts = pgTable("podcasts", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  feedUrl: text("feed_url"),
  status: text("status").default("Saved").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const podcastEpisodes = pgTable("podcast_episodes", {
  id: text("id").primaryKey(),
  podcastId: text("podcast_id").notNull().references(() => podcasts.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  audioUrl: text("audio_url"),
  durationSeconds: integer("duration_seconds").default(0).notNull(),
  positionSeconds: integer("position_seconds").default(0).notNull(),
  lastListenedAt: timestamp("last_listened_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const listeningSessions = pgTable("listening_sessions", {
  id: text("id").primaryKey(),
  episodeId: text("episode_id").notNull().references(() => podcastEpisodes.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
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
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  isCompleted: boolean("is_completed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const projectFiles = pgTable("project_files", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  fileId: text("file_id").notNull().references(() => files.id, { onDelete: "cascade" }),
  attachedById: text("attached_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const taskFiles = pgTable("task_files", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  fileId: text("file_id").notNull().references(() => files.id, { onDelete: "cascade" }),
  attachedById: text("attached_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const activities = pgTable("activities", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  projectId: text("project_id").references(() => projects.id, { onDelete: "cascade" }),
  taskId: text("task_id").references(() => tasks.id, { onDelete: "cascade" }),
  milestoneId: text("milestone_id").references(() => milestones.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  action: text("action").notNull(), // Project created, Task completed, File uploaded, etc.
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export * from "./schema/personal.schema";