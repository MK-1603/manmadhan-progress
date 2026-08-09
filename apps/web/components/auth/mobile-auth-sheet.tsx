"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useRef } from "react";
import { ShieldCheck, X } from "lucide-react";
import { AuthForm } from "./auth-form";
import { useAuth } from "./auth-context";

export function MobileAuthSheet({ onCancel, onComplete, children }: { onCancel: () => void, onComplete: () => void, children?: React.ReactNode }) {
  const { authState } = useAuth();
  const closeRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <motion.section
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-auth-title"
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 350, damping: 35 }}
      className="w-full max-h-[85dvh] flex flex-col overflow-hidden rounded-t-[32px] border border-border bg-card text-foreground shadow-2xl relative pb-[env(safe-area-inset-bottom)]"
    >
      {/* COMPACT HORIZONTAL BRANDED HEADER (EXACT MATCH TO INVITE SHEET) */}
      <div className="shrink-0 flex flex-col border-b border-border/50 bg-card sticky top-0 z-30 shadow-sm">
        {/* Top Drag Handle */}
        <div className="w-10 h-1 rounded-full mx-auto my-2 bg-muted-foreground/20" />
        
        {/* Compact Horizontal Row: [36px Logo] + Text in same line + [Close X] */}
        <div className="px-5 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-9 w-9 overflow-hidden rounded-xl border border-border/50 flex-shrink-0 shadow-sm">
              <Image
                src="/ios/iTunesArtwork@1x.png"
                alt="ManMadhan Progress Logo"
                width={36}
                height={36}
                priority
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col justify-center text-left">
              <span className="font-bold text-sm text-foreground tracking-tight leading-tight">
                {authState === "OTP_VERIFICATION" ? "Verify your identity" : authState === "RESET_PASSWORD" ? "Secure Password Reset" : authState === "FORGOT_PASSWORD" ? "Reset Your Password" : authState === "ERROR" ? "Action Blocked" : "ManMadhan Progress"}
              </span>
              <span className="text-[10px] text-muted-foreground font-medium tracking-[0.14em] uppercase leading-tight mt-0.5">
                {authState === "OTP_VERIFICATION" ? "SECURE VERIFICATION" : authState === "RESET_PASSWORD" || authState === "FORGOT_PASSWORD" ? "ACCOUNT RECOVERY" : authState === "ERROR" ? "SECURITY ALERT" : "Execution OS"}
              </span>
            </div>
          </div>

          {/* Circular Close Button */}
          <button
            ref={closeRef}
            type="button"
            onClick={onCancel}
            aria-label="Close authentication"
            className="w-9 h-9 rounded-full border border-border bg-muted/20 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* FORM CONTAINER */}
      <div
        ref={contentRef}
        data-lenis-prevent
        className="flex-shrink flex-1 px-6 pb-6 pt-4 flex flex-col justify-start overflow-y-auto"
      >
        <AuthForm onComplete={onComplete} isMobile={true} />
      </div>
      {children}
    </motion.section>
  );
}
