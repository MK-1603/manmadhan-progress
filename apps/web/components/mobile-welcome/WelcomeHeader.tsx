"use client";

import Image from "next/image";
import { motion } from "framer-motion";

export function WelcomeHeader() {
  return (
    <div className="flex flex-col items-center text-center space-y-2 pt-2">
      {/* Brand Logo - 48px */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative w-12 h-12 mb-1"
      >
        <Image
          src="/ios/iTunesArtwork@1x.png"
          alt="ManMadhan Progress"
          width={48}
          height={48}
          className="rounded-xl object-cover shadow-lg shadow-amber-500/10"
          priority
        />
      </motion.div>

      {/* Brand Title */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="space-y-0.5"
      >
        <h2 className="text-base font-extrabold text-white tracking-tight">
          ManMadhan <span className="text-amber-400">Progress</span>
        </h2>
        <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-amber-500/80">
          Execution Operating System
        </p>
      </motion.div>

      {/* Headline */}
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="text-2xl font-extrabold tracking-tight text-white leading-tight"
      >
        Plan. <span className="text-amber-400">Execute.</span> Grow.
      </motion.h1>

      {/* 2-line Description */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.25 }}
        className="text-xs text-slate-400 max-w-[320px] leading-relaxed font-medium"
      >
        Your all-in-one workspace to help you focus, execute, and achieve more every day.
      </motion.p>
    </div>
  );
}
