import { defineConfig } from "drizzle-kit";

export default defineConfig({
	schema: "./database/schema/manmadhan.schema.ts",
	out: "./database/migrations/manmadhan",
	dialect: "postgresql",
	dbCredentials: {
		url: process.env.MANMADHAN_DATABASE_URL || process.env.DATABASE_URL || "",
	},
	schemaFilter: ["manmadhan"],
});
