"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), ".env") });
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), ".env.example") });
exports.env = {
    NODE_ENV: process.env.NODE_ENV || "development",
    PORT: parseInt(process.env.PORT || "4000", 10),
    CLIENT_URL: process.env.CLIENT_URL || "http://localhost:3000",
    // PostgreSQL / Database
    DATABASE_URL: process.env.DATABASE_URL ||
        "postgresql://neondb_owner:npg_3DcOkNWBa0QK@ep-floral-block-awiha5eg-pooler.c-12.us-east-1.aws.neon.tech/neondb?sslmode=require",
    // Authentication
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET || "super-secret-better-auth-key-min-32-chars-long",
    JWT_SECRET: process.env.JWT_SECRET || "super-secret-jwt-key-replace-in-production-min-32-chars",
    JWT_ACCESS_EXPIRATION: process.env.JWT_ACCESS_EXPIRATION || "15m",
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "super-secret-refresh-key-replace-in-production-min-32-chars",
    // SMTPS & Email Settings
    SMTP_HOST: process.env.SMTP_HOST || "smtp.gmail.com",
    SMTP_PORT: parseInt(process.env.SMTP_PORT || "465", 10),
    SMTP_SECURE: process.env.SMTP_SECURE === "true" || true,
    SMTP_USER: process.env.SMTP_USER || "no-reply@manmadhan.internal",
    SMTP_PASS: process.env.SMTP_PASS || "app-specific-password",
    EMAIL_FROM: process.env.EMAIL_FROM || '"ManMadhan Progress" <no-reply@manmadhan.internal>',
    RESEND_API_KEY: process.env.RESEND_API_KEY || "",
    // Logging
    LOG_LEVEL: process.env.LOG_LEVEL || "debug",
};
