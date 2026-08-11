import { and, desc, eq, gte, lte, or, sql } from "drizzle-orm";
import { type Request, type Response, Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "../../database/client";
import {
	auditLogs,
	deadlineExtensions,
	leaderboardCache,
	leaves,
	projects,
	scoreLedger,
	tasks,
	timeTracking,
	users,
	workspaceMembers,
} from "../../database/schema";
import { authenticate } from "../middleware/auth.middleware";
import { logger } from "../services/logger.service";

export const orgReportsRouter = Router();
orgReportsRouter.use(authenticate);

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

// ─── Organization Overview Report ────────────────────────────────────────────
orgReportsRouter.get(
	"/overview",
	resolveWorkspace,
	requireMembership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const membership = (req as any).membership;
			const userId = (req as any).user?.id;
			const { period = "monthly" } = req.query;

			const now = new Date();
			let startDate: Date;
			if (period === "daily")
				startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
			else if (period === "weekly") {
				startDate = new Date(now);
				startDate.setDate(now.getDate() - 7);
			} else startDate = new Date(now.getFullYear(), now.getMonth(), 1);

			// Projects stats
			const allProjects = await db
				.select()
				.from(projects)
				.where(eq(projects.workspaceId, workspaceId));
			const projectStats = {
				total: allProjects.length,
				active: allProjects.filter((p) => p.status === "Active").length,
				planning: allProjects.filter((p) => p.status === "Planning").length,
				completed: allProjects.filter((p) => p.status === "Completed").length,
				onHold: allProjects.filter((p) => p.status === "On Hold").length,
				healthy: allProjects.filter((p) => p.health === "Healthy").length,
				atRisk: allProjects.filter((p) => p.health === "At Risk").length,
				offTrack: allProjects.filter((p) => p.health === "Off Track").length,
			};

			// Tasks stats
			let taskQuery = eq(tasks.workspaceId, workspaceId);
			if (membership.role === "MEMBER")
				taskQuery = and(
					eq(tasks.workspaceId, workspaceId),
					eq(tasks.assigneeId, userId),
				) as any;
			const allTasks = await db.select().from(tasks).where(taskQuery);
			const taskStats = {
				total: allTasks.length,
				completed: allTasks.filter(
					(t) => t.status === "Completed" || t.status === "Approved",
				).length,
				inProgress: allTasks.filter((t) => t.status === "In Progress").length,
				review: allTasks.filter((t) => t.status === "Review").length,
				overdue: allTasks.filter(
					(t) =>
						t.deadline &&
						new Date(t.deadline) < now &&
						t.status !== "Completed" &&
						t.status !== "Approved",
				).length,
			};

			// Working hours
			const allSessions = await db
				.select()
				.from(timeTracking)
				.where(
					and(
						eq(timeTracking.workspaceId, workspaceId),
						gte(timeTracking.startTime, startDate),
					),
				);
			const totalHours =
				allSessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0) /
				3600;

			// Planned vs actual (using estimatedMinutes vs actual tracked time)
			const plannedMinutes = allTasks.reduce(
				(acc, t) => acc + (t.estimatedMinutes || 0),
				0,
			);
			const actualMinutes = totalHours * 60;

			// Team performance
			let memberIds: string[] = [];
			if (membership.role === "CEO") {
				const members = await db
					.select({ id: workspaceMembers.userId })
					.from(workspaceMembers)
					.where(eq(workspaceMembers.workspaceId, workspaceId));
				memberIds = members.map((m) => m.id);
			} else if (membership.role === "CO-CEO") {
				const myMembers = await db
					.select({ id: users.id })
					.from(users)
					.where(eq(users.managerId, userId));
				memberIds = [userId, ...myMembers.map((m) => m.id)];
			} else {
				memberIds = [userId];
			}

			const teamPerformance = await Promise.all(
				memberIds.slice(0, 10).map(async (mid) => {
					const memberUser = await db.query.users.findFirst({
						where: eq(users.id, mid),
					});
					const memberTasks = await db
						.select()
						.from(tasks)
						.where(
							and(
								eq(tasks.workspaceId, workspaceId),
								eq(tasks.assigneeId, mid),
							),
						);
					const completedCount = memberTasks.filter(
						(t) => t.status === "Completed" || t.status === "Approved",
					).length;
					const overdueCount = memberTasks.filter(
						(t) =>
							t.deadline &&
							new Date(t.deadline) < now &&
							t.status !== "Completed" &&
							t.status !== "Approved",
					).length;
					const memberSessions = await db
						.select()
						.from(timeTracking)
						.where(
							and(
								eq(timeTracking.workspaceId, workspaceId),
								eq(timeTracking.userId, mid),
								gte(timeTracking.startTime, startDate),
							),
						);
					const hoursLogged =
						memberSessions.reduce(
							(acc, s) => acc + (s.durationSeconds || 0),
							0,
						) / 3600;
					const totalMemberTasks = memberTasks.length;
					const completionRate =
						totalMemberTasks > 0
							? Math.round((completedCount / totalMemberTasks) * 100)
							: 0;
					return {
						id: mid,
						name: memberUser?.displayName || memberUser?.name || "Unknown",
						role: memberUser?.role || "MEMBER",
						tasksCompleted: completedCount,
						tasksOverdue: overdueCount,
						hoursLogged: Math.round(hoursLogged * 10) / 10,
						completionRate,
					};
				}),
			);

			// Deadline performance
			const deadlineExt = await db
				.select()
				.from(deadlineExtensions)
				.where(
					and(
						eq(deadlineExtensions.workspaceId, workspaceId),
						gte(deadlineExtensions.createdAt, startDate),
					),
				);
			const deadlineStats = {
				extensions: deadlineExt.length,
				approved: deadlineExt.filter((d) => d.status === "Approved").length,
				pending: deadlineExt.filter((d) => d.status === "Pending").length,
			};

			// Work hours trend (last 7 days for chart)
			const trendDays = 7;
			const hoursTrend = [];
			for (let i = trendDays - 1; i >= 0; i--) {
				const dayStart = new Date(now);
				dayStart.setDate(now.getDate() - i);
				dayStart.setHours(0, 0, 0, 0);
				const dayEnd = new Date(dayStart);
				dayEnd.setHours(23, 59, 59, 999);
				const daySessions = await db
					.select()
					.from(timeTracking)
					.where(
						and(
							eq(timeTracking.workspaceId, workspaceId),
							gte(timeTracking.startTime, dayStart),
							lte(timeTracking.startTime, dayEnd),
						),
					);
				const dayHours =
					daySessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0) /
					3600;
				hoursTrend.push({
					date: dayStart.toISOString().split("T")[0],
					hours: Math.round(dayHours * 10) / 10,
				});
			}

			// Task completion trend (last 7 days)
			const completionTrend = [];
			for (let i = trendDays - 1; i >= 0; i--) {
				const dayStart = new Date(now);
				dayStart.setDate(now.getDate() - i);
				dayStart.setHours(0, 0, 0, 0);
				const dayEnd = new Date(dayStart);
				dayEnd.setHours(23, 59, 59, 999);
				const completedTasks = allTasks.filter(
					(t) =>
						t.completedAt &&
						new Date(t.completedAt) >= dayStart &&
						new Date(t.completedAt) <= dayEnd,
				).length;
				completionTrend.push({
					date: dayStart.toISOString().split("T")[0],
					completed: completedTasks,
				});
			}

			res.json({
				success: true,
				data: {
					period,
					projectStats,
					taskStats,
					workingHours: {
						total: Math.round(totalHours * 10) / 10,
						startDate: startDate.toISOString(),
					},
					plannedVsActual: {
						plannedMinutes: Math.round(plannedMinutes),
						actualMinutes: Math.round(actualMinutes),
					},
					teamPerformance,
					deadlineStats,
					charts: { hoursTrend, completionTrend },
				},
			});
		} catch (err: any) {
			logger.error("Reports overview error: " + err.message);
			res.status(500).json({ success: false, error: "Internal server error" });
		}
	},
);

// ─── Leaderboard ──────────────────────────────────────────────────────────────
orgReportsRouter.get(
	"/leaderboard",
	resolveWorkspace,
	requireMembership,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const membership = (req as any).membership;
			const userId = (req as any).user?.id;
			const { period = "weekly" } = req.query;

			const now = new Date();
			let startDate: Date;
			if (period === "weekly") {
				startDate = new Date(now);
				startDate.setDate(now.getDate() - 7);
			} else if (period === "monthly")
				startDate = new Date(now.getFullYear(), now.getMonth(), 1);
			else startDate = new Date(0); // alltime

			// Get all members for this workspace
			const members = await db
				.select({
					id: users.id,
					name: users.name,
					displayName: users.displayName,
					avatar: users.avatar,
					role: workspaceMembers.role,
				})
				.from(workspaceMembers)
				.innerJoin(users, eq(workspaceMembers.userId, users.id))
				.where(eq(workspaceMembers.workspaceId, workspaceId));

			// Calculate scores
			const scores = await Promise.all(
				members.map(async (m) => {
					// Points from score ledger
					const ledgerEntries = await db
						.select({ points: scoreLedger.points })
						.from(scoreLedger)
						.where(
							and(
								eq(scoreLedger.workspaceId, workspaceId),
								eq(scoreLedger.userId, m.id),
								gte(scoreLedger.createdAt, startDate),
							),
						);
					const totalPoints = ledgerEntries.reduce(
						(acc, e) => acc + e.points,
						0,
					);

					// Tasks completed
					const completedTasks = await db
						.select({ count: sql<number>`count(*)` })
						.from(tasks)
						.where(
							and(
								eq(tasks.workspaceId, workspaceId),
								eq(tasks.assigneeId, m.id),
								or(eq(tasks.status, "Completed"), eq(tasks.status, "Approved")),
								gte(tasks.completedAt as any, startDate),
							),
						);

					// Hours logged
					const sessions = await db
						.select()
						.from(timeTracking)
						.where(
							and(
								eq(timeTracking.workspaceId, workspaceId),
								eq(timeTracking.userId, m.id),
								gte(timeTracking.startTime, startDate),
							),
						);
					const hoursLogged =
						sessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0) /
						3600;

					// On-time delivery
					const tasksDone = await db
						.select()
						.from(tasks)
						.where(
							and(
								eq(tasks.workspaceId, workspaceId),
								eq(tasks.assigneeId, m.id),
								or(eq(tasks.status, "Completed"), eq(tasks.status, "Approved")),
							),
						);
					const onTime = tasksDone.filter(
						(t) =>
							!t.deadline ||
							(t.completedAt &&
								new Date(t.completedAt) <= new Date(t.deadline)),
					).length;
					const onTimeRate =
						tasksDone.length > 0
							? Math.round((onTime / tasksDone.length) * 100)
							: 0;

					const tasksCount = Number(completedTasks[0].count);
					const score =
						totalPoints +
						tasksCount * 10 +
						Math.round(hoursLogged * 2) +
						Math.round(onTimeRate / 10);

					return {
						id: m.id,
						name: m.displayName || m.name,
						role: m.role,
						avatar: m.avatar,
						score,
						tasksCompleted: tasksCount,
						hoursLogged: Math.round(hoursLogged * 10) / 10,
						onTimeRate,
						points: totalPoints,
					};
				}),
			);

			// Sort and rank
			const sorted = scores
				.sort((a, b) => b.score - a.score)
				.map((s, i) => ({ ...s, rank: i + 1 }));

			// Members can only see their own position + top 5
			let visible = sorted;
			if (membership.role === "MEMBER") {
				const myEntry = sorted.find((s) => s.id === userId);
				const top5 = sorted.slice(0, 5);
				const existing = new Set(top5.map((s) => s.id));
				if (myEntry && !existing.has(myEntry.id)) visible = [...top5, myEntry];
				else visible = top5;
			}

			res.json({ success: true, data: { period, leaderboard: visible } });
		} catch (err: any) {
			logger.error("Leaderboard error: " + err.message);
			res.status(500).json({ success: false, error: "Internal server error" });
		}
	},
);

export default orgReportsRouter;
