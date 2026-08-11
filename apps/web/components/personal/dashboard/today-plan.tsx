import React, { useState, useEffect } from "react";
import { format, isBefore, isAfter, addMinutes } from "date-fns";
import { Check, Circle, Disc, Plus } from "lucide-react";
import Link from "next/link";

export interface DashboardTask {
  id: string;
  title: string;
  status: string;
  estimatedMinutes?: number;
  scheduledStart?: string | Date | null;
  scheduledEnd?: string | Date | null;
  deadline?: string | Date | null;
}

interface TodayPlanProps {
  tasks?: DashboardTask[];
  className?: string;
}

export function TodayPlan({ tasks = [], className = "" }: TodayPlanProps) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000); // update every minute to re-eval NOW/Upcoming
    return () => clearInterval(interval);
  }, []);

  // Filter out completed if we have too many, or just sort them
  const sortedTasks = [...tasks].sort((a, b) => {
    const tA = a.scheduledStart ? new Date(a.scheduledStart).getTime() : (a.deadline ? new Date(a.deadline).getTime() : Infinity);
    const tB = b.scheduledStart ? new Date(b.scheduledStart).getTime() : (b.deadline ? new Date(b.deadline).getTime() : Infinity);
    return tA - tB;
  }).slice(0, 7); // Show max 7 on dashboard

  const totalMinutes = tasks.reduce((acc, t) => acc + (t.estimatedMinutes || 0), 0);
  const totalH = Math.floor(totalMinutes / 60);
  const totalM = totalMinutes % 60;

  return (
    <div className={`bg-[#FFFFFF] dark:bg-[#141414] border border-[#E5E7EB] dark:border-[#242424] rounded-[14px] p-6 flex flex-col h-full shadow-sm dark:shadow-none transition-colors ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[13px] font-semibold text-[#171717] dark:text-[#F5F5F5] uppercase tracking-wider">
          TODAY'S PLAN
        </h2>
        <Link href="/personal/tasks" className="text-[12px] font-medium text-[#52525B] dark:text-[#A1A1AA] hover:text-[#171717] dark:hover:text-[#F5F5F5] transition-colors">
          View all →
        </Link>
      </div>

      <div className="flex-1 flex flex-col relative">
        {/* Timeline track */}
        <div className="absolute left-[39px] top-2 bottom-2 w-px bg-[#E5E7EB] dark:bg-[#242424]" />

        {sortedTasks.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center pb-4 z-10">
            <h3 className="text-[14px] font-bold text-[#171717] dark:text-[#F5F5F5] mb-2">
              No tasks scheduled
            </h3>
            <p className="text-[12px] text-[#52525B] dark:text-[#A1A1AA] mb-4">
              Your day is completely open.
            </p>
            <Link href="/personal/tasks" className="flex items-center gap-2 bg-[#FAFAF9] hover:bg-[#F3F4F6] dark:bg-[#1D1D1D] dark:hover:bg-[#242424] text-[#171717] dark:text-[#F5F5F5] border border-[#E5E7EB] dark:border-[#3f3f46] px-4 py-2 rounded-lg font-medium text-[12px] transition-colors">
              <Plus className="w-3.5 h-3.5" />
              Plan Task
            </Link>
          </div>
        ) : (
          sortedTasks.map((item, i) => {
            const isCompleted = item.status === "Completed" || item.status === "COMPLETED";
            
            let itemStart = item.scheduledStart ? new Date(item.scheduledStart) : (item.deadline ? new Date(item.deadline) : null);
            let itemEnd = item.scheduledEnd ? new Date(item.scheduledEnd) : (itemStart ? addMinutes(itemStart, item.estimatedMinutes || 30) : null);
            
            let isNow = false;
            if (!isCompleted && itemStart && itemEnd) {
              isNow = isBefore(itemStart, now) && isAfter(itemEnd, now);
            } else if (!isCompleted && item.status === "IN_PROGRESS") {
              isNow = true;
            }

            const timeLabel = itemStart ? format(itemStart, "HH:mm") : "--:--";

            return (
              <div key={item.id || i} className="flex items-start gap-4 mb-5 relative z-10">
                <div className={`text-[13px] font-medium w-[24px] shrink-0 pt-0.5 ${isNow ? "text-[#D99A00] dark:text-[#F5B800]" : "text-[#52525B] dark:text-[#A1A1AA]"}`}>
                  {timeLabel}
                </div>
                
                {/* Timeline dot */}
                <div className="relative flex items-center justify-center w-[14px] shrink-0 pt-1.5 bg-[#FFFFFF] dark:bg-[#141414]">
                  {isCompleted ? (
                    <Check className="w-4 h-4 text-[#16A34A] dark:text-[#22C55E]" />
                  ) : isNow ? (
                    <Disc className="w-[14px] h-[14px] text-[#D99A00] dark:text-[#F5B800] animate-pulse" />
                  ) : (
                    <Circle className="w-3 h-3 text-[#E5E7EB] dark:text-[#242424]" />
                  )}
                </div>

                <div className="flex-1 min-w-0 flex items-start justify-between gap-2 pt-0.5">
                  <div className="flex flex-col min-w-0">
                    <p className={`text-[14px] font-medium truncate ${isCompleted ? "line-through text-[#A1A1AA] dark:text-[#52525B]" : (isNow ? "text-[#D99A00] dark:text-[#F5B800]" : "text-[#171717] dark:text-[#F5F5F5]")}`}>
                      {item.title}
                    </p>
                    <span className="text-[11px] font-semibold mt-0.5 tracking-wider uppercase">
                      {isCompleted ? (
                        <span className="text-[#16A34A] dark:text-[#22C55E]">Completed</span>
                      ) : isNow ? (
                        <span className="text-[#D99A00] dark:text-[#F5B800]">● Now</span>
                      ) : (
                        <span className="text-[#71717A] dark:text-[#71717A]">○ Upcoming</span>
                      )}
                    </span>
                  </div>
                  <span className={`text-[12px] font-medium shrink-0 pt-0.5 ${isCompleted ? "text-[#A1A1AA] dark:text-[#52525B]" : "text-[#52525B] dark:text-[#A1A1AA]"}`}>
                    {item.estimatedMinutes ? `${item.estimatedMinutes}m` : ""}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-auto pt-4 border-t border-[#E5E7EB] dark:border-[#242424] flex items-center justify-between">
        <span className="text-[13px] font-medium text-[#52525B] dark:text-[#A1A1AA]">
          Total Scheduled
        </span>
        <span className="text-[14px] font-semibold text-[#171717] dark:text-[#F5F5F5]">
          {totalH > 0 && `${totalH}h `}{totalM}m
        </span>
      </div>
    </div>
  );
}
