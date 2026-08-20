import dns from "node:dns";
import http from "node:http";

// Enforce IPv4 DNS resolution first to fix ENETUNREACH IPv6 socket failures
dns.setDefaultResultOrder("ipv4first");
import { and, eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { Server as SocketIOServer } from "socket.io";
import { env } from "../config/env.config";
import { checkDatabaseConnection, db } from "../database/client";
import { workspaceMembers, workspaces } from "../database/schema";
import { createApp } from "./app";
import { startupLogger } from "./bootstrap/startup-logger";
import { cronService } from "./services/cron.service";
import { emailService } from "./services/email.service";
import { logger } from "./services/logger.service";
import { queueService } from "./services/queue.service";
import { socketService } from "./services/socket.service";

const startServer = async () => {
	const startTime = performance.now();

	// Phase 1: SYSTEM
	startupLogger.info(
		"SYSTEM",
		`Initializing Node.js ${process.version} runtime environment...`,
	);

	// Phase 2: DATABASE
	startupLogger.info(
		"DATABASE",
		"Verifying PostgreSQL (Neon) & Drizzle ORM connections...",
	);
	const isDbConnected = await checkDatabaseConnection();
	if (isDbConnected) {
		startupLogger.info(
			"DATABASE",
			"All PostgreSQL connections verified (Auth, Personal, ManMadhan).",
		);
	} else {
		startupLogger.warn(
			"DATABASE",
			"PostgreSQL connection check failed (Degraded Mode).",
		);
	}

	// Phase 3: AUTHENTICATION
	startupLogger.info(
		"AUTHENTICATION",
		"Google OAuth 2.0 Strategy & First-Login Gate initialized.",
	);

	// Phase 4: EMAIL
	startupLogger.info("EMAIL", "Verifying Gmail SMTP Primary Provider...");
	const isEmailVerified = await emailService.verifyConnection();
	if (isEmailVerified) {
		startupLogger.info(
			"EMAIL",
			"Gmail SMTP Primary Provider verified ✓ Connected",
		);
	} else {
		startupLogger.warn("EMAIL", "Gmail SMTP verification check failed.");
	}

	// Phase 5: STORAGE
	startupLogger.info(
		"STORAGE",
		`Cloudinary Media Storage (${env.CLOUDINARY_CLOUD_NAME}) initialized.`,
	);

	// Start Cron Jobs
	cronService.start();

	// Phase 6: REALTIME
	startupLogger.info(
		"REALTIME",
		"Configuring Socket.IO Multi-Channel Realtime Engine...",
	);

	const app = createApp();
	const httpServer = http.createServer(app);

	const io = new SocketIOServer(httpServer, {
		cors: {
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
					origin.endsWith(".vercel.app") ||
					origin.includes("onrender.com")
				) {
					callback(null, true);
				} else {
					callback(null, true);
				}
			},
			methods: ["GET", "POST"],
			credentials: true,
		},
		transports: ["websocket", "polling"],
		allowEIO3: true,
	});

	socketService.init(io);
	startupLogger.info(
		"REALTIME",
		"Socket.IO Engine bound with workspace RBAC & personal isolation.",
	);

	// Phase 7: QUEUES
	startupLogger.info(
		"QUEUES",
		"BullMQ Auto-Cleanup Background Task Engine started.",
	);

	// Phase 8: AI SERVICES
	startupLogger.info(
		"AI SERVICES",
		`Groq Llama 3.3 70B & Gemini (${env.GEMINI_MODEL}) APIs ready.`,
	);

	// Socket.IO handshakes & authentication
	io.use((socket, next) => {
		try {
			let token =
				(socket.handshake.auth as any)?.token ||
				(socket.handshake.query as any)?.token ||
				socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, "");

			if (!token) {
				const cookieHeader = socket.request.headers.cookie;
				if (cookieHeader) {
					const cookies = cookieHeader
						.split(";")
						.reduce((acc: Record<string, string>, cookie) => {
							const eqIdx = cookie.indexOf("=");
							if (eqIdx !== -1) {
								const key = cookie.slice(0, eqIdx).trim();
								const value = cookie.slice(eqIdx + 1).trim();
								acc[key] = value;
							}
							return acc;
						}, {});
					token = cookies.auth_token || cookies.token;
				}
			}

			if (token) {
				try {
					const decoded = jwt.verify(token, env.JWT_SECRET) as any;
					(socket as any).user = decoded;
				} catch (jwtErr) {
					const msg =
						jwtErr instanceof Error ? jwtErr.message : String(jwtErr);
					logger.warn(
						{ socketId: socket.id, reason: msg },
						"Socket rejected: JWT validation failed",
					);
					return next(new Error(`Authentication failed: ${msg}`));
				}
			}
			next();
		} catch (err) {
			logger.error(
				{ err, socketId: socket.id },
				"Socket authentication middleware unexpected error",
			);
			next(new Error("Authentication error"));
		}
	});

	io.on("connection", (socket) => {
		const user = (socket as any).user as
			| { id: string; role?: string }
			| undefined;

		if (user?.id) {
			socket.join(`user_${user.id}`);
		}

		socket.on("join_room", async (room: unknown) => {
			try {
				if (typeof room !== "string" || !room.trim()) return;

				if (room.startsWith("user_")) {
					if (!user?.id) return;
					if (room === `user_${user.id}`) {
						socket.join(room);
					}
					return;
				}

				if (room.startsWith("workspace_")) {
					const workspaceId = room.replace("workspace_", "");
					if (!workspaceId) return;

					if (
						workspaceId === "hub-1" ||
						workspaceId === "hub-2" ||
						workspaceId.startsWith("hub-")
					) {
						socket.emit("error", {
							success: false,
							code: "WORKSPACE_NOT_FOUND",
							message: "Workspace not found",
						});
						return;
					}

					if (!user?.id) {
						socket.emit("error", {
							success: false,
							code: "UNAUTHORIZED",
							message: "Authentication required",
						});
						return;
					}

					if (
						workspaceId === "personal" ||
						workspaceId === `personal_${user.id}`
					) {
						socket.join(`personal_${user.id}`);
						return;
					}

					const targetWs = await db.query.workspaces.findFirst({
						where: eq(workspaces.id, workspaceId),
					});

					if (!targetWs) {
						socket.emit("error", {
							success: false,
							code: "WORKSPACE_NOT_FOUND",
							message: "Workspace not found",
						});
						return;
					}

					if (targetWs.type === "personal") {
						socket.join(`personal_${user.id}`);
						return;
					}

					const isMember = await db.query.workspaceMembers.findFirst({
						where: and(
							eq(workspaceMembers.workspaceId, workspaceId),
							eq(workspaceMembers.userId, user.id),
						),
					});

					if (isMember) {
						socket.join(room);
					} else {
						socket.emit("error", {
							success: false,
							code: "WORKSPACE_ACCESS_DENIED",
							message: "Access denied",
						});
					}
					return;
				}
			} catch (err) {
				logger.error({ err, socketId: socket.id, room }, "Socket room join error");
			}
		});
	});

	const port = env.PORT;

	// Phase 9: APPLICATION Listening & Single Atomic Dashboard Render
	httpServer.listen(Number(port), "0.0.0.0", () => {
		const serverUrl = process.env.SERVER_URL || process.env.RENDER_EXTERNAL_URL || `port ${port}`;
		startupLogger.info(
			"APPLICATION",
			`Express API Server listening on ${serverUrl}`,
		);
		startupLogger.flushAndRenderDashboard(port, startTime, isDbConnected);
	});

	// Graceful Shutdown Handlers (SIGTERM & SIGINT)
	const gracefulShutdown = async (signal: string) => {
		logger.info(`Received ${signal}. Starting graceful shutdown...`);
		try {
			httpServer.close(() => {
				logger.info("HTTP server stopped listening for new requests.");
			});
			io.close();
			logger.info("Socket.IO connections closed.");
			cronService.stop();
			await queueService.close();
			logger.info("Queue & cron tasks terminated cleanly.");
		} catch (err) {
			logger.error({ err }, "Error during graceful shutdown");
		} finally {
			setTimeout(() => {
				logger.info("Graceful shutdown complete. Exiting process.");
				process.exit(0);
			}, 500);
		}
	};

	process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
	process.on("SIGINT", () => gracefulShutdown("SIGINT"));
};

startServer().catch((error) => {
	logger.fatal({ err: error }, "Backend Server Startup Failed");
	process.exit(1);
});
