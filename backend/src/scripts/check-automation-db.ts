import { db } from "../../database/client";
import { sql } from "drizzle-orm";

async function main() {
  console.log("[DBCheck] Checking PostgreSQL database automations table...");
  try {
    const colCheck = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'automations';
    `);

    const columns = (colCheck.rows || colCheck) as any[];
    console.log("[DBCheck] Existing columns:", columns.map((c) => c.column_name));

    // Ensure automations table exists with all required columns
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS automations (
        id text PRIMARY KEY,
        workspace_id text,
        created_by_user_id text NOT NULL,
        name text NOT NULL,
        description text DEFAULT '',
        creation_mode text DEFAULT 'PROMPT' NOT NULL,
        original_prompt text,
        trigger_type text NOT NULL,
        trigger_config jsonb DEFAULT '{}'::jsonb NOT NULL,
        condition_config jsonb DEFAULT '{}'::jsonb NOT NULL,
        action_type text NOT NULL,
        action_config jsonb DEFAULT '{}'::jsonb NOT NULL,
        status text DEFAULT 'ACTIVE' NOT NULL,
        requires_confirmation boolean DEFAULT false NOT NULL,
        last_run_at timestamp,
        next_run_at timestamp,
        run_count integer DEFAULT 0 NOT NULL,
        failure_count integer DEFAULT 0 NOT NULL,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL
      );
    `);
    console.log("[DBCheck] Ensured table 'automations' exists.");

    // Check if columns were missing and add them if needed
    const existingColNames = new Set(columns.map((c) => c.column_name));

    if (!existingColNames.has("failure_count")) {
      await db.execute(sql`ALTER TABLE automations ADD COLUMN IF NOT EXISTS failure_count integer DEFAULT 0 NOT NULL;`);
      console.log("[DBCheck] Added column failure_count.");
    }
    if (!existingColNames.has("creation_mode")) {
      await db.execute(sql`ALTER TABLE automations ADD COLUMN IF NOT EXISTS creation_mode text DEFAULT 'PROMPT' NOT NULL;`);
      console.log("[DBCheck] Added column creation_mode.");
    }
    if (!existingColNames.has("original_prompt")) {
      await db.execute(sql`ALTER TABLE automations ADD COLUMN IF NOT EXISTS original_prompt text;`);
      console.log("[DBCheck] Added column original_prompt.");
    }
    if (!existingColNames.has("requires_confirmation")) {
      await db.execute(sql`ALTER TABLE automations ADD COLUMN IF NOT EXISTS requires_confirmation boolean DEFAULT false NOT NULL;`);
      console.log("[DBCheck] Added column requires_confirmation.");
    }

    // Ensure automation_logs table exists
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS automation_logs (
        id text PRIMARY KEY,
        automation_id text NOT NULL,
        workspace_id text,
        user_id text,
        status text NOT NULL,
        triggered_by text NOT NULL,
        execution_details jsonb DEFAULT '{}'::jsonb NOT NULL,
        error_message text,
        reason text,
        executed_at timestamp DEFAULT now() NOT NULL
      );
    `);
    // Check automation_logs columns and add missing ones
    await db.execute(sql`ALTER TABLE automation_logs ADD COLUMN IF NOT EXISTS reason text;`);
    console.log("[DBCheck] Ensured column 'reason' on automation_logs.");

    // Ensure motivations table exists
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS motivations (
        id text PRIMARY KEY,
        workspace_id text,
        created_by_user_id text,
        message text NOT NULL,
        category text DEFAULT 'FOCUS' NOT NULL,
        tone text DEFAULT 'PROFESSIONAL' NOT NULL,
        active boolean DEFAULT true NOT NULL,
        usage_count integer DEFAULT 0 NOT NULL,
        last_used_at timestamp,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL
      );
    `);

    // Ensure motivation_deliveries table exists
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS motivation_deliveries (
        id text PRIMARY KEY,
        motivation_id text,
        workspace_id text,
        user_id text,
        automation_id text,
        delivered_at timestamp DEFAULT now() NOT NULL,
        channel text DEFAULT 'WEB_PUSH' NOT NULL,
        status text DEFAULT 'DELIVERED' NOT NULL
      );
    `);

    // Seed default motivation items if empty
    const motCheck = await db.execute(sql`SELECT count(*) FROM motivations;`);
    const motCount = Number((motCheck.rows || motCheck)[0]?.count || 0);

    if (motCount < 30) {
      await db.execute(sql`
        INSERT INTO motivations (id, message, category, tone, active, created_at, updated_at) VALUES
        ('mot_1', 'Small focused actions create extraordinary progress.', 'EXECUTION', 'DIRECT', true, now(), now()),
        ('mot_2', 'Consistency turns plans into measurable progress.', 'CONSISTENCY', 'PROFESSIONAL', true, now(), now()),
        ('mot_3', 'Focus on the work that moves the mission forward.', 'FOCUS', 'DIRECT', true, now(), now()),
        ('mot_4', 'Progress compounds when execution becomes consistent.', 'CONSISTENCY', 'CALM', true, now(), now()),
        ('mot_5', 'One completed priority is better than ten unfinished intentions.', 'PRIORITY', 'DIRECT', true, now(), now()),
        ('mot_6', 'Build momentum through focused execution.', 'EXECUTION', 'ENERGETIC', true, now(), now()),
        ('mot_7', 'Today''s execution becomes tomorrow''s progress.', 'PROGRESS', 'PROFESSIONAL', true, now(), now()),
        ('mot_8', 'Clarity first. Focus second. Execution always.', 'DISCIPLINE', 'DIRECT', true, now(), now()),
        ('mot_9', 'Mastery is built through daily focused execution.', 'LEARNING', 'PROFESSIONAL', true, now(), now()),
        ('mot_10', 'Finish what matters before starting what doesn''t.', 'PRIORITY', 'DIRECT', true, now(), now()),
        ('mot_11', 'Discipline is choosing what you want most over what you want now.', 'DISCIPLINE', 'DIRECT', true, now(), now()),
        ('mot_12', 'Urgent tasks demand attention; important tasks build the future.', 'PRIORITY', 'PROFESSIONAL', true, now(), now()),
        ('mot_13', 'Break complex projects into single actionable steps.', 'EXECUTION', 'CALM', true, now(), now()),
        ('mot_14', 'Execution converts potential energy into momentum.', 'EXECUTION', 'ENERGETIC', true, now(), now()),
        ('mot_15', 'Quality execution is the highest form of discipline.', 'DISCIPLINE', 'PROFESSIONAL', true, now(), now()),
        ('mot_16', 'Eliminate friction between intention and action.', 'FOCUS', 'DIRECT', true, now(), now()),
        ('mot_17', 'Consistency is what transforms average into excellence.', 'CONSISTENCY', 'DIRECT', true, now(), now()),
        ('mot_18', 'Focus on one high-priority milestone before expanding your scope.', 'FOCUS', 'PROFESSIONAL', true, now(), now()),
        ('mot_19', 'Resilience is measured by how quickly you unblock halted tasks.', 'RESILIENCE', 'CALM', true, now(), now()),
        ('mot_20', 'A clear deadline creates clear focus.', 'FOCUS', 'DIRECT', true, now(), now()),
        ('mot_21', 'Focus is a muscle built through intentional daily practice.', 'DISCIPLINE', 'CALM', true, now(), now()),
        ('mot_22', 'Prioritize impact over activity.', 'PRIORITY', 'DIRECT', true, now(), now()),
        ('mot_23', 'Great execution makes complex strategies look simple.', 'EXECUTION', 'PROFESSIONAL', true, now(), now()),
        ('mot_24', 'Complete high-value tasks early when your energy is highest.', 'FOCUS', 'ENERGETIC', true, now(), now()),
        ('mot_25', 'Action produces clarity; inaction produces doubt.', 'EXECUTION', 'DIRECT', true, now(), now()),
        ('mot_26', 'Measure progress by completed goals, not busy hours.', 'PROGRESS', 'PROFESSIONAL', true, now(), now()),
        ('mot_27', 'Stay calm under pressure and execute with precision.', 'RESILIENCE', 'CALM', true, now(), now()),
        ('mot_28', 'Every finished task brings momentum to the next milestone.', 'PROGRESS', 'ENERGETIC', true, now(), now()),
        ('mot_29', 'Commitment means delivering even when enthusiasm fades.', 'DISCIPLINE', 'DIRECT', true, now(), now()),
        ('mot_30', 'Focus deeply, execute precisely, achieve greater.', 'LEADERSHIP', 'PROFESSIONAL', true, now(), now())
        ON CONFLICT (id) DO NOTHING;
      `);
      console.log("[DBCheck] Seeded 30 curated motivations into database library.");
    }

    // Ensure indexes exist
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_automations_workspace_id ON automations(workspace_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_automations_status ON automations(status);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_automation_logs_automation_id ON automation_logs(automation_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_automation_logs_workspace_id ON automation_logs(workspace_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_motivations_workspace_id ON motivations(workspace_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_motivation_deliveries_user_id ON motivation_deliveries(user_id);`);
    console.log("[DBCheck] Verified all indexes.");

    // Test select query
    const testQuery = await db.execute(sql`SELECT count(*) FROM automations;`);
    console.log("[DBCheck] SUCCESS! Count query result:", testQuery.rows || testQuery);

    process.exit(0);
  } catch (err: any) {
    console.error("[DBCheck] Error verifying/migrating automations table:", err?.message || err);
    process.exit(1);
  }
}

main();
