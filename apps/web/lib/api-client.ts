import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios";
import { isPublicPath } from "./public-routes";

const getBaseUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL || process.env.INTERNAL_API_URL;
  if (envUrl) {
    return envUrl.endsWith("/api/v1") ? envUrl : `${envUrl.replace(/\/$/, "")}/api/v1`;
  }
  return "http://localhost:4000/api/v1";
};

const baseURL = getBaseUrl();

const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 10000,
});

export function isJwtExpired(token: string): boolean {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return true;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const parsed = JSON.parse(jsonPayload);
    if (parsed && typeof parsed.exp === "number") {
      return Date.now() >= (parsed.exp * 1000 - 5000);
    }
    return false;
  } catch (e) {
    return true;
  }
}

export function getValidAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  const token =
    localStorage.getItem("auth_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwt") ||
    localStorage.getItem("accessToken");

  if (token && token !== "null" && token !== "undefined") {
    if (!isJwtExpired(token)) {
      return token;
    }
  }
  return null;
}

export function hasRefreshToken(): boolean {
  if (typeof window === "undefined") return false;
  const token =
    localStorage.getItem("refresh_token") ||
    localStorage.getItem("refreshToken");

  const hasCookie = document.cookie.includes("refresh_token=");
  return Boolean(token || hasCookie);
}

export function hasAuthCredentials(): boolean {
  if (typeof window === "undefined") return false;
  // Always return true on client-side so HttpOnly cookies can be validated by backend /auth/me or /auth/refresh
  const hasTokenInStorage = Boolean(
    localStorage.getItem("auth_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwt") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("refresh_token") ||
    localStorage.getItem("refreshToken")
  );
  const hasCookieInBrowser = Boolean(document.cookie && document.cookie.length > 0);
  return true;
}

// ── Single-flight request deduplication ─────────────────────────────────────
const pendingGetPromises = new Map<string, Promise<any>>();

export function getDeduplicated<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
  const cacheKey = `${config?.method || "get"}:${url}:${JSON.stringify(config?.params || {})}`;
  if (pendingGetPromises.has(cacheKey)) {
    return pendingGetPromises.get(cacheKey)!;
  }
  const promise = apiClient.get<T>(url, config).finally(() => {
    pendingGetPromises.delete(cacheKey);
  });
  pendingGetPromises.set(cacheKey, promise);
  return promise;
}

// ── Request interceptor ──────────────────────────────────────────────────────
// Attaches Bearer token from localStorage on the client side if present.
apiClient.interceptors.request.use(
  (config) => {
    (config as any)._startTime = performance.now();
    const reqId = `req_${Math.random().toString(36).substring(2, 9)}`;
    (config as any)._reqId = reqId;
    config.headers["x-request-id"] = reqId;

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

    logApiEvent("REQUEST_STARTED", { id: reqId, method: (config.method || "GET").toUpperCase(), url: config.url });
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
let refreshPromise: Promise<string | null> | null = null;

export function clearAuthStorage() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("token");
    localStorage.removeItem("auth_token");
    localStorage.removeItem("jwt");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    document.cookie = "auth_token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT;";
    document.cookie = "refresh_token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT;";
  }
}

async function attemptTokenRefresh(): Promise<string | null> {
  if (explicitLoggingOut) return null;
  try {
    const existingRefreshToken =
      typeof window !== "undefined"
        ? localStorage.getItem("refresh_token") ||
          localStorage.getItem("refreshToken")
        : undefined;

    if (process.env.NODE_ENV === "development") {
      console.log("[AUTH DIAGNOSTIC] Attempting token refresh via /auth/refresh");
    }

    const refreshRes = await axios.post(
      `${baseURL}/auth/refresh`,
      { refreshToken: existingRefreshToken },
      {
        withCredentials: true,
        headers: existingRefreshToken
          ? {
              "x-refresh-token": existingRefreshToken,
            }
          : {},
      },
    );

    const newToken: string | undefined =
      refreshRes.data?.accessToken ||
      refreshRes.data?.data?.accessToken ||
      refreshRes.data?.data?.token;

    const newRefreshToken: string | undefined =
      refreshRes.data?.refreshToken ||
      refreshRes.data?.data?.refreshToken;

    if (newToken) {
      if (typeof window !== "undefined") {
        localStorage.setItem("token", newToken);
        localStorage.setItem("auth_token", newToken);
        if (newRefreshToken) {
          localStorage.setItem("refresh_token", newRefreshToken);
          localStorage.setItem("refreshToken", newRefreshToken);
        }
        const isHttps = window.location.protocol === "https:";
        document.cookie = `auth_token=${newToken}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax${isHttps ? "; Secure" : ""}`;
      }
      if (process.env.NODE_ENV === "development") {
        console.log("[AUTH DIAGNOSTIC] Token refresh successful");
      }
      return newToken;
    }

    return null;
  } catch (err: any) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[AUTH DIAGNOSTIC] Token refresh failed:", err?.response?.data?.code || err?.message);
    }
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
import { logApiEvent, logAuthEvent } from "./api-diagnostics";

apiClient.interceptors.response.use(
  (response) => {
    const config = response.config as any;
    if (config?._isTerminal) return response;
    config._isTerminal = true;

    const duration = config?._startTime ? Math.round(performance.now() - config._startTime) : undefined;
    const reqId = config?._reqId || config?.headers?.["x-request-id"];
    const method = (config?.method || "GET").toUpperCase();

    logApiEvent("REQUEST_SUCCESS", {
      id: reqId,
      method,
      url: config?.url,
      status: response.status,
      durationMs: duration,
    });
    return response;
  },
  async (error) => {
    const originalRequest = error.config as any;
    if (originalRequest?._isTerminal) return Promise.reject(error);
    originalRequest._isTerminal = true;

    const duration = originalRequest?._startTime ? Math.round(performance.now() - originalRequest._startTime) : undefined;
    const reqId = originalRequest?._reqId || originalRequest?.headers?.["x-request-id"];
    const method = (originalRequest?.method || "GET").toUpperCase();

    // 1. Handle explicit request cancellation (e.g. unmounted component or route change)
    if (axios.isCancel(error) || error?.code === "ERR_CANCELED") {
      logApiEvent("REQUEST_CANCELLED", { id: reqId, method, url: originalRequest?.url });
      return Promise.reject(error);
    }

    // 2. Handle 403 Forbidden Permission / Account Suspended
    if (error.response?.status === 403) {
      const errCode = error.response?.data?.code || error.response?.data?.error?.code;

      if (errCode === "ACCOUNT_SUSPENDED" || errCode === "ACCOUNT_DELETED") {
        clearAuthStorage();
        if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login") && !explicitLoggingOut) {
          window.location.href = "/login?error=AccountSuspended";
        }
        return Promise.reject(new Error("Your account has been suspended or is unavailable."));
      }

      const permMsg =
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        error.response?.data?.error ||
        "You do not have permission to perform this action.";
      return Promise.reject(new Error(typeof permMsg === "string" ? permMsg : "Permission denied."));
    }

    // 3. Handle 401 Unauthorized Session Expiration
    if (error.response?.status === 401) {
      const isAuthEndpoint =
        originalRequest?.url?.includes("/auth/refresh") ||
        originalRequest?.url?.includes("/auth/login");

      if (isAuthEndpoint || originalRequest?._retry || explicitLoggingOut) {
        if (isAuthEndpoint && originalRequest?.url?.includes("/auth/refresh")) {
          logAuthEvent("AUTH_REFRESH_PERMANENT_FAILURE", { id: reqId, status: 401 });
          if (error.response?.status === 401) {
            clearAuthStorage();
          }
        }
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      if (!refreshPromise) {
        logAuthEvent("AUTH_REFRESH_STARTED", { id: reqId });
        refreshPromise = attemptTokenRefresh().finally(() => {
          refreshPromise = null;
        });
      }

      const newToken = await refreshPromise;

      if (newToken) {
        logAuthEvent("AUTH_REFRESH_SUCCESS", { id: reqId });
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        // Reset terminal flag for retry attempt
        originalRequest._isTerminal = false;
        return apiClient(originalRequest);
      }

      const isGitHubEndpoint = originalRequest?.url?.includes("/github");
      if (isGitHubEndpoint) {
        return Promise.reject(new Error("GitHub integration request failed. Please check your GitHub connection."));
      }

      const isNetworkError = !error.response || error.code === "ECONNREFUSED" || error.code === "ERR_NETWORK" || error.code === "ECONNABORTED";
      const isServerError = error.response && error.response.status >= 500;

      if (isNetworkError || isServerError) {
        logAuthEvent("AUTH_REFRESH_TEMPORARY_FAILURE", { id: reqId, message: error.message });
        return Promise.reject(error);
      }

      logAuthEvent("AUTH_SESSION_INVALIDATED", { id: reqId, url: originalRequest?.url });
      clearAuthStorage();
      if (typeof window !== "undefined" && !explicitLoggingOut) {
        const isPublicPage = isPublicPath(window.location.pathname);
        if (!isPublicPage) {
          window.location.href = "/login";
        }
      }
      return Promise.reject(new Error("Session expired. Please sign in again."));
    }

    // 4. Handle ECONNABORTED Request Timeout / Cancellation
    if (error.code === "ECONNABORTED") {
      logApiEvent("REQUEST_TIMEOUT", { id: reqId, method, url: originalRequest?.url, durationMs: duration, timeout: 10000 });
      return Promise.reject(new Error(`Request timeout on ${originalRequest?.url || "server request"}`));
    }

    // 5. Network / Connection errors — DO NOT LOG OUT USER
    if (!error.response || error.code === "ECONNREFUSED" || error.code === "ERR_CONNECTION_REFUSED" || error.code === "ERR_NETWORK") {
      logApiEvent("NETWORK_ERROR", { id: reqId, method, url: originalRequest?.url, code: error.code || error.message, state: "BACKEND_UNAVAILABLE" });
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
