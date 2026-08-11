import React from "react";

interface TodaySummaryProps {
  totalFocusSeconds: number;
  dailyGoalSeconds: number;
  completedSessionsCount: number;
  className?: string;
}

export function TodaySummary({
  totalFocusSeconds,
  dailyGoalSeconds,
  completedSessionsCount,
  className = ""
}: TodaySummaryProps) {
  
  const formatTimeStr = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    return `${h.toString().padStart(2, "0")}h ${m.toString().padStart(2, "0")}m`;
  };

  const progressPercent = dailyGoalSeconds > 0 ? Math.min(100, Math.round((totalFocusSeconds / dailyGoalSeconds) * 100)) : 0;
  const remainingSeconds = Math.max(0, dailyGoalSeconds - totalFocusSeconds);

  return (
    <div className={`bg-[#FFFFFF] dark:bg-[#111111] border border-[#E5E7EB] dark:border-[#242424] rounded-[16px] p-5 sm:p-6 flex flex-col shadow-sm dark:shadow-none transition-colors relative w-full ${className}`}>
      <h2 className="text-[14px] font-semibold text-[#171717] dark:text-[#F5F5F5] uppercase tracking-wider mb-6">
        TODAY
      </h2>
      
      <div className="flex flex-col gap-5">
        
        {/* Focus Time */}
        <div className="flex justify-between items-end">
          <div className="flex flex-col">
            <span className="text-[13px] font-medium text-[#171717] dark:text-[#F5F5F5] mb-1">Focus time</span>
            <span className="text-[24px] font-bold text-[#171717] dark:text-[#F5F5F5] leading-none">{formatTimeStr(totalFocusSeconds)}</span>
          </div>
          
          <div className="flex flex-col text-right">
            <span className="text-[12px] font-medium text-[#52525B] dark:text-[#A1A1AA] mb-1">Goal</span>
            <span className="text-[14px] font-semibold text-[#52525B] dark:text-[#A1A1AA] leading-none">{formatTimeStr(dailyGoalSeconds)}</span>
          </div>
        </div>
        
        {/* Progress */}
        <div className="flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[12px] font-medium text-[#52525B] dark:text-[#A1A1AA]">Progress</span>
            <span className="text-[13px] font-bold text-[#171717] dark:text-[#F5F5F5]">{progressPercent}%</span>
          </div>
          <div className="w-full h-1.5 bg-[#F3F4F6] dark:bg-[#1D1D1D] rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#171717] dark:bg-[#F5F5F5] rounded-full transition-all" 
              style={{ width: `${progressPercent}%` }} 
            />
          </div>
        </div>

        <div className="h-px w-full bg-[#E5E7EB] dark:bg-[#242424]" />
        
        {/* Sessions & Remaining */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col">
            <span className="text-[12px] font-medium text-[#52525B] dark:text-[#A1A1AA] mb-1">Sessions</span>
            <span className="text-[16px] font-bold text-[#171717] dark:text-[#F5F5F5]">{completedSessionsCount}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[12px] font-medium text-[#52525B] dark:text-[#A1A1AA] mb-1">Remaining</span>
            <span className="text-[16px] font-bold text-[#171717] dark:text-[#F5F5F5]">{formatTimeStr(remainingSeconds)}</span>
          </div>
        </div>
        
      </div>
    </div>
  );
}
