"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useDragControls, PanInfo } from "framer-motion";
import { X } from "lucide-react";
import { useMediaQuery } from "@/hooks/use-media-query";

export type SheetSnapPoint = "auto" | "medium" | "full";

export interface GlobalSheetProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  footerActions?: ReactNode;
  snapPoints?: SheetSnapPoint[];
  defaultSnapPoint?: SheetSnapPoint;
  dismissible?: boolean;
  dismissOnBackdrop?: boolean;
  draggable?: boolean;
  showHandle?: boolean;
  showClose?: boolean;
  closeLabel?: string;
  maxHeight?: string;
  className?: string;
  contentClassName?: string;
  headerClassName?: string;
  desktopMode?: "modal" | "sheet";
  desktopMaxWidth?: string;
}

// Global Scroll Lock Reference Counter for Nested Sheet Safety
function lockBodyScroll() {
  if (typeof window === "undefined") return () => {};
  const win = window as any;
  if (!win.__GLOBAL_SHEET_LOCK_COUNT__) {
    win.__GLOBAL_SHEET_LOCK_COUNT__ = 0;
  }

  if (win.__GLOBAL_SHEET_LOCK_COUNT__ === 0) {
    win.__GLOBAL_SHEET_PREV_OVERFLOW__ = document.body.style.overflow;
    win.__GLOBAL_SHEET_PREV_PADDING__ = document.body.style.paddingRight;

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
  }

  win.__GLOBAL_SHEET_LOCK_COUNT__++;

  return () => {
    win.__GLOBAL_SHEET_LOCK_COUNT__--;
    if (win.__GLOBAL_SHEET_LOCK_COUNT__ <= 0) {
      win.__GLOBAL_SHEET_LOCK_COUNT__ = 0;
      document.body.style.overflow = win.__GLOBAL_SHEET_PREV_OVERFLOW__ || "";
      document.body.style.paddingRight = win.__GLOBAL_SHEET_PREV_PADDING__ || "";
    }
  };
}

// Exported Global Reset API for Session Boundary & Logout Cleanup
export function resetGlobalSheetState() {
  if (typeof window === "undefined") return;
  const win = window as any;
  win.__GLOBAL_SHEET_LOCK_COUNT__ = 0;
  if (document.body) {
    document.body.style.overflow = win.__GLOBAL_SHEET_PREV_OVERFLOW__ || "";
    document.body.style.paddingRight = win.__GLOBAL_SHEET_PREV_PADDING__ || "";
  }
  window.dispatchEvent(new CustomEvent("manmadhan:sheet-reset"));
}

export function GlobalSheet({
  open,
  onOpenChange,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footerActions,
  snapPoints = ["auto", "medium", "full"],
  defaultSnapPoint = "auto",
  dismissible = true,
  dismissOnBackdrop = true,
  draggable = true,
  showHandle = true,
  showClose = true,
  closeLabel = "Close sheet",
  maxHeight = "94dvh",
  className = "",
  contentClassName = "",
  headerClassName = "",
  desktopMode = "modal",
  desktopMaxWidth = "max-w-xl",
}: GlobalSheetProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [mounted, setMounted] = useState(false);
  const [activeSnap, setActiveSnap] = useState<SheetSnapPoint>(defaultSnapPoint);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const [resetCount, setResetCount] = useState(0);

  const dragControls = useDragControls();
  const contentRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const touchStartY = useRef<number | null>(null);

  const handleDismiss = useCallback(() => {
    if (!dismissible) return;
    if (onClose) onClose();
    if (onOpenChange) onOpenChange(false);
  }, [dismissible, onClose, onOpenChange]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Global Session Reset Listener
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleSessionReset = () => {
      setActiveSnap(defaultSnapPoint);
      setIsKeyboardOpen(false);
      setViewportHeight(null);
      touchStartY.current = null;
      setResetCount((prev) => prev + 1);
    };

    window.addEventListener("manmadhan:sheet-reset", handleSessionReset);
    return () => window.removeEventListener("manmadhan:sheet-reset", handleSessionReset);
  }, [defaultSnapPoint]);

  useEffect(() => {
    if (open) {
      setActiveSnap(defaultSnapPoint);
      setIsKeyboardOpen(false);
      touchStartY.current = null;
    }
  }, [open, defaultSnapPoint]);

  // Ref-Counted Body Scroll Lock & Active Focus Restoration
  useEffect(() => {
    if (!open || typeof window === "undefined") return;

    previousActiveElement.current = document.activeElement as HTMLElement | null;
    const unlock = lockBodyScroll();

    return () => {
      unlock();
      if (previousActiveElement.current && typeof previousActiveElement.current.focus === "function") {
        previousActiveElement.current.focus();
      }
    };
  }, [open]);

  // Visual Viewport Engine for Mobile Keyboard Adaptation (iOS Safari & Android Chrome/Gboard)
  useEffect(() => {
    if (!open || typeof window === "undefined" || !window.visualViewport) return;

    let timer: NodeJS.Timeout;

    const updateViewport = () => {
      const vv = window.visualViewport;
      if (!vv) return;

      const keyboardH = window.innerHeight - vv.height;
      const kbOpen = keyboardH > 140;
      setIsKeyboardOpen(kbOpen);

      clearTimeout(timer);
      timer = setTimeout(() => {
        setViewportHeight(vv.height);
      }, 60);
    };

    window.visualViewport.addEventListener("resize", updateViewport);
    window.visualViewport.addEventListener("scroll", updateViewport);
    updateViewport();

    return () => {
      clearTimeout(timer);
      window.visualViewport?.removeEventListener("resize", updateViewport);
      window.visualViewport?.removeEventListener("scroll", updateViewport);
    };
  }, [open]);

  // Focused Input Visibility Engine: Keeps Focused Controls Visible Above Keyboard
  useEffect(() => {
    if (!open || typeof window === "undefined") return;

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable;

      if (isInput) {
        setIsKeyboardOpen(true);

        setTimeout(() => {
          if (!contentRef.current || !target) return;
          const containerRect = contentRef.current.getBoundingClientRect();
          const targetRect = target.getBoundingClientRect();

          const isBelow = targetRect.bottom > containerRect.bottom - 24;
          const isAbove = targetRect.top < containerRect.top + 16;

          if (isBelow || isAbove) {
            const scrollDelta = targetRect.top - containerRect.top - 32;
            contentRef.current.scrollBy({
              top: scrollDelta,
              behavior: "smooth",
            });
          }
        }, 120);
      }
    };

    const handleFocusOut = () => {
      setTimeout(() => {
        const active = document.activeElement as HTMLElement | null;
        const isStillInput =
          active &&
          (active.tagName === "INPUT" ||
            active.tagName === "TEXTAREA" ||
            active.tagName === "SELECT" ||
            active.isContentEditable);

        if (!isStillInput) {
          setIsKeyboardOpen(false);
        }
      }, 150);
    };

    const node = contentRef.current;
    if (node) {
      node.addEventListener("focusin", handleFocusIn);
      node.addEventListener("focusout", handleFocusOut);
    }
    return () => {
      if (node) {
        node.removeEventListener("focusin", handleFocusIn);
        node.removeEventListener("focusout", handleFocusOut);
      }
    };
  }, [open, activeSnap, snapPoints]);

  // Android Back Button & ESC Key Discipline
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const active = document.activeElement as HTMLElement | null;
        const isInput =
          active &&
          (active.tagName === "INPUT" ||
            active.tagName === "TEXTAREA" ||
            active.tagName === "SELECT" ||
            active.isContentEditable);

        if (isInput) {
          e.preventDefault();
          e.stopPropagation();
          active.blur(); // 1. Dismiss keyboard first
          return;
        }

        if (activeSnap === "full" && snapPoints.includes("medium")) {
          e.preventDefault();
          e.stopPropagation();
          setActiveSnap("medium"); // 2. Collapse to medium snap point
          return;
        }

        e.preventDefault();
        e.stopPropagation();
        handleDismiss(); // 3. Dismiss sheet
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [open, activeSnap, snapPoints, handleDismiss]);

  // Pointer Down on Header / Drag Region
  const handleHeaderPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggable || isKeyboardOpen) return;
    const target = e.target as HTMLElement;

    const isInteractive =
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT" ||
      target.tagName === "BUTTON" ||
      target.tagName === "A" ||
      target.closest("button") ||
      target.closest("a") ||
      target.closest("input") ||
      target.closest("textarea") ||
      target.closest("select");

    if (!isInteractive) {
      dragControls.start(e);
    }
  };

  // Real-Time Gesture Physics & Velocity Snapping
  const handleDragEnd = useCallback(
    (_: any, info: PanInfo) => {
      const { offset, velocity } = info;

      if (isKeyboardOpen) {
        if (velocity.y > 250 || offset.y > 80) {
          (document.activeElement as HTMLElement)?.blur();
        }
        return;
      }

      // Downward gesture
      if (velocity.y > 380 || offset.y > 120) {
        if (activeSnap === "full" && snapPoints.includes("medium")) {
          setActiveSnap("medium");
        } else if (activeSnap === "medium" && snapPoints.includes("auto")) {
          setActiveSnap("auto");
        } else {
          handleDismiss();
        }
        return;
      }

      // Upward gesture
      if (velocity.y < -380 || offset.y < -70) {
        if (activeSnap === "auto" && snapPoints.includes("medium")) {
          setActiveSnap("medium");
        } else if (snapPoints.includes("full")) {
          setActiveSnap("full");
        }
        return;
      }

      // Displacement threshold
      if (offset.y > 60) {
        if (activeSnap === "full" && snapPoints.includes("medium")) {
          setActiveSnap("medium");
        } else {
          handleDismiss();
        }
      } else if (offset.y < -50) {
        if (activeSnap === "auto" && snapPoints.includes("medium")) {
          setActiveSnap("medium");
        } else if (snapPoints.includes("full")) {
          setActiveSnap("full");
        }
      }
    },
    [activeSnap, snapPoints, isKeyboardOpen, handleDismiss]
  );

  // Content Touch Scroll Handoff (at top of content container)
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartY.current === null) return;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartY.current;

    const node = contentRef.current;
    if (!node) return;

    if (node.scrollTop <= 0 && deltaY > 15) {
      if (isKeyboardOpen) {
        (document.activeElement as HTMLElement)?.blur();
      } else if (activeSnap === "full" && snapPoints.includes("medium")) {
        setActiveSnap("medium");
        touchStartY.current = null;
      }
    }
  };

  const handleTouchEnd = () => {
    touchStartY.current = null;
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (dismissOnBackdrop && e.target === e.currentTarget) {
      handleDismiss();
    }
  };

  if (!mounted) return null;

  const getMobileTargetY = () => {
    if (isKeyboardOpen || activeSnap === "full") return "0dvh";
    if (activeSnap === "medium") return "25dvh";
    return "0dvh"; // auto
  };

  const dynamicHeightStyle =
    isKeyboardOpen && viewportHeight
      ? {
          maxHeight: `${Math.max(280, viewportHeight - 12)}px`,
        }
      : {
          maxHeight: maxHeight,
        };

  const renderContent = () => (
    <AnimatePresence mode="wait">
      {open && (
        <div
          className="fixed inset-0 z-[10000] flex flex-col justify-end md:justify-center items-center font-sans antialiased select-none overflow-hidden"
          onClick={handleBackdropClick}
        >
          {/* BACKDROP (z-[10000]) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="fixed inset-0 bg-black/60 dark:bg-black/75 z-[10000]"
          />

          {/* DESKTOP MODAL VIEWPORT (z-[9999]) */}
          {isDesktop && desktopMode === "modal" ? (
            <motion.div
              ref={sheetRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="global-sheet-title"
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              className={`relative w-full ${desktopMaxWidth} bg-[#FFFFFF] dark:bg-[#0D1015] border border-[#E4E7EC] dark:border-[#252B35] rounded-[24px] shadow-2xl flex flex-col overflow-hidden z-[9999] text-[#17202A] dark:text-[#F3FFF0] ${className}`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* DESKTOP HEADER */}
              {(title || showClose) && (
                <div
                  className={`w-full flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#E4E7EC] dark:border-[#252B35] bg-[#FFFFFF] dark:bg-[#0D1015] shrink-0 ${headerClassName}`}
                >
                  <div className="flex items-center gap-3">
                    {icon && (
                      <div className="p-2 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/25 text-[#D4AF37]">
                        {icon}
                      </div>
                    )}
                    <div>
                      {title && (
                        <h2
                          id="global-sheet-title"
                          className="text-base font-bold text-[#17202A] dark:text-[#F3FFF0] tracking-tight leading-snug"
                        >
                          {title}
                        </h2>
                      )}
                      {subtitle && (
                        <p className="text-xs text-[#667085] dark:text-[#8E949E] font-medium mt-0.5">
                          {subtitle}
                        </p>
                      )}
                    </div>
                  </div>
                  {showClose && (
                    <button
                      type="button"
                      onClick={handleDismiss}
                      aria-label={closeLabel}
                      className="p-1.5 rounded-full text-[#667085] dark:text-[#8E949E] hover:text-[#17202A] dark:hover:text-[#F3FFF0] hover:bg-[#F3F4F6] dark:hover:bg-[#1A202C] transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}

              {/* DESKTOP CONTENT */}
              <div
                ref={contentRef}
                className={`flex-1 overflow-y-auto p-6 select-text ${contentClassName}`}
              >
                {children}
              </div>

              {/* DESKTOP FOOTER */}
              {footerActions && (
                <div className="p-4 bg-[#F8F9FB] dark:bg-[#12161F] border-t border-[#E4E7EC] dark:border-[#252B35] shrink-0">
                  {footerActions}
                </div>
              )}
            </motion.div>
          ) : (
            /* MOBILE BOTTOM SHEET VIEWPORT (z-[9999]) */
            <motion.div
              key={`mobile-sheet-${resetCount}`}
              ref={sheetRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="global-sheet-title"
              drag={draggable && !isKeyboardOpen ? "y" : false}
              dragControls={dragControls}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 600 }}
              dragElastic={false}
              dragSnapToOrigin={false}
              onDragEnd={handleDragEnd}
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: getMobileTargetY(), opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 35, mass: 0.8 }}
              style={dynamicHeightStyle}
              className={`relative w-full bg-[#FFFFFF] dark:bg-[#0D1015] border-t border-[#E4E7EC] dark:border-[#252B35] rounded-t-[28px] shadow-[0_-12px_40px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden z-[10001] text-[#17202A] dark:text-[#F3FFF0] touch-pan-y will-change-transform ${className}`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* DRAG HANDLE & MOBILE HEADER */}
              <div
                onPointerDown={handleHeaderPointerDown}
                className={`w-full flex flex-col items-center pt-2.5 pb-3 px-5 bg-[#FFFFFF] dark:bg-[#0D1015] border-b border-[#E4E7EC] dark:border-[#252B35] shrink-0 touch-none select-none ${
                  draggable ? "cursor-grab active:cursor-grabbing" : ""
                } ${headerClassName}`}
              >
                {/* Touch Drag Handle Indicator */}
                {showHandle && (
                  <div className="w-10 h-1.5 rounded-full bg-[#667085]/30 dark:bg-[#343B46] hover:bg-[#667085]/50 transition-colors mb-2.5" />
                )}

                {(title || showClose) && (
                  <div className="w-full flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {icon && (
                        <div className="p-1.5 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/25 text-[#D4AF37] shrink-0">
                          {icon}
                        </div>
                      )}
                      <div className="min-w-0">
                        {title && (
                          <h2
                            id="global-sheet-title"
                            className="text-[15px] font-bold text-[#17202A] dark:text-[#F3FFF0] tracking-tight truncate leading-tight"
                          >
                            {title}
                          </h2>
                        )}
                        {subtitle && (
                          <p className="text-[11px] text-[#667085] dark:text-[#8E949E] font-medium truncate mt-0.5">
                            {subtitle}
                          </p>
                        )}
                      </div>
                    </div>

                    {showClose && (
                      <button
                        type="button"
                        onClick={handleDismiss}
                        onPointerDown={(e) => e.stopPropagation()}
                        aria-label={closeLabel}
                        className="p-1.5 rounded-full text-[#667085] dark:text-[#8E949E] hover:text-[#17202A] dark:hover:text-[#F3FFF0] hover:bg-[#F3F4F6] dark:hover:bg-[#12161F] transition-colors cursor-pointer shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* SCROLLABLE SHEET CONTENT */}
              <div
                ref={contentRef}
                data-lenis-prevent
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className={`flex-1 overflow-y-auto overscroll-contain px-5 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] space-y-3 select-text [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${contentClassName}`}
              >
                {children}
              </div>

              {/* STICKY FOOTER ACTIONS */}
              {footerActions && (
                <div
                  className="p-4 bg-[#F8F9FB] dark:bg-[#131720] border-t border-[#E4E7EC] dark:border-[#242A34] shrink-0"
                  style={{
                    paddingBottom: "max(16px, env(safe-area-inset-bottom))",
                  }}
                >
                  {footerActions}
                </div>
              )}
            </motion.div>
          )}
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(renderContent(), document.body);
}
