import { and, desc, eq, gte, inArray, lte, or, sql } from "drizzle-orm";
import { type Request, type Response, Router } from "express";
import { db } from "../../database/client";
import {
	learningPlans,
	learningTopics,
	projects,
	tasks,
	users,
	workspaceMembers,
} from "../../database/schema";
import { authenticate } from "../middleware/auth.middleware";
import { logger } from "../services/logger.service";
import { resolveUserScope } from "../services/scope.service";

export const orgCalendarRouter = Router();

orgCalendarRouter.use(authenticate);

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
		logger.error(`Calendar workspace resolution error: ${err.message}`);
		res.status(500).json({ success: false, error: "Failed to resolve workspace" });
	}
}

// Normalized Calendar Event Model Interface
export interface CalendarEventDTO {
	id: string;
	sourceType: "TASK" | "PROJECT" | "LEARNING" | "REVIEW" | "SUBMISSION";
	sourceId: string;
	workspaceId: string;
	title: string;
	description?: string | null;
	startAt?: string | Date | null;
	endAt?: string | Date | null;
	dueAt?: string | Date | null;
	status: string;
	priority: string;
	allDay?: boolean;
	assignee?: {
		id?: string;
		name?: string | null;
		email?: string | null;
		avatar?: string | null;
	} | null;
	project?: {
		id?: string;
		name?: string | null;
	} | null;
	learningPlan?: {
		id?: string;
		name?: string | null;
	} | null;
	category: "PROJECT DEADLINE" | "TASK DUE DATE" | "LEARNING" | "REVIEW" | "SUBMISSION" | "OTHER SCHEDULED WORK";
	route?: string;
	raw?: any;
}

// GET /api/v1/org/calendar (Aggregated Normalized Calendar Events)
orgCalendarRouter.get("/", resolveWorkspace, async (req: Request, res: Response) => {
	try {
		const workspaceId = (req as any).workspaceId;
		const { category, search } = req.query;

		const scope = await resolveUserScope(req);
		const events: CalendarEventDTO[] = [];

		// 1. Fetch Tasks
		const taskConds = [eq(tasks.workspaceId, workspaceId)];
		if (scope.role !== "CEO" && scope.managedUserIds.length > 0) {
			taskConds.push(inArray(tasks.assigneeId, scope.managedUserIds));
		}

		const taskRows = await db
			.select({
				id: tasks.id,
				title: tasks.title,
				description: tasks.description,
				status: tasks.status,
				priority: tasks.priority,
				deadline: tasks.deadline,
				createdAt: tasks.createdAt,
				submittedAt: tasks.submittedAt,
				assigneeId: tasks.assigneeId,
				projectId: tasks.projectId,
				assigneeName: users.displayName,
				assigneeEmail: users.email,
				assigneeAvatar: users.avatar,
				projectName: projects.name,
			})
			.from(tasks)
			.leftJoin(users, eq(tasks.assigneeId, users.id))
			.leftJoin(projects, eq(tasks.projectId, projects.id))
			.where(and(...taskConds))
			.orderBy(desc(tasks.createdAt));

		taskRows.forEach((t) => {
			const targetDate = t.deadline || t.createdAt;
			let eventCategory: CalendarEventDTO["category"] = "TASK DUE DATE";
			let sourceType: CalendarEventDTO["sourceType"] = "TASK";

			if (t.status === "Review") {
				eventCategory = "REVIEW";
				sourceType = "REVIEW";
			} else if (t.submittedAt) {
				eventCategory = "SUBMISSION";
				sourceType = "SUBMISSION";
			}

			events.push({
				id: `task-${t.id}`,
				sourceType,
				sourceId: t.id,
				workspaceId,
				title: t.title,
				description: t.description,
				startAt: targetDate,
				endAt: t.deadline || targetDate,
				dueAt: t.deadline,
				status: t.status,
				priority: t.priority || "Medium",
				allDay: false,
				assignee: t.assigneeId
					? {
							id: t.assigneeId,
							name: t.assigneeName,
							email: t.assigneeEmail,
							avatar: t.assigneeAvatar,
						}
					: null,
				project: t.projectId
					? {
							id: t.projectId,
							name: t.projectName,
						}
					: null,
				category: eventCategory,
				route: "/ceo/tasks",
				raw: t,
			});
		});

		// 2. Fetch Projects
		const projectRows = await db
			.select()
			.from(projects)
			.where(eq(projects.workspaceId, workspaceId))
			.orderBy(desc(projects.createdAt));

		projectRows.forEach((p) => {
			if (p.deadline || p.startDate) {
				events.push({
					id: `project-${p.id}`,
					sourceType: "PROJECT",
					sourceId: p.id,
					workspaceId,
					title: p.name,
					description: p.description,
					startAt: p.startDate || p.deadline,
					endAt: p.deadline,
					dueAt: p.deadline,
					status: p.status,
					priority: "High",
					allDay: true,
					category: "PROJECT DEADLINE",
					route: "/ceo/projects",
					raw: p,
				});
			}
		});

		// 3. Fetch Learning Plans & Topics
		const planRows = await db
			.select()
			.from(learningPlans)
			.where(eq(learningPlans.workspaceId, workspaceId));

		const planIds = planRows.map((p) => p.id);
		let topicRows: any[] = [];
		if (planIds.length > 0) {
			topicRows = await db
				.select({
					id: learningTopics.id,
					learningPlanId: learningTopics.learningPlanId,
					title: learningTopics.title,
					description: learningTopics.description,
					status: learningTopics.status,
					priority: learningTopics.priority,
					targetDate: learningTopics.targetDate,
					createdAt: learningTopics.createdAt,
					assigneeId: learningTopics.assigneeId,
					assigneeName: users.displayName,
					assigneeEmail: users.email,
				})
				.from(learningTopics)
				.leftJoin(users, eq(learningTopics.assigneeId, users.id))
				.where(inArray(learningTopics.learningPlanId, planIds));
		}

		const planMap = new Map(planRows.map((p) => [p.id, p]));

		topicRows.forEach((top) => {
			const parentPlan = planMap.get(top.learningPlanId);
			const targetDate = top.targetDate || top.createdAt;
			events.push({
				id: `topic-${top.id}`,
				sourceType: "LEARNING",
				sourceId: top.id,
				workspaceId,
				title: top.title,
				description: top.description,
				startAt: targetDate,
				endAt: targetDate,
				dueAt: top.targetDate,
				status: top.status,
				priority: top.priority || "Medium",
				allDay: true,
				assignee: top.assigneeId
					? { id: top.assigneeId, name: top.assigneeName, email: top.assigneeEmail }
					: null,
				learningPlan: parentPlan ? { id: parentPlan.id, name: parentPlan.name } : null,
				category: "LEARNING",
				route: "/ceo/learning",
				raw: top,
			});
		});

		// Filter by Category if specified
		let filtered = events;
		if (category && typeof category === "string" && category !== "ALL") {
			const catUpper = category.toUpperCase().trim();
			filtered = filtered.filter(
				(e) =>
					e.category.toUpperCase().includes(catUpper) ||
					e.sourceType.toUpperCase() === catUpper,
			);
		}

		// Filter by Search Query if specified
		if (search && typeof search === "string" && search.trim()) {
			const query = search.toLowerCase().trim();
			filtered = filtered.filter(
				(e) =>
					e.title.toLowerCase().includes(query) ||
					(e.description && e.description.toLowerCase().includes(query)) ||
					(e.project?.name && e.project.name.toLowerCase().includes(query)) ||
					(e.assignee?.name && e.assignee.name.toLowerCase().includes(query)) ||
					e.category.toLowerCase().includes(query),
			);
		}

		res.json({
			success: true,
			data: filtered,
		});
	} catch (err: any) {
		logger.error(`Get organization calendar events error: ${err.message}`);
		res.status(500).json({ success: false, error: "Failed to fetch calendar events" });
	}
});

export default orgCalendarRouter;
