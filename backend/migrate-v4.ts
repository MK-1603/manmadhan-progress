import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

config({ path: ".env" });

const sql = neon(process.env.DATABASE_URL!);

async function run() {
	console.log("Adding workspace_id to audit_logs...");
	await sql`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS workspace_id text REFERENCES workspaces(id) ON DELETE CASCADE`;
	console.log("Done!");
}

run().catch(console.error);
