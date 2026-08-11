import React from "react";
import { Play, LoaderCircle } from "lucide-react";
import { DashboardTask } from "./today-plan";

interface NextBestActionProps {
  task?: DashboardTask | null;
  className?: string;
  isActionLoading?: boolean;
  onStartFocus?: () => void;
}

export function NextBestAction({ task, className = "", isActionLoading = false, onStartFocus }: NextBestActionProps) {
  return (
    <div className={`bg-card border border-border rounded-2xl p-5 sm:p-6 flex flex-col h-full transition-colors ${className}`}>
      <span className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-widest mb-5 block">
        Next Best Action
      </span>

      <div className="flex-1 flex flex-col justify-center">
        {task ? (
          <>
            <p className="text-[11px] font-semibold text-gold uppercase tracking-widest mb-2">
              Highest priority
            </p>
            <h3 className="text-[20px] sm:text-[22px] font-bold text-foreground leading-tight mb-5">
              {task.title}
            </h3>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-[11px] text-muted-foreground mb-1 uppercase tracking-wide font-semibold">Estimated</p>
                <p className="text-[14px] font-semibold text-foreground">
                  {task.estimatedMinutes ? `${task.estimatedMinutes} min` : "Not set"}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground mb-1 uppercase tracking-wide font-semibold">Best window</p>
                <p className="text-[14px] font-semibold text-foreground">Right now</p>
              </div>
            </div>

            <button
              disabled={isActionLoading}
              onClick={onStartFocus}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gold hover:bg-gold-hover text-white text-[14px] font-semibold transition-colors disabled:opacity-50 mt-auto"
            >
              {isActionLoading
                ? <LoaderCircle className="w-4 h-4 animate-spin" />
                : <Play className="w-4 h-4 fill-current" />}
              {isActionLoading ? "Starting…" : "Start Focus"}
            </button>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-2">
            <p className="text-[15px] font-semibold text-foreground">All caught up</p>
            <p className="text-[13px] text-muted-foreground">No pending tasks require immediate action.</p>
          </div>
        )}
      </div>
    </div>
  );
}
