import { and, eq } from "drizzle-orm";
import { type Request, type Response, Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { personalDb } from "../../../database/client";
import { personalTasks } from "../../../database/schema";
import { authenticate } from "../../middleware/auth.middleware";
import { logger } from "../../services/logger.service";
import { socketService } from "../../services/socket.service";

export const personalTasksRouter = Router();

personalTasksRouter.use(authenticate);

const getUserId = (req: Request) => (req as any).user?.id;

// Get all tasks (can filter by project, date, etc. later)
personalTasksRouter.get("/", async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req);
		if (!userId)
			return res.status(401).json({ success: false, error: "Unauthorized" });

		const { projectId, status } = req.query;

		const conditions = [eq(personalTasks.ownerUserId, userId)];

		if (projectId)
			conditions.push(eq(personalTasks.projectId, String(projectId)));
		if (status) conditions.push(eq(personalTasks.status, String(status)));

		const tasks = await personalDb.query.personalTasks.findMany({
			where: and(...conditions),
			orderBy: (tasks, { asc }) => [asc(tasks.deadline), asc(tasks.createdAt)],
			with: {
				project: true,
			},
		});

		res.json({ success: true, data: tasks });
	} catch (error: any) {
		logger.error(`Fetch Personal Tasks Error: ${error.message}`);
		res.status(500).json({ success: false, error: "Failed to fetch tasks" });
	}
});

// Create a new task
personalTasksRouter.post("/", async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req);
		if (!userId)
			return res.status(401).json({ success: false, error: "Unauthorized" });

		const {
			title,
			description,
			projectId,
			milestoneId,
			type,
			priority,
			deadline,
			estimatedMinutes,
			scheduledStart,
			scheduledEnd,
		} = req.body;

		if (!title) {
			return res
				.status(400)
				.json({ success: false, error: "Task title is required" });
		}

		const newId = uuidv4();
		const [task] = await personalDb
			.insert(personalTasks)
			.values({
				id: newId,
				ownerUserId: userId,
				title,
				description,
				projectId: projectId || null,
				milestoneId: milestoneId || null,
				type: type || "Task",
				status: "TODO",
				priority: priority || "Medium",
				deadline: deadline ? new Date(deadline) : null,
				estimatedMinutes: estimatedMinutes || null,
				scheduledStart: scheduledStart ? new Date(scheduledStart) : null,
				scheduledEnd: scheduledEnd ? new Date(scheduledEnd) : null,
			})
			.returning();

		socketService.emitToUser(userId, "task_created", task);

		res.json({ success: true, data: task });
	} catch (error: any) {
		logger.error(`Create Personal Task Error: ${error.message}`);
		res.status(500).json({ success: false, error: "Failed to create task" });
	}
});

// Update a task
personalTasksRouter.patch("/:id", async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req);
		const taskId = req.params.id;
		if (!userId)
			return res.status(401).json({ success: false, error: "Unauthorized" });

		const {
			title,
			description,
			status,
			priority,
			deadline,
			estimatedMinutes,
			scheduledStart,
			scheduledEnd,
		} = req.body;

		const existing = await personalDb.query.personalTasks.findFirst({
			where: and(
				eq(personalTasks.id, String(taskId)),
				eq(personalTasks.ownerUserId, userId),
			),
		});

		if (!existing) {
			return res.status(404).json({ success: false, error: "Task not found" });
		}

		const updateData: any = { updatedAt: new Date() };
		if (title !== undefined) updateData.title = title;
		if (description !== undefined) updateData.description = description;
		if (status !== undefined) updateData.status = status;
		if (priority !== undefined) updateData.priority = priority;
		if (deadline !== undefined)
			updateData.deadline = deadline ? new Date(deadline) : null;
		if (estimatedMinutes !== undefined)
			updateData.estimatedMinutes = estimatedMinutes;
		if (scheduledStart !== undefined)
			updateData.scheduledStart = scheduledStart
				? new Date(scheduledStart)
				: null;
		if (scheduledEnd !== undefined)
			updateData.scheduledEnd = scheduledEnd ? new Date(scheduledEnd) : null;

		if (
			(status === "Completed" || status === "COMPLETED") &&
			existing.status !== "Completed" &&
			existing.status !== "COMPLETED"
		) {
			updateData.completedAt = new Date();
		}

		const [updated] = await personalDb
			.update(personalTasks)
			.set(updateData)
			.where(
				and(
					eq(personalTasks.id, String(taskId)),
					eq(personalTasks.ownerUserId, userId),
				),
			)
			.returning();

		socketService.emitToUser(userId, "task_updated", updated);

		// Write timeline event on task completion
		if (
			(status === "Completed" || status === "COMPLETED") &&
			existing.status !== "Completed" &&
			existing.status !== "COMPLETED"
		) {
			try {
				const { writeTimelineEvent } = require("./timeline.routes");
				await writeTimelineEvent(
					userId,
					"TASK_COMPLETED",
					`Completed task: ${updated.title}`,
					{
						taskId: String(taskId),
						projectId: updated.projectId || undefined,
					},
				);
			} catch {
				/* non-fatal */
			}
		}

		res.json({ success: true, data: updated });
	} catch (error: any) {
		logger.error(`Update Personal Task Error: ${error.message}`);
		res.status(500).json({ success: false, error: "Failed to update task" });
	}
});

// Delete a task
personalTasksRouter.delete("/:id", async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req);
		const taskId = req.params.id;
		if (!userId)
			return res.status(401).json({ success: false, error: "Unauthorized" });

		const existing = await personalDb.query.personalTasks.findFirst({
			where: and(
				eq(personalTasks.id, String(taskId)),
				eq(personalTasks.ownerUserId, userId),
			),
		});

		if (!existing) {
			return res.status(404).json({ success: false, error: "Task not found" });
		}

		await personalDb
			.delete(personalTasks)
			.where(eq(personalTasks.id, String(taskId)));

		socketService.emitToUser(userId, "task_deleted", { id: taskId });

		res.json({ success: true, message: "Task deleted successfully" });
	} catch (error: any) {
		logger.error(`Delete Personal Task Error: ${error.message}`);
		res.status(500).json({ success: false, error: "Failed to delete task" });
	}
});

// Generate Task via AI (Real AI generation)
personalTasksRouter.post(
	"/generate-task",
	async (req: Request, res: Response) => {
		try {
			const userId = getUserId(req);
			if (!userId)
				return res.status(401).json({ success: false, error: "Unauthorized" });

			const { prompt } = req.body;
			if (!prompt)
				return res
					.status(400)
					.json({ success: false, error: "Prompt is required" });

			const { aiService } = require("../../services/ai.service");
			const currentDate = new Date().toISOString().split("T")[0];

			const systemPrompt = `You are a personal task planning assistant for ManMadhan Progress.
Generate a structured task plan from the user prompt.
Output ONLY valid JSON. No markdown, no backticks.
Current date: ${currentDate}

JSON structure:
{
  "title": "string",
  "description": "string",
  "type": "Development|Documentation|Design|Research|Testing|Meeting|Other",
  "priority": "Low|Medium|High",
  "estimatedMinutes": number,
  "deadline": "YYYY-MM-DD or null",
  "scheduledStart": "ISO datetime or null",
  "scheduledEnd": "ISO datetime or null",
  "requiresDocument": false,
  "requiresGithub": false
}

User prompt: "${prompt}"`;

			try {
				const aiResponse = await aiService.generateWithSmartFailover(
					systemPrompt,
					"groq",
				);
				const cleanedText = aiResponse.text
					.replace(/```json/g, "")
					.replace(/```/g, "")
					.trim();
				const plan = JSON.parse(cleanedText);
				res.json({ success: true, data: plan });
			} catch (_aiErr: any) {
				const tomorrow = new Date();
				tomorrow.setDate(tomorrow.getDate() + 1);
				tomorrow.setHours(9, 0, 0, 0);
				const end = new Date(tomorrow);
				end.setHours(10, 0, 0, 0);
				res.json({
					success: true,
					data: {
						title:
							prompt.length > 60 ? `${prompt.substring(0, 57)}...` : prompt,
						description: prompt,
						type: "Task",
						priority: "Medium",
						estimatedMinutes: 60,
						deadline: null,
						scheduledStart: tomorrow,
						scheduledEnd: end,
						requiresDocument: false,
						requiresGithub: false,
					},
				});
			}
		} catch (error: any) {
			logger.error(`Generate Task Plan Error: ${error.message}`);
			res
				.status(500)
				.json({ success: false, error: "Failed to generate task plan" });
		}
	},
);
