import React from "react";
import { Clock, CheckCircle2, Folder, Target, ArrowUp, ArrowDown } from "lucide-react";
import Link from "next/link";
import { NumericValue } from "../../ui/numeric-value";

interface KpiCardProps {
  title: string;
  icon: React.ElementType;
  href?: string;
  children: React.ReactNode;
}

function KpiCard({ title, icon: Icon, href, children }: KpiCardProps) {
  const inner = (
    <div className={`
      bg-card border border-border rounded-2xl p-5 flex flex-col h-full
      transition-colors
      ${href ? "hover:bg-surface-hover cursor-pointer" : ""}
    `}>
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-[16px] h-[16px] text-muted-foreground" strokeWidth={2} />
        <span className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-widest">
          {title}
        </span>
      </div>
      <div className="flex flex-col gap-1 flex-1">{children}</div>
    </div>
  );
  return href ? <Link href={href} className="block h-full">{inner}</Link> : inner;
}

export function KpiGrid({ data, className = "" }: { data: any; className?: string }) {
  const focusGoalText = data.focusGoal && data.focusGoal !== "00h 00m" ? `/ ${data.focusGoal}` : "";
  const focusTrend    = data.focusTrendPercent;
  const hasTasks      = data.tasksTotal > 0;
  const hasProjects   = data.projectsActive > 0;
  const hasScore      = data.scoreAvailable;

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 ${className}`}>

      {/* FOCUS TIME */}
      <KpiCard title="Focus Time" icon={Clock} href="/personal/focus">
        {data.focusTime === "00h 00m" && !focusGoalText ? (
          <>
            <NumericValue size="card" className="text-foreground leading-none" value="00h 00m" />
            <p className="text-[12px] text-muted-foreground mt-1">No focus time yet</p>
          </>
        ) : (
          <>
            <div className="flex items-baseline gap-1.5">
              <NumericValue size="card" className="text-foreground leading-none" value={data.focusTime} />
              {focusGoalText && (
                <NumericValue size="table" className="text-muted-foreground" value={focusGoalText} />
              )}
            </div>
            <p className="text-[12px] text-muted-foreground mt-1">Focus today</p>
            {data.focusPercent != null && focusGoalText && (
              <p className="text-[12px] text-foreground font-medium mt-0.5">
                <NumericValue size="meta" value={`${data.focusPercent}%`} /> of goal
              </p>
            )}
            {focusTrend != null && (
              <p className={`text-[12px] flex items-center gap-1 font-medium mt-1 ${focusTrend >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                {focusTrend >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                <NumericValue size="meta" value={`${Math.abs(focusTrend)}%`} /> vs yesterday
              </p>
            )}
          </>
        )}
      </KpiCard>

      {/* TASKS */}
      <KpiCard title="Tasks" icon={CheckCircle2} href="/personal/tasks">
        {!hasTasks ? (
          <>
            <NumericValue size="card" className="text-foreground leading-none" value="0 / 0" />
            <p className="text-[12px] text-muted-foreground mt-1">No tasks today</p>
          </>
        ) : (
          <>
            <div className="flex items-baseline gap-1.5">
              <NumericValue size="card" className="text-foreground leading-none" value={data.tasksCompleted} />
              <NumericValue size="table" className="text-muted-foreground" value={`/ ${data.tasksTotal}`} />
            </div>
            <p className="text-[12px] text-muted-foreground mt-1">Completed today</p>
            {data.tasksPercent != null && (
              <>
                <p className="text-[12px] text-foreground font-medium mt-0.5">
                  <NumericValue size="meta" value={`${data.tasksPercent}%`} /> done
                </p>
                <div className="mt-2 w-full h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-foreground rounded-full transition-all duration-500"
                    style={{ width: `${data.tasksPercent}%` }}
                  />
                </div>
              </>
            )}
          </>
        )}
      </KpiCard>

      {/* PROJECTS */}
      <KpiCard title="Projects" icon={Folder} href="/personal/projects">
        {!hasProjects ? (
          <>
            <NumericValue size="card" className="text-foreground leading-none" value={0} />
            <p className="text-[12px] text-muted-foreground mt-1">No active projects</p>
          </>
        ) : (
          <>
            <NumericValue size="card" className="text-foreground leading-none" value={data.projectsActive} />
            <p className="text-[12px] text-muted-foreground mt-1">Active projects</p>
            <p className={`text-[12px] font-medium mt-0.5 ${data.projectsAttention > 0 ? "text-red-500" : "text-emerald-600 dark:text-emerald-400"}`}>
              {data.projectsAttention > 0 ? (
                <><NumericValue size="meta" value={data.projectsAttention} /> need attention</>
              ) : (
                "All on track"
              )}
            </p>
          </>
        )}
      </KpiCard>

      {/* TODAY'S SCORE */}
      <KpiCard title="Today's Score" icon={Target}>
        {!hasScore ? (
          <>
            <p className="text-[13px] text-foreground font-semibold mt-1">Not yet available</p>
            <p className="text-[12px] text-muted-foreground mt-1">Complete activity to generate score</p>
          </>
        ) : (
          <>
            <div className="flex items-baseline gap-1.5">
              <NumericValue size="card" className="text-foreground leading-none" value={data.score} />
              <NumericValue size="table" className="text-muted-foreground" value="/ 100" />
            </div>
            <p className="text-[12px] text-muted-foreground mt-1">
              {data.score >= 80 ? "Strong execution" : data.score >= 50 ? "Steady execution" : "Needs momentum"}
            </p>
            {data.scoreTrend != null && (
              <p className={`text-[12px] flex items-center gap-1 font-medium mt-0.5 ${data.scoreTrend >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                <NumericValue size="meta" value={`${data.scoreTrend >= 0 ? "+" : ""}${data.scoreTrend}`} /> vs yesterday
              </p>
            )}
          </>
        )}
      </KpiCard>

    </div>
  );
}

