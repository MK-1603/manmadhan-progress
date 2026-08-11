import React from "react";
import { Clock, CheckCircle2, Folder, Target, ArrowUp, ArrowDown } from "lucide-react";
import Link from "next/link";

interface KpiCardProps {
  title: string;
  icon: "clock" | "check" | "folder" | "score";
  href?: string;
  children: React.ReactNode;
}

function KpiCard({ title, icon, href, children }: KpiCardProps) {
  const IconComponent = {
    clock: Clock,
    check: CheckCircle2,
    folder: Folder,
    score: Target,
  }[icon];

  const content = (
    <div className={`bg-[#FFFFFF] dark:bg-[#111111] border border-[#E5E7EB] dark:border-[#242424] rounded-[12px] p-5 flex flex-col justify-between shadow-sm dark:shadow-none transition-colors h-full ${href ? "hover:bg-[#F9FAFB] dark:hover:bg-[#1A1A1A] cursor-pointer" : ""}`}>
      <div>
        <div className="flex items-center gap-2 mb-3">
          <IconComponent className="w-[18px] h-[18px] text-[#52525B] dark:text-[#A1A1AA]" strokeWidth={2} />
          <span className="text-[11px] font-bold text-[#52525B] dark:text-[#A1A1AA] uppercase tracking-wider">
            {title}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          {children}
        </div>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href} className="block h-full">{content}</Link>;
  }
  return content;
}

export function KpiGrid({ data, className = "" }: { data: any; className?: string }) {
  // Focus logic
  const focusGoalText = data.focusGoal && data.focusGoal !== "00h 00m" ? `/ ${data.focusGoal}` : "";
  const focusTrend = data.focusTrendPercent;

  // Tasks logic
  const hasTasks = data.tasksTotal > 0;
  
  // Projects logic
  const hasProjects = data.projectsActive > 0;

  // Score logic
  const hasScore = data.scoreAvailable;

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 ${className}`}>
      {/* 1. FOCUS TIME */}
      <KpiCard title="FOCUS TIME" icon="clock" href="/personal/focus">
        {data.focusTime === "00h 00m" && !focusGoalText ? (
          <>
            <div className="text-[28px] font-bold text-[#171717] dark:text-[#F5F5F5] leading-none mb-1">
              00h 00m
            </div>
            <p className="text-[13px] text-[#52525B] dark:text-[#A1A1AA]">No focus time yet</p>
          </>
        ) : (
          <>
            <div className="flex items-baseline gap-1.5 mb-1">
              <span className="text-[28px] font-bold text-[#171717] dark:text-[#F5F5F5] leading-none">
                {data.focusTime}
              </span>
              {focusGoalText && (
                <span className="text-[16px] text-[#52525B] dark:text-[#A1A1AA] font-semibold">{focusGoalText}</span>
              )}
            </div>
            <p className="text-[13px] text-[#171717] dark:text-[#F5F5F5] font-medium mb-1">Focus today</p>
            {data.focusPercent !== undefined && data.focusPercent !== null && focusGoalText ? (
              <p className="text-[13px] text-[#52525B] dark:text-[#A1A1AA] mb-2">{data.focusPercent}% of daily goal</p>
            ) : null}
            {focusTrend !== null && focusTrend !== undefined ? (
              <p className={`text-[13px] flex items-center gap-1 font-medium ${focusTrend >= 0 ? 'text-[#16A34A] dark:text-[#22C55E]' : 'text-[#EF4444] dark:text-[#F87171]'}`}>
                {focusTrend >= 0 ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
                {Math.abs(focusTrend)}% vs yesterday
              </p>
            ) : null}
          </>
        )}
      </KpiCard>

      {/* 2. TASKS */}
      <KpiCard title="TASKS" icon="check" href="/personal/tasks">
        {!hasTasks ? (
          <>
            <div className="text-[28px] font-bold text-[#171717] dark:text-[#F5F5F5] leading-none mb-1">
              0 / 0
            </div>
            <p className="text-[13px] text-[#52525B] dark:text-[#A1A1AA]">No tasks today</p>
          </>
        ) : (
          <>
            <div className="flex items-baseline gap-1.5 mb-1">
              <span className="text-[28px] font-bold text-[#171717] dark:text-[#F5F5F5] leading-none">
                {data.tasksCompleted}
              </span>
              <span className="text-[16px] text-[#52525B] dark:text-[#A1A1AA] font-semibold">/ {data.tasksTotal}</span>
            </div>
            <p className="text-[13px] text-[#171717] dark:text-[#F5F5F5] font-medium mb-2">completed today</p>
            <p className="text-[13px] text-[#52525B] dark:text-[#A1A1AA] mb-3">{data.tasksPercent}% completed</p>
            <div className="w-full h-1.5 bg-[#F3F4F6] dark:bg-[#1D1D1D] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#171717] dark:bg-[#F5F5F5] rounded-full transition-all duration-500 ease-out"
                style={{ width: `${data.tasksPercent || 0}%` }}
              />
            </div>
          </>
        )}
      </KpiCard>

      {/* 3. PROJECTS */}
      <KpiCard title="PROJECTS" icon="folder" href="/personal/projects">
        {!hasProjects ? (
          <>
            <div className="text-[28px] font-bold text-[#171717] dark:text-[#F5F5F5] leading-none mb-1">
              0 active
            </div>
            <p className="text-[13px] text-[#52525B] dark:text-[#A1A1AA]">No active projects</p>
          </>
        ) : (
          <>
            <div className="text-[28px] font-bold text-[#171717] dark:text-[#F5F5F5] leading-none mb-1">
              {data.projectsActive} active
            </div>
            <p className={`text-[13px] font-medium ${data.projectsAttention > 0 ? 'text-[#EF4444] dark:text-[#F87171]' : 'text-[#16A34A] dark:text-[#22C55E]'}`}>
              {data.projectsAttention > 0 ? `${data.projectsAttention} need attention` : "All on track"}
            </p>
            <div className="mt-4">
              <span className="text-[13px] font-medium text-[#D99A00] dark:text-[#F5B800] group-hover:underline">
                View projects →
              </span>
            </div>
          </>
        )}
      </KpiCard>

      {/* 4. TODAY'S SCORE */}
      <KpiCard title="TODAY'S SCORE" icon="score">
        {!hasScore ? (
          <>
            <p className="text-[14px] text-[#171717] dark:text-[#F5F5F5] font-semibold mb-1">Not available yet</p>
            <p className="text-[13px] text-[#52525B] dark:text-[#A1A1AA]">Complete activity to calculate score</p>
          </>
        ) : (
          <>
            <div className="flex items-baseline gap-1.5 mb-1">
              <span className="text-[28px] font-bold text-[#171717] dark:text-[#F5F5F5] leading-none">
                {data.score}
              </span>
              <span className="text-[16px] text-[#52525B] dark:text-[#A1A1AA] font-semibold">/ 100</span>
            </div>
            <p className="text-[13px] text-[#171717] dark:text-[#F5F5F5] font-medium mb-1">
              {data.score >= 80 ? "Strong execution" : data.score >= 50 ? "Steady execution" : "Needs momentum"}
            </p>
            {data.scoreTrend !== null && data.scoreTrend !== undefined ? (
              <p className={`text-[13px] flex items-center gap-1 font-medium ${data.scoreTrend >= 0 ? 'text-[#16A34A] dark:text-[#22C55E]' : 'text-[#EF4444] dark:text-[#F87171]'}`}>
                {data.scoreTrend >= 0 ? "+" : ""}{data.scoreTrend} vs yesterday
              </p>
            ) : null}
          </>
        )}
      </KpiCard>
    </div>
  );
}
