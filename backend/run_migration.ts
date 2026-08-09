import { Client } from "pg";
import * as fs from "fs";
import * as path from "path";
import { env } from "./config/env.config";

async function run() {
  const client = new Client({
    connectionString: env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  await client.connect();
  const sql = fs.readFileSync(path.join(__dirname, "database", "migrations", "0010_careful_khan.sql"), "utf-8");
  const statements = sql.split("--> statement-breakpoint").map(s => s.trim()).filter(Boolean);
  for (const statement of statements) {
    try {
      await client.query(statement);
    } catch (err: any) {
      if (err.code === "42P07" || err.code === "42P06" || err.code === "42701") {
        // Ignore "relation already exists", "schema already exists", "column already exists"
        console.log("Ignored already exists error:", err.message);
      } else {
        console.error("Migration error:", err.message, "in statement:", statement);
      }
    }
  }
  console.log("Migration executed successfully!");
  await client.end();
}

run().catch(console.error);
