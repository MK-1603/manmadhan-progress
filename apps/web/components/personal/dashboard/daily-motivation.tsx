import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { useAuth } from "@/components/auth/auth-context";

interface DailyMotivationProps {
  focusPercent: number;
  timerState: "IDLE" | "RUNNING" | "PAUSED" | "COMPLETED";
  tasksCompleted: number;
  tasksTotal: number;
  className?: string;
}

const MOTIVATIONS = {
  completed: "Today's focus goal is complete. Finish strong or protect your momentum for tomorrow.",
  behind:    "There's still time today. Focus on the highest-priority task first.",
  momentum:  "You're ahead of today's plan. Keep the momentum steady.",
  progress:  "Good start. One completed task is already moving today forward.",
  start:     "Start with one focused session. Momentum begins with action.",
  clear:     "Your schedule is clear. Use the time intentionally.",
};

export function DailyMotivation({
  focusPercent,
  timerState,
  tasksCompleted,
  tasksTotal,
  className = "",
}: DailyMotivationProps) {
  const { user } = useAuth();
  const [motivation, setMotivation] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const userId      = user?.id || "anonymous";
    const workspaceId = localStorage.getItem("workspaceId") || "personal";
    const dateStr     = format(new Date(), "yyyy-MM-dd");
    const key         = `motivation_${userId}_${workspaceId}_${dateStr}`;

    const stored = localStorage.getItem(key);
    if (stored) { setMotivation(stored); return; }

    let selected = MOTIVATIONS.start;
    if (focusPercent >= 100) selected = MOTIVATIONS.completed;
    else if (tasksTotal === 0) selected = MOTIVATIONS.clear;
    else if (tasksCompleted > 0 && (tasksCompleted / tasksTotal) >= 0.5) selected = MOTIVATIONS.momentum;
    else if (tasksCompleted > 0 || focusPercent > 0) selected = MOTIVATIONS.progress;
    else if ((tasksCompleted / Math.max(tasksTotal, 1)) < 0.2 && focusPercent < 20) selected = MOTIVATIONS.behind;

    localStorage.setItem(key, selected);
    setMotivation(selected);
  }, [user, focusPercent, tasksCompleted, tasksTotal]);

  if (!motivation) return null;

  return (
    <div className={`
      flex items-start sm:items-center gap-3
      bg-card border border-border rounded-xl px-4 py-3
      transition-colors ${className}
    `}>
      {/* accent pip */}
      <span className="w-1 h-4 rounded-full bg-gold shrink-0 mt-0.5 sm:mt-0" />
      <p className="text-[13px] text-muted-foreground leading-snug">
        <span className="font-semibold text-foreground mr-1.5">Today —</span>
        {motivation}
      </p>
    </div>
  );
}
