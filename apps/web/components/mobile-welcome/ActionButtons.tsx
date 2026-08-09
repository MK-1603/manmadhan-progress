"use client";

import { ArrowRight, ArrowUpRight, Compass } from "lucide-react";
import { motion } from "framer-motion";

export function ActionButtons() {
  return (
    <div className="w-full space-y-3 pt-2">
      {/* PRIMARY BUTTON: Get Started */}
      <motion.button
        whileHover={{ scale: 1.01, y: -1 }}
        whileTap={{ scale: 0.98 }}
        className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-[#C89B3C] to-amber-400 text-black font-bold flex items-center justify-between shadow-lg shadow-amber-500/20 group cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-black flex items-center justify-center text-amber-400 shrink-0">
            <ArrowUpRight className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
          <div className="text-left">
            <span className="text-sm font-extrabold block text-slate-950 leading-tight">Get Started</span>
            <span className="text-[10px] font-semibold text-slate-900/80 block">Enter your workspace</span>
          </div>
        </div>
      </motion.button>

      {/* SECONDARY BUTTON: Explore Workspace */}
      <motion.button
        whileHover={{ scale: 1.01, y: -1 }}
        whileTap={{ scale: 0.98 }}
        className="w-full p-3.5 rounded-2xl bg-white/[0.05] border border-white/10 hover:bg-white/[0.08] text-white flex items-center justify-between group cursor-pointer backdrop-blur-xl transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white shrink-0">
            <Compass className="w-5 h-5 group-hover:rotate-45 transition-transform" />
          </div>
          <div className="text-left">
            <span className="text-sm font-bold block text-white leading-tight">Explore Workspace</span>
            <span className="text-[10px] font-medium text-slate-400 block">See how everything works</span>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
      </motion.button>

      {/* BOTTOM FOOTER LINE */}
      <div className="text-center pt-1">
        <p className="text-[11px] text-slate-400 font-medium">
          Already have an account?{" "}
          <button className="font-bold text-amber-400 hover:underline cursor-pointer">
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
