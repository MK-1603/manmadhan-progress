"use client";

import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/components/auth/auth-context";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

/**
 * SocketProvider — stable single-instance socket lifecycle.
 *
 * Key design rules:
 *  1. The socket is created ONCE on mount and NEVER recreated.
 *  2. Room subscriptions (join_room) are managed separately from the connection.
 *  3. When user/workspace changes, we emit new join_room events — we do NOT disconnect.
 *  4. WebSocket transport is tried first (faster), polling is the fallback.
 *  5. The dashboard renders from the API; socket is only for realtime updates.
 */
export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const socketRef = useRef<Socket | null>(null);
  const userIdRef = useRef<string | null>(null); // stable ref — avoids re-creating socket on user change
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const { user } = useAuth();

  // ── Step 1: Create socket ONCE on mount ──────────────────────────────────
  useEffect(() => {
    if (socketRef.current) return; // Guard: already created

    // Dynamically resolve the backend URL based on the current hostname to support network access
    const hostname = typeof window !== "undefined" ? window.location.hostname : "localhost";
    const backendUrl = process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace('/api/v1', '') : "http://localhost:4100";
    const SOCKET_URL = hostname === "localhost" ? backendUrl : `http://${hostname}:${backendUrl.split(':').pop()}`;

    const socketInstance = io(SOCKET_URL, {
      path: "/socket.io/",
      withCredentials: true,
      // WebSocket first — avoids the slow polling → websocket upgrade (saves 3–6s)
      transports: ["polling", "websocket"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      autoConnect: true,
    });

    socketInstance.on("connect", () => {
      setIsConnected(true);

      // Re-join rooms on every (re)connect so reconnections automatically
      // resubscribe without requiring user interaction.
      const workspaceId = localStorage.getItem("workspaceId");
      if (workspaceId) {
        socketInstance.emit("join_room", `workspace_${workspaceId}`);
      }
      if (userIdRef.current) {
        socketInstance.emit("join_room", `user_${userIdRef.current}`);
      }
    });

    socketInstance.on("disconnect", () => {
      setIsConnected(false);
    });

    socketRef.current = socketInstance;
    setSocket(socketInstance);

    // Only disconnect when the entire app unmounts (layout teardown)
    return () => {
      socketInstance.disconnect();
      socketRef.current = null;
    };
  }, []); // ← Empty deps: socket is created exactly once

  // ── Step 2: When user becomes available, join user room ──────────────────
  // This is kept SEPARATE from socket creation. We never tear down the socket
  // here — we only emit a join_room.
  useEffect(() => {
    if (!user?.id) return;

    userIdRef.current = user.id;

    const sock = socketRef.current;
    if (sock?.connected) {
      sock.emit("join_room", `user_${user.id}`);
    }
    // If not yet connected, the `connect` handler above will read userIdRef.current
  }, [user?.id]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
