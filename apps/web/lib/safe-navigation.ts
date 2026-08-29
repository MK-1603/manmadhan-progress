import { logDiagnostic } from "./api-diagnostics";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

let inFlightTarget: string | null = null;
let inFlightTimer: NodeJS.Timeout | null = null;

export class SafeNavigation {
  /**
   * Performs an idempotent, single-flight navigation call to prevent Next.js Router action race conditions.
   */
  static navigate(
    router: AppRouterInstance,
    targetUrl: string,
    mode: "push" | "replace" = "push"
  ): boolean {
    if (typeof window === "undefined") return false;

    const currentPath = window.location.pathname + window.location.search;

    // 1. Idempotency check: skip navigation if already on the target URL
    if (currentPath === targetUrl || window.location.pathname === targetUrl) {
      logDiagnostic("ROUTER", "ROUTER_NAVIGATION_SKIPPED", {
        reason: "ALREADY_ON_ROUTE",
        current: currentPath,
        target: targetUrl,
      });
      return false;
    }

    // 2. Single-flight mutex check: skip if identical navigation is already in flight
    if (inFlightTarget === targetUrl) {
      logDiagnostic("ROUTER", "ROUTER_NAVIGATION_DUPLICATE", { target: targetUrl });
      return false;
    }

    // 3. Mark navigation in flight
    inFlightTarget = targetUrl;
    if (inFlightTimer) clearTimeout(inFlightTimer);
    inFlightTimer = setTimeout(() => {
      inFlightTarget = null;
    }, 1000);

    logDiagnostic("ROUTER", "ROUTER_NAVIGATION_REQUESTED", { mode, target: targetUrl });

    try {
      if (mode === "replace") {
        router.replace(targetUrl);
      } else {
        router.push(targetUrl);
      }
      logDiagnostic("ROUTER", "ROUTER_NAVIGATION_COMPLETED", { target: targetUrl });
      return true;
    } catch (err: any) {
      logDiagnostic("ROUTER", "ROUTER_NAVIGATION_FAILED", { error: err?.message, target: targetUrl });
      inFlightTarget = null;
      return false;
    }
  }

  static push(router: AppRouterInstance, targetUrl: string): boolean {
    return this.navigate(router, targetUrl, "push");
  }

  static replace(router: AppRouterInstance, targetUrl: string): boolean {
    return this.navigate(router, targetUrl, "replace");
  }
}
