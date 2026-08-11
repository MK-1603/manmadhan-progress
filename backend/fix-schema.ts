import { Pool } from "pg";
import { env } from "./config/env.config";

const pool = new Pool({
	connectionString: env.PERSONAL_DATABASE_URL,
	ssl: { rejectUnauthorized: false },
});

async function run() {
	const client = await pool.connect();
	try {
		await client.query(`
      ALTER TABLE personal.personal_tasks 
      ADD COLUMN IF NOT EXISTS scheduled_start TIMESTAMP,
      ADD COLUMN IF NOT EXISTS scheduled_end TIMESTAMP,
      ADD COLUMN IF NOT EXISTS focus_duration INTEGER,
      ADD COLUMN IF NOT EXISTS dependencies JSONB DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS calendar_event_id TEXT,
      ADD COLUMN IF NOT EXISTS sync_to_calendar BOOLEAN DEFAULT false
    `);
		console.log("Successfully added missing columns!");
	} catch (err) {
		console.error("Error altering table:", err);
	} finally {
		client.release();
		pool.end();
	}
}
run();
