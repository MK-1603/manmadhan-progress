import apiClient from "@/lib/api-client";
import {
  FULL_DEMO_DASHBOARD_DATA,
  EMPTY_DEMO_DASHBOARD_DATA,
  type DashboardDataShape,
} from "@/lib/demo/dashboard-demo-data";

export interface FetchDashboardOptions {
  workspaceId?: string | null;
  forceRefresh?: boolean;
}

/**
 * Returns true ONLY when DEMO_MODE is explicitly enabled via env variable or localStorage ('true').
 * Default is false for production real-data mode.
 */
export function isDemoModeEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return (
    process.env.NEXT_PUBLIC_DEMO_MODE === "true" ||
    localStorage.getItem("DEMO_MODE") === "true"
  );
}

export function isDemoEmptyEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return (
    process.env.NEXT_PUBLIC_DEMO_EMPTY === "true" ||
    localStorage.getItem("DEMO_EMPTY") === "true"
  );
}

export function isDemoErrorEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return (
    process.env.NEXT_PUBLIC_DEMO_ERROR === "true" ||
    localStorage.getItem("DEMO_ERROR") === "true"
  );
}

/**
 * Clean data service abstraction for fetching dashboard data.
 * Strictly fetches real backend API data during normal execution.
 */
export async function fetchDashboardData(
  options: FetchDashboardOptions = {}
): Promise<DashboardDataShape> {
  const wsId = options.workspaceId || (typeof window !== "undefined" ? localStorage.getItem("workspaceId") : null);
  const param = wsId ? `?workspaceId=${wsId}` : "";
  
  try {
    const res = await apiClient.get(`/organization/dashboard${param}`);
    if (res.data && res.data.success && res.data.data) {
      return res.data.data as DashboardDataShape;
    }
  } catch (err: any) {
    if (isDemoModeEnabled()) {
      return FULL_DEMO_DASHBOARD_DATA;
    }
    throw err;
  }

  if (isDemoModeEnabled()) {
    return FULL_DEMO_DASHBOARD_DATA;
  }

  throw new Error("Failed to fetch organization dashboard data");
}
