"use client";

import { Target, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

export function MissionCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.8 }}
      className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between gap-3 group cursor-pointer hover:bg-white/[0.05] transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
          <Target className="w-4 h-4" />
        </div>

        <div className="min-w-0 space-y-0.5">
          <span className="text-[10px] font-semibold text-slate-400 block">Today's Mission</span>
          <h4 className="text-xs font-bold text-white truncate">Complete Authentication Module</h4>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-amber-400">High Priority</span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          </div>
        </div>
      </div>

      <button className="p-1.5 rounded-full bg-white/[0.05] text-slate-400 group-hover:text-white group-hover:bg-white/10 transition-colors shrink-0">
        <ChevronRight className="w-4 h-4" />
      </button>
    </motion.div>
  );
}
