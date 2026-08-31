"use client";

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDown, RefreshCw, Check, AlertCircle } from "lucide-react";

type PullState = "idle" | "pulling" | "canRelease" | "refreshing" | "success" | "error";

type GlobalRefreshContextValue = {
  registerRefreshHandler: (handler: () => Promise<void>) => void;
  unregisterRefreshHandler: (handler: () => Promise<void>) => void;
  setRefreshDisabled: (disabled: boolean) => void;
  triggerRefresh: () => Promise<void>;
  isRefreshing: boolean;
  pullState: PullState;
  pullDistance: number;
  threshold: number;
  mainContainerRef: React.RefObject<HTMLDivElement | null>;
};

const GlobalRefreshContext = createContext<GlobalRefreshContextValue | null>(null);

/** Hook for pages to register their server-side refresh function safely */
export function useRegisterRefresh(refreshFn: (() => Promise<void>) | null) {
  const ctx = useContext(GlobalRefreshContext);

  useEffect(() => {
    if (!ctx || !refreshFn) return;
    ctx.registerRefreshHandler(refreshFn);
    return () => {
      ctx.unregisterRefreshHandler(refreshFn);
    };
  }, [ctx, refreshFn]);
}

/** Hook to temporarily disable/enable global pull refresh (e.g. inside open sheets/modals) */
export function useSetRefreshDisabled(disabled: boolean) {
  const ctx = useContext(GlobalRefreshContext);

  useEffect(() => {
    if (!ctx) return;
    ctx.setRefreshDisabled(disabled);
    return () => {
      ctx.setRefreshDisabled(false);
    };
  }, [ctx, disabled]);
}

export function useGlobalRefresh() {
  const ctx = useContext(GlobalRefreshContext);
  if (!ctx) {
    throw new Error("useGlobalRefresh must be used within GlobalRefreshProvider");
  }
  return ctx;
}

export function GlobalRefreshProvider({ children }: { children: ReactNode }) {
  const activeHandlersRef = useRef<Array<() => Promise<void>>>([]);
  const isRefreshDisabledRef = useRef(false);

  const [pullState, setPullState] = useState<PullState>("idle");
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const startYRef = useRef(0);
  const startXRef = useRef(0);
  const isPullingRef = useRef(false);
  const isRefreshingLockRef = useRef(false);
  const mainContainerRef = useRef<HTMLDivElement | null>(null);

  const threshold = 64;

  const registerRefreshHandler = useCallback((handler: () => Promise<void>) => {
    activeHandlersRef.current = [handler];
  }, []);

  const unregisterRefreshHandler = useCallback((handler: () => Promise<void>) => {
    activeHandlersRef.current = activeHandlersRef.current.filter((h) => h !== handler);
  }, []);

  const setRefreshDisabled = useCallback((disabled: boolean) => {
    isRefreshDisabledRef.current = disabled;
  }, []);

  const getScrollTop = useCallback(() => {
    if (typeof window === "undefined") return 0;
    const windowScroll = window.scrollY || document.documentElement.scrollTop || window.pageYOffset || 0;
    const containerScroll = mainContainerRef.current ? mainContainerRef.current.scrollTop : 0;
    return Math.max(windowScroll, containerScroll);
  }, []);

  const triggerRefresh = useCallback(async () => {
    if (isRefreshingLockRef.current || isRefreshDisabledRef.current) return;
    if (activeHandlersRef.current.length === 0) return;

    isRefreshingLockRef.current = true;
    setIsRefreshing(true);
    setPullState("refreshing");
    setPullDistance(threshold);

    try {
      const handler = activeHandlersRef.current[0];
      await handler();
      setPullState("success");
      await new Promise((r) => setTimeout(r, 600));
    } catch (err) {
      console.error("Global refresh error:", err);
      setPullState("error");
      await new Promise((r) => setTimeout(r, 800));
    } finally {
      setPullDistance(0);
      setPullState("idle");
      setIsRefreshing(false);
      isRefreshingLockRef.current = false;
    }
  }, [threshold]);

  // Check if touch target is an input, textarea, button or inside an open dialog/sheet
  const isInteractiveTarget = (target: HTMLElement | null) => {
    if (!target) return false;
    const tagName = target.tagName.toLowerCase();
    if (["input", "textarea", "select", "button", "a"].includes(tagName)) return true;
    if (target.isContentEditable) return true;
    if (target.closest("[role='dialog']") || target.closest("[role='sheet']")) return true;
    return false;
  };

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (isRefreshDisabledRef.current || isRefreshingLockRef.current) return;
      if (activeHandlersRef.current.length === 0) return;
      if (getScrollTop() > 2) return;

      const target = e.target as HTMLElement;
      if (isInteractiveTarget(target)) return;

      startYRef.current = e.touches[0].clientY;
      startXRef.current = e.touches[0].clientX;
      isPullingRef.current = true;
    },
    [getScrollTop],
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isPullingRef.current || isRefreshDisabledRef.current || isRefreshingLockRef.current)
        return;

      if (getScrollTop() > 2) {
        isPullingRef.current = false;
        setPullDistance(0);
        setPullState("idle");
        return;
      }

      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      const deltaY = currentY - startYRef.current;
      const deltaX = Math.abs(currentX - startXRef.current);

      // Controlled damping resistance for native mobile touch feel
      if (deltaY > 0 && deltaY > deltaX) {
        const distance = Math.min(80, deltaY * 0.45);
        setPullDistance(distance);

        if (distance >= threshold) {
          setPullState("canRelease");
        } else {
          setPullState("pulling");
        }
      } else if (deltaY <= 0) {
        setPullDistance(0);
        setPullState("idle");
      }
    },
    [getScrollTop, threshold],
  );

  const handleTouchEnd = useCallback(async () => {
    if (!isPullingRef.current || isRefreshDisabledRef.current) return;
    isPullingRef.current = false;

    if (pullDistance >= threshold && !isRefreshingLockRef.current) {
      if (activeHandlersRef.current.length === 0) {
        setPullDistance(0);
        setPullState("idle");
        return;
      }

      isRefreshingLockRef.current = true;
      setIsRefreshing(true);
      setPullState("refreshing");
      setPullDistance(threshold);

      try {
        const handler = activeHandlersRef.current[0];
        await handler();
        setPullState("success");
        await new Promise((r) => setTimeout(r, 700));
      } catch (err) {
        console.error("Global pull refresh error:", err);
        setPullState("error");
        await new Promise((r) => setTimeout(r, 1000));
      } finally {
        setPullDistance(0);
        setPullState("idle");
        setIsRefreshing(false);
        isRefreshingLockRef.current = false;
      }
    } else {
      setPullDistance(0);
      setPullState("idle");
    }
  }, [pullDistance, threshold]);

  useEffect(() => {
    const el = mainContainerRef.current || (typeof window !== "undefined" ? window : null);
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

  return (
    <GlobalRefreshContext.Provider
      value={{
        registerRefreshHandler,
        unregisterRefreshHandler,
        setRefreshDisabled,
        triggerRefresh,
        isRefreshing,
        pullState,
        pullDistance,
        threshold,
        mainContainerRef,
      }}
    >
      {children}
    </GlobalRefreshContext.Provider>
  );
}

/** Wrapper component placed inside <main> to translate ONLY scrollable page content */
export function GlobalPullToRefreshContent({ children }: { children: ReactNode }) {
  const ctx = useContext(GlobalRefreshContext);
  if (!ctx) return <>{children}</>;

  const { pullState, pullDistance, threshold, mainContainerRef } = ctx;

  const arrowRotation = Math.min(180, (pullDistance / threshold) * 180);
  const contentY = pullState === "refreshing" ? 44 : pullState !== "idle" ? Math.min(pullDistance * 0.6, 52) : 0;

  return (
    <div ref={mainContainerRef} className="relative w-full h-full flex flex-col flex-1 min-h-0">
      {/* REFRESH INDICATOR CENTERED ABOVE CONTENT — ICON ONLY */}
      <AnimatePresence mode="wait">
        {pullState !== "idle" && (
          <div className="md:hidden pointer-events-none absolute top-3 left-0 right-0 z-[60] flex items-center justify-center select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ type: "tween", duration: 0.15 }}
              className="w-9 h-9 rounded-full bg-[#11161D] border border-[#29313B] shadow-[0_8px_24px_rgba(0,0,0,0.45)] flex items-center justify-center shrink-0"
            >
              {pullState === "pulling" && (
                <div
                  className="w-4 h-4 text-[#9AA2AF] flex items-center justify-center transition-transform"
                  style={{ transform: `rotate(${arrowRotation}deg)` }}
                >
                  <RefreshCw className="w-4 h-4" />
                </div>
              )}

              {pullState === "canRelease" && (
                <div className="w-4 h-4 text-[#DDB52F] flex items-center justify-center transform rotate-180 transition-transform">
                  <RefreshCw className="w-4 h-4" />
                </div>
              )}

              {pullState === "refreshing" && (
                <RefreshCw className="w-4 h-4 text-[#DDB52F] animate-spin" />
              )}

              {pullState === "success" && (
                <Check className="w-4 h-4 text-[#39D393] stroke-[3]" />
              )}

              {pullState === "error" && (
                <AlertCircle className="w-4 h-4 text-red-400" />
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ONLY SCROLLABLE PAGE CONTENT PARTICIPATES IN PULL TRANSLATION */}
      <motion.div
        animate={{ y: contentY }}
        transition={{ type: "tween", duration: 0.15 }}
        className="w-full h-full flex flex-col flex-1 min-h-0"
      >
        {children}
      </motion.div>
    </div>
  );
}
