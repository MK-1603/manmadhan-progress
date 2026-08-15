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
