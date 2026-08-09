import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env" });

const sql = neon(process.env.DATABASE_URL!);

async function run() {
  console.log("Adding columns to users...");
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_id text`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS manager_id text REFERENCES users(id) ON DELETE set null`;

  console.log("Adding columns to invitations...");
  await sql`ALTER TABLE invitations ADD COLUMN IF NOT EXISTS department_id text`;
  await sql`ALTER TABLE invitations ADD COLUMN IF NOT EXISTS manager_id text REFERENCES users(id) ON DELETE set null`;
  await sql`ALTER TABLE invitations ADD COLUMN IF NOT EXISTS batch_number text`;
  await sql`ALTER TABLE invitations ADD COLUMN IF NOT EXISTS employee_id text`;
  await sql`ALTER TABLE invitations ADD COLUMN IF NOT EXISTS message text`;
  console.log("Done!");
}

run().catch(console.error);
