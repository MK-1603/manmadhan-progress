import { Client } from "pg";
import { env } from "../config/env.config";

async function run() {
	const client = new Client({
		connectionString: env.DATABASE_URL,
		ssl: { rejectUnauthorized: false },
	});

	await client.connect();

	console.log(
		"Migrating database schema for Canonical Project Model & Tables...",
	);

	const sqls = [
		// 1. Projects columns
		`ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "slug" text;`,
		`ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "risk_level" text DEFAULT 'LOW';`,
		`ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "scope" jsonb DEFAULT '[]'::jsonb;`,
		`ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "out_of_scope" jsonb DEFAULT '[]'::jsonb;`,
		`ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "created_by" text REFERENCES "users"("id");`,
		`ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();`,

		// 2. Milestones columns
		`ALTER TABLE "milestones" ADD COLUMN IF NOT EXISTS "owner_id" text REFERENCES "users"("id") ON DELETE SET NULL;`,

		// 3. Project Requirements table
		`CREATE TABLE IF NOT EXISTS "project_requirements" (
      "id" text PRIMARY KEY NOT NULL,
      "project_id" text NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
      "title" text NOT NULL,
      "description" text,
      "category" text DEFAULT 'Functional' NOT NULL,
      "status" text DEFAULT 'Draft' NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL
    );`,

		// 4. Project Documents table
		`CREATE TABLE IF NOT EXISTS "project_documents" (
      "id" text PRIMARY KEY NOT NULL,
      "project_id" text NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
      "doc_type" text NOT NULL,
      "title" text NOT NULL,
      "url" text,
      "status" text DEFAULT 'Required' NOT NULL,
      "uploaded_by_id" text REFERENCES "users"("id") ON DELETE SET NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    );`,

		// 5. Project Roadmaps table
		`CREATE TABLE IF NOT EXISTS "project_roadmaps" (
      "id" text PRIMARY KEY NOT NULL,
      "project_id" text NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
      "title" text NOT NULL,
      "description" text,
      "phase" text,
      "start_date" timestamp,
      "deadline" timestamp,
      "status" text DEFAULT 'Planning' NOT NULL,
      "order" integer DEFAULT 0,
      "created_at" timestamp DEFAULT now() NOT NULL
    );`,
	];

	for (const statement of sqls) {
		try {
			await client.query(statement);
			console.log(`Successfully executed statement.`);
		} catch (err: any) {
			console.error(`Statement error:`, err.message);
		}
	}

	console.log("Canonical Database Migration Complete!");
	await client.end();
}

run().catch(console.error);
