"use client";

import { useEffect, useRef } from "react";
import { useReportWebVitals } from "next/web-vitals";

/**
 * Defensive Web Vitals & Performance Observer Safety Guard.
 * Ensures all Web Vitals telemetry events and PerformanceObserver callbacks
 * process metric entries defensively without throwing Uncaught TypeErrors.
 */
export function WebVitalsGuard() {
  const initializedRef = useRef(false);

  // 1. Next.js App Router Web Vitals Reporting
  useReportWebVitals((metric: any) => {
    try {
      if (!metric || !metric.name) return;

      // Defensive entry inspection (prevent reading 'startTime' of undefined entry)
      const entries = metric.entries;
      if (Array.isArray(entries) && entries.length > 0) {
        const firstEntry = entries[0];
        if (!firstEntry || typeof firstEntry.startTime !== "number") {
          return;
        }
      }
    } catch {
      // Telemetry processing must NEVER crash application or affect business logic
    }
  });

  // 2. Global Runtime Safety Guard for requestIdleCallback & Injected Performance Monitors
  useEffect(() => {
    if (typeof window === "undefined" || initializedRef.current) return;
    initializedRef.current = true;

    try {
      // Guard PerformanceObserver if available
      if (typeof window.PerformanceObserver !== "undefined") {
        const origObserve = window.PerformanceObserver.prototype.observe;
        window.PerformanceObserver.prototype.observe = function (options?: PerformanceObserverInit) {
          try {
            return origObserve.call(this, options);
          } catch {
            // Prevent invalid PerformanceObserver options from crashing
          }
        };
      }

      // Safe requestIdleCallback wrapper against injected extension scripts (VMxx)
      if (typeof window.requestIdleCallback === "function") {
        const origRequestIdleCallback = window.requestIdleCallback;
        window.requestIdleCallback = function (callback: IdleRequestCallback, options?: IdleRequestOptions) {
          return origRequestIdleCallback.call(window, (deadline: IdleDeadline) => {
            try {
              callback(deadline);
            } catch (err: any) {
              // Silently absorb injected telemetry errors (e.g., reportAllChanges reading undefined startTime)
              if (
                err?.message?.includes("startTime") ||
                err?.message?.includes("reportAllChanges")
              ) {
                return;
              }
              console.warn("Idle callback exception suppressed:", err?.message);
            }
          }, options);
        };
      }
    } catch {
      // Safety setup failure must never break app
    }
  }, []);

  return null;
}
