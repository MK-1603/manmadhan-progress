"use client";

import { motion } from "framer-motion";
import { Target, ChevronRight, Play } from "lucide-react";
import Link from "next/link";
import { PremiumCard } from "@/components/ui/premium-card";
import { cn } from "@/shared/lib/utils";

export function GoalsModule({
  title = "",
  description = "",
  journeyProgress = 0,
  daysRemaining = 0,
}: {
  title?: string;
  description?: string;
  journeyProgress?: number;
  daysRemaining?: number;
}) {
  return (
    <motion.section 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="shrink-0 group"
    >
      <Link href="/personal/goals" className="block outline-none focus-ring-brand rounded-[20px]">
        <PremiumCard className="flex flex-col gap-4">
          
          {/* Top: Category Badge */}
          <div className="flex items-center justify-between">
            <span className="meta-text text-muted-foreground flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Active Goal
            </span>
            
            {/* Quick Actions (Reveal on Hover) */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-2">
               <button className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors">
                  <Play className="w-3.5 h-3.5 fill-current" />
               </button>
               <div className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors">
                 <ChevronRight className="w-4 h-4" />
               </div>
            </div>
          </div>
          
          {/* Center: Goal Title & Description */}
          <div>
            {!title ? <p className="body-text text-muted-foreground">No active goals yet.</p> : <>
            <h3 className="card-title text-foreground mb-1">
              {title}
            </h3>
            {description && (
              <p className="body-text text-muted-foreground line-clamp-2">
                {description}
              </p>
            )}
            </>}</div>
          
          {/* Bottom: Animated Progress */}
          <div className="mt-2">
             <div className="flex items-center justify-between caption-text mb-3">
                <span className="font-medium text-foreground">{journeyProgress}% Complete</span>
                <span className="text-muted-foreground">{daysRemaining} days left</span>
             </div>
             
             <div className="enterprise-progress-bg">
                <div 
                  className={cn("enterprise-progress-fill", journeyProgress > 0 && "active")}
                  style={{ width: `${journeyProgress}%` }}
                />
             </div>
          </div>

        </PremiumCard>
      </Link>
    </motion.section>
  );
}
