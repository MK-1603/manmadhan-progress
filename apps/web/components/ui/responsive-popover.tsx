import { useState, useRef, useEffect, ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useMediaQuery } from "@/hooks/use-media-query";

interface ResponsivePopoverProps {
  trigger: ReactNode;
  children: ReactNode;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  desktopClassName?: string;
  mobileClassName?: string;
  align?: "left" | "right" | "auto";
  offsetY?: number;
}

export function ResponsivePopover({
  trigger,
  children,
  isOpen,
  setIsOpen,
  desktopClassName = "w-80 md:w-96 rounded-2xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden",
  mobileClassName = "fixed left-0 right-0 bottom-0 w-full z-[10001] bg-[#FFFFFF] dark:bg-[#0B0D10] text-[#121316] dark:text-[#F5F5F5] rounded-t-[32px] rounded-b-none border-t border-[#E4E4E8] dark:border-[#22252A] shadow-[0_-10px_40px_rgba(0,0,0,0.35)] flex flex-col overflow-hidden max-h-[92vh] select-none font-sans outline-none",
  align = "auto",
  offsetY = 4,
}: ResponsivePopoverProps) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  // Use 1024px threshold so tablet and mobile screens use the 100% edge-to-edge bottom sheet
  const isMobile = useMediaQuery("(max-width: 1024px)");
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const popWidth = popoverRef.current?.offsetWidth || 320;
      let targetLeft: number;

      const shouldAlignRight = align === "right" || (align === "auto" && rect.left > window.innerWidth / 2);

      if (shouldAlignRight) {
        targetLeft = rect.right - popWidth;
      } else {
        targetLeft = rect.left;
      }

      // Clamp targetLeft to stay cleanly within viewport bounds (minimum 24px gap from right edge)
      const maxLeft = window.innerWidth - popWidth - 24;
      if (targetLeft > maxLeft) {
        targetLeft = maxLeft;
      }
      if (targetLeft < 24) {
        targetLeft = 24;
      }

      setCoords({
        top: rect.bottom + offsetY,
        left: targetLeft,
      });
    }
  };

  useEffect(() => {
    if (isOpen && !isMobile) {
      updatePosition();
      const timer = setTimeout(updatePosition, 10);
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("scroll", updatePosition, true);
        window.removeEventListener("resize", updatePosition);
      };
    }
  }, [isOpen, isMobile, offsetY]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMobile) return;
      const target = event.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        popoverRef.current && !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMobile, setIsOpen]);

  return (
    <div className="relative inline-block" ref={triggerRef}>
      {trigger}

      {/* Real iOS Mobile & Tablet Bottom Sheet (Portal to document.body, 100% Edge-to-Edge Width) */}
      {mounted && isMobile && createPortal(
        <AnimatePresence>
          {isOpen && (
            <div className="portal-root relative z-[10000]">
              {/* Dimmed Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setIsOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[10000]"
              />
              
              {/* Real iOS Bottom Drag Sheet: Locked against upward dragging, drags down to dismiss */}
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.25 }}
                onDragEnd={(e, { offset, velocity }) => {
                  // Only allow downward dragging (positive offset y) to dismiss
                  if (offset.y > 60 || velocity.y > 300) {
                    setIsOpen(false);
                  }
                }}
                data-lenis-prevent="true"
                className={mobileClassName}
              >
                {/* Visual Drag Grabber Pill Bar */}
                <div className="w-full flex justify-center pt-3 pb-2 shrink-0 bg-[#FFFFFF] dark:bg-[#0B0D10] cursor-grab active:cursor-grabbing border-b border-transparent">
                  <div className="w-12 h-1.5 rounded-full bg-[#6C707A]/40 dark:bg-[#8E929B]/40" />
                </div>
                
                <div className="flex-1 overflow-y-auto min-h-0 px-5 pt-2 pb-[max(28px,env(safe-area-inset-bottom))] scrollbar-none">
                  {children}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Desktop Dropdown */}
      {mounted && !isMobile && createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              ref={popoverRef}
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              style={{
                position: "fixed",
                top: `${coords.top}px`,
                left: `${coords.left}px`,
                zIndex: 99999,
              }}
              data-lenis-prevent="true"
              className={desktopClassName}
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
