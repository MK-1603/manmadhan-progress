import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolClient } from "pg";
import { env } from "../config/env.config";
import { logger } from "../src/services/logger.service";
import * as schema from "./schema";
import * as manmadhanSchema from "./schema/manmadhan.schema";
import * as personalSchemaModule from "./schema/personal.schema";

const POOL_CONFIG = {
	ssl: { rejectUnauthorized: false },
	max: 10,
	idleTimeoutMillis: 30000,
	connectionTimeoutMillis: 15000,
	keepAlive: true,
	keepAliveInitialDelayMillis: 10000,
};

// --- Shared/Auth DB Pool ---
export const authPool = new Pool({
	connectionString: env.DATABASE_URL,
	...POOL_CONFIG,
});
authPool.on("error", (err) => {
	logger.error(err, "Unexpected error on idle auth database client");
});

export const db = drizzle(authPool, { schema }); // Legacy export for auth routes

// --- Personal DB Pool ---
const isPersonalSameUrl =
	!env.PERSONAL_DATABASE_URL ||
	env.PERSONAL_DATABASE_URL === env.DATABASE_URL;
export const personalPool = isPersonalSameUrl
	? authPool
	: new Pool({
			connectionString: env.PERSONAL_DATABASE_URL,
			...POOL_CONFIG,
		});

if (!isPersonalSameUrl) {
	personalPool.on("error", (err) => {
		logger.error(err, "Unexpected error on idle personal database client");
	});
}

export const personalDb = drizzle(personalPool, {
	schema: personalSchemaModule,
});

// --- ManMadhan DB Pool ---
const isManmadhanSameUrl =
	!env.MANMADHAN_DATABASE_URL ||
	env.MANMADHAN_DATABASE_URL === env.DATABASE_URL;
export const manmadhanPool = isManmadhanSameUrl
	? authPool
	: new Pool({
			connectionString: env.MANMADHAN_DATABASE_URL,
			...POOL_CONFIG,
		});

if (!isManmadhanSameUrl) {
	manmadhanPool.on("error", (err) => {
		logger.error(err, "Unexpected error on idle manmadhan database client");
	});
}

export const manmadhanDb = drizzle(manmadhanPool, { schema: manmadhanSchema });

export const checkDatabaseConnection = async (): Promise<boolean> => {
	let authClient: PoolClient | undefined;
	let personalClient: PoolClient | undefined;
	let manmadhanClient: PoolClient | undefined;
	try {
		authClient = await authPool.connect();
		await authClient.query("SELECT 1");
		await authClient.query(`
			CREATE TABLE IF NOT EXISTS user_sessions (
				id TEXT PRIMARY KEY,
				user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
				refresh_token_hash TEXT NOT NULL,
				device_id TEXT,
				user_agent TEXT,
				ip_address TEXT,
				status TEXT DEFAULT 'ACTIVE' NOT NULL,
				expires_at TIMESTAMP NOT NULL,
				last_used_at TIMESTAMP DEFAULT NOW() NOT NULL,
				created_at TIMESTAMP DEFAULT NOW() NOT NULL
			);

			CREATE TABLE IF NOT EXISTS automations (
				id TEXT PRIMARY KEY,
				workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
				created_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
				name TEXT NOT NULL,
				description TEXT,
				creation_mode TEXT DEFAULT 'PROMPT' NOT NULL,
				original_prompt TEXT,
				trigger_type TEXT NOT NULL,
				trigger_config JSONB DEFAULT '{}'::jsonb NOT NULL,
				condition_config JSONB DEFAULT '{}'::jsonb NOT NULL,
				action_type TEXT NOT NULL,
				action_config JSONB DEFAULT '{}'::jsonb NOT NULL,
				status TEXT DEFAULT 'ACTIVE' NOT NULL,
				requires_confirmation BOOLEAN DEFAULT FALSE NOT NULL,
				last_run_at TIMESTAMP,
				next_run_at TIMESTAMP,
				run_count INTEGER DEFAULT 0 NOT NULL,
				created_at TIMESTAMP DEFAULT NOW() NOT NULL,
				updated_at TIMESTAMP DEFAULT NOW() NOT NULL
			);

			CREATE TABLE IF NOT EXISTS automation_logs (
				id TEXT PRIMARY KEY,
				automation_id TEXT NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
				workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
				user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
				status TEXT NOT NULL,
				triggered_by TEXT NOT NULL,
				execution_details JSONB DEFAULT '{}'::jsonb NOT NULL,
				error_message TEXT,
				executed_at TIMESTAMP DEFAULT NOW() NOT NULL
			);

			CREATE TABLE IF NOT EXISTS project_submissions (
				id TEXT PRIMARY KEY,
				project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
				workspace_id TEXT NOT NULL,
				title TEXT NOT NULL,
				description TEXT NOT NULL,
				submitted_by TEXT NOT NULL,
				submitted_role TEXT DEFAULT 'CO-CEO',
				status TEXT DEFAULT 'Under Review' NOT NULL,
				file_url TEXT,
				file_name TEXT,
				file_size INTEGER,
				deployment_url TEXT,
				application_url TEXT,
				repository_url TEXT,
				version_tag TEXT,
				reviewer_notes TEXT,
				reviewed_by TEXT,
				reviewed_at TIMESTAMP,
				submitted_at TIMESTAMP DEFAULT NOW() NOT NULL,
				created_at TIMESTAMP DEFAULT NOW() NOT NULL
			);
		`);
		authClient.release();
		authClient = undefined;

		if (!isPersonalSameUrl) {
			personalClient = await personalPool.connect();
			await personalClient.query("SELECT 1");
			personalClient.release();
			personalClient = undefined;
		}

		if (!isManmadhanSameUrl) {
			manmadhanClient = await manmadhanPool.connect();
			await manmadhanClient.query("SELECT 1");
			manmadhanClient.release();
			manmadhanClient = undefined;
		}

		logger.trace(
			"All PostgreSQL connections verified (Auth, Personal, ManMadhan).",
		);
		return true;
	} catch (error: unknown) {
		const errorCode =
			error && typeof error === "object" && "code" in error
				? String(error.code)
				: error instanceof Error
					? error.message
					: "ETIMEDOUT";
		logger.warn(`PostgreSQL connection check failed: ${errorCode}`);
		return false;
	} finally {
		if (authClient) authClient.release();
		if (personalClient) personalClient.release();
		if (manmadhanClient) manmadhanClient.release();
	}
};
