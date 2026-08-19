import { and, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import { type Request, type Response, Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "../../database/client";
import {
	auditLogs,
	centralRequests,
	deadlineExtensions,
	leaves,
	notifications,
	projectAssignments,
	projectDocumentsV2,
	projectMilestonesV2,
	projects,
	scoreLedger,
	tasks,
	users,
	workspaceMembers,
	workspaces,
} from "../../database/schema";
import { authenticate } from "../middleware/auth.middleware";
import { ApprovalAuthorityService } from "../services/approval-authority.service";
import { logger } from "../services/logger.service";
import { NotificationService } from "../services/notification.service";
import { socketService } from "../services/socket.service";

export const orgApprovalsRouter = Router();
orgApprovalsRouter.use(authenticate);

const getOrgContext = async (req: Request) => {
	const userId = (req as any).user?.id;
	const userRoleFromToken = (req as any).user?.role || "";

	const requestedId = String(
		req.query.workspaceId || req.body?.workspaceId || "",
	).trim();

	if (requestedId && requestedId !== "undefined" && requestedId !== "null") {
		const membership = await db.query.workspaceMembers.findFirst({
			where: and(
				eq(workspaceMembers.workspaceId, requestedId),
				eq(workspaceMembers.userId, userId),
			),
		});
		if (membership) {
			return { userId, workspaceId: membership.workspaceId, role: membership.role || userRoleFromToken };
		}
	}

	const allMemberships = await db.query.workspaceMembers.findMany({
		where: eq(workspaceMembers.userId, userId),
	});

	for (const mem of allMemberships) {
		const ws = await db.query.workspaces.findFirst({
			where: eq(workspaces.id, mem.workspaceId),
		});
		if (ws && ws.type !== "personal") {
			return { userId, workspaceId: mem.workspaceId, role: mem.role || userRoleFromToken };
		}
	}

	return { userId, workspaceId: null, role: userRoleFromToken };
};

// 1. GET / - Fetch Approvals Queue with KPI Metrics, Filters & Search
orgApprovalsRouter.get("/", async (req: Request, res: Response) => {
	try {
		const { userId, workspaceId, role } = await getOrgContext(req);
		if (!workspaceId) {
			return res.status(403).json({ success: false, error: "Organization workspace context required." });
		}

		const tab = String(req.query.tab || "all").toLowerCase();
		const search = String(req.query.search || "").trim();
		const statusFilter = String(req.query.status || "").trim();
		const typeFilter = String(req.query.requestType || "").trim();
		const priorityFilter = String(req.query.priority || "").trim();

		// Fetch Central Requests joined with Users and Projects
		const rawRequests = await db
			.select({
				id: centralRequests.id,
				workspaceId: centralRequests.workspaceId,
				requestType: centralRequests.requestType,
				title: centralRequests.title,
				description: centralRequests.description,
				requesterId: centralRequests.requesterId,
				responsibleId: centralRequests.responsibleId,
				accountableId: centralRequests.accountableId,
				approverId: centralRequests.approverId,
				status: centralRequests.status,
				priority: centralRequests.priority,
				rejectionReason: centralRequests.rejectionReason,
				comment: centralRequests.comment,
				entityType: centralRequests.entityType,
				entityId: centralRequests.entityId,
				metadata: centralRequests.metadata,
				dueAt: centralRequests.dueAt,
				openedAt: centralRequests.openedAt,
				decisionAt: centralRequests.decisionAt,
				decisionActorId: centralRequests.decisionActorId,
				slaStatus: centralRequests.slaStatus,
				createdAt: centralRequests.createdAt,
				updatedAt: centralRequests.updatedAt,
			})
			.from(centralRequests)
			.where(eq(centralRequests.workspaceId, workspaceId))
			.orderBy(desc(centralRequests.createdAt));

		// Populate User details for responsibility chain
		const allUserIds = new Set<string>();
		rawRequests.forEach((r) => {
			if (r.requesterId) allUserIds.add(r.requesterId);
			if (r.responsibleId) allUserIds.add(r.responsibleId);
			if (r.accountableId) allUserIds.add(r.accountableId);
			if (r.approverId) allUserIds.add(r.approverId);
			if (r.decisionActorId) allUserIds.add(r.decisionActorId);
		});

		const usersList = allUserIds.size > 0
			? await db.select({ id: users.id, name: users.displayName, email: users.email }).from(users)
			: [];
		const usersMap = new Map(usersList.map((u) => [u.id, u]));

		// Also check existing tasks pending review
		const tasksPending = await db
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
				deadline: tasks.deadline,
				priority: tasks.priority,
			})
			.from(tasks)
			.leftJoin(users, eq(tasks.assigneeId, users.id))
			.leftJoin(projects, eq(tasks.projectId, projects.id))
			.where(and(eq(tasks.workspaceId, workspaceId), eq(tasks.status, "Review")))
			.orderBy(desc(tasks.submittedAt));

		// Sync task pending review items into requests list if not already present
		const existingEntityIds = new Set(rawRequests.map((r) => r.entityId));
		for (const t of tasksPending) {
			if (!existingEntityIds.has(t.id)) {
				const chain = await ApprovalAuthorityService.determineAuthorityChain(workspaceId, t.assigneeId || userId, "TASK_APPROVAL");
				const newReqId = `req_task_${t.id}`;
				await db.insert(centralRequests).values({
					id: newReqId,
					workspaceId,
					requestType: "TASK_APPROVAL",
					title: t.title,
					description: t.description || `Task submitted for review in project ${t.projectName || "Default"}`,
					requesterId: t.assigneeId || userId,
					responsibleId: chain.responsibleId,
					accountableId: chain.accountableId,
					approverId: chain.approverId,
					status: "PENDING",
					priority: t.priority || "Medium",
					entityType: "TASK",
					entityId: t.id,
					dueAt: t.deadline ? new Date(t.deadline) : null,
					metadata: { projectName: t.projectName, projectId: t.projectId },
				}).onConflictDoNothing();
			}
		}

		// Re-fetch formatted requests
		const updatedRequests = await db
			.select()
			.from(centralRequests)
			.where(eq(centralRequests.workspaceId, workspaceId))
			.orderBy(desc(centralRequests.createdAt));

		// Format enriched requests
		const formatted = updatedRequests.map((r) => {
			const reqUser = usersMap.get(r.requesterId);
			const respUser = r.responsibleId ? usersMap.get(r.responsibleId) : reqUser;
			const accUser = r.accountableId ? usersMap.get(r.accountableId) : null;
			const appUser = r.approverId ? usersMap.get(r.approverId) : accUser;

			return {
				...r,
				requesterName: reqUser?.name || reqUser?.email || "Team Member",
				responsibleName: respUser?.name || respUser?.email || reqUser?.name || "Member",
				accountableName: accUser?.name || accUser?.email || "Leadership",
				approverName: appUser?.name || appUser?.email || "Authorized Approver",
				projectName: (r.metadata as any)?.projectName || "Organization Work",
			};
		});

		// Compute Real KPI Metrics
		const now = new Date();
		const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

		const pendingItems = formatted.filter((r) => ["PENDING", "UNDER_REVIEW"].includes(r.status));
		const urgentItems = pendingItems.filter((r) => ["High", "Urgent"].includes(r.priority));
		const dueTodayItems = pendingItems.filter((r) => r.dueAt && new Date(r.dueAt) >= todayStart && new Date(r.dueAt) <= now);
		const approvedTodayItems = formatted.filter((r) => r.status === "APPROVED" && r.decisionAt && new Date(r.decisionAt) >= todayStart);

		// Calculate Avg Review Time in Minutes
		let totalReviewMinutes = 0;
		let reviewCount = 0;
		formatted.forEach((r) => {
			if (r.decisionAt && r.createdAt) {
				const diffMs = new Date(r.decisionAt).getTime() - new Date(r.createdAt).getTime();
				totalReviewMinutes += Math.max(0, Math.floor(diffMs / 60000));
				reviewCount++;
			}
		});

		const avgMinutes = reviewCount > 0 ? Math.round(totalReviewMinutes / reviewCount) : 45;
		const avgHours = Math.floor(avgMinutes / 60);
		const avgMins = avgMinutes % 60;
		const formattedAvgTime = avgHours > 0 ? `${avgHours}h ${avgMins}m` : `${avgMins}m`;

		// Filter based on tab and RBAC
		let filtered = formatted;

		if (role !== "CEO" && role !== "SYSTEM_OWNER") {
			// Non-CEO sees requests where they are requester, responsible, accountable, or approver
			filtered = filtered.filter(
				(r) =>
					r.requesterId === userId ||
					r.responsibleId === userId ||
					r.accountableId === userId ||
					r.approverId === userId
			);
		}

		if (tab === "my_approvals") {
			filtered = filtered.filter((r) => r.approverId === userId || r.accountableId === userId);
		} else if (tab === "task_reviews" || tab === "tasks") {
			filtered = filtered.filter((r) => r.requestType === "TASK_APPROVAL" || r.requestType === "TASK_CHANGE");
		} else if (tab === "deadline") {
			filtered = filtered.filter((r) => r.requestType === "DEADLINE_CHANGE");
		} else if (tab === "leave") {
			filtered = filtered.filter((r) => r.requestType === "LEAVE_REQUEST");
		} else if (tab === "projects") {
			filtered = filtered.filter((r) => r.requestType === "PROJECT_ASSIGNMENT" || r.requestType === "DOCUMENT_REVIEW");
		} else if (tab === "history") {
			filtered = filtered.filter((r) => ["APPROVED", "CHANGES_REQUESTED", "REJECTED", "EXPIRED", "CANCELLED"].includes(r.status));
		} else {
			// All tab defaults to active pending/under review unless searching
			if (!search && !statusFilter) {
				filtered = filtered.filter((r) => ["PENDING", "UNDER_REVIEW"].includes(r.status));
			}
		}

		// Apply Filters
		if (search) {
			const s = search.toLowerCase();
			filtered = filtered.filter(
				(r) =>
					r.title.toLowerCase().includes(s) ||
					r.requesterName.toLowerCase().includes(s) ||
					r.projectName.toLowerCase().includes(s) ||
					r.id.toLowerCase().includes(s)
			);
		}
		if (statusFilter) {
			filtered = filtered.filter((r) => r.status.toLowerCase() === statusFilter.toLowerCase());
		}
		if (typeFilter) {
			filtered = filtered.filter((r) => r.requestType.toLowerCase() === typeFilter.toLowerCase());
		}
		if (priorityFilter) {
			filtered = filtered.filter((r) => r.priority.toLowerCase() === priorityFilter.toLowerCase());
		}

		return res.json({
			success: true,
			data: {
				requests: filtered,
				kpi: {
					pendingCount: pendingItems.length,
					urgentCount: urgentItems.length,
					dueTodayCount: dueTodayItems.length,
					approvedTodayCount: approvedTodayItems.length,
					avgReviewTime: formattedAvgTime,
				},
				userRole: role,
			},
		});
	} catch (err: any) {
		logger.error(`Get approvals error: ${err.message}`);
		return res.status(500).json({ success: false, error: "Failed to fetch approvals queue." });
	}
});

// 2. GET /:id - Detailed Approval Review Context & Timeline History
orgApprovalsRouter.get("/:id", async (req: Request, res: Response) => {
	try {
		const { userId, workspaceId, role } = await getOrgContext(req);
		if (!workspaceId) {
			return res.status(403).json({ success: false, error: "Organization workspace context required." });
		}

		const requestId = req.params.id;
		const reqItem = await db.query.centralRequests.findFirst({
			where: and(eq(centralRequests.id, requestId), eq(centralRequests.workspaceId, workspaceId)),
		});

		if (!reqItem) {
			return res.status(404).json({ success: false, error: "Approval request not found." });
		}

		// Fetch Users for responsibility chain
		const requester = await db.query.users.findFirst({ where: eq(users.id, reqItem.requesterId) });
		const responsible = reqItem.responsibleId ? await db.query.users.findFirst({ where: eq(users.id, reqItem.responsibleId) }) : requester;
		const accountable = reqItem.accountableId ? await db.query.users.findFirst({ where: eq(users.id, reqItem.accountableId) }) : null;
		const approver = reqItem.approverId ? await db.query.users.findFirst({ where: eq(users.id, reqItem.approverId) }) : accountable;

		// Fetch entity details if task or project
		let taskDetail = null;
		let projectDetail = null;

		if (reqItem.entityType === "TASK" && reqItem.entityId) {
			taskDetail = await db.query.tasks.findFirst({ where: eq(tasks.id, reqItem.entityId) });
			if (taskDetail?.projectId) {
				projectDetail = await db.query.projects.findFirst({ where: eq(projects.id, taskDetail.projectId) });
			}
		} else if (reqItem.entityType === "PROJECT" && reqItem.entityId) {
			projectDetail = await db.query.projects.findFirst({ where: eq(projects.id, reqItem.entityId) });
		}

		// Build Timeline events
		const timeline = [
			{
				stage: "Request Created",
				actor: requester?.displayName || "Requester",
				timestamp: reqItem.createdAt,
				description: `Submitted ${reqItem.requestType} request: ${reqItem.title}`,
			},
		];

		if (reqItem.openedAt) {
			timeline.push({
				stage: "Under Review",
				actor: approver?.displayName || "Reviewer",
				timestamp: reqItem.openedAt,
				description: "Opened request for evaluation",
			});
		}

		if (reqItem.decisionAt) {
			timeline.push({
				stage: `Decision: ${reqItem.status}`,
				actor: "Authorized Authority",
				timestamp: reqItem.decisionAt,
				description: reqItem.comment || reqItem.rejectionReason || `Marked as ${reqItem.status}`,
			});
		}

		return res.json({
			success: true,
			data: {
				request: reqItem,
				chain: {
					requester: { id: requester?.id, name: requester?.displayName, email: requester?.email },
					responsible: { id: responsible?.id, name: responsible?.displayName, email: responsible?.email },
					accountable: { id: accountable?.id, name: accountable?.displayName, email: accountable?.email },
					approver: { id: approver?.id, name: approver?.displayName, email: approver?.email },
				},
				entity: {
					task: taskDetail,
					project: projectDetail,
				},
				timeline,
			},
		});
	} catch (err: any) {
		logger.error(`Get approval detail error: ${err.message}`);
		return res.status(500).json({ success: false, error: "Failed to fetch approval details." });
	}
});

// 3. POST /:id/review - Mark Request as UNDER_REVIEW when reviewer opens drawer
orgApprovalsRouter.post("/:id/review", async (req: Request, res: Response) => {
	try {
		const { workspaceId } = await getOrgContext(req);
		if (!workspaceId) {
			return res.status(403).json({ success: false, error: "Organization workspace context required." });
		}

		const requestId = req.params.id;
		const existing = await db.query.centralRequests.findFirst({
			where: and(eq(centralRequests.id, requestId), eq(centralRequests.workspaceId, workspaceId)),
		});

		if (existing && existing.status === "PENDING") {
			await db
				.update(centralRequests)
				.set({ status: "UNDER_REVIEW", openedAt: new Date(), updatedAt: new Date() })
				.where(eq(centralRequests.id, requestId));
		}

		return res.json({ success: true, message: "Marked under review." });
	} catch (err: any) {
		return res.status(500).json({ success: false, error: "Failed to update review state." });
	}
});

// 4. POST /:id/decision - Execute Approval Decision (APPROVE / REQUEST_CHANGES / REJECT)
orgApprovalsRouter.post("/:id/decision", async (req: Request, res: Response) => {
	try {
		const { userId, workspaceId, role } = await getOrgContext(req);
		if (!workspaceId) {
			return res.status(403).json({ success: false, error: "Organization workspace context required." });
		}

		const requestId = req.params.id;
		const { decision, reason, comment } = req.body;

		if (!decision || !["APPROVED", "CHANGES_REQUESTED", "REJECTED"].includes(decision)) {
			return res.status(400).json({ success: false, error: "Valid decision (APPROVED, CHANGES_REQUESTED, REJECTED) is required." });
		}

		const finalReason = (reason || comment || "").trim();
		if ((decision === "CHANGES_REQUESTED" || decision === "REJECTED") && !finalReason) {
			return res.status(400).json({ success: false, error: "A justification reason is required for requesting changes or rejecting." });
		}

		const request = await db.query.centralRequests.findFirst({
			where: and(eq(centralRequests.id, requestId), eq(centralRequests.workspaceId, workspaceId)),
		});

		if (!request) {
			return res.status(404).json({ success: false, error: "Approval request not found." });
		}

		// Validate Authority & Working Hours Policy
		await ApprovalAuthorityService.validateDecision(workspaceId, userId, role, request, decision);

		// Execute Decision Update
		const [updatedRequest] = await db
			.update(centralRequests)
			.set({
				status: decision,
				rejectionReason: decision !== "APPROVED" ? finalReason : null,
				comment: decision === "APPROVED" ? finalReason : null,
				decisionAt: new Date(),
				decisionActorId: userId,
				updatedAt: new Date(),
			})
			.where(eq(centralRequests.id, requestId))
			.returning();

		// Side Effect Logic
		if (request.requestType === "TASK_APPROVAL" && request.entityId) {
			const task = await db.query.tasks.findFirst({ where: eq(tasks.id, request.entityId) });
			if (task) {
				await db
					.update(tasks)
					.set({
						status: decision === "APPROVED" ? "Approved" : "In Progress",
						approvedAt: decision === "APPROVED" ? new Date() : null,
						rejectionFeedback: decision !== "APPROVED" ? finalReason : null,
					})
					.where(eq(tasks.id, task.id));

				if (decision === "APPROVED" && task.assigneeId) {
					// Score points on leaderboard
					await db.insert(scoreLedger).values({
						id: uuidv4(),
						userId: task.assigneeId,
						workspaceId,
						taskId: task.id,
						event: "TASK_APPROVED",
						points: 10,
						reason: finalReason || "On-time task approval",
					});
				}
			}
		} else if (request.requestType === "PROJECT_ASSIGNMENT" && request.entityId) {
			await db
				.update(projectAssignments)
				.set({
					status: decision === "APPROVED" ? "ACCEPTED" : "REJECTED",
					rejectionReason: finalReason || null,
					acceptedAt: decision === "APPROVED" ? new Date() : null,
				})
				.where(eq(projectAssignments.projectId, request.entityId));

			if (decision === "APPROVED") {
				await db.update(projects).set({ status: "PLANNING" }).where(eq(projects.id, request.entityId));
			}
		}

		// Dispatch Notification
		await db.insert(notifications).values({
			id: uuidv4(),
			userId: request.requesterId,
			workspaceId,
			title: `Approval Request ${decision}`,
			message: `Your request "${request.title}" has been ${decision.toLowerCase().replace("_", " ")}${finalReason ? `: ${finalReason}` : ""}`,
			type: `approval_${decision.toLowerCase()}`,
			priority: decision === "APPROVED" ? "Medium" : "High",
		});

		socketService.emitToUser(request.requesterId, "notification.created", {
			type: `approval_${decision.toLowerCase()}`,
			title: `Request ${decision}`,
			message: request.title,
		});

		// Audit Log
		await db.insert(auditLogs).values({
			id: uuidv4(),
			userId,
			workspaceId,
			eventType: `APPROVAL_${decision}`,
			details: `Request "${request.title}" (${request.requestType}) marked ${decision}${finalReason ? `: ${finalReason}` : ""}`,
		});

		socketService.emitToWorkspace(workspaceId, "approval.updated", {
			id: requestId,
			status: decision,
			updatedAt: new Date(),
		});

		return res.json({
			success: true,
			message: `Approval request ${decision.toLowerCase().replace("_", " ")} successfully.`,
			data: updatedRequest,
		});
	} catch (err: any) {
		logger.error(`Approval decision error: ${err.message}`);
		return res.status(400).json({ success: false, error: err.message || "Failed to execute approval decision." });
	}
});

export default orgApprovalsRouter;
