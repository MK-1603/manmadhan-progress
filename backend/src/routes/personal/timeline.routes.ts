import { desc, eq } from "drizzle-orm";
import { type Request, type Response, Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { personalDb } from "../../../database/client";
import {
	personalActivityLogs,
	personalProjects,
	personalTasks,
} from "../../../database/schema/personal.schema";
import { authenticate } from "../../middleware/auth.middleware";
import { logger } from "../../services/logger.service";

export const personalTimelineRouter = Router();
personalTimelineRouter.use(authenticate);

const getUserId = (req: Request) => (req as any).user?.id;

// Helper to write timeline events
export async function writeTimelineEvent(
	userId: string,
	eventType: string,
	details: string,
	options: {
		projectId?: string | null;
		taskId?: string | null;
		milestoneId?: string | null;
	} = {},
) {
	try {
		await personalDb.insert(personalActivityLogs).values({
			id: uuidv4(),
			ownerUserId: userId,
			eventType,
			details,
			projectId: options.projectId || null,
			taskId: options.taskId || null,
			milestoneId: options.milestoneId || null,
		});
	} catch (err) {
		// Non-fatal: don't crash the main operation if timeline write fails
		logger.warn(`Timeline write failed: ${String(err)}`);
	}
}

// GET /api/v1/personal/timeline
personalTimelineRouter.get("/", async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req);
		if (!userId)
			return res.status(401).json({ success: false, error: "Unauthorized" });

		const { filter, limit = "50", offset = "0" } = req.query;

		const limitNum = Math.min(parseInt(limit as string, 10) || 50, 100);
		const offsetNum = parseInt(offset as string, 10) || 0;

		// Fetch all activity logs for this user
		const allLogs = await personalDb
			.select()
			.from(personalActivityLogs)
			.where(eq(personalActivityLogs.ownerUserId, userId))
			.orderBy(desc(personalActivityLogs.createdAt))
			.limit(limitNum)
			.offset(offsetNum);

		// Apply filter if provided
		let filtered = allLogs;
		if (filter && filter !== "All") {
			const filterMap: Record<string, string[]> = {
				Projects: [
					"PROJECT_CREATED",
					"PROJECT_UPDATED",
					"PROJECT_COMPLETED",
					"PROJECT_ARCHIVED",
				],
				Tasks: [
					"TASK_CREATED",
					"TASK_UPDATED",
					"TASK_COMPLETED",
					"TASK_STARTED",
				],
				Milestones: [
					"MILESTONE_CREATED",
					"MILESTONE_UPDATED",
					"MILESTONE_COMPLETED",
				],
				Documents: [
					"DOCUMENT_UPLOADED",
					"DOCUMENT_CREATED",
					"DOCUMENT_UPDATED",
				],
				Focus: [
					"FOCUS_STARTED",
					"FOCUS_PAUSED",
					"FOCUS_COMPLETED",
					"FOCUS_CANCELLED",
				],
				GitHub: ["GITHUB_CONNECTED", "GITHUB_PR_VERIFIED"],
			};
			const allowedTypes = filterMap[filter as string] || [];
			filtered = allLogs.filter((l) => allowedTypes.includes(l.eventType));
		}

		// Enrich with project/task names
		const projectIds = [
			...new Set(filtered.map((l) => l.projectId).filter(Boolean)),
		] as string[];
		const taskIds = [
			...new Set(filtered.map((l) => l.taskId).filter(Boolean)),
		] as string[];

		const projects: Record<string, string> = {};
		const tasks: Record<string, string> = {};

		if (projectIds.length > 0) {
			for (const pid of projectIds) {
				const p = await personalDb.query.personalProjects.findFirst({
					where: eq(personalProjects.id, pid),
					columns: { id: true, name: true },
				});
				if (p) projects[pid] = p.name;
			}
		}

		if (taskIds.length > 0) {
			for (const tid of taskIds) {
				const t = await personalDb.query.personalTasks.findFirst({
					where: eq(personalTasks.id, tid),
					columns: { id: true, title: true },
				});
				if (t) tasks[tid] = t.title;
			}
		}

		const enriched = filtered.map((log) => ({
			...log,
			projectName: log.projectId ? projects[log.projectId] || null : null,
			taskTitle: log.taskId ? tasks[log.taskId] || null : null,
		}));

		// Get total count for pagination
		const totalCount = await personalDb
			.select()
			.from(personalActivityLogs)
			.where(eq(personalActivityLogs.ownerUserId, userId));

		res.json({
			success: true,
			data: enriched,
			pagination: {
				total: totalCount.length,
				limit: limitNum,
				offset: offsetNum,
				hasMore: offsetNum + limitNum < totalCount.length,
			},
		});
	} catch (err: any) {
		logger.error(`Personal timeline error: ${err.message}`);
		res.status(500).json({ success: false, error: "Failed to fetch timeline" });
	}
});
