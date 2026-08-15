import { authPool } from "../database/client";

async function runMigration() {
	try {
		console.log("Starting PostgreSQL schema migration for first_login_completed column...");

		// 1. Add missing column first_login_completed to users table
		await authPool.query(`
			ALTER TABLE users
			ADD COLUMN IF NOT EXISTS first_login_completed BOOLEAN NOT NULL DEFAULT FALSE;
		`);
		console.log("SUCCESS: Column first_login_completed added to users table.");

		// 2. Preserve existing activated accounts safely so existing users are not unexpectedly locked out
		await authPool.query(`
			UPDATE users
			SET first_login_completed = TRUE
			WHERE status = 'Activated' AND (is_google_enabled = TRUE OR google_id IS NOT NULL);
		`);
		console.log("SUCCESS: Existing activated users safely updated.");

		// 3. Verify column existence with a test SELECT query
		const result = await authPool.query(`
			SELECT id, email, first_login_completed FROM users LIMIT 3;
		`);
		console.log("VERIFICATION PASSED: Sample records from users table:", result.rows);

		process.exit(0);
	} catch (error) {
		console.error("Migration failed with error:", error);
		process.exit(1);
	}
}

runMigration();
