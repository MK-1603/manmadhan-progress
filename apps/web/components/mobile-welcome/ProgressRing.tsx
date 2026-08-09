"use client";

import { motion } from "framer-motion";

export function ProgressRing({ percentage = 78 }: { percentage?: number }) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-slate-400">Today's Progress</span>
        <button className="text-[11px] font-bold text-amber-500 hover:text-amber-400 transition-colors">
          View all
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            {/* Track */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              className="stroke-white/10 fill-none"
              strokeWidth="9"
            />
            {/* Progress */}
            <motion.circle
              cx="50"
              cy="50"
              r={radius}
              className="stroke-amber-400 fill-none"
              strokeWidth="9"
              strokeLinecap="round"
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1], delay: 0.4 }}
              style={{
                strokeDasharray: circumference,
              }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-extrabold text-white tracking-tight">{percentage}%</span>
          </div>
        </div>

        <div className="space-y-1">
          <h4 className="text-xs font-bold text-emerald-400">Great momentum!</h4>
          <p className="text-[11px] text-slate-400 leading-snug">
            Keep going, you're doing amazing today.
          </p>
        </div>
      </div>
    </div>
  );
}
