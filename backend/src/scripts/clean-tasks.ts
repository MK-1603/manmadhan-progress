import { sql } from "drizzle-orm";
import { db } from "../../database/client";
import {
	activities,
	auditLogs,
	deadlineExtensions,
	tasks,
	timeTracking,
} from "../../database/schema";

async function cleanTaskData() {
	console.log("[TaskCleanup] Starting safe database task cleanup...");

	try {
		// 1. Delete deadline extensions
		await db.delete(deadlineExtensions);
		console.log("[TaskCleanup] Deleted deadline extensions.");

		// 2. Delete task time tracking / focus references
		await db.delete(timeTracking);
		console.log("[TaskCleanup] Deleted time tracking / focus records.");

		// 3. Delete task activities
		await db.delete(activities);
		console.log("[TaskCleanup] Deleted activity records.");

		// 4. Delete task audit logs
		await db.delete(auditLogs);
		console.log("[TaskCleanup] Deleted audit logs.");

		// 5. Delete all tasks
		await db.delete(tasks);
		console.log("[TaskCleanup] Deleted all task records.");

		// 6. Verify task count
		const remainingTasks = await db
			.select({ count: sql<number>`count(*)` })
			.from(tasks);
		console.log(
			`[TaskCleanup] Verification: Remaining task count = ${remainingTasks[0].count}`,
		);

		console.log(
			"[TaskCleanup] SUCCESS! All task data deleted safely. Projects, Users, Workspaces, and Roles preserved.",
		);
		process.exit(0);
	} catch (err: any) {
		console.error("[TaskCleanup] ERROR during task cleanup:", err);
		process.exit(1);
	}
}

cleanTaskData();
