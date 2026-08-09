import http from "http";
import { Server as SocketIOServer } from "socket.io";
import { createApp } from "./app";
import { env } from "../config/env.config";
import { logger } from "./services/logger.service";
import { emailService } from "./services/email.service";
import { socketService } from "./services/socket.service";
import { checkDatabaseConnection } from "../database/client";
import { printStartupDashboard } from "./bootstrap/telemetry";

const startServer = async () => {
  const startTime = performance.now();

  // 1. Database & SMTPS Email Connections
  checkDatabaseConnection();
  emailService.verifyConnection();

  // 2. Create Express App & HTTP Server
  const app = createApp();

  const httpServer = http.createServer(app);

  // 3. Mount Socket.IO Engine with Room Broadcasting
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: [env.CLIENT_URL, "http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:4000", "*"],
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["polling", "websocket"],
  });

  socketService.init(io);

  io.on("connection", (socket) => {
    logger.trace({ socketId: socket.id }, "Socket.IO Realtime client connected");

    // Join Room Channel
    socket.on("join_room", (room: string) => {
      socket.join(room);
      io.to(room).emit("room_notification", {
        type: "user_joined",
        socketId: socket.id,
        room,
        timestamp: new Date().toLocaleTimeString(),
      });
    });

    // Room Message Event
    socket.on("send_room_message", (data: { room: string; sender: string; text: string }) => {
      io.to(data.room).emit("room_message", {
        sender: data.sender || socket.id,
        text: data.text,
        timestamp: new Date().toLocaleTimeString(),
      });
    });

    socket.on("disconnect", () => {
      logger.trace({ socketId: socket.id }, "Socket.IO client disconnected");
    });
  });

  const port = env.PORT;

  // 4. Start HTTP Listener & Output Startup Telemetry Dashboard
  httpServer.listen(port, () => {
    printStartupDashboard(port, startTime);
  });
};

startServer().catch((error) => {
  logger.fatal({ err: error }, "Backend Server Startup Failed");
  process.exit(1);
});
