import { db } from "../database/client";
import { sql } from "drizzle-orm";

async function run() {
  try {
    await db.execute(sql`ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS batch_number text;`);
    console.log("✅ Successfully added batch_number column to workspaces table.");
  } catch (err) {
    console.error("Migration error:", err);
  }
  process.exit(0);
}

run();
