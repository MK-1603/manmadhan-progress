import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { db } from "../../database/client";
import { auditLogs } from "../../database/schema";
import { logger } from "./logger.service";
import { normalizeDate } from "../utils/date-normalizer";

export class AuditService {
	/**
	 * Log an authentication, task, or timeline activity event
	 */
	static async logEvent(
		userId: string | null,
		eventType: string,
		details: any,
		ipAddress: string | null = null,
		workspaceId: string | null = null,
	) {
		try {
			const formattedDetails =
				typeof details === "object" && details !== null
					? JSON.stringify(details)
					: String(details || "");

			await db.insert(auditLogs).values({
				id: randomUUID(),
				userId: userId || null,
				workspaceId: workspaceId || null,
				eventType: eventType || "SYSTEM_EVENT",
				details: formattedDetails,
				ipAddress: ipAddress || null,
				createdAt: normalizeDate(new Date()) || new Date(),
			});
			logger.info("Timeline updated");
		} catch (error: any) {
			logger.warn("Timeline update skipped");
		}
	}

	/**
	 * Retrieve recent logs for a user
	 */
	static async getUserLogs(userId: string, limit: number = 10) {
		return db
			.select()
			.from(auditLogs)
			.where(eq(auditLogs.userId, userId))
			.orderBy(desc(auditLogs.createdAt))
			.limit(limit);
	}
}
