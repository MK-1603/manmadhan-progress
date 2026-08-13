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

  // ── Step 1: Manage socket lifecycle based on authentication ───────────────
  useEffect(() => {
    // If not authenticated, do not connect socket
    if (!user?.id) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    userIdRef.current = user.id;

    if (socketRef.current) {
      // Re-join user room if already connected
      if (socketRef.current.connected) {
        socketRef.current.emit("join_room", `user_${user.id}`);
        const workspaceId = localStorage.getItem("workspaceId");
        if (workspaceId) {
          socketRef.current.emit("join_room", `workspace_${workspaceId}`);
        }
      }
      return;
    }

    const backendUrl = process.env.NEXT_PUBLIC_API_URL 
      ? process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/v1\/?$/, '') 
      : "http://localhost:4100";

    let SOCKET_URL = backendUrl;
    if (typeof window !== "undefined" && backendUrl.includes("localhost") && window.location.hostname !== "localhost") {
      SOCKET_URL = `http://${window.location.hostname}:${backendUrl.split(':').pop()}`;
    }

    const token = typeof window !== "undefined"
      ? localStorage.getItem("auth_token") || localStorage.getItem("token") || ""
      : "";

    const socketInstance = io(SOCKET_URL, {
      path: "/socket.io/",
      withCredentials: true,
      auth: { token },
      query: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 8,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      autoConnect: true,
    });

    socketInstance.on("connect", () => {
      setIsConnected(true);

      const workspaceId = localStorage.getItem("workspaceId");
      if (workspaceId) {
        socketInstance.emit("join_room", `workspace_${workspaceId}`);
      }
      if (userIdRef.current) {
        socketInstance.emit("join_room", `user_${userIdRef.current}`);
      }
    });

    socketInstance.on("session.revoked", () => {
      setIsConnected(false);
      socketInstance.disconnect();
      if (typeof window !== "undefined") {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = "/login?error=session_revoked";
      }
    });

    socketInstance.on("connect_error", (err) => {
      setIsConnected(false);
      if (err.message.includes("Authentication") || err.message.includes("token")) {
        // Retry silently with polling fallback if websocket fails
      }
    });

    socketInstance.on("FORCE_LOGOUT", () => {
      setIsConnected(false);
      socketInstance.disconnect();
      if (typeof window !== "undefined") {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = "/account-not-found";
      }
    });

    socketInstance.on("ACCOUNT_DELETED", () => {
      setIsConnected(false);
      socketInstance.disconnect();
      if (typeof window !== "undefined") {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = "/account-not-found";
      }
    });

    socketInstance.on("disconnect", () => {
      setIsConnected(false);
    });

    socketRef.current = socketInstance;
    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
      socketRef.current = null;
    };
  }, [user?.id]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
