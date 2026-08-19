import { db } from "../database/client";
import { sql } from "drizzle-orm";

async function syncProjectSubmissionsTable() {
	console.log("Synchronizing project_submissions table schema in PostgreSQL...");
	try {
		await db.execute(sql`
			CREATE TABLE IF NOT EXISTS project_submissions (
				id TEXT PRIMARY KEY,
				project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
				workspace_id TEXT NOT NULL,
				title TEXT NOT NULL,
				description TEXT NOT NULL,
				submitted_by TEXT NOT NULL,
				submitted_role TEXT DEFAULT 'CO-CEO',
				status TEXT DEFAULT 'Under Review' NOT NULL,
				file_url TEXT,
				file_name TEXT,
				file_size INTEGER,
				deployment_url TEXT,
				application_url TEXT,
				repository_url TEXT,
				version_tag TEXT,
				reviewer_notes TEXT,
				reviewed_by TEXT,
				reviewed_at TIMESTAMP,
				submitted_at TIMESTAMP DEFAULT NOW() NOT NULL,
				created_at TIMESTAMP DEFAULT NOW() NOT NULL
			);
		`);
		console.log("✅ project_submissions table synchronized successfully!");
	} catch (err: any) {
		console.error("❌ Failed to sync project_submissions table:", err.message);
	}
}

syncProjectSubmissionsTable().then(() => process.exit(0)).catch(() => process.exit(1));
