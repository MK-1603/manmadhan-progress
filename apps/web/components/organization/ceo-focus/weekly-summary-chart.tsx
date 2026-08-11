"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface WeeklySummaryChartProps {
  weeklyData: {
    weekStart: string;
    weekEnd: string;
    days: Array<{
      day: string;
      seconds: number;
      formattedHours: string;
    }>;
    totalWeeklySeconds: number;
  } | null;
  weekOffset: number;
  onChangeWeekOffset: (newOffset: number) => void;
}

function formatHours(seconds: number) {
  if (!seconds || seconds <= 0) return "0h";
  const hrs = (seconds / 3600).toFixed(1);
  return `${hrs}h`;
}

export function WeeklySummaryChart({
  weeklyData,
  weekOffset,
  onChangeWeekOffset,
}: WeeklySummaryChartProps) {
  const days = weeklyData?.days || [
    { day: "MON", seconds: 0, formattedHours: "0h" },
    { day: "TUE", seconds: 0, formattedHours: "0h" },
    { day: "WED", seconds: 0, formattedHours: "0h" },
    { day: "THU", seconds: 0, formattedHours: "0h" },
    { day: "FRI", seconds: 0, formattedHours: "0h" },
    { day: "SAT", seconds: 0, formattedHours: "0h" },
    { day: "SUN", seconds: 0, formattedHours: "0h" },
  ];

  const maxSeconds = Math.max(...days.map((d) => d.seconds), 3600 * 4); // default scale min 4h

  return (
    <div className="space-y-4">
      {/* Header controls */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-foreground">Weekly Deep Work Time</span>
          {weeklyData && (
            <p className="text-[11px] text-muted-foreground">
              Total: <strong className="text-foreground">{formatHours(weeklyData.totalWeeklySeconds)}</strong>
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onChangeWeekOffset(weekOffset - 1)}
            className="p-1.5 border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            title="Previous Week"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-semibold text-foreground px-2">
            {weekOffset === 0 ? "This Week" : weekOffset === -1 ? "Previous Week" : `${Math.abs(weekOffset)} Weeks Ago`}
          </span>
          <button
            disabled={weekOffset >= 0}
            onClick={() => onChangeWeekOffset(weekOffset + 1)}
            className="p-1.5 border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-30 transition-colors"
            title="Next Week"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="grid grid-cols-7 gap-2 pt-2 items-end h-[140px] px-2 bg-muted/20 border border-border rounded-xl">
        {days.map((d) => {
          const heightPct = maxSeconds > 0 ? Math.round((d.seconds / maxSeconds) * 100) : 0;
          return (
            <div key={d.day} className="flex flex-col items-center gap-1.5 h-full justify-end group">
              <span className="text-[10px] font-mono font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                {d.seconds > 0 ? formatHours(d.seconds) : "-"}
              </span>

              <div className="w-full max-w-[28px] bg-muted/50 rounded-t-lg h-[90px] flex items-end overflow-hidden">
                <div
                  className={`w-full rounded-t-lg transition-all duration-500 ${
                    d.seconds > 0 ? "bg-primary hover:bg-primary/90" : "bg-transparent"
                  }`}
                  style={{ height: `${Math.max(heightPct, d.seconds > 0 ? 8 : 0)}%` }}
                />
              </div>

              <span className="text-[10px] font-bold text-muted-foreground uppercase">
                {d.day}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
