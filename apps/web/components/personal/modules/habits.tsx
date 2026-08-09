"use client";

import { motion } from "framer-motion";
import { Flame, Check, ChevronRight } from "lucide-react";
import Link from "next/link";
import { PremiumCard } from "@/components/ui/premium-card";

export function HabitsModule({
  streak = 0,
  habits = []
}: {
  streak?: number;
  habits?: Array<{ title: string; completed: boolean }>;
}) {
  return (
    <motion.section 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="flex-1 group"
    >
      <Link href="/personal/habits" className="block h-full outline-none focus-ring-brand rounded-[20px]">
        <PremiumCard className="flex flex-col gap-4 h-full">
          
          <div className="flex items-center justify-between">
            <span className="meta-text text-muted-foreground flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-500" />
              Daily Habits
            </span>
            <div className="px-2 py-1 bg-orange-500/10 text-orange-600 rounded-md caption-text font-semibold flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 fill-current" />
              {streak} Days
            </div>
          </div>

          <div className="flex flex-col gap-3 flex-1 mt-2">
            {habits.length === 0 ? <p className="body-text text-muted-foreground">No habits recorded yet.</p> : habits.map((habit, index) => (
              <div key={index} className="flex items-center gap-3">
                <button 
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-200 ${
                    habit.completed 
                      ? 'bg-orange-500 border-orange-500 text-white' 
                      : 'border-border bg-card hover:border-orange-500 hover:bg-orange-500/5'
                  }`}
                >
                  {habit.completed && <Check className="w-4 h-4" strokeWidth={3} />}
                </button>
                <span className={`body-text truncate transition-colors duration-200 ${
                  habit.completed ? 'text-muted-foreground line-through' : 'text-foreground'
                }`}>
                  {habit.title}
                </span>
              </div>
            ))}
          </div>
          
          {/* Quick Actions (Reveal on Hover) */}
          <div className="absolute right-6 bottom-6 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
             <div className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors shadow-sm">
               <ChevronRight className="w-4 h-4" />
             </div>
          </div>

        </PremiumCard>
      </Link>
    </motion.section>
  );
}
