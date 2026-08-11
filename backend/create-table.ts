import { sql } from "drizzle-orm";
import { db } from "./database/client";

async function create() {
	try {
		await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "personal"."personal_focus_sessions" (
        "id" text PRIMARY KEY NOT NULL,
        "user_id" text NOT NULL,
        "workspace_id" text NOT NULL,
        "project_id" text,
        "task_id" text,
        "started_at" timestamp NOT NULL,
        "paused_at" timestamp,
        "resumed_at" timestamp,
        "finished_at" timestamp,
        "active_duration" integer DEFAULT 0 NOT NULL,
        "total_duration" integer DEFAULT 0 NOT NULL,
        "paused_duration" integer DEFAULT 0 NOT NULL,
        "status" text DEFAULT 'IDLE' NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);
		console.log("Created table explicitly!");
	} catch (e) {
		console.error("Failed:", e);
	} finally {
		process.exit(0);
	}
}
create();
