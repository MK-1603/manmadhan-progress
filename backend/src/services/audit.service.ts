import { db } from "../../database/client";
import { auditLogs } from "../../database/schema";
import { randomUUID } from "crypto";
import { eq, desc } from "drizzle-orm";

export class AuditService {
  /**
   * Log an authentication or system event
   */
  static async logEvent(
    userId: string | null,
    eventType: string,
    details: string,
    ipAddress: string | null = null
  ) {
    try {
      await db.insert(auditLogs).values({
        id: randomUUID(),
        userId,
        eventType,
        details,
        ipAddress,
      });
    } catch (error) {
      console.error("[AuditService] Failed to log event:", error);
    }
  }

  /**
   * Retrieve recent logs for a user
   */
  static async getUserLogs(userId: string, limit: number = 10) {
    return db.select().from(auditLogs)
      .where(eq(auditLogs.userId, userId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
  }
}
