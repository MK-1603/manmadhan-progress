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
    const iv = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(iv);
  }, []);

  const sorted = [...tasks]
    .sort((a, b) => {
      const ta = a.scheduledStart ? new Date(a.scheduledStart).getTime() : (a.deadline ? new Date(a.deadline).getTime() : Infinity);
      const tb = b.scheduledStart ? new Date(b.scheduledStart).getTime() : (b.deadline ? new Date(b.deadline).getTime() : Infinity);
      return ta - tb;
    })
    .slice(0, 7);

  const totalMins = tasks.reduce((s, t) => s + (t.estimatedMinutes || 0), 0);
  const totalH = Math.floor(totalMins / 60);
  const totalM = totalMins % 60;

  return (
    <div className={`bg-card border border-border rounded-2xl p-5 sm:p-6 flex flex-col h-full transition-colors ${className}`}>
      <div className="flex items-center justify-between mb-5">
        <span className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-widest">
          Today's Plan
        </span>
        <Link href="/personal/tasks" className="text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors">
          View all →
        </Link>
      </div>

      <div className="flex-1 flex flex-col relative">
        {/* timeline track */}
        <div className="absolute left-[38px] top-2 bottom-2 w-px bg-border" />

        {sorted.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center pb-4 z-10 gap-3">
            <p className="text-[13px] font-semibold text-foreground">No tasks scheduled</p>
            <p className="text-[12px] text-muted-foreground">Your day is open.</p>
            <Link
              href="/personal/tasks"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-muted/40 hover:bg-muted text-foreground text-[12px] font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Plan Task
            </Link>
          </div>
        ) : (
          sorted.map((item, i) => {
            const done = item.status === "Completed" || item.status === "COMPLETED";
            const start = item.scheduledStart ? new Date(item.scheduledStart) : (item.deadline ? new Date(item.deadline) : null);
            const end   = item.scheduledEnd ? new Date(item.scheduledEnd) : (start ? addMinutes(start, item.estimatedMinutes || 30) : null);
            const isNow = !done && (item.status === "IN_PROGRESS" || (start && end && isBefore(start, now) && isAfter(end, now)));
            const timeLabel = start ? format(start, "HH:mm") : "—";

            return (
              <div key={item.id || i} className="flex items-start gap-3 mb-5 relative z-10">
                {/* time */}
                <span className={`text-[11px] font-medium w-[26px] shrink-0 pt-1 tabular-nums ${isNow ? "text-gold" : "text-muted-foreground"}`}>
                  {timeLabel}
                </span>

                {/* dot */}
                <div className="relative flex items-center justify-center w-[14px] shrink-0 pt-1.5 bg-card">
                  {done ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" strokeWidth={2.5} />
                  ) : isNow ? (
                    <Disc className="w-[13px] h-[13px] text-gold animate-pulse" />
                  ) : (
                    <Circle className="w-3 h-3 text-border" />
                  )}
                </div>

                {/* label */}
                <div className="flex-1 min-w-0 flex items-start justify-between gap-2 pt-0.5">
                  <div className="min-w-0">
                    <p className={`text-[13.5px] font-medium truncate leading-tight ${
                      done ? "line-through text-muted-foreground/50"
                      : isNow ? "text-gold"
                      : "text-foreground"
                    }`}>
                      {item.title}
                    </p>
                    <span className="text-[10px] font-semibold uppercase tracking-wider mt-0.5 block">
                      {done ? (
                        <span className="text-emerald-500">Done</span>
                      ) : isNow ? (
                        <span className="text-gold">● Now</span>
                      ) : (
                        <span className="text-muted-foreground/50">Upcoming</span>
                      )}
                    </span>
                  </div>
                  {item.estimatedMinutes ? (
                    <span className={`text-[11px] font-medium shrink-0 pt-0.5 ${done ? "text-muted-foreground/40" : "text-muted-foreground"}`}>
                      {item.estimatedMinutes}m
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="pt-4 border-t border-border flex items-center justify-between mt-auto">
        <span className="text-[12px] text-muted-foreground">Total scheduled</span>
        <span className="text-[13px] font-semibold text-foreground">
          {totalH > 0 ? `${totalH}h ` : ""}{totalM}m
        </span>
      </div>
    </div>
  );
}
