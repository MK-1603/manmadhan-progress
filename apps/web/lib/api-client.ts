import axios from "axios";

const isServer = typeof window === "undefined";

// CLIENT: Use relative /api/v1 so Vercel proxies to backend — cookies stay same-domain.
// SERVER (SSR): Must use the full backend URL since relative paths don't work server-side.
const baseURL = isServer
  ? (process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4100/api/v1")
  : "/api/v1";

const apiClient = axios.create({
  baseURL,
  withCredentials: true,
});

// ── Request interceptor ──────────────────────────────────────────────────────
// Attaches Bearer token from localStorage on the client side.
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token =
        localStorage.getItem("auth_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("jwt") ||
        localStorage.getItem("accessToken");
      if (token && token !== "null" && token !== "undefined" && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Token refresh state ──────────────────────────────────────────────────────
// A single in-flight refresh promise is shared across all concurrent 401s so
// we only make one refresh request even when multiple requests expire at once.
let refreshPromise: Promise<string | null> | null = null;

function clearAuthStorage() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("token");
    localStorage.removeItem("auth_token");
    localStorage.removeItem("jwt");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
  }
}

async function attemptTokenRefresh(): Promise<string | null> {
  try {
    // Use a plain axios instance (no interceptors) to avoid recursive loops.
    const refreshRes = await axios.post(
      `${baseURL}/auth/refresh`,
      {},
      { withCredentials: true },
    );

    // Backend returns: { success: true, accessToken: "..." }
    const newToken: string | undefined =
      refreshRes.data?.accessToken ||
      refreshRes.data?.data?.accessToken ||
      refreshRes.data?.data?.token;

    if (newToken) {
      localStorage.setItem("token", newToken);
      localStorage.setItem("auth_token", newToken);
      return newToken;
    }

    return null;
  } catch {
    return null;
  }
}

// ── Response interceptor ─────────────────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only handle 401 Unauthorized
    if (error.response?.status === 401) {
      // Never retry refresh/login/me endpoints to avoid infinite loops
      const isAuthEndpoint =
        originalRequest?.url?.includes("/auth/me") ||
        originalRequest?.url?.includes("/auth/refresh") ||
        originalRequest?.url?.includes("/auth/login");

      if (isAuthEndpoint || originalRequest?._retry) {
        clearAuthStorage();
        return Promise.reject(error);
      }

      // Mark this request so it won't retry again
      originalRequest._retry = true;

      // Deduplicate: if a refresh is already in-flight, wait for it
      if (!refreshPromise) {
        refreshPromise = attemptTokenRefresh().finally(() => {
          refreshPromise = null;
        });
      }

      const newToken = await refreshPromise;

      if (newToken) {
        // Retry the original request with the fresh token
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      }

      // Refresh failed — clear session and redirect to login
      clearAuthStorage();
      if (
        typeof window !== "undefined" &&
        !window.location.pathname.startsWith("/login")
      ) {
        window.location.href = "/login?error=SessionExpired";
      }
      return Promise.reject(new Error("Session expired. Please sign in again."));
    }

    // Network / connection errors
    if (!error.response || error.code === "ECONNREFUSED" || error.code === "ERR_NETWORK") {
      return Promise.reject(
        new Error(
          "Unable to connect to the ManMadhan Progress server. Please ensure the backend is running.",
        ),
      );
    }

    return Promise.reject(error);
  },
);

export default apiClient;
