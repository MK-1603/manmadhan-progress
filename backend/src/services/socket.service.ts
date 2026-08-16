import type { Server as SocketIOServer } from "socket.io";
import { logger } from "./logger.service";

class SocketService {
	private io: SocketIOServer | null = null;

	init(ioInstance: SocketIOServer) {
		this.io = ioInstance;
	}

	// Emits an event to a specific workspace room
	emitToWorkspace(workspaceId: string, event: string, payload: any) {
		if (!this.io) return;
		const room = `workspace_${workspaceId}`;
		this.io.to(room).emit(event, payload);
		logger.trace("Realtime event emitted");
	}

	// Emits an event to a specific user's room
	emitToUser(userId: string, event: string, payload: any) {
		if (!this.io) return;
		const room = `user_${userId}`;
		this.io.to(room).emit(event, payload);
		logger.trace("Realtime event emitted");
	}
}

export const socketService = new SocketService();
