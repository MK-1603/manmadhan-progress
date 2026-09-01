"use client";

import React from "react";
import { motion } from "framer-motion";

interface AuthLoader3DProps {
  message?: string;
  type?: "AUTHENTICATING" | "LOGGING_OUT" | "SESSION_RESTORING";
}

export function AuthLoader3D({
  message = "Authenticating...",
  type = "AUTHENTICATING",
}: AuthLoader3DProps) {
  const getSubtext = () => {
    if (type === "LOGGING_OUT") return "Signing you out safely...";
    if (type === "SESSION_RESTORING") return "Restoring persistent session...";
    return "Securing your workspace...";
  };

  return (
    <div className="flex flex-col items-center justify-center gap-6 select-none font-sans text-center px-4">
      {/* 3D GPU-Accelerated Layered Emblem */}
      <div className="relative w-20 h-20 perspective-[1000px] flex items-center justify-center">
        {/* Ambient Glow */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-[#C9A52A]/20 via-[#D4B12F]/30 to-[#E4C545]/20 blur-xl animate-pulse" />

        {/* 3D Outer Rotating Ring */}
        <motion.div
          animate={{ rotateY: 360, rotateX: 180 }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "linear" }}
          style={{ transformStyle: "preserve-3d" }}
          className="absolute inset-0 rounded-2xl border-2 border-[#D4B12F]/40 shadow-[0_0_24px_rgba(212,177,47,0.3)]"
        />

        {/* 3D Counter-Rotating Inner Frame */}
        <motion.div
          animate={{ rotateY: -360, rotateZ: 180 }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "linear" }}
          style={{ transformStyle: "preserve-3d" }}
          className="absolute inset-2 rounded-xl border border-[#D4B12F]/70 bg-[#0D1015]/80 backdrop-blur-md flex items-center justify-center"
        >
          {/* Central Metallic Monogram */}
          <div className="text-xl font-black font-mono tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-[#D4B12F] via-[#F7E7A9] to-[#C9A52A] drop-shadow-[0_2px_8px_rgba(212,177,47,0.5)]">
            MP
          </div>
        </motion.div>

        {/* Floating Particles */}
        <motion.div
          animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#D4B12F] shadow-[0_0_10px_#D4B12F]"
        />
      </div>

      {/* Typography & Status Message */}
      <div className="space-y-1.5">
        <h3 className="text-base font-extrabold text-[#17202A] dark:text-[#F3FFF0] tracking-tight">
          {message}
        </h3>
        <p className="text-xs text-[#667085] dark:text-[#8E949E] font-medium font-mono">
          {getSubtext()}
        </p>
      </div>
    </div>
  );
}
