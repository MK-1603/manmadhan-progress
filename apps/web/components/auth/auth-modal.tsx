"use client";

import { useEffect, useState } from "react";
import { useAuth } from "./auth-context";
import { DesktopAuthModal } from "./desktop-auth-modal";
import { MobileAuthSheet } from "./mobile-auth-sheet";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ArrowRight, CheckCircle2, Layers, XCircle } from "lucide-react";

export function AuthModal() {
  const { isOpen, close, isDirty, authState } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleClose = () => {
    if (isDirty) {
      setShowConfirm(true);
    } else {
      close();
    }
  };

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
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = oldOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, close, isDirty]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={handleClose}
          className="fixed inset-0 z-[95] flex bg-black/65 backdrop-blur-md items-end md:items-center justify-center p-0 md:p-6"
          role="presentation"
        >
          {/* Mobile Sheet container (Hidden on MD) */}
          <div className="w-full flex flex-col md:hidden relative" onMouseDown={(e) => e.stopPropagation()}>
            <MobileAuthSheet onCancel={handleClose} onComplete={() => close(true)}>
              {/* Discard Confirmation Mobile Sheet */}
              <AnimatePresence>
                {showConfirm && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-[100] flex flex-col justify-end items-center bg-black/70 backdrop-blur-sm"
                    onMouseDown={(e) => e.stopPropagation()}
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
          </div>

          {/* Desktop Modal container (Visible on MD) */}
          <div className="hidden w-full max-w-[960px] md:flex relative" onMouseDown={(e) => e.stopPropagation()}>
            <DesktopAuthModal onCancel={handleClose} onComplete={() => close(true)} />
            {/* Discard Confirmation Overlay for Desktop */}
            <AnimatePresence>
              {showConfirm && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 rounded-[32px]"
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

// Mobile Bottom Sheet for Cancel Confirmation with Real Icons
function MobileConfirmSheet({ authState, onCancel, onConfirm }: { authState: string, onCancel: () => void, onConfirm: () => void }) {
  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 350, damping: 32 }}
      className="w-full bg-card border-t border-border rounded-t-[28px] p-6 flex flex-col items-center text-center relative overflow-hidden shadow-[0_-12px_40px_rgba(0,0,0,0.5)]"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Top Drag Handle */}
      <div className="w-10 h-1 rounded-full bg-muted-foreground/20 mb-4" />

      {/* Warning Badge */}
      <div className="relative mb-3">
        <motion.div 
          animate={{ scale: [1, 1.05, 1], opacity: [0.5, 0.8, 0.5] }} 
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 rounded-full bg-red-500/20 blur-xl"
        />
        <div className="w-11 h-11 rounded-full bg-red-500/10 border border-red-500/30 text-red-500 flex items-center justify-center relative z-10 shadow-[0_0_15px_rgba(239,68,68,0.15)]">
          <AlertTriangle className="w-5 h-5" />
        </div>
      </div>

      {/* Text content */}
      <h3 className="text-xl font-bold text-foreground tracking-tight mb-1.5">Cancel Authentication?</h3>
      <p className="text-xs text-muted-foreground font-medium mb-5 leading-relaxed max-w-xs">
        {authState === "OTP_VERIFICATION" 
          ? "Your verification session is still active. Leaving now will cancel this session."
          : "You have not completed your account setup. Leaving now will cancel your session."}
      </p>

      {/* Status indicator with Real Icons */}
      <div className="w-full bg-muted/40 border border-border/60 rounded-xl p-3.5 flex items-center justify-between mb-6">
        <div className="text-left">
          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Current Step</p>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Layers className="w-3.5 h-3.5 text-gold flex-shrink-0" />
            <span>
              {authState === "OTP_VERIFICATION" ? "Identity Verification" :
               authState === "PASSWORD" ? "Security Setup" :
               authState === "PROFILE_SETUP" ? "Profile Setup" :
               authState === "ORGANIZATION_SETUP" ? "Workspace Setup" : "Authentication"}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Status</p>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
            <span className="text-[11px] font-semibold text-green-500">Authenticated</span>
          </div>
        </div>
      </div>

      {/* Actions: 2-in-1 Grid Layout with Real Icons */}
      <div className="w-full grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onConfirm}
          className="h-12 border border-border/80 hover:border-red-500/30 bg-muted/20 hover:bg-red-500/10 text-red-500 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <XCircle className="w-4 h-4 stroke-[2]" />
          <span>Cancel Session</span>
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="h-12 bg-gold hover:bg-gold/90 text-gold-foreground font-bold text-xs rounded-xl transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-gold/50 cursor-pointer flex items-center justify-center gap-1.5"
        >
          <span>Continue Sign In</span>
          <ArrowRight className="w-4 h-4 stroke-[2]" />
        </button>
      </div>
    </motion.div>
  );
}

// Extracted ConfirmCard for Desktop with Real Icons
function ConfirmCard({ authState, onCancel, onConfirm }: { authState: string, onCancel: () => void, onConfirm: () => void }) {
  return (
    <motion.div
      initial={{ scale: 0.96, opacity: 0, y: 10 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.96, opacity: 0, y: 10 }}
      transition={{ type: "spring", damping: 25, stiffness: 300, duration: 0.2 }}
      className="w-full max-w-[360px] bg-card border border-border/50 rounded-[20px] shadow-2xl p-5 flex flex-col items-center text-center relative overflow-hidden"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Warning Badge */}
      <div className="relative mb-4">
        <motion.div 
          animate={{ scale: [1, 1.05, 1], opacity: [0.5, 0.8, 0.5] }} 
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 rounded-full bg-red-500/20 blur-xl"
        />
        <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/30 text-red-500 flex items-center justify-center relative z-10 shadow-[0_0_15px_rgba(239,68,68,0.15)]">
          <AlertTriangle className="w-4 h-4" />
        </div>
      </div>

      {/* Text content */}
      <h3 className="text-lg font-bold text-foreground tracking-tight mb-2">Cancel Authentication?</h3>
      <p className="text-[12px] text-muted-foreground font-medium mb-5 leading-relaxed">
        {authState === "OTP_VERIFICATION" 
          ? "Your verification session is still active. Leaving now will cancel this session."
          : "You have not completed your account setup. Leaving now will cancel your session."}
      </p>

      {/* Status indicator with Real Icons */}
      <div className="w-full bg-muted/50 border border-border rounded-xl p-3 flex items-center justify-between mb-6">
        <div className="text-left">
          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Current Step</p>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-foreground">
            <Layers className="w-3.5 h-3.5 text-gold flex-shrink-0" />
            <span>
              {authState === "OTP_VERIFICATION" ? "Identity Verification" :
               authState === "PASSWORD" ? "Security Setup" :
               authState === "PROFILE_SETUP" ? "Profile Setup" :
               authState === "ORGANIZATION_SETUP" ? "Workspace Setup" : "Authentication"}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Status</p>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
            <span className="text-[10px] font-semibold text-green-500">Authenticated</span>
          </div>
        </div>
      </div>

      {/* Actions: 2-in-1 Grid Layout with Real Icons */}
      <div className="w-full grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={onConfirm}
          className="h-10 border border-border/80 hover:border-red-500/30 bg-muted/20 hover:bg-red-500/10 text-red-500 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <XCircle className="w-3.5 h-3.5 stroke-[2]" />
          <span>Cancel Session</span>
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="h-10 bg-gold hover:bg-gold/90 text-gold-foreground font-bold text-xs rounded-xl transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-gold/50 cursor-pointer flex items-center justify-center gap-1.5"
        >
          <span>Continue Sign In</span>
          <ArrowRight className="w-3.5 h-3.5 stroke-[2]" />
        </button>
      </div>
    </motion.div>
  );
}
