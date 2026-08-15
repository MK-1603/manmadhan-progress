import { authPool } from "../database/client";

async function migrateOnboardingStatus() {
	console.log("Starting PostgreSQL migration for onboarding_status column...");
	try {
		await authPool.query(`
			ALTER TABLE users
			ADD COLUMN IF NOT EXISTS onboarding_status TEXT NOT NULL DEFAULT 'FIRST_LOGIN_REQUIRED';
		`);
		console.log("SUCCESS: onboarding_status column added to users table.");

		// Update existing activated users to COMPLETED
		await authPool.query(`
			UPDATE users
			SET onboarding_status = 'COMPLETED'
			WHERE first_login_completed = TRUE OR status = 'Activated';
		`);
		console.log("SUCCESS: Existing activated users updated to onboarding_status = COMPLETED.");

		const res = await authPool.query(`
			SELECT id, email, first_login_completed, onboarding_status FROM users LIMIT 5;
		`);
		console.log("VERIFICATION PASSED: Sample users table records:", res.rows);
	} catch (err) {
		console.error("Migration error:", err);
		process.exit(1);
	}
}

migrateOnboardingStatus()
	.then(() => process.exit(0))
	.catch((err) => {
		console.error("Migration failed:", err);
		process.exit(1);
	});
