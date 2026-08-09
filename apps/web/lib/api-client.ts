import axios from "axios";

const isServer = typeof window === "undefined";
const baseURL = isServer 
  ? (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1"|| "http://localhost:3000/api/v1") 
  : "/api/v1";

const apiClient = axios.create({
  baseURL,
  withCredentials: true, // Important for cookies
});

// Response interceptor for handling token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 Unauthorized and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Attempt to refresh token
        await axios.post(
          `${baseURL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        // If successful, retry the original request
        return apiClient(originalRequest);
      } catch (refreshError) {
        // If refresh fails, redirect to login (only if not already there to prevent infinite loops)
        // DO NOT redirect if this was just a background session check, otherwise public pages will break
        if (typeof window !== 'undefined' && !originalRequest.url?.includes('/auth/me')) {
          if (!window.location.pathname.startsWith('/login')) {
            window.location.href = '/login?error=SessionExpired';
          }
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
