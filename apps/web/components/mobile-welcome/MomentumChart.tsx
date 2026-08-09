"use client";

import { TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

export function MomentumChart() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 1.0 }}
      className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between gap-3"
    >
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          <TrendingUp className="w-4 h-4" />
        </div>
        <div>
          <span className="text-[10px] font-semibold text-slate-400 block">Weekly Momentum</span>
        </div>
      </div>

      {/* SVG Smooth Curve Line Chart */}
      <div className="flex-1 h-8 max-w-[120px] px-2 relative">
        <svg className="w-full h-full overflow-visible" viewBox="0 0 120 32" fill="none">
          <defs>
            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          {/* Fill */}
          <path
            d="M0,28 Q20,26 40,22 T80,10 T120,4 L120,32 L0,32 Z"
            fill="url(#chartGrad)"
          />
          {/* Line */}
          <motion.path
            d="M0,28 Q20,26 40,22 T80,10 T120,4"
            stroke="#10B981"
            strokeWidth="2.5"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.6, ease: "easeOut", delay: 1.1 }}
          />
        </svg>
      </div>

      <div className="text-right shrink-0">
        <span className="text-sm font-extrabold text-emerald-400 block leading-tight">+18%</span>
        <span className="text-[9px] text-slate-500 font-medium block">vs last week</span>
      </div>
    </motion.div>
  );
}
