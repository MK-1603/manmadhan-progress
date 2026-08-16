import { and, eq, inArray, or } from "drizzle-orm";
import cron from "node-cron";
import { db, personalDb } from "../../database/client";
import {
	personalFocusSessions,
	personalTasks,
	timeTracking,
} from "../../database/schema";
import { logger } from "./logger.service";

class CronService {
	private tasks: any[] = [];

	public start() {
		// 11:00 PM System Off (Stop tracking active tasks, prepare end-of-day data)
		const task1 = cron.schedule("0 23 * * *", async () => {
			logger.info("[Cron] Running 11 PM System Off Job...");
			try {
				// Find all RUNNING focus sessions and pause them to stop tracking
				const activeSessions = await personalDb
					.select()
					.from(personalFocusSessions)
					.where(eq(personalFocusSessions.status, "RUNNING"));

				if (activeSessions.length > 0) {
					const now = new Date();
					for (const session of activeSessions) {
						const lastStart = session.resumedAt
							? new Date(session.resumedAt).getTime()
							: new Date(session.startedAt).getTime();
						const activeTime = Math.max(
							0,
							Math.floor((now.getTime() - lastStart) / 1000),
						);
						const newTotalActive = session.activeDuration + activeTime;

						await personalDb
							.update(personalFocusSessions)
							.set({
								status: "PAUSED",
								pausedAt: now,
								activeDuration: newTotalActive,
								updatedAt: now,
							})
							.where(eq(personalFocusSessions.id, session.id));
					}
					logger.info(
						`[Cron] Auto-paused ${activeSessions.length} active sessions at 11 PM.`,
					);
				}

				// Also stop active organization focus sessions in timeTracking
				const activeOrgSessions = await db
					.select()
					.from(timeTracking)
					.where(
						or(
							eq(timeTracking.status, "Active"),
							eq(timeTracking.status, "Paused"),
						),
					);

				if (activeOrgSessions.length > 0) {
					const now = new Date();
					for (const session of activeOrgSessions) {
						let sessionSeconds = session.durationSeconds || 0;
						if (session.status === "Active" && session.startTime) {
							const elapsed = Math.floor(
								(now.getTime() - new Date(session.startTime).getTime()) / 1000,
							);
							sessionSeconds += Math.max(0, elapsed);
						}

						await db
							.update(timeTracking)
							.set({
								status: "Stopped",
								endTime: now,
								durationSeconds: sessionSeconds,
							})
							.where(eq(timeTracking.id, session.id));
					}
					logger.info(
						`[Cron] Auto-stopped ${activeOrgSessions.length} org focus sessions at 11 PM.`,
					);
				}
			} catch (error) {
				logger.error(`[Cron] 11 PM Job Error: ${error}`);
			}
		});

		// 4:00 AM Reset & Carry-Forward (Daily Reset Engine)
		const task2 = cron.schedule("0 4 * * *", async () => {
			logger.info("[Cron] Running 4 AM Daily Reset & Carry-Forward Job...");
			try {
				const now = new Date();

				// Find tasks due yesterday that are not completed (Carry Forward)
				const allTasks = await personalDb
					.select()
					.from(personalTasks)
					.where(
						and(
							inArray(personalTasks.status, ["TODO", "IN_PROGRESS", "PAUSED"]),
						),
					);

				let carriedForwardCount = 0;
				for (const task of allTasks) {
					if (task.deadline) {
						const deadlineDate = new Date(task.deadline);
						// If the deadline was before today at 4 AM, push it to today
						if (deadlineDate < now) {
							const newDeadline = new Date(now);
							newDeadline.setHours(23, 59, 59, 999);

							await personalDb
								.update(personalTasks)
								.set({ deadline: newDeadline, updatedAt: now })
								.where(eq(personalTasks.id, task.id));
							carriedForwardCount++;
						}
					}
				}

				if (carriedForwardCount > 0) {
					logger.info(
						`[Cron] Carried forward ${carriedForwardCount} tasks to today.`,
					);
				}
			} catch (error) {
				logger.error(`[Cron] 4 AM Job Error: ${error}`);
			}
		});

		this.tasks.push(task1, task2);
	}

	public stop() {
		for (const t of this.tasks) {
			try {
				t.stop();
			} catch (_e) {
				// Suppress errors during stop
			}
		}
		this.tasks = [];
	}
}

export const cronService = new CronService();
