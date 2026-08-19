import { and, desc, eq, gte } from "drizzle-orm";
import { type Request, type Response, Router } from "express";
import { db } from "../../database/client";
import {
	organizationEmergencyOverrides,
	organizationPolicyHistory,
	organizationScheduleExceptions,
	organizationWeeklySchedules,
	users,
	workspaceMembers,
	workspaces,
	workspaceSettings,
} from "../../database/schema";
import { authenticate } from "../middleware/auth.middleware";
import { logger } from "../services/logger.service";
import { OrganizationScheduleService } from "../services/organization-schedule.service";
import { socketService } from "../services/socket.service";

export const orgWorkingHoursRouter = Router();
orgWorkingHoursRouter.use(authenticate);

/**
 * Helper to check user membership and role in organization
 */
const getOrgMembership = async (req: Request) => {
	const userId = (req as any).user?.id;
	const userRoleFromToken = (req as any).user?.role || "";

	const requestedId = String(
		req.query.workspaceId || req.body?.workspaceId || "",
	).trim();

	if (requestedId && requestedId !== "undefined" && requestedId !== "null") {
		const membership = await db.query.workspaceMembers.findFirst({
			where: and(
				eq(workspaceMembers.workspaceId, requestedId),
				eq(workspaceMembers.userId, userId),
			),
		});
		if (membership) {
			return { userId, workspaceId: membership.workspaceId, role: membership.role || userRoleFromToken };
		}
	}

	const allMemberships = await db.query.workspaceMembers.findMany({
		where: eq(workspaceMembers.userId, userId),
	});

	for (const mem of allMemberships) {
		const ws = await db.query.workspaces.findFirst({
			where: eq(workspaces.id, mem.workspaceId),
		});
		if (ws && ws.type !== "personal") {
			return { userId, workspaceId: mem.workspaceId, role: mem.role || userRoleFromToken };
		}
	}

	return { userId, workspaceId: null, role: userRoleFromToken };
};

// 1. GET / - Full Working Hours Policy & Schedule Details
orgWorkingHoursRouter.get("/", async (req: Request, res: Response) => {
	try {
		const { userId, workspaceId, role } = await getOrgMembership(req);
		if (!workspaceId) {
			return res.status(403).json({ success: false, error: "Organization workspace context required." });
		}

		const status = await OrganizationScheduleService.getScheduleStatus(workspaceId);

		// Get standard workspace settings
		let settings = await db.query.workspaceSettings.findFirst({
			where: eq(workspaceSettings.workspaceId, workspaceId),
		});

		// Get weekly schedule
		let weekly = await db.query.organizationWeeklySchedules.findMany({
			where: eq(organizationWeeklySchedules.workspaceId, workspaceId),
			orderBy: (w, { asc }) => [asc(w.dayOfWeek)],
		});

		if (weekly.length === 0) {
			// Populate default 7 days (Mon-Fri active 04:00-23:00, Sat-Sun off)
			const daysConfig = [
				{ dayOfWeek: 0, isWorkingDay: false, startTime: "04:00", endTime: "23:00" }, // Sun
				{ dayOfWeek: 1, isWorkingDay: true, startTime: "04:00", endTime: "23:00" },  // Mon
				{ dayOfWeek: 2, isWorkingDay: true, startTime: "04:00", endTime: "23:00" },  // Tue
				{ dayOfWeek: 3, isWorkingDay: true, startTime: "04:00", endTime: "23:00" },  // Wed
				{ dayOfWeek: 4, isWorkingDay: true, startTime: "04:00", endTime: "23:00" },  // Thu
				{ dayOfWeek: 5, isWorkingDay: true, startTime: "04:00", endTime: "23:00" },  // Fri
				{ dayOfWeek: 6, isWorkingDay: false, startTime: "04:00", endTime: "23:00" }, // Sat
			];

			for (const d of daysConfig) {
				await db.insert(organizationWeeklySchedules).values({
					id: `wk_sch_${workspaceId}_${d.dayOfWeek}`,
					workspaceId,
					dayOfWeek: d.dayOfWeek,
					isWorkingDay: d.isWorkingDay,
					startTime: d.startTime,
					endTime: d.endTime,
				});
			}

			weekly = await db.query.organizationWeeklySchedules.findMany({
				where: eq(organizationWeeklySchedules.workspaceId, workspaceId),
				orderBy: (w, { asc }) => [asc(w.dayOfWeek)],
			});
		}

		// Get exceptions
		const exceptions = await db.query.organizationScheduleExceptions.findMany({
			where: eq(organizationScheduleExceptions.workspaceId, workspaceId),
			orderBy: (e, { desc }) => [desc(e.date)],
		});

		return res.json({
			success: true,
			data: {
				status,
				policy: settings,
				weeklySchedule: weekly,
				exceptions,
				userRole: role,
			},
		});
	} catch (err: any) {
		logger.error(`Error fetching working hours policy: ${err.message}`);
		return res.status(500).json({ success: false, error: "Failed to fetch working hours policy." });
	}
});

// 2. GET /status - Real-time Schedule Status Endpoint
orgWorkingHoursRouter.get("/status", async (req: Request, res: Response) => {
	try {
		const { workspaceId } = await getOrgMembership(req);
		if (!workspaceId) {
			return res.status(403).json({ success: false, error: "Organization workspace context required." });
		}

		const status = await OrganizationScheduleService.getScheduleStatus(workspaceId);
		return res.json({ success: true, data: status });
	} catch (err: any) {
		logger.error(`Error fetching schedule status: ${err.message}`);
		return res.status(500).json({ success: false, error: "Failed to fetch schedule status." });
	}
});

// 3. PUT / - Update Working Hours Policy & Weekly Schedule (CEO Only)
orgWorkingHoursRouter.put("/", async (req: Request, res: Response) => {
	try {
		const { userId, workspaceId, role } = await getOrgMembership(req);
		if (!workspaceId) {
			return res.status(403).json({ success: false, error: "Organization workspace context required." });
		}

		if (role !== "CEO" && role !== "SYSTEM_OWNER") {
			return res.status(403).json({ success: false, error: "Only CEO is authorized to update working hours policy." });
		}

		const {
			timezone = "Asia/Kolkata",
			workingHoursStart = "04:00",
			workingHoursEnd = "23:00",
			enforceWorkingHours = true,
			blockTaskExecution = true,
			blockTaskSubmission = true,
			blockProjectSubmission = true,
			blockApprovalActions = true,
			blockTimerTracking = true,
			deadlinePolicy = "preserve_calendar",
			notifyBeforeEnd = true,
			notifyBeforeEndMinutes = 15,
			notifyRestrictedStart = true,
			notifyOperationalStart = true,
			weeklySchedule = [],
			reason = "Updated organization working hours schedule",
		} = req.body;

		// Validation: Start cannot equal End
		if (workingHoursStart === workingHoursEnd && enforceWorkingHours) {
			return res.status(400).json({
				success: false,
				error: "Operational start time must be different from operational end time.",
			});
		}

		const beforeSettings = await db.query.workspaceSettings.findFirst({
			where: eq(workspaceSettings.workspaceId, workspaceId),
		});

		// Update or Insert workspaceSettings
		if (beforeSettings) {
			await db
				.update(workspaceSettings)
				.set({
					timezone,
					workingHoursStart,
					workingHoursEnd,
					enforceWorkingHours,
					blockTaskExecution,
					blockTaskSubmission,
					blockProjectSubmission,
					blockApprovalActions,
					blockTimerTracking,
					deadlinePolicy,
					notifyBeforeEnd,
					notifyBeforeEndMinutes,
					notifyRestrictedStart,
					notifyOperationalStart,
					updatedAt: new Date(),
				})
				.where(eq(workspaceSettings.workspaceId, workspaceId));
		} else {
			await db.insert(workspaceSettings).values({
				id: `ws_set_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
				workspaceId,
				timezone,
				workingHoursStart,
				workingHoursEnd,
				enforceWorkingHours,
				blockTaskExecution,
				blockTaskSubmission,
				blockProjectSubmission,
				blockApprovalActions,
				blockTimerTracking,
				deadlinePolicy,
				notifyBeforeEnd,
				notifyBeforeEndMinutes,
				notifyRestrictedStart,
				notifyOperationalStart,
			});
		}

		// Update weekly schedule entries if provided
		if (Array.isArray(weeklySchedule) && weeklySchedule.length > 0) {
			for (const dayItem of weeklySchedule) {
				const dayOfWeek = parseInt(dayItem.dayOfWeek, 10);
				if (isNaN(dayOfWeek)) continue;

				const existingDay = await db.query.organizationWeeklySchedules.findFirst({
					where: and(
						eq(organizationWeeklySchedules.workspaceId, workspaceId),
						eq(organizationWeeklySchedules.dayOfWeek, dayOfWeek)
					),
				});

				if (existingDay) {
					await db
						.update(organizationWeeklySchedules)
						.set({
							isWorkingDay: Boolean(dayItem.isWorkingDay),
							startTime: dayItem.startTime || workingHoursStart,
							endTime: dayItem.endTime || workingHoursEnd,
							updatedAt: new Date(),
						})
						.where(eq(organizationWeeklySchedules.id, existingDay.id));
				} else {
					await db.insert(organizationWeeklySchedules).values({
						id: `wk_sch_${workspaceId}_${dayOfWeek}`,
						workspaceId,
						dayOfWeek,
						isWorkingDay: Boolean(dayItem.isWorkingDay),
						startTime: dayItem.startTime || workingHoursStart,
						endTime: dayItem.endTime || workingHoursEnd,
					});
				}
			}
		}

		const afterSettings = await db.query.workspaceSettings.findFirst({
			where: eq(workspaceSettings.workspaceId, workspaceId),
		});

		// Audit Log
		await OrganizationScheduleService.logAudit(
			workspaceId,
			userId,
			"POLICY_UPDATE",
			beforeSettings,
			afterSettings,
			reason
		);

		// Socket Notification
		socketService.emitToWorkspace(workspaceId, "org.working_hours.updated", {
			updatedBy: userId,
			timezone,
			workingHoursStart,
			workingHoursEnd,
			updatedAt: new Date(),
		});

		const newStatus = await OrganizationScheduleService.getScheduleStatus(workspaceId);

		return res.json({
			success: true,
			message: "Working hours & operational policy updated successfully.",
			data: {
				status: newStatus,
				policy: afterSettings,
			},
		});
	} catch (err: any) {
		logger.error(`Error updating working hours policy: ${err.message}`);
		return res.status(500).json({ success: false, error: "Failed to update working hours policy." });
	}
});

// 4. POST /exceptions - Add Exception/Holiday (CEO Only)
orgWorkingHoursRouter.post("/exceptions", async (req: Request, res: Response) => {
	try {
		const { userId, workspaceId, role } = await getOrgMembership(req);
		if (!workspaceId) {
			return res.status(403).json({ success: false, error: "Organization workspace context required." });
		}

		if (role !== "CEO" && role !== "SYSTEM_OWNER") {
			return res.status(403).json({ success: false, error: "Only CEO can manage schedule exceptions." });
		}

		const { date, reason, exceptionType = "CLOSED", isClosed = true, startTime, endTime } = req.body;
		if (!date || !reason) {
			return res.status(400).json({ success: false, error: "Date and Reason are required for exceptions." });
		}

		const existing = await db.query.organizationScheduleExceptions.findFirst({
			where: and(
				eq(organizationScheduleExceptions.workspaceId, workspaceId),
				eq(organizationScheduleExceptions.date, date)
			),
		});

		let exceptionId = existing?.id;
		if (existing) {
			await db
				.update(organizationScheduleExceptions)
				.set({
					reason,
					exceptionType,
					isClosed: Boolean(isClosed),
					startTime: startTime || null,
					endTime: endTime || null,
					createdBy: userId,
				})
				.where(eq(organizationScheduleExceptions.id, existing.id));
		} else {
			exceptionId = `exc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
			await db.insert(organizationScheduleExceptions).values({
				id: exceptionId,
				workspaceId,
				date,
				reason,
				exceptionType,
				isClosed: Boolean(isClosed),
				startTime: startTime || null,
				endTime: endTime || null,
				createdBy: userId,
			});
		}

		await OrganizationScheduleService.logAudit(
			workspaceId,
			userId,
			"EXCEPTION_ADDED",
			existing,
			{ date, reason, exceptionType, isClosed },
			`Schedule exception added for ${date}: ${reason}`
		);

		socketService.emitToWorkspace(workspaceId, "org.working_hours.updated", { date, type: exceptionType });

		return res.json({
			success: true,
			message: "Schedule exception saved successfully.",
			data: { id: exceptionId, date, reason, exceptionType, isClosed },
		});
	} catch (err: any) {
		logger.error(`Error saving schedule exception: ${err.message}`);
		return res.status(500).json({ success: false, error: "Failed to save schedule exception." });
	}
});

// 5. DELETE /exceptions/:id - Remove Exception (CEO Only)
orgWorkingHoursRouter.delete("/exceptions/:id", async (req: Request, res: Response) => {
	try {
		const { userId, workspaceId, role } = await getOrgMembership(req);
		if (!workspaceId) {
			return res.status(403).json({ success: false, error: "Organization workspace context required." });
		}

		if (role !== "CEO" && role !== "SYSTEM_OWNER") {
			return res.status(403).json({ success: false, error: "Only CEO can delete schedule exceptions." });
		}

		const exceptionId = req.params.id;
		const existing = await db.query.organizationScheduleExceptions.findFirst({
			where: and(
				eq(organizationScheduleExceptions.id, exceptionId),
				eq(organizationScheduleExceptions.workspaceId, workspaceId)
			),
		});

		if (!existing) {
			return res.status(404).json({ success: false, error: "Schedule exception not found." });
		}

		await db.delete(organizationScheduleExceptions).where(eq(organizationScheduleExceptions.id, exceptionId));

		await OrganizationScheduleService.logAudit(
			workspaceId,
			userId,
			"EXCEPTION_REMOVED",
			existing,
			null,
			`Schedule exception removed for date ${existing.date}`
		);

		socketService.emitToWorkspace(workspaceId, "org.working_hours.updated", { deletedId: exceptionId });

		return res.json({ success: true, message: "Schedule exception deleted successfully." });
	} catch (err: any) {
		logger.error(`Error deleting schedule exception: ${err.message}`);
		return res.status(500).json({ success: false, error: "Failed to delete schedule exception." });
	}
});

// 6. POST /emergency-override - Activate CEO Emergency Override (CEO Only)
orgWorkingHoursRouter.post("/emergency-override", async (req: Request, res: Response) => {
	try {
		const { userId, workspaceId, role } = await getOrgMembership(req);
		if (!workspaceId) {
			return res.status(403).json({ success: false, error: "Organization workspace context required." });
		}

		if (role !== "CEO" && role !== "SYSTEM_OWNER") {
			return res.status(403).json({ success: false, error: "Only CEO can activate emergency override." });
		}

		const { reason, durationMinutes = 60, allowedActions = ["task_execution", "task_submission", "project_submission", "approvals"] } = req.body;
		if (!reason || String(reason).trim().length === 0) {
			return res.status(400).json({ success: false, error: "Reason is required to enable Emergency Override." });
		}

		// Deactivate active overrides for workspace
		await db
			.update(organizationEmergencyOverrides)
			.set({ isActive: false })
			.where(and(eq(organizationEmergencyOverrides.workspaceId, workspaceId), eq(organizationEmergencyOverrides.isActive, true)));

		const now = new Date();
		const duration = Math.max(15, parseInt(String(durationMinutes), 10) || 60);
		const endTime = new Date(now.getTime() + duration * 60000);
		const overrideId = `em_ov_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

		await db.insert(organizationEmergencyOverrides).values({
			id: overrideId,
			workspaceId,
			activatedBy: userId,
			reason: reason.trim(),
			durationMinutes: duration,
			startTime: now,
			endTime,
			allowedActions,
			isActive: true,
		});

		await OrganizationScheduleService.logAudit(
			workspaceId,
			userId,
			"EMERGENCY_OVERRIDE_ENABLED",
			null,
			{ overrideId, reason, durationMinutes: duration, endTime },
			`Emergency Override activated: ${reason}`
		);

		socketService.emitToWorkspace(workspaceId, "org.working_hours.updated", { overrideActive: true, overrideId });

		const newStatus = await OrganizationScheduleService.getScheduleStatus(workspaceId);

		return res.json({
			success: true,
			message: "CEO Emergency Override activated successfully.",
			data: {
				id: overrideId,
				reason,
				durationMinutes: duration,
				endTime,
				status: newStatus,
			},
		});
	} catch (err: any) {
		logger.error(`Error activating emergency override: ${err.message}`);
		return res.status(500).json({ success: false, error: "Failed to activate emergency override." });
	}
});

// 7. DELETE /emergency-override - Deactivate Emergency Override (CEO Only)
orgWorkingHoursRouter.delete("/emergency-override", async (req: Request, res: Response) => {
	try {
		const { userId, workspaceId, role } = await getOrgMembership(req);
		if (!workspaceId) {
			return res.status(403).json({ success: false, error: "Organization workspace context required." });
		}

		if (role !== "CEO" && role !== "SYSTEM_OWNER") {
			return res.status(403).json({ success: false, error: "Only CEO can deactivate emergency override." });
		}

		await db
			.update(organizationEmergencyOverrides)
			.set({ isActive: false })
			.where(and(eq(organizationEmergencyOverrides.workspaceId, workspaceId), eq(organizationEmergencyOverrides.isActive, true)));

		await OrganizationScheduleService.logAudit(
			workspaceId,
			userId,
			"EMERGENCY_OVERRIDE_DISABLED",
			null,
			{ isActive: false },
			"Emergency Override ended manually by CEO"
		);

		socketService.emitToWorkspace(workspaceId, "org.working_hours.updated", { overrideActive: false });

		const newStatus = await OrganizationScheduleService.getScheduleStatus(workspaceId);

		return res.json({
			success: true,
			message: "CEO Emergency Override deactivated.",
			data: { status: newStatus },
		});
	} catch (err: any) {
		logger.error(`Error deactivating emergency override: ${err.message}`);
		return res.status(500).json({ success: false, error: "Failed to deactivate emergency override." });
	}
});

// 8. GET /history - Fetch Policy Audit History Log
orgWorkingHoursRouter.get("/history", async (req: Request, res: Response) => {
	try {
		const { workspaceId } = await getOrgMembership(req);
		if (!workspaceId) {
			return res.status(403).json({ success: false, error: "Organization workspace context required." });
		}

		const history = await db
			.select({
				id: organizationPolicyHistory.id,
				changeType: organizationPolicyHistory.changeType,
				beforeState: organizationPolicyHistory.beforeState,
				afterState: organizationPolicyHistory.afterState,
				reason: organizationPolicyHistory.reason,
				createdAt: organizationPolicyHistory.createdAt,
				changedBy: {
					id: users.id,
					name: users.displayName,
					email: users.email,
				},
			})
			.from(organizationPolicyHistory)
			.leftJoin(users, eq(organizationPolicyHistory.changedBy, users.id))
			.where(eq(organizationPolicyHistory.workspaceId, workspaceId))
			.orderBy(desc(organizationPolicyHistory.createdAt))
			.limit(50);

		return res.json({ success: true, data: history });
	} catch (err: any) {
		logger.error(`Error fetching policy history: ${err.message}`);
		return res.status(500).json({ success: false, error: "Failed to fetch policy history." });
	}
});
