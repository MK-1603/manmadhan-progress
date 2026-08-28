import { db } from "../database/client";
import { sql } from "drizzle-orm";

async function run() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS recovery_codes (
        id text PRIMARY KEY,
        user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        code_hash text NOT NULL,
        created_at timestamp DEFAULT now() NOT NULL,
        used_at timestamp,
        revoked_at timestamp
      );
      CREATE INDEX IF NOT EXISTS recovery_codes_user_id_idx ON recovery_codes(user_id);
    `);
    console.log("✅ Successfully created recovery_codes table and index.");
  } catch (err) {
    console.error("Migration error:", err);
  }
  process.exit(0);
}

run();
