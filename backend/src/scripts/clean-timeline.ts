import { sql } from "drizzle-orm";
import { db } from "../../database/client";
import { activities, auditLogs } from "../../database/schema";

async function cleanTimelineData() {
	console.log("[TimelineCleanup] Clearing all stored timeline audit logs and activities...");

	try {
		await db.delete(auditLogs);
		console.log("[TimelineCleanup] Deleted all audit logs.");

		await db.delete(activities);
		console.log("[TimelineCleanup] Deleted all activity logs.");

		const remainingLogs = await db
			.select({ count: sql<number>`count(*)` })
			.from(auditLogs);

		console.log(
			`[TimelineCleanup] Verification: Remaining timeline logs = ${remainingLogs[0].count}`,
		);

		console.log("[TimelineCleanup] SUCCESS! All timeline history cleared.");
		process.exit(0);
	} catch (err: any) {
		console.error("[TimelineCleanup] ERROR during timeline cleanup:", err);
		process.exit(1);
	}
}

cleanTimelineData();
