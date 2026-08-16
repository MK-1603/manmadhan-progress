import { db } from "../database/client";
import { sql } from "drizzle-orm";

async function migrate() {
  console.log("Running migration for otp_codes table...");
  await db.execute(sql`
    ALTER TABLE "otp_codes" 
    ADD COLUMN IF NOT EXISTS "resend_count" integer DEFAULT 0 NOT NULL,
    ADD COLUMN IF NOT EXISTS "last_resent_at" timestamp;
  `);
  console.log("✓ Migration successful: resend_count and last_resent_at added to otp_codes table.");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
