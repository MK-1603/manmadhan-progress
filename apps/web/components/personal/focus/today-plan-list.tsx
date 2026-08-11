import React from "react";
import Link from "next/link";
import { CheckCircle2, Circle, Clock, Plus } from "lucide-react";

interface TodayPlanListProps {
  tasks: any[];
  className?: string;
}

export function TodayPlanList({ tasks, className = "" }: TodayPlanListProps) {
  return (
    <div className={`bg-[#FFFFFF] dark:bg-[#111111] border border-[#E5E7EB] dark:border-[#242424] rounded-[16px] p-5 sm:p-6 flex flex-col shadow-sm dark:shadow-none transition-colors relative w-full ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[14px] font-semibold text-[#171717] dark:text-[#F5F5F5] uppercase tracking-wider">
          TODAY'S PLAN
        </h2>
        <Link href="/personal/tasks" className="text-[13px] font-medium text-[#52525B] dark:text-[#A1A1AA] hover:text-[#171717] dark:hover:text-[#F5F5F5] transition-colors">
          View all
        </Link>
      </div>

      <div className="flex flex-col gap-2">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-5">
            <div className="w-9 h-9 rounded-full bg-[#F3F4F6] dark:bg-[#1D1D1D] flex items-center justify-center mb-3">
              <Plus className="w-4 h-4 text-[#71717A]" />
            </div>
            <h3 className="text-[14px] sm:text-[15px] font-semibold text-[#171717] dark:text-[#F5F5F5] mb-2">
              Nothing planned yet
            </h3>
            <p className="text-[13px] text-[#71717A] dark:text-[#A1A1AA]">Add your first task to today's plan.</p>
            <Link 
              href="/personal/tasks" 
              className="flex items-center gap-2 mt-4 bg-[#171717] dark:bg-[#F5F5F5] text-white dark:text-[#080808] hover:bg-[#27272A] dark:hover:bg-[#E4E4E7] h-10 px-4 rounded-[8px] font-semibold text-[13px] transition-colors"
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
              Create Task
            </Link>
          </div>
        ) : (
          tasks.map(task => {
            const isCompleted = task.status === "Completed";
            return (
              <div key={task.id} className="flex items-start gap-3 p-3 sm:p-4 rounded-[12px] bg-[#F7F7F5] dark:bg-[#1A1A1A] border border-[#E5E7EB] dark:border-[#242424] group cursor-pointer hover:border-[#A1A1AA] dark:hover:border-[#52525B] transition-colors min-h-[44px]">
                {isCompleted ? (
                  <CheckCircle2 className="w-[18px] h-[18px] text-[#16A34A] dark:text-[#22C55E] shrink-0 mt-0.5" />
                ) : (
                  <Circle className="w-[18px] h-[18px] text-[#A1A1AA] dark:text-[#52525B] group-hover:text-[#171717] dark:group-hover:text-[#F5F5F5] shrink-0 mt-0.5" />
                )}
                
                <div className="flex-1 min-w-0">
                  <h4 className={`text-[14px] font-bold truncate leading-snug mb-0.5 ${isCompleted ? 'text-[#52525B] dark:text-[#A1A1AA] line-through' : 'text-[#171717] dark:text-[#F5F5F5]'}`}>
                    {task.title}
                  </h4>
                  <p className="text-[12px] text-[#52525B] dark:text-[#A1A1AA] truncate">
                    {task.project?.name || "Personal"}
                  </p>
                </div>
                
                <div className="flex items-center gap-1.5 text-[#52525B] dark:text-[#A1A1AA] shrink-0">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="text-[12px] font-medium">{task.estimatedMinutes ? `${task.estimatedMinutes} min` : "--"}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
