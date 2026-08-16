"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDown, Loader2, Check } from "lucide-react";

export type PullToRefreshProps = {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  threshold?: number;
};

export function PullToRefresh({
  onRefresh,
  children,
  className = "",
  disabled = false,
  threshold = 64,
}: PullToRefreshProps) {
  const [pullState, setPullState] = useState<"idle" | "pulling" | "canRelease" | "refreshing" | "success" | "error">("idle");
  const [pullDistance, setPullDistance] = useState(0);

  const startYRef = useRef(0);
  const isPullingRef = useRef(false);
  const isRefreshingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const getScrollTop = useCallback(() => {
    if (typeof window === "undefined") return 0;
    if (containerRef.current && containerRef.current.scrollTop > 0) {
      return containerRef.current.scrollTop;
    }
    return window.scrollY || document.documentElement.scrollTop || 0;
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshingRef.current) return;
    if (getScrollTop() > 2) return; // Only allow when strictly at top

    startYRef.current = e.touches[0].clientY;
    isPullingRef.current = true;
  }, [disabled, getScrollTop]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPullingRef.current || disabled || isRefreshingRef.current) return;

    if (getScrollTop() > 2) {
      isPullingRef.current = false;
      setPullDistance(0);
      setPullState("idle");
      return;
    }

    const currentY = e.touches[0].clientY;
    const deltaY = currentY - startYRef.current;

    if (deltaY > 0) {
      // Rubber-band damping formula for native mobile touch feel
      const distance = Math.min(threshold * 1.5, deltaY * 0.45);
      setPullDistance(distance);

      if (distance >= threshold) {
        setPullState("canRelease");
      } else {
        setPullState("pulling");
      }
    } else {
      setPullDistance(0);
      setPullState("idle");
    }
  }, [disabled, getScrollTop, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPullingRef.current || disabled) return;
    isPullingRef.current = false;

    if (pullDistance >= threshold && !isRefreshingRef.current) {
      isRefreshingRef.current = true;
      setPullState("refreshing");
      setPullDistance(threshold);

      try {
        await onRefresh();
        setPullState("success");
        await new Promise((r) => setTimeout(r, 700));
      } catch (err) {
        console.error("Pull-to-refresh failed", err);
        setPullState("error");
        await new Promise((r) => setTimeout(r, 1000));
      } finally {
        setPullDistance(0);
        setPullState("idle");
        isRefreshingRef.current = false;
      }
    } else {
      setPullDistance(0);
      setPullState("idle");
    }
  }, [disabled, onRefresh, pullDistance, threshold]);

  useEffect(() => {
    const el = containerRef.current || (typeof window !== "undefined" ? window : null);
    if (!el) return;

    const opts = { passive: true };
    el.addEventListener("touchstart", handleTouchStart as any, opts);
    el.addEventListener("touchmove", handleTouchMove as any, opts);
    el.addEventListener("touchend", handleTouchEnd as any, opts);

    return () => {
      el.removeEventListener("touchstart", handleTouchStart as any);
      el.removeEventListener("touchmove", handleTouchMove as any);
      el.removeEventListener("touchend", handleTouchEnd as any);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Rotation calculation for pulling arrow
  const arrowRotation = Math.min(180, (pullDistance / threshold) * 180);

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Pull to refresh mobile indicator header */}
      <AnimatePresence mode="wait">
        {pullState !== "idle" && (
          <div className="md:hidden pointer-events-none sticky top-0 z-[60] w-full flex items-center justify-center pt-2 pb-1 overflow-hidden">
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.8 }}
              animate={{
                opacity: 1,
                y: Math.min(pullDistance, 48),
                scale: 1,
              }}
              exit={{ opacity: 0, y: -20, scale: 0.8 }}
              transition={{ type: "tween", duration: 0.15 }}
              className="h-10 px-3.5 rounded-full bg-[#11161D] border border-[#29313B] shadow-[0_8px_24px_rgba(0,0,0,0.4)] flex items-center gap-2 text-[12px] font-semibold text-[#F3FFF0]"
            >
              {pullState === "pulling" && (
                <>
                  <div
                    className="w-4 h-4 text-[#DDB52F] flex items-center justify-center transition-transform"
                    style={{ transform: `rotate(${arrowRotation}deg)` }}
                  >
                    <ArrowDown className="w-4 h-4" />
                  </div>
                  <span className="text-[#9AA2AF]">Pull to refresh</span>
                </>
              )}

              {pullState === "canRelease" && (
                <>
                  <div className="w-4 h-4 text-[#DDB52F] flex items-center justify-center transform rotate-180 transition-transform">
                    <ArrowDown className="w-4 h-4" />
                  </div>
                  <span className="text-[#F3FFF0]">Release to refresh</span>
                </>
              )}

              {pullState === "refreshing" && (
                <>
                  <Loader2 className="w-4 h-4 text-[#DDB52F] animate-spin" />
                  <span className="text-[#F3FFF0]">Refreshing...</span>
                </>
              )}

              {pullState === "success" && (
                <>
                  <div className="w-4 h-4 rounded-full bg-[#39D393]/20 border border-[#39D393]/40 flex items-center justify-center text-[#39D393]">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <span className="text-[#39D393] font-mono text-[11px]">Updated</span>
                </>
              )}

              {pullState === "error" && (
                <>
                  <div className="w-4 h-4 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
                    <span className="text-[11px] font-bold">!</span>
                  </div>
                  <span className="text-red-400 text-[11px]">Couldn&apos;t refresh</span>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Page Content */}
      <motion.div
        animate={{
          y: pullState === "refreshing" ? 12 : pullState !== "idle" ? Math.min(pullDistance * 0.3, 24) : 0,
        }}
        transition={{ type: "tween", duration: 0.15 }}
        className="w-full"
      >
        {children}
      </motion.div>
    </div>
  );
}
