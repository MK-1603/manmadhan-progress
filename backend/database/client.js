"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = exports.pool = void 0;
exports.checkDatabaseConnection = checkDatabaseConnection;
const node_postgres_1 = require("drizzle-orm/node-postgres");
const pg_1 = require("pg");
const env_config_1 = require("../config/env.config");
const logger_service_1 = require("../src/services/logger.service");
exports.pool = new pg_1.Pool({
    connectionString: env_config_1.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});
exports.db = (0, node_postgres_1.drizzle)(exports.pool);
async function checkDatabaseConnection() {
    try {
        const client = await exports.pool.connect();
        client.release();
        logger_service_1.logger.info("PostgreSQL Neon database connected successfully");
        return true;
    }
    catch (error) {
        logger_service_1.logger.warn({ error }, "PostgreSQL connection check pending credentials/network");
        return false;
    }
}
