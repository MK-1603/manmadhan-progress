"use client";

import { Calendar } from "lucide-react";
import { motion } from "framer-motion";

export function DeadlineCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.9 }}
      className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between gap-3"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
          <Calendar className="w-4 h-4" />
        </div>

        <div className="min-w-0 space-y-0.5">
          <span className="text-[10px] font-semibold text-slate-400 block">Upcoming Deadline</span>
          <h4 className="text-xs font-bold text-white truncate">Design Review</h4>
          <span className="text-[10px] text-amber-500/90 font-medium block">Today • 5:00 PM</span>
        </div>
      </div>

      <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/25 text-amber-400 text-[10px] font-bold shrink-0">
        In 6h 18m
      </span>
    </motion.div>
  );
}
