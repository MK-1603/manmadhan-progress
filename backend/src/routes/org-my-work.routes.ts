import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { type Request, type Response, Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "../../database/client";
import {
	auditLogs,
	notifications,
	projects,
	tasks,
	users,
	workspaceMembers,
} from "../../database/schema";
import { authenticate } from "../middleware/auth.middleware";
import { logger } from "../services/logger.service";
import { socketService } from "../services/socket.service";

export const orgMyWorkRouter = Router();
orgMyWorkRouter.use(authenticate);

// Middleware to resolve workspace access
const resolveWorkspace = async (req: Request, res: Response, next: any) => {
	try {
		const userId = (req as any).user?.id;
		let workspaceId = String(
			req.query.workspaceId || req.body?.workspaceId || "",
		).trim();

		if (!workspaceId || workspaceId === "undefined" || workspaceId === "null") {
			if (userId) {
				const [m] = await db
					.select()
					.from(workspaceMembers)
					.where(eq(workspaceMembers.userId, userId))
					.limit(1);
				if (m && m.workspaceId) {
					workspaceId = m.workspaceId;
					req.body.workspaceId = workspaceId;
					(req.query as any).workspaceId = workspaceId;
				}
			}
		}

		if (!workspaceId)
			return res
				.status(400)
				.json({ success: false, error: "Workspace context required" });

		const [member] = await db
			.select()
			.from(workspaceMembers)
			.where(
				and(
					eq(workspaceMembers.workspaceId, workspaceId),
					eq(workspaceMembers.userId, userId),
				),
			)
			.limit(1);

		if (!member)
			return res
				.status(403)
				.json({ success: false, error: "Access denied to workspace" });

		(req as any).workspaceId = workspaceId;
		(req as any).membership = member;
		next();
	} catch (err: any) {
		logger.error("MyWork resolveWorkspace error: " + err.message);
		res
			.status(500)
			.json({ success: false, error: "Workspace verification error" });
	}
};

// ─── GET /api/v1/org/my-work (Canonical User-Scoped Work Queue) ────────────
orgMyWorkRouter.get(
	"/",
	resolveWorkspace,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = (req as any).user?.id;
			const membership = (req as any).membership;
			const role = (membership.role || "").toUpperCase();

			// 1. Fetch assigned tasks for current authenticated user ONLY
			const myTasksList = await db
				.select({
					task: tasks,
					projectName: projects.name,
					reviewerName: users.displayName,
				})
				.from(tasks)
				.leftJoin(projects, eq(tasks.projectId, projects.id))
				.leftJoin(users, eq(tasks.reviewerId, users.id))
				.where(
					and(eq(tasks.workspaceId, workspaceId), eq(tasks.assigneeId, userId)),
				)
				.orderBy(desc(tasks.createdAt));

			const formattedTasks = myTasksList.map((r) => ({
				...r.task,
				projectName: r.projectName,
				reviewerName: r.reviewerName,
			}));

			const now = new Date();
			const todayStr = now.toDateString();

			const pendingAcceptance = formattedTasks.filter(
				(t) =>
					t.status === "Assigned" ||
					t.status === "Draft" ||
					t.status === "PENDING_ACCEPTANCE",
			);
			const activeWork = formattedTasks.filter(
				(t) => t.status === "Accepted" || t.status === "In Progress",
			);
			const dueToday = formattedTasks.filter(
				(t) =>
					t.deadline &&
					new Date(t.deadline).toDateString() === todayStr &&
					t.status !== "Completed" &&
					t.status !== "Approved",
			);
			const overdue = formattedTasks.filter(
				(t) =>
					t.deadline &&
					new Date(t.deadline) < now &&
					t.status !== "Completed" &&
					t.status !== "Approved",
			);
			const completed = formattedTasks.filter(
				(t) => t.status === "Completed" || t.status === "Approved",
			);

			// 2. Fetch assigned projects for current authenticated user
			const myProjectsList = await db
				.select()
				.from(projects)
				.where(
					and(
						eq(projects.workspaceId, workspaceId),
						eq(projects.ownerId, userId),
					),
				)
				.orderBy(desc(projects.createdAt));

			// 3. For CO-CEO / Leadership, fetch member submissions requiring review
			let workRequiringReview: any[] = [];
			if (role === "CEO" || role === "CO-CEO") {
				const reviewTasks = await db
					.select({
						task: tasks,
						assigneeName: users.displayName,
						projectName: projects.name,
					})
					.from(tasks)
					.leftJoin(users, eq(tasks.assigneeId, users.id))
					.leftJoin(projects, eq(tasks.projectId, projects.id))
					.where(
						and(eq(tasks.workspaceId, workspaceId), eq(tasks.status, "Review")),
					)
					.orderBy(desc(tasks.createdAt));

				workRequiringReview = reviewTasks.map((r) => ({
					...r.task,
					assigneeName: r.assigneeName,
					projectName: r.projectName,
				}));
			}

			res.json({
				success: true,
				data: {
					summary: {
						pendingCount: pendingAcceptance.length,
						activeCount: activeWork.length,
						dueTodayCount: dueToday.length,
						overdueCount: overdue.length,
						completedCount: completed.length,
						reviewCount: workRequiringReview.length,
					},
					pendingAcceptance,
					activeWork,
					dueToday,
					overdue,
					completed,
					myProjects: myProjectsList,
					workRequiringReview,
				},
			});
		} catch (err: any) {
			logger.error("Fetch My Work error: " + err.message);
			res
				.status(500)
				.json({ success: false, error: "Failed to fetch My Work queue" });
		}
	},
);

// ─── POST /api/v1/org/tasks/:id/accept (Accept Work Assignment) ─────────────
orgMyWorkRouter.post(
	"/tasks/:id/accept",
	resolveWorkspace,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = (req as any).user?.id;
			const taskId = String(req.params.id);

			const [existing] = await db
				.select()
				.from(tasks)
				.where(
					and(
						eq(tasks.id, taskId),
						eq(tasks.workspaceId, workspaceId),
						eq(tasks.assigneeId, userId),
					),
				)
				.limit(1);

			if (!existing) {
				return res
					.status(404)
					.json({
						success: false,
						error: "Task assignment not found or access denied",
					});
			}

			const [updated] = await db
				.update(tasks)
				.set({ status: "Accepted" })
				.where(eq(tasks.id, taskId))
				.returning();

			// Log timeline audit event
			await db.insert(auditLogs).values({
				id: uuidv4(),
				userId,
				workspaceId,
				eventType: "TASK_ACCEPTED",
				details: `User ${userId} accepted task assignment "${existing.title}"`,
			});

			// Notify task creator / reviewer
			if (existing.reviewerId) {
				await db.insert(notifications).values({
					id: uuidv4(),
					userId: existing.reviewerId,
					workspaceId,
					title: "Assignment Accepted",
					message: `Task "${existing.title}" was accepted by assignee.`,
					type: "task_accepted",
					priority: "Normal",
				});
				socketService.emitToUser(existing.reviewerId, "notification.created", {
					type: "task_accepted",
					title: "Assignment Accepted",
					message: `Task "${existing.title}" was accepted.`,
				});
			}

			res.json({
				success: true,
				data: updated,
				message: "Task assignment accepted successfully",
			});
		} catch (err: any) {
			logger.error("Accept task error: " + err.message);
			res
				.status(500)
				.json({ success: false, error: "Failed to accept task assignment" });
		}
	},
);

// ─── POST /api/v1/org/tasks/:id/decline (Decline Work Assignment) ───────────
orgMyWorkRouter.post(
	"/tasks/:id/decline",
	resolveWorkspace,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = (req as any).user?.id;
			const taskId = String(req.params.id);
			const { reason } = req.body;

			const [existing] = await db
				.select()
				.from(tasks)
				.where(
					and(
						eq(tasks.id, taskId),
						eq(tasks.workspaceId, workspaceId),
						eq(tasks.assigneeId, userId),
					),
				)
				.limit(1);

			if (!existing) {
				return res
					.status(404)
					.json({
						success: false,
						error: "Task assignment not found or access denied",
					});
			}

			const [updated] = await db
				.update(tasks)
				.set({
					status: "Draft",
					assigneeId: null,
					rejectionFeedback: reason || "Declined by assignee",
				})
				.where(eq(tasks.id, taskId))
				.returning();

			// Log timeline audit event
			await db.insert(auditLogs).values({
				id: uuidv4(),
				userId,
				workspaceId,
				eventType: "TASK_DECLINED",
				details: `User ${userId} declined task assignment "${existing.title}". Reason: ${reason || "None"}`,
			});

			res.json({
				success: true,
				data: updated,
				message: "Task assignment declined",
			});
		} catch (err: any) {
			logger.error("Decline task error: " + err.message);
			res
				.status(500)
				.json({ success: false, error: "Failed to decline task assignment" });
		}
	},
);

// ─── POST /api/v1/org/my-work/tasks/:id/submit (Submit Work for Review) ─────
orgMyWorkRouter.post(
	"/tasks/:id/submit",
	resolveWorkspace,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = (req as any).user?.id;
			const taskId = String(req.params.id);
			const { githubPrUrl, completionNotes } = req.body;

			const [existing] = await db
				.select()
				.from(tasks)
				.where(
					and(
						eq(tasks.id, taskId),
						eq(tasks.workspaceId, workspaceId),
						eq(tasks.assigneeId, userId),
					),
				)
				.limit(1);

			if (!existing) {
				return res
					.status(404)
					.json({
						success: false,
						error: "Task assignment not found or access denied",
					});
			}

			if (existing.requiresGithub && !githubPrUrl && !existing.githubPrUrl) {
				return res
					.status(400)
					.json({
						success: false,
						error: "GitHub PR URL is required for task submission",
					});
			}

			const [updated] = await db
				.update(tasks)
				.set({
					status: "Review",
					submittedAt: new Date(),
					githubPrUrl: githubPrUrl || existing.githubPrUrl,
					description: completionNotes
						? `${existing.description || ""}\n\nCompletion Notes: ${completionNotes}`
						: existing.description,
				})
				.where(eq(tasks.id, taskId))
				.returning();

			// Audit log
			await db.insert(auditLogs).values({
				id: uuidv4(),
				userId,
				workspaceId,
				eventType: "WORK_SUBMITTED",
				details: `User ${userId} submitted task "${existing.title}" for review`,
			});

			// Notify reviewer / leadership
			if (existing.reviewerId) {
				await db.insert(notifications).values({
					id: uuidv4(),
					userId: existing.reviewerId,
					workspaceId,
					title: "Work Submitted for Review",
					message: `Task "${existing.title}" was submitted for review.`,
					type: "work_submitted",
					priority: "High",
				});
				socketService.emitToUser(existing.reviewerId, "notification.created", {
					type: "work_submitted",
					title: "Work Submitted for Review",
					message: `Task "${existing.title}" was submitted for review.`,
				});
			}

			socketService.emitToWorkspace(workspaceId, "task.updated", updated);
			res.json({
				success: true,
				data: updated,
				message: "Work submitted for review successfully",
			});
		} catch (err: any) {
			logger.error("Submit task error: " + err.message);
			res
				.status(500)
				.json({ success: false, error: "Failed to submit work for review" });
		}
	},
);
