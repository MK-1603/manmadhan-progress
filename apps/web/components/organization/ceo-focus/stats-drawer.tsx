"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, BarChart3, TrendingUp, Layers } from "lucide-react";
import { motion, AnimatePresence, useDragControls, PanInfo } from "framer-motion";
import { FocusBreakdownBar } from "@/components/organization/ceo-focus/focus-breakdown-bar";
import { WeeklySummaryChart } from "@/components/organization/ceo-focus/weekly-summary-chart";

interface StatsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  overview: any | null;
  weeklyData: any | null;
  weekOffset: number;
  onChangeWeekOffset: (offset: number) => void;
}

function formatShortDuration(seconds: number) {
  if (!seconds || seconds <= 0) return "0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function StatsDrawer({
  isOpen,
  onClose,
  overview,
  weeklyData,
  weekOffset,
  onChangeWeekOffset,
}: StatsDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const dragControls = useDragControls();
  const contentRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 640);
    };
    checkDesktop();
    window.addEventListener("resize", checkDesktop);
    return () => window.removeEventListener("resize", checkDesktop);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Header Pointer Down for Mobile Touch Drag
  const handleHeaderPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDesktop) return;
    const target = e.target as HTMLElement;
    if (
      target.tagName === "BUTTON" ||
      target.tagName === "A" ||
      target.closest("button") ||
      target.closest("a")
    ) {
      return;
    }
    dragControls.start(e);
  };

  // Real iOS-Style Physics & Velocity Snapping on Mobile Drag End
  const handleDragEnd = useCallback(
    (_: any, info: PanInfo) => {
      if (isDesktop) return;
      const { offset, velocity } = info;
      if (offset.y > 100 || velocity.y > 300) {
        onClose();
      }
    },
    [isDesktop, onClose]
  );

  // Touch Handoff Guard (Scroll content when not at top; drag sheet when at top)
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartY.current === null || !contentRef.current || isDesktop) return;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartY.current;

    if (contentRef.current.scrollTop > 0) {
      e.stopPropagation();
    }
  };

  if (!mounted) return null;

  const content = (
    <AnimatePresence mode="wait">
      {isOpen && (
        <div
          className="fixed inset-0 z-[100000] flex items-end sm:items-stretch sm:justify-end"
          style={{ pointerEvents: "auto" }}
        >
          {/* Backdrop with Dynamic Smooth Fade */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100000]"
          />

          {/* Drawer / Sheet Surface */}
          <motion.div
            onClick={(e) => e.stopPropagation()}
            drag={!isDesktop ? "y" : false}
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 500 }}
            dragElastic={0.15}
            onDragEnd={handleDragEnd}
            initial={isDesktop ? { x: "100%", opacity: 0 } : { y: "100%", opacity: 0 }}
            animate={isDesktop ? { x: 0, opacity: 1 } : { y: 0, opacity: 1 }}
            exit={isDesktop ? { x: "100%", opacity: 0 } : { y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
            className="w-full sm:max-w-xl bg-card border-t sm:border-t-0 sm:border-l border-border rounded-t-2xl sm:rounded-none max-h-[85dvh] sm:max-h-full h-auto sm:h-full flex flex-col shadow-2xl relative z-[100001] touch-pan-y"
          >
            {/* Mobile Drag Handle */}
            <div
              onPointerDown={handleHeaderPointerDown}
              className="sm:hidden pt-3 pb-1 flex justify-center shrink-0 touch-none select-none cursor-grab active:cursor-grabbing"
            >
              <div className="w-12 h-1 rounded-full bg-muted-foreground/30 hover:bg-muted-foreground/50 transition-colors" />
            </div>

            {/* Header */}
            <div
              onPointerDown={handleHeaderPointerDown}
              className="p-4 border-b border-border flex items-center justify-between bg-muted/10 shrink-0 touch-none select-none"
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">Focus Statistics</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                onPointerDown={(e) => e.stopPropagation()}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Stats Content */}
            <div
              ref={contentRef}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              className="flex-1 overflow-y-auto p-5 space-y-5 overscroll-contain select-text"
            >
              {/* Key Overview Metrics Grid */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-3 border border-border rounded-xl bg-muted/10 text-center">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase block">Focused Time</span>
                  <span className="text-base font-mono font-bold text-foreground mt-0.5 block">
                    {formatShortDuration(overview?.totalFocusedSeconds || 0)}
                  </span>
                </div>

                <div className="p-3 border border-border rounded-xl bg-muted/10 text-center">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase block">Avg Session</span>
                  <span className="text-base font-mono font-bold text-foreground mt-0.5 block">
                    {formatShortDuration(overview?.avgSessionSeconds || 0)}
                  </span>
                </div>

                <div className="p-3 border border-border rounded-xl bg-muted/10 text-center">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase block">Longest</span>
                  <span className="text-base font-mono font-bold text-primary mt-0.5 block">
                    {formatShortDuration(overview?.longestSessionSeconds || 0)}
                  </span>
                </div>
              </div>

              {/* Weekly Summary Chart */}
              <div className="p-4 border border-border rounded-xl bg-card">
                <WeeklySummaryChart
                  weeklyData={weeklyData}
                  weekOffset={weekOffset}
                  onChangeWeekOffset={onChangeWeekOffset}
                />
              </div>

              {/* Category Distribution */}
              <div className="p-4 border border-border rounded-xl bg-card space-y-3">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2 border-b border-border pb-2">
                  <BarChart3 className="w-3.5 h-3.5 text-primary" /> Category Distribution
                </h3>
                <FocusBreakdownBar
                  categoryBreakdown={overview?.categoryBreakdown || {}}
                  totalSeconds={overview?.totalFocusedSeconds || 0}
                />
              </div>

              {/* Org vs CEO Execution Work Split */}
              <div className="p-4 border border-border rounded-xl bg-card space-y-2">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-primary" /> Work Classification
                </h3>

                <div className="space-y-1 text-xs pt-1">
                  <div className="flex justify-between font-medium">
                    <span className="text-foreground">Organization Execution</span>
                    <span className="font-mono text-muted-foreground">
                      {formatShortDuration(overview?.split?.orgWorkSeconds || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span className="text-foreground">CEO Executive Work</span>
                    <span className="font-mono text-muted-foreground">
                      {formatShortDuration(overview?.split?.ceoWorkSeconds || 0)}
                    </span>
                  </div>

                  {overview?.totalFocusedSeconds > 0 && (
                    <div className="h-2 w-full bg-muted/40 rounded-full flex overflow-hidden mt-2">
                      <div
                        className="h-full bg-primary"
                        style={{
                          width: `${Math.round(
                            (overview.split.orgWorkSeconds / overview.totalFocusedSeconds) * 100
                          )}%`,
                        }}
                      />
                      <div
                        className="h-full bg-blue-500"
                        style={{
                          width: `${Math.round(
                            (overview.split.ceoWorkSeconds / overview.totalFocusedSeconds) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Computed Insights */}
              <div className="p-4 border border-border rounded-xl bg-card space-y-2">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2 border-b border-border pb-2">
                  <TrendingUp className="w-3.5 h-3.5 text-primary" /> Focus Insights
                </h3>

                <div className="space-y-2">
                  {(overview?.insights || []).map((insight: string, idx: number) => (
                    <div key={idx} className="p-2.5 bg-muted/20 border border-border rounded-lg text-xs text-foreground flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                      <p className="leading-relaxed">{insight}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}

