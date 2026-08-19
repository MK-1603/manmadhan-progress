import { and, eq, gte } from "drizzle-orm";
import { db } from "../../database/client";
import {
	organizationEmergencyOverrides,
	organizationPolicyHistory,
	organizationScheduleExceptions,
	organizationWeeklySchedules,
	workspaceSettings,
} from "../../database/schema";
import { logger } from "./logger.service";

export interface ScheduleStatus {
	workspaceId: string;
	timezone: string;
	currentState: "OPERATIONAL" | "RESTRICTED" | "EMERGENCY_OVERRIDE";
	isOperational: boolean;
	effectiveStart: string;
	effectiveEnd: string;
	restrictedStart: string;
	restrictedEnd: string;
	currentTime: string;
	currentDate: string;
	dayOfWeek: number;
	dayName: string;
	isWorkingDay: boolean;
	timeRemaining: {
		hours: number;
		minutes: number;
		formatted: string;
		totalMinutes: number;
	};
	nextTransition: {
		targetState: "OPERATIONAL" | "RESTRICTED";
		time: string;
		date: string;
		label: string;
	};
	activeOverride: {
		id: string;
		activatedBy: string;
		reason: string;
		durationMinutes: number;
		startTime: string;
		endTime: string;
		allowedActions: string[];
		isActive: boolean;
	} | null;
	activeException: {
		id: string;
		date: string;
		reason: string;
		exceptionType: string;
		isClosed: boolean;
		startTime?: string | null;
		endTime?: string | null;
	} | null;
	enforcement: {
		enforceWorkingHours: boolean;
		blockTaskExecution: boolean;
		blockTaskSubmission: boolean;
		blockProjectSubmission: boolean;
		blockApprovalActions: boolean;
		blockTimerTracking: boolean;
		deadlinePolicy: string;
		notifyBeforeEnd: boolean;
		notifyBeforeEndMinutes: number;
	};
}

export class OrganizationScheduleService {
	private static parseTimeToMinutes(timeStr: string): number {
		const [h, m] = timeStr.split(":").map((v) => parseInt(v, 10) || 0);
		return h * 60 + m;
	}

	public static getTimezoneNowInfo(timezone: string = "Asia/Kolkata") {
		const now = new Date();
		try {
			const formatter = new Intl.DateTimeFormat("en-US", {
				timeZone: timezone,
				year: "numeric",
				month: "2-digit",
				day: "2-digit",
				hour: "2-digit",
				minute: "2-digit",
				hour12: false,
				weekday: "short",
			});

			const parts = formatter.formatToParts(now);
			let year = "", month = "", day = "", hour = "", minute = "", weekday = "";
			for (const p of parts) {
				if (p.type === "year") year = p.value;
				if (p.type === "month") month = p.value;
				if (p.type === "day") day = p.value;
				if (p.type === "hour") hour = p.value === "24" ? "00" : p.value;
				if (p.type === "minute") minute = p.value;
				if (p.type === "weekday") weekday = p.value;
			}

			const dateStr = `${year}-${month}-${day}`;
			const timeStr = `${hour}:${minute}`;

			const daysMap: Record<string, number> = {
				Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
			};
			const dayOfWeek = daysMap[weekday] ?? now.getUTCDay();

			return { now, dateStr, timeStr, dayOfWeek, weekday };
		} catch (err) {
			logger.error(`Timezone formatting failed for ${timezone}, falling back to UTC: ${err}`);
			const dateStr = now.toISOString().split("T")[0];
			const timeStr = now.toISOString().substring(11, 16);
			return { now, dateStr, timeStr, dayOfWeek: now.getUTCDay(), weekday: "UTC" };
		}
	}

	public static async getScheduleStatus(workspaceId: string): Promise<ScheduleStatus> {
		let settings = await db.query.workspaceSettings.findFirst({
			where: eq(workspaceSettings.workspaceId, workspaceId),
		});

		if (!settings) {
			const newId = `ws_set_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
			await db.insert(workspaceSettings).values({
				id: newId,
				workspaceId,
				timezone: "Asia/Kolkata",
				workingHoursStart: "04:00",
				workingHoursEnd: "23:00",
				enforceWorkingHours: true,
			});
			settings = await db.query.workspaceSettings.findFirst({
				where: eq(workspaceSettings.workspaceId, workspaceId),
			});
		}

		const tz = settings?.timezone || "Asia/Kolkata";
		const defaultStart = settings?.workingHoursStart || "04:00";
		const defaultEnd = settings?.workingHoursEnd || "23:00";

		const { now, dateStr, timeStr, dayOfWeek, weekday } = this.getTimezoneNowInfo(tz);
		const currentMinutes = this.parseTimeToMinutes(timeStr);

		const activeOverrides = await db.query.organizationEmergencyOverrides.findMany({
			where: and(
				eq(organizationEmergencyOverrides.workspaceId, workspaceId),
				eq(organizationEmergencyOverrides.isActive, true),
				gte(organizationEmergencyOverrides.endTime, now)
			),
			orderBy: (o, { desc }) => [desc(o.createdAt)],
		});

		let overrideData = null;
		if (activeOverrides.length > 0) {
			const ov = activeOverrides[0];
			overrideData = {
				id: ov.id,
				activatedBy: ov.activatedBy,
				reason: ov.reason,
				durationMinutes: ov.durationMinutes,
				startTime: ov.startTime.toISOString(),
				endTime: ov.endTime.toISOString(),
				allowedActions: (ov.allowedActions as string[]) || [],
				isActive: true,
			};
		}

		const exception = await db.query.organizationScheduleExceptions.findFirst({
			where: and(
				eq(organizationScheduleExceptions.workspaceId, workspaceId),
				eq(organizationScheduleExceptions.date, dateStr)
			),
		});

		const weeklyDays = await db.query.organizationWeeklySchedules.findMany({
			where: eq(organizationWeeklySchedules.workspaceId, workspaceId),
		});

		const dayConfig = weeklyDays.find((d) => d.dayOfWeek === dayOfWeek);
		const isWorkingDay = dayConfig ? dayConfig.isWorkingDay : dayOfWeek !== 0 && dayOfWeek !== 6;

		let effectiveStart = dayConfig ? dayConfig.startTime : defaultStart;
		let effectiveEnd = dayConfig ? dayConfig.endTime : defaultEnd;
		let isClosed = !isWorkingDay;

		if (exception) {
			if (exception.isClosed || exception.exceptionType === "CLOSED") {
				isClosed = true;
			} else if (exception.startTime && exception.endTime) {
				isClosed = false;
				effectiveStart = exception.startTime;
				effectiveEnd = exception.endTime;
			}
		}

		const startMinutes = this.parseTimeToMinutes(effectiveStart);
		const endMinutes = this.parseTimeToMinutes(effectiveEnd);

		let isWithinHours = false;
		if (!isClosed) {
			if (startMinutes < endMinutes) {
				isWithinHours = currentMinutes >= startMinutes && currentMinutes < endMinutes;
			} else if (startMinutes > endMinutes) {
				isWithinHours = currentMinutes >= startMinutes || currentMinutes < endMinutes;
			}
		}

		const isOperational = overrideData ? true : (settings?.enforceWorkingHours ? isWithinHours : true);
		const currentState: "OPERATIONAL" | "RESTRICTED" | "EMERGENCY_OVERRIDE" = overrideData
			? "EMERGENCY_OVERRIDE"
			: isOperational
			? "OPERATIONAL"
			: "RESTRICTED";

		let remainingMinutes = 0;
		let nextTargetState: "OPERATIONAL" | "RESTRICTED" = "RESTRICTED";
		let nextTransitionTime = effectiveEnd;
		let nextTransitionLabel = "Restricted window begins";

		if (currentState === "EMERGENCY_OVERRIDE" && overrideData) {
			const diffMs = new Date(overrideData.endTime).getTime() - now.getTime();
			remainingMinutes = Math.max(0, Math.floor(diffMs / 60000));
			nextTargetState = "RESTRICTED";
			nextTransitionTime = new Date(overrideData.endTime).toLocaleTimeString("en-US", {
				timeZone: tz,
				hour: "2-digit",
				minute: "2-digit",
				hour12: false,
			});
			nextTransitionLabel = "Emergency override expires";
		} else if (isOperational) {
			nextTargetState = "RESTRICTED";
			nextTransitionTime = effectiveEnd;
			nextTransitionLabel = "Operational window ends";

			if (startMinutes < endMinutes) {
				remainingMinutes = endMinutes - currentMinutes;
			} else {
				if (currentMinutes >= startMinutes) {
					remainingMinutes = 1440 - currentMinutes + endMinutes;
				} else {
					remainingMinutes = endMinutes - currentMinutes;
				}
			}
		} else {
			nextTargetState = "OPERATIONAL";
			nextTransitionTime = effectiveStart;
			nextTransitionLabel = "Next operational window begins";

			if (isClosed) {
				remainingMinutes = 1440 - currentMinutes + startMinutes;
			} else if (startMinutes < endMinutes) {
				if (currentMinutes < startMinutes) {
					remainingMinutes = startMinutes - currentMinutes;
				} else {
					remainingMinutes = 1440 - currentMinutes + startMinutes;
				}
			} else {
				remainingMinutes = startMinutes - currentMinutes;
			}
		}

		remainingMinutes = Math.max(0, remainingMinutes);
		const remHours = Math.floor(remainingMinutes / 60);
		const remMins = remainingMinutes % 60;
		const formattedRem = `${remHours}h ${remMins}m`;

		const restrictedStart = effectiveEnd;
		const restrictedEnd = effectiveStart;

		return {
			workspaceId,
			timezone: tz,
			currentState,
			isOperational,
			effectiveStart,
			effectiveEnd,
			restrictedStart,
			restrictedEnd,
			currentTime: timeStr,
			currentDate: dateStr,
			dayOfWeek,
			dayName: weekday,
			isWorkingDay,
			timeRemaining: {
				hours: remHours,
				minutes: remMins,
				formatted: formattedRem,
				totalMinutes: remainingMinutes,
			},
			nextTransition: {
				targetState: nextTargetState,
				time: nextTransitionTime,
				date: dateStr,
				label: nextTransitionLabel,
			},
			activeOverride: overrideData,
			activeException: exception
				? {
						id: exception.id,
						date: exception.date,
						reason: exception.reason,
						exceptionType: exception.exceptionType,
						isClosed: exception.isClosed,
						startTime: exception.startTime,
						endTime: exception.endTime,
				  }
				: null,
			enforcement: {
				enforceWorkingHours: settings?.enforceWorkingHours ?? true,
				blockTaskExecution: settings?.blockTaskExecution ?? true,
				blockTaskSubmission: settings?.blockTaskSubmission ?? true,
				blockProjectSubmission: settings?.blockProjectSubmission ?? true,
				blockApprovalActions: settings?.blockApprovalActions ?? true,
				blockTimerTracking: settings?.blockTimerTracking ?? true,
				deadlinePolicy: settings?.deadlinePolicy || "preserve_calendar",
				notifyBeforeEnd: settings?.notifyBeforeEnd ?? true,
				notifyBeforeEndMinutes: settings?.notifyBeforeEndMinutes ?? 15,
			},
		};
	}

	public static async isActionAllowed(
		workspaceId: string,
		userRole: string,
		actionType: "task_execution" | "task_submission" | "project_submission" | "approvals" | "timer"
	): Promise<{ allowed: boolean; reason?: string; status: ScheduleStatus }> {
		const status = await this.getScheduleStatus(workspaceId);

		if (!status.enforcement.enforceWorkingHours) {
			return { allowed: true, status };
		}

		if (status.isOperational) {
			return { allowed: true, status };
		}

		if (status.activeOverride) {
			const allowedActions = status.activeOverride.allowedActions || [];
			if (allowedActions.includes(actionType) || allowedActions.includes("ALL")) {
				return { allowed: true, status };
			}
		}

		const actionMap: Record<string, boolean> = {
			task_execution: status.enforcement.blockTaskExecution,
			task_submission: status.enforcement.blockTaskSubmission,
			project_submission: status.enforcement.blockProjectSubmission,
			approvals: status.enforcement.blockApprovalActions,
			timer: status.enforcement.blockTimerTracking,
		};

		const isBlocked = actionMap[actionType] ?? true;
		if (isBlocked) {
			return {
				allowed: false,
				reason: `Action '${actionType}' is restricted outside operational working hours (${status.effectiveStart} – ${status.effectiveEnd} ${status.timezone}). Next window at ${status.nextTransition.time}.`,
				status,
			};
		}

		return { allowed: true, status };
	}

	public static async logAudit(
		workspaceId: string,
		userId: string,
		changeType: string,
		beforeState: any,
		afterState: any,
		reason?: string
	) {
		try {
			await db.insert(organizationPolicyHistory).values({
				id: `pol_hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
				workspaceId,
				changedBy: userId,
				changeType,
				beforeState,
				afterState,
				reason: reason || "Organization operational policy updated",
			});
		} catch (err) {
			logger.error(`Failed to log policy audit: ${err}`);
		}
	}
}
