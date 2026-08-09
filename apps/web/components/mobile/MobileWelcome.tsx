"use client";

import React from "react";
import Image from "next/image";
import { useState } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { Target, Clock3, CalendarDays, ChevronRight, ArrowRight, ArrowUpRight, Compass } from "lucide-react";
import { ExploreBottomSheet } from "./ExploreBottomSheet";
import { useAuth } from "../auth/auth-context";

export function MobileWelcome() {
  const reduceMotion = useReducedMotion();
  const [exploreOpen, setExploreOpen] = useState(false);
  const { open: openAuth } = useAuth();

  const handleNavigate = (path: string) => {
    window.location.href = path;
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.06,
        delayChildren: 0.05,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4 },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="h-[100dvh] w-full max-w-full overflow-hidden relative flex flex-col justify-between p-5 sm:p-6 bg-white dark:bg-[#07080C] text-slate-900 dark:text-white select-none box-border"
    >
      {/* Background Layering */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-[#08090E] dark:via-[#0D0F17] dark:to-[#050609] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_center,rgba(200,155,60,0.05),transparent_60%)] dark:bg-[radial-gradient(circle_at_top_center,rgba(200,155,60,0.12),transparent_60%)] pointer-events-none" />

      {/* Subtle Vector Curve */}
      <svg className="absolute top-0 right-0 w-64 h-64 opacity-15 pointer-events-none overflow-visible z-0" viewBox="0 0 300 300">
        <circle cx="240" cy="40" r="170" fill="none" stroke="#C89B3C" strokeWidth="0.8" strokeDasharray="3 3" />
        <circle cx="240" cy="40" r="220" fill="none" stroke="#C89B3C" strokeWidth="0.5" />
      </svg>

      <div className="relative z-10 flex flex-col justify-between h-full w-full max-w-md mx-auto">
        {/* BRAND & LOGO SECTION */}
        <motion.div variants={itemVariants} className="flex flex-col items-center pt-3 sm:pt-5 text-center">
          <div className="w-14 h-14 mb-3 flex items-center justify-center relative">
            <Image
              src="/ios/iTunesArtwork@1x.png"
              alt="ManMadhan Progress Logo"
              width={56}
              height={56}
              priority
              className="rounded-2xl shadow-lg shadow-amber-500/10 object-contain"
            />
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-none">
            ManMadhan Progress
          </h1>
          <span className="text-[10px] sm:text-[10.5px] font-mono font-bold tracking-[0.22em] uppercase text-[#C89B3C] mt-1.5">
            Execution Operating System
          </span>
        </motion.div>

        {/* HEADLINE & DESCRIPTION */}
        <motion.div variants={itemVariants} className="text-center my-auto py-1">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight text-slate-900 dark:text-white">
            Plan Better.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-[#C89B3C] to-amber-600 dark:from-amber-400 dark:via-[#C89B3C] dark:to-amber-500">Execute</span> Smarter.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-[#C89B3C] to-amber-600 dark:from-amber-400 dark:via-[#C89B3C] dark:to-amber-500">Progress</span> Every Day.
          </h2>
          <p className="text-xs sm:text-sm leading-relaxed text-slate-500 dark:text-slate-400 font-normal mt-2.5 max-w-[290px] mx-auto">
            One workspace to plan, execute, and achieve meaningful progress every day.
          </p>
        </motion.div>

        {/* NEW EXECUTIVE DASHBOARD (WOW FACTOR) */}
        <motion.div variants={itemVariants} className="my-auto w-full space-y-3">

          {/* Main Mission Card */}
          <div className="relative p-4 sm:p-5 rounded-[1.25rem] bg-gradient-to-br from-amber-500/10 via-white to-slate-50 dark:from-amber-500/10 dark:via-[#11141D] dark:to-[#0C0F17] border border-amber-500/20 dark:border-amber-500/20 shadow-lg dark:shadow-2xl overflow-hidden group cursor-pointer transition-all hover:shadow-xl hover:-translate-y-0.5">
            <div className="absolute top-0 right-0 p-4 opacity-10 dark:opacity-20 pointer-events-none">
              <Target className="w-24 h-24 text-amber-500 -mt-6 -mr-6 group-hover:scale-110 transition-transform duration-700" />
            </div>

            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-1 rounded-md bg-amber-500 text-white text-[9px] font-extrabold uppercase tracking-widest shadow-md">
                  Active Mission
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white leading-tight">
                Complete Authentication Module
              </h3>
              <div className="text-xs text-amber-700 dark:text-amber-500/80 font-bold mt-1.5 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> High Priority
              </div>
            </div>
          </div>

          {/* Grid of secondary metrics */}
          <div className="grid grid-cols-2 gap-3">
            {/* Focus Time Card */}
            <div className="p-4 rounded-[1.25rem] bg-white dark:bg-[#11141D] border border-slate-200 dark:border-white/10 shadow-md flex flex-col justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
                <Clock3 className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Focus Time</span>
              </div>
              <div>
                <div className="text-xl font-extrabold text-slate-900 dark:text-white">
                  2h 45m
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  Planned for today
                </div>
              </div>
            </div>

            {/* Deadline Card */}
            <div className="p-4 rounded-[1.25rem] bg-white dark:bg-[#11141D] border border-slate-200 dark:border-white/10 shadow-md flex flex-col justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
                <CalendarDays className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Deadline</span>
              </div>
              <div>
                <div className="text-xl font-extrabold text-slate-900 dark:text-white">
                  5:00 PM
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate">
                  Design Review
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* BOTTOM ACTIONS (APPLE / LINEAR STYLE - ZERO AI FEEL) */}
        <motion.div variants={itemVariants} className="pt-2">
          <div className="grid grid-cols-2 gap-3.5 h-[56px]">
            {/* LEFT BUTTON: Get Started */}
            <motion.button
              whileHover={{ y: -2, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={openAuth}
              className="group h-full rounded-2xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 font-bold px-4 flex items-center justify-between shadow-xl cursor-pointer transition-all active:scale-[0.98]"
            >
              <span className="text-sm font-extrabold tracking-tight">Get Started</span>
              <ArrowUpRight className="w-4 h-4 stroke-[2.5] text-white dark:text-slate-950 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </motion.button>

            {/* RIGHT BUTTON: Explore */}
            <motion.button
              whileHover={{ y: -2, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setExploreOpen(true)}
              className="group h-full rounded-2xl bg-slate-100/60 hover:bg-slate-200/60 border border-slate-200 text-slate-900 dark:bg-white/[0.06] dark:hover:bg-white/10 dark:border-white/15 dark:text-white font-bold px-4 flex items-center justify-between backdrop-blur-xl cursor-pointer transition-all active:scale-[0.98]"
            >
              <span className="text-sm font-bold tracking-tight">Explore</span>
              <Compass className="w-4 h-4 stroke-[2] text-amber-600 dark:text-[#C89B3C] group-hover:rotate-45 transition-transform" />
            </motion.button>
          </div>

          {/* SIGN IN LINK */}
          <div className="text-center mt-3 pt-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Already have an account? </span>
            <button
              onClick={openAuth}
              className="text-amber-700 dark:text-[#C89B3C] font-extrabold hover:underline cursor-pointer ml-1"
            >
              Sign In
            </button>
          </div>
        </motion.div>
        <ExploreBottomSheet open={exploreOpen} onClose={() => setExploreOpen(false)} />
      </div>
    </motion.div>
  );
}
