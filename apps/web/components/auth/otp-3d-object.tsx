"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Lock, ShieldCheck } from "lucide-react";

export type Otp3DState = "IDLE" | "VERIFYING" | "SUCCESS" | "ERROR" | "EXPIRED";

interface Otp3DObjectProps {
  state: Otp3DState;
}

export function Otp3DObject({ state }: Otp3DObjectProps) {
  return (
    <div className="relative flex flex-col items-center justify-center my-4 select-none">
      {/* Layer 1: Ambient Contact Shadow & Soft Depth Glow */}
      <div className="absolute w-36 h-36 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(215,179,58,0.18),transparent_70%)] pointer-events-none blur-md -z-10" />

      {/* Layer 2: Tactile 3D Outer Security Frame */}
      <motion.div
        animate={
          state === "IDLE"
            ? { y: [0, -4, 0], rotateX: [0, 2, 0], rotateY: [0, -2, 0] }
            : state === "VERIFYING"
            ? { scale: [1, 1.03, 1], rotateY: [0, 180, 360] }
            : state === "ERROR"
            ? { x: [0, -8, 8, -6, 6, 0] }
            : state === "SUCCESS"
            ? { scale: [1, 1.08, 1], z: 20 }
            : {}
        }
        transition={
          state === "IDLE"
            ? { duration: 4, repeat: Infinity, ease: "easeInOut" }
            : state === "VERIFYING"
            ? { duration: 2, repeat: Infinity, ease: "linear" }
            : state === "ERROR"
            ? { duration: 0.4 }
            : state === "SUCCESS"
            ? { duration: 0.6, type: "spring", stiffness: 120 }
            : { duration: 0.3 }
        }
        style={{ transformStyle: "preserve-3d", perspective: 800 }}
        className="relative w-28 h-28 rounded-2xl bg-gradient-to-b from-[#1A1F26] to-[#0E1116] border border-[#2A313C] shadow-[0_12px_28px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,255,255,0.12)] flex items-center justify-center overflow-hidden"
      >
        {/* Subtle Top-Left Edge Highlight */}
        <div className="absolute inset-0 rounded-2xl bg-[linear-gradient(135deg,rgba(255,255,255,0.1)_0%,transparent_50%)] pointer-events-none" />

        {/* Outer Bevel Frame */}
        <div className="absolute inset-1.5 rounded-[14px] border border-[#232A34] bg-[#12161D] shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] flex items-center justify-center" />

        {/* State 1: IDLE / VERIFYING — Embedded ManMadhan M Security Core */}
        <AnimatePresence mode="wait">
          {state !== "SUCCESS" && state !== "EXPIRED" && (
            <motion.div
              key="m-logo"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="relative z-10 flex flex-col items-center justify-center"
            >
              {/* ManMadhan M Emblem */}
              <div className="relative flex items-center justify-center">
                <svg
                  width="44"
                  height="44"
                  viewBox="0 0 44 44"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="drop-shadow-[0_2px_8px_rgba(215,179,58,0.4)]"
                >
                  <path
                    d="M10 32V12L22 24L34 12V32"
                    stroke="url(#m-gold-grad)"
                    strokeWidth="4.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <defs>
                    <linearGradient id="m-gold-grad" x1="10" y1="12" x2="34" y2="32" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#F5D061" />
                      <stop offset="1" stopColor="#C49A26" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Verifying Sweep Spinner Ring */}
                {state === "VERIFYING" && (
                  <motion.svg
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                    className="absolute -inset-2 w-16 h-16 pointer-events-none"
                    viewBox="0 0 64 64"
                  >
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      fill="none"
                      stroke="url(#sweep-grad)"
                      strokeWidth="2.5"
                      strokeDasharray="60 120"
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient id="sweep-grad" x1="0" y1="0" x2="64" y2="64">
                        <stop stopColor="#D7B33A" />
                        <stop offset="1" stopColor="transparent" />
                      </linearGradient>
                    </defs>
                  </motion.svg>
                )}
              </div>
            </motion.div>
          )}

          {/* State 2: SUCCESS — Precision Lock Checkmark */}
          {state === "SUCCESS" && (
            <motion.div
              key="success-lock"
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0 }}
              transition={{ type: "spring", stiffness: 160, damping: 14 }}
              className="relative z-10 flex flex-col items-center justify-center text-emerald-400"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                <Check className="w-7 h-7 text-emerald-400 stroke-[3]" />
              </div>
            </motion.div>
          )}

          {/* State 3: EXPIRED — Quiet Security Lock */}
          {state === "EXPIRED" && (
            <motion.div
              key="expired-lock"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative z-10 flex flex-col items-center justify-center text-amber-500/70"
            >
              <Lock className="w-8 h-8 text-amber-500/80 mb-1" />
              <span className="text-[9px] font-mono font-bold tracking-widest text-amber-500/90 uppercase">EXPIRED</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
