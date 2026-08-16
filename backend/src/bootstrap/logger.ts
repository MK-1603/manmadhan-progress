import pino, { type LoggerOptions } from "pino";
import { env } from "../../config/env.config";

const isProduction = env.NODE_ENV === "production";
const logLevel = env.LOG_LEVEL || (isProduction ? "info" : "debug");

const baseOptions: LoggerOptions = {
	level: logLevel,
	timestamp: pino.stdTimeFunctions.isoTime,
	redact: {
		paths: [
			"password",
			"passwordHash",
			"token",
			"accessToken",
			"refreshToken",
			"refreshTokenHash",
			"authorization",
			"cookie",
			"sessionToken",
			"oauthToken",
			"clientSecret",
			"inviteToken",
			"resetToken",
			"verificationToken",
			"googleId",
			"email",
			"userId",
			"workspaceId",
			"organizationId",
			"messageId",
			"actionUrl",
			"sql",
			"query",
			"params",
		],
		censor: "[REDACTED]",
	},
	base: isProduction
		? {
				env: env.NODE_ENV,
				service: "manmadhan-progress-backend",
			}
		: undefined,
	formatters: {
		level(label) {
			return { level: label };
		},
		log(object) {
			if (object.msg && typeof object.msg === "string") {
				object.msg = object.msg.replace(/^\[(INFO|WARN|ERROR|DEBUG|REALTIME|SYSTEM|DATABASE|AUTH|EMAIL|APPLICATION)\]\s*/i, "");
			}
			return object;
		},
	},
	...(isProduction
		? {}
		: {
				transport: {
					target: "pino-pretty",
					options: {
						colorize: true,
						translateTime: "SYS:HH:MM:ss",
						ignore: "pid,hostname,env,service,domain,requestId,correlationId",
					},
				},
			}),
};

export const rootLogger = pino(baseOptions);

// Enterprise Domain Sub-Loggers
export const appLogger = rootLogger.child({ domain: "Application" });
export const apiLogger = rootLogger.child({ domain: "API" });
export const dbLogger = rootLogger.child({ domain: "Database" });
export const authLogger = rootLogger.child({ domain: "Authentication" });
export const securityLogger = rootLogger.child({ domain: "Security" });
export const socketLogger = rootLogger.child({ domain: "Socket" });
export const notificationLogger = rootLogger.child({ domain: "Notification" });
export const startupLogger = rootLogger.child({ domain: "Startup" });
export const shutdownLogger = rootLogger.child({ domain: "Shutdown" });
export const requestLogger = rootLogger.child({ domain: "Request" });

export type LogCategory = "HTTP" | "AUTH" | "DB" | "WS" | "WARN" | "ERROR";

/**
 * Compact Aligned Console Formatter for Development Output
 */
export const formatDevLog = (
	category: LogCategory,
	method: string,
	path: string,
	statusCode?: number,
	durationMs?: number,
	requestId?: string,
	details?: unknown,
): void => {
	if (isProduction) return;

	const now = new Date();
	const timestamp = now.toTimeString().split(" ")[0]; // e.g. 07:19:28

	const catColor =
		category === "ERROR"
			? "\x1b[31m"
			: category === "WARN"
				? "\x1b[33m"
				: category === "AUTH"
					? "\x1b[35m"
					: category === "DB"
						? "\x1b[36m"
						: "\x1b[34m";

	const catPadded = `${category}     `.slice(0, 5);
	const methodPadded = `${method}      `.slice(0, 6);

	let statusStr = "   ";
	if (statusCode !== undefined) {
		const sColor =
			statusCode >= 500
				? "\x1b[31m"
				: statusCode >= 400
					? "\x1b[33m"
					: statusCode >= 300
						? "\x1b[36m"
						: "\x1b[32m";
		statusStr = `${sColor}${statusCode}\x1b[0m`;
	}

	const durationStr =
		durationMs !== undefined ? `\x1b[90m${durationMs}ms\x1b[0m` : "";
	const pathPadded = `${path}                                        `.slice(
		0,
		36,
	);
	const reqShort = requestId ? `\x1b[90m[${requestId.slice(0, 8)}]\x1b[0m` : "";

	process.stdout.write(
		`\x1b[90m[${timestamp}]\x1b[0m ${catColor}${catPadded}\x1b[0m ${methodPadded} ${pathPadded} ${statusStr}   ${durationStr} ${reqShort}\n`,
	);

	if (details && (category === "ERROR" || category === "WARN")) {
		process.stdout.write(
			`\x1b[90m        └─ Context:\x1b[0m \x1b[33m${
				typeof details === "object" ? JSON.stringify(details) : String(details)
			}\x1b[0m\n`,
		);
	}
};
