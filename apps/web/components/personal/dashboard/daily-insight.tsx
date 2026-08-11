import React from "react";
import { Target, Play } from "lucide-react";

export function DailyInsight() {
  return (
    <div className="bg-[#FFFFFF] dark:bg-[#141414] border border-[#E5E7EB] dark:border-[#242424] rounded-2xl p-6 flex flex-col shadow-sm dark:shadow-none transition-colors">
      <div className="flex items-center gap-2 mb-4">

        <h2 className="text-[13px] font-semibold text-[#171717] dark:text-[#F5F5F5] uppercase tracking-wider">
          DAILY INSIGHT
        </h2>
      </div>

      <p className="text-[14px] text-[#52525B] dark:text-[#A1A1AA] mb-4 leading-relaxed">
        You planned <span className="font-semibold text-[#171717] dark:text-[#F5F5F5]">6 hours</span> today and currently have <span className="font-semibold text-[#D99A00] dark:text-[#F5B800]">3h 26m</span> remaining.
      </p>

      <div className="bg-[#FAFAF9] dark:bg-[#181818] border border-[#E5E7EB] dark:border-[#242424] rounded-xl p-4 mb-4">
        <p className="text-[12px] font-medium text-[#52525B] dark:text-[#A1A1AA] mb-2">
          Your highest-priority task is:
        </p>
        <div className="flex items-center gap-3">
          <Target className="w-5 h-5 text-[#D99A00] dark:text-[#F5B800]" />
          <div>
            <p className="text-[14px] font-bold text-[#171717] dark:text-[#F5F5F5]">
              Database architecture
            </p>
            <p className="text-[12px] text-[#52525B] dark:text-[#A1A1AA]">
              Estimated: 90 min
            </p>
          </div>
        </div>
      </div>

      <p className="text-[13px] text-[#52525B] dark:text-[#A1A1AA] mb-6">
        You usually perform best between<br />
        <span className="font-semibold text-[#171717] dark:text-[#F5F5F5]">7:00 PM – 9:00 PM.</span>
      </p>

      <button className="flex items-center justify-center gap-2 w-full bg-[#D99A00] hover:bg-[#B77900] dark:bg-[#F5B800] dark:hover:bg-[#FFD43B] text-white dark:text-[#080808] py-2.5 rounded-lg font-semibold text-[14px] transition-colors mt-auto">
        <Play className="w-4 h-4 fill-current" />
        Start Focus
      </button>
    </div>
  );
}
