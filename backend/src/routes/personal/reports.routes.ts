import { and, desc, eq, gte, lte, not, or } from "drizzle-orm";
import { type Request, type Response, Router } from "express";
import { personalDb } from "../../../database/client";
import {
	personalFocusSessions,
	personalMilestones,
	personalProjects,
	personalTasks,
} from "../../../database/schema/personal.schema";
import { authenticate } from "../../middleware/auth.middleware";
import { logger } from "../../services/logger.service";

export const personalReportsRouter = Router();
personalReportsRouter.use(authenticate);

const getUserId = (req: Request) => (req as any).user?.id;

// GET /api/v1/personal/reports/overview?period=weekly|monthly|daily
personalReportsRouter.get("/overview", async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req);
		if (!userId)
			return res.status(401).json({ success: false, error: "Unauthorized" });

		const period = (req.query.period as string) || "weekly";
		const now = new Date();

		let startDate: Date;
		if (period === "daily") {
			startDate = new Date(
				now.getFullYear(),
				now.getMonth(),
				now.getDate(),
				0,
				0,
				0,
			);
		} else if (period === "monthly") {
			startDate = new Date(now.getFullYear(), now.getMonth(), 1);
		} else {
			// weekly — last 7 days
			startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
			startDate.setHours(0, 0, 0, 0);
		}

		const todayStart = new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate(),
			0,
			0,
			0,
		);
		const todayEnd = new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate(),
			23,
			59,
			59,
		);

		// All tasks for period
		const allTasks = await personalDb
			.select()
			.from(personalTasks)
			.where(eq(personalTasks.ownerUserId, userId));

		const completedInPeriod = allTasks.filter(
			(t) =>
				(t.status === "COMPLETED" || t.status === "Completed") &&
				t.completedAt &&
				new Date(t.completedAt) >= startDate,
		);

		const overdueTasks = allTasks.filter(
			(t) =>
				t.deadline &&
				new Date(t.deadline) < now &&
				t.status !== "COMPLETED" &&
				t.status !== "Completed",
		);

		const todayTasks = allTasks.filter(
			(t) =>
				t.deadline &&
				new Date(t.deadline) >= todayStart &&
				new Date(t.deadline) <= todayEnd,
		);

		const completedToday = todayTasks.filter(
			(t) => t.status === "COMPLETED" || t.status === "Completed",
		);

		// Projects
		const allProjects = await personalDb
			.select()
			.from(personalProjects)
			.where(eq(personalProjects.ownerUserId, userId));

		const activeProjects = allProjects.filter(
			(p) =>
				p.status === "Active" ||
				p.status === "Planning" ||
				p.status === "In Progress",
		);
		const completedProjects = allProjects.filter(
			(p) => p.status === "Completed",
		);

		// Focus sessions
		const focusSessions = await personalDb
			.select()
			.from(personalFocusSessions)
			.where(
				and(
					eq(personalFocusSessions.userId, userId),
					gte(personalFocusSessions.startedAt, startDate),
				),
			);

		const totalFocusSeconds = focusSessions.reduce(
			(acc, s) => acc + (s.activeDuration || 0),
			0,
		);
		const completedFocusSessions = focusSessions.filter(
			(s) => s.status === "COMPLETED",
		);

		// Daily breakdown for charts (last 7 or 30 days)
		const daysBack = period === "monthly" ? 30 : period === "weekly" ? 7 : 1;
		const dailyData: Array<{
			date: string;
			tasksCompleted: number;
			focusMinutes: number;
		}> = [];

		for (let i = daysBack - 1; i >= 0; i--) {
			const dayStart = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
			dayStart.setHours(0, 0, 0, 0);
			const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1);

			const dayCompleted = allTasks.filter(
				(t) =>
					(t.status === "COMPLETED" || t.status === "Completed") &&
					t.completedAt &&
					new Date(t.completedAt) >= dayStart &&
					new Date(t.completedAt) <= dayEnd,
			).length;

			const daySessions = focusSessions.filter(
				(s) => s.startedAt >= dayStart && s.startedAt <= dayEnd,
			);
			const dayFocusSecs = daySessions.reduce(
				(acc, s) => acc + (s.activeDuration || 0),
				0,
			);

			dailyData.push({
				date: dayStart.toISOString().split("T")[0],
				tasksCompleted: dayCompleted,
				focusMinutes: Math.round(dayFocusSecs / 60),
			});
		}

		// Completion rate
		const totalTasksWithDeadline = allTasks.filter((t) => t.deadline).length;
		const onTime = allTasks.filter(
			(t) =>
				(t.status === "COMPLETED" || t.status === "Completed") &&
				t.completedAt &&
				t.deadline &&
				new Date(t.completedAt) <= new Date(t.deadline),
		).length;
		const completionRate =
			completedInPeriod.length > 0
				? Math.round(
						(completedInPeriod.length /
							Math.max(
								allTasks.filter(
									(t) =>
										t.deadline &&
										new Date(t.deadline) >= startDate &&
										new Date(t.deadline) <= now,
								).length,
								1,
							)) *
							100,
					)
				: 0;

		const deadlineAdherence =
			totalTasksWithDeadline > 0
				? Math.round((onTime / totalTasksWithDeadline) * 100)
				: 100;

		// Task type breakdown
		const typeBreakdown: Record<string, number> = {};
		completedInPeriod.forEach((t) => {
			const type = t.type || "Task";
			typeBreakdown[type] = (typeBreakdown[type] || 0) + 1;
		});

		// Priority breakdown
		const priorityBreakdown = {
			High: allTasks.filter(
				(t) =>
					t.priority === "High" &&
					t.status !== "COMPLETED" &&
					t.status !== "Completed",
			).length,
			Medium: allTasks.filter(
				(t) =>
					t.priority === "Medium" &&
					t.status !== "COMPLETED" &&
					t.status !== "Completed",
			).length,
			Low: allTasks.filter(
				(t) =>
					t.priority === "Low" &&
					t.status !== "COMPLETED" &&
					t.status !== "Completed",
			).length,
		};

		res.json({
			success: true,
			data: {
				period,
				startDate: startDate.toISOString(),
				summary: {
					tasksCompleted: completedInPeriod.length,
					tasksOverdue: overdueTasks.length,
					tasksToday: todayTasks.length,
					completedToday: completedToday.length,
					completionRate,
					deadlineAdherence,
					totalFocusMinutes: Math.round(totalFocusSeconds / 60),
					totalFocusHours: parseFloat((totalFocusSeconds / 3600).toFixed(1)),
					focusSessionsCount: focusSessions.length,
					completedFocusSessions: completedFocusSessions.length,
					activeProjects: activeProjects.length,
					completedProjects: completedProjects.length,
					totalProjects: allProjects.length,
				},
				charts: {
					dailyData,
					typeBreakdown,
					priorityBreakdown,
					projectProgress: activeProjects.slice(0, 10).map((p) => ({
						id: p.id,
						name: p.name,
						progress: p.progress || 0,
						status: p.status,
						deadline: p.deadline,
					})),
				},
			},
		});
	} catch (err: any) {
		logger.error("Personal reports overview error: " + err.message);
		res
			.status(500)
			.json({ success: false, error: "Failed to generate report" });
	}
});

// GET /api/v1/personal/reports/focus?period=weekly
personalReportsRouter.get("/focus", async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req);
		if (!userId)
			return res.status(401).json({ success: false, error: "Unauthorized" });

		const period = (req.query.period as string) || "weekly";
		const now = new Date();
		let startDate: Date;

		if (period === "monthly") {
			startDate = new Date(now.getFullYear(), now.getMonth(), 1);
		} else {
			startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
		}

		const sessions = await personalDb
			.select()
			.from(personalFocusSessions)
			.where(
				and(
					eq(personalFocusSessions.userId, userId),
					gte(personalFocusSessions.startedAt, startDate),
				),
			)
			.orderBy(desc(personalFocusSessions.startedAt));

		const totalSeconds = sessions.reduce(
			(a, s) => a + (s.activeDuration || 0),
			0,
		);
		const avgSessionSeconds =
			sessions.length > 0 ? Math.round(totalSeconds / sessions.length) : 0;
		const longestSession = sessions.reduce(
			(max, s) => Math.max(max, s.activeDuration || 0),
			0,
		);

		// Daily focus data
		const daysBack = period === "monthly" ? 30 : 7;
		const dailyFocus: Array<{
			date: string;
			minutes: number;
			sessions: number;
		}> = [];
		for (let i = daysBack - 1; i >= 0; i--) {
			const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
			d.setHours(0, 0, 0, 0);
			const dEnd = new Date(d.getTime() + 24 * 60 * 60 * 1000 - 1);
			const daySessions = sessions.filter(
				(s) => s.startedAt >= d && s.startedAt <= dEnd,
			);
			dailyFocus.push({
				date: d.toISOString().split("T")[0],
				minutes: Math.round(
					daySessions.reduce((a, s) => a + (s.activeDuration || 0), 0) / 60,
				),
				sessions: daySessions.length,
			});
		}

		res.json({
			success: true,
			data: {
				period,
				totalMinutes: Math.round(totalSeconds / 60),
				totalHours: parseFloat((totalSeconds / 3600).toFixed(1)),
				totalSessions: sessions.length,
				avgSessionMinutes: Math.round(avgSessionSeconds / 60),
				longestSessionMinutes: Math.round(longestSession / 60),
				dailyFocus,
				recentSessions: sessions.slice(0, 10).map((s) => ({
					id: s.id,
					startedAt: s.startedAt,
					finishedAt: s.finishedAt,
					activeMinutes: Math.round((s.activeDuration || 0) / 60),
					status: s.status,
				})),
			},
		});
	} catch (err: any) {
		logger.error("Personal focus report error: " + err.message);
		res
			.status(500)
			.json({ success: false, error: "Failed to generate focus report" });
	}
});
