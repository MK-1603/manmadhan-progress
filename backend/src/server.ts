import { and, eq } from "drizzle-orm";
import http from "http";
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
			origin: [
				env.CLIENT_URL,
				"http://localhost:3000",
				"http://127.0.0.1:3000",
				"http://localhost:4000",
				"*",
			],
			methods: ["GET", "POST"],
			credentials: true,
		},
		transports: ["polling", "websocket"],
	});

	socketService.init(io);

	// Secure Authentication Middleware
	io.use((socket, next) => {
		try {
			const cookieHeader = socket.request.headers.cookie;
			let token = "";
			if (cookieHeader) {
				const cookies = cookieHeader.split(";").reduce((acc: any, cookie) => {
					const [key, value] = cookie.split("=").map((c) => c.trim());
					acc[key] = value;
					return acc;
				}, {});
				token = cookies["auth_token"];
			}

			if (!token) {
				return next(new Error("Authentication error: No token provided"));
			}

			const decoded = jwt.verify(token, env.JWT_SECRET) as any;
			(socket as any).user = decoded;
			next();
		} catch (err) {
			next(new Error("Authentication error: Invalid token"));
		}
	});

	io.on("connection", (socket) => {
		const user = (socket as any).user;
		logger.trace(
			{ socketId: socket.id, userId: user?.id },
			"Socket.IO Realtime client connected",
		);

		if (user?.id) {
			socket.join(`user_${user.id}`);
		}

		// Secure Room Join
		socket.on("join_room", async (room: string) => {
			try {
				if (room === `user_${user.id}`) {
					socket.join(room);
					return;
				}

				if (room.startsWith("workspace_")) {
					const workspaceId = room.replace("workspace_", "");

					if (workspaceId === "personal") {
						socket.join(room);
						return;
					}

					// Verify organization membership
					const isMember = await db.query.workspaceMembers.findFirst({
						where: and(
							eq(workspaceMembers.workspaceId, workspaceId),
							eq(workspaceMembers.userId, user.id),
						),
					});

					if (isMember) {
						socket.join(room);
					} else {
						logger.warn(
							{ userId: user.id, workspaceId },
							"Unauthorized socket room join attempt",
						);
					}
				}
			} catch (err) {
				logger.error({ err }, "Socket room join error");
			}
		});

		socket.on("disconnect", () => {
			logger.trace(
				{ socketId: socket.id, userId: user?.id },
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
