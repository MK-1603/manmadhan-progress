import { and, desc, eq, sql } from "drizzle-orm";
import { type Request, type Response, Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "../../database/client";
import {
	auditLogs,
	deadlineExtensions,
	leaves,
	notifications,
	projects,
	scoreLedger,
	tasks,
	users,
	workspaceMembers,
} from "../../database/schema";
import { authenticate } from "../middleware/auth.middleware";
import { logger } from "../services/logger.service";
import { socketService } from "../services/socket.service";

export const orgApprovalsRouter = Router();
orgApprovalsRouter.use(authenticate);

const resolveWorkspace = async (req: Request, res: Response, next: any) => {
	const userId = (req as any).user?.id;
	let workspaceId = String(req.query.workspaceId || req.body.workspaceId || "");
	if (!workspaceId || workspaceId === "undefined" || workspaceId === "null") {
		const m = await db.query.workspaceMembers.findFirst({
			where: eq(workspaceMembers.userId, userId),
		});
		if (m) {
			workspaceId = m.workspaceId;
			(req.query as any).workspaceId = workspaceId;
			req.body.workspaceId = workspaceId;
		}
	}
	if (!workspaceId)
		return res
			.status(400)
			.json({ success: false, error: "workspaceId is required" });
	(req as any).workspaceId = workspaceId;
	next();
};

const requireMembership = async (req: Request, res: Response, next: any) => {
	const userId = (req as any).user?.id;
	const workspaceId = (req as any).workspaceId;
	const m = await db.query.workspaceMembers.findFirst({
		where: and(
			eq(workspaceMembers.workspaceId, workspaceId),
			eq(workspaceMembers.userId, userId),
		),
	});
	if (!m)
		return res.status(403).json({ success: false, error: "Access denied" });
	(req as any).membership = m;
	next();
};

const requireLeadership = async (req: Request, res: Response, next: any) => {
	const m = (req as any).membership;
	if (!m || (m.role !== "CEO" && m.role !== "CO-CEO"))
		return res
			.status(403)
			.json({ success: false, error: "Leadership role required" });
	next();
};

// ─── Get Pending Approvals ────────────────────────────────────────────────────
orgApprovalsRouter.get(
	"/",
	resolveWorkspace,
	requireMembership,
	requireLeadership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const _userId = (req as any).user?.id;
			const _membership = (req as any).membership;

			// Fetch tasks in review or with approval history
			const allTasks = await db
				.select({
					id: tasks.id,
					title: tasks.title,
					description: tasks.description,
					status: tasks.status,
					assigneeId: tasks.assigneeId,
					assigneeName: users.displayName,
					projectId: tasks.projectId,
					projectName: projects.name,
					submittedAt: tasks.submittedAt,
					approvedAt: tasks.approvedAt,
					deadline: tasks.deadline,
					priority: tasks.priority,
					rejectionFeedback: tasks.rejectionFeedback,
				})
				.from(tasks)
				.leftJoin(users, eq(tasks.assigneeId, users.id))
				.leftJoin(projects, eq(tasks.projectId, projects.id))
				.where(
					and(
						eq(tasks.workspaceId, workspaceId),
						sql`(${tasks.status} IN ('Review', 'Approved', 'Completed') OR ${tasks.rejectionFeedback} IS NOT NULL)`
					)
				)
				.orderBy(desc(tasks.submittedAt));

			const pendingTasks = allTasks.filter((t) => (t.status || "").toLowerCase() === "review");
			const approvedTasks = allTasks.filter((t) => ["approved", "completed"].includes((t.status || "").toLowerCase()));
			const rejectedTasks = allTasks.filter((t) => (t.status || "").toLowerCase() === "rejected");
			const changesRequestedTasks = allTasks.filter((t) => (t.status || "").toLowerCase() === "in progress" && Boolean(t.rejectionFeedback));

			// Deadline extension requests
			const pendingExtensions = await db
				.select({
					id: deadlineExtensions.id,
					reason: deadlineExtensions.reason,
					proposedDeadline: deadlineExtensions.proposedDeadline,
					status: deadlineExtensions.status,
					createdAt: deadlineExtensions.createdAt,
					userId: deadlineExtensions.userId,
					userName: users.displayName,
					taskTitle: tasks.title,
					taskId: deadlineExtensions.taskId,
				})
				.from(deadlineExtensions)
				.leftJoin(users, eq(deadlineExtensions.userId, users.id))
				.leftJoin(tasks, eq(deadlineExtensions.taskId, tasks.id))
				.where(
					and(
						eq(deadlineExtensions.workspaceId, workspaceId),
						eq(deadlineExtensions.status, "Pending"),
					),
				)
				.orderBy(desc(deadlineExtensions.createdAt));

			// Leave requests
			const pendingLeaves = await db
				.select({
					id: leaves.id,
					type: leaves.type,
					startDate: leaves.startDate,
					endDate: leaves.endDate,
					reason: leaves.reason,
					status: leaves.status,
					createdAt: leaves.createdAt,
					userId: leaves.userId,
					userName: users.displayName,
				})
				.from(leaves)
				.leftJoin(users, eq(leaves.userId, users.id))
				.where(
					and(
						eq(leaves.workspaceId, workspaceId),
						eq(leaves.status, "Pending"),
					),
				)
				.orderBy(desc(leaves.createdAt));

			res.json({
				success: true,
				data: {
					tasks: allTasks,
					pendingTasks,
					approvedTasks,
					rejectedTasks,
					changesRequestedTasks,
					extensions: pendingExtensions,
					leaves: pendingLeaves,
					summary: {
						pendingCount: pendingTasks.length + pendingExtensions.length + pendingLeaves.length,
						approvedCount: approvedTasks.length,
						rejectedCount: rejectedTasks.length,
						changesRequestedCount: changesRequestedTasks.length,
						total: allTasks.length + pendingExtensions.length + pendingLeaves.length,
					},
				},
			});
		} catch (err: any) {
			logger.error(`Get approvals error: ${err.message}`);
			res.status(500).json({ success: false, error: "Internal server error" });
		}
	},
);

// ─── Approve/Reject Task ──────────────────────────────────────────────────────
orgApprovalsRouter.post(
	"/tasks/:taskId/approve",
	resolveWorkspace,
	requireMembership,
	requireLeadership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = (req as any).user?.id;
			const taskId = req.params.taskId as string;
			const { feedback } = req.body;

			const task = await db.query.tasks.findFirst({
				where: and(eq(tasks.id, taskId), eq(tasks.workspaceId, workspaceId)),
			});
			if (!task)
				return res
					.status(404)
					.json({ success: false, error: "Task not found" });

			const [updated] = await db
				.update(tasks)
				.set({ status: "Approved", approvedAt: new Date() })
				.where(eq(tasks.id, taskId))
				.returning();

			// Score points for assignee
			if (task.assigneeId) {
				const isOnTime =
					!task.deadline || new Date() <= new Date(task.deadline);
				const points = isOnTime ? 10 : 5;
				await db.insert(scoreLedger).values({
					id: uuidv4(),
					userId: task.assigneeId,
					workspaceId,
					taskId,
					event: "TASK_APPROVED",
					points,
					reason: feedback || (isOnTime ? "On-time delivery" : "Late delivery"),
				});

				// Notify assignee
				await db.insert(notifications).values({
					id: uuidv4(),
					userId: task.assigneeId,
					workspaceId,
					title: "Task Approved",
					message: `Your task "${task.title}" has been approved`,
					type: "task_approved",
					priority: "Medium",
				});
				socketService.emitToUser(task.assigneeId, "notification.created", {
					type: "task_approved",
					title: "Task Approved",
					message: `"${task.title}" approved`,
				});
				socketService.emitToWorkspace(workspaceId, "leaderboard.updated", {
					userId: task.assigneeId,
				});
			}

			await db.insert(auditLogs).values({
				id: uuidv4(),
				userId,
				workspaceId,
				eventType: "TASK_APPROVED",
				details: `Task "${task.title}" approved${feedback ? `: ${feedback}` : ""}`,
			});
			socketService.emitToWorkspace(workspaceId, "approval.updated", {
				type: "task",
				id: taskId,
				status: "Approved",
			});
			res.json({ success: true, data: updated });
		} catch (err: any) {
			logger.error(`Approve task error: ${err.message}`);
			res.status(500).json({ success: false, error: "Internal server error" });
		}
	},
);

const handleRejectOrChanges = async (req: Request, res: Response) => {
	try {
		const workspaceId = (req as any).workspaceId;
		const userId = (req as any).user?.id;
		const taskId = req.params.taskId as string;
		const { feedback, reason, comment } = req.body;
		const finalFeedback = (feedback || reason || comment || "").trim();

		if (!finalFeedback)
			return res.status(400).json({
				success: false,
				error: "Feedback/reason is required",
			});

		const task = await db.query.tasks.findFirst({
			where: and(eq(tasks.id, taskId), eq(tasks.workspaceId, workspaceId)),
		});
		if (!task)
			return res
				.status(404)
				.json({ success: false, error: "Task not found" });

		const [updated] = await db
			.update(tasks)
			.set({ status: "In Progress", rejectionFeedback: finalFeedback })
			.where(eq(tasks.id, taskId))
			.returning();

		if (task.assigneeId) {
			await db.insert(notifications).values({
				id: uuidv4(),
				userId: task.assigneeId,
				workspaceId,
				title: "Changes Requested",
				message: `Your task "${task.title}" needs changes: ${finalFeedback}`,
				type: "task_rejected",
				priority: "High",
			});
			socketService.emitToUser(task.assigneeId, "notification.created", {
				type: "task_rejected",
				title: "Changes Requested",
				message: finalFeedback,
			});
		}

		await db.insert(auditLogs).values({
			id: uuidv4(),
			userId,
			workspaceId,
			eventType: "TASK_REJECTED",
			details: `Task "${task.title}" changes requested: ${finalFeedback}`,
		});
		socketService.emitToWorkspace(workspaceId, "approval.updated", {
			type: "task",
			id: taskId,
			status: "Changes Requested",
		});
		res.json({ success: true, data: updated });
	} catch (err: any) {
		logger.error(`Reject/Request changes task error: ${err.message}`);
		res.status(500).json({ success: false, error: "Internal server error" });
	}
};

orgApprovalsRouter.post("/tasks/:taskId/reject", resolveWorkspace, requireMembership, requireLeadership, handleRejectOrChanges);
orgApprovalsRouter.post("/tasks/:taskId/request_changes", resolveWorkspace, requireMembership, requireLeadership, handleRejectOrChanges);
orgApprovalsRouter.post("/tasks/:taskId/request-changes", resolveWorkspace, requireMembership, requireLeadership, handleRejectOrChanges);
orgApprovalsRouter.post("/:taskId/reject", resolveWorkspace, requireMembership, requireLeadership, handleRejectOrChanges);
orgApprovalsRouter.post("/:taskId/request_changes", resolveWorkspace, requireMembership, requireLeadership, handleRejectOrChanges);
orgApprovalsRouter.post("/:taskId/request-changes", resolveWorkspace, requireMembership, requireLeadership, handleRejectOrChanges);

// ─── Approve/Reject Deadline Extension ───────────────────────────────────────
orgApprovalsRouter.post(
	"/extensions/:extId/approve",
	resolveWorkspace,
	requireMembership,
	requireLeadership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = (req as any).user?.id;
			const extId = req.params.extId as string;

			const ext = await db.query.deadlineExtensions.findFirst({
				where: and(
					eq(deadlineExtensions.id, extId),
					eq(deadlineExtensions.workspaceId, workspaceId),
				),
			});
			if (!ext)
				return res
					.status(404)
					.json({ success: false, error: "Extension request not found" });

			// Apply new deadline to task
			await db
				.update(tasks)
				.set({ deadline: ext.proposedDeadline })
				.where(eq(tasks.id, ext.taskId));
			const [updated] = await db
				.update(deadlineExtensions)
				.set({ status: "Approved", reviewerId: userId, reviewedAt: new Date() })
				.where(eq(deadlineExtensions.id, extId))
				.returning();

			// Notify requester
			await db.insert(notifications).values({
				id: uuidv4(),
				userId: ext.userId,
				workspaceId,
				title: "Deadline Extension Approved",
				message: `Your deadline extension request has been approved. New deadline: ${new Date(ext.proposedDeadline).toLocaleDateString()}`,
				type: "extension_approved",
				priority: "Medium",
			});
			socketService.emitToUser(ext.userId, "notification.created", {
				type: "extension_approved",
				title: "Deadline Extended",
			});

			await db.insert(auditLogs).values({
				id: uuidv4(),
				userId,
				workspaceId,
				eventType: "DEADLINE_EXTENSION_APPROVED",
				details: `Extension approved for task ${ext.taskId}`,
			});
			socketService.emitToWorkspace(workspaceId, "request.updated", {
				type: "extension",
				id: extId,
				status: "Approved",
			});
			res.json({ success: true, data: updated });
		} catch (err: any) {
			logger.error(`Approve extension error: ${err.message}`);
			res.status(500).json({ success: false, error: "Internal server error" });
		}
	},
);

orgApprovalsRouter.post(
	"/extensions/:extId/reject",
	resolveWorkspace,
	requireMembership,
	requireLeadership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = (req as any).user?.id;
			const extId = req.params.extId as string;
			const { reason } = req.body;

			const ext = await db.query.deadlineExtensions.findFirst({
				where: and(
					eq(deadlineExtensions.id, extId),
					eq(deadlineExtensions.workspaceId, workspaceId),
				),
			});
			if (!ext)
				return res
					.status(404)
					.json({ success: false, error: "Extension request not found" });

			const [updated] = await db
				.update(deadlineExtensions)
				.set({ status: "Rejected", reviewerId: userId, reviewedAt: new Date() })
				.where(eq(deadlineExtensions.id, extId))
				.returning();

			await db.insert(notifications).values({
				id: uuidv4(),
				userId: ext.userId,
				workspaceId,
				title: "Deadline Extension Rejected",
				message: `Your deadline extension request was rejected${reason ? `: ${reason}` : ""}`,
				type: "extension_rejected",
				priority: "High",
			});
			socketService.emitToUser(ext.userId, "notification.created", {
				type: "extension_rejected",
				title: "Extension Rejected",
			});
			socketService.emitToWorkspace(workspaceId, "request.updated", {
				type: "extension",
				id: extId,
				status: "Rejected",
			});
			res.json({ success: true, data: updated });
		} catch (err: any) {
			logger.error(`Reject extension error: ${err.message}`);
			res.status(500).json({ success: false, error: "Internal server error" });
		}
	},
);

// ─── Leave Requests ───────────────────────────────────────────────────────────
orgApprovalsRouter.post(
	"/leaves",
	resolveWorkspace,
	requireMembership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = (req as any).user?.id;
			const { type, startDate, endDate, reason } = req.body;
			if (!type || !startDate || !endDate || !reason)
				return res
					.status(400)
					.json({ success: false, error: "All leave fields are required" });

			const [leave] = await db
				.insert(leaves)
				.values({
					id: uuidv4(),
					userId,
					workspaceId,
					type,
					reason,
					status: "Pending",
					startDate: new Date(startDate),
					endDate: new Date(endDate),
				})
				.returning();

			// Notify CEO
			const ceo = await db.query.workspaceMembers.findFirst({
				where: and(
					eq(workspaceMembers.workspaceId, workspaceId),
					eq(workspaceMembers.role, "CEO"),
				),
			});
			if (ceo) {
				const requester = await db.query.users.findFirst({
					where: eq(users.id, userId),
				});
				await db.insert(notifications).values({
					id: uuidv4(),
					userId: ceo.userId,
					workspaceId,
					title: "Leave Request",
					message: `${requester?.displayName || requester?.name} requested ${type} leave`,
					type: "leave_request",
					priority: "Medium",
				});
				socketService.emitToUser(ceo.userId, "notification.created", {
					type: "leave_request",
					title: "Leave Request",
				});
			}

			socketService.emitToWorkspace(workspaceId, "request.created", {
				requestType: "leave",
				...leave,
			});
			res.json({ success: true, data: leave });
		} catch (err: any) {
			logger.error(`Leave request error: ${err.message}`);
			res.status(500).json({ success: false, error: "Internal server error" });
		}
	},
);

orgApprovalsRouter.post(
	"/leaves/:leaveId/approve",
	resolveWorkspace,
	requireMembership,
	requireLeadership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = (req as any).user?.id;
			const leaveId = req.params.leaveId as string;

			const leave = await db.query.leaves.findFirst({
				where: and(eq(leaves.id, leaveId), eq(leaves.workspaceId, workspaceId)),
			});
			if (!leave)
				return res
					.status(404)
					.json({ success: false, error: "Leave request not found" });

			const [updated] = await db
				.update(leaves)
				.set({ status: "Approved", approvedById: userId })
				.where(eq(leaves.id, leaveId))
				.returning();

			await db.insert(notifications).values({
				id: uuidv4(),
				userId: leave.userId,
				workspaceId,
				title: "Leave Approved",
				message: `Your ${leave.type} leave has been approved`,
				type: "leave_approved",
				priority: "Medium",
			});
			socketService.emitToUser(leave.userId, "notification.created", {
				type: "leave_approved",
				title: "Leave Approved",
			});
			await db.insert(auditLogs).values({
				id: uuidv4(),
				userId,
				workspaceId,
				eventType: "LEAVE_APPROVED",
				details: `Leave approved for user ${leave.userId}`,
			});
			socketService.emitToWorkspace(workspaceId, "request.updated", {
				type: "leave",
				id: leaveId,
				status: "Approved",
			});
			res.json({ success: true, data: updated });
		} catch (err: any) {
			logger.error(`Approve leave error: ${err.message}`);
			res.status(500).json({ success: false, error: "Internal server error" });
		}
	},
);

orgApprovalsRouter.post(
	"/leaves/:leaveId/reject",
	resolveWorkspace,
	requireMembership,
	requireLeadership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const _userId = (req as any).user?.id;
			const leaveId = req.params.leaveId as string;
			const { reason } = req.body;

			const leave = await db.query.leaves.findFirst({
				where: and(eq(leaves.id, leaveId), eq(leaves.workspaceId, workspaceId)),
			});
			if (!leave)
				return res
					.status(404)
					.json({ success: false, error: "Leave request not found" });

			const [updated] = await db
				.update(leaves)
				.set({ status: "Rejected" })
				.where(eq(leaves.id, leaveId))
				.returning();

			await db.insert(notifications).values({
				id: uuidv4(),
				userId: leave.userId,
				workspaceId,
				title: "Leave Rejected",
				message: `Your ${leave.type} leave was rejected${reason ? `: ${reason}` : ""}`,
				type: "leave_rejected",
				priority: "High",
			});
			socketService.emitToUser(leave.userId, "notification.created", {
				type: "leave_rejected",
				title: "Leave Rejected",
			});
			socketService.emitToWorkspace(workspaceId, "request.updated", {
				type: "leave",
				id: leaveId,
				status: "Rejected",
			});
			res.json({ success: true, data: updated });
		} catch (err: any) {
			logger.error(`Reject leave error: ${err.message}`);
			res.status(500).json({ success: false, error: "Internal server error" });
		}
	},
);

// ─── Audit Log ────────────────────────────────────────────────────────────────
orgApprovalsRouter.get(
	"/audit",
	resolveWorkspace,
	requireMembership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const membership = (req as any).membership;
			if (membership.role !== "CEO")
				return res
					.status(403)
					.json({ success: false, error: "Only CEO can view audit log" });

			const page = Number(req.query.page || 1);
			const limit = Number(req.query.limit || 50);
			const offset = (page - 1) * limit;

			const logs = await db
				.select({
					log: auditLogs,
					userName: users.displayName,
					userEmail: users.email,
				})
				.from(auditLogs)
				.leftJoin(users, eq(auditLogs.userId, users.id))
				.where(eq(auditLogs.workspaceId, workspaceId))
				.orderBy(desc(auditLogs.createdAt))
				.limit(limit)
				.offset(offset);

			const [{ count }] = await db
				.select({ count: sql<number>`count(*)` })
				.from(auditLogs)
				.where(eq(auditLogs.workspaceId, workspaceId));

			res.json({
				success: true,
				data: logs.map((r) => ({
					...r.log,
					userName: r.userName,
					userEmail: r.userEmail,
				})),
				pagination: { page, limit, total: logs.length },
			});
		} catch (err: any) {
			logger.error(`Audit log error: ${err.message}`);
			res.status(500).json({ success: false, error: "Internal server error" });
		}
	},
);

// ─── All Requests (for Requests page) ────────────────────────────────────────
orgApprovalsRouter.get(
	"/requests",
	resolveWorkspace,
	requireMembership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = (req as any).user?.id;
			const membership = (req as any).membership;

			const extConditions = [eq(deadlineExtensions.workspaceId, workspaceId)];
			const leaveConditions = [eq(leaves.workspaceId, workspaceId)];

			// Members only see their own requests
			if (membership.role === "MEMBER") {
				extConditions.push(eq(deadlineExtensions.userId, userId));
				leaveConditions.push(eq(leaves.userId, userId));
			}

			const extensions = await db
				.select({
					ext: deadlineExtensions,
					userName: users.displayName,
					taskTitle: tasks.title,
				})
				.from(deadlineExtensions)
				.leftJoin(users, eq(deadlineExtensions.userId, users.id))
				.leftJoin(tasks, eq(deadlineExtensions.taskId, tasks.id))
				.where(and(...extConditions))
				.orderBy(desc(deadlineExtensions.createdAt));

			const leaveRequests = await db
				.select({ leave: leaves, userName: users.displayName })
				.from(leaves)
				.leftJoin(users, eq(leaves.userId, users.id))
				.where(and(...leaveConditions))
				.orderBy(desc(leaves.createdAt));

			res.json({
				success: true,
				data: {
					extensions: extensions.map((r) => ({
						...r.ext,
						userName: r.userName,
						taskTitle: r.taskTitle,
					})),
					leaves: leaveRequests.map((r) => ({
						...r.leave,
						userName: r.userName,
					})),
				},
			});
		} catch (err: any) {
			logger.error(`Requests error: ${err.message}`);
			res.status(500).json({ success: false, error: "Internal server error" });
		}
	},
);

export default orgApprovalsRouter;
