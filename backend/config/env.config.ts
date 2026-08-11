import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.example") });
dotenv.config({ path: path.resolve(process.cwd(), ".env"), override: true });

export const env = {
	NODE_ENV: process.env.NODE_ENV || "development",
	PORT: parseInt(process.env.PORT || "4100", 10),
	CLIENT_URL: process.env.CLIENT_URL || "http://localhost:3000",

	// PostgreSQL Databases
	DATABASE_URL:
		process.env.DATABASE_URL ||
		"postgresql://neondb_owner:npg_3DcOkNWBa0QK@ep-floral-block-awiha5eg-pooler.c-12.us-east-1.aws.neon.tech/neondb?sslmode=verify-full",
	PERSONAL_DATABASE_URL:
		process.env.PERSONAL_DATABASE_URL ||
		process.env.DATABASE_URL ||
		"postgresql://neondb_owner:npg_3DcOkNWBa0QK@ep-floral-block-awiha5eg-pooler.c-12.us-east-1.aws.neon.tech/neondb?sslmode=verify-full",
	MANMADHAN_DATABASE_URL:
		process.env.MANMADHAN_DATABASE_URL ||
		process.env.DATABASE_URL ||
		"postgresql://neondb_owner:npg_3DcOkNWBa0QK@ep-floral-block-awiha5eg-pooler.c-12.us-east-1.aws.neon.tech/neondb?sslmode=verify-full",

	// Authentication & OAuth 2.0
	BETTER_AUTH_SECRET:
		process.env.BETTER_AUTH_SECRET ||
		"super-secret-better-auth-key-min-32-chars-long",
	JWT_SECRET:
		process.env.JWT_SECRET ||
		"super-secret-jwt-key-replace-in-production-min-32-chars",
	JWT_ACCESS_EXPIRATION: process.env.JWT_ACCESS_EXPIRATION || "15m",
	JWT_REFRESH_SECRET:
		process.env.JWT_REFRESH_SECRET ||
		"super-secret-refresh-key-replace-in-production-min-32-chars",

	GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
	GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || "",
	GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID || "",
	GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET || "",
	APPLE_CLIENT_ID: process.env.APPLE_CLIENT_ID || "",
	APPLE_CLIENT_SECRET: process.env.APPLE_CLIENT_SECRET || "",

	// Mail Transport Settings (Nodemailer-Sender)
	MAIL_MODE: process.env.MAIL_MODE || "gmail",
	MAIL_USER: process.env.MAIL_USER || "manmadhannotify@gmail.com",
	MAIL_PASS: process.env.MAIL_PASS || "hqlb wukn vvbm gmon",
	MAIL_FROM_NAME: process.env.MAIL_FROM_NAME || "ManMadhan Progress",
	MAIL_FROM_ADDRESS:
		process.env.MAIL_FROM_ADDRESS || "manmadhannotify@gmail.com",

	// Generic SMTPS Provider
	SMTP_HOST: process.env.SMTP_HOST || "smtp.gmail.com",
	SMTP_PORT: parseInt(process.env.SMTP_PORT || "465", 10),
	SMTP_SECURE: process.env.SMTP_SECURE === "true" || true,
	SMTP_USER: process.env.SMTP_USER || "manmadhannotify@gmail.com",
	SMTP_PASS: process.env.SMTP_PASS || "hqlb wukn vvbm gmon",
	EMAIL_FROM:
		process.env.EMAIL_FROM ||
		'"ManMadhan Progress" <manmadhannotify@gmail.com>',

	// Cloudinary Media Storage (fmiadecb)
	CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || "fmiadecb",
	CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || "454548253433237",
	CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || "",
	CLOUDINARY_URL: process.env.CLOUDINARY_URL || "",

	// Firebase Cloud Messaging & Admin SDK
	FCM_PROJECT_ID: process.env.FCM_PROJECT_ID || "",
	FCM_CLIENT_EMAIL: process.env.FCM_CLIENT_EMAIL || "",
	FCM_PRIVATE_KEY: process.env.FCM_PRIVATE_KEY || "",

	// Web Push VAPID Keys
	VAPID_PUBLIC_KEY:
		process.env.VAPID_PUBLIC_KEY ||
		"BF9Rwv9gMTHAPohLOEeQ23L2MhvjhaAuK0SVbrokLPG3W6hIA2lafL_bXAnBSsbSQ8QTVEYX78QFUmTrMPdusRQ",
	VAPID_PRIVATE_KEY:
		process.env.VAPID_PRIVATE_KEY ||
		"WTWI1K6rWoffGcmYQBBhBMD08m5OHtWNoVZp26M-4wo",
	VAPID_SUBJECT: process.env.VAPID_SUBJECT || "mailto:admin@manmadhan.progress",

	// Artificial Intelligence & LLM APIs
	GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
	GEMINI_MODEL: process.env.GEMINI_MODEL || "gemini-3.6-flash",

	GROQ_API_KEY: process.env.GROQ_API_KEY || "",
	GROQ_MODEL: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",

	NVIDIA_API_KEY: process.env.NVIDIA_API_KEY || "",
	NVIDIA_MODEL: process.env.NVIDIA_MODEL || "meta/llama-3.1-70b-instruct",

	// Realtime Socket.IO & Redis Engine
	SOCKET_CORS_ORIGIN: process.env.SOCKET_CORS_ORIGIN || "http://localhost:3000",
	REDIS_HOST: process.env.REDIS_HOST || "127.0.0.1",
	REDIS_PORT: parseInt(process.env.REDIS_PORT || "6379", 10),
	REDIS_PASSWORD: process.env.REDIS_PASSWORD || "",
	REDIS_TLS: process.env.REDIS_TLS === "true" || false,

	// Logging
	LOG_LEVEL: process.env.LOG_LEVEL || "debug",
};
