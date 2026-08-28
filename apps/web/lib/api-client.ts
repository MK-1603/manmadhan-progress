import axios from "axios";
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
  const hasTokenInStorage = Boolean(
    localStorage.getItem("auth_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwt") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("refresh_token") ||
    localStorage.getItem("refreshToken")
  );
  const hasCookieInBrowser = document.cookie.includes("auth_token=") || document.cookie.includes("refresh_token=");
  return hasTokenInStorage || hasCookieInBrowser;
}

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
  if (explicitLoggingOut || !hasAuthCredentials()) return null;
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

      const permMsg =
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        error.response?.data?.error ||
        "You do not have permission to perform this action.";
      return Promise.reject(new Error(typeof permMsg === "string" ? permMsg : "Permission denied."));
    }

    // Handle 401 Unauthorized Session Expiration
    if (error.response?.status === 401) {

      // Never retry refresh or login endpoints to avoid infinite loops
      const isAuthEndpoint =
        originalRequest?.url?.includes("/auth/refresh") ||
        originalRequest?.url?.includes("/auth/login");

      if (isAuthEndpoint || originalRequest?._retry || explicitLoggingOut) {
        if (isAuthEndpoint && originalRequest?.url?.includes("/auth/refresh")) {
          if (process.env.NODE_ENV === "development") {
            console.warn("[AUTH DIAGNOSTIC] Refresh endpoint returned 401. Session expired.");
          }
          clearAuthStorage();
        }
        return Promise.reject(error);
      }

      // Mark this request so it won't retry infinitely
      originalRequest._retry = true;

      // Deduplicate: if a refresh is already in-flight, wait for shared promise lock
      if (!refreshPromise) {
        refreshPromise = attemptTokenRefresh().finally(() => {
          refreshPromise = null;
        });
      }

      const newToken = await refreshPromise;

      if (newToken) {
        // Retry original request with fresh access token
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      }

      // Do NOT logout user if the failed endpoint is GitHub integration
      const isGitHubEndpoint = originalRequest?.url?.includes("/github");
      if (isGitHubEndpoint) {
        return Promise.reject(new Error("GitHub integration request failed. Please check your GitHub connection."));
      }

      // Token refresh genuinely failed — clear session and redirect ONLY if on protected route
      if (process.env.NODE_ENV === "development") {
        console.warn(`[AUTH DIAGNOSTIC] 401 on ${originalRequest?.url} and refresh failed. Redirecting to /login.`);
      }
      clearAuthStorage();
      if (
        typeof window !== "undefined" &&
        !explicitLoggingOut
      ) {
        const isPublicPage = isPublicPath(window.location.pathname);
        if (!isPublicPage) {
          window.location.href = "/login";
        }
      }
      return Promise.reject(new Error("Session expired. Please sign in again."));
    }

    // Network / connection errors — DO NOT LOG OUT USER
    if (!error.response || error.code === "ECONNREFUSED" || error.code === "ERR_NETWORK") {
      if (process.env.NODE_ENV === "development") {
        console.warn(`[AUTH DIAGNOSTIC] Connection error on ${originalRequest?.url}:`, error.code || error.message);
      }
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
