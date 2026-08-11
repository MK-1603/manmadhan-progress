import * as dotenv from "dotenv";
import * as path from "path";
import { Pool } from "pg";

dotenv.config({ path: path.join(__dirname, "../.env") });

const pool = new Pool({
	connectionString: process.env.PERSONAL_DATABASE_URL,
	ssl:
		process.env.NODE_ENV === "production"
			? { rejectUnauthorized: false }
			: false,
});

async function migrate() {
	const client = await pool.connect();
	try {
		console.log("Running Personal DB V2 migrations...");

		await client.query(`
      CREATE TABLE IF NOT EXISTS personal.personal_features (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES personal.personal_projects(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        priority TEXT DEFAULT 'MEDIUM' NOT NULL,
        status TEXT DEFAULT 'PLANNED' NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
		console.log("✓ personal_features");

		await client.query(`
      CREATE TABLE IF NOT EXISTS personal.personal_requirements (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES personal.personal_projects(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        category TEXT DEFAULT 'Functional' NOT NULL,
        status TEXT DEFAULT 'PLANNED' NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
		console.log("✓ personal_requirements");

		await client.query(`
      CREATE TABLE IF NOT EXISTS personal.personal_prompt_library (
        id TEXT PRIMARY KEY,
        owner_user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT DEFAULT 'Custom' NOT NULL,
        body TEXT NOT NULL,
        variables JSONB DEFAULT '[]',
        tags JSONB DEFAULT '[]',
        is_favorite BOOLEAN DEFAULT FALSE NOT NULL,
        is_system BOOLEAN DEFAULT FALSE NOT NULL,
        usage_count INTEGER DEFAULT 0 NOT NULL,
        last_used_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
		console.log("✓ personal_prompt_library");

		await client.query(`
      CREATE TABLE IF NOT EXISTS personal.personal_task_submissions (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL REFERENCES personal.personal_tasks(id) ON DELETE CASCADE,
        owner_user_id TEXT NOT NULL,
        content TEXT,
        github_pr_url TEXT,
        attachments JSONB DEFAULT '[]',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
		console.log("✓ personal_task_submissions");

		await client.query(`
      CREATE TABLE IF NOT EXISTS personal.personal_daily_motivations (
        id TEXT PRIMARY KEY,
        owner_user_id TEXT NOT NULL,
        text TEXT NOT NULL,
        date TEXT NOT NULL,
        is_hidden BOOLEAN DEFAULT FALSE NOT NULL,
        is_saved BOOLEAN DEFAULT FALSE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
		console.log("✓ personal_daily_motivations");

		// Add columns to existing tables (safe with IF NOT EXISTS)
		await client.query(`
      ALTER TABLE personal.personal_documents
      ADD COLUMN IF NOT EXISTS project_id TEXT,
      ADD COLUMN IF NOT EXISTS task_id TEXT;
    `);
		console.log("✓ personal_documents: project_id, task_id columns");

		await client.query(`
      ALTER TABLE personal.personal_tasks
      ADD COLUMN IF NOT EXISTS feature_id TEXT,
      ADD COLUMN IF NOT EXISTS requires_document BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS requires_github BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS github_pr_url TEXT;
    `);
		console.log(
			"✓ personal_tasks: feature_id, requiresDocument, requiresGithub columns",
		);

		// Performance indexes
		await client.query(`
      CREATE INDEX IF NOT EXISTS idx_pf_project ON personal.personal_features(project_id);
      CREATE INDEX IF NOT EXISTS idx_pr_project ON personal.personal_requirements(project_id);
      CREATE INDEX IF NOT EXISTS idx_ppl_user ON personal.personal_prompt_library(owner_user_id);
      CREATE INDEX IF NOT EXISTS idx_pdoc_project ON personal.personal_documents(project_id);
      CREATE INDEX IF NOT EXISTS idx_ptask_feature ON personal.personal_tasks(feature_id);
      CREATE INDEX IF NOT EXISTS idx_pdm_user_date ON personal.personal_daily_motivations(owner_user_id, date);
    `);
		console.log("✓ Performance indexes created");

		console.log("\n✅ Personal DB V2 migration complete!");
	} catch (err) {
		console.error("Migration error:", err);
		throw err;
	} finally {
		client.release();
		await pool.end();
	}
}

migrate().catch(console.error);
