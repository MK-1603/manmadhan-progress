import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "../config/env.config";
import { logger } from "../src/services/logger.service";
import * as schema from "./schema";
import * as personalSchema from "./schema/personal.schema";
import * as manmadhanSchema from "./schema/manmadhan.schema";

// --- Shared/Auth DB Pool ---
const authPool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
authPool.on("error", (err) => {
  logger.error(err, "Unexpected error on idle auth database client");
});

export const db = drizzle(authPool, { schema }); // Legacy export for auth routes

// --- Personal DB Pool ---
const personalPool = new Pool({
  connectionString: env.PERSONAL_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
personalPool.on("error", (err) => {
  logger.error(err, "Unexpected error on idle personal database client");
});

export const personalDb = drizzle(personalPool, { schema: personalSchema });

// --- ManMadhan DB Pool ---
const manmadhanPool = new Pool({
  connectionString: env.MANMADHAN_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
manmadhanPool.on("error", (err) => {
  logger.error(err, "Unexpected error on idle manmadhan database client");
});

export const manmadhanDb = drizzle(manmadhanPool, { schema: manmadhanSchema });

export const checkDatabaseConnection = async (): Promise<boolean> => {
  try {
    const authClient = await authPool.connect();
    authClient.release();
    const personalClient = await personalPool.connect();
    personalClient.release();
    const manmadhanClient = await manmadhanPool.connect();
    manmadhanClient.release();
    logger.trace("All PostgreSQL connections verified (Auth, Personal, ManMadhan).");
    return true;
  } catch (error: any) {
    const errorCode = error.code || error.errno || "ETIMEDOUT";
    logger.debug(`PostgreSQL connection check pending (${errorCode})`);
    return false;
  }
};
