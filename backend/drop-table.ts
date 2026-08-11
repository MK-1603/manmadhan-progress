import { sql } from "drizzle-orm";
import { db } from "./database/client";

async function run() {
	try {
		await db.execute(
			sql`DROP TABLE IF EXISTS personal.personal_focus_sessions CASCADE;`,
		);
		console.log("Dropped table.");
	} catch (e) {
		console.error("Failed:", e);
	} finally {
		process.exit(0);
	}
}
run();
