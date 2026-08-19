import { and, desc, eq, gte, lte, or } from "drizzle-orm";
import { type Request, type Response, Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "../../database/client";
import {
	projects,
	tasks,
	timeTracking,
	workspaceMembers,
} from "../../database/schema";
import { authenticate } from "../middleware/auth.middleware";
import { normalizeRole } from "../middleware/org-rbac.middleware";
import { AuditService } from "../services/audit.service";
import { logger } from "../services/logger.service";
import { socketService } from "../services/socket.service";

import { OrganizationScheduleService } from "../services/organization-schedule.service";

export const orgFocusRouter = Router();
orgFocusRouter.use(authenticate);

// Helper: Safely get user ID from request user object
function getUserId(req: Request): string | null {
	const u = (req as any).user;
	if (!u) return null;
	const id = u.id || u.userId || u.sub;
	return typeof id === "string" && id.trim().length > 0 ? id.trim() : null;
}

// Helper: Check system working hours using Centralized Schedule Engine
async function isFocusAllowed(workspaceId: string, role: string): Promise<{ allowed: boolean; reason?: string; statusInfo?: any }> {
	const statusInfo = await OrganizationScheduleService.getScheduleStatus(workspaceId);
	const check = await OrganizationScheduleService.isActionAllowed(workspaceId, role, "timer");
	return {
		allowed: check.allowed,
		reason: check.reason,
		statusInfo,
	};
}

// Middleware to resolve workspace and verify membership using standard db.select()
const resolveWorkspace = async (req: Request, res: Response, next: any) => {
	try {
		const userId = getUserId(req);
		if (!userId) {
			return res.status(401).json({
				success: false,
				error: "Authentication required: Invalid user token",
			});
		}

		let workspaceId = String(
			req.query.workspaceId ||
				req.body.workspaceId ||
				req.headers["x-workspace-id"] ||
				"",
		).trim();

		if (!workspaceId || workspaceId === "undefined" || workspaceId === "null") {
			const memberList = await db
				.select()
				.from(workspaceMembers)
				.where(eq(workspaceMembers.userId, userId))
				.limit(1);
			const m = memberList[0];
			if (m?.workspaceId) {
				workspaceId = m.workspaceId;
				req.body.workspaceId = workspaceId;
				(req.query as any).workspaceId = workspaceId;
			}
		}

		if (!workspaceId || workspaceId === "undefined" || workspaceId === "null") {
			return res
				.status(400)
				.json({ success: false, error: "Missing workspaceId parameter" });
		}

		const members = await db
			.select()
			.from(workspaceMembers)
			.where(
				and(
					eq(workspaceMembers.workspaceId, workspaceId),
					eq(workspaceMembers.userId, userId),
				),
			)
			.limit(1);

		const member = members[0] || null;

		if (!member) {
			return res
				.status(403)
				.json({ success: false, error: "Unauthorized access to workspace" });
		}

		(req as any).workspaceId = workspaceId;
		(req as any).memberRole = member.role;
		next();
	} catch (err: any) {
		logger.error(`[OrgFocus] Membership error: ${err?.message || String(err)}`);
		res.status(500).json({
			success: false,
			error: err?.message || "Failed to resolve workspace membership",
			details: String(err),
		});
	}
};

// GET /api/v1/org/focus/active — Fetch active or paused focus session
orgFocusRouter.get(
	"/active",
	resolveWorkspace,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = getUserId(req);

			const memberRole = (req as any).memberRole || "MEMBER";
			const scheduleCheck = await isFocusAllowed(workspaceId, memberRole);

			if (!userId || !workspaceId) {
				return res.json({
					success: true,
					data: null,
					isSystemActive: scheduleCheck.allowed,
					statusInfo: scheduleCheck.statusInfo,
				});
			}

			const activeList = await db
				.select()
				.from(timeTracking)
				.where(
					and(
						eq(timeTracking.workspaceId, workspaceId),
						eq(timeTracking.userId, userId),
						or(
							eq(timeTracking.status, "Active"),
							eq(timeTracking.status, "Paused"),
						),
					),
				)
				.orderBy(desc(timeTracking.createdAt))
				.limit(1);

			const activeSession = activeList[0] || null;

			if (!activeSession) {
				return res.json({
					success: true,
					data: null,
					isSystemActive: scheduleCheck.allowed,
					statusInfo: scheduleCheck.statusInfo,
				});
			}

			// Automatic Working Hours Restricted shutdown check
			if (!scheduleCheck.allowed && activeSession.status === "Active") {
				const now = new Date();
				const startTime = activeSession.resumedAt || activeSession.startTime;
				const sessionDuration = Math.floor(
					(now.getTime() - new Date(startTime).getTime()) / 1000,
				);
				const totalDuration =
					(activeSession.durationSeconds || 0) + sessionDuration;

				const [_updated] = await db
					.update(timeTracking)
					.set({
						status: "SYSTEM_STOPPED",
						endTime: now,
						durationSeconds: totalDuration,
					})
					.where(eq(timeTracking.id, activeSession.id))
					.returning();

				await AuditService.logEvent(
					userId,
					"FOCUS_SYSTEM_STOPPED",
					`Session ${activeSession.id} auto-stopped due to Working Hours Policy`,
				);
				socketService.emitToWorkspace(workspaceId, "focus.stopped", {
					userId,
					sessionId: activeSession.id,
					status: "SYSTEM_STOPPED",
				});

				return res.json({
					success: true,
					data: null,
					isSystemActive: false,
					statusInfo: scheduleCheck.statusInfo,
					message: "Active session automatically stopped at Working Hours policy transition",
				});
			}

			// Enrich active session with task/project details if linked
			let taskData = null;
			let projectData = null;

			if (activeSession.taskId && activeSession.taskId.trim().length > 0) {
				const tList = await db
					.select()
					.from(tasks)
					.where(eq(tasks.id, activeSession.taskId))
					.limit(1);
				taskData = tList[0] || null;
			}

			const targetProjId = activeSession.projectId || taskData?.projectId;
			if (targetProjId && targetProjId.trim().length > 0) {
				const pList = await db
					.select()
					.from(projects)
					.where(eq(projects.id, targetProjId))
					.limit(1);
				projectData = pList[0] || null;
			}

			return res.json({
				success: true,
				data: {
					...activeSession,
					task: taskData,
					project: projectData,
				},
				isSystemActive: scheduleCheck.allowed,
				statusInfo: scheduleCheck.statusInfo,
			});
		} catch (err: any) {
			logger.error(
				"[OrgFocus] Active session fetch error: " +
					(err?.message || String(err)),
			);
			res.status(500).json({
				success: false,
				error: err?.message || "Failed to fetch active focus session",
				details: String(err),
			});
		}
	},
);

// GET /api/v1/org/focus/overview — Today's stats, category breakdown, org vs CEO work
orgFocusRouter.get(
	"/overview",
	resolveWorkspace,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = getUserId(req);

			const memberRole = (req as any).memberRole || "MEMBER";
			const scheduleCheck = await isFocusAllowed(workspaceId, memberRole);

			if (!userId || !workspaceId) {
				return res.json({
					success: true,
					data: {
						totalFocusedSeconds: 0,
						totalSessionsCount: 0,
						completedCount: 0,
						interruptedCount: 0,
						avgSessionSeconds: 0,
						longestSessionSeconds: 0,
						categoryBreakdown: {},
						split: { orgWorkSeconds: 0, ceoWorkSeconds: 0 },
						insights: [],
						isSystemActive: scheduleCheck.allowed,
						statusInfo: scheduleCheck.statusInfo,
					},
				});
			}

			const todayStart = new Date();
			todayStart.setHours(0, 0, 0, 0);
			const todayEnd = new Date();
			todayEnd.setHours(23, 59, 59, 999);

			const todaySessions = await db
				.select()
				.from(timeTracking)
				.where(
					and(
						eq(timeTracking.workspaceId, workspaceId),
						eq(timeTracking.userId, userId),
						gte(timeTracking.startTime, todayStart),
						lte(timeTracking.startTime, todayEnd),
					),
				);

			let totalFocusedSeconds = 0;
			let completedCount = 0;
			let interruptedCount = 0;
			let longestSessionSeconds = 0;
			let orgWorkSeconds = 0;
			let ceoWorkSeconds = 0;

			const categoryMap: Record<string, number> = {
				Strategy: 0,
				Planning: 0,
				Product: 0,
				Technical: 0,
				Architecture: 0,
				Review: 0,
				Approval: 0,
				Documentation: 0,
				Research: 0,
				Organization: 0,
				Other: 0,
			};

			todaySessions.forEach((s) => {
				let dur = s.durationSeconds || 0;
				if (s.status === "Active") {
					const startTime = s.resumedAt || s.startTime;
					if (startTime) {
						dur += Math.max(
							0,
							Math.floor((Date.now() - new Date(startTime).getTime()) / 1000),
						);
					}
				}

				totalFocusedSeconds += dur;
				if (dur > longestSessionSeconds) longestSessionSeconds = dur;

				if (s.status === "Completed") completedCount++;
				if (s.status === "Interrupted" || s.status === "SYSTEM_STOPPED")
					interruptedCount++;

				const cat = s.category || "Other";
				categoryMap[cat] = (categoryMap[cat] || 0) + dur;

				if (s.sourceType === "CEO_ACTIVITY") {
					ceoWorkSeconds += dur;
				} else {
					orgWorkSeconds += dur;
				}
			});

			const totalSessionsCount = todaySessions.length;
			const avgSessionSeconds =
				totalSessionsCount > 0
					? Math.round(totalFocusedSeconds / totalSessionsCount)
					: 0;

			// Generate computed insights
			const insights: string[] = [];
			if (longestSessionSeconds > 0) {
				const mins = Math.round(longestSessionSeconds / 60);
				insights.push(
					`Your longest focus session today was ${mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`}.`,
				);
			}
			if (totalFocusedSeconds > 0) {
				const orgPct = Math.round((orgWorkSeconds / totalFocusedSeconds) * 100);
				insights.push(
					`Organization execution represented ${orgPct}% of today's focused time.`,
				);
			}
			if (interruptedCount > 0) {
				insights.push(
					`${interruptedCount} session${interruptedCount > 1 ? "s were" : " was"} interrupted or system-stopped today.`,
				);
			}
			if (insights.length === 0) {
				insights.push(
					"No focus sessions recorded yet today. Choose a priority below to get started.",
				);
			}

			return res.json({
				success: true,
				data: {
					totalFocusedSeconds,
					totalSessionsCount,
					completedCount,
					interruptedCount,
					avgSessionSeconds,
					longestSessionSeconds,
					categoryBreakdown: categoryMap,
					split: {
						orgWorkSeconds,
						ceoWorkSeconds,
					},
					insights,
					isSystemActive: scheduleCheck.allowed,
					statusInfo: scheduleCheck.statusInfo,
				},
			});
		} catch (err: any) {
			logger.error(`[OrgFocus] Overview error: ${err?.message || String(err)}`);
			res.status(500).json({
				success: false,
				error: err?.message || "Failed to load focus overview",
				details: String(err),
			});
		}
	},
);

// GET /api/v1/org/focus/priorities — Executive priorities & focus queue
orgFocusRouter.get(
	"/priorities",
	resolveWorkspace,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = getUserId(req);
			const memberRole = normalizeRole((req as any).memberRole || "MEMBER");

			if (!workspaceId) {
				return res.json({
					success: true,
					data: { priorities: [], tasks: [], projects: [] },
				});
			}

			const [allTasks, allProjects] = await Promise.all([
				db
					.select()
					.from(tasks)
					.where(eq(tasks.workspaceId, workspaceId))
					.orderBy(desc(tasks.createdAt))
					.limit(30),
				db
					.select()
					.from(projects)
					.where(eq(projects.workspaceId, workspaceId))
					.orderBy(desc(projects.createdAt))
					.limit(15),
			]);

			let visibleTasks = allTasks;
			if (memberRole === "MEMBER") {
				visibleTasks = allTasks.filter((task) => task.assigneeId === userId);
			} else if (memberRole === "CO-CEO") {
				// Focus is an execution surface: team visibility belongs in Work Queue.
				visibleTasks = allTasks.filter((task) => task.assigneeId === userId);
			}

			const activeTasks = visibleTasks.filter(
				(t) =>
					t &&
					(t.status === "In Progress" ||
						t.status === "Assigned" ||
						t.status === "Pending Approval" ||
						t.status === "Draft"),
			);
			const visibleProjectIds = new Set(
				visibleTasks.map((task) => task.projectId).filter(Boolean),
			);
			const activeProjects = allProjects.filter(
				(p) =>
					p &&
					(memberRole === "CEO" || visibleProjectIds.has(p.id)) &&
					(p.status === "In Progress" || p.status === "Active" || !p.status),
			);

			return res.json({
				success: true,
				data: {
					priorities: activeTasks.slice(0, 5),
					tasks: activeTasks,
					projects: activeProjects,
				},
			});
		} catch (err: any) {
			logger.error(
				`[OrgFocus] Priorities fetch error: ${err?.message || String(err)}`,
			);
			res.status(500).json({
				success: false,
				error: err?.message || "Failed to load priorities",
				details: String(err),
			});
		}
	},
);

// GET /api/v1/org/focus/history — Recent focus sessions
orgFocusRouter.get(
	"/history",
	resolveWorkspace,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = getUserId(req);
			const limit = parseInt(req.query.limit as string, 10) || 20;

			if (!userId || !workspaceId) {
				return res.json({ success: true, data: [] });
			}

			const history = await db
				.select()
				.from(timeTracking)
				.where(
					and(
						eq(timeTracking.workspaceId, workspaceId),
						eq(timeTracking.userId, userId),
					),
				)
				.orderBy(desc(timeTracking.startTime))
				.limit(limit);

			// Enrich with task/project names
			const enriched = await Promise.all(
				history.map(async (s) => {
					let taskTitle = s.title;
					let projectName = null;

					if (s.taskId && s.taskId.trim().length > 0) {
						const tList = await db
							.select()
							.from(tasks)
							.where(eq(tasks.id, s.taskId))
							.limit(1);
						const t = tList[0] || null;
						if (t) {
							taskTitle = taskTitle || t.title;
							if (t.projectId && t.projectId.trim().length > 0) {
								const pList = await db
									.select()
									.from(projects)
									.where(eq(projects.id, t.projectId))
									.limit(1);
								const p = pList[0] || null;
								if (p) projectName = p.name;
							}
						}
					}

					if (!projectName && s.projectId && s.projectId.trim().length > 0) {
						const pList = await db
							.select()
							.from(projects)
							.where(eq(projects.id, s.projectId))
							.limit(1);
						const p = pList[0] || null;
						if (p) projectName = p.name;
					}

					return {
						...s,
						displayTitle:
							taskTitle ||
							s.title ||
							(s.sourceType === "PROJECT"
								? "Project Deep Work"
								: "Executive Focus"),
						projectName,
					};
				}),
			);

			return res.json({ success: true, data: enriched });
		} catch (err: any) {
			logger.error(`[OrgFocus] History error: ${err?.message || String(err)}`);
			res.status(500).json({
				success: false,
				error: err?.message || "Failed to load session history",
				details: String(err),
			});
		}
	},
);

// GET /api/v1/org/focus/weekly — Weekly statistics
orgFocusRouter.get(
	"/weekly",
	resolveWorkspace,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = getUserId(req);
			const weekOffset = parseInt(req.query.weekOffset as string, 10) || 0;

			if (!userId || !workspaceId) {
				return res.json({
					success: true,
					data: {
						weekStart: new Date().toISOString(),
						weekEnd: new Date().toISOString(),
						days: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map(
							(day) => ({ day, seconds: 0, formattedHours: "0h" }),
						),
						totalWeeklySeconds: 0,
					},
				});
			}

			const now = new Date();
			const dayOfWeek = (now.getDay() + 6) % 7; // Monday = 0
			const currentMon = new Date(now);
			currentMon.setDate(now.getDate() - dayOfWeek + weekOffset * 7);
			currentMon.setHours(0, 0, 0, 0);

			const currentSun = new Date(currentMon);
			currentSun.setDate(currentMon.getDate() + 6);
			currentSun.setHours(23, 59, 59, 999);

			const sessions = await db
				.select()
				.from(timeTracking)
				.where(
					and(
						eq(timeTracking.workspaceId, workspaceId),
						eq(timeTracking.userId, userId),
						gte(timeTracking.startTime, currentMon),
						lte(timeTracking.startTime, currentSun),
					),
				);

			const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
			const dailySeconds = [0, 0, 0, 0, 0, 0, 0];

			sessions.forEach((s) => {
				if (s.startTime) {
					const d = new Date(s.startTime);
					const idx = (d.getDay() + 6) % 7;
					dailySeconds[idx] += s.durationSeconds || 0;
				}
			});

			return res.json({
				success: true,
				data: {
					weekStart: currentMon.toISOString(),
					weekEnd: currentSun.toISOString(),
					days: days.map((day, idx) => ({
						day,
						seconds: dailySeconds[idx],
						formattedHours: `${(dailySeconds[idx] / 3600).toFixed(1)}h`,
					})),
					totalWeeklySeconds: dailySeconds.reduce((a, b) => a + b, 0),
				},
			});
		} catch (err: any) {
			logger.error(
				`[OrgFocus] Weekly stats error: ${err?.message || String(err)}`,
			);
			res.status(500).json({
				success: false,
				error: err?.message || "Failed to load weekly stats",
				details: String(err),
			});
		}
	},
);

// POST /api/v1/org/focus/start — Start Focus Session
orgFocusRouter.post(
	"/start",
	resolveWorkspace,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = getUserId(req);

			if (!userId || !workspaceId) {
				return res
					.status(401)
					.json({ success: false, error: "Authentication required" });
			}

			const memberRole = (req as any).memberRole || "MEMBER";
			const scheduleCheck = await isFocusAllowed(workspaceId, memberRole);

			if (!scheduleCheck.allowed) {
				return res.status(403).json({
					success: false,
					error: scheduleCheck.reason || "Focus is not available outside working hours.",
				});
			}

			const {
				sourceType,
				taskId,
				projectId,
				title,
				description,
				category,
				priority,
				objective,
				estimatedDuration,
			} = req.body;

			// Check for existing active or paused session
			const existingActiveList = await db
				.select()
				.from(timeTracking)
				.where(
					and(
						eq(timeTracking.workspaceId, workspaceId),
						eq(timeTracking.userId, userId),
						or(
							eq(timeTracking.status, "Active"),
							eq(timeTracking.status, "Paused"),
						),
					),
				)
				.limit(1);

			const existingActive = existingActiveList[0] || null;

			if (existingActive) {
				return res.status(409).json({
					success: false,
					error: "You already have an active focus session in progress.",
					data: existingActive,
				});
			}

			let finalTitle = title;
			let targetCategory = category || "Strategy";

			if (sourceType === "TASK" && taskId) {
				const tList = await db
					.select()
					.from(tasks)
					.where(and(eq(tasks.id, taskId), eq(tasks.workspaceId, workspaceId)))
					.limit(1);
				const t = tList[0] || null;
				if (!t) {
					return res.status(404).json({
						success: false,
						error: "Task not found in this workspace",
					});
				}
				if ((req as any).memberRole !== "CEO" && t.assigneeId !== userId) {
					return res.status(403).json({
						success: false,
						error: "You can only start focus on your assigned work",
					});
				}
				if (t) {
					finalTitle = finalTitle || t.title;
					targetCategory = targetCategory || "Technical";
					if (t.status === "Assigned") {
						await db
							.update(tasks)
							.set({ status: "In Progress" })
							.where(eq(tasks.id, taskId));
						socketService.emitToWorkspace(workspaceId, "task.started", {
							id: taskId,
							status: "In Progress",
						});
					}
				}
			} else if (sourceType === "PROJECT" && projectId) {
				const pList = await db
					.select()
					.from(projects)
					.where(eq(projects.id, projectId))
					.limit(1);
				const p = pList[0] || null;
				if (p) {
					finalTitle = finalTitle || `Focus: ${p.name}`;
					targetCategory = targetCategory || "Product";
				}
			}

			const sessionId = uuidv4();
			const [session] = await db
				.insert(timeTracking)
				.values({
					id: sessionId,
					userId,
					workspaceId,
					taskId: taskId || null,
					projectId: projectId || null,
					sourceType: sourceType || "CEO_ACTIVITY",
					title: finalTitle || "CEO Executive Focus",
					description: description || null,
					category: targetCategory,
					priority: priority || "High",
					objective: objective || null,
					estimatedDuration: estimatedDuration
						? parseInt(estimatedDuration, 10)
						: 60,
					status: "Active",
					startTime: new Date(),
				})
				.returning();

			await AuditService.logEvent(
				userId,
				"FOCUS_STARTED",
				`Started ${sourceType} focus session: ${finalTitle}`,
			);
			socketService.emitToWorkspace(workspaceId, "focus.started", {
				userId,
				sessionId: session.id,
				title: finalTitle,
			});

			res.json({ success: true, data: session });
		} catch (err: any) {
			logger.error(
				`[OrgFocus] Start session error: ${err?.message || String(err)}`,
			);
			res.status(500).json({
				success: false,
				error: err?.message || "Failed to start focus session",
				details: String(err),
			});
		}
	},
);

// POST /api/v1/org/focus/pause — Pause Focus Session
orgFocusRouter.post(
	"/pause",
	resolveWorkspace,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = getUserId(req);

			if (!userId || !workspaceId) {
				return res
					.status(401)
					.json({ success: false, error: "Authentication required" });
			}

			const activeList = await db
				.select()
				.from(timeTracking)
				.where(
					and(
						eq(timeTracking.workspaceId, workspaceId),
						eq(timeTracking.userId, userId),
						eq(timeTracking.status, "Active"),
					),
				)
				.limit(1);

			const activeSession = activeList[0] || null;

			if (!activeSession) {
				return res.status(404).json({
					success: false,
					error: "No active focus session found to pause",
				});
			}

			const now = new Date();
			const startTime = activeSession.resumedAt || activeSession.startTime;
			const rawElapsed = Math.floor(
				(now.getTime() - new Date(startTime).getTime()) / 1000,
			);
			const elapsedSinceStart = Math.max(0, Math.min(19 * 3600, rawElapsed));
			const totalDuration =
				(activeSession.durationSeconds || 0) + elapsedSinceStart;

			const [updated] = await db
				.update(timeTracking)
				.set({
					status: "Paused",
					pausedAt: now,
					durationSeconds: totalDuration,
				})
				.where(eq(timeTracking.id, activeSession.id))
				.returning();

			await AuditService.logEvent(
				userId,
				"FOCUS_PAUSED",
				`Paused focus session: ${activeSession.title}`,
			);
			socketService.emitToWorkspace(workspaceId, "focus.paused", {
				userId,
				sessionId: activeSession.id,
			});

			res.json({ success: true, data: updated });
		} catch (err: any) {
			logger.error(`[OrgFocus] Pause error: ${err?.message || String(err)}`);
			res.status(500).json({
				success: false,
				error: err?.message || "Failed to pause focus session",
				details: String(err),
			});
		}
	},
);

// POST /api/v1/org/focus/resume — Resume Focus Session
orgFocusRouter.post(
	"/resume",
	resolveWorkspace,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = getUserId(req);

			if (!userId || !workspaceId) {
				return res
					.status(401)
					.json({ success: false, error: "Authentication required" });
			}

			const memberRole = (req as any).memberRole || "MEMBER";
			const scheduleCheck = await isFocusAllowed(workspaceId, memberRole);

			if (!scheduleCheck.allowed) {
				return res.status(403).json({
					success: false,
					error: scheduleCheck.reason || "Focus cannot be resumed outside working hours.",
				});
			}

			const pausedList = await db
				.select()
				.from(timeTracking)
				.where(
					and(
						eq(timeTracking.workspaceId, workspaceId),
						eq(timeTracking.userId, userId),
						eq(timeTracking.status, "Paused"),
					),
				)
				.limit(1);

			const pausedSession = pausedList[0] || null;

			if (!pausedSession) {
				return res
					.status(404)
					.json({ success: false, error: "No paused session found to resume" });
			}

			const now = new Date();
			let addPausedSecs = 0;
			if (pausedSession.pausedAt) {
				addPausedSecs = Math.floor(
					(now.getTime() - new Date(pausedSession.pausedAt).getTime()) / 1000,
				);
			}
			const updatedPausedDuration =
				(pausedSession.pausedDurationSeconds || 0) + addPausedSecs;

			const [updated] = await db
				.update(timeTracking)
				.set({
					status: "Active",
					resumedAt: now,
					pausedDurationSeconds: updatedPausedDuration,
				})
				.where(eq(timeTracking.id, pausedSession.id))
				.returning();

			await AuditService.logEvent(
				userId,
				"FOCUS_RESUMED",
				`Resumed focus session: ${pausedSession.title}`,
			);
			socketService.emitToWorkspace(workspaceId, "focus.resumed", {
				userId,
				sessionId: pausedSession.id,
			});

			res.json({ success: true, data: updated });
		} catch (err: any) {
			logger.error(`[OrgFocus] Resume error: ${err?.message || String(err)}`);
			res.status(500).json({
				success: false,
				error: err?.message || "Failed to resume focus session",
				details: String(err),
			});
		}
	},
);

// POST /api/v1/org/focus/end — End Focus Session Workflow
orgFocusRouter.post(
	"/end",
	resolveWorkspace,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = getUserId(req);

			if (!userId || !workspaceId) {
				return res
					.status(401)
					.json({ success: false, error: "Authentication required" });
			}

			const { outcome, notes, blockerType, blockerNote, followUpTaskId } =
				req.body;

			const activeList = await db
				.select()
				.from(timeTracking)
				.where(
					and(
						eq(timeTracking.workspaceId, workspaceId),
						eq(timeTracking.userId, userId),
						or(
							eq(timeTracking.status, "Active"),
							eq(timeTracking.status, "Paused"),
						),
					),
				)
				.limit(1);

			const session = activeList[0] || null;

			if (!session) {
				return res.status(404).json({
					success: false,
					error: "No active or paused session found to end",
				});
			}

			const now = new Date();
			let totalDuration = session.durationSeconds || 0;

			if (session.status === "Active") {
				const startTime = session.resumedAt || session.startTime;
				const rawElapsed = Math.floor(
					(now.getTime() - new Date(startTime).getTime()) / 1000,
				);
				const cappedElapsed = Math.max(0, Math.min(19 * 3600, rawElapsed));
				totalDuration += cappedElapsed;
			}

			const sessionStatus =
				outcome === "No Meaningful Progress" ? "Interrupted" : "Completed";

			const [updated] = await db
				.update(timeTracking)
				.set({
					status: sessionStatus,
					endTime: now,
					durationSeconds: totalDuration,
					outcome: outcome || "Completed",
					notes: notes || null,
					blockerType: blockerType || null,
					blockerNote: blockerNote || null,
					followUpTaskId: followUpTaskId || null,
				})
				.where(eq(timeTracking.id, session.id))
				.returning();

			await AuditService.logEvent(
				userId,
				"FOCUS_ENDED",
				`Ended focus session (${outcome}): ${session.title}`,
			);
			await AuditService.logEvent(
				userId,
				"FOCUS_OUTCOME_RECORDED",
				`Session outcome recorded: ${outcome}`,
			);

			socketService.emitToWorkspace(workspaceId, "focus.stopped", {
				userId,
				sessionId: session.id,
				durationSeconds: totalDuration,
				outcome,
			});

			res.json({ success: true, data: updated });
		} catch (err: any) {
			logger.error(
				`[OrgFocus] End session error: ${err?.message || String(err)}`,
			);
			res.status(500).json({
				success: false,
				error: err?.message || "Failed to end focus session",
				details: String(err),
			});
		}
	},
);

// POST /api/v1/org/focus/follow-up-task — Create Follow-up Task
orgFocusRouter.post(
	"/follow-up-task",
	resolveWorkspace,
	async (req: Request, res: Response) => {
		try {
			const workspaceId = (req as any).workspaceId;
			const userId = getUserId(req);

			if (!userId || !workspaceId) {
				return res
					.status(401)
					.json({ success: false, error: "Authentication required" });
			}

			const { title, description, projectId, priority, deadline } = req.body;

			if (!title) {
				return res
					.status(400)
					.json({ success: false, error: "Task title is required" });
			}

			const taskId = uuidv4();
			const [newTask] = await db
				.insert(tasks)
				.values({
					id: taskId,
					workspaceId,
					title,
					description: description || null,
					projectId: projectId || null,
					assigneeId: userId,
					priority: priority || "High",
					status: "Assigned",
					deadline: deadline
						? new Date(deadline)
						: new Date(Date.now() + 24 * 60 * 60 * 1000),
				})
				.returning();

			await AuditService.logEvent(
				userId,
				"TASK_CREATED",
				`Created follow-up task from focus session: ${title}`,
			);
			socketService.emitToWorkspace(workspaceId, "task.created", {
				task: newTask,
			});

			res.json({ success: true, data: newTask });
		} catch (err: any) {
			logger.error(
				`[OrgFocus] Follow-up task error: ${err?.message || String(err)}`,
			);
			res.status(500).json({
				success: false,
				error: err?.message || "Failed to create follow-up task",
				details: String(err),
			});
		}
	},
);
function isWithinWorkingHours() {
	throw new Error("Function not implemented.");
}

