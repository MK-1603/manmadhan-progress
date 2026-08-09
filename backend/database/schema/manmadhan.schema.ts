import { pgTable, text, timestamp, integer, jsonb, pgSchema } from "drizzle-orm/pg-core";

export const manmadhanSchema = pgSchema("manmadhan");

// Organizational Projects
export const manmadhanProjects = manmadhanSchema.table("manmadhan_projects", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull(), // App-level reference to workspaces.id
  ownerUserId: text("owner_user_id").notNull(), // App-level reference to users.id
  managerUserId: text("manager_user_id"), 
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").default("Planning").notNull(),
  priority: text("priority").default("Medium"),
  startDate: timestamp("start_date"),
  deadline: timestamp("deadline"),
  progress: integer("progress").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  archivedAt: timestamp("archived_at"),
});

// Organizational Tasks
export const manmadhanTasks = manmadhanSchema.table("manmadhan_tasks", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull(),
  projectId: text("project_id").references(() => manmadhanProjects.id, { onDelete: "cascade" }),
  createdByUserId: text("created_by_user_id").notNull(),
  assigneeUserId: text("assignee_user_id"),
  title: text("title").notNull(),
  description: text("description"),
  expectedOutput: text("expected_output"),
  status: text("status").default("ASSIGNED").notNull(), // ASSIGNED, IN_PROGRESS, PAUSED, SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, COMPLETED, CANCELLED
  priority: text("priority").default("Medium").notNull(),
  deadline: timestamp("deadline"),
  estimatedMinutes: integer("estimated_minutes"),
  actualMinutes: integer("actual_minutes"),
  score: integer("score"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  archivedAt: timestamp("archived_at"),
});

// Task Submissions (Organizational)
export const taskSubmissions = manmadhanSchema.table("task_submissions", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull().references(() => manmadhanTasks.id, { onDelete: "cascade" }),
  submittedByUserId: text("submitted_by_user_id").notNull(),
  content: text("content"),
  attachments: jsonb("attachments").default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Task Reviews (Organizational)
export const taskReviews = manmadhanSchema.table("task_reviews", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull().references(() => manmadhanTasks.id, { onDelete: "cascade" }),
  reviewedByUserId: text("reviewed_by_user_id").notNull(),
  decision: text("decision").notNull(), // APPROVED, REJECTED
  feedback: text("feedback"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
