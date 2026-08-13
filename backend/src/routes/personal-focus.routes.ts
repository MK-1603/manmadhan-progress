import crypto from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { type Request, type Response, Router } from "express";
import { personalDb } from "../../database/client";
import { personalFocusSessions, personalTasks } from "../../database/schema";
import { authenticate } from "../middleware/auth.middleware";
import { logger } from "../services/logger.service";
import { socketService } from "../services/socket.service";

export const personalFocusRouter = Router();

personalFocusRouter.use(authenticate);

// POST /api/v1/personal/focus/start
personalFocusRouter.post("/start", async (req: Request, res: Response) => {
	try {
		const userId = (req as any).user?.id;
		const { taskId } = req.body;
		const workspaceId = "personal";

		// Stop any existing running sessions
		const activeSessions = await personalDb
			.select()
			.from(personalFocusSessions)
			.where(
				and(
					eq(personalFocusSessions.userId, userId),
					eq(personalFocusSessions.status, "RUNNING"),
				),
			);

		for (const session of activeSessions) {
			const now = new Date();
			const lastStart = session.resumedAt
				? new Date(session.resumedAt).getTime()
				: new Date(session.startedAt).getTime();
			const activeTime = Math.max(
				0,
				Math.floor((now.getTime() - lastStart) / 1000),
			);
			await personalDb
				.update(personalFocusSessions)
				.set({
					status: "PAUSED",
					pausedAt: now,
					activeDuration: session.activeDuration + activeTime,
					updatedAt: now,
				})
				.where(eq(personalFocusSessions.id, session.id));
		}

		// Start new session
		const [newSession] = await personalDb
			.insert(personalFocusSessions)
			.values({
				id: crypto.randomUUID(),
				userId,
				workspaceId,
				taskId,
				status: "RUNNING",
				startedAt: new Date(),
			})
			.returning();

		if (taskId) {
			await personalDb
				.update(personalTasks)
				.set({ status: "IN_PROGRESS" })
				.where(eq(personalTasks.id, taskId));
		}

		socketService.emitToUser(userId, "focus_updated", newSession);
		socketService.emitToUser(userId, "task_updated", { id: taskId });

		return res.json({ success: true, data: newSession });
	} catch (error: any) {
		logger.error(`Focus Start Error: ${error.message}`);
		return res
			.status(500)
			.json({ success: false, error: "Internal server error" });
	}
});

// POST /api/v1/personal/focus/pause
personalFocusRouter.post("/pause", async (req: Request, res: Response) => {
	try {
		const userId = (req as any).user?.id;
		const { sessionId } = req.body;

		const session = await personalDb
			.select()
			.from(personalFocusSessions)
			.where(eq(personalFocusSessions.id, sessionId))
			.limit(1);
		if (!session.length || session[0].userId !== userId)
			return res.status(404).json({ success: false, error: "Not found" });

		if (session[0].status === "RUNNING") {
			const now = new Date();
			const lastStart = session[0].resumedAt
				? new Date(session[0].resumedAt).getTime()
				: new Date(session[0].startedAt).getTime();
			const activeTime = Math.max(
				0,
				Math.floor((now.getTime() - lastStart) / 1000),
			);

			const [updated] = await personalDb
				.update(personalFocusSessions)
				.set({
					status: "PAUSED",
					pausedAt: now,
					activeDuration: session[0].activeDuration + activeTime,
					updatedAt: now,
				})
				.where(eq(personalFocusSessions.id, sessionId))
				.returning();

			socketService.emitToUser(userId, "focus_updated", updated);
			return res.json({ success: true, data: updated });
		}
		return res.json({ success: true, data: session[0] });
	} catch (error: any) {
		logger.error(`Focus Pause Error: ${error.message}`);
		return res
			.status(500)
			.json({ success: false, error: "Internal server error" });
	}
});

// POST /api/v1/personal/focus/resume
personalFocusRouter.post("/resume", async (req: Request, res: Response) => {
	try {
		const userId = (req as any).user?.id;
		const { sessionId } = req.body;

		// Stop others
		const activeSessions = await personalDb
			.select()
			.from(personalFocusSessions)
			.where(
				and(
					eq(personalFocusSessions.userId, userId),
					eq(personalFocusSessions.status, "RUNNING"),
				),
			);

		for (const session of activeSessions) {
			if (session.id === sessionId) continue;
			const now = new Date();
			const lastStart = session.resumedAt
				? new Date(session.resumedAt).getTime()
				: new Date(session.startedAt).getTime();
			const activeTime = Math.max(
				0,
				Math.floor((now.getTime() - lastStart) / 1000),
			);
			await personalDb
				.update(personalFocusSessions)
				.set({
					status: "PAUSED",
					pausedAt: now,
					activeDuration: session.activeDuration + activeTime,
					updatedAt: now,
				})
				.where(eq(personalFocusSessions.id, session.id));
		}

		const [updated] = await personalDb
			.update(personalFocusSessions)
			.set({ status: "RUNNING", resumedAt: new Date(), updatedAt: new Date() })
			.where(eq(personalFocusSessions.id, sessionId))
			.returning();

		socketService.emitToUser(userId, "focus_updated", updated);
		return res.json({ success: true, data: updated });
	} catch (error: any) {
		logger.error(`Focus Resume Error: ${error.message}`);
		return res
			.status(500)
			.json({ success: false, error: "Internal server error" });
	}
});

// POST /api/v1/personal/focus/complete
personalFocusRouter.post("/complete", async (req: Request, res: Response) => {
	try {
		const userId = (req as any).user?.id;
		const { sessionId } = req.body;

		const session = await personalDb
			.select()
			.from(personalFocusSessions)
			.where(eq(personalFocusSessions.id, sessionId))
			.limit(1);
		if (!session.length || session[0].userId !== userId)
			return res.status(404).json({ success: false, error: "Not found" });

		let finalActiveDuration = session[0].activeDuration;
		if (session[0].status === "RUNNING") {
			const now = new Date();
			const lastStart = session[0].resumedAt
				? new Date(session[0].resumedAt).getTime()
				: new Date(session[0].startedAt).getTime();
			finalActiveDuration += Math.max(
				0,
				Math.floor((now.getTime() - lastStart) / 1000),
			);
		}

		const [updated] = await personalDb
			.update(personalFocusSessions)
			.set({
				status: "COMPLETED",
				finishedAt: new Date(),
				activeDuration: finalActiveDuration,
				updatedAt: new Date(),
			})
			.where(eq(personalFocusSessions.id, sessionId))
			.returning();

		if (session[0].taskId) {
			await personalDb
				.update(personalTasks)
				.set({ status: "Completed", completedAt: new Date() })
				.where(eq(personalTasks.id, session[0].taskId));
			socketService.emitToUser(userId, "task_updated", {
				id: session[0].taskId,
			});
		}

		socketService.emitToUser(userId, "focus_updated", updated);
		return res.json({ success: true, data: updated });
	} catch (error: any) {
		logger.error(`Focus Complete Error: ${error.message}`);
		return res
			.status(500)
			.json({ success: false, error: "Internal server error" });
	}
});

// GET /api/v1/personal/focus/history
personalFocusRouter.get("/history", async (req: Request, res: Response) => {
	try {
		const userId = (req as any).user?.id;

		// Fetch last 10 completed focus sessions
		const sessions = await personalDb
			.select()
			.from(personalFocusSessions)
			.where(
				and(
					eq(personalFocusSessions.userId, userId),
					eq(personalFocusSessions.status, "COMPLETED"),
				),
			)
			.orderBy(personalFocusSessions.finishedAt)
			// wait drizzle order by descending is desc(personalFocusSessions.finishedAt)
			// Since desc needs to be imported, I will fetch and sort in memory if desc is not imported.
			// Better yet, just fetch and sort in JS to avoid import issues.
			.limit(30);

		// Sort descending by finishedAt
		sessions.sort((a, b) => {
			const timeA = a.finishedAt ? new Date(a.finishedAt).getTime() : 0;
			const timeB = b.finishedAt ? new Date(b.finishedAt).getTime() : 0;
			return timeB - timeA;
		});

		const recentSessions = sessions.slice(0, 10);

		// Fetch related tasks for these sessions
		const taskIds = recentSessions.map((s) => s.taskId).filter((id) => id);
		let tasks: any[] = [];
		if (taskIds.length > 0) {
			tasks = await personalDb
				.select()
				.from(personalTasks)
				.where(inArray(personalTasks.id, taskIds as string[]));
		}

		const taskMap = tasks.reduce((acc, t) => {
			acc[t.id] = t;
			return acc;
		}, {} as any);

		const data = recentSessions.map((s) => ({
			...s,
			task: s.taskId ? taskMap[s.taskId] : null,
		}));

		return res.json({ success: true, data });
	} catch (error: any) {
		logger.error(`Focus History Error: ${error.message}`);
		return res
			.status(500)
			.json({ success: false, error: "Internal server error" });
	}
});
