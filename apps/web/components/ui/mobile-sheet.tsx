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
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || typeof window === "undefined") return;

    const updateViewport = () => {
      if (window.visualViewport) {
        const vvHeight = window.visualViewport.height;
        const totalHeight = window.innerHeight;
        const kbHeight = Math.max(0, totalHeight - vvHeight);
        setViewportHeight(vvHeight);
        setKeyboardHeight(kbHeight);
      } else {
        setViewportHeight(window.innerHeight);
        setKeyboardHeight(0);
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

    updateViewport();

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", updateViewport);
      window.visualViewport.addEventListener("scroll", updateViewport);
    }
    window.addEventListener("focusin", handleFocusIn);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", updateViewport);
        window.visualViewport.removeEventListener("scroll", updateViewport);
      }
      window.removeEventListener("focusin", handleFocusIn);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Compute maximum available height inside visual viewport above keyboard
  const maxAvailableHeight = viewportHeight
    ? `${Math.min(viewportHeight * 0.9, viewportHeight - 12)}px`
    : "85vh";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-black/60 backdrop-blur-sm md:hidden overflow-hidden font-sans">
        {/* BACKDROP TAP TO DISMISS */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0"
          onClick={onClose}
        />

        {/* KEYBOARD-AWARE & GESTURE DRAGGABLE SHEET CONTAINER */}
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 350, damping: 32 }}
          drag="y"
          dragConstraints={{ top: 0 }}
          dragElastic={0.2}
          onDragEnd={(_, { offset, velocity }) => {
            if (offset.y > 100 || velocity.y > 500) {
              onClose();
            }
          }}
          style={{
            maxHeight: maxAvailableHeight,
            marginBottom: keyboardHeight > 0 ? `${keyboardHeight}px` : "0px",
          }}
          className="relative w-full bg-[#FFFFFF] dark:bg-[#15191F] border-t border-[#E4E7EC] dark:border-[#272D36] rounded-t-[28px] shadow-2xl flex flex-col overflow-hidden z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* TOUCH DRAG HANDLE & HEADER */}
          <div className="w-full flex flex-col items-center pt-2.5 pb-2 px-5 bg-[#FFFFFF] dark:bg-[#15191F] border-b border-[#E4E7EC] dark:border-[#272D36] shrink-0 touch-none cursor-grab active:cursor-grabbing">
            <div className="w-10 h-1.2 rounded-full bg-[#667085]/30 mb-2" />
            <div className="w-full flex items-center justify-between">
              {title ? (
                <h3 className="text-[15px] font-bold text-[#17202A] dark:text-[#F2F4F7] tracking-tight">{title}</h3>
              ) : (
                <div />
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-full text-[#667085] hover:text-[#17202A] dark:hover:text-[#F2F4F7] hover:bg-[#F3F4F6] dark:hover:bg-[#181D24] transition-colors cursor-pointer"
                aria-label="Close sheet"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* FORM CONTENT AREA */}
          <div ref={contentRef} className="flex-1 overflow-y-auto p-4 space-y-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {children}
          </div>

          {/* STICKY FOOTER ACTIONS */}
          {footerActions && (
            <div
              className="p-3.5 bg-[#F8F9FB] dark:bg-[#111419] border-t border-[#E4E7EC] dark:border-[#272D36] shrink-0"
              style={{ paddingBottom: "max(14px, env(safe-area-inset-bottom))" }}
            >
              {footerActions}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
