import React from "react";
import { Play } from "lucide-react";
import { DashboardTask } from "./today-plan";

interface NextBestActionProps {
  task?: DashboardTask | null;
  className?: string;
  isActionLoading?: boolean;
  onStartFocus?: () => void;
}

export function NextBestAction({ task, className = "", isActionLoading = false, onStartFocus }: NextBestActionProps) {
  return (
    <div className={`bg-[#FFFFFF] dark:bg-[#141414] border border-[#E5E7EB] dark:border-[#242424] rounded-[14px] p-6 flex flex-col h-full shadow-sm dark:shadow-none transition-colors ${className}`}>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[13px] font-semibold text-[#171717] dark:text-[#F5F5F5] uppercase tracking-wider">
          NEXT BEST ACTION
        </h2>
      </div>

      <div className="flex-1 flex flex-col justify-center">
        {task ? (
          <>
            <p className="text-[12px] font-semibold text-[#D99A00] dark:text-[#F5B800] uppercase tracking-wider mb-2">
              Highest-priority task
            </p>
            <h3 className="text-[20px] font-bold text-[#171717] dark:text-[#F5F5F5] leading-tight mb-4">
              {task.title}
            </h3>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-[12px] text-[#52525B] dark:text-[#A1A1AA] mb-1">Estimated:</p>
                <p className="text-[14px] font-semibold text-[#171717] dark:text-[#F5F5F5]">{task.estimatedMinutes ? `${task.estimatedMinutes} min` : "Not set"}</p>
              </div>
              <div>
                <p className="text-[12px] text-[#52525B] dark:text-[#A1A1AA] mb-1">Best focus window:</p>
                <p className="text-[14px] font-semibold text-[#171717] dark:text-[#F5F5F5]">Right now</p>
              </div>
            </div>

            <button disabled={isActionLoading} onClick={onStartFocus} className="mt-auto flex items-center justify-center gap-2 bg-[#D99A00] hover:bg-[#B77900] dark:bg-[#F5B800] dark:hover:bg-[#FFD43B] text-white dark:text-[#080808] px-5 py-2.5 rounded-lg font-semibold text-[14px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              <Play className="w-4 h-4 fill-current" />
              {isActionLoading ? "Starting..." : "Start Focus"}
            </button>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <h3 className="text-[16px] font-bold text-[#171717] dark:text-[#F5F5F5] mb-2">
              You're all caught up!
            </h3>
            <p className="text-[14px] text-[#52525B] dark:text-[#A1A1AA] mb-4">
              No pending tasks require immediate action.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
