import React, { useState, useEffect } from "react";
import { Play, Pause, Check, Target, X } from "lucide-react";

export type TimerState = "IDLE" | "RUNNING" | "PAUSED" | "COMPLETED";

interface CurrentFocusCardProps {
  timerState: TimerState;
  currentTaskTitle: string | null;
  currentProjectName: string | null;
  startedAt: Date | string | null;
  resumedAt: Date | string | null;
  accumulatedDuration: number;
  dailyGoalSeconds: number;
  todayTotalSeconds: number;
  availableTasks: any[];
  isActionLoading: boolean;
  onStart: (taskId?: string) => void;
  onPause: () => void;
  onResume: () => void;
  onComplete: () => void;
  className?: string;
}

export function CurrentFocusCard({
  timerState,
  currentTaskTitle,
  currentProjectName,
  startedAt,
  resumedAt,
  accumulatedDuration,
  dailyGoalSeconds,
  todayTotalSeconds,
  availableTasks,
  isActionLoading,
  onStart,
  onPause,
  onResume,
  onComplete,
  className = ""
}: CurrentFocusCardProps) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [showTaskSelector, setShowTaskSelector] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");

  useEffect(() => {
    // Prevent SSR hydration mismatch by only setting interval on client
    if (typeof window === "undefined") return;

    if (timerState !== "RUNNING" || (!startedAt && !resumedAt)) {
      setElapsedMs(accumulatedDuration * 1000);
      return;
    }

    const calculateElapsed = () => {
      const now = new Date().getTime();
      const lastStart = resumedAt ? new Date(resumedAt).getTime() : new Date(startedAt as any).getTime();
      const diffMs = Math.max(0, now - lastStart);
      setElapsedMs((accumulatedDuration * 1000) + diffMs);
    };

    calculateElapsed(); // Initial sync
    const interval = setInterval(calculateElapsed, 1000);
    return () => clearInterval(interval);
  }, [timerState, startedAt, resumedAt, accumulatedDuration]);


  const formatTimer = (totalMs: number) => {
    const totalSeconds = Math.floor(totalMs / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    
    return {
      time: `${h > 0 ? h.toString().padStart(2, "0") + ":" : ""}${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`,
    };
  };

  const elapsedSeconds = Math.floor(elapsedMs / 1000);

  const formatGoal = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    return `${h.toString().padStart(2, "0")}h ${m.toString().padStart(2, "0")}m`;
  };

  const handleStartFocus = () => {
    if (currentTaskTitle) {
      onStart();
    } else {
      setShowTaskSelector(true);
    }
  };

  const handleConfirmStart = () => {
    setShowTaskSelector(false);
    onStart(selectedTaskId || undefined);
  };

  const isLive = timerState === "RUNNING";
  const isPaused = timerState === "PAUSED";
  
  // Calculate real progress for today including this session if running
  const totalFocusIncludingCurrent = todayTotalSeconds + (isLive ? (elapsedSeconds - accumulatedDuration) : 0);
  const progressPercent = dailyGoalSeconds > 0 ? Math.min(100, Math.round((totalFocusIncludingCurrent / dailyGoalSeconds) * 100)) : 0;

  if (showTaskSelector) {
    return (
      <div className={`bg-[#FFFFFF] dark:bg-[#111111] border border-[#E5E7EB] dark:border-[#242424] rounded-[16px] p-6 sm:p-8 flex flex-col shadow-sm dark:shadow-none transition-colors relative w-full ${className}`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-[14px] font-semibold text-[#171717] dark:text-[#F5F5F5] uppercase tracking-wider">
            Select Task
          </h2>
          <button onClick={() => setShowTaskSelector(false)} className="text-[#52525B] hover:text-[#171717] dark:text-[#A1A1AA] dark:hover:text-[#F5F5F5]">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto mb-6 pr-2">
          {availableTasks.length === 0 ? (
            <p className="text-[14px] text-[#52525B] dark:text-[#A1A1AA]">No available tasks found. Please create a task first.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {availableTasks.map(task => (
                <div 
                  key={task.id} 
                  onClick={() => setSelectedTaskId(task.id)}
                  className={`p-4 rounded-[10px] border cursor-pointer transition-colors ${selectedTaskId === task.id ? "border-[#171717] dark:border-[#F5F5F5] bg-[#F7F7F5] dark:bg-[#1D1D1D]" : "border-[#E5E7EB] dark:border-[#242424] hover:border-[#A1A1AA] dark:hover:border-[#52525B]"}`}
                >
                  <p className="text-[14px] font-bold text-[#171717] dark:text-[#F5F5F5] mb-1">{task.title}</p>
                  <p className="text-[12px] text-[#52525B] dark:text-[#A1A1AA]">{task.projectId ? "Project Task" : "Personal Task"}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <button 
          onClick={handleConfirmStart}
          disabled={!selectedTaskId || isActionLoading}
          className="w-full flex items-center justify-center gap-2 bg-[#171717] dark:bg-[#F5F5F5] text-white dark:text-[#080808] h-12 rounded-[10px] font-semibold text-[14px] transition-colors disabled:opacity-50"
        >
          <Play className="w-4 h-4 fill-current" />
          Start Session
        </button>
      </div>
    );
  }

  if (timerState === "IDLE" && !currentTaskTitle) {
    return (
      <div className={`bg-[#FFFFFF] dark:bg-[#111111] border border-[#E5E7EB] dark:border-[#242424] rounded-[16px] p-6 sm:p-8 flex flex-col items-center text-center shadow-sm dark:shadow-none transition-colors relative w-full ${className}`}>
        <h2 className="text-[14px] font-semibold text-[#171717] dark:text-[#F5F5F5] uppercase tracking-wider mb-7 self-start w-full text-left">
          CURRENT FOCUS
        </h2>
        <div className="flex flex-col items-center w-full max-w-sm mx-auto">
          <div className="w-12 h-12 rounded-full bg-[#F3F4F6] dark:bg-[#1D1D1D] flex items-center justify-center mb-4">
            <Target className="w-6 h-6 text-[#A1A1AA] dark:text-[#52525B]" strokeWidth={2} />
          </div>
          <h3 className="text-[16px] sm:text-[18px] font-bold text-[#171717] dark:text-[#F5F5F5] mb-2">
            No active focus session.
          </h3>
          <p className="text-[14px] text-[#52525B] dark:text-[#A1A1AA] mb-8 leading-relaxed">
            Choose a task to begin focused work.
          </p>
          <div className="flex flex-col items-center w-full gap-3">
            <button 
              onClick={handleStartFocus}
              disabled={isActionLoading}
              className="w-full max-w-[210px] flex items-center justify-center gap-2 bg-[#171717] dark:bg-[#F5F5F5] text-white dark:text-[#080808] h-12 rounded-[10px] font-semibold text-[14px] sm:text-[15px] transition-colors disabled:opacity-50 hover:bg-[#27272A] dark:hover:bg-[#E4E4E7]"
            >
              {isActionLoading ? <span className="animate-spin w-4 h-4 border-2 border-white dark:border-[#080808] border-t-transparent rounded-full" /> : <Play className="w-4 h-4 fill-current" />}
              Start Focus
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { time } = formatTimer(elapsedMs);

  return (
    <div className={`bg-[#FFFFFF] dark:bg-[#111111] border border-[#E5E7EB] dark:border-[#242424] rounded-[16px] p-6 sm:p-8 flex flex-col shadow-sm dark:shadow-none transition-colors relative w-full ${className}`}>
      
      {/* Header & Status Indicator */}
      <div className="flex items-center justify-between mb-8 sm:mb-10">
        <h2 className="text-[14px] font-semibold text-[#171717] dark:text-[#F5F5F5] uppercase tracking-wider">
          CURRENT FOCUS
        </h2>
        
        {isLive && (
          <div className="flex items-center gap-2 px-3 py-1 bg-[#16A34A]/10 dark:bg-[#22C55E]/10 rounded-full border border-[#16A34A]/20 dark:border-[#22C55E]/20">
            <div className="w-2 h-2 rounded-full bg-[#16A34A] dark:bg-[#22C55E] animate-pulse" />
            <span className="text-[11px] font-bold text-[#16A34A] dark:text-[#22C55E] uppercase tracking-wider">LIVE</span>
          </div>
        )}
        {isPaused && (
          <div className="flex items-center gap-2 px-3 py-1 bg-[#D99A00]/10 dark:bg-[#F5B800]/10 rounded-full border border-[#D99A00]/20 dark:border-[#F5B800]/20">
            <div className="w-2 h-2 rounded-full bg-[#D99A00] dark:bg-[#F5B800]" />
            <span className="text-[11px] font-bold text-[#D99A00] dark:text-[#F5B800] uppercase tracking-wider">PAUSED</span>
          </div>
        )}
      </div>

      {/* Task Details */}
      <div className="flex-1 mb-8">
        <h1 className="text-[28px] sm:text-[32px] font-bold text-[#171717] dark:text-[#F5F5F5] leading-tight mb-2 tracking-tight">
          {currentTaskTitle || "Focus session"}
        </h1>
        {currentProjectName && (
          <p className="text-[15px] sm:text-[16px] text-[#52525B] dark:text-[#A1A1AA] font-medium">
            {currentProjectName}
          </p>
        )}
      </div>

      <div className="mb-8">
        <div className="font-bold text-[#171717] dark:text-[#F5F5F5] leading-none tracking-tighter tabular-nums flex items-baseline">
          <span className="text-[56px] sm:text-[72px]">{time}</span>
        </div>
        <p className="text-[13px] font-medium text-[#52525B] dark:text-[#A1A1AA] mt-2 tracking-wide uppercase">
          Elapsed time
        </p>
      </div>

      {/* Today's Goal Progress within the card */}
      <div className="flex flex-col gap-3 mb-8 pb-6 border-b border-[#E5E7EB] dark:border-[#242424]">
        <div className="flex justify-between items-end">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-[#52525B] dark:text-[#A1A1AA] uppercase tracking-wider mb-1">Today's goal</span>
            <span className="text-[16px] font-semibold text-[#171717] dark:text-[#F5F5F5]">{formatGoal(dailyGoalSeconds)}</span>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-[11px] font-bold text-[#52525B] dark:text-[#A1A1AA] uppercase tracking-wider mb-1">Progress</span>
            <span className="text-[16px] font-semibold text-[#171717] dark:text-[#F5F5F5]">
              {formatGoal(totalFocusIncludingCurrent)} <span className="text-[#A1A1AA] dark:text-[#52525B] mx-1">·</span> {progressPercent}%
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-auto">
        <>
            {isLive ? (
              <button 
                onClick={onPause}
                disabled={isActionLoading}
                className="flex-1 flex items-center justify-center gap-2 bg-[#F3F4F6] dark:bg-[#1D1D1D] text-[#171717] dark:text-[#F5F5F5] hover:bg-[#E5E7EB] dark:hover:bg-[#2A2A2A] h-12 rounded-[10px] font-semibold text-[14px] sm:text-[15px] transition-colors border border-[#E5E7EB] dark:border-[#242424] disabled:opacity-50"
              >
                <Pause className="w-4 h-4 fill-current" />
                Pause
              </button>
            ) : (
              <button 
                onClick={onResume}
                disabled={isActionLoading}
                className="flex-1 flex items-center justify-center gap-2 bg-[#F3F4F6] dark:bg-[#1D1D1D] text-[#171717] dark:text-[#F5F5F5] hover:bg-[#E5E7EB] dark:hover:bg-[#2A2A2A] h-12 rounded-[10px] font-semibold text-[14px] sm:text-[15px] transition-colors border border-[#E5E7EB] dark:border-[#242424] disabled:opacity-50"
              >
                <Play className="w-4 h-4 fill-current" />
                Resume
              </button>
            )}
            
            <button 
              onClick={onComplete}
              disabled={isActionLoading}
              className="flex-1 flex items-center justify-center gap-2 bg-[#171717] dark:bg-[#F5F5F5] text-white dark:text-[#080808] hover:bg-[#27272A] dark:hover:bg-[#E4E4E7] h-12 rounded-[10px] font-semibold text-[14px] sm:text-[15px] transition-colors disabled:opacity-50"
            >
              <Check className="w-4 h-4" strokeWidth={3} />
              Complete Task
            </button>
        </>
      </div>

    </div>
  );
}
