"use client";

import { CheckSquare, Target, Flag, Calendar } from "lucide-react";
import { motion } from "framer-motion";

export function StatCards() {
  const stats = [
    {
      id: "tasks",
      icon: CheckSquare,
      iconColor: "text-amber-400",
      label: "Tasks Done",
      val: "18",
      max: "/24",
      barColor: "bg-amber-400",
      barWidth: "75%",
    },
    {
      id: "focus",
      icon: Target,
      iconColor: "text-emerald-400",
      label: "Focus Time",
      val: "2h 45m",
      barColor: "bg-emerald-400",
      barWidth: "60%",
    },
    {
      id: "goals",
      icon: Flag,
      iconColor: "text-purple-400",
      label: "Goals",
      val: "3",
      max: "/5",
      barColor: "bg-purple-400",
      barWidth: "60%",
    },
    {
      id: "upcoming",
      icon: Calendar,
      iconColor: "text-amber-500",
      label: "Upcoming",
      val: "2",
      subText: "Deadlines",
      subColor: "text-amber-500 font-semibold",
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {stats.map((s, idx) => {
        const Icon = s.icon;
        return (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 + idx * 0.08 }}
            className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] flex flex-col justify-between h-[88px]"
          >
            <div className="flex items-center gap-1">
              <Icon className={`w-3.5 h-3.5 ${s.iconColor}`} />
            </div>

            <div>
              <span className="text-[9.5px] text-slate-400 block truncate">{s.label}</span>
              <div className="flex items-baseline gap-0.5 mt-0.5">
                <span className="text-xs sm:text-sm font-extrabold text-white">{s.val}</span>
                {s.max && <span className="text-[9.5px] text-slate-500 font-medium">{s.max}</span>}
              </div>

              {s.subText ? (
                <span className={`text-[9px] block truncate ${s.subColor}`}>{s.subText}</span>
              ) : (
                <div className="h-1 w-full rounded-full bg-white/10 mt-1 overflow-hidden">
                  <div className={`h-full rounded-full ${s.barColor}`} style={{ width: s.barWidth }} />
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
