"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "./auth-context";
import { DesktopAuthModal } from "./desktop-auth-modal";
import { MobileAuthSheet } from "./mobile-auth-sheet";
import { GlobalSheet } from "@/components/ui/global-sheet";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ArrowRight, CheckCircle2, Layers, XCircle } from "lucide-react";

import { useMediaQuery } from "@/hooks/use-media-query";

export function AuthModal() {
  const { isOpen, close, isDirty, authState } = useAuth();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [showConfirm, setShowConfirm] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  const handleClose = useCallback(() => {
    if (isDirty || authState === "OTP_VERIFICATION") {
      setShowConfirm(true);
    } else {
      close();
    }
  }, [isDirty, authState, close]);

  const confirmDiscard = () => {
    setShowConfirm(false);
    close(true);
  };

  const cancelDiscard = () => {
    setShowConfirm(false);
  };

  useEffect(() => {
    if (!isOpen) return;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus management: store previous active element to restore on close
    const previousActiveElement = document.activeElement as HTMLElement | null;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
        return;
      }

      if (event.key === "Tab") {
        const modalNode = modalRef.current;
        if (!modalNode) return;

        const focusables = modalNode.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;

        const firstElement = focusables[0];
        const lastElement = focusables[focusables.length - 1];

        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = oldOverflow;
      window.removeEventListener("keydown", onKeyDown);
      if (previousActiveElement && typeof previousActiveElement.focus === "function") {
        previousActiveElement.focus();
      }
    };
  }, [isOpen, handleClose]);

  if (isDesktop) {
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-[9999] flex bg-black/60 items-center justify-center p-6 overflow-hidden"
            role="dialog"
            aria-modal="true"
          >
            {/* Desktop Modal container (Visible on MD) */}
            <div className="w-full max-w-[960px] flex relative" onClick={(e) => e.stopPropagation()}>
              <DesktopAuthModal onCancel={handleClose} onComplete={() => close(true)} />
              {/* Discard / Continue-Abort Confirmation Overlay for Desktop */}
              <AnimatePresence>
                {showConfirm && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 rounded-2xl"
                  >
                    <ConfirmCard 
                      authState={authState} 
                      onCancel={cancelDiscard} 
                      onConfirm={confirmDiscard} 
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Mobile Viewport: Single-Portal Architecture via MobileAuthSheet & GlobalSheet
  return (
    <MobileAuthSheet open={isOpen} onCancel={handleClose} onComplete={() => close(true)}>
      {/* Discard / Continue-Abort Confirmation Mobile Sheet */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[10001] flex flex-col justify-end items-center bg-black/60"
            onClick={(e) => e.stopPropagation()}
          >
            <MobileConfirmSheet 
              authState={authState} 
              onCancel={cancelDiscard} 
              onConfirm={confirmDiscard} 
            />
          </motion.div>
        )}
      </AnimatePresence>
    </MobileAuthSheet>
  );
}

// Mobile Bottom Sheet for Cancel Confirmation
function MobileConfirmSheet({ authState, onCancel, onConfirm }: { authState: string, onCancel: () => void, onConfirm: () => void }) {
  return (
    <GlobalSheet
      open={true}
      onClose={onCancel}
      showHandle={true}
      showClose={false}
      snapPoints={["auto"]}
      defaultSnapPoint="auto"
      desktopMode="sheet"
      desktopMaxWidth="max-w-sm"
    >
      <div className="w-full flex flex-col items-center text-center">
        {/* Warning Badge */}
        <div className="relative mb-3">
          <div className="w-11 h-11 rounded-full bg-destructive/10 border border-destructive/30 text-destructive flex items-center justify-center relative z-10">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* Text content */}
        <h3 className="text-xl font-bold text-foreground tracking-tight mb-1.5">
          {authState === "OTP_VERIFICATION" ? "Leave Verification?" : "Cancel Authentication?"}
        </h3>
        <p className="text-xs text-muted-foreground font-medium mb-5 leading-relaxed max-w-xs">
          {authState === "OTP_VERIFICATION" 
            ? "Your authentication is still active. Leaving now will cancel this attempt."
            : "You have not completed your account setup. Leaving now will cancel your session."}
        </p>

        {/* Status indicator */}
        <div className="w-full bg-muted/40 border border-border/60 rounded-xl p-3.5 flex items-center justify-between mb-6">
          <div className="text-left">
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Current Step</p>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Layers className="w-3.5 h-3.5 text-gold flex-shrink-0" />
              <span>
                {authState === "OTP_VERIFICATION" ? "Identity Verification" :
                 (authState === "PASSWORD" || authState === "PASSWORD_CREATION" || authState === "PASSWORD_CHANGE_REQUIRED") ? "Security Setup" : "Authentication"}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Status</p>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
              <span className="text-[11px] font-semibold text-emerald-500">Active</span>
            </div>
          </div>
        </div>

        {/* Actions: Abort Auth vs Continue */}
        <div className="w-full grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onConfirm}
            className="h-12 border border-[#252B35] bg-[#EF4444]/10 hover:bg-[#EF4444]/15 active:bg-[#EF4444]/20 text-[#EF4444] font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <XCircle className="w-4 h-4 text-[#EF4444] stroke-[2]" />
            <span>Abort Auth</span>
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="h-12 bg-[#D4AF37] hover:bg-[#E3C45A] active:bg-[#B99524] text-[#0E1117] font-bold text-xs rounded-xl transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>Continue</span>
            <ArrowRight className="w-4 h-4 text-[#0E1117] stroke-[2]" />
          </button>
        </div>
      </div>
    </GlobalSheet>
  );
}

// Extracted ConfirmCard for Desktop
function ConfirmCard({ authState, onCancel, onConfirm }: { authState: string, onCancel: () => void, onConfirm: () => void }) {
  return (
    <motion.div
      initial={{ scale: 0.96, opacity: 0, y: 10 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.96, opacity: 0, y: 10 }}
      transition={{ type: "spring", damping: 25, stiffness: 300, duration: 0.2 }}
      className="w-full max-w-[360px] bg-[#141822] border border-[#252B35] rounded-2xl shadow-2xl p-5 flex flex-col items-center text-center relative overflow-hidden"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Warning Badge */}
      <div className="relative mb-4">
        <div className="w-10 h-10 rounded-full bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] flex items-center justify-center relative z-10">
          <AlertTriangle className="w-4 h-4 text-[#EF4444]" />
        </div>
      </div>

      {/* Text content */}
      <h3 className="text-lg font-bold text-[#F3FFF0] tracking-tight mb-2">
        {authState === "OTP_VERIFICATION" ? "Leave Verification?" : "Cancel Authentication?"}
      </h3>
      <p className="text-[12px] text-[#8E949E] font-medium mb-5 leading-relaxed">
        {authState === "OTP_VERIFICATION" 
          ? "Your authentication is still active. Leaving now will cancel this attempt."
          : "You have not completed your account setup. Leaving now will cancel your session."}
      </p>

      {/* Status indicator */}
      <div className="w-full bg-[#12161F] border border-[#252B35] rounded-xl p-3 flex items-center justify-between mb-6">
        <div className="text-left">
          <p className="text-[9px] font-bold text-[#626A75] uppercase tracking-wider mb-0.5">Current Step</p>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#F3FFF0]">
            <Layers className="w-3.5 h-3.5 text-[#D4AF37] flex-shrink-0" />
            <span>
              {authState === "OTP_VERIFICATION" ? "Identity Verification" :
               authState === "PASSWORD" ? "Security Setup" : "Authentication"}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <p className="text-[9px] font-bold text-[#626A75] uppercase tracking-wider mb-0.5">Status</p>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
            <span className="text-[10px] font-semibold text-emerald-500">Active</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="w-full grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={onConfirm}
          className="h-10 border border-[#252B35] bg-[#EF4444]/10 hover:bg-[#EF4444]/15 active:bg-[#EF4444]/20 text-[#EF4444] font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <XCircle className="w-3.5 h-3.5 text-[#EF4444] stroke-[2]" />
          <span>Abort Auth</span>
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="h-10 bg-[#D4AF37] hover:bg-[#E3C45A] active:bg-[#B99524] text-[#0E1117] font-bold text-xs rounded-xl transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
        >
          <span>Continue</span>
          <ArrowRight className="w-3.5 h-3.5 text-[#0E1117] stroke-[2]" />
        </button>
      </div>
    </motion.div>
  );
}
