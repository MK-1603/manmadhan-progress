import { Server as SocketIOServer } from "socket.io";
import { logger } from "./logger.service";

class SocketService {
  private io: SocketIOServer | null = null;

  init(ioInstance: SocketIOServer) {
    this.io = ioInstance;
  }

  // Emits an event to a specific workspace room
  emitToWorkspace(workspaceId: string, event: string, payload: any) {
    if (!this.io) {
      logger.warn(`Cannot emit event ${event} to workspace ${workspaceId}: Socket.IO not initialized`);
      return;
    }
    const room = `workspace_${workspaceId}`;
    this.io.to(room).emit(event, payload);
    logger.debug({ room, event }, "Emitted socket event to workspace");
  }

  // Emits an event to a specific user's room
  emitToUser(userId: string, event: string, payload: any) {
    if (!this.io) {
      logger.warn(`Cannot emit event ${event} to user ${userId}: Socket.IO not initialized`);
      return;
    }
    const room = `user_${userId}`;
    this.io.to(room).emit(event, payload);
    logger.debug({ room, event }, "Emitted socket event to user");
  }
}

export const socketService = new SocketService();
