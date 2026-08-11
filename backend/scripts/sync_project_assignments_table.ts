import { authPool } from "../database/client";

async function syncProjectAssignmentsTable() {
  console.log("=== SYNCING & ALTERING PROJECT ASSIGNMENTS TABLE ===");
  const client = await authPool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS project_assignments (
        id text PRIMARY KEY,
        project_id text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        workspace_id text REFERENCES workspaces(id),
        created_by_user_id text NOT NULL REFERENCES users(id),
        assigned_to_user_id text NOT NULL REFERENCES users(id),
        responsible_co_ceo_id text REFERENCES users(id),
        assignment_type text NOT NULL DEFAULT 'CEO_TO_CO_CEO',
        status text NOT NULL DEFAULT 'PENDING_ACCEPTANCE',
        rejection_reason text,
        accepted_at timestamp,
        declined_at timestamp,
        created_at timestamp NOT NULL DEFAULT NOW(),
        updated_at timestamp NOT NULL DEFAULT NOW()
      );

      ALTER TABLE project_assignments ADD COLUMN IF NOT EXISTS workspace_id text REFERENCES workspaces(id);
      ALTER TABLE project_assignments ADD COLUMN IF NOT EXISTS responsible_co_ceo_id text REFERENCES users(id);
      ALTER TABLE project_assignments ADD COLUMN IF NOT EXISTS assignment_type text NOT NULL DEFAULT 'CEO_TO_CO_CEO';
      ALTER TABLE project_assignments ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'PENDING_ACCEPTANCE';
      ALTER TABLE project_assignments ADD COLUMN IF NOT EXISTS rejection_reason text;
      ALTER TABLE project_assignments ADD COLUMN IF NOT EXISTS accepted_at timestamp;
      ALTER TABLE project_assignments ADD COLUMN IF NOT EXISTS declined_at timestamp;
    `);
    console.log("✅ Table 'project_assignments' altered & synced successfully.");
  } catch (err) {
    console.error("❌ Error syncing project_assignments table:", err);
  } finally {
    client.release();
    process.exit(0);
  }
}

syncProjectAssignmentsTable();
