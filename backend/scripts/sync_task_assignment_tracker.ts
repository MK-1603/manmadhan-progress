import { db } from "../database/client";
import { sql } from "drizzle-orm";

async function syncTaskAssignmentTracker() {
  console.log("=== SYNCING TASK ASSIGNMENT TRACKER TABLE ===");

  const queries = [
    `CREATE TABLE IF NOT EXISTS task_assignment_tracker (
      id text PRIMARY KEY,
      task_id text NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      assignee_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      assigned_by_id text NOT NULL REFERENCES users(id),
      assignee_role text NOT NULL,
      status text DEFAULT 'PENDING_ACCEPTANCE' NOT NULL,
      decline_reason text,
      accepted_at timestamp,
      declined_at timestamp,
      reassigned_at timestamp,
      workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      created_at timestamp DEFAULT now() NOT NULL,
      updated_at timestamp DEFAULT now() NOT NULL
    );`,
  ];

  for (const q of queries) {
    try {
      console.log("Executing query...");
      await db.execute(sql.raw(q));
    } catch (e: any) {
      console.log("Warning executing query:", e.message);
    }
  }

  console.log("✅ task_assignment_tracker table synchronized successfully!");
  process.exit(0);
}

syncTaskAssignmentTracker().catch((err) => {
  console.error("Failed to sync task assignment tracker:", err);
  process.exit(1);
});
