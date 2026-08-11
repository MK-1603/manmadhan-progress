import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "../config/env.config";
import { logger } from "../src/services/logger.service";
import * as schema from "./schema";
import * as manmadhanSchema from "./schema/manmadhan.schema";
import * as personalSchemaModule from "./schema/personal.schema";

const POOL_CONFIG = {
	ssl: { rejectUnauthorized: false },
	max: 10,
	idleTimeoutMillis: 30000,
	connectionTimeoutMillis: 5000,
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
export const personalPool = new Pool({
	connectionString: env.PERSONAL_DATABASE_URL,
	...POOL_CONFIG,
});
personalPool.on("error", (err) => {
	logger.error(err, "Unexpected error on idle personal database client");
});

export const personalDb = drizzle(personalPool, { schema: personalSchemaModule });

// --- ManMadhan DB Pool ---
export const manmadhanPool = new Pool({
	connectionString: env.MANMADHAN_DATABASE_URL,
	...POOL_CONFIG,
});
manmadhanPool.on("error", (err) => {
	logger.error(err, "Unexpected error on idle manmadhan database client");
});

export const manmadhanDb = drizzle(manmadhanPool, { schema: manmadhanSchema });

export const checkDatabaseConnection = async (): Promise<boolean> => {
	let authClient, personalClient, manmadhanClient;
	try {
		authClient = await authPool.connect();
		authClient.release();
		authClient = undefined;

		personalClient = await personalPool.connect();
		personalClient.release();
		personalClient = undefined;

		manmadhanClient = await manmadhanPool.connect();
		manmadhanClient.release();
		manmadhanClient = undefined;

		logger.trace(
			"All PostgreSQL connections verified (Auth, Personal, ManMadhan).",
		);
		return true;
	} catch (error: any) {
		const errorCode = error.code || error.errno || "ETIMEDOUT";
		logger.debug(`PostgreSQL connection check pending (${errorCode})`);
		return false;
	} finally {
		if (authClient) authClient.release();
		if (personalClient) personalClient.release();
		if (manmadhanClient) manmadhanClient.release();
	}
};
