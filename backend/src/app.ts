import fs from "node:fs";
import path from "node:path";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, {
	type Express,
	type NextFunction,
	type Request,
	type Response,
} from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import jwt from "jsonwebtoken";
import passport from "passport";
import { env } from "../config/env.config";
import { checkDatabaseConnection, db } from "../database/client";
import {
	aiConversations,
	mediaAssets,
	notificationLogs,
	users,
} from "../database/schema";
import { cloudinaryService } from "../storage/cloudinary.service";
import { requireRole, strictAuth } from "./middleware/auth.middleware";
import { requestIdMiddleware } from "./middleware/request-id.middleware";
import { enforceWorkExecutionPolicy } from "./middleware/time.middleware";
import { aiRouter } from "./routes/ai.routes";
import { authRouter } from "./routes/auth.routes";
import { dashboardRouter } from "./routes/dashboard.routes";
import { foldersRouter } from "./routes/folders.routes";
import { githubRouter } from "./routes/github.routes";
import { invitationsRouter } from "./routes/invitations.routes";
import { notificationsRouter } from "./routes/notifications.routes";
import { orgApprovalsRouter } from "./routes/org-approvals.routes";
import { orgFocusRouter } from "./routes/org-focus.routes";
import { orgMyWorkRouter } from "./routes/org-my-work.routes";
import { orgProjectsRouter } from "./routes/org-projects.routes";
import { orgPromptsRouter } from "./routes/org-prompts.routes";
import { orgReportsRouter } from "./routes/org-reports.routes";
import { orgTasksRouter } from "./routes/org-tasks.routes";
import { orgTimelineRouter } from "./routes/org-timeline.routes";
import { orgLearningRouter } from "./routes/org-learning.routes";
import { orgIntegrationsRouter } from "./routes/org-integrations.routes";
import { organizationRouter } from "./routes/organization.routes";
import { automationRouter } from "./routes/automation.routes";
import { personalAiChatRouter } from "./routes/personal/ai-chat.routes";
import { personalBooksRouter } from "./routes/personal/books.routes";
import { personalCalendarRouter } from "./routes/personal/calendar.routes";
import { personalDocumentsRouter } from "./routes/personal/documents.routes";
import { personalFeaturesRouter } from "./routes/personal/features.routes";
import { personalIntegrationsRouter } from "./routes/personal/integrations.routes";
import { personalJournalRouter } from "./routes/personal/journal.routes";
import { personalLearningRouter } from "./routes/personal/learning.routes";
import { personalNotesRouter } from "./routes/personal/notes.routes";
import { personalPodcastsRouter } from "./routes/personal/podcasts.routes";
import { personalProjectsRouter } from "./routes/personal/projects.routes";
import { personalPromptsRouter } from "./routes/personal/prompts.routes";
import { personalReportsRouter } from "./routes/personal/reports.routes";
import { personalRequirementsRouter } from "./routes/personal/requirements.routes";
import { personalSettingsRouter } from "./routes/personal/settings.routes";
import { personalTasksRouter } from "./routes/personal/tasks.routes";
import { personalTimelineRouter } from "./routes/personal/timeline.routes";
import { personalRouter } from "./routes/personal.routes";
import { personalAiRouter } from "./routes/personal-ai.routes";
import { personalFocusRouter } from "./routes/personal-focus.routes";
import { requestsRouter } from "./routes/requests.routes";
import { searchRouter } from "./routes/search.routes";
import { spacesRouter } from "./routes/spaces.routes";
import { workspacesRouter } from "./routes/workspaces.routes";
import { aiService } from "./services/ai.service";
import { emailService } from "./services/email.service";
import { firebaseNotificationService } from "./services/firebase.service";
import { logger } from "./services/logger.service";
import { queueService } from "./services/queue.service";
import "./modules/auth/google-oauth.service";
import "./modules/auth/github-oauth.service";

export const createApp = (): Express => {
	const app = express();

	// Trust the proxy to ensure express-rate-limit accurately identifies users (e.g., behind Next.js rewrites or a load balancer)
	app.set("trust proxy", 1);
	app.use(requestIdMiddleware);

	// Security & Core Middleware
	app.use(helmet());
	app.use(
		cors({
			origin: (origin, callback) => {
				const allowedOrigins = env.CLIENT_URL
					? env.CLIENT_URL.split(",").map((url) =>
							url.trim().replace(/\/$/, ""),
						)
					: [];
				if (!origin) return callback(null, true);

				if (
					allowedOrigins.includes(origin) ||
					origin.startsWith("http://localhost:") ||
					origin.endsWith(".vercel.app")
				) {
					callback(null, true);
				} else {
					callback(new Error(`Origin ${origin} not allowed by CORS`));
				}
			},
			credentials: true,
		}),
	);
	app.use(express.json({ limit: "10mb" }));
	app.use(express.urlencoded({ extended: true, limit: "10mb" }));
	app.use(cookieParser());
	app.use(passport.initialize());

	// Ensure uploads directory exists
	const uploadsDir = path.join(process.cwd(), "uploads");
	if (!fs.existsSync(uploadsDir)) {
		fs.mkdirSync(uploadsDir, { recursive: true });
	}
	app.use("/uploads", express.static(uploadsDir));

	// Global Rate Limiter & Workspace Execution Enforcer
	const apiLimiter = rateLimit({
		windowMs: 15 * 60 * 1000,
		max: 1000,
		message: { error: "Too many requests, please try again later." },
	});

	// Storage Upload Rate Limiter
	const uploadLimiter = rateLimit({
		windowMs: 15 * 60 * 1000,
		max: 20,
		message: {
			success: false,
			error: "Upload limit exceeded. Max 20 files per 15 minutes.",
		},
	});

	app.use("/api/", apiLimiter);
	app.use("/api/", enforceWorkExecutionPolicy);

	// Health Endpoints: Liveness & Readiness
	app.get("/health/live", (req: Request, res: Response) => {
		return res.status(200).json({
			status: "live",
			uptime: process.uptime(),
			timestamp: new Date().toISOString(),
			service: "manmadhan-progress-api",
			requestId: (req as any).id,
		});
	});

	app.get("/health/ready", async (req: Request, res: Response) => {
		const isDbConnected = await checkDatabaseConnection();
		const isEmailConfigured = Boolean(env.SMTP_USER || env.MAIL_USER);
		const isStorageConfigured = Boolean(env.CLOUDINARY_CLOUD_NAME);
		const isAiConfigured = Boolean(env.GROQ_API_KEY || env.GEMINI_API_KEY);

		const services = {
			database: isDbConnected ? "HEALTHY" : "FAILED",
			authentication: "READY",
			email: isEmailConfigured ? "HEALTHY" : "CONFIGURED",
			realtime: "RUNNING",
			queue: "RUNNING",
			storage: isStorageConfigured ? "HEALTHY" : "DISABLED",
			ai: isAiConfigured ? "READY" : "CONFIGURED",
		};

		const isReady = isDbConnected;
		const statusCode = isReady ? 200 : 503;

		return res.status(statusCode).json({
			status: isReady ? "ready" : "degraded",
			service: "manmadhan-progress-api",
			requestId: (req as any).id,
			services,
		});
	});

	app.get("/health", async (req: Request, res: Response) => {
		const isDbConnected = await checkDatabaseConnection();
		const status = isDbConnected ? "ok" : "degraded";
		const statusCode = isDbConnected ? 200 : 503;

		return res.status(statusCode).json({
			status,
			service: "manmadhan-progress-api",
			requestId: (req as any).id,
			database: isDbConnected ? "connected" : "unavailable",
			services: {
				database: isDbConnected ? "HEALTHY" : "FAILED",
				authentication: "READY",
				email: "HEALTHY",
				realtime: "RUNNING",
				queue: "RUNNING",
				storage: "HEALTHY",
			},
		});
	});

	// Mount Routers
	app.use("/api/v1/auth", authRouter);
	app.use("/api/v1/notifications", notificationsRouter);
	app.use("/api/v1/search", searchRouter);
	app.use("/api/v1/ai", aiRouter);
	app.use("/api/v1/workspaces", workspacesRouter);
	app.use("/api/v1/github", githubRouter);

	// Core Application Routes
	app.use("/api/v1/spaces", spacesRouter);
	app.use("/api/v1/folders", foldersRouter);
	app.use("/api/v1/invitations", invitationsRouter);
	app.use("/api/v1/organization", organizationRouter);
	app.use("/api/v1/dashboard", dashboardRouter);
	app.use("/api/v1/personal", personalRouter);
	app.use("/api/v1/personal/ai", personalAiRouter);
	app.use("/api/v1/personal/ai", personalAiChatRouter);
	app.use("/api/v1/personal/focus", personalFocusRouter);
	app.use("/api/v1/personal/projects", personalProjectsRouter);
	app.use("/api/v1/personal/tasks", personalTasksRouter);
	app.use("/api/v1/personal/calendar", personalCalendarRouter);
	app.use("/api/v1/personal/journal", personalJournalRouter);
	app.use("/api/v1/personal/notes", personalNotesRouter);
	app.use("/api/v1/personal/learning", personalLearningRouter);
	app.use("/api/v1/personal/books", personalBooksRouter);
	app.use("/api/v1/personal/podcasts", personalPodcastsRouter);
	app.use("/api/v1/personal/documents", personalDocumentsRouter);
	app.use("/api/v1/personal/reports", personalReportsRouter);
	app.use("/api/v1/personal/prompts", personalPromptsRouter);
	app.use("/api/v1/personal/timeline", personalTimelineRouter);
	app.use("/api/v1/personal/settings", personalSettingsRouter);
	app.use("/api/v1/personal/integrations", personalIntegrationsRouter);
	app.use(
		"/api/v1/personal/projects/:projectId/features",
		personalFeaturesRouter,
	);
	app.use(
		"/api/v1/personal/projects/:projectId/requirements",
		personalRequirementsRouter,
	);
	// Organization execution routes
	app.use("/api/v1/org/projects", orgProjectsRouter);
	app.use("/api/org/projects", orgProjectsRouter);
	app.use("/api/v1/org/tasks", orgTasksRouter);
	app.use("/api/org/tasks", orgTasksRouter);
	app.use("/api/v1/org/my-work", orgMyWorkRouter);
	app.use("/api/org/my-work", orgMyWorkRouter);
	app.use("/api/v1/org/reports", orgReportsRouter);
	app.use("/api/org/reports", orgReportsRouter);
	app.use("/api/v1/org/approvals", orgApprovalsRouter);
	app.use("/api/v1/org/requests", requestsRouter);
	app.use("/api/v1/org/focus", orgFocusRouter);
	app.use("/api/v1/org/timeline", orgTimelineRouter);
	app.use("/api/org/timeline", orgTimelineRouter);
	app.use("/api/v1/org/graph", organizationRouter);
	app.use("/api/v1/org/co-ceos", organizationRouter);
	app.use("/api/v1/org/members", organizationRouter);
	app.use("/api/v1/org/directory", organizationRouter);
	app.use("/api/org/directory", organizationRouter);
	app.use("/api/v1/org/prompts", orgPromptsRouter);
	app.use("/api/org/prompts", orgPromptsRouter);
	app.use("/api/v1/org/learning", orgLearningRouter);
	app.use("/api/org/learning", orgLearningRouter);
	app.use("/api/v1/automation", automationRouter);
	app.use("/api/v1/org/automation", automationRouter);
	app.use("/api/v1/org/integrations", orgIntegrationsRouter);
	app.use("/api/org/integrations", orgIntegrationsRouter);


	// ── Database Records REST API ──
	app.get(
		"/api/v1/db/records",
		strictAuth,
		requireRole(["CEO"]),
		async (_req: Request, res: Response, next: NextFunction) => {
			try {
				const [userList, assetList, notificationList, aiList] =
					await Promise.all([
						db
							.select()
							.from(users)
							.limit(10)
							.catch(() => []),
						db
							.select()
							.from(mediaAssets)
							.limit(10)
							.catch(() => []),
						db
							.select()
							.from(notificationLogs)
							.limit(10)
							.catch(() => []),
						db
							.select()
							.from(aiConversations)
							.limit(10)
							.catch(() => []),
					]);

				return res.status(200).json({
					success: true,
					tables: {
						users: userList,
						mediaAssets: assetList,
						notificationLogs: notificationList,
						aiConversations: aiList,
					},
				});
			} catch (error) {
				next(error);
			}
		},
	);

	// ── BullMQ Background Queue & Auto-Cleanup Endpoints ──
	app.post(
		"/api/v1/queue/email-job",
		strictAuth,
		async (req: Request, res: Response, next: NextFunction) => {
			try {
				const { to, subject, text } = req.body;
				if (!to || !subject) {
					return res.status(400).json({
						success: false,
						error: "Missing required fields: to, subject",
					});
				}

				const result = await queueService.addEmailJob({ to, subject, text });
				return res.status(200).json(result);
			} catch (error) {
				next(error);
			}
		},
	);

	app.post(
		"/api/v1/queue/push-job",
		strictAuth,
		requireRole(["CEO"]),
		async (req: Request, res: Response, next: NextFunction) => {
			try {
				const { title, body, token } = req.body;
				if (!title || !body) {
					return res.status(400).json({
						success: false,
						error: "Missing required fields: title, body",
					});
				}

				const result = await queueService.addPushJob({
					title,
					body,
					token,
					topic: token ? undefined : "all",
				});
				return res.status(200).json(result);
			} catch (error) {
				next(error);
			}
		},
	);

	app.get(
		"/api/v1/queue/stats",
		strictAuth,
		requireRole(["CEO"]),
		async (_req: Request, res: Response) => {
			const stats = await queueService.getQueueStats();
			return res.status(200).json(stats);
		},
	);

	// REST API Email Route
	app.post(
		"/api/v1/email/send",
		strictAuth,
		requireRole(["CEO"]),
		async (req: Request, res: Response, next: NextFunction) => {
			try {
				const { to, subject, text, html } = req.body;
				if (!to || !subject) {
					return res.status(400).json({
						success: false,
						error: "Missing required fields: to, subject",
					});
				}

				const result = await emailService.sendEmail({
					to,
					subject,
					text,
					html,
				});
				return res.status(result.success ? 200 : 500).json(result);
			} catch (error) {
				next(error);
			}
		},
	);

	// Smart Multi-LLM AI Gateway Endpoint with Auto-Failover
	app.post(
		"/api/v1/ai/generate",
		strictAuth,
		async (req: Request, res: Response, _next: NextFunction) => {
			try {
				const { prompt, provider } = req.body;
				if (!prompt) {
					return res
						.status(400)
						.json({ success: false, error: "Missing required field: prompt" });
				}

				const result = await aiService.generateWithSmartFailover(
					prompt,
					provider,
				);
				const metricsData = aiService.getMetrics();

				// Auto-Sync record into Drizzle ORM DB
				db.insert(aiConversations)
					.values({
						id: `ai_${Date.now()}`,
						provider: result.provider,
						model: result.model,
						prompt,
						response: result.text,
						executionTimeMs: result.executionTimeMs,
					})
					.catch(() => {});

				return res.status(200).json({
					success: true,
					data: {
						provider: result.provider,
						model: result.model,
						executionTimeMs: result.executionTimeMs,
						failoverTriggered: result.failoverUsed,
						failoverTrail: result.failoverTrail || [],
						response: result.text,
					},
					providerUsed: result.provider,
					response: result.text,
					metrics: metricsData.metrics,
					configuredProviders: metricsData.configuredProviders,
				});
			} catch (error: any) {
				return res.status(400).json({
					success: false,
					error:
						error.message ||
						"AI Gateway error. Please check provider API keys in backend/.env",
				});
			}
		},
	);

	// AI Usage Metrics & Quota Tracker
	app.get(
		"/api/v1/ai/metrics",
		strictAuth,
		requireRole(["CEO"]),
		(_req: Request, res: Response) => {
			res.status(200).json(aiService.getMetrics());
		},
	);

	// Firebase Push Notification Route
	app.post(
		"/api/v1/notifications/push",
		strictAuth,
		async (req: Request, res: Response, next: NextFunction) => {
			try {
				const { token, topic, title, body } = req.body;
				if (!title || !body) {
					return res.status(400).json({
						success: false,
						error: "Missing required fields: title, body",
					});
				}

				const result = await firebaseNotificationService.sendPushNotification({
					token,
					topic,
					title,
					body,
				});

				// Auto-Sync notification into Drizzle ORM DB
				db.insert(notificationLogs)
					.values({
						id: `push_${Date.now()}`,
						title,
						body,
						recipient: token || topic || "all",
						status: result.success ? "delivered" : "failed",
					})
					.catch(() => {});

				return res.status(result.success ? 200 : 400).json(result);
			} catch (error) {
				next(error);
			}
		},
	);

	// Cloudinary Storage Upload Route
	app.post(
		"/api/v1/storage/upload",
		strictAuth,
		uploadLimiter,
		async (req: Request, res: Response, next: NextFunction) => {
			try {
				const { file, folder } = req.body;
				if (!file) {
					return res.status(400).json({
						success: false,
						error: "Missing required base64 file string",
					});
				}

				const approximateSizeInBytes = Math.round((file.length * 3) / 4);
				const MAX_SIZE = 10 * 1024 * 1024;
				if (approximateSizeInBytes > MAX_SIZE) {
					return res.status(400).json({
						success: false,
						error: `File exceeds maximum limit of 10MB. Selected file: ${(approximateSizeInBytes / (1024 * 1024)).toFixed(2)}MB`,
					});
				}

				if (!cloudinaryService.isConfigured()) {
					return res.status(400).json({
						success: false,
						error: "Cloudinary credentials not configured in backend/.env",
					});
				}

				const result = await cloudinaryService.uploadBase64(
					file,
					folder || "manmadhan-progress",
				);

				// Auto-Sync asset into Drizzle ORM DB
				db.insert(mediaAssets)
					.values({
						id: `asset_${Date.now()}`,
						publicId: result.public_id,
						url: result.secure_url,
						sizeFormatted: `${(approximateSizeInBytes / 1024).toFixed(2)} KB`,
					})
					.catch(() => {});

				return res.status(200).json({
					success: true,
					url: result.secure_url,
					optimizeUrl: result.optimizeUrl,
					autoCropUrl: result.autoCropUrl,
					publicId: result.public_id,
					sizeFormatted: `${(approximateSizeInBytes / 1024).toFixed(2)} KB`,
				});
			} catch (error: any) {
				next(error);
			}
		},
	);

	// Cloudinary Storage Delete Asset Route
	app.delete(
		"/api/v1/storage/delete",
		strictAuth,
		async (req: Request, res: Response, next: NextFunction) => {
			try {
				const { publicId } = req.body;
				if (!publicId) {
					return res
						.status(400)
						.json({ success: false, error: "Missing publicId parameter" });
				}

				const deleted = await cloudinaryService.deleteAsset(publicId);
				return res.status(200).json({
					success: deleted,
					message: deleted
						? `Asset ${publicId} deleted cleanly from Cloudinary`
						: `Failed to delete asset ${publicId}`,
				});
			} catch (error: any) {
				next(error);
			}
		},
	);

	// Google OAuth Routes
	const getGoogleCallbackUrl = (req: Request) => {
		if (process.env.GOOGLE_AUTH_CALLBACK_URL) return process.env.GOOGLE_AUTH_CALLBACK_URL;
		if (process.env.GOOGLE_CALLBACK_URL) return process.env.GOOGLE_CALLBACK_URL;
		if (process.env.SERVER_URL) return `${process.env.SERVER_URL.replace(/\/$/, "")}/api/v1/auth/google/callback`;
		const host = req.get("host") || `localhost:${env.PORT || 4100}`;
		const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "http";
		return `${proto}://${host}/api/v1/auth/google/callback`;
	};

	app.get(
		"/api/v1/auth/google",
		(req: Request, res: Response, next: NextFunction) => {
			if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
				return res.status(400).json({
					success: false,
					error: "Google Client ID / Secret not configured in backend/.env",
				});
			}
			const callbackURL = getGoogleCallbackUrl(req);
			passport.authenticate("google", {
				scope: ["profile", "email"],
				session: false,
				callbackURL,
			} as any)(req, res, next);
		},
	);

	app.get(
		"/api/v1/auth/google/callback",
		(req: Request, res: Response, next: NextFunction) => {
			const callbackURL = getGoogleCallbackUrl(req);
			passport.authenticate("google", {
				failureRedirect: `${(env.CLIENT_URL || "http://localhost:3000").replace(/\/$/, "")}/login?error=account_not_found`,
				session: false,
				callbackURL,
			} as any)(req, res, next);
		},
		async (req: Request, res: Response) => {
			const user = req.user as any;
			if (user?.email) {
				const { db } = require("../database/client");
				const { users } = require("../database/schema");
				const { eq, ilike } = require("drizzle-orm");
				const { DeviceService } = require("./services/device.service");
				const { SessionService } = require("./services/session.service");
				const { AuditService } = require("./services/audit.service");
				const { randomUUID } = require("node:crypto");

				const cleanEmail = String(user.email || "").trim().toLowerCase();
				const userRecords = await db
					.select()
					.from(users)
					.where(ilike(users.email, cleanEmail))
					.limit(1);
				const dbUser = userRecords[0];

				if (!dbUser) {
					return res.redirect(`${env.CLIENT_URL}/login?error=account_not_found&email=${encodeURIComponent(cleanEmail)}`);
				}

				if (!dbUser.firstLoginCompleted && dbUser.status !== "Activated") {
					await AuditService.logEvent(
						dbUser.id,
						"LOGIN_FAILED",
						"Google login rejected: first login must be completed with email and password",
						req.ip || "",
					);
					return res.redirect(`${env.CLIENT_URL}/login?error=first_login_required&email=${encodeURIComponent(cleanEmail)}`);
				}

				// Fully set up user, go straight to dashboard
				const deviceId = await DeviceService.registerDevice(dbUser.id, {
					deviceId: randomUUID(),
					deviceName: req.headers["user-agent"] || "Unknown",
					browser: "Unknown",
					os: "Unknown",
					ipAddress: req.ip || "0.0.0.0",
				});
				let tokens: any = null;
				try {
					tokens = await SessionService.issueTokens(
						res,
						dbUser,
						deviceId,
						req.headers["user-agent"],
						req.ip,
					);
				} catch (sessionErr) {
					return res.redirect(
						`${(env.CLIENT_URL || "http://localhost:3000").replace(/\/$/, "")}/login?error=session_creation_failed`,
					);
				}
				await AuditService.logEvent(
					dbUser.id,
					"LOGIN_SUCCESS",
					"Logged in via Google OAuth",
					req.ip || "",
				);

				const getClientUrl = (subpath: string) => {
					const base = (env.CLIENT_URL || "http://localhost:3000").replace(/\/$/, "");
					const clean = subpath.startsWith("/") ? subpath : `/${subpath}`;
					return `${base}${clean}`;
				};

				const r = (dbUser.role || "MEMBER").toUpperCase();
				const tokenStr = tokens?.accessToken || "";
				return res.redirect(getClientUrl(`/login?auth_step=OAUTH_SUCCESS&token=${tokenStr}&role=${r}`));
			}
			return res.redirect(`${(env.CLIENT_URL || "http://localhost:3000").replace(/\/$/, "")}/login?error=account_not_found`);
		},
	);

	// GitHub OAuth Routes
	app.get(
		"/api/v1/auth/github",
		(req: Request, res: Response, next: NextFunction) => {
			if (
				!env.GITHUB_CLIENT_SECRET ||
				env.GITHUB_CLIENT_SECRET.includes("github-client-secret")
			) {
				return res.status(400).json({
					success: false,
					error:
						"GitHub Client Secret pending. Please add GITHUB_CLIENT_SECRET in backend/.env",
				});
			}
			passport.authenticate("github", {
				scope: ["user:email"],
				session: false,
			})(req, res, next);
		},
	);

	app.get(
		"/api/v1/auth/github/callback",
		passport.authenticate("github", {
			failureRedirect: `${env.CLIENT_URL}/login?error=github_cancelled`,
			session: false,
		}),
		async (req: Request, res: Response) => {
			const user = req.user as any;
			if (user && (user.id || user.email)) {
				const { db } = require("../database/client");
				const { users } = require("../database/schema");
				const { eq } = require("drizzle-orm");
				const { DeviceService } = require("./services/device.service");
				const { SessionService } = require("./services/session.service");
				const { AuditService } = require("./services/audit.service");
				const { randomUUID } = require("node:crypto");

				let dbUser: any = null;
				if (user.email) {
					const records = await db
						.select()
						.from(users)
						.where(eq(users.email, user.email.toLowerCase()))
						.limit(1);
					dbUser = records[0];
				}

				if (!dbUser && user.id) {
					const records = await db
						.select()
						.from(users)
						.where(eq(users.id, user.id))
						.limit(1);
					dbUser = records[0];
				}

				if (!dbUser) {
					return res.redirect(`${env.CLIENT_URL}/account-not-found`);
				}

				if (dbUser.status === "Activated") {
					const deviceId = await DeviceService.registerDevice(dbUser.id, {
						deviceId: randomUUID(),
						deviceName: req.headers["user-agent"] || "Unknown",
						browser: "Unknown",
						os: "Unknown",
						ipAddress: req.ip || "0.0.0.0",
					});
					const tokens = await SessionService.issueTokens(res, dbUser, deviceId);
					await AuditService.logEvent(
						dbUser.id,
						"LOGIN_SUCCESS",
						"Logged in via GitHub OAuth",
						req.ip || "",
					);

					const getClientUrl = (subpath: string) => {
						const base = (env.CLIENT_URL || "http://localhost:3000").replace(/\/$/, "");
						const clean = subpath.startsWith("/") ? subpath : `/${subpath}`;
						return `${base}${clean}`;
					};

					const r = (dbUser.role || "MEMBER").toUpperCase();
					const tokenStr = tokens?.accessToken || "";
					return res.redirect(getClientUrl(`/login?auth_step=OAUTH_SUCCESS&token=${tokenStr}&role=${r}`));
				} else {
					await AuditService.logEvent(
						dbUser.id,
						"LOGIN_ATTEMPT",
						"Initial GitHub OAuth login, entering setup",
						req.ip || "",
					);

					const tempToken = jwt.sign(
						{
							id: dbUser.id,
							email: dbUser.email,
							intent: "setup",
							step: "PASSWORD_CREATION",
						},
						env.JWT_SECRET,
						{ expiresIn: "30m" },
					);

					return res.redirect(
						`${env.CLIENT_URL}/?auth_step=PASSWORD_CREATION&token=${tempToken}&role=${dbUser.role}`,
					);
				}
			}
			return res.redirect(`${env.CLIENT_URL}/login?error=OAuthFailed`);
		},
	);

	// (Old auth profile endpoints replaced by authRouter)

	// Global Error Handler
	app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
		const requestId = (req as any).id || `req-${Date.now()}`;
		logger.error({ errName: err.name, errCode: err.code, url: req.url, requestId }, "Unhandled Application Exception");

		const causeMsg = String(err?.cause?.message || "");
		const isDbConnError =
			err?.name === "DrizzleQueryError" ||
			err?.type === "DrizzleQueryError" ||
			err?.message?.includes("Connection terminated") ||
			err?.message?.includes("connection timeout") ||
			err?.message?.includes("ETIMEDOUT") ||
			causeMsg.includes("Connection terminated") ||
			causeMsg.includes("connection timeout") ||
			causeMsg.includes("ETIMEDOUT") ||
			err?.code === "ETIMEDOUT" ||
			err?.code === "ECONNREFUSED";

		if (isDbConnError) {
			return res.status(503).json({
				success: false,
				error: {
					code: "DATABASE_UNAVAILABLE",
					message: "We couldn't connect to the workspace right now. Please try again in a moment.",
					requestId,
				},
			});
		}

		const status = typeof err?.status === "number" && err.status >= 400 && err.status < 600 ? err.status : 500;
		const code = err?.code || "INTERNAL_ERROR";
		const rawMsg = err?.message || "";
		const containsSensitiveDbText =
			rawMsg.includes("insert into") ||
			rawMsg.includes("select ") ||
			rawMsg.includes("postgres") ||
			rawMsg.includes("column") ||
			rawMsg.includes("table");

		const safeMessage = !containsSensitiveDbText && rawMsg
			? rawMsg
			: "An unexpected error occurred. Please try again.";

		return res.status(status).json({
			success: false,
			error: {
				code,
				message: safeMessage,
				requestId,
			},
		});
	});

	return app;
};
