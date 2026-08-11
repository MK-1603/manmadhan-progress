import { and, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import { type Request, type Response, Router } from "express";
import { db } from "../../database/client";
import {
	activities,
	auditLogs,
	projects,
	tasks,
	users,
	workspaceMembers,
} from "../../database/schema";
import { authenticate } from "../middleware/auth.middleware";
import { logger } from "../services/logger.service";

export const orgTimelineRouter = Router();
orgTimelineRouter.use(authenticate);

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

// ─── GET /api/v1/org/timeline (Executive Audit & Execution History) ─────────
orgTimelineRouter.get(
	"/",
	resolveWorkspace,
	requireMembership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const { category, search, actorId, projectId, dateRange } = req.query;

			const now = new Date();
			const todayStart = new Date(
				now.getFullYear(),
				now.getMonth(),
				now.getDate(),
				0,
				0,
				0,
			);

			// Fetch all workspace audit logs enriched with user details
			const logs = await db
				.select({
					id: auditLogs.id,
					eventType: auditLogs.eventType,
					details: auditLogs.details,
					createdAt: auditLogs.createdAt,
					userId: auditLogs.userId,
					userName: users.displayName,
					userEmail: users.email,
					userAvatar: users.avatar,
				})
				.from(auditLogs)
				.leftJoin(users, eq(auditLogs.userId, users.id))
				.where(eq(auditLogs.workspaceId, workspaceId))
				.orderBy(desc(auditLogs.createdAt))
				.limit(200);

			// Fetch projects for name resolution
			const workspaceProjects = await db
				.select({ id: projects.id, name: projects.name })
				.from(projects)
				.where(eq(projects.workspaceId, workspaceId));

			const projectMap = new Map(workspaceProjects.map((p) => [p.id, p.name]));

			// Sanitize and format raw audit logs into human-readable executive sentences
			const formattedEvents = logs.map((l) => {
				const rawDetails = l.details || "";
				const rawType = l.eventType || "SYSTEM";

				// Classify Category
				let cat = "SYSTEM";
				if (rawType.includes("PROJECT")) cat = "Projects";
				else if (rawType.includes("TASK")) cat = "Tasks";
				else if (
					rawType.includes("MEMBER") ||
					rawType.includes("ROLE") ||
					rawType.includes("INVITE") ||
					rawType.includes("LEAVE")
				)
					cat = "People";
				else if (
					rawType.includes("APPROV") ||
					rawType.includes("REJECT") ||
					rawType.includes("DECLIN")
				)
					cat = "Approvals";
				else if (rawType.includes("AUTOMATION")) cat = "Automation";

				// Clean raw UUID references in text details
				let cleanDetails = rawDetails;
				projectMap.forEach((name, pid) => {
					cleanDetails = cleanDetails.replace(pid, `"${name}"`);
				});
				// Strip leftover raw UUID patterns
				cleanDetails = cleanDetails
					.replace(
						/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
						"",
					)
					.replace(/\s+/g, " ")
					.trim();

				const actorName = l.userName || l.userEmail || "System Automation";

				return {
					id: l.id,
					category: cat,
					eventType: rawType,
					actor: {
						id: l.userId,
						name: actorName,
						email: l.userEmail || "",
						avatar: l.userAvatar || null,
					},
					title: rawType.replace(/_/g, " "),
					details: cleanDetails || rawType.replace(/_/g, " "),
					createdAt: l.createdAt,
					isToday: new Date(l.createdAt) >= todayStart,
				};
			});

			// Filter formatted events based on query params
			let filtered = formattedEvents;

			if (category && category !== "All") {
				filtered = filtered.filter(
					(e) => e.category.toLowerCase() === String(category).toLowerCase(),
				);
			}

			if (actorId && actorId !== "All") {
				filtered = filtered.filter((e) => e.actor.id === String(actorId));
			}

			if (search) {
				const q = String(search).toLowerCase();
				filtered = filtered.filter(
					(e) =>
						e.title.toLowerCase().includes(q) ||
						e.details.toLowerCase().includes(q) ||
						e.actor.name.toLowerCase().includes(q),
				);
			}

			if (dateRange === "Today") {
				filtered = filtered.filter((e) => e.isToday);
			} else if (dateRange === "Yesterday") {
				const yestStart = new Date(todayStart.getTime() - 86400000);
				filtered = filtered.filter((e) => {
					const d = new Date(e.createdAt);
					return d >= yestStart && d < todayStart;
				});
			}

			// Top Summary Strip Counts
			const summary = {
				todayCount: formattedEvents.filter((e) => e.isToday).length,
				projectsCount: formattedEvents.filter((e) => e.category === "Projects")
					.length,
				tasksCount: formattedEvents.filter((e) => e.category === "Tasks")
					.length,
				peopleCount: formattedEvents.filter((e) => e.category === "People")
					.length,
				approvalsCount: formattedEvents.filter(
					(e) => e.category === "Approvals",
				).length,
				automationCount: formattedEvents.filter(
					(e) => e.category === "Automation",
				).length,
			};

			res.json({
				success: true,
				data: {
					summary,
					events: filtered,
					projects: workspaceProjects,
				},
			});
		} catch (err: any) {
			logger.error(
				"Get timeline error: " + (err?.stack || err?.message || String(err)),
			);
			res
				.status(500)
				.json({
					success: false,
					error: "Failed to load organization execution timeline",
				});
		}
	},
);
