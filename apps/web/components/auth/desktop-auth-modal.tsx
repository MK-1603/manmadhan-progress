"use client";

import React from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { X, Lock } from "lucide-react";
import { AuthForm } from "./auth-form";
import { useAuth } from "./auth-context";

const EXECUTION_STATUS_STEPS = [
  { num: "01", label: "PLAN", active: false },
  { num: "02", label: "EXECUTE", active: false },
  { num: "03", label: "TRACK", active: false },
  { num: "04", label: "PROGRESS", active: true },
];

export function DesktopAuthModal({ onCancel, onComplete }: { onCancel: () => void, onComplete: () => void }) {
  const { authState } = useAuth();

  const getCloseLabel = () => {
    if (authState === "FORGOT_PASSWORD" || authState === "RESET_SENT" || authState === "RESET_PASSWORD") {
      return "Close account recovery";
    }
    if (authState === "OTP_VERIFICATION") {
      return "Close verification";
    }
    return "Close authentication";
  };

  return (
    <motion.section
      role="dialog"
      aria-modal="true"
      aria-labelledby="desktop-auth-title"
      initial={{ opacity: 0, scale: 0.96, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 10 }}
      transition={{ type: "spring", stiffness: 350, damping: 30 }}
      className="relative grid max-h-[88vh] min-h-[580px] w-full grid-cols-[44%_56%] overflow-hidden rounded-2xl border border-border bg-card text-foreground shadow-2xl"
    >
      {/* LEFT BRANDING PANEL (44% width) - CLEAN UNIFIED SURFACE WITH GOLD ACCENTS */}
      <div className="relative p-8 lg:p-10 flex flex-col justify-between overflow-hidden bg-muted/20 text-foreground border-r border-border/60 select-none">
        
        {/* Subtle Architectural Sub-Grid Pattern Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none opacity-[0.03]" />

        <div className="relative z-10 space-y-7">
          {/* TOP SECTION: LOGO + WELCOME TO MANMADHAN PROGRESS */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gold/10 border border-gold/30 flex items-center justify-center shrink-0 shadow-xs">
                <Image
                  src="/ios/iTunesArtwork@1x.png"
                  alt="ManMadhan Progress Logo"
                  width={22}
                  height={22}
                  className="rounded"
                />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-muted-foreground font-bold">
                  WELCOME TO
                </span>
                <span className="text-sm font-bold text-foreground tracking-tight mt-1">
                  ManMadhan Progress
                </span>
              </div>
            </div>
            <p className="text-[10px] font-mono tracking-[0.18em] uppercase text-gold font-bold pt-0.5">
              EXCLUSIVE EXECUTION OS &middot; V1
            </p>
          </div>

          {/* HERO SECTION: PRIMARY BRAND HIERARCHY */}
          <div className="space-y-3 pt-1">
            <h1 id="desktop-auth-title" className="text-3xl lg:text-[38px] font-extrabold tracking-tight text-foreground leading-tight">
              ManMadhan <span className="text-gold font-black">Progress</span>
            </h1>
            <p className="text-xs font-medium leading-relaxed max-w-xs space-y-1">
              <span className="block text-foreground font-semibold">Where work becomes visible.</span>
              <span className="block text-muted-foreground">Where progress becomes measurable.</span>
            </p>
          </div>

          {/* EXECUTION STATUS INDICATOR */}
          <div className="pt-4 border-t border-border/60 space-y-2.5">
            <span className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-muted-foreground block">
              EXECUTION STATUS
            </span>
            <div className="space-y-1.5 font-mono text-xs">
              {EXECUTION_STATUS_STEPS.map((step) => (
                <div
                  key={step.num}
                  className={`flex items-center justify-between py-1.5 px-2.5 rounded-md border transition-colors ${
                    step.active
                      ? "bg-gold/10 border-gold/40 text-gold font-bold shadow-2xs"
                      : "bg-background/60 border-border/50 text-muted-foreground font-medium"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <span className="text-[10px] opacity-60">{step.num}</span>
                    <span className="tracking-wider text-foreground font-semibold">{step.label}</span>
                  </span>
                  {step.active && (
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-gold">
                      <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
                      <span>ACTIVE</span>
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* PRIVATE BY DESIGN ELEMENT */}
          <div className="pt-3 border-t border-border/60 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground tracking-wide">
              <Lock className="w-3.5 h-3.5 text-gold shrink-0" />
              <span className="text-[11px] font-mono uppercase tracking-wider text-gold font-bold">
                PRIVATE BY DESIGN
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground font-medium leading-normal pl-5">
              Personal and organization workspaces remain isolated.
            </p>
          </div>
        </div>

        {/* BOTTOM SYSTEM SIGNATURE */}
        <div className="relative z-10 pt-4 border-t border-border/60 flex flex-col space-y-2 text-[10px] font-mono text-muted-foreground">
          <div className="flex items-center justify-between font-bold">
            <span className="text-foreground">MANMADHAN PROGRESS &middot; V1</span>
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span>SYSTEM READY</span>
            </span>
          </div>
        </div>
      </div>

      {/* RIGHT AUTHENTICATION PANEL (56% width) */}
      <div className="relative p-8 sm:p-10 flex flex-col justify-center overflow-y-auto bg-card text-foreground">
        <button
          type="button"
          onClick={onCancel}
          aria-label={getCloseLabel()}
          className="absolute right-5 top-5 rounded-full border border-border p-2 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="w-full max-w-[420px] mx-auto">
          {/* HEADER INSIDE AUTH CARD — Only rendered for EMAIL_ENTRY step */}
          {authState === "EMAIL_ENTRY" && (
            <div className="text-center mb-6 space-y-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-muted-foreground">
                AUTHENTICATION
              </span>
              <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
                Welcome back
              </h2>
              <p className="text-xs text-muted-foreground pt-0.5">
                Sign in to continue to your secure workspace.
              </p>
            </div>
          )}

          <AuthForm onComplete={onComplete} />
        </div>
      </div>
    </motion.section>
  );
}
