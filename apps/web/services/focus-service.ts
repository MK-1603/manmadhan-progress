import apiClient from "@/lib/api-client";
import { logDiagnostic, logPerformance } from "@/lib/api-diagnostics";

const inFlightPromises: Map<string, Promise<any>> = new Map();
const cache: Map<string, { data: any; timestamp: number }> = new Map();
const CACHE_TTL_MS = 10 * 1000; // 10s memory cache for focus queries

export class FocusService {
  private static async fetchWithDeduplication<T>(
    endpoint: string,
    params?: Record<string, any>,
    forceRefresh = false
  ): Promise<T> {
    const key = `${endpoint}:${JSON.stringify(params || {})}`;
    const now = Date.now();

    if (!forceRefresh && cache.has(key)) {
      const cached = cache.get(key)!;
      if (now - cached.timestamp < CACHE_TTL_MS) {
        logDiagnostic("API", "FOCUS_FETCH_CACHE", { endpoint });
        return cached.data;
      }
    }

    if (inFlightPromises.has(key)) {
      logDiagnostic("API", "FOCUS_FETCH_DEDUPLICATED", { endpoint });
      return inFlightPromises.get(key)!;
    }

    logDiagnostic("API", "FOCUS_FETCH_STARTED", { endpoint });
    const startTime = performance.now();

    const promise = (async (): Promise<T> => {
      try {
        const res = await apiClient.get(endpoint, { params });
        const duration = performance.now() - startTime;
        logDiagnostic("API", "FOCUS_FETCH_SUCCESS", { endpoint, durationMs: Math.round(duration) });
        logPerformance(`focus_${endpoint}`, duration);

        const data = res.data?.data ?? res.data;
        cache.set(key, { data, timestamp: Date.now() });
        return data;
      } catch (err: any) {
        logDiagnostic("API", "FOCUS_FETCH_FAILED", { endpoint, error: err?.message });
        throw err;
      } finally {
        inFlightPromises.delete(key);
      }
    })();

    inFlightPromises.set(key, promise);
    return promise;
  }

  static getActiveSession(workspaceId?: string, forceRefresh = false) {
    return this.fetchWithDeduplication("/org/focus/active", { workspaceId }, forceRefresh);
  }

  static getOverview(workspaceId?: string, forceRefresh = false) {
    return this.fetchWithDeduplication("/org/focus/overview", { workspaceId }, forceRefresh);
  }

  static getPriorities(workspaceId?: string, forceRefresh = false) {
    return this.fetchWithDeduplication("/org/focus/priorities", { workspaceId }, forceRefresh);
  }

  static getHistory(workspaceId?: string, limit = 20, forceRefresh = false) {
    return this.fetchWithDeduplication("/org/focus/history", { workspaceId, limit }, forceRefresh);
  }

  static getWeekly(workspaceId?: string, weekOffset = 0, forceRefresh = false) {
    return this.fetchWithDeduplication("/org/focus/weekly", { workspaceId, weekOffset }, forceRefresh);
  }

  static getWorkingHoursStatus(workspaceId?: string, forceRefresh = false) {
    return this.fetchWithDeduplication("/org/working-hours/status", { workspaceId }, forceRefresh);
  }

  static clearCache() {
    cache.clear();
    inFlightPromises.clear();
  }
}
