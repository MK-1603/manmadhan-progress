import { type Job, Queue, Worker } from "bullmq";
import Redis from "ioredis";
import { env } from "../../config/env.config";
import { maskEmail } from "../utils/string.utils";
import { emailService } from "./email.service";
import { firebaseNotificationService } from "./firebase.service";
import { logger } from "./logger.service";

// Redis Connection Instance with Offline Suppression & Auto-Fallback
export const redisConnection = new Redis({
	host: env.REDIS_HOST,
	port: env.REDIS_PORT,
	password: env.REDIS_PASSWORD || undefined,
	tls: env.REDIS_TLS ? { rejectUnauthorized: false } : undefined,
	maxRetriesPerRequest: null,
	enableOfflineQueue: false, // Don't buffer commands when Redis is offline
	retryStrategy: (times) => {
		if (times > 1) {
			return null; // Stop retrying immediately if Redis is not running locally
		}
		return 1000;
	},
});

let isRedisConnected = false;

redisConnection.on("connect", async () => {
	isRedisConnected = true;
	logger.trace("Redis BullMQ connection active.");

	// Auto-Clear memory eviction policy check on startup (BullMQ requires noeviction)
	try {
		await redisConnection.config("SET", "maxmemory-policy", "noeviction");
	} catch (_e) {
		// Memory policy managed by host
	}
});

// Suppress raw ECONNREFUSED log dumps when local Redis server is not running
redisConnection.on("error", () => {
	isRedisConnected = false;
});

// Auto-Cleanup Configuration Options (Auto-Purges Completed & Failed Jobs)
const autoCleanupOptions = {
	removeOnComplete: {
		age: 1800, // Auto-purge completed jobs older than 30 mins
		count: 50, // Cap maximum completed jobs to 50
	},
	removeOnFail: {
		age: 3600, // Auto-purge failed jobs older than 1 hour
		count: 50, // Cap maximum failed jobs to 50
	},
};

// BullMQ Queues with Auto-Clear Memory Cap & Suppressed Managed Redis Eviction Check
export const emailQueue = new Queue("email-tasks", {
	connection: redisConnection,
	defaultJobOptions: autoCleanupOptions,
	skipVersionCheck: true,
});

export const pushQueue = new Queue("push-tasks", {
	connection: redisConnection,
	defaultJobOptions: autoCleanupOptions,
	skipVersionCheck: true,
});

// Workers only process if Redis is active to prevent unhandled ECONNREFUSED dumps
let emailWorker: Worker | null = null;
let pushWorker: Worker | null = null;

const initWorkers = () => {
	if (emailWorker || pushWorker) return;

	try {
		emailWorker = new Worker(
			"email-tasks",
			async (job: Job) => {
				logger.info(
					{ jobId: job.id },
					"Processing background BullMQ email job",
				);
				if (process.env.MOCK_EMAILS === "true") {
					logger.info(
						{
							to: maskEmail(job.data.to),
							subject: job.data.subject,
							html: job.data.html,
						},
						"MOCK EMAIL DISPATCH (MOCK_EMAILS=true)",
					);
				} else {
					await emailService.sendEmail(job.data);
				}
			},
			{ connection: redisConnection, skipVersionCheck: true },
		);

		pushWorker = new Worker(
			"push-tasks",
			async (job: Job) => {
				logger.info({ jobId: job.id }, "Processing background BullMQ push job");
				await firebaseNotificationService.sendPushNotification(job.data);
			},
			{ connection: redisConnection, skipVersionCheck: true },
		);

		emailWorker.on("error", () => {});
		pushWorker.on("error", () => {});
	} catch (_e) {}
};

redisConnection.on("connect", () => {
	initWorkers();
});

export const queueService = {
	isQueueAvailable() {
		return isRedisConnected;
	},

	async addEmailJob(payload: {
		to: string;
		subject: string;
		text?: string;
		html?: string;
		descriptions?: string[];
		title?: string;
		actionUrl?: string;
		actionText?: string;
		requestDetails?: Record<string, string>;
		securityNotice?: boolean;
		expiresIn?: string;
		otpCode?: string;
		mode?: "action" | "alert" | "digest" | "informational";
		icon?:
			| "shield"
			| "user-plus"
			| "check-circle"
			| "alert-triangle"
			| "bell"
			| "mail"
			| "credit-card"
			| "briefcase"
			| "key";
	}) {
		let html = payload.html;
		if (!html) {
			html = emailService.buildTemplate({
				title: payload.title || payload.subject,
				descriptions: payload.descriptions,
				actionUrl: payload.actionUrl,
				actionText: payload.actionText,
				requestDetails: payload.requestDetails,
				securityNotice: payload.securityNotice,
				expiresIn: payload.expiresIn,
				otpCode: payload.otpCode,
				mode: payload.mode,
				icon: payload.icon,
			});
		}

		if (isRedisConnected) {
			try {
				const job = await emailQueue.add("send-async-email", {
					...payload,
					html,
				});
				return {
					success: true,
					mode: "bullmq_redis",
					jobId: job.id,
					message: "Job queued cleanly with auto-cleanup enabled",
				};
			} catch (_e) {}
		}
		// Graceful in-memory fallback if Redis is offline
		if (process.env.MOCK_EMAILS === "true") {
			logger.info(
				{ to: maskEmail(payload.to), subject: payload.subject, html: html },
				"MOCK EMAIL DISPATCH (MOCK_EMAILS=true, DIRECT FALLBACK)",
			);
		} else {
			setImmediate(() => emailService.sendEmail({ ...payload, html }));
		}
		return {
			success: true,
			mode: "direct_fallback",
			jobId: `fallback_${Date.now()}`,
			message: "Processed via direct async worker fallback",
		};
	},

	async addPushJob(payload: {
		token?: string;
		topic?: string;
		title: string;
		body: string;
	}) {
		if (isRedisConnected) {
			try {
				const job = await pushQueue.add("send-async-push", payload);
				return {
					success: true,
					mode: "bullmq_redis",
					jobId: job.id,
					message: "Push job queued cleanly with auto-cleanup enabled",
				};
			} catch (_e) {}
		}
		setImmediate(() =>
			firebaseNotificationService.sendPushNotification(payload),
		);
		return {
			success: true,
			mode: "direct_fallback",
			jobId: `fallback_${Date.now()}`,
			message: "Processed via direct async worker fallback",
		};
	},

	async getQueueStats() {
		if (!isRedisConnected) {
			return {
				redisStatus: "Offline (In-Memory Fallback Active)",
				autoCleanup: "Auto-Purge Active (Cap: 50 Jobs)",
				completedJobs: 0,
				failedJobs: 0,
				waitingJobs: 0,
			};
		}

		try {
			const [emailCompleted, emailFailed, emailWaiting] = await Promise.all([
				emailQueue.getCompletedCount(),
				emailQueue.getFailedCount(),
				emailQueue.getWaitingCount(),
			]);

			return {
				redisStatus: "Connected & Processing",
				autoCleanup: "Enabled (Auto-Purge Cap: 50 Jobs / 30m)",
				completedJobs: emailCompleted,
				failedJobs: emailFailed,
				waitingJobs: emailWaiting,
			};
		} catch (_e) {
			return {
				redisStatus: "Offline (In-Memory Fallback Active)",
				autoCleanup: "Auto-Purge Active",
				completedJobs: 0,
				failedJobs: 0,
				waitingJobs: 0,
			};
		}
	},

	async close() {
		try {
			if (emailWorker) await emailWorker.close();
			if (pushWorker) await pushWorker.close();
			if (isRedisConnected) {
				await emailQueue.close();
				await pushQueue.close();
				await redisConnection.quit();
			}
		} catch (_e) {
			// Suppress errors during shutdown
		}
	},
};
