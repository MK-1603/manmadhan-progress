import { and, desc, eq } from "drizzle-orm";
import { type Request, type Response, Router } from "express";
import { db } from "../../database/client";
import {
	auditLogs,
	projects,
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

function humanizeTitle(rawType: string): string {
	if (!rawType) return "System Activity";
	const upper = rawType.toUpperCase();
	switch (upper) {
		case "PROJECT_CREATED": return "Project created";
		case "PROJECT_UPDATED": return "Project updated";
		case "PROJECT_DELETED": return "Project deleted";
		case "TASK_CREATED": return "Task created";
		case "TASK_ASSIGNED": return "Task assigned";
		case "TASK_ACCEPTED": return "Task accepted";
		case "TASK_COMPLETED": return "Task completed";
		case "TASK_UPDATED": return "Task updated";
		case "TASK_DELETED": return "Task deleted";
		case "PEOPLE_INVITED":
		case "INVITATION_SENT": return "Invitation sent";
		case "INVITATION_ACCEPTED": return "Invitation accepted";
		case "INVITATION_CANCELLED": return "Invitation cancelled";
		case "APPROVAL_REQUESTED": return "Approval requested";
		case "WORK_APPROVED": return "Work approved";
		case "WORK_REJECTED": return "Work rejected";
		case "AUTOMATION_CREATED": return "Automation created";
		case "AUTOMATION_UPDATED": return "Automation updated";
		case "AUTOMATION_PAUSED": return "Automation paused";
		case "AUTOMATION_RESUMED": return "Automation resumed";
		case "FOCUS_STARTED": return "Focus session started";
		case "FOCUS_COMPLETED": return "Focus session completed";
		default: {
			return upper
				.replace(/_/g, " ")
				.toLowerCase()
				.replace(/\b\w/g, (c) => c.toUpperCase());
		}
	}
}

function humanizeDetails(details: any, eventType: string): string {
	if (!details) return humanizeTitle(eventType);

	let str = typeof details === "object" ? JSON.stringify(details) : String(details).trim();

	if (str.startsWith("{") && str.endsWith("}")) {
		try {
			const parsed = JSON.parse(str);
			if (parsed.name || parsed.title || parsed.projectName || parsed.taskTitle) {
				return String(parsed.name || parsed.title || parsed.projectName || parsed.taskTitle);
			}
			if (parsed.message) return String(parsed.message);
		} catch {}
		return humanizeTitle(eventType);
	}

	str = str
		.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "")
		.replace(/["'{}\[\]]/g, "")
		.replace(/\s+/g, " ")
		.trim();

	if (!str || str.length < 2) return humanizeTitle(eventType);
	return str;
}

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

				const title = humanizeTitle(rawType);
				const details = humanizeDetails(rawDetails, rawType);
				const actorName = l.userName || l.userEmail || "System";

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
					title,
					details,
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
				`Get timeline error: ${err?.stack || err?.message || String(err)}`,
			);
			res.status(500).json({
				success: false,
				error: "Failed to load organization execution timeline",
			});
		}
	},
);
