import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { db } from "../../database/client";
import { auditLogs, users } from "../../database/schema";
import { logger } from "./logger.service";
import { normalizeDate } from "../utils/date-normalizer";
import { socketService } from "./socket.service";

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
			const id = randomUUID();
			const formattedDetails =
				typeof details === "object" && details !== null
					? JSON.stringify(details)
					: String(details || "");

			const now = normalizeDate(new Date()) || new Date();

			await db.insert(auditLogs).values({
				id,
				userId: userId || null,
				workspaceId: workspaceId || null,
				eventType: eventType || "SYSTEM_EVENT",
				details: formattedDetails,
				ipAddress: ipAddress || null,
				createdAt: now,
			});

			logger.info(`[Timeline] Logged real activity: ${eventType}`);

			// Realtime socket emission if workspace exists
			if (workspaceId) {
				let actorName = "System";
				if (userId) {
					const [u] = await db
						.select({ name: users.displayName, email: users.email })
						.from(users)
						.where(eq(users.id, userId))
						.limit(1);
					if (u) actorName = u.name || u.email || "System";
				}

				socketService.emitToWorkspace(workspaceId, "audit.created", {
					id,
					workspaceId,
					eventType,
					details: formattedDetails,
					actor: { id: userId, name: actorName },
					createdAt: now.toISOString(),
				});
			}
		} catch (error: any) {
			logger.warn(`Timeline event logging skipped: ${error?.message || error}`);
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
