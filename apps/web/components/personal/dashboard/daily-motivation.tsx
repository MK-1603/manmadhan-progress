import React, { useEffect, useState } from "react";
import { Lightbulb } from "lucide-react";
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
  behind: "There's still time today. Focus on the highest-priority task first.",
  momentum: "You're ahead of today's plan. Keep the momentum steady.",
  progress: "Good start. One completed task is already moving today forward.",
  start: "Start with one focused session. Momentum begins with action.",
  clear: "Your schedule is clear. Use the time intentionally.",
};

export function DailyMotivation({ 
  focusPercent, 
  timerState, 
  tasksCompleted, 
  tasksTotal, 
  className = "" 
}: DailyMotivationProps) {
  const { user } = useAuth();
  const [motivation, setMotivation] = useState<string | null>(null);

  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") return;

    const userId = user?.id || "anonymous";
    const workspaceId = localStorage.getItem("workspaceId") || "personal";
    const dateStr = format(new Date(), "yyyy-MM-dd");
    
    // Unique key per user, workspace, and day
    const storageKey = `motivation_${userId}_${workspaceId}_${dateStr}`;
    
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      setMotivation(stored);
      return;
    }

    // Generate new motivation based on real current state
    let selectedMotivation = MOTIVATIONS.start;

    if (focusPercent >= 100) {
      selectedMotivation = MOTIVATIONS.completed;
    } else if (tasksTotal === 0) {
      selectedMotivation = MOTIVATIONS.clear;
    } else if (tasksCompleted > 0 && tasksTotal > 0 && (tasksCompleted / tasksTotal) < 0.2 && focusPercent < 20) {
      // It's assumed late in the day if they haven't progressed, but for simplicity:
      selectedMotivation = MOTIVATIONS.behind;
    } else if (tasksCompleted > 0 && tasksTotal > 0 && (tasksCompleted / tasksTotal) >= 0.5) {
      selectedMotivation = MOTIVATIONS.momentum;
    } else if (tasksCompleted > 0 || focusPercent > 0) {
      selectedMotivation = MOTIVATIONS.progress;
    } else {
      selectedMotivation = MOTIVATIONS.start;
    }

    // Save strictly for today
    localStorage.setItem(storageKey, selectedMotivation);
    setMotivation(selectedMotivation);

  }, [user, focusPercent, tasksCompleted, tasksTotal]);

  if (!motivation) return null;

  return (
    <div className={`flex items-start sm:items-center gap-2.5 bg-[#FFFFFF] dark:bg-[#111111] border border-[#E5E7EB] dark:border-[#242424] rounded-lg px-4 py-3 transition-colors ${className}`}>
      <Lightbulb className="w-4 h-4 text-[#D99A00] dark:text-[#F5B800] shrink-0 mt-0.5 sm:mt-0" strokeWidth={2} />
      <p className="text-[13px] font-medium text-[#52525B] dark:text-[#A1A1AA] leading-snug">
        <strong className="text-[#171717] dark:text-[#F5F5F5] font-semibold mr-1.5 block sm:inline mb-0.5 sm:mb-0">
          Today's Motivation
        </strong>
        {motivation}
      </p>
    </div>
  );
}

