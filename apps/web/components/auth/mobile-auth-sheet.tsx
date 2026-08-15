"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { motion, useDragControls, PanInfo } from "framer-motion";
import Image from "next/image";
import { X } from "lucide-react";
import { AuthForm } from "./auth-form";
import { useAuth } from "./auth-context";

type SheetSnapPoint = "COLLAPSED" | "DEFAULT" | "EXPANDED";

export function MobileAuthSheet({
  onCancel,
  onComplete,
  children
}: {
  onCancel: () => void;
  onComplete: () => void;
  children?: React.ReactNode;
}) {
  const { authState } = useAuth();
  const dragControls = useDragControls();
  const contentRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Default authentication sheet opens at DEFAULT detent
  const [snapPoint, setSnapPoint] = useState<SheetSnapPoint>("DEFAULT");
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);

  // Synchronized state refs for stable event listeners without re-binding
  const snapPointRef = useRef<SheetSnapPoint>("DEFAULT");
  snapPointRef.current = snapPoint;

  const isKeyboardOpenRef = useRef<boolean>(false);
  isKeyboardOpenRef.current = isKeyboardOpen;

  // Store previous detent before keyboard/input focus auto-expanded
  const lastDetentRef = useRef<SheetSnapPoint>("DEFAULT");

  // Touch tracking for internal scroll handoff
  const touchStartY = useRef<number | null>(null);

  // 1. Visual Viewport API for Keyboard & Dynamic Viewport Height Detection (Debounced Stabilization)
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;

    let resizeTimer: NodeJS.Timeout;

    const handleVisualViewportChange = () => {
      const vv = window.visualViewport;
      if (!vv) return;

      const keyboardHeight = window.innerHeight - vv.height;
      const keyboardOpen = keyboardHeight > 140;
      setIsKeyboardOpen(keyboardOpen);

      // Debounce viewport height recalculation so the sheet performs ONE adjustment after stabilization
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        setViewportHeight(vv.height);
      }, 120);
    };

    window.visualViewport.addEventListener("resize", handleVisualViewportChange);
    window.visualViewport.addEventListener("scroll", handleVisualViewportChange);

    handleVisualViewportChange();

    return () => {
      clearTimeout(resizeTimer);
      window.visualViewport?.removeEventListener("resize", handleVisualViewportChange);
      window.visualViewport?.removeEventListener("scroll", handleVisualViewportChange);
    };
  }, []);

  // 2. Pure Input Focus Lifecycle: Source of Truth for Keyboard & Sheet Expansion (Mounted Once)
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT")
      ) {
        // Save previous detent if not already expanded
        if (!isKeyboardOpenRef.current && snapPointRef.current !== "EXPANDED") {
          lastDetentRef.current = snapPointRef.current;
        }

        // Move to EXPANDED detent ONCE if not already expanded
        if (snapPointRef.current !== "EXPANDED") {
          setSnapPoint("EXPANDED");
        }
        setIsKeyboardOpen(true);

        // Minimal required scroll calculation to keep focused input comfortably visible
        setTimeout(() => {
          if (!contentRef.current || !target) return;
          const containerRect = contentRef.current.getBoundingClientRect();
          const targetRect = target.getBoundingClientRect();

          // Check if input is outside comfortable visible area
          const isBelow = targetRect.bottom > containerRect.bottom - 24;
          const isAbove = targetRect.top < containerRect.top + 16;

          if (isBelow || isAbove) {
            const scrollDelta = targetRect.top - containerRect.top - 32;
            contentRef.current.scrollBy({
              top: scrollDelta,
              behavior: "smooth",
            });
          }
        }, 150);
      }
    };

    const handleFocusOut = () => {
      // Delay to check if focus moved to another input field or genuinely left the form
      setTimeout(() => {
        const active = document.activeElement as HTMLElement | null;
        const isStillInput =
          active &&
          (active.tagName === "INPUT" ||
            active.tagName === "TEXTAREA" ||
            active.tagName === "SELECT");

        if (!isStillInput) {
          setIsKeyboardOpen(false);
          // Restore previous detent when keyboard closes completely
          if (lastDetentRef.current && lastDetentRef.current !== "EXPANDED") {
            setSnapPoint(lastDetentRef.current);
          }
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
  }, []); // Bound ONCE on mount — zero listener re-bindings or focus collisions

  // 3. Escape / Back Button Priority: Dismiss keyboard -> Collapse detent -> Close sheet
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const active = document.activeElement as HTMLElement | null;
        if (
          active &&
          (active.tagName === "INPUT" ||
            active.tagName === "TEXTAREA" ||
            active.tagName === "SELECT")
        ) {
          e.preventDefault();
          e.stopPropagation();
          active.blur(); // 1. Dismiss keyboard first
          return;
        }

        if (snapPoint === "EXPANDED") {
          e.preventDefault();
          e.stopPropagation();
          setSnapPoint("DEFAULT"); // 2. Return sheet to DEFAULT detent
          return;
        }

        onCancel(); // 3. Dismiss sheet
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [snapPoint, onCancel]);

  const getCloseLabel = () => {
    if (
      authState === "FORGOT_PASSWORD" ||
      authState === "RESET_SENT" ||
      authState === "RESET_PASSWORD"
    ) {
      return "Close account recovery";
    }
    if (authState === "OTP_VERIFICATION") {
      return "Close verification";
    }
    return "Close authentication";
  };

  // 4. Strict Interactive Element Exclusion for Drag Region
  const handleHeaderPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isKeyboardOpen) return;
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

  // 5. GPU-Accelerated Drag & Velocity-Aware Snapping Physics (1:1 finger tracking, zero lag)
  const handleDragEnd = useCallback(
    (_: any, info: PanInfo) => {
      const { offset, velocity } = info;

      // When keyboard is open, downward drag dismisses keyboard first
      if (isKeyboardOpen) {
        if (velocity.y > 250 || offset.y > 80) {
          (document.activeElement as HTMLElement)?.blur();
        }
        return;
      }

      // Fast downward flick or large pull
      if (velocity.y > 380 || offset.y > 140) {
        if (snapPoint === "EXPANDED") {
          setSnapPoint("DEFAULT");
        } else {
          onCancel(); // Dismiss sheet smoothly
        }
        return;
      }

      // Fast upward flick or large pull
      if (velocity.y < -380 || offset.y < -70) {
        if (snapPoint === "COLLAPSED") {
          setSnapPoint("DEFAULT");
        } else {
          setSnapPoint("EXPANDED");
        }
        return;
      }

      // Position-based snapping
      if (offset.y > 60) {
        if (snapPoint === "EXPANDED") {
          setSnapPoint("DEFAULT");
        } else {
          onCancel();
        }
      } else if (offset.y < -50) {
        setSnapPoint("EXPANDED");
      }
    },
    [snapPoint, isKeyboardOpen, onCancel]
  );

  // 6. Content Scroll Gesture Handoff: when content is at top (scrollTop === 0) and user pulls down, collapse sheet
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartY.current === null) return;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartY.current;

    const node = contentRef.current;
    if (!node) return;

    // If at top of scroll and pulling downward in EXPANDED state, hand off gesture
    if (node.scrollTop <= 0 && deltaY > 15 && snapPoint === "EXPANDED") {
      if (isKeyboardOpen) {
        (document.activeElement as HTMLElement)?.blur();
      } else {
        setSnapPoint("DEFAULT");
      }
      touchStartY.current = null;
    }
  };

  const handleTouchEnd = () => {
    touchStartY.current = null;
  };

  // 7. Tap Outside Input: Dismiss keyboard without closing sheet
  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (
      target &&
      target.tagName !== "INPUT" &&
      target.tagName !== "TEXTAREA" &&
      target.tagName !== "SELECT" &&
      target.tagName !== "BUTTON" &&
      !target.closest("button")
    ) {
      if (document.activeElement && (document.activeElement as HTMLElement).blur) {
        (document.activeElement as HTMLElement).blur();
      }
    }
  };

  // GPU Transform Target Value for Y Translation (zero layout thrashing)
  const getTargetY = () => {
    if (snapPoint === "EXPANDED" || isKeyboardOpen) {
      return "0dvh";
    }
    if (snapPoint === "COLLAPSED") {
      return "50dvh";
    }
    return "12dvh"; // DEFAULT detent shows ~84dvh height of content, ensuring 100% of Sign In form fits cleanly
  };

  // Dynamic max height style for Visual Viewport when keyboard is active
  const dynamicHeightStyle =
    isKeyboardOpen && viewportHeight
      ? { height: `${Math.max(300, viewportHeight - 12)}px`, maxHeight: `${Math.max(300, viewportHeight - 12)}px` }
      : undefined;

  // Short Sign In form should NOT scroll by default unless user is in longer forms or keyboard is open
  const isShortForm = authState === "EMAIL_ENTRY" || authState === "OTP_VERIFICATION";
  const shouldAllowScroll = (snapPoint === "EXPANDED" || isKeyboardOpen) && !isShortForm;

  return (
    <motion.section
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-auth-title"
      drag={isKeyboardOpen ? false : "y"}
      dragControls={dragControls}
      dragListener={false}
      dragConstraints={{ top: 0, bottom: 400 }}
      dragElastic={{ top: 0.05, bottom: 0.5 }}
      onDragEnd={handleDragEnd}
      initial={{ y: "100%", opacity: 0 }}
      animate={{ y: getTargetY(), opacity: 1 }}
      exit={{ y: "100%", opacity: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 32, mass: 0.8 }}
      style={dynamicHeightStyle}
      className="w-full h-[94dvh] max-h-[94dvh] flex flex-col overflow-hidden rounded-t-[28px] border-t border-border dark:border-[#282E38] bg-card dark:bg-[#0B0D11] text-foreground dark:text-[#F5F5F2] shadow-2xl relative mt-auto select-none touch-pan-y will-change-transform"
    >
      {/* FIXED BRANDED HEADER & EXCLUSIVE DRAG REGION */}
      <div
        onPointerDown={handleHeaderPointerDown}
        className="shrink-0 flex flex-col border-b border-border/40 dark:border-[#282E38]/60 bg-card dark:bg-[#0B0D11] sticky top-0 z-30 cursor-grab active:cursor-grabbing touch-none select-none pt-2.5 pb-3 px-5"
      >
        {/* Top Drag Handle Indicator (38px x 4px, rounded, #3A4250) */}
        <div className="w-10 h-[4px] rounded-full mx-auto mb-3 bg-muted-foreground/30 dark:bg-[#3A4250] hover:bg-muted-foreground/50 dark:hover:bg-[#4A5260] transition-colors" />

        {/* Header Row: Product Logo + Product Identity + Accessible Close Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-8 w-8 overflow-hidden rounded-lg border border-[#D4AF37]/30 bg-[#D4AF37]/10 flex-shrink-0 flex items-center justify-center shadow-xs">
              <Image
                src="/ios/iTunesArtwork@1x.png"
                alt="ManMadhan Progress Logo"
                width={24}
                height={24}
                priority
                className="rounded"
              />
            </div>
            <div className="flex flex-col justify-center text-left">
              <span
                id="mobile-auth-title"
                className="font-bold text-sm text-foreground dark:text-[#F5F5F2] tracking-tight leading-tight"
              >
                ManMadhan Progress
              </span>
              <span className="text-[10px] text-[#D4AF37] font-mono uppercase tracking-wider leading-tight mt-0.5 font-semibold">
                V1 &middot; EXECUTION OS
              </span>
            </div>
          </div>

          {/* Close Button */}
          <button
            ref={closeRef}
            type="button"
            onClick={onCancel}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label={getCloseLabel()}
            className="w-8 h-8 rounded-full border border-border dark:border-[#282E38] bg-card dark:bg-[#151920] hover:bg-accent dark:hover:bg-[#181C23] flex items-center justify-center text-muted-foreground dark:text-[#9299A8] hover:text-foreground dark:hover:text-[#F5F5F2] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* INTERNAL CONTENT CONTAINER (NO SCROLL FOR SHORT SIGN-IN FORM) */}
      <div
        ref={contentRef}
        data-lenis-prevent
        onClick={handleContainerClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`w-full flex-1 min-h-0 px-5 pt-4 pb-[calc(2.5rem+env(safe-area-inset-bottom,0px))] flex flex-col justify-start select-text ${
          shouldAllowScroll ? "overflow-y-auto overscroll-contain" : "overflow-y-hidden"
        } no-scrollbar scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden`}
      >
        <AuthForm onComplete={onComplete} isMobile={true} />
      </div>
      {children}
    </motion.section>
  );
}
