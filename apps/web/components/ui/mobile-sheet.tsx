"use client";

import React, { useEffect, useRef, useState, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface MobileSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footerActions?: ReactNode;
  snapPoint?: "auto" | "medium" | "full";
}

export function MobileSheet({
  isOpen,
  onClose,
  title,
  children,
  footerActions,
  snapPoint = "auto",
}: MobileSheetProps) {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || typeof window === "undefined") return;

    const handleVisualViewportResize = () => {
      if (window.visualViewport) {
        const currentHeight = window.visualViewport.height;
        const totalHeight = window.innerHeight;
        const calculatedKeyboardHeight = Math.max(0, totalHeight - currentHeight);
        setKeyboardHeight(calculatedKeyboardHeight);
      }
    };

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        setTimeout(() => {
          target.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 150);
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleVisualViewportResize);
      window.visualViewport.addEventListener("scroll", handleVisualViewportResize);
    }
    window.addEventListener("focusin", handleFocusIn);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", handleVisualViewportResize);
        window.visualViewport.removeEventListener("scroll", handleVisualViewportResize);
      }
      window.removeEventListener("focusin", handleFocusIn);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const getHeightClass = () => {
    switch (snapPoint) {
      case "full":
        return "max-h-[92vh] h-[92vh]";
      case "medium":
        return "max-h-[60vh]";
      default:
        return "max-h-[85vh]";
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-black/60 backdrop-blur-sm md:hidden">
        {/* BACKDROP TAP TO DISMISS */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0"
          onClick={onClose}
        />

        {/* CONTAINER WITH KEYBOARD OFFSET */}
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 350, damping: 32 }}
          style={{ paddingBottom: keyboardHeight > 0 ? `${keyboardHeight}px` : "env(safe-area-inset-bottom, 16px)" }}
          className={`relative w-full ${getHeightClass()} bg-card border-t border-border rounded-t-[28px] shadow-2xl flex flex-col overflow-hidden z-10`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* DRAG HANDLE & HEADER */}
          <div className="w-full flex flex-col items-center pt-3 pb-2 px-6 bg-card border-b border-border/50 shrink-0">
            <div className="w-10 h-1.5 rounded-full bg-muted-foreground/30 mb-3" />
            <div className="w-full flex items-center justify-between">
              {title ? (
                <h3 className="text-base font-bold text-foreground tracking-tight">{title}</h3>
              ) : (
                <div />
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                aria-label="Close sheet"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* SCROLLABLE FORM CONTENT */}
          <div ref={contentRef} className="flex-1 overflow-y-auto p-5 space-y-4">
            {children}
          </div>

          {/* STICKY FOOTER ACTIONS */}
          {footerActions && (
            <div className="p-4 bg-card border-t border-border/60 shrink-0">
              {footerActions}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
