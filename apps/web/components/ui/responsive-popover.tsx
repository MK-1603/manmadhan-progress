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
  mobileClassName = "fixed inset-x-0 bottom-0 z-[10001] bg-card rounded-t-3xl border-t border-border shadow-2xl flex flex-col overflow-y-auto overflow-x-hidden overscroll-contain max-h-[85vh] pb-[env(safe-area-inset-bottom)] scrollbar-thin scrollbar-thumb-muted-foreground/30",
  align = "auto",
  offsetY = 4,
}: ResponsivePopoverProps) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const popWidth = popoverRef.current?.offsetWidth || 270;
      let targetLeft: number;

      const shouldAlignRight = align === "right" || (align === "auto" && rect.left > window.innerWidth / 2);

      if (shouldAlignRight) {
        targetLeft = rect.right - popWidth;
      } else {
        targetLeft = rect.left;
      }

      // Clamp targetLeft to stay within viewport bounds
      if (targetLeft + popWidth > window.innerWidth - 12) {
        targetLeft = window.innerWidth - popWidth - 12;
      }
      if (targetLeft < 12) {
        targetLeft = 12;
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
      // Second tick after mount to measure exact popoverRef width
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

      {/* Mobile Bottom Sheet (Portal) */}
      {mounted && isMobile && createPortal(
        <AnimatePresence>
          {isOpen && (
            <div className="portal-root relative z-[10000]">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsOpen(false)}
                className="fixed inset-0 bg-black/60 z-[10000]"
              />
              
              {/* Sheet */}
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
                drag="y"
                dragConstraints={{ top: 0 }}
                dragElastic={0.2}
                onDragEnd={(e, { offset, velocity }) => {
                  if (offset.y > 100 || velocity.y > 500) {
                    setIsOpen(false);
                  }
                }}
                data-lenis-prevent="true"
                className={mobileClassName}
              >
                {/* Visual Grabber */}
                <div className="w-full flex justify-center pt-3 pb-1 shrink-0">
                  <div className="w-12 h-1.5 rounded-full bg-muted-foreground/20" />
                </div>
                
                {children}
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Desktop Dropdown (Portal to document.body at z-[99999]) */}
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
