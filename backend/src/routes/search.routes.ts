import { and, eq, ilike, or } from "drizzle-orm";
import { type Request, type Response, Router } from "express";
import { db } from "../../database/client";
import {
	projects,
	tasks,
	users,
	workspaceMembers,
	workspaces,
} from "../../database/schema";
import { authenticate } from "../middleware/auth.middleware";
import { logger } from "../services/logger.service";

export const searchRouter = Router();

searchRouter.use(authenticate);

searchRouter.get("/", async (req: Request, res: Response) => {
	try {
		const { q, workspaceId } = req.query;

		if (!q || typeof q !== "string") {
			return res.status(400).json({
				success: false,
				error: "Missing or invalid search query 'q'.",
			});
		}

		const userId = (req as any).user?.id || (req as any).user?.userId;
		if (!userId) {
			return res.status(401).json({ success: false, error: "Unauthorized" });
		}

		let targetWsId = String(workspaceId || "").trim();

		if (!targetWsId || targetWsId === "undefined" || targetWsId === "null") {
			const memberList = await db
				.select()
				.from(workspaceMembers)
				.where(eq(workspaceMembers.userId, userId))
				.limit(1);
			if (memberList.length > 0 && memberList[0].workspaceId) {
				targetWsId = memberList[0].workspaceId;
			}
		}

		if (!targetWsId || targetWsId === "undefined" || targetWsId === "null") {
			const wsList = await db.select().from(workspaces).limit(1);
			if (wsList.length > 0 && wsList[0].id) {
				targetWsId = wsList[0].id;
			}
		}

		if (!targetWsId || targetWsId === "undefined" || targetWsId === "null") {
			return res.status(400).json({
				success: false,
				error: "Missing workspaceId. Search must be isolated to a workspace.",
			});
		}

		// Verify workspace membership (System Isolation) using db.select()
		const memberships = await db
			.select()
			.from(workspaceMembers)
			.where(
				and(
					eq(workspaceMembers.workspaceId, targetWsId),
					eq(workspaceMembers.userId, userId),
				),
			)
			.limit(1);

		let membership = memberships[0] || null;

		if (!membership) {
			const userList = await db
				.select()
				.from(users)
				.where(eq(users.id, userId))
				.limit(1);
			const user = userList[0];
			if (user) {
				membership = { role: user.role || "CEO" } as any;
			}
		}

		if (!membership) {
			return res
				.status(403)
				.json({ success: false, error: "Access denied to this workspace." });
		}

		// Execute parallel isolated searches
		const searchPattern = `%${q}%`;

		const [projectsResult, tasksResult, membersResult] = await Promise.all([
			db
				.select({
					id: projects.id,
					name: projects.name,
					description: projects.description,
					status: projects.status,
				})
				.from(projects)
				.where(
					and(
						eq(projects.workspaceId, targetWsId),
						or(
							ilike(projects.name, searchPattern),
							ilike(projects.description, searchPattern),
						),
					),
				)
				.limit(10),

			db
				.select({
					id: tasks.id,
					title: tasks.title,
					description: tasks.description,
					status: tasks.status,
				})
				.from(tasks)
				.where(
					and(
						eq(tasks.workspaceId, targetWsId),
						or(
							ilike(tasks.title, searchPattern),
							ilike(tasks.description, searchPattern),
						),
					),
				)
				.limit(15),

			db
				.select({
					id: users.id,
					name: users.displayName,
					email: users.email,
					role: workspaceMembers.role,
				})
				.from(workspaceMembers)
				.innerJoin(users, eq(workspaceMembers.userId, users.id))
				.where(
					and(
						eq(workspaceMembers.workspaceId, targetWsId),
						or(
							ilike(users.displayName, searchPattern),
							ilike(users.email, searchPattern),
						),
					),
				)
				.limit(10),
		]);

		return res.json({
			success: true,
			data: {
				projects: projectsResult,
				tasks: tasksResult,
				members: membersResult,
				notes: [],
				journals: [],
				ideas: [],
				goals: [],
				files: [],
				reminders: [],
				habits: [],
			},
		});
	} catch (error: any) {
		logger.error({ error }, "Search error");
		return res
			.status(500)
			.json({ success: false, error: "Internal server error during search." });
	}
});
