import { db } from "../database/client";
import { sql } from "drizzle-orm";

async function syncTaskColumns() {
  console.log("=== SYNCING TASKS TABLE COLUMNS ===");

  const queries = [
    `ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_milestone_id_milestones_id_fk;`,
    `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by text REFERENCES users(id) ON DELETE SET NULL;`,
    `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_time timestamp;`,
    `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS end_time timestamp;`,
    `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS approval_required boolean DEFAULT false NOT NULL;`,
    `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS verification_required boolean DEFAULT false NOT NULL;`,
    `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deliverable text;`,
  ];

  for (const q of queries) {
    try {
      console.log("Executing:", q);
      await db.execute(sql.raw(q));
    } catch (e: any) {
      console.log("Warning executing query:", e.message);
    }
  }

  console.log("✅ Tasks table columns synchronized successfully!");
  process.exit(0);
}

syncTaskColumns().catch((err) => {
  console.error("Failed to sync task columns:", err);
  process.exit(1);
});
