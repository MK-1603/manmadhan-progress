"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Lock, ShieldCheck, ShieldAlert, Send } from "lucide-react";

export type Otp3DState = "IDLE" | "SENDING_EMAIL" | "VERIFYING" | "SUCCESS" | "ERROR" | "EXPIRED";

interface Otp3DObjectProps {
  state: Otp3DState;
  otpLength?: number;
}

export function Otp3DObject({ state, otpLength = 0 }: Otp3DObjectProps) {
  // Compute progress ratio (0 to 1)
  const progressRatio = Math.min(6, Math.max(0, otpLength)) / 6;
  const isComplete = otpLength === 6;

  // Determine glow & accent colors per state
  const glowColor =
    state === "SUCCESS"
      ? "rgba(57, 211, 147, 0.25)"
      : state === "ERROR"
      ? "rgba(239, 91, 91, 0.25)"
      : state === "EXPIRED"
      ? "rgba(245, 158, 11, 0.2)"
      : "rgba(221, 181, 47, 0.2)";

  return (
    <div className="relative flex flex-col items-center justify-center my-3 sm:my-4 select-none">
      {/* Layer 1: Controlled Soft Ambient Contact Glow */}
      <motion.div
        animate={{
          scale: state === "VERIFYING" ? 1.08 : 1,
          opacity: state === "IDLE" && otpLength > 0 ? 0.8 : 0.6,
        }}
        transition={{ duration: 0.3, ease: "easeInOut", type: "tween" }}
        style={{ background: `radial-gradient(ellipse at center, ${glowColor}, transparent 70%)` }}
        className="absolute w-36 h-36 rounded-full pointer-events-none blur-md -z-10"
      />

      {/* Layer 2: Tactile 3D Outer Security Frame */}
      <motion.div
        animate={{
          scale: state === "SUCCESS" ? 1.05 : state === "VERIFYING" ? 1.02 : 1,
          borderColor:
            state === "SUCCESS"
              ? "#39D393"
              : state === "ERROR"
              ? "#EF5B5B"
              : isComplete
              ? "#DDB52F"
              : "#29313B",
        }}
        transition={{ duration: 0.35, ease: "easeOut", type: "tween" }}
        style={{ transformStyle: "preserve-3d", perspective: 800 }}
        className="relative w-26 h-26 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-b from-[#151A22] to-[#0D1015] border shadow-[0_12px_32px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,255,255,0.08)] flex items-center justify-center overflow-hidden transition-colors duration-300"
      >
        {/* Top-Left Edge Specular Highlight */}
        <div className="absolute inset-0 rounded-2xl bg-[linear-gradient(135deg,rgba(255,255,255,0.08)_0%,transparent_50%)] pointer-events-none" />

        {/* Layer 3: Secondary Neutral Depth Bevel Frame */}
        <div className="absolute inset-1.5 rounded-[14px] border border-[#20262F] bg-[#11161D] shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] flex items-center justify-center">
          {/* Progressive Core Connection Ring SVG (0/6 to 6/6) */}
          <svg className="absolute inset-0 w-full h-full p-1 pointer-events-none" viewBox="0 0 100 100">
            {/* Background Track Circle */}
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="#1A2029"
              strokeWidth="3"
            />
            {/* Active Gold Progress Arc */}
            <motion.circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke={state === "SUCCESS" ? "#39D393" : state === "ERROR" ? "#EF5B5B" : "#DDB52F"}
              strokeWidth="3.5"
              strokeDasharray="264"
              initial={{ strokeDashoffset: 264 }}
              animate={{
                strokeDashoffset: 264 - 264 * progressRatio,
              }}
              transition={{ duration: 0.25, ease: "easeOut", type: "tween" }}
              strokeLinecap="round"
              className="origin-center -rotate-90"
            />
          </svg>

          {/* 6 Peripheral Signal Nodes Connected to the Central Core */}
          <div className="absolute inset-2.5 pointer-events-none">
            {Array.from({ length: 6 }).map((_, i) => {
              const angle = (i * 60 - 90) * (Math.PI / 180);
              const radius = 38; // px from center
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;
              const isActive = i < otpLength;
              return (
                <motion.div
                  key={i}
                  initial={{ scale: 0.8, opacity: 0.25 }}
                  animate={{
                    scale: isActive ? 1.1 : 0.8,
                    opacity: isActive ? 1 : 0.25,
                    backgroundColor: state === "SUCCESS" ? "#39D393" : state === "ERROR" ? "#EF5B5B" : "#DDB52F",
                  }}
                  transition={{ duration: 0.2, type: "tween" }}
                  style={{
                    left: `calc(50% + ${x}px - 3px)`,
                    top: `calc(50% + ${y}px - 3px)`,
                  }}
                  className="absolute w-1.5 h-1.5 rounded-full shadow-[0_0_6px_rgba(221,181,47,0.8)]"
                />
              );
            })}
          </div>
        </div>

        {/* State Content Layer */}
        <AnimatePresence mode="wait">
          {/* State A: SENDING_EMAIL — 3D Delivery Capsule Launch */}
          {state === "SENDING_EMAIL" && (
            <motion.div
              key="sending-capsule"
              initial={{ opacity: 0, y: 12, scale: 0.8 }}
              animate={{ opacity: 1, y: -4, scale: 1.05 }}
              exit={{ opacity: 0, y: -20, scale: 0.7 }}
              transition={{ duration: 0.35, ease: "easeInOut", type: "tween" }}
              className="relative z-10 flex flex-col items-center justify-center text-[#DDB52F]"
            >
              <div className="w-11 h-11 rounded-xl bg-[#DDB52F]/15 border border-[#DDB52F]/30 flex items-center justify-center shadow-[0_0_16px_rgba(221,181,47,0.3)]">
                <Send className="w-5 h-5 text-[#DDB52F] animate-pulse" />
              </div>
              <span className="text-[9px] font-mono font-bold tracking-widest text-[#DDB52F] uppercase mt-1">DELIVERING</span>
            </motion.div>
          )}

          {/* State B: IDLE / VERIFYING — Central Shield & Sweep Ring */}
          {state !== "SUCCESS" && state !== "EXPIRED" && state !== "SENDING_EMAIL" && (
            <motion.div
              key="central-core"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.2, type: "tween" }}
              className="relative z-10 flex flex-col items-center justify-center"
            >
              <div className="relative flex items-center justify-center">
                {state === "ERROR" ? (
                  <ShieldAlert className="w-9 h-9 text-[#EF5B5B] stroke-[2] drop-shadow-[0_2px_10px_rgba(239,91,91,0.4)]" />
                ) : (
                  <ShieldCheck
                    className={`w-9 h-9 stroke-[2] transition-colors duration-200 ${
                      isComplete
                        ? "text-[#DDB52F] drop-shadow-[0_2px_12px_rgba(221,181,47,0.5)]"
                        : "text-[#737B88]"
                    }`}
                  />
                )}

                {/* Verifying Rotating Sweep Ring */}
                {state === "VERIFYING" && (
                  <motion.svg
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                    className="absolute -inset-3 w-16 h-16 pointer-events-none"
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
                        <stop stopColor="#39D393" />
                        <stop offset="0.5" stopColor="#DDB52F" />
                        <stop offset="1" stopColor="transparent" />
                      </linearGradient>
                    </defs>
                  </motion.svg>
                )}
              </div>
            </motion.div>
          )}

          {/* State C: SUCCESS — Green Verification Layer & Checkmark */}
          {state === "SUCCESS" && (
            <motion.div
              key="success-lock"
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0 }}
              transition={{ duration: 0.3, ease: "easeOut", type: "tween" }}
              className="relative z-10 flex flex-col items-center justify-center text-[#39D393]"
            >
              <div className="w-11 h-11 rounded-full bg-[#39D393]/15 border border-[#39D393]/35 flex items-center justify-center shadow-[0_0_20px_rgba(57,211,147,0.4)]">
                <Check className="w-6 h-6 text-[#39D393] stroke-[3]" />
              </div>
            </motion.div>
          )}

          {/* State D: EXPIRED — Quiet Security Lock */}
          {state === "EXPIRED" && (
            <motion.div
              key="expired-lock"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, type: "tween" }}
              className="relative z-10 flex flex-col items-center justify-center text-amber-500/70"
            >
              <Lock className="w-7 h-7 text-amber-500/80 mb-1" />
              <span className="text-[9px] font-mono font-bold tracking-widest text-amber-500/90 uppercase">EXPIRED</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
