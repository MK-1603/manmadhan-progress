"use client";

import { Play, Pause, Square, Timer } from "lucide-react";

interface Stopwatch3DProps {
  elapsedSeconds: number;
  status: "Idle" | "Active" | "Paused" | "Completed" | "Interrupted" | "SYSTEM_STOPPED";
  onStart?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onEnd?: () => void;
  actionLoading?: boolean;
  isSystemActive?: boolean;
}

function formatDigits(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return {
    hours: pad(h),
    minutes: pad(m),
    seconds: pad(s),
  };
}

export function Stopwatch3D({
  elapsedSeconds,
  status,
  onStart,
  onPause,
  onResume,
  onEnd,
  actionLoading = false,
  isSystemActive = true,
}: Stopwatch3DProps) {
  const { hours, minutes, seconds } = formatDigits(elapsedSeconds);
  const statusLabel = status === "Active" ? "In progress" : status === "Paused" ? "Paused" : status === "SYSTEM_STOPPED" ? "System stopped" : "Ready";
  const statusTone = status === "Active" ? "text-emerald-600 dark:text-emerald-400" : status === "Paused" ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground";

  return (
    <div className="w-full max-w-[420px] mx-auto rounded-2xl border border-border bg-card p-5 sm:p-6 select-none">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <Timer className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Execution time</span>
        </div>
        <span className={`text-xs font-semibold ${statusTone}`}>{statusLabel}</span>
      </div>
      <div className="py-10 text-center">
        <div className="font-mono text-5xl sm:text-6xl font-semibold tracking-tight text-foreground tabular-nums">
          {hours}:{minutes}:{seconds}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Tracked against the current work session</p>
      </div>

      {/* Primary Action Buttons Bar */}
      <div className="flex items-center justify-center gap-2 w-full">
        {status === "Idle" && (
          <button
            onClick={onStart}
            disabled={actionLoading || !isSystemActive}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-primary-foreground" /> START FOCUS
          </button>
        )}

        {status === "Active" && (
          <>
            <button
              onClick={onPause}
              disabled={actionLoading}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-amber-500 text-black font-semibold text-sm rounded-lg hover:bg-amber-500/90 disabled:opacity-50 transition-colors"
            >
              <Pause className="w-3.5 h-3.5 text-black fill-black" /> Pause
            </button>
            <button
              onClick={onEnd}
              disabled={actionLoading}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-card border border-border text-sm font-semibold text-foreground rounded-lg hover:bg-muted disabled:opacity-50 transition-colors"
            >
              <Square className="w-3.5 h-3.5 text-rose-500 fill-rose-500/20" /> End
            </button>
          </>
        )}

        {status === "Paused" && (
          <>
            <button
              onClick={onResume}
              disabled={actionLoading || !isSystemActive}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-primary-foreground" /> Resume
            </button>
            <button
              onClick={onEnd}
              disabled={actionLoading}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-card border border-border text-sm font-semibold text-foreground rounded-lg hover:bg-muted disabled:opacity-50 transition-colors"
            >
              <Square className="w-3.5 h-3.5 text-rose-500 fill-rose-500/20" /> End
            </button>
          </>
        )}
      </div>
    </div>
  );
}
