import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { type Request, type Response, Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "../../database/client";
import {
	learningActivities,
	learningAssignments,
	learningDocuments,
	learningPlans,
	learningProgress,
	learningResources,
	learningTopics,
	users,
	workspaceMembers,
} from "../../database/schema";
import { authenticate } from "../middleware/auth.middleware";
import { logger } from "../services/logger.service";
import { socketService } from "../services/socket.service";

export const orgLearningRouter = Router();

orgLearningRouter.use(authenticate);

// ── Workspace Helper ─────────────────────────────────────────────────────────
async function resolveWorkspace(req: Request, res: Response, next: any) {
	try {
		const userId = (req as any).user?.id;
		const userRole = (req as any).user?.role;
		let workspaceId = String(
			req.query.workspaceId || req.body?.workspaceId || req.headers["x-workspace-id"] || "",
		).trim();

		if (!workspaceId || workspaceId === "undefined" || workspaceId === "null") {
			const [first] = await db
				.select({ workspaceId: workspaceMembers.workspaceId })
				.from(workspaceMembers)
				.where(eq(workspaceMembers.userId, userId))
				.limit(1);

			if (first?.workspaceId) {
				workspaceId = first.workspaceId;
			} else if (userRole === "CEO" || userRole === "CO-CEO" || userRole === "ADMIN") {
				workspaceId = "default-workspace";
			} else {
				return res.status(403).json({ success: false, error: "No active workspace found for user" });
			}
		}

		(req as any).workspaceId = workspaceId;
		next();
	} catch (err: any) {
		logger.error(`Learning workspace resolution error: ${err.message}`);
		res.status(500).json({ success: false, error: "Failed to resolve workspace" });
	}
}

// ── GET Learning Workspace Summary KPIs (GET /summary) ───────────────────────
orgLearningRouter.get("/summary", resolveWorkspace, async (req: Request, res: Response) => {
	try {
		const workspaceId = (req as any).workspaceId;

		const plans = await db
			.select()
			.from(learningPlans)
			.where(and(eq(learningPlans.workspaceId, workspaceId), eq(learningPlans.status, "ACTIVE")));

		const planIds = plans.map((p) => p.id);

		let topics: any[] = [];
		if (planIds.length > 0) {
			topics = await db
				.select()
				.from(learningTopics)
				.where(inArray(learningTopics.learningPlanId, planIds));
		}

		const totalTopics = topics.length;
		const inProgress = topics.filter((t) => t.status === "IN_PROGRESS").length;
		const completed = topics.filter((t) => t.status === "COMPLETED").length;
		const overallProgress = totalTopics > 0 ? Math.round((completed / totalTopics) * 100) : 0;

		res.json({
			success: true,
			data: {
				activePlans: plans.length,
				totalTopics,
				inProgress,
				completed,
				overallProgress,
			},
		});
	} catch (err: any) {
		logger.error(`Get learning summary error: ${err.message}`);
		res.status(500).json({ success: false, error: "Failed to fetch learning summary" });
	}
});

// ── GET Learning Plans List (GET /plans) ─────────────────────────────────────
orgLearningRouter.get("/plans", resolveWorkspace, async (req: Request, res: Response) => {
	try {
		const workspaceId = (req as any).workspaceId;

		const plans = await db
			.select({
				id: learningPlans.id,
				name: learningPlans.name,
				description: learningPlans.description,
				objective: learningPlans.objective,
				status: learningPlans.status,
				priority: learningPlans.priority,
				ownerId: learningPlans.ownerId,
				targetDate: learningPlans.targetDate,
				createdAt: learningPlans.createdAt,
				updatedAt: learningPlans.updatedAt,
				ownerName: users.displayName,
				ownerEmail: users.email,
				ownerAvatar: users.avatar,
			})
			.from(learningPlans)
			.leftJoin(users, eq(learningPlans.ownerId, users.id))
			.where(eq(learningPlans.workspaceId, workspaceId))
			.orderBy(desc(learningPlans.createdAt));

		// Compute topics & progress per plan
		const planList = await Promise.all(
			plans.map(async (plan) => {
				const topics = await db
					.select()
					.from(learningTopics)
					.where(eq(learningTopics.learningPlanId, plan.id));

				const completedTopics = topics.filter((t) => t.status === "COMPLETED").length;
				const totalTopics = topics.length;
				const progressPercent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

				return {
					...plan,
					totalTopics,
					completedTopics,
					progressPercent,
				};
			}),
		);

		res.json({ success: true, data: planList });
	} catch (err: any) {
		logger.error(`Get learning plans error: ${err.message}`);
		res.status(500).json({ success: false, error: "Failed to fetch learning plans" });
	}
});

// ── POST Create Learning Plan (POST /plans) ──────────────────────────────────
orgLearningRouter.post("/plans", resolveWorkspace, async (req: Request, res: Response) => {
	try {
		const workspaceId = (req as any).workspaceId;
		const userId = (req as any).user?.id;
		const { name, description, objective, priority = "MEDIUM", ownerId, targetDate, initialTopics = [] } = req.body;

		if (!name || !name.trim()) {
			return res.status(400).json({ success: false, error: "Plan name is required" });
		}

		const planId = uuidv4();
		await db.insert(learningPlans).values({
			id: planId,
			workspaceId,
			name: name.trim(),
			description,
			objective,
			priority,
			ownerId: ownerId || userId,
			targetDate: targetDate ? new Date(targetDate) : null,
			createdByUserId: userId,
			status: "ACTIVE",
		});

		// Insert initial topics if provided
		if (Array.isArray(initialTopics) && initialTopics.length > 0) {
			for (let i = 0; i < initialTopics.length; i++) {
				const topic = initialTopics[i];
				await db.insert(learningTopics).values({
					id: uuidv4(),
					learningPlanId: planId,
					title: typeof topic === "string" ? topic : topic.title,
					description: typeof topic === "object" ? topic.description : null,
					category: typeof topic === "object" ? topic.category || "General" : "General",
					orderIndex: i,
					status: "NOT_STARTED",
					priority: "MEDIUM",
				});
			}
		}

		// Log activity
		await db.insert(learningActivities).values({
			id: uuidv4(),
			workspaceId,
			learningPlanId: planId,
			actorId: userId,
			action: "PLAN_CREATED",
			details: `Created learning plan "${name.trim()}" with ${initialTopics.length} topics`,
		});

		socketService.emitToWorkspace(workspaceId, "learning.plan_created", { planId, name });

		res.json({ success: true, data: { id: planId, name } });
	} catch (err: any) {
		logger.error(`Create learning plan error: ${err.message}`);
		res.status(500).json({ success: false, error: "Failed to create learning plan" });
	}
});

// ── GET Learning Plan Detail (GET /plans/:id) ────────────────────────────────
orgLearningRouter.get("/plans/:id", resolveWorkspace, async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const workspaceId = (req as any).workspaceId;

		const [plan] = await db
			.select({
				id: learningPlans.id,
				name: learningPlans.name,
				description: learningPlans.description,
				objective: learningPlans.objective,
				status: learningPlans.status,
				priority: learningPlans.priority,
				ownerId: learningPlans.ownerId,
				targetDate: learningPlans.targetDate,
				createdAt: learningPlans.createdAt,
				updatedAt: learningPlans.updatedAt,
				ownerName: users.displayName,
				ownerEmail: users.email,
				ownerAvatar: users.avatar,
			})
			.from(learningPlans)
			.leftJoin(users, eq(learningPlans.ownerId, users.id))
			.where(and(eq(learningPlans.id, id), eq(learningPlans.workspaceId, workspaceId)))
			.limit(1);

		if (!plan) {
			return res.status(404).json({ success: false, error: "Learning plan not found" });
		}

		// Fetch topics
		const topics = await db
			.select({
				id: learningTopics.id,
				title: learningTopics.title,
				description: learningTopics.description,
				category: learningTopics.category,
				orderIndex: learningTopics.orderIndex,
				status: learningTopics.status,
				priority: learningTopics.priority,
				targetDate: learningTopics.targetDate,
				assigneeId: learningTopics.assigneeId,
				createdAt: learningTopics.createdAt,
				assigneeName: users.displayName,
				assigneeEmail: users.email,
				assigneeAvatar: users.avatar,
			})
			.from(learningTopics)
			.leftJoin(users, eq(learningTopics.assigneeId, users.id))
			.where(eq(learningTopics.learningPlanId, id))
			.orderBy(learningTopics.orderIndex);

		// Fetch documents
		const documents = await db
			.select()
			.from(learningDocuments)
			.where(eq(learningDocuments.learningPlanId, id));

		// Fetch activity
		const activities = await db
			.select({
				id: learningActivities.id,
				action: learningActivities.action,
				details: learningActivities.details,
				createdAt: learningActivities.createdAt,
				actorName: users.displayName,
				actorEmail: users.email,
			})
			.from(learningActivities)
			.leftJoin(users, eq(learningActivities.actorId, users.id))
			.where(eq(learningActivities.learningPlanId, id))
			.orderBy(desc(learningActivities.createdAt))
			.limit(20);

		const completedTopics = topics.filter((t) => t.status === "COMPLETED").length;
		const totalTopics = topics.length;
		const progressPercent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

		res.json({
			success: true,
			data: {
				...plan,
				totalTopics,
				completedTopics,
				progressPercent,
				topics,
				documents,
				activities,
			},
		});
	} catch (err: any) {
		logger.error(`Get learning plan detail error: ${err.message}`);
		res.status(500).json({ success: false, error: "Failed to fetch learning plan details" });
	}
});

// ── DELETE Learning Plan (DELETE /plans/:id) ──────────────────────────────────
orgLearningRouter.delete("/plans/:id", resolveWorkspace, async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const workspaceId = (req as any).workspaceId;

		await db
			.delete(learningPlans)
			.where(and(eq(learningPlans.id, id), eq(learningPlans.workspaceId, workspaceId)));

		res.json({ success: true, message: "Learning plan deleted" });
	} catch (err: any) {
		logger.error(`Delete learning plan error: ${err.message}`);
		res.status(500).json({ success: false, error: "Failed to delete learning plan" });
	}
});

// ── POST Add Topic (POST /topics) ───────────────────────────────────────────
orgLearningRouter.post("/topics", resolveWorkspace, async (req: Request, res: Response) => {
	try {
		const userId = (req as any).user?.id;
		const { learningPlanId, title, description, category = "General", priority = "MEDIUM", assigneeId } = req.body;

		if (!learningPlanId || !title) {
			return res.status(400).json({ success: false, error: "learningPlanId and title are required" });
		}

		// Calculate orderIndex
		const existingTopics = await db
			.select({ id: learningTopics.id })
			.from(learningTopics)
			.where(eq(learningTopics.learningPlanId, learningPlanId));

		const topicId = uuidv4();
		await db.insert(learningTopics).values({
			id: topicId,
			learningPlanId,
			title: title.trim(),
			description,
			category,
			priority,
			assigneeId,
			orderIndex: existingTopics.length,
			status: "NOT_STARTED",
		});

		res.json({ success: true, data: { id: topicId, title } });
	} catch (err: any) {
		logger.error(`Add topic error: ${err.message}`);
		res.status(500).json({ success: false, error: "Failed to add topic" });
	}
});

// ── PUT Update Topic Status/Progress (PUT /topics/:id) ──────────────────────
orgLearningRouter.put("/topics/:id", resolveWorkspace, async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const userId = (req as any).user?.id;
		const { status, assigneeId, priority } = req.body;

		const updatePayload: any = { updatedAt: new Date() };
		if (status) updatePayload.status = status;
		if (assigneeId !== undefined) updatePayload.assigneeId = assigneeId;
		if (priority) updatePayload.priority = priority;

		await db
			.update(learningTopics)
			.set(updatePayload)
			.where(eq(learningTopics.id, id));

		res.json({ success: true, message: "Topic updated" });
	} catch (err: any) {
		logger.error(`Update topic error: ${err.message}`);
		res.status(500).json({ success: false, error: "Failed to update topic" });
	}
});

orgLearningRouter.patch("/topics/:id", resolveWorkspace, async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const { status, assigneeId, priority } = req.body;
		const updatePayload: any = { updatedAt: new Date() };
		if (status) updatePayload.status = status;
		if (assigneeId !== undefined) updatePayload.assigneeId = assigneeId;
		if (priority) updatePayload.priority = priority;

		await db
			.update(learningTopics)
			.set(updatePayload)
			.where(eq(learningTopics.id, id));

		res.json({ success: true, message: "Topic updated" });
	} catch (err: any) {
		logger.error(`Patch topic error: ${err.message}`);
		res.status(500).json({ success: false, error: "Failed to patch topic" });
	}
});

// ── GET All Topics Across Workspace (GET /topics) ────────────────────────────
orgLearningRouter.get("/topics", resolveWorkspace, async (req: Request, res: Response) => {
	try {
		const workspaceId = (req as any).workspaceId;
		const plans = await db
			.select({ id: learningPlans.id, name: learningPlans.name })
			.from(learningPlans)
			.where(eq(learningPlans.workspaceId, workspaceId));

		const planIds = plans.map((p) => p.id);
		if (planIds.length === 0) {
			return res.json({ success: true, data: [] });
		}

		const planMap = new Map(plans.map((p) => [p.id, p.name]));

		const topicsList = await db
			.select({
				id: learningTopics.id,
				learningPlanId: learningTopics.learningPlanId,
				title: learningTopics.title,
				description: learningTopics.description,
				category: learningTopics.category,
				status: learningTopics.status,
				priority: learningTopics.priority,
				assigneeId: learningTopics.assigneeId,
				createdAt: learningTopics.createdAt,
				assigneeName: users.displayName,
			})
			.from(learningTopics)
			.leftJoin(users, eq(learningTopics.assigneeId, users.id))
			.where(inArray(learningTopics.learningPlanId, planIds))
			.orderBy(desc(learningTopics.createdAt));

		const formatted = topicsList.map((t) => ({
			...t,
			planName: planMap.get(t.learningPlanId) || "General Plan",
		}));

		res.json({ success: true, data: formatted });
	} catch (err: any) {
		logger.error(`Get topics error: ${err.message}`);
		res.status(500).json({ success: false, error: "Failed to fetch topics" });
	}
});

// ── DELETE Topic (DELETE /topics/:id) ────────────────────────────────────────
orgLearningRouter.delete("/topics/:id", resolveWorkspace, async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		await db.delete(learningTopics).where(eq(learningTopics.id, id));
		res.json({ success: true, message: "Topic deleted" });
	} catch (err: any) {
		logger.error(`Delete topic error: ${err.message}`);
		res.status(500).json({ success: false, error: "Failed to delete topic" });
	}
});

// ── GET Assignments (GET /assignments) ──────────────────────────────────────
orgLearningRouter.get("/assignments", resolveWorkspace, async (req: Request, res: Response) => {
	try {
		const workspaceId = (req as any).workspaceId;
		const plans = await db
			.select({ id: learningPlans.id })
			.from(learningPlans)
			.where(eq(learningPlans.workspaceId, workspaceId));

		const planIds = plans.map((p) => p.id);
		if (planIds.length === 0) {
			return res.json({ success: true, data: [] });
		}

		const assignmentsList = await db
			.select({
				id: learningAssignments.id,
				learningPlanId: learningAssignments.learningPlanId,
				topicId: learningAssignments.topicId,
				assigneeId: learningAssignments.assigneeId,
				assignedByUserId: learningAssignments.assignedByUserId,
				status: learningAssignments.status,
				dueDate: learningAssignments.dueDate,
				createdAt: learningAssignments.createdAt,
				assigneeName: users.displayName,
				assigneeEmail: users.email,
				assigneeAvatar: users.avatar,
			})
			.from(learningAssignments)
			.leftJoin(users, eq(learningAssignments.assigneeId, users.id))
			.where(inArray(learningAssignments.learningPlanId, planIds))
			.orderBy(desc(learningAssignments.createdAt));

		res.json({ success: true, data: assignmentsList });
	} catch (err: any) {
		logger.error(`Get assignments error: ${err.message}`);
		res.status(500).json({ success: false, error: "Failed to fetch assignments" });
	}
});

// ── POST Create Assignment (POST /assignments) ───────────────────────────────
orgLearningRouter.post("/assignments", resolveWorkspace, async (req: Request, res: Response) => {
	try {
		const userId = (req as any).user?.id;
		const { learningPlanId, topicId, assigneeId, dueDate } = req.body;

		if (!learningPlanId) {
			return res.status(400).json({ success: false, error: "learningPlanId is required" });
		}

		const id = uuidv4();
		await db.insert(learningAssignments).values({
			id,
			learningPlanId,
			topicId: topicId || null,
			assigneeId: assigneeId || userId,
			assignedByUserId: userId,
			status: "PENDING",
			dueDate: dueDate ? new Date(dueDate) : null,
		});

		res.json({ success: true, data: { id, learningPlanId } });
	} catch (err: any) {
		logger.error(`Create assignment error: ${err.message}`);
		res.status(500).json({ success: false, error: "Failed to create assignment" });
	}
});

// ── PATCH Assignment (PATCH /assignments/:id) ───────────────────────────────
orgLearningRouter.patch("/assignments/:id", resolveWorkspace, async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const { status, assigneeId } = req.body;
		const payload: any = {};
		if (status) payload.status = status;
		if (assigneeId) payload.assigneeId = assigneeId;

		await db.update(learningAssignments).set(payload).where(eq(learningAssignments.id, id));
		res.json({ success: true, message: "Assignment updated" });
	} catch (err: any) {
		logger.error(`Update assignment error: ${err.message}`);
		res.status(500).json({ success: false, error: "Failed to update assignment" });
	}
});

// ── DELETE Assignment (DELETE /assignments/:id) ──────────────────────────────
orgLearningRouter.delete("/assignments/:id", resolveWorkspace, async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		await db.delete(learningAssignments).where(eq(learningAssignments.id, id));
		res.json({ success: true, message: "Assignment deleted" });
	} catch (err: any) {
		logger.error(`Delete assignment error: ${err.message}`);
		res.status(500).json({ success: false, error: "Failed to delete assignment" });
	}
});

// ── GET Documents (GET /documents) ───────────────────────────────────────────
orgLearningRouter.get("/documents", resolveWorkspace, async (req: Request, res: Response) => {
	try {
		const workspaceId = (req as any).workspaceId;
		const plans = await db
			.select({ id: learningPlans.id })
			.from(learningPlans)
			.where(eq(learningPlans.workspaceId, workspaceId));

		const planIds = plans.map((p) => p.id);
		if (planIds.length === 0) {
			return res.json({ success: true, data: [] });
		}

		const docs = await db
			.select({
				id: learningDocuments.id,
				learningPlanId: learningDocuments.learningPlanId,
				title: learningDocuments.name,
				fileType: learningDocuments.type,
				fileUrl: learningDocuments.storageReference,
				uploadedByUserId: learningDocuments.createdByUserId,
				createdAt: learningDocuments.createdAt,
				uploaderName: users.displayName,
			})
			.from(learningDocuments)
			.leftJoin(users, eq(learningDocuments.createdByUserId, users.id))
			.where(inArray(learningDocuments.learningPlanId, planIds))
			.orderBy(desc(learningDocuments.createdAt));

		res.json({ success: true, data: docs });
	} catch (err: any) {
		logger.error(`Get documents error: ${err.message}`);
		res.status(500).json({ success: false, error: "Failed to fetch documents" });
	}
});

// ── GET Progress Analytics (GET /progress) ────────────────────────────────────
orgLearningRouter.get("/progress", resolveWorkspace, async (req: Request, res: Response) => {
	try {
		const workspaceId = (req as any).workspaceId;
		const plans = await db
			.select()
			.from(learningPlans)
			.where(eq(learningPlans.workspaceId, workspaceId));

		const planIds = plans.map((p) => p.id);
		let topics: any[] = [];
		let assignments: any[] = [];

		if (planIds.length > 0) {
			topics = await db.select().from(learningTopics).where(inArray(learningTopics.learningPlanId, planIds));
			assignments = await db.select().from(learningAssignments).where(inArray(learningAssignments.learningPlanId, planIds));
		}

		const completedTopics = topics.filter((t) => t.status === "COMPLETED").length;
		const inProgressTopics = topics.filter((t) => t.status === "IN_PROGRESS").length;
		const blockedTopics = topics.filter((t) => t.status === "BLOCKED").length;

		res.json({
			success: true,
			data: {
				totalPlans: plans.length,
				totalTopics: topics.length,
				completedTopics,
				inProgressTopics,
				blockedTopics,
				totalAssignments: assignments.length,
				completedAssignments: assignments.filter((a) => a.status === "COMPLETED").length,
				overallMastery: topics.length > 0 ? Math.round((completedTopics / topics.length) * 100) : 0,
			},
		});
	} catch (err: any) {
		logger.error(`Get progress error: ${err.message}`);
		res.status(500).json({ success: false, error: "Failed to fetch progress analytics" });
	}
});

// ── GET Activity Feed (GET /activity) ────────────────────────────────────────
orgLearningRouter.get("/activity", resolveWorkspace, async (req: Request, res: Response) => {
	try {
		const workspaceId = (req as any).workspaceId;
		const activitiesList = await db
			.select({
				id: learningActivities.id,
				action: learningActivities.action,
				details: learningActivities.details,
				createdAt: learningActivities.createdAt,
				actorName: users.displayName,
				actorEmail: users.email,
				actorAvatar: users.avatar,
			})
			.from(learningActivities)
			.leftJoin(users, eq(learningActivities.actorId, users.id))
			.where(eq(learningActivities.workspaceId, workspaceId))
			.orderBy(desc(learningActivities.createdAt))
			.limit(50);

		res.json({ success: true, data: activitiesList });
	} catch (err: any) {
		logger.error(`Get activity error: ${err.message}`);
		res.status(500).json({ success: false, error: "Failed to fetch activity feed" });
	}
});

export default orgLearningRouter;
