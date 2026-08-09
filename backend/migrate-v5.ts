import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env" });

const sql = neon(process.env.DATABASE_URL!);

async function run() {
  console.log("Migrating Invitations table (v5)...");
  await sql`
    ALTER TABLE invitations 
    ADD COLUMN IF NOT EXISTS smtp_response text,
    ADD COLUMN IF NOT EXISTS provider_message_id text,
    ADD COLUMN IF NOT EXISTS email_delivery_time timestamp,
    ADD COLUMN IF NOT EXISTS email_open_time timestamp,
    ADD COLUMN IF NOT EXISTS email_click_time timestamp,
    ADD COLUMN IF NOT EXISTS otp_verified_at timestamp,
    ADD COLUMN IF NOT EXISTS password_created_at timestamp,
    ADD COLUMN IF NOT EXISTS profile_completed_at timestamp,
    ADD COLUMN IF NOT EXISTS workspace_assigned_at timestamp,
    ADD COLUMN IF NOT EXISTS activated_at timestamp
  `;
  console.log("Done!");
}

run().catch(console.error);
