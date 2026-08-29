import apiClient from "@/lib/api-client";
import { logWorkspaceEvent, logPerformance } from "@/lib/api-diagnostics";

let pendingWorkspacePromise: Promise<any[]> | null = null;
let cachedWorkspaces: any[] | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 60s memory cache

export class WorkspaceService {
  /**
   * Fetches user's workspaces with single-flight request deduplication and memory caching.
   */
  static async getWorkspaces(forceRefresh = false): Promise<any[]> {
    const now = Date.now();

    // Return cached data if valid and fresh
    if (!forceRefresh && cachedWorkspaces && now - lastFetchTime < CACHE_TTL_MS) {
      logWorkspaceEvent("WORKSPACE_FETCH_SUCCESS", { source: "CACHE", count: cachedWorkspaces.length });
      return cachedWorkspaces;
    }

    // Reuse in-flight single-flight request if already fetching
    if (pendingWorkspacePromise) {
      logWorkspaceEvent("WORKSPACE_FETCH_DEDUPLICATED", { status: "IN_FLIGHT_REUSED" });
      return pendingWorkspacePromise;
    }

    logWorkspaceEvent("WORKSPACE_FETCH_STARTED", { url: "/workspaces" });
    const startTime = performance.now();

    pendingWorkspacePromise = (async (): Promise<any[]> => {
      try {
        const res = await apiClient.get("/workspaces");
        const duration = performance.now() - startTime;

        if (res.data?.success && Array.isArray(res.data?.data)) {
          const list = res.data.data;
          cachedWorkspaces = list;
          lastFetchTime = Date.now();
          logWorkspaceEvent("WORKSPACE_FETCH_SUCCESS", { count: list.length });
          logPerformance("workspace_fetch", duration);
          return list;
        }
        return [];
      } catch (err: any) {
        if (err?.code === "ERR_CANCELED") {
          logWorkspaceEvent("WORKSPACE_FETCH_CANCELLED");
        } else if (err?.code === "ECONNABORTED") {
          logWorkspaceEvent("WORKSPACE_FETCH_TIMEOUT");
        } else {
          logWorkspaceEvent("WORKSPACE_FETCH_FAILED", { error: err?.message });
        }
        throw err;
      } finally {
        pendingWorkspacePromise = null;
      }
    })();

    return pendingWorkspacePromise;
  }

  /**
   * Clear in-memory workspace cache (invoked on user logout).
   */
  static clearCache() {
    cachedWorkspaces = null;
    lastFetchTime = 0;
    pendingWorkspacePromise = null;
  }
}
