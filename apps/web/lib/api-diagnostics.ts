/**
 * Structured Frontend Diagnostic Logger for ManMadhan Progress.
 * Provides clean, categorized development diagnostics without logging sensitive headers, tokens, or credentials.
 */

export type DiagnosticCategory = "AUTH" | "API" | "WORKSPACE" | "ROUTER" | "PWA" | "PERFORMANCE";

export function logDiagnostic(
  category: DiagnosticCategory,
  event: string,
  details?: Record<string, any>
) {
  if (process.env.NODE_ENV !== "development") return;

  const detailStr = details
    ? Object.entries(details)
        .map(([k, v]) => `${k}=${typeof v === "object" ? JSON.stringify(v) : v}`)
        .join(" ")
    : "";

  console.log(`[${category}] ${event}${detailStr ? ` ${detailStr}` : ""}`);
}

export function logApiEvent(
  event:
    | "REQUEST_STARTED"
    | "REQUEST_SUCCESS"
    | "REQUEST_TIMEOUT"
    | "REQUEST_CANCELLED"
    | "NETWORK_ERROR"
    | "SERVER_ERROR"
    | "AUTH_ERROR",
  details?: Record<string, any>
) {
  logDiagnostic("API", event, details);
}

export function logAuthEvent(
  event:
    | "AUTH_SESSION_CHECK_STARTED"
    | "AUTH_SESSION_CHECK_SUCCESS"
    | "AUTH_SESSION_CHECK_FAILED"
    | "AUTH_REFRESH_STARTED"
    | "AUTH_REFRESH_SUCCESS"
    | "AUTH_REFRESH_TEMPORARY_FAILURE"
    | "AUTH_REFRESH_PERMANENT_FAILURE"
    | "AUTH_LOGOUT_STARTED"
    | "AUTH_LOGOUT_SUCCESS"
    | "AUTH_SESSION_INVALIDATED",
  details?: Record<string, any>
) {
  logDiagnostic("AUTH", event, details);
}

export function logWorkspaceEvent(
  event:
    | "WORKSPACE_FETCH_STARTED"
    | "WORKSPACE_FETCH_DEDUPLICATED"
    | "WORKSPACE_FETCH_SUCCESS"
    | "WORKSPACE_FETCH_CANCELLED"
    | "WORKSPACE_FETCH_TIMEOUT"
    | "WORKSPACE_FETCH_FAILED",
  details?: Record<string, any>
) {
  logDiagnostic("WORKSPACE", event, details);
}

export function logPerformance(metricName: string, durationMs: number) {
  logDiagnostic("PERFORMANCE", `${metricName}=${Math.round(durationMs)}ms`);
}
