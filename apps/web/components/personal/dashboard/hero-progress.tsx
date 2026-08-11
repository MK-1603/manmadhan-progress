import React, { useState, useEffect } from "react";
import { Play, Pause, Check, LoaderCircle, Timer } from "lucide-react";
import { format } from "date-fns";

export type TimerState = "IDLE" | "RUNNING" | "PAUSED" | "COMPLETED";

interface HeroProgressProps {
  focusTime: string;
  focusGoal: string;
  focusPercent: number;
  trendPercent: number;
  trendText?: string;
  currentTaskTitle: string | null;
  currentProjectName: string | null;
  timerState: TimerState;
  startedAt?: Date | null;
  resumedAt?: Date | null;
  accumulatedDuration?: number;
  upcomingTask?: any | null;
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
    const calc = () => {
      let active = accumulatedDuration;
      if (timerState === "RUNNING") {
        const last = resumedAt ? new Date(resumedAt).getTime() : (startedAt ? new Date(startedAt).getTime() : Date.now());
        active += Math.max(0, Math.floor((Date.now() - last) / 1000));
      }
      setElapsedSeconds(active);
    };
    calc();
    let iv: NodeJS.Timeout;
    if (timerState === "RUNNING") iv = setInterval(calc, 1000);
    return () => clearInterval(iv);
  }, [timerState, startedAt, resumedAt, accumulatedDuration]);

  const formatElapsed = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const capped = Math.min(100, Math.max(0, focusPercent));
  const hasData = focusTime !== "00h 00m";

  return (
    <div className={`
      bg-card border border-border rounded-2xl p-5 sm:p-6
      flex flex-col justify-between
      transition-colors ${className}
    `}>
      {/* ── Progress section ── */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-widest">
            Today's Progress
          </span>
          <span className="text-[11px] text-muted-foreground">
            {format(new Date(), "dd MMM yyyy")}
          </span>
        </div>

        <div className="flex items-baseline justify-between mb-1.5">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[30px] sm:text-[34px] font-bold text-foreground leading-none tracking-tight">
              {focusTime}
            </span>
            {focusGoal && focusGoal !== "00h 00m" && (
              <span className="text-[15px] text-muted-foreground font-medium">/ {focusGoal}</span>
            )}
          </div>
          <span className="text-[22px] font-bold text-foreground">{focusPercent}%</span>
        </div>

        <p className="text-[12px] text-muted-foreground mb-4">
          {hasData
            ? focusPercent > 100 ? "Daily goal exceeded" : "Focus time logged"
            : "No focus time recorded yet today"}
        </p>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gold rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${capped}%` }}
          />
        </div>
      </div>

      {/* ── Current focus section ── */}
      <div>
        <span className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-widest block mb-4">
          Current Focus
        </span>

        {currentTaskTitle ? (
          /* RUNNING / PAUSED */
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="text-[16px] sm:text-[18px] font-semibold text-foreground leading-tight truncate">
                {currentTaskTitle}
              </h3>
              {currentProjectName && (
                <p className="text-[12px] text-muted-foreground mt-0.5 truncate">{currentProjectName}</p>
              )}
            </div>

            <div className="flex items-center gap-2 font-mono text-[13px]">
              {timerState === "RUNNING" && (
                <span className="flex items-center gap-2 text-foreground">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mr-1">Live</span>
                  {formatElapsed(elapsedSeconds)}
                </span>
              )}
              {timerState === "PAUSED" && (
                <span className="flex items-center gap-2 text-foreground">
                  <span className="w-2 h-2 rounded-full bg-gold" />
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mr-1">Paused</span>
                  {formatElapsed(elapsedSeconds)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {(timerState === "RUNNING" || timerState === "IDLE") && (
                <button
                  disabled={isActionLoading}
                  onClick={onPause}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-border bg-muted/50 hover:bg-muted text-foreground text-[13px] font-semibold transition-colors disabled:opacity-50"
                >
                  {isActionLoading ? <LoaderCircle className="w-3.5 h-3.5 animate-spin" /> : <Pause className="w-3.5 h-3.5" />}
                  {isActionLoading ? "Pausing…" : "Pause"}
                </button>
              )}
              {timerState === "PAUSED" && (
                <button
                  disabled={isActionLoading}
                  onClick={onResume}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gold hover:bg-gold-hover text-white text-[13px] font-semibold transition-colors disabled:opacity-50"
                >
                  {isActionLoading ? <LoaderCircle className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  {isActionLoading ? "Resuming…" : "Resume"}
                </button>
              )}
              <button
                disabled={isActionLoading}
                onClick={onComplete}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[13px] font-semibold transition-colors disabled:opacity-50"
              >
                {isActionLoading ? <LoaderCircle className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                {isActionLoading ? "Completing…" : "Complete"}
              </button>
            </div>
          </div>
        ) : upcomingTask ? (
          /* UPCOMING TASK */
          <div className="flex flex-col gap-4">
            <p className="text-[13px] text-muted-foreground">No active focus session.</p>
            <div className="pl-3 border-l-2 border-border">
              <p className="text-[11px] font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Up next</p>
              <h3 className="text-[14px] font-semibold text-foreground truncate">{upcomingTask.title}</h3>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                {upcomingTask.scheduledStart ? format(new Date(upcomingTask.scheduledStart), "HH:mm") : "Anytime"}
                {upcomingTask.estimatedMinutes ? ` · ${upcomingTask.estimatedMinutes} min` : ""}
              </p>
            </div>
            <button
              disabled={isActionLoading}
              onClick={onStart}
              className="self-start flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gold hover:bg-gold-hover text-white text-[13px] font-semibold transition-colors disabled:opacity-50"
            >
              {isActionLoading ? <LoaderCircle className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              {isActionLoading ? "Starting…" : "Start Focus"}
            </button>
          </div>
        ) : (
          /* IDLE */
          <div className="flex flex-col gap-3">
            <p className="text-[13px] text-muted-foreground">No active focus session.</p>
            <p className="text-[12px] text-muted-foreground">No tasks are scheduled for the current period.</p>
            <button
              onClick={() => window.location.href = "/personal/tasks"}
              className="self-start flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-muted/40 hover:bg-muted text-foreground text-[13px] font-semibold transition-colors"
            >
              Create Task
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
