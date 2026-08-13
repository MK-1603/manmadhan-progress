import http from "node:http";
import { and, eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { Server as SocketIOServer } from "socket.io";
import { env } from "../config/env.config";
import { checkDatabaseConnection, db } from "../database/client";
import { workspaceMembers } from "../database/schema";
import { createApp } from "./app";
import { printStartupDashboard } from "./bootstrap/telemetry";
import { cronService } from "./services/cron.service";
import { emailService } from "./services/email.service";
import { logger } from "./services/logger.service";
import { socketService } from "./services/socket.service";

const startServer = async () => {
	const startTime = performance.now();

	// 1. Database & SMTPS Email Connections
	checkDatabaseConnection();
	emailService.verifyConnection();

	// Start cron jobs
	cronService.start();

	// 2. Create Express App & HTTP Server
	const app = createApp();

	const httpServer = http.createServer(app);

	// 3. Mount Socket.IO Engine with Room Broadcasting
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
					callback(null, true); // Permissive fallback for production socket transport
				}
			},
			methods: ["GET", "POST"],
			credentials: true,
		},
		transports: ["websocket", "polling"],
		allowEIO3: true,
	});

	socketService.init(io);

	// Secure Multi-Channel Authentication Middleware
	io.use((socket, next) => {
		try {
			// Extract token from multiple handshake channels
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
					// Token present but invalid/expired — log and reject
					const msg =
						jwtErr instanceof Error ? jwtErr.message : String(jwtErr);
					logger.warn(
						{ socketId: socket.id, reason: msg },
						"Socket rejected: JWT validation failed",
					);
					// Reject the connection so the client knows to re-authenticate
					return next(new Error(`Authentication failed: ${msg}`));
				}
			}
			// No token — allow anonymous connection (public socket only)
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

		logger.trace(
			{ socketId: socket.id, userId: user?.id ?? "anonymous" },
			"Socket.IO Realtime client connected",
		);

		// Auto-join the authenticated user's private room
		if (user?.id) {
			socket.join(`user_${user.id}`);
		}

		// Secure Room Join — all guard conditions check user before accessing user.id
		socket.on("join_room", async (room: unknown) => {
			try {
				// Validate room argument is a non-empty string
				if (typeof room !== "string" || !room.trim()) {
					logger.warn(
						{ socketId: socket.id, room },
						"join_room rejected: invalid room argument",
					);
					return;
				}

				// User-private room — only the owning user may join
				if (room.startsWith("user_")) {
					if (!user?.id) {
						logger.warn(
							{ socketId: socket.id, room },
							"join_room rejected: unauthenticated user trying to join user room",
						);
						return;
					}
					if (room === `user_${user.id}`) {
						socket.join(room);
					} else {
						logger.warn(
							{ socketId: socket.id, userId: user.id, room },
							"join_room rejected: user trying to join another user's room",
						);
					}
					return;
				}

				if (room.startsWith("workspace_")) {
					const workspaceId = room.replace("workspace_", "");

					if (!workspaceId) return;

					// Personal workspace requires authentication but no DB membership check
					if (workspaceId === "personal") {
						if (user?.id) {
							socket.join(room);
						}
						return;
					}

					// Org workspace — must be authenticated and a verified member
					if (!user?.id) {
						logger.warn(
							{ socketId: socket.id, room },
							"join_room rejected: unauthenticated user trying to join workspace room",
						);
						return;
					}

					// Verify organization membership in DB
					const isMember = await db.query.workspaceMembers.findFirst({
						where: and(
							eq(workspaceMembers.workspaceId, workspaceId),
							eq(workspaceMembers.userId, user.id),
						),
					});

					if (isMember) {
						socket.join(room);
						logger.trace(
							{ socketId: socket.id, userId: user.id, workspaceId },
							"Socket joined workspace room",
						);
					} else {
						logger.warn(
							{ socketId: socket.id, userId: user.id, workspaceId },
							"join_room rejected: user is not a member of this workspace",
						);
					}
					return;
				}

				// Unknown room prefix — silently ignore
				logger.debug(
					{ socketId: socket.id, room },
					"join_room: unrecognized room prefix, ignored",
				);
			} catch (err) {
				logger.error(
					{ err, socketId: socket.id, room },
					"Socket room join error",
				);
			}
		});

		socket.on("disconnect", (reason) => {
			logger.trace(
				{ socketId: socket.id, userId: user?.id ?? "anonymous", reason },
				"Socket.IO client disconnected",
			);
		});
	});

	const port = env.PORT;

	// 4. Start HTTP Listener & Output Startup Telemetry Dashboard
	httpServer.listen(Number(port), "0.0.0.0", () => {
		logger.info(`API server running on http://localhost:${port}`);
		printStartupDashboard(port, startTime);
	});
};

startServer().catch((error) => {
	logger.fatal({ err: error }, "Backend Server Startup Failed");
	process.exit(1);
});
