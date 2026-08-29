import apiClient from "@/lib/api-client";
import { logDiagnostic, logPerformance } from "@/lib/api-diagnostics";

let pendingNotificationPromise: Promise<any[]> | null = null;
let cachedNotifications: any[] | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 15 * 1000; // 15s memory cache for notifications

export class NotificationService {
  /**
   * Fetches user's notifications with single-flight request deduplication and memory caching.
   */
  static async getNotifications(forceRefresh = false): Promise<any[]> {
    const now = Date.now();

    if (!forceRefresh && cachedNotifications && now - lastFetchTime < CACHE_TTL_MS) {
      logDiagnostic("API", "NOTIFICATION_FETCH_CACHE", { count: cachedNotifications.length });
      return cachedNotifications;
    }

    if (pendingNotificationPromise) {
      logDiagnostic("API", "NOTIFICATION_FETCH_DEDUPLICATED", { status: "IN_FLIGHT_REUSED" });
      return pendingNotificationPromise;
    }

    logDiagnostic("API", "NOTIFICATION_FETCH_STARTED", { url: "/notifications" });
    const startTime = performance.now();

    pendingNotificationPromise = (async (): Promise<any[]> => {
      try {
        const res = await apiClient.get("/notifications");
        const duration = performance.now() - startTime;

        if (res.data?.success && Array.isArray(res.data?.data)) {
          const list = res.data.data;
          cachedNotifications = list;
          lastFetchTime = Date.now();
          logDiagnostic("API", "NOTIFICATION_FETCH_SUCCESS", { count: list.length });
          logPerformance("notification_fetch", duration);
          return list;
        }
        return [];
      } catch (err: any) {
        logDiagnostic("API", "NOTIFICATION_FETCH_FAILED", { error: err?.message });
        throw err;
      } finally {
        pendingNotificationPromise = null;
      }
    })();

    return pendingNotificationPromise;
  }

  static clearCache() {
    cachedNotifications = null;
    lastFetchTime = 0;
    pendingNotificationPromise = null;
  }
}
