import { Client } from "pg";
import { env } from "../config/env.config";

async function run() {
	const client = new Client({
		connectionString: env.DATABASE_URL,
		ssl: { rejectUnauthorized: false },
	});

	await client.connect();

	console.log("Migrating database schema for Master Build Tables & Columns...");

	const sqls = [
		// 1. Project Features table
		`CREATE TABLE IF NOT EXISTS "project_features" (
      "id" text PRIMARY KEY NOT NULL,
      "project_id" text NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
      "name" text NOT NULL,
      "description" text,
      "priority" text DEFAULT 'MEDIUM' NOT NULL,
      "status" text DEFAULT 'PLANNED' NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    );`,

		// 2. Project GitHub table
		`CREATE TABLE IF NOT EXISTS "project_github" (
      "id" text PRIMARY KEY NOT NULL,
      "project_id" text NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
      "repository_url" text NOT NULL,
      "owner" text,
      "repo_name" text,
      "default_branch" text DEFAULT 'main' NOT NULL,
      "status" text DEFAULT 'Connected' NOT NULL,
      "connected_by_id" text REFERENCES "users"("id") ON DELETE SET NULL,
      "created_at" timestamp DEFAULT now() NOT NULL
    );`,

		// 3. Tasks table new columns
		`ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "feature_id" text REFERENCES "project_features"("id") ON DELETE SET NULL;`,
		`ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "requires_document" boolean DEFAULT false NOT NULL;`,
		`ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "requires_github" boolean DEFAULT false NOT NULL;`,
		`ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "github_pr_url" text;`,
		`ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "github_commit_sha" text;`,
	];

	for (const statement of sqls) {
		try {
			await client.query(statement);
			console.log(`Executed migration statement successfully.`);
		} catch (err: any) {
			console.error(`Statement error:`, err.message);
		}
	}

	console.log("Master Build Database Migration Complete!");
	await client.end();
}

run().catch(console.error);
