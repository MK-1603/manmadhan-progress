import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./database/schema/personal.schema.ts",
  out: "./database/migrations/personal",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.PERSONAL_DATABASE_URL || process.env.DATABASE_URL || "",
  },
  schemaFilter: ["personal"]
});
