import { randomBytes } from "node:crypto";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env"), override: true });

const devSecret = () => randomBytes(32).toString("hex");
const requiredSecret = (name: string, fallback = "") => {
	const value = process.env[name] || fallback;
	if (process.env.NODE_ENV === "production" && !value) {
		throw new Error(`${name} must be configured in production`);
	}
	return value;
};

const cleanDbUrl = (url: string) => {
	if (!url) return url;
	return url.replace(/sslmode=(require|prefer|verify-ca)/g, "sslmode=verify-full");
};

export const env = {
	NODE_ENV: process.env.NODE_ENV || "development",
	PORT: parseInt(process.env.PORT || "4100", 10),
	CLIENT_URL: process.env.CLIENT_URL || "http://localhost:3000",

	// PostgreSQL Databases
	DATABASE_URL: cleanDbUrl(requiredSecret("DATABASE_URL")),
	PERSONAL_DATABASE_URL: cleanDbUrl(
		requiredSecret("PERSONAL_DATABASE_URL", process.env.DATABASE_URL || ""),
	),
	MANMADHAN_DATABASE_URL: cleanDbUrl(
		requiredSecret("MANMADHAN_DATABASE_URL", process.env.DATABASE_URL || ""),
	),

	// Authentication & OAuth 2.0
	BETTER_AUTH_SECRET: requiredSecret("BETTER_AUTH_SECRET", devSecret()),
	JWT_SECRET: requiredSecret("JWT_SECRET", devSecret()),
	JWT_ACCESS_EXPIRATION: process.env.JWT_ACCESS_EXPIRATION || "15m",
	JWT_REFRESH_SECRET: requiredSecret("JWT_REFRESH_SECRET", devSecret()),

	GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
	GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || "",
	GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID || "",
	GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET || "",
	APPLE_CLIENT_ID: process.env.APPLE_CLIENT_ID || "",
	APPLE_CLIENT_SECRET: process.env.APPLE_CLIENT_SECRET || "",

	// Mail Transport Settings (Gmail SMTP)
	EMAIL_PROVIDER: "smtp",
	MAIL_MODE: process.env.MAIL_MODE || "gmail",
	MAIL_USER: process.env.MAIL_USER || "manmadhannotify@gmail.com",
	MAIL_PASS: process.env.MAIL_PASS || "",
	MAIL_FROM_NAME: process.env.MAIL_FROM_NAME || "ManMadhan Progress",
	MAIL_FROM_ADDRESS:
		process.env.MAIL_FROM_ADDRESS || "manmadhannotify@gmail.com",

	// Gmail SMTP Transport
	SMTP_HOST: process.env.SMTP_HOST || "smtp.gmail.com",
	SMTP_PORT: parseInt(process.env.SMTP_PORT || "587", 10),
	SMTP_SECURE: process.env.SMTP_SECURE === "true", // false by default for 587 STARTTLS
	SMTP_USER: process.env.SMTP_USER || "manmadhannotify@gmail.com",
	SMTP_PASS: process.env.SMTP_PASS || "",
	EMAIL_FROM:
		process.env.EMAIL_FROM ||
		'"ManMadhan Progress" <manmadhannotify@gmail.com>',

	// Cloudinary Media Storage (fmiadecb)
	CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || "fmiadecb",
	CLOUDINARY_API_KEY: requiredSecret("CLOUDINARY_API_KEY"),
	CLOUDINARY_API_SECRET: requiredSecret("CLOUDINARY_API_SECRET"),
	CLOUDINARY_URL: process.env.CLOUDINARY_URL || "",

	// Firebase Cloud Messaging & Admin SDK
	FCM_PROJECT_ID: process.env.FCM_PROJECT_ID || "",
	FCM_CLIENT_EMAIL: process.env.FCM_CLIENT_EMAIL || "",
	FCM_PRIVATE_KEY: process.env.FCM_PRIVATE_KEY || "",

	// Web Push VAPID Keys
	VAPID_PUBLIC_KEY: requiredSecret("VAPID_PUBLIC_KEY"),
	VAPID_PRIVATE_KEY: requiredSecret("VAPID_PRIVATE_KEY"),
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
