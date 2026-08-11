import React, { useState, useEffect } from "react";
import { Play, Pause, Check, LoaderCircle } from "lucide-react";
import { format } from "date-fns";

export type TimerState = "IDLE" | "RUNNING" | "PAUSED" | "COMPLETED";

interface HeroProgressProps {
  focusTime: string; // e.g., "02h 34m"
  focusGoal: string; // e.g., "06h 00m"
  focusPercent: number; // e.g., 43
  trendPercent: number;
  trendText?: string;
  currentTaskTitle: string | null;
  currentProjectName: string | null;
  
  timerState: TimerState;
  startedAt?: Date | null;
  resumedAt?: Date | null;
  accumulatedDuration?: number; // in seconds
  
  upcomingTask?: any | null; // Added upcoming task for State A
  
  isActionLoading?: boolean;
  onStart: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onComplete?: () => void;
  className?: string;
}

export function HeroProgress({
  focusTime,
  focusGoal,
  focusPercent,
  trendPercent,
  trendText = "from yesterday",
  currentTaskTitle,
  currentProjectName,
  timerState = "IDLE",
  startedAt,
  resumedAt,
  accumulatedDuration = 0,
  upcomingTask,
  isActionLoading = false,
  onStart,
  onPause,
  onResume,
  onComplete,
  className = "",
}: HeroProgressProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (timerState !== "RUNNING" && timerState !== "PAUSED") {
      setElapsedSeconds(0);
      return;
    }

    const calculateElapsed = () => {
      let active = accumulatedDuration;
      if (timerState === "RUNNING") {
        const lastStart = resumedAt ? new Date(resumedAt).getTime() : (startedAt ? new Date(startedAt).getTime() : Date.now());
        active += Math.max(0, Math.floor((Date.now() - lastStart) / 1000));
      }
      setElapsedSeconds(active);
    };

    calculateElapsed();

    let interval: NodeJS.Timeout;
    if (timerState === "RUNNING") {
      interval = setInterval(calculateElapsed, 1000);
    }
    
    return () => clearInterval(interval);
  }, [timerState, startedAt, resumedAt, accumulatedDuration]);

  const formatElapsed = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const hasData = focusTime !== "00h 00m";
  const cappedPercent = Math.min(100, Math.max(0, focusPercent));

  return (
    <div className={`bg-[#FFFFFF] dark:bg-[#141414] border border-[#E5E7EB] dark:border-[#242424] rounded-[14px] p-4 sm:p-6 flex flex-col justify-between shadow-sm dark:shadow-none transition-colors ${className}`}>
      
      {/* Top Section: Today's Progress */}
      <div className="flex flex-col mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[11px] font-bold text-[#52525B] dark:text-[#A1A1AA] uppercase tracking-wider">
            TODAY'S PROGRESS
          </h2>
          <span className="text-[12px] font-medium text-[#71717A] dark:text-[#71717A]">
            {format(new Date(), "dd MMM yyyy")}
          </span>
        </div>

        <div className="flex items-baseline justify-between mb-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[28px] sm:text-[32px] font-bold text-[#171717] dark:text-[#F5F5F5] leading-none tracking-tight">
              {focusTime}
            </span>
            {focusGoal && focusGoal !== "00h 00m" && (
              <span className="text-[14px] sm:text-[16px] text-[#52525B] dark:text-[#A1A1AA] font-medium">
                / {focusGoal}
              </span>
            )}
          </div>
          <span className="text-[18px] sm:text-[20px] font-bold text-[#171717] dark:text-[#F5F5F5]">
            {focusPercent}%
          </span>
        </div>
        
        <p className="text-[13px] text-[#52525B] dark:text-[#A1A1AA] mb-4">
          {hasData ? (focusPercent > 100 ? "Goal exceeded" : "Focus time") : "No focus time yet today."}
        </p>

        {/* Linear Progress Bar */}
        <div className="w-full h-1.5 bg-[#F3F4F6] dark:bg-[#1D1D1D] rounded-full overflow-hidden">
          <div 
            className="h-full bg-[#D99A00] dark:bg-[#F5B800] rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${cappedPercent}%` }}
          />
        </div>
      </div>

      {/* Bottom Section: Current Focus */}
      <div className="flex flex-col">
        <h2 className="text-[11px] font-bold text-[#52525B] dark:text-[#A1A1AA] uppercase tracking-wider mb-4">
          CURRENT FOCUS
        </h2>

        {currentTaskTitle ? (
          /* STATE C — Active Focus */
          <div className="flex flex-col">
            <h3 className="text-[16px] sm:text-[18px] font-semibold text-[#171717] dark:text-[#F5F5F5] leading-tight mb-1 truncate">
              {currentTaskTitle}
            </h3>
            {currentProjectName && (
              <p className="text-[13px] text-[#52525B] dark:text-[#A1A1AA] mb-4 truncate">
                {currentProjectName}
              </p>
            )}

            <div className="flex items-center gap-3 mb-5 font-mono text-[13px] font-medium">
              {timerState === "RUNNING" && (
                <div className="flex items-center gap-2 text-red-500">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  LIVE <span className="text-[#171717] dark:text-[#F5F5F5] ml-1">{formatElapsed(elapsedSeconds)}</span>
                </div>
              )}
              {timerState === "PAUSED" && (
                <div className="flex items-center gap-2 text-amber-500">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  PAUSED <span className="text-[#171717] dark:text-[#F5F5F5] ml-1">{formatElapsed(elapsedSeconds)}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {(timerState === "RUNNING" || timerState === "IDLE") && (
                <button disabled={isActionLoading} onClick={onPause} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[#F7F7F5] dark:bg-[#1D1D1D] hover:bg-[#E5E7EB] dark:hover:bg-[#2A2A2A] text-[#171717] dark:text-[#F5F5F5] px-4 py-2 rounded-md font-semibold text-[13px] transition-colors border border-[#E5E7EB] dark:border-[#242424] disabled:opacity-50 disabled:cursor-not-allowed">
                  {isActionLoading ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Pause className="w-4 h-4" />}
                  {isActionLoading ? "Pausing..." : "Pause"}
                </button>
              )}
              {timerState === "PAUSED" && (
                <button disabled={isActionLoading} onClick={onResume} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[#D99A00] dark:bg-[#F5B800] hover:bg-[#B77900] dark:hover:bg-[#FFD43B] text-white dark:text-[#080808] px-4 py-2 rounded-md font-semibold text-[13px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  {isActionLoading ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  {isActionLoading ? "Resuming..." : "Resume"}
                </button>
              )}
              <button disabled={isActionLoading} onClick={onComplete} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-green-500/10 hover:bg-green-500/20 text-green-700 dark:text-green-500 px-4 py-2 rounded-md font-semibold text-[13px] transition-colors border border-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed">
                {isActionLoading ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 stroke-[2.5]" />}
                {isActionLoading ? "Completing..." : "Complete"}
              </button>
            </div>
          </div>
        ) : upcomingTask ? (
          /* STATE A — No active focus, but upcoming task exists */
          <div className="flex flex-col">
            <p className="text-[14px] text-[#171717] dark:text-[#F5F5F5] mb-4">
              No active focus session.
            </p>
            <div className="mb-5 border-l-2 border-[#E5E7EB] dark:border-[#242424] pl-3">
              <p className="text-[12px] font-medium text-[#71717A] mb-1">Next:</p>
              <h3 className="text-[14px] font-semibold text-[#171717] dark:text-[#F5F5F5] truncate">
                {upcomingTask.title}
              </h3>
              <p className="text-[12px] text-[#52525B] dark:text-[#A1A1AA] mt-0.5">
                {upcomingTask.scheduledStart ? format(new Date(upcomingTask.scheduledStart), "HH:mm") : "Anytime"} 
                {upcomingTask.estimatedMinutes ? ` · ${upcomingTask.estimatedMinutes} min` : ""}
              </p>
            </div>
            <button disabled={isActionLoading} onClick={onStart} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#D99A00] dark:bg-[#F5B800] hover:bg-[#B77900] dark:hover:bg-[#FFD43B] text-white dark:text-[#080808] px-5 py-2 rounded-md font-semibold text-[13px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed self-start">
              {isActionLoading ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
              {isActionLoading ? "Starting..." : "Start Focus"}
            </button>
          </div>
        ) : (
          /* STATE B — No active focus and no scheduled tasks */
          <div className="flex flex-col">
            <p className="text-[14px] text-[#171717] dark:text-[#F5F5F5] mb-2">
              No active focus session.
            </p>
            <p className="text-[13px] text-[#52525B] dark:text-[#A1A1AA] mb-5">
              No tasks are scheduled for the current period.
            </p>
            <button onClick={() => window.location.href = '/personal/tasks'} className="w-full sm:w-auto flex items-center justify-center bg-[#F7F7F5] dark:bg-[#1D1D1D] hover:bg-[#E5E7EB] dark:hover:bg-[#2A2A2A] text-[#171717] dark:text-[#F5F5F5] px-5 py-2 rounded-md font-semibold text-[13px] transition-colors border border-[#E5E7EB] dark:border-[#242424] self-start">
              Create Task
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
