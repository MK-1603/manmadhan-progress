import axios from "axios";

const isServer = typeof window === "undefined";
const baseURL = isServer
  ? (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4100/api/v1")
  : (process.env.NEXT_PUBLIC_API_URL || "/api/v1");

const apiClient = axios.create({
  baseURL,
  withCredentials: true, // Important for cookies & cross-origin authentication
});

// Request interceptor to attach Bearer Token from localStorage
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      if (token && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for handling token refresh and fallback errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 Unauthorized and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        await axios.post(
          `${baseURL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        return apiClient(originalRequest);
      } catch (refreshError) {
        if (typeof window !== "undefined" && !originalRequest.url?.includes("/auth/me")) {
          if (!window.location.pathname.startsWith("/login")) {
            window.location.href = "/login?error=SessionExpired";
          }
        }
        return Promise.reject(refreshError);
      }
    }

    // Handle Network Connection Errors gracefully
    if (!error.response || error.code === "ECONNREFUSED" || error.code === "ERR_NETWORK") {
      console.warn("API Connection Notice: Backend request failed via baseURL", baseURL);
      return Promise.reject(new Error("Unable to connect to the ManMadhan Progress server. Please ensure the backend on port 4100 is running."));
    }

    return Promise.reject(error);
  }
);

export default apiClient;
