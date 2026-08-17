"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/components/auth/auth-context";
import { resetGlobalSheetState } from "@/components/ui/global-sheet";
import { isExplicitLoggingOut, clearAuthStorage } from "@/lib/api-client";

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
 * Strips /api/v1 suffix from NEXT_PUBLIC_API_URL to get the socket origin.
 */
function resolveSocketUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4100";
  return apiUrl.replace(/\/api\/v1\/?$/, "").replace(/\/+$/, "");
}

/**
 * Reads the current auth token from localStorage.
 * Returns empty string if not available (SSR or missing).
 */
function readStoredToken(): string {
  if (typeof window === "undefined") return "";
  return (
    localStorage.getItem("auth_token") ||
    localStorage.getItem("token") ||
    ""
  );
}

/**
 * Attempts a token refresh via the backend /auth/refresh endpoint.
 * Returns the new token string on success, null on failure.
 *
 * Uses a plain fetch so there is no dependency on the axios interceptor
 * (which would itself trigger another socket reconnect cycle).
 */
async function refreshAccessToken(): Promise<string | null> {
  try {
    const apiBase = `${resolveSocketUrl()}/api/v1`;

    const res = await fetch(`${apiBase}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });

    if (!res.ok) return null;

    const data = await res.json();
    const token: string | undefined =
      data?.accessToken || data?.data?.accessToken || data?.data?.token;

    if (token) {
      localStorage.setItem("auth_token", token);
      localStorage.setItem("token", token);
      return token;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * SocketProvider — stable single-instance socket lifecycle.
 *
 * Design rules:
 *  1. Socket is created ONCE per authenticated user session.
 *  2. When the token is expired the socket is NOT reconnected with the same
 *     stale token. Instead we attempt a token refresh first. If refresh
 *     succeeds we reconnect once with the new token. If refresh fails we
 *     disconnect permanently and let the HTTP layer redirect to /login.
 *  3. Room joins (join_room) are managed separately from the connection.
 *  4. No duplicate sockets are created during route changes.
 */
export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const socketRef = useRef<Socket | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Track whether we already attempted a refresh for this socket lifecycle
  const refreshAttemptedRef = useRef(false);
  // Track current userId to detect user changes
  const userIdRef = useRef<string | null>(null);

  const { user } = useAuth();

  const joinRooms = useCallback(
    (sock: Socket) => {
      if (!sock.connected) return;
      const workspaceId = localStorage.getItem("workspaceId");
      if (workspaceId && workspaceId !== "undefined" && workspaceId !== "null") {
        sock.emit("join_room", `workspace_${workspaceId}`);
      }
      if (userIdRef.current) {
        sock.emit("join_room", `user_${userIdRef.current}`);
      }
    },
    [],
  );

  const destroySocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setSocket(null);
    setIsConnected(false);
    refreshAttemptedRef.current = false;
  }, []);

  useEffect(() => {
    // ── Not authenticated ──────────────────────────────────────────────────
    if (!user?.id) {
      destroySocket();
      userIdRef.current = null;
      return;
    }

    // ── User changed (e.g. account switch) — recreate socket ──────────────
    if (userIdRef.current && userIdRef.current !== user.id) {
      destroySocket();
    }

    userIdRef.current = user.id;

    // ── Socket already alive — just rejoin rooms ───────────────────────────
    if (socketRef.current) {
      if (socketRef.current.connected) {
        joinRooms(socketRef.current);
      }
      return;
    }

    // ── Create a new socket ────────────────────────────────────────────────
    const SOCKET_URL = resolveSocketUrl();
    const token = readStoredToken();

    if (!token || !token.trim()) {
      // Do NOT attempt socket connection with an empty token
      return;
    }

    const socketInstance = io(SOCKET_URL, {
      path: "/socket.io/",
      withCredentials: true,
      auth: { token },
      query: { token },
      transports: ["polling", "websocket"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      autoConnect: true,
    });

    // ── connect ────────────────────────────────────────────────────────────
    socketInstance.on("connect", () => {
      refreshAttemptedRef.current = false; // reset on successful connect
      setIsConnected(true);
      joinRooms(socketInstance);
    });

    // ── disconnect ────────────────────────────────────────────────────────
    socketInstance.on("disconnect", (_reason) => {
      setIsConnected(false);
    });

    // ── connect_error — handle authentication failures ────────────────────
    socketInstance.on("connect_error", async (err) => {
      setIsConnected(false);

      const isAuthError =
        err.message?.toLowerCase().includes("authentication") ||
        err.message?.toLowerCase().includes("jwt") ||
        err.message?.toLowerCase().includes("expired") ||
        err.message?.toLowerCase().includes("token");

      if (isAuthError && !refreshAttemptedRef.current) {
        // Try to refresh the token exactly once per socket lifecycle
        refreshAttemptedRef.current = true;
        socketInstance.io.opts.reconnection = false; // pause auto-reconnect

        const newToken = await refreshAccessToken();

        if (newToken) {
          // Update auth credentials and reconnect once with the new token
          socketInstance.auth = { token: newToken };
          (socketInstance.io.opts as any).query = { token: newToken };
          socketInstance.io.opts.reconnection = true;
          socketInstance.io.opts.reconnectionAttempts = 3;
          socketInstance.connect();
        } else {
          // Refresh failed — session is dead, clean up and redirect
          destroySocket();
          if (typeof window !== "undefined") {
            localStorage.removeItem("auth_token");
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            if (!window.location.pathname.startsWith("/login") && !isExplicitLoggingOut()) {
              window.location.href = "/login";
            }
          }
        }
        return;
      }

      // Non-auth error or already retried — leave reconnection to Socket.IO
    });

    // ── Server-initiated session invalidation ─────────────────────────────
    const handleForceLogout = () => {
      resetGlobalSheetState();
      destroySocket();
      clearAuthStorage();
      if (typeof window !== "undefined") {
        window.location.href = "/login?error=session_revoked";
      }
    };

    socketInstance.on("session.revoked", handleForceLogout);
    socketInstance.on("FORCE_LOGOUT", handleForceLogout);
    socketInstance.on("ACCOUNT_DELETED", () => {
      destroySocket();
      clearAuthStorage();
      if (typeof window !== "undefined") {
        window.location.href = "/account-not-found";
      }
    });

    socketRef.current = socketInstance;
    setSocket(socketInstance);

    return () => {
      destroySocket();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
