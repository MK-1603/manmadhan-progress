import axios from "axios";

const isServer = typeof window === "undefined";

// CLIENT: Always use relative /api/v1 so Vercel proxies to backend — cookies stay same-domain.
// SERVER (SSR): Must use the full backend URL since relative paths don't work server-side.
const baseURL = isServer
  ? (process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4100/api/v1")
  : "/api/v1";

const apiClient = axios.create({
  baseURL,
  withCredentials: true,
});

// Request interceptor to attach Bearer Token from localStorage
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
  (error) => Promise.reject(error)
);

let isRefreshing = false;

// Response interceptor for handling token refresh and fallback errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      if (
        !originalRequest ||
        originalRequest._retry ||
        isRefreshing ||
        originalRequest.url?.includes("/auth/me") ||
        originalRequest.url?.includes("/auth/refresh") ||
        originalRequest.url?.includes("/auth/login")
      ) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("token");
          localStorage.removeItem("auth_token");
          localStorage.removeItem("user");
        }
        return Promise.reject(error);
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshRes = await axios.post(
          `${baseURL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        isRefreshing = false;
        if (refreshRes.data?.data?.accessToken || refreshRes.data?.data?.token) {
          const newToken = refreshRes.data.data.accessToken || refreshRes.data.data.token;
          localStorage.setItem("token", newToken);
          localStorage.setItem("auth_token", newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        isRefreshing = false;
        if (typeof window !== "undefined") {
          localStorage.removeItem("token");
          localStorage.removeItem("auth_token");
          localStorage.removeItem("user");
          if (!window.location.pathname.startsWith("/login") && !originalRequest?.url?.includes("/auth/me")) {
            window.location.href = "/login?error=SessionExpired";
          }
        }
        return Promise.reject(new Error("Session expired. Please sign in again."));
      }
    }

    // Handle Network Connection Errors gracefully
    if (!error.response || error.code === "ECONNREFUSED" || error.code === "ERR_NETWORK") {
      console.warn("API Connection Notice: Backend request failed via baseURL", baseURL);
      return Promise.reject(new Error("Unable to connect to the ManMadhan Progress server. Please ensure the backend server is running."));
    }

    return Promise.reject(error);
  }
);

export default apiClient;
