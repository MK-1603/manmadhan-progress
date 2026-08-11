import { and, eq, gte, isNotNull, lte, or } from "drizzle-orm";
import { type Request, type Response, Router } from "express";
import { personalDb } from "../../../database/client";
import { personalProjects, personalTasks } from "../../../database/schema";
import { authenticate } from "../../middleware/auth.middleware";
import { logger } from "../../services/logger.service";

export const personalCalendarRouter = Router();

personalCalendarRouter.use(authenticate);

const getUserId = (req: Request) => (req as any).user?.id;

// Get calendar events for a specific date range
personalCalendarRouter.get("/", async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req);
		if (!userId)
			return res.status(401).json({ success: false, error: "Unauthorized" });

		const { start, end } = req.query;

		if (!start || !end) {
			return res
				.status(400)
				.json({ success: false, error: "Start and end dates are required" });
		}

		const startDate = new Date(start as string);
		const endDate = new Date(end as string);

		// Fetch Tasks that are scheduled within this range
		const tasks = await personalDb.query.personalTasks.findMany({
			where: and(
				eq(personalTasks.ownerUserId, userId),
				or(
					and(
						gte(personalTasks.scheduledStart, startDate),
						lte(personalTasks.scheduledStart, endDate),
					),
					and(
						gte(personalTasks.deadline, startDate),
						lte(personalTasks.deadline, endDate),
					),
				),
			),
			with: {
				project: true,
			},
		});

		// Fetch Projects with deadlines in this range
		const projects = await personalDb.query.personalProjects.findMany({
			where: and(
				eq(personalProjects.ownerUserId, userId),
				isNotNull(personalProjects.deadline),
				gte(personalProjects.deadline, startDate),
				lte(personalProjects.deadline, endDate),
			),
		});

		// Format them into a unified event format for the frontend calendar
		const events: any[] = [];

		tasks.forEach((task) => {
			if (task.scheduledStart) {
				events.push({
					id: `task-${task.id}`,
					title: task.title,
					start: task.scheduledStart,
					end:
						task.scheduledEnd ||
						new Date(
							new Date(task.scheduledStart).getTime() +
								(task.estimatedMinutes || 60) * 60000,
						),
					type: "task",
					status: task.status,
					source: task,
				});
			}

			// If a task has a strict deadline, we could optionally show it as an all-day deadline event
			if (task.deadline && !task.scheduledStart) {
				events.push({
					id: `deadline-task-${task.id}`,
					title: `Deadline: ${task.title}`,
					start: task.deadline,
					end: task.deadline,
					type: "deadline",
					allDay: true,
					status: task.status,
					source: task,
				});
			}
		});

		projects.forEach((project) => {
			if (project.deadline) {
				events.push({
					id: `deadline-project-${project.id}`,
					title: `Project Deadline: ${project.name}`,
					start: project.deadline,
					end: project.deadline,
					type: "deadline",
					allDay: true,
					status: project.status,
					source: project,
				});
			}
		});

		res.json({ success: true, data: events });
	} catch (error: any) {
		logger.error("Fetch Personal Calendar Error: " + error.message);
		res
			.status(500)
			.json({ success: false, error: "Failed to fetch calendar events" });
	}
});
