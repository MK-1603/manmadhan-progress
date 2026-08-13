import { and, desc, eq } from "drizzle-orm";
import { type Request, type Response, Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "../../database/client";
import { reminders, workspaceMembers } from "../../database/schema";
import { authenticate } from "../middleware/auth.middleware";
import { logger } from "../services/logger.service";

export const personalRouter = Router();
personalRouter.use(authenticate);

// ─── Helper: resolve a workspaceId for the current user ───────────────────────
async function resolveWorkspaceId(req: Request): Promise<string | null> {
	const userId = (req as any).user?.id;
	if (!userId) return null;
	// Prefer query/body param
	const fromQuery = String(
		req.query.workspaceId || req.body?.workspaceId || "",
	).trim();
	if (fromQuery && fromQuery !== "undefined" && fromQuery !== "null")
		return fromQuery;
	// Fall back to first workspace membership
	const [m] = await db
		.select()
		.from(workspaceMembers)
		.where(eq(workspaceMembers.userId, userId))
		.limit(1);
	return m?.workspaceId ?? null;
}

// ─── GET /personal/reminders ──────────────────────────────────────────────────
personalRouter.get("/reminders", async (req: Request, res: Response) => {
	try {
		const userId = (req as any).user?.id;
		if (!userId)
			return res.status(401).json({ success: false, error: "Unauthorized" });

		const workspaceId = await resolveWorkspaceId(req);
		if (!workspaceId)
			return res
				.status(400)
				.json({ success: false, error: "Workspace not found" });

		let query;
		if (workspaceId) {
			query = db
				.select()
				.from(reminders)
				.where(
					and(
						eq(reminders.userId, userId),
						eq(reminders.workspaceId, workspaceId),
					),
				)
				.orderBy(desc(reminders.remindAt));
		} else {
			query = db
				.select()
				.from(reminders)
				.where(eq(reminders.userId, userId))
				.orderBy(desc(reminders.remindAt));
		}
		const data = await query;
		return res.json({ success: true, data });
	} catch (err: any) {
		logger.error(`GET /personal/reminders: ${err.message}`);
		return res
			.status(500)
			.json({ success: false, error: "Failed to fetch reminders" });
	}
});

// ─── POST /personal/reminders ─────────────────────────────────────────────────
personalRouter.post("/reminders", async (req: Request, res: Response) => {
	try {
		const userId = (req as any).user?.id;
		if (!userId)
			return res.status(401).json({ success: false, error: "Unauthorized" });

		const workspaceId = await resolveWorkspaceId(req);
		if (!workspaceId)
			return res
				.status(400)
				.json({ success: false, error: "Workspace not found" });

		const { title, remindAt, taskId } = req.body;
		if (!title?.trim())
			return res
				.status(400)
				.json({ success: false, error: "Title is required" });
		if (!remindAt)
			return res
				.status(400)
				.json({ success: false, error: "Remind-at time is required" });

		const [created] = await db
			.insert(reminders)
			.values({
				id: uuidv4(),
				userId,
				workspaceId,
				title: title.trim(),
				remindAt: new Date(remindAt),
				taskId: taskId || null,
				isCompleted: false,
			})
			.returning();

		return res.status(201).json({ success: true, data: created });
	} catch (err: any) {
		logger.error(`POST /personal/reminders: ${err.message}`);
		return res
			.status(500)
			.json({ success: false, error: "Failed to create reminder" });
	}
});

// ─── PATCH /personal/reminders/:id ───────────────────────────────────────────
personalRouter.patch("/reminders/:id", async (req: Request, res: Response) => {
	try {
		const userId = (req as any).user?.id;
		if (!userId)
			return res.status(401).json({ success: false, error: "Unauthorized" });

		const { isCompleted } = req.body;
		const updateData: any = {};
		if (isCompleted !== undefined)
			updateData.isCompleted = Boolean(isCompleted);

		const [updated] = await db
			.update(reminders)
			.set(updateData)
			.where(and(eq(reminders.id, req.params.id), eq(reminders.userId, userId)))
			.returning();

		if (!updated)
			return res
				.status(404)
				.json({ success: false, error: "Reminder not found" });
		return res.json({ success: true, data: updated });
	} catch (err: any) {
		logger.error(`PATCH /personal/reminders: ${err.message}`);
		return res
			.status(500)
			.json({ success: false, error: "Failed to update reminder" });
	}
});

// ─── DELETE /personal/reminders/:id ──────────────────────────────────────────
personalRouter.delete("/reminders/:id", async (req: Request, res: Response) => {
	try {
		const userId = (req as any).user?.id;
		if (!userId)
			return res.status(401).json({ success: false, error: "Unauthorized" });

		await db
			.delete(reminders)
			.where(
				and(eq(reminders.id, req.params.id), eq(reminders.userId, userId)),
			);

		return res.json({ success: true, message: "Deleted" });
	} catch (err: any) {
		logger.error(`DELETE /personal/reminders: ${err.message}`);
		return res
			.status(500)
			.json({ success: false, error: "Failed to delete reminder" });
	}
});

// ─── Legacy dashboard sample ──────────────────────────────────────────────────
personalRouter.get("/dashboard", (_req: Request, res: Response) => {
	res.json({ success: true, message: "Welcome to Personal Space" });
});
