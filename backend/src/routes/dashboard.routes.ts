import { and, desc, eq, gte, inArray, isNull, lte, not, or } from "drizzle-orm";
import { type Request, type Response, Router } from "express";
import { db, personalDb } from "../../database/client";
import {
	notifications,
	personalActivityLogs,
	personalBooks,
	personalCalendarEvents,
	personalDailyMotivations,
	personalFocusSessions,
	personalJournalEntries,
	personalPodcastEpisodes,
	personalProjects,
	personalReadingSessions,
	personalTasks,
	userSettings,
	users,
} from "../../database/schema";
import { authenticate } from "../middleware/auth.middleware";
import { logger } from "../services/logger.service";

export const dashboardRouter = Router();

dashboardRouter.use(authenticate);

// GET /api/v1/dashboard/core - Fast immediate shell data
dashboardRouter.get("/core", async (req: Request, res: Response) => {
	try {
		const userId = (req as any).user?.id;
		const workspaceId = req.query.workspaceId as string;

		if (!workspaceId) {
			return res
				.status(400)
				.json({ success: false, error: "Workspace ID is required" });
		}

		// "personal" is a valid workspace ID for personal workspace users
		const isPersonalWorkspace = workspaceId === "personal";
		const focusWorkspaceId = isPersonalWorkspace ? "personal" : workspaceId;
		const now = new Date();
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
		const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
		const yesterdayEnd = new Date(todayEnd.getTime() - 24 * 60 * 60 * 1000);
		const next7Days = new Date(todayEnd.getTime() + 7 * 24 * 60 * 60 * 1000);

		const userRecords = await db
			.select()
			.from(users)
			.where(eq(users.id, userId))
			.limit(1);
		const userProfile = userRecords[0];

		// Fetch tasks relevant for today (due today OR overdue)
		const tasksToday = await personalDb
			.select()
			.from(personalTasks)
			.where(
				and(
					eq(personalTasks.ownerUserId, userId),
					or(
						and(
							gte(personalTasks.deadline, todayStart),
							lte(personalTasks.deadline, todayEnd),
						),
						and(
							lte(personalTasks.deadline, todayStart),
							not(eq(personalTasks.status, "Completed")),
						),
					),
				),
			);

		const completedTasksToday = tasksToday.filter(
			(t) => t.status === "Completed" || t.status === "COMPLETED",
		);
		const remainingTasksToday = tasksToday.filter(
			(t) => t.status !== "Completed" && t.status !== "COMPLETED",
		);
		const todayProgressPercent =
			tasksToday.length > 0
				? Math.round((completedTasksToday.length / tasksToday.length) * 100)
				: 0;

		const focusSessionsToday = await personalDb
			.select()
			.from(personalFocusSessions)
			.where(
				and(
					eq(personalFocusSessions.userId, userId),
					eq(personalFocusSessions.workspaceId, focusWorkspaceId),
					gte(personalFocusSessions.startedAt, todayStart),
					lte(personalFocusSessions.startedAt, todayEnd),
				),
			);

		const focusSessionsYesterday = await personalDb
			.select()
			.from(personalFocusSessions)
			.where(
				and(
					eq(personalFocusSessions.userId, userId),
					eq(personalFocusSessions.workspaceId, focusWorkspaceId),
					gte(personalFocusSessions.startedAt, yesterdayStart),
					lte(personalFocusSessions.startedAt, yesterdayEnd),
				),
			);

		const totalFocusSecondsToday = focusSessionsToday.reduce((acc, session) => {
			let active = session.activeDuration;
			if (session.status === "RUNNING") {
				const lastStart = session.resumedAt
					? new Date(session.resumedAt).getTime()
					: new Date(session.startedAt).getTime();
				active += Math.max(0, Math.floor((now.getTime() - lastStart) / 1000));
			}
			return acc + active;
		}, 0);

		const totalFocusSecondsYesterday = focusSessionsYesterday.reduce(
			(acc, session) => acc + session.activeDuration,
			0,
		);

		const prioritiesList = [...tasksToday]
			.filter((t) => t.status !== "Completed" && t.status !== "COMPLETED")
			.sort((a, b) => {
				const w = { High: 3, Medium: 2, Low: 1 };
				const weightA = w[a.priority as "High" | "Medium" | "Low"] || 1;
				const weightB = w[b.priority as "High" | "Medium" | "Low"] || 1;
				if (weightA !== weightB) return weightB - weightA;
				return (
					(a.deadline ? new Date(a.deadline).getTime() : Infinity) -
					(b.deadline ? new Date(b.deadline).getTime() : Infinity)
				);
			})
			.slice(0, 5);

		const activeFocusSession = await personalDb
			.select()
			.from(personalFocusSessions)
			.where(
				and(
					eq(personalFocusSessions.userId, userId),
					eq(personalFocusSessions.workspaceId, focusWorkspaceId),
					inArray(personalFocusSessions.status, ["RUNNING", "PAUSED"]),
				),
			)
			.limit(1);

		let activeFocus = null;
		if (activeFocusSession.length > 0) {
			const session = activeFocusSession[0];
			let task = null,
				project = null;
			if (session.taskId) {
				const tr = await personalDb
					.select()
					.from(personalTasks)
					.where(eq(personalTasks.id, session.taskId))
					.limit(1);
				if (tr.length > 0) {
					task = tr[0];
					if (task.projectId) {
						const pr = await personalDb
							.select()
							.from(personalProjects)
							.where(eq(personalProjects.id, task.projectId))
							.limit(1);
						if (pr.length > 0) project = pr[0];
					}
				}
			}
			activeFocus = { ...session, task, project };
		}

		const activeProjects = await personalDb
			.select()
			.from(personalProjects)
			.where(eq(personalProjects.ownerUserId, userId));

		// Fetch upcoming tasks count without fetching all tasks
		const upcomingTasks = await personalDb
			.select({ id: personalTasks.id })
			.from(personalTasks)
			.where(
				and(
					eq(personalTasks.ownerUserId, userId),
					not(eq(personalTasks.status, "Completed")),
					not(isNull(personalTasks.deadline)),
					gte(personalTasks.deadline, todayEnd),
					lte(personalTasks.deadline, next7Days),
				),
			);
		const upcomingTasksCount = upcomingTasks.length;

		// Fix N+1 queries for projects by querying all tasks for active projects in one go
		const activeProjectIds = activeProjects.map((p) => p.id).filter((id) => id);
		let allProjectTasks: { projectId: string | null; status: string }[] = [];
		if (activeProjectIds.length > 0) {
			allProjectTasks = await personalDb
				.select({
					projectId: personalTasks.projectId,
					status: personalTasks.status,
				})
				.from(personalTasks)
				.where(inArray(personalTasks.projectId, activeProjectIds));
		}

		const projectPulses = activeProjects
			.filter((p) => p.status === "Active" || p.status === "Planning")
			.map((project) => {
				const pt = allProjectTasks.filter((t) => t.projectId === project.id);
				const completed = pt.filter(
					(t) => t.status === "Completed" || t.status === "COMPLETED",
				).length;
				return {
					id: project.id,
					name: project.name,
					description: project.description,
					status: project.status,
					progress:
						pt.length > 0 ? Math.round((completed / pt.length) * 100) : 0,
					completedTasks: completed,
					remainingTasks: pt.length - completed,
					totalTasks: pt.length,
					deadline: project.deadline,
				};
			});

		// Calculate today's status using Personal schema
		const readingSessionsToday = await personalDb
			.select()
			.from(personalReadingSessions)
			.where(
				and(
					eq(personalReadingSessions.ownerUserId, userId),
					gte(personalReadingSessions.date, todayStart),
					lte(personalReadingSessions.date, todayEnd),
				),
			);
		const totalReadingSecondsToday = readingSessionsToday.reduce(
			(acc, s) => acc + (s.durationMinutes || 0) * 60,
			0,
		);

		// Fetch User Settings for Daily Goal
		const userSettingsRecords = await personalDb
			.select()
			.from(userSettings)
			.where(eq(userSettings.ownerUserId, userId))
			.limit(1);
		const settings = (userSettingsRecords[0]?.preferences as any) || {};
		const dailyFocusGoal = settings.dailyFocusGoalMinutes
			? settings.dailyFocusGoalMinutes * 60
			: 6 * 3600;

		// Fetch Active Book
		const activeBooks = await personalDb
			.select()
			.from(personalBooks)
			.where(
				and(
					eq(personalBooks.ownerUserId, userId),
					inArray(personalBooks.status, ["Reading", "Active"]),
				),
			)
			.limit(1);
		const activeBook = activeBooks.length > 0 ? activeBooks[0] : null;
		if (activeBook) {
			const sessions = await personalDb
				.select()
				.from(personalReadingSessions)
				.where(eq(personalReadingSessions.bookId, activeBook.id))
				.orderBy(desc(personalReadingSessions.createdAt))
				.limit(1);
			(activeBook as any).lastSession =
				sessions.length > 0 ? sessions[0] : null;
		}

		// Fetch Active Podcast
		const activePodcasts = await personalDb
			.select()
			.from(personalPodcastEpisodes)
			.where(
				and(
					eq(personalPodcastEpisodes.ownerUserId, userId),
					eq(personalPodcastEpisodes.status, "Listening"),
				),
			)
			.limit(1);

		// Fetch Today's Journal
		const todayJournal = await personalDb
			.select()
			.from(personalJournalEntries)
			.where(
				and(
					eq(personalJournalEntries.ownerUserId, userId),
					gte(personalJournalEntries.date, todayStart),
					lte(personalJournalEntries.date, todayEnd),
				),
			)
			.limit(1);

		// Fetch Upcoming Calendar
		const upcomingEvents = await personalDb
			.select()
			.from(personalCalendarEvents)
			.where(
				and(
					eq(personalCalendarEvents.ownerUserId, userId),
					gte(personalCalendarEvents.startDate, now),
					lte(personalCalendarEvents.startDate, next7Days),
				),
			)
			.orderBy(personalCalendarEvents.startDate)
			.limit(5);

		// Recent Activity
		const recentActivityList = await personalDb
			.select()
			.from(personalActivityLogs)
			.where(eq(personalActivityLogs.ownerUserId, userId))
			.orderBy(desc(personalActivityLogs.createdAt))
			.limit(10);

		// Calculate 7-Day Work Graph Data
		const weekAgoStart = new Date(
			todayStart.getTime() - 6 * 24 * 60 * 60 * 1000,
		);
		const weekFocusSessions = await personalDb
			.select()
			.from(personalFocusSessions)
			.where(
				and(
					eq(personalFocusSessions.userId, userId),
					gte(personalFocusSessions.startedAt, weekAgoStart),
					lte(personalFocusSessions.startedAt, todayEnd),
				),
			);

		const dailyGraphData = [];
		for (let i = 6; i >= 0; i--) {
			const d = new Date(todayStart.getTime() - i * 24 * 60 * 60 * 1000);
			const dEnd = new Date(d.getTime() + 24 * 60 * 60 * 1000 - 1);
			const daySessions = weekFocusSessions.filter(
				(s) => s.startedAt >= d && s.startedAt <= dEnd,
			);
			const activeSecs = daySessions.reduce(
				(acc, s) => acc + s.activeDuration,
				0,
			);
			dailyGraphData.push({
				date: d.toISOString(),
				plannedMinutes: 240, // default target
				actualMinutes: Math.round(activeSecs / 60),
			});
		}

		const unreadNotificationsList = isPersonalWorkspace
			? []
			: await db
					.select()
					.from(notifications)
					.where(
						and(
							eq(notifications.userId, userId),
							eq(notifications.workspaceId, workspaceId),
							eq(notifications.isRead, false),
						),
					);

		// Motivation Logic
		const todayDateStr = now.toISOString().split("T")[0];
		let dailyMotivation = null;

		const motivationRecords = await personalDb
			.select()
			.from(personalDailyMotivations)
			.where(
				and(
					eq(personalDailyMotivations.ownerUserId, userId),
					eq(personalDailyMotivations.date, todayDateStr),
				),
			)
			.limit(1);

		if (motivationRecords.length > 0) {
			dailyMotivation = motivationRecords[0];
		} else {
			const fallbackMotivations = [
				"Focus on the next important step, not the entire journey.",
				"Consistent work beats occasional bursts of effort.",
				"Finish what matters before starting what is merely interesting.",
				"Make today's work useful to tomorrow's you.",
			];
			const text =
				fallbackMotivations[
					Math.floor(Math.random() * fallbackMotivations.length)
				];

			const newId = require("node:crypto").randomUUID();
			const [newMotivation] = await personalDb
				.insert(personalDailyMotivations)
				.values({
					id: newId,
					ownerUserId: userId,
					text,
					date: todayDateStr,
				})
				.returning();

			dailyMotivation = newMotivation;
		}

		return res.json({
			success: true,
			data: {
				greetingName: userProfile?.displayName || userProfile?.name || "Member",
				kpis: {
					tasksToday: tasksToday.length,
					completedTasksToday: completedTasksToday.length,
					remainingTasksToday: remainingTasksToday.length,
					focusSecondsToday: totalFocusSecondsToday,
					focusSecondsYesterday: totalFocusSecondsYesterday,
					dailyFocusGoalSeconds: dailyFocusGoal,
					activeProjectsCount: activeProjects.filter(
						(p) => p.status === "Active" || p.status === "Planning",
					).length,
					upcomingDeadlinesCount: upcomingTasksCount,
					todayProgressPercent,
				},
				priorities: prioritiesList,
				tasksToday: tasksToday,
				activeFocus,
				projects: projectPulses,
				projectPulses,         // alias for frontend compatibility
				learning: {
					activeBook,
					activePodcast: activePodcasts[0] || null,
					todayJournal: todayJournal[0] || null,
				},
				upcoming: upcomingEvents,
				recentActivity: recentActivityList,
				recentActivityList,    // alias for frontend compatibility
				workGraph: dailyGraphData,
				dailyMotivation,
				unreadNotificationsCount: unreadNotificationsList.length,
				todayStatus: {
					tasksCompleted: completedTasksToday.length,
					tasksTotal: tasksToday.length,
					focusSeconds: totalFocusSecondsToday,
					readingSeconds: totalReadingSecondsToday,
					listeningSeconds: 0,
				},
			},
		});
	} catch (error: any) {
		logger.error(`Dashboard Core Fetch Error: ${error.message}`);
		return res
			.status(500)
			.json({ success: false, error: "Internal server error" });
	}
});

// GET /api/v1/dashboard/ai-insight - Heavy AI evaluation data
dashboardRouter.get("/ai-insight", async (req: Request, res: Response) => {
	try {
		const userId = (req as any).user?.id;
		const workspaceId = req.query.workspaceId as string;

		if (!workspaceId) {
			return res
				.status(400)
				.json({ success: false, error: "Workspace ID is required" });
		}

		const now = new Date();
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
		const next7Days = new Date(todayEnd.getTime() + 7 * 24 * 60 * 60 * 1000);

		const allUserTasks = await personalDb
			.select()
			.from(personalTasks)
			.where(eq(personalTasks.ownerUserId, userId));

		const tasksToday = allUserTasks.filter((task) => {
			if (!task.deadline) return false;
			const deadlineDate = new Date(task.deadline);
			return (
				(deadlineDate >= todayStart && deadlineDate <= todayEnd) ||
				(deadlineDate < todayStart && task.status !== "Completed")
			);
		});
		const completedTasksToday = tasksToday.filter(
			(t) => t.status === "Completed",
		);
		const upcomingTasksCount = allUserTasks.filter(
			(task) =>
				task.deadline &&
				new Date(task.deadline) > todayEnd &&
				new Date(task.deadline) <= next7Days &&
				task.status !== "Completed",
		).length;

		const prioritiesList = [...tasksToday]
			.filter((t) => t.status !== "Completed")
			.sort((a, b) => {
				const w = { High: 3, Medium: 2, Low: 1 };
				return (
					(w[b.priority as "High" | "Medium" | "Low"] || 1) -
					(w[a.priority as "High" | "Medium" | "Low"] || 1)
				);
			})
			.slice(0, 5);

		// AI Daily Plan
		const aiDailyPlan = prioritiesList.map((task, index) => {
			const startHour = 9 + index * 2;
			return {
				id: task.id,
				title: task.title,
				type: task.projectId ? "project_work" : "deep_work",
				plannedTime: `${startHour}:00 ${startHour < 12 ? "AM" : "PM"}`,
				duration: task.estimatedMinutes || 60,
				status: task.status === "Completed" ? "completed" : "pending",
				reasoning: `Based on High Priority deadline for ${task.title}`,
			};
		});

		const totalActiveTasks = tasksToday.length + upcomingTasksCount;
		const completedSoFar = completedTasksToday.length;
		const executionScore =
			totalActiveTasks > 0
				? Math.round((completedSoFar / totalActiveTasks) * 100)
				: 100;

		const aiProgress = {
			executionScore,
			deadlineConfidence:
				executionScore > 80 ? "High" : executionScore > 50 ? "Medium" : "Low",
			riskLevel: executionScore < 50 ? "Elevated" : "Normal",
			explanation:
				"You are on track. Keep focusing on high-priority tasks to maintain momentum.",
		};

		if (executionScore < 50 && tasksToday.length > 0) {
			aiProgress.explanation =
				"Falling behind on today's scheduled tasks. Consider re-prioritizing or deferring non-urgent items.";
		}

		const aiInsight =
			"Great progress this week. Maintaining this velocity will complete your active projects ahead of schedule.";

		return res.json({
			success: true,
			data: {
				aiDailyPlan,
				aiProgress,
				aiInsight,
			},
		});
	} catch (error: any) {
		logger.error(`Dashboard AI Fetch Error: ${error.message}`);
		return res
			.status(500)
			.json({ success: false, error: "Internal server error" });
	}
});

dashboardRouter.post(
	"/motivation/action",
	async (req: Request, res: Response) => {
		try {
			const userId = (req as any).user?.id;
			const { action } = req.body;

			const now = new Date();
			const todayDateStr = now.toISOString().split("T")[0];

			const records = await personalDb
				.select()
				.from(personalDailyMotivations)
				.where(
					and(
						eq(personalDailyMotivations.ownerUserId, userId),
						eq(personalDailyMotivations.date, todayDateStr),
					),
				)
				.limit(1);

			if (records.length === 0)
				return res.status(404).json({ success: false, error: "Not found" });

			const motivation = records[0];

			if (action === "hide") {
				await personalDb
					.update(personalDailyMotivations)
					.set({ isHidden: true, updatedAt: new Date() })
					.where(eq(personalDailyMotivations.id, motivation.id));
			} else if (action === "save") {
				await personalDb
					.update(personalDailyMotivations)
					.set({ isSaved: true, updatedAt: new Date() })
					.where(eq(personalDailyMotivations.id, motivation.id));
			} else if (action === "change") {
				const fallbackMotivations = [
					"Small progress every day becomes meaningful progress over time.",
					"The best time to plant a tree was 20 years ago. The second best time is now.",
					"Amateurs sit and wait for inspiration, the rest of us just get up and go to work.",
					"Do the hard jobs first. The easy jobs will take care of themselves.",
					"Execution is the only thing that matters.",
					"Rest at the end, not in the middle.",
				];
				const currentText = motivation.text;
				let newText = currentText;
				while (newText === currentText) {
					newText =
						fallbackMotivations[
							Math.floor(Math.random() * fallbackMotivations.length)
						];
				}

				await personalDb
					.update(personalDailyMotivations)
					.set({ text: newText, updatedAt: new Date() })
					.where(eq(personalDailyMotivations.id, motivation.id));
			} else {
				return res
					.status(400)
					.json({ success: false, error: "Invalid action" });
			}

			const updated = await personalDb
				.select()
				.from(personalDailyMotivations)
				.where(eq(personalDailyMotivations.id, motivation.id))
				.limit(1);

			return res.json({ success: true, data: updated[0] });
		} catch (error: any) {
			logger.error(`Motivation Action Error: ${error.message}`);
			return res
				.status(500)
				.json({ success: false, error: "Internal server error" });
		}
	},
);

// GET /api/v1/dashboard/analytics/execution
dashboardRouter.get(
	"/analytics/execution",
	async (req: Request, res: Response) => {
		try {
			const userId = (req as any).user?.id;
			const workspaceId = req.query.workspaceId as string;
			const period = (req.query.period as string) || "week";
			const startDateQuery = req.query.startDate as string;

			if (!workspaceId) {
				return res
					.status(400)
					.json({ success: false, error: "Workspace ID is required" });
			}

			const isPersonalWs = workspaceId === "personal";
			const focusWsId = isPersonalWs ? "personal" : workspaceId;

			const now = new Date();
			let startDate = new Date();
			let endDate = new Date();

			if (startDateQuery) {
				startDate = new Date(startDateQuery);
			}

			if (period === "day") {
				startDate.setHours(0, 0, 0, 0);
				endDate = new Date(startDate.getTime());
				endDate.setHours(23, 59, 59, 999);
			} else if (period === "week") {
				// Find Monday
				const day = startDate.getDay();
				const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
				startDate.setDate(diff);
				startDate.setHours(0, 0, 0, 0);

				endDate = new Date(startDate.getTime());
				endDate.setDate(startDate.getDate() + 6);
				endDate.setHours(23, 59, 59, 999);
			} else if (period === "month") {
				startDate.setDate(1);
				startDate.setHours(0, 0, 0, 0);

				endDate = new Date(
					startDate.getFullYear(),
					startDate.getMonth() + 1,
					0,
				);
				endDate.setHours(23, 59, 59, 999);
			}

			const focusSessions = await personalDb
				.select()
				.from(personalFocusSessions)
				.where(
					and(
						eq(personalFocusSessions.userId, userId),
						eq(personalFocusSessions.workspaceId, focusWsId),
						gte(personalFocusSessions.startedAt, startDate),
						lte(personalFocusSessions.startedAt, endDate),
					),
				);

			const tasksInPeriod = await personalDb
				.select()
				.from(personalTasks)
				.where(
					and(
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
				);

			// Fetch user goals to get daily target
			const userSettingsRecords = await personalDb
				.select()
				.from(userSettings)
				.where(eq(userSettings.ownerUserId, userId))
				.limit(1);
			const settings = (userSettingsRecords[0]?.preferences as any) || {};
			const dailyTargetMinutes = settings.dailyFocusGoalMinutes || 360;

			const dataPoints = [];
			let bestDay = { date: "", actualMinutes: 0 };
			let totalActualMinutes = 0;
			let daysHitTarget = 0;
			let totalDays = 0;

			const generateDays = () => {
				const current = new Date(startDate.getTime());
				const dates = [];
				while (current <= endDate) {
					dates.push(new Date(current.getTime()));
					current.setDate(current.getDate() + 1);
				}
				return dates;
			};

			const dates = generateDays();
			totalDays = dates.length;

			for (const d of dates) {
				const dStart = new Date(d.getTime());
				dStart.setHours(0, 0, 0, 0);
				const dEnd = new Date(d.getTime());
				dEnd.setHours(23, 59, 59, 999);

				const daySessions = focusSessions.filter((s) => {
					const sTime = s.startedAt ? new Date(s.startedAt).getTime() : 0;
					return sTime >= dStart.getTime() && sTime <= dEnd.getTime();
				});

				let actualSeconds = daySessions.reduce(
					(acc, s) => acc + s.activeDuration,
					0,
				);

				// Add running active duration if it's running today
				const runningSession = daySessions.find((s) => s.status === "RUNNING");
				if (runningSession) {
					const lastStart = runningSession.resumedAt
						? new Date(runningSession.resumedAt).getTime()
						: new Date(runningSession.startedAt).getTime();
					actualSeconds += Math.max(
						0,
						Math.floor((now.getTime() - lastStart) / 1000),
					);
				}

				const actualMinutes = Math.round(actualSeconds / 60);

				const dayTasks = tasksInPeriod.filter((t) => {
					const tTime = t.scheduledStart
						? new Date(t.scheduledStart).getTime()
						: t.deadline
							? new Date(t.deadline).getTime()
							: 0;
					return tTime >= dStart.getTime() && tTime <= dEnd.getTime();
				});
				const plannedMinutes = dayTasks.reduce(
					(acc, t) => acc + (t.estimatedMinutes || 60),
					0,
				);

				dataPoints.push({
					date: dStart.toISOString(),
					plannedMinutes,
					actualMinutes,
				});

				totalActualMinutes += actualMinutes;

				if (actualMinutes >= dailyTargetMinutes) {
					daysHitTarget++;
				}

				if (actualMinutes > bestDay.actualMinutes) {
					bestDay = { date: dStart.toISOString(), actualMinutes };
				}
			}

			let consistency = 0;
			if (totalDays > 0) {
				// Calculate consistency up to today, not future days
				const daysUpToToday = dates.filter(
					(d) => d.getTime() <= now.getTime(),
				).length;
				if (daysUpToToday > 0) {
					consistency = Math.round((daysHitTarget / daysUpToToday) * 100);
				}
			}

			return res.json({
				success: true,
				data: {
					period,
					startDate: startDate.toISOString(),
					endDate: endDate.toISOString(),
					graphData: dataPoints,
					summary: {
						totalActualMinutes,
						averageDailyMinutes:
							totalDays > 0 ? Math.round(totalActualMinutes / totalDays) : 0,
						bestDay,
						consistency,
						daysHitTarget,
					},
				},
			});
		} catch (error: any) {
			logger.error(`Execution Analytics Error: ${error.message}`);
			return res
				.status(500)
				.json({ success: false, error: "Internal server error" });
		}
	},
);
