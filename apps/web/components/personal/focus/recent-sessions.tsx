import React from "react";
import Link from "next/link";
import { format } from "date-fns";
import { History, Play } from "lucide-react";

interface RecentSessionsProps {
  sessions: any[];
  className?: string;
}

export function RecentSessions({ sessions, className = "" }: RecentSessionsProps) {
  const formatTimeStr = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <div className={`bg-[#FFFFFF] dark:bg-[#111111] border border-[#E5E7EB] dark:border-[#242424] rounded-[16px] p-5 sm:p-6 flex flex-col shadow-sm dark:shadow-none transition-colors relative w-full ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[14px] font-semibold text-[#171717] dark:text-[#F5F5F5] uppercase tracking-wider">
          FOCUS HISTORY
        </h2>
        <Link href="/personal/reports" className="text-[13px] font-medium text-[#52525B] dark:text-[#A1A1AA] hover:text-[#171717] dark:hover:text-[#F5F5F5] transition-colors">
          View all
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-5">
            <History className="w-8 h-8 text-[#A1A1AA] dark:text-[#52525B] mb-3 opacity-50" />
            <p className="text-[13px] text-[#52525B] dark:text-[#A1A1AA]">No recent focus sessions.</p>
          </div>
        ) : (
          sessions.map((session, i) => (
            <div key={session.id || i} className="flex items-center justify-between p-3 rounded-[10px] bg-[#F7F7F5] dark:bg-[#1A1A1A] border border-[#E5E7EB] dark:border-[#242424] min-h-[44px]">
              
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-[#171717] dark:bg-[#F5F5F5] flex items-center justify-center shrink-0">
                  <Play className="w-3.5 h-3.5 text-white dark:text-[#080808] fill-current ml-0.5" />
                </div>
                
                <div className="flex flex-col min-w-0">
                  <h4 className="text-[14px] font-bold text-[#171717] dark:text-[#F5F5F5] truncate leading-snug mb-0.5">
                    {session.task?.title || "Focus session"}
                  </h4>
                  <p className="text-[12px] text-[#52525B] dark:text-[#A1A1AA] truncate">
                    {session.finishedAt ? format(new Date(session.finishedAt), "MMM d, h:mm a") : "Unknown date"}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-end shrink-0 pl-4">
                <span className="text-[14px] font-bold text-[#171717] dark:text-[#F5F5F5]">
                  {formatTimeStr(session.activeDuration || 0)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
