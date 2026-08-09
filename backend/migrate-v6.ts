import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import * as fs from "fs";
import * as path from "path";

config({ path: ".env" });

const databaseUrl = process.env.DATABASE_URL!;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set in .env");
  process.exit(1);
}

const sql = neon(databaseUrl);

async function run() {
  console.log("Reading SQL migration file 0004_common_blue_shield.sql...");
  const sqlPath = path.join(__dirname, "database", "migrations", "0004_common_blue_shield.sql");
  if (!fs.existsSync(sqlPath)) {
    console.error(`Migration file not found at ${sqlPath}`);
    process.exit(1);
  }

  const migrationSql = fs.readFileSync(sqlPath, "utf8");
  
  // Drizzle splits statements using "--> statement-breakpoint"
  const statements = migrationSql
    .split("--> statement-breakpoint")
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0);

  console.log(`Found ${statements.length} SQL statements to execute.`);

  for (let i = 0; i < statements.length; i++) {
    const rawStatement = statements[i];
    console.log(`Executing statement ${i + 1}/${statements.length}...`);
    try {
      // Execute the statement
      await sql.query(rawStatement);
    } catch (err: any) {
      // If table/column already exists, we can log and continue
      if (err.message.includes("already exists")) {
        console.warn(`[WARNING] Statement ${i + 1} skipped: ${err.message}`);
      } else {
        console.error(`[ERROR] Failed to execute statement ${i + 1}:`, err.message);
        console.error("Statement content:", rawStatement);
        throw err;
      }
    }
  }

  console.log("Migration executed successfully!");
}

run().catch((err) => {
  console.error("Fatal migration error:", err);
  process.exit(1);
});
