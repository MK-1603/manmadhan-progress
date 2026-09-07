"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, Clock, Folder, Calendar } from "lucide-react";
import { motion, AnimatePresence, useDragControls, PanInfo } from "framer-motion";

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: any[];
  onSelectSession?: (session: any) => void;
}

function formatShortDuration(seconds: number) {
  if (!seconds || seconds <= 0) return "0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function isSameDay(date1: Date, date2: Date) {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

export function HistoryDrawer({
  isOpen,
  onClose,
  history = [],
  onSelectSession,
}: HistoryDrawerProps) {
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

  // Body Scroll Lock & Escape Key Listener
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

  // Group history items chronologically (Today, Yesterday, Earlier)
  const groupedHistory = useMemo(() => {
    if (!history || history.length === 0) return [];

    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    const todayItems: any[] = [];
    const yesterdayItems: any[] = [];
    const earlierItems: any[] = [];

    history.forEach((item) => {
      if (!item?.startTime) {
        todayItems.push(item);
        return;
      }
      const itemDate = new Date(item.startTime);
      if (isSameDay(itemDate, now)) {
        todayItems.push(item);
      } else if (isSameDay(itemDate, yesterday)) {
        yesterdayItems.push(item);
      } else {
        earlierItems.push(item);
      }
    });

    const groups: { label: string; items: any[] }[] = [];
    if (todayItems.length > 0) groups.push({ label: "TODAY", items: todayItems });
    if (yesterdayItems.length > 0) groups.push({ label: "YESTERDAY", items: yesterdayItems });
    if (earlierItems.length > 0) groups.push({ label: "EARLIER", items: earlierItems });

    return groups;
  }, [history]);

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

    // If list is scrolled down, allow content scrolling naturally
    if (contentRef.current.scrollTop > 0) {
      e.stopPropagation();
    }
  };

  if (!mounted) return null;

  const content = (
    <AnimatePresence mode="wait">
      {isOpen && (
        <div
          className="fixed inset-0 z-[100000] flex items-end sm:items-center justify-center p-0 sm:p-6"
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

          {/* Sheet/Modal Container */}
          <motion.div
            onClick={(e) => e.stopPropagation()}
            drag={!isDesktop ? "y" : false}
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 500 }}
            dragElastic={0.15}
            onDragEnd={handleDragEnd}
            initial={isDesktop ? { opacity: 0, scale: 0.95, y: 10 } : { y: "100%", opacity: 0 }}
            animate={isDesktop ? { opacity: 1, scale: 1, y: 0 } : { y: 0, opacity: 1 }}
            exit={isDesktop ? { opacity: 0, scale: 0.95, y: 10 } : { y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
            className="w-full sm:max-w-[680px] min-h-[320px] max-h-[85dvh] sm:max-h-[80vh] bg-[#12151D] border-t sm:border border-[#212634] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden pb-[calc(16px+env(safe-area-inset-bottom,0px))] sm:pb-0 relative z-[100001] touch-pan-y"
          >
            {/* Mobile Drag Handle Bar */}
            <div
              onPointerDown={handleHeaderPointerDown}
              className="sm:hidden pt-3 pb-1.5 flex justify-center shrink-0 touch-none select-none cursor-grab active:cursor-grabbing bg-[#13161F]"
            >
              <div className="w-12 h-1.5 rounded-full bg-[#374151] hover:bg-[#4B5563] transition-colors" />
            </div>

            {/* Header Bar */}
            <div
              onPointerDown={handleHeaderPointerDown}
              className="p-4 sm:p-5 border-b border-[#1E2330] flex items-center justify-between bg-[#13161F] shrink-0 touch-none select-none"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[#D4B12F]/10 text-[#D4B12F]">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-white">
                    Session History
                  </h2>
                  <p className="text-[11px] text-[#8A92A6] mt-0.5">
                    Focus execution history & session log stream
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                onPointerDown={(e) => e.stopPropagation()}
                aria-label="Close History"
                className="p-1.5 rounded-lg text-[#8A92A6] hover:text-white hover:bg-[#181D28] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Grouped History List */}
            <div
              ref={contentRef}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 overscroll-contain select-text"
            >
              {groupedHistory.length > 0 ? (
                groupedHistory.map((group) => (
                  <div key={group.label} className="space-y-2">
                    {/* Date Section Header */}
                    <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#D4B12F] pt-1 pb-1 border-b border-[#1E2330] flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-[#D4B12F]" />
                      <span>{group.label}</span>
                    </div>

                    {/* Session Items Rows */}
                    <div className="space-y-2">
                      {group.items.map((s: any, idx: number) => (
                        <div
                          key={s.id || idx}
                          onClick={() => onSelectSession?.(s)}
                          className="p-3.5 rounded-xl border border-[#212634] bg-[#181D28] hover:border-[#D4B12F]/40 transition-colors flex items-center justify-between gap-3 group cursor-pointer"
                        >
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono text-[#8A92A6]">
                                {s.startTime
                                  ? new Date(s.startTime).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : "10:14 AM"}
                              </span>
                              {s.category && (
                                <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#13161F] text-[#8A92A6] border border-[#212634]">
                                  {s.category}
                                </span>
                              )}
                            </div>

                            <h4 className="text-xs font-semibold text-white truncate group-hover:text-[#D4B12F] transition-colors">
                              {s.displayTitle || s.title || "Focus Activity"}
                            </h4>

                            {s.projectName && (
                              <p className="text-[11px] text-[#8A92A6] flex items-center gap-1">
                                <Folder className="w-3 h-3 text-[#8A92A6]" />
                                <span className="truncate">{s.projectName}</span>
                              </p>
                            )}
                          </div>

                          {/* Right Column: Duration & Status Badge */}
                          <div className="text-right shrink-0 space-y-1">
                            <span className="text-xs font-mono font-bold text-[#D4B12F] block">
                              {formatShortDuration(s.durationSeconds || 0)}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-medium font-mono">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              {s.outcome || s.status || "Completed"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-14 text-center space-y-2 my-auto">
                  <Clock className="w-8 h-8 text-[#8A92A6]/40 mx-auto" />
                  <p className="text-xs font-semibold text-white">No focus sessions recorded yet.</p>
                  <p className="text-[11px] text-[#8A92A6] max-w-xs mx-auto">
                    Start a focus session to begin building your execution history.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}

