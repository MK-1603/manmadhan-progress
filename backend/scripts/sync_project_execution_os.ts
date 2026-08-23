import { db } from "../database/client";
import { sql } from "drizzle-orm";

async function syncProjectExecutionOS() {
  console.log("=== SYNCING PROJECT EXECUTION OS DATABASE SCHEMA ===");

  const queries = [
    // 1. Projects table
    `ALTER TABLE projects ADD COLUMN IF NOT EXISTS execution_lead_id text REFERENCES users(id) ON DELETE SET NULL;`,

    // 2. Project Members table
    `CREATE TABLE IF NOT EXISTS project_members (
      id text PRIMARY KEY,
      project_id text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role text NOT NULL DEFAULT 'MEMBER',
      assigned_by_id text REFERENCES users(id) ON DELETE SET NULL,
      assigned_at timestamp NOT NULL DEFAULT NOW()
    );`,

    // 3. Project Work table
    `CREATE TABLE IF NOT EXISTS project_work (
      id text PRIMARY KEY,
      project_id text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      title text NOT NULL,
      description text,
      category text NOT NULL DEFAULT 'Development',
      status text NOT NULL DEFAULT 'Draft',
      owner_id text REFERENCES users(id) ON DELETE SET NULL,
      milestone_id text REFERENCES milestones(id) ON DELETE SET NULL,
      start_date timestamp,
      deadline timestamp,
      deliverable text,
      created_by_id text REFERENCES users(id) ON DELETE SET NULL,
      created_at timestamp NOT NULL DEFAULT NOW(),
      updated_at timestamp NOT NULL DEFAULT NOW()
    );`,

    // 4. Tasks table work_id
    `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS work_id text REFERENCES project_work(id) ON DELETE SET NULL;`,

    // 5. Project AI Tools table
    `ALTER TABLE project_ai_tools ADD COLUMN IF NOT EXISTS assigned_to_user_id text REFERENCES users(id) ON DELETE SET NULL;`,
    `ALTER TABLE project_ai_tools ADD COLUMN IF NOT EXISTS project_phase text DEFAULT 'Execution';`,

    // 6. Project Lifecycle status columns
    `ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_plan_status text NOT NULL DEFAULT 'PENDING';`,
    `ALTER TABLE project_members ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'INVITED';`,
  ];

  for (const q of queries) {
    try {
      console.log("Executing SQL:", q);
      await db.execute(sql.raw(q));
    } catch (err: any) {
      console.log("Warning executing SQL:", err.message);
    }
  }

  console.log("✅ Project Execution OS Database Sync Completed Successfully!");
  process.exit(0);
}

syncProjectExecutionOS().catch((err) => {
  console.error("❌ Failed to sync Project Execution OS schema:", err);
  process.exit(1);
});
