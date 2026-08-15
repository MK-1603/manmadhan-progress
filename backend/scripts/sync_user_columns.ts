import { authPool } from "../database/client";

async function syncUserColumns() {
	console.log("Synchronizing PostgreSQL users table schema columns...");
	const client = await authPool.connect();
	try {
		await client.query(`
			ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;
			ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE;
			ALTER TABLE users ADD COLUMN IF NOT EXISTS last_inactivity_notification_at TIMESTAMP WITH TIME ZONE;
		`);
		console.log("✅ Successfully verified & synchronized users table columns (last_login_at, last_active_at, last_inactivity_notification_at).");
	} catch (err: any) {
		console.error("❌ Schema synchronization error:", err?.message || err);
	} finally {
		client.release();
		process.exit(0);
	}
}

syncUserColumns();
