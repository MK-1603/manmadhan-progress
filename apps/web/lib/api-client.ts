import axios from "axios";

const getBaseUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL || process.env.INTERNAL_API_URL;
  if (envUrl) {
    return envUrl.endsWith("/api/v1") ? envUrl : `${envUrl.replace(/\/$/, "")}/api/v1`;
  }
  return "http://localhost:4100/api/v1";
};

const baseURL = getBaseUrl();

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

// ── Explicit Logout State ──────────────────────────────────────────────────
let explicitLoggingOut = false;

export function setIsExplicitLoggingOut(status: boolean) {
  explicitLoggingOut = status;
}

export function isExplicitLoggingOut() {
  return explicitLoggingOut;
}

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
    document.cookie = "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;";
  }
}

async function attemptTokenRefresh(): Promise<string | null> {
  if (explicitLoggingOut) return null;
  try {
    const existingToken =
      typeof window !== "undefined"
        ? localStorage.getItem("auth_token") ||
          localStorage.getItem("token") ||
          localStorage.getItem("jwt")
        : undefined;

    const refreshRes = await axios.post(
      `${baseURL}/auth/refresh`,
      { refreshToken: existingToken },
      {
        withCredentials: true,
        headers: existingToken
          ? {
              Authorization: `Bearer ${existingToken}`,
              "x-refresh-token": existingToken,
            }
          : {},
      },
    );

    const newToken: string | undefined =
      refreshRes.data?.accessToken ||
      refreshRes.data?.data?.accessToken ||
      refreshRes.data?.data?.token;

    if (newToken) {
      if (typeof window !== "undefined") {
        localStorage.setItem("token", newToken);
        localStorage.setItem("auth_token", newToken);
        const isHttps = window.location.protocol === "https:";
        document.cookie = `auth_token=${newToken}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax${isHttps ? "; Secure" : ""}`;
      }
      return newToken;
    }

    return null;
  } catch (err: any) {
    const errCode = err.response?.data?.code;
    if (errCode === "ACCOUNT_SUSPENDED" || errCode === "ACCOUNT_DELETED") {
      clearAuthStorage();
      if (typeof window !== "undefined" && !explicitLoggingOut) {
        window.location.href = "/login?error=AccountSuspended";
      }
    }
    return null;
  }
}

// ── Response interceptor ─────────────────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 403 Forbidden Permission / Account Suspended
    if (error.response?.status === 403) {
      const errCode = error.response?.data?.code || error.response?.data?.error?.code;

      if (errCode === "ACCOUNT_SUSPENDED" || errCode === "ACCOUNT_DELETED") {
        clearAuthStorage();
        if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login") && !explicitLoggingOut) {
          window.location.href = "/login?error=AccountSuspended";
        }
        return Promise.reject(new Error("Your account has been suspended or is unavailable."));
      }

      // General 403 Permission Denied — return clean error message without forcing logout
      const permMsg =
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        error.response?.data?.error ||
        "You do not have permission to perform this action.";
      return Promise.reject(new Error(typeof permMsg === "string" ? permMsg : "Permission denied."));
    }

    // Handle 401 Unauthorized Session Expiration
    if (error.response?.status === 401) {

      // Never retry refresh/login/me endpoints to avoid infinite loops
      const isAuthEndpoint =
        originalRequest?.url?.includes("/auth/me") ||
        originalRequest?.url?.includes("/auth/refresh") ||
        originalRequest?.url?.includes("/auth/login");

      if (isAuthEndpoint || originalRequest?._retry || explicitLoggingOut) {
        if (isAuthEndpoint && originalRequest?.url?.includes("/auth/me")) {
          // Silent non-authenticated response for initial auth check
          return Promise.reject(error);
        }
        clearAuthStorage();
        return Promise.reject(error);
      }

      // Mark this request so it won't retry again
      originalRequest._retry = true;

      // Deduplicate: if a refresh is already in-flight, wait for shared promise lock
      if (!refreshPromise) {
        refreshPromise = attemptTokenRefresh().finally(() => {
          refreshPromise = null;
        });
      }

      const newToken = await refreshPromise;

      if (newToken) {
        // Retry the original request ONCE with the fresh token
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      }

      // Refresh failed — clear session and redirect to login
      clearAuthStorage();
      if (
        typeof window !== "undefined" &&
        !window.location.pathname.startsWith("/login") &&
        !explicitLoggingOut
      ) {
        window.location.href = "/login";
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
