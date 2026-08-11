"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, BarChart2 } from "lucide-react";
import apiClient from "@/lib/api-client";
import { format, addDays, addWeeks, addMonths, subDays, subWeeks, subMonths, isSameDay } from "date-fns";

type Period = "day" | "week" | "month";

interface AnalyticsData {
  period: Period;
  startDate: string;
  endDate: string;
  graphData: { date: string; plannedMinutes: number; actualMinutes: number }[];
  summary: {
    totalActualMinutes: number;
    averageDailyMinutes: number;
    bestDay: { date: string; actualMinutes: number };
    consistency: number;
    daysHitTarget: number;
  };
}

export function ExecutionAnalytics({ className = "" }: { className?: string }) {
  const [period, setPeriod] = useState<Period>("week");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const workspaceId = localStorage.getItem("workspaceId") || "personal";
      const res = await apiClient.get(`/dashboard/analytics/execution?workspaceId=${workspaceId}&period=${period}&startDate=${startDate.toISOString()}`);
      if (res.data.success) {
        setData(res.data.data);
      } else {
        setError(true);
      }
    } catch (e) {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [period, startDate]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handlePrevious = () => {
    if (period === "day") setStartDate(subDays(startDate, 1));
    else if (period === "week") setStartDate(subWeeks(startDate, 1));
    else setStartDate(subMonths(startDate, 1));
  };

  const handleNext = () => {
    const nextDate = period === "day" ? addDays(startDate, 1) : period === "week" ? addWeeks(startDate, 1) : addMonths(startDate, 1);
    if (nextDate > new Date()) return; // Don't navigate into future
    setStartDate(nextDate);
  };

  const formatHrsMins = (mins: number) => {
    if (mins === 0) return "0h 00m";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m.toString().padStart(2, "0")}m`;
  };

  const getConsistencyLabel = (percent: number) => {
    if (percent >= 90) return "Excellent consistency";
    if (percent >= 75) return "Strong consistency";
    if (percent >= 50) return "Good progress";
    if (percent >= 25) return "Build consistency";
    return "Let's establish a rhythm";
  };

  const renderChart = () => {
    if (!data) return null;

    const { graphData } = data;
    const maxMinutes = Math.max(...graphData.map(d => Math.max(d.plannedMinutes, d.actualMinutes)), 60);
    const chartHeight = 136; // 160 - 24

    return (
      <div className="relative h-[160px] w-full mb-6 mt-2">
        {/* Y-Axis Labels */}
        <div className="absolute left-0 top-0 bottom-6 w-8 flex flex-col justify-between text-[10px] font-medium text-[#52525B] dark:text-[#71717A]">
          <span>{Math.round(maxMinutes/60)}h</span>
          <span>{Math.round(maxMinutes/2/60)}h</span>
          <span>0h</span>
        </div>

        {/* X-Axis Labels */}
        <div className="absolute left-10 right-0 bottom-0 h-6 flex justify-between items-end text-[10px] font-medium text-[#52525B] dark:text-[#71717A]">
          {graphData.map((d, i) => (
            <span key={i} className="flex-1 text-center truncate">
              {period === "day" ? format(new Date(d.date), "HH:mm") : period === "week" ? format(new Date(d.date), "EEE") : format(new Date(d.date), "dd")}
            </span>
          ))}
        </div>

        {/* SVG Chart area */}
        <div className="absolute left-10 right-0 top-1.5 bottom-6 w-[calc(100%-40px)]">
          {graphData.map((d, i) => {
            const plannedHeight = (d.plannedMinutes / maxMinutes) * chartHeight;
            const actualHeight = (d.actualMinutes / maxMinutes) * chartHeight;
            const leftPos = (i / graphData.length) * 100;
            const barWidth = period === "month" ? "2px" : "12px";

            return (
              <div key={i} className="absolute bottom-0 h-full flex justify-center items-end group" style={{ left: `${leftPos}%`, width: `${100/graphData.length}%` }}>
                <div className="relative flex items-end justify-center w-full h-full group-hover:opacity-50 hover:!opacity-100 transition-opacity">
                  {/* Planned Bar (Background) */}
                  <div className="absolute bottom-0 bg-[#F3F4F6] dark:bg-[#1D1D1D] rounded-t-sm" style={{ height: `${plannedHeight}px`, width: barWidth }} />
                  {/* Actual Bar (Foreground) */}
                  <div className="absolute bottom-0 bg-[#171717] dark:bg-[#F5F5F5] rounded-t-sm z-10" style={{ height: `${actualHeight}px`, width: barWidth }} />
                  
                  {/* Tooltip */}
                  <div className={`hidden group-hover:flex absolute bottom-full mb-2 bg-[#171717] dark:bg-[#F5F5F5] text-white dark:text-[#080808] text-[11px] p-3 rounded-lg flex-col whitespace-nowrap z-[200] shadow-xl pointer-events-none w-[180px] ${i < graphData.length / 2 ? 'left-0' : 'right-0'}`}>
                    <span className="font-bold mb-2 border-b border-[#3f3f46] dark:border-[#d4d4d8] pb-1">
                      {format(new Date(d.date), "EEEE, MMM d")}
                    </span>
                    <span className="flex justify-between gap-4 mb-1">
                      <span className="text-[#A1A1AA] dark:text-[#52525B]">Actual</span> 
                      <strong>{formatHrsMins(d.actualMinutes)}</strong>
                    </span>
                    <span className="flex justify-between gap-4 mb-1">
                      <span className="text-[#A1A1AA] dark:text-[#52525B]">Planned</span> 
                      <strong>{formatHrsMins(d.plannedMinutes)}</strong>
                    </span>
                    <span className="flex justify-between gap-4 pt-1 mt-1 border-t border-[#3f3f46] dark:border-[#d4d4d8]">
                      <span className="text-[#A1A1AA] dark:text-[#52525B]">Completion</span> 
                      <strong>{d.plannedMinutes > 0 ? Math.min(100, Math.round((d.actualMinutes/d.plannedMinutes)*100)) : (d.actualMinutes > 0 ? 100 : 0)}%</strong>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-[#FFFFFF] dark:bg-[#141414] border border-[#E5E7EB] dark:border-[#242424] rounded-[14px] p-6 flex flex-col h-full shadow-sm dark:shadow-none transition-colors relative ${className}`}>
      
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-[13px] font-semibold text-[#171717] dark:text-[#F5F5F5] uppercase tracking-wider">
            EXECUTION
          </h2>
          <div className="relative">
            <button 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-1 text-[12px] font-medium bg-[#F7F7F5] dark:bg-[#080808] px-2 py-1 rounded-md text-[#52525B] dark:text-[#A1A1AA] hover:text-[#171717] dark:hover:text-[#F5F5F5] transition-colors"
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {dropdownOpen && (
              <div className="absolute top-full left-0 mt-1 bg-[#FFFFFF] dark:bg-[#141414] border border-[#E5E7EB] dark:border-[#242424] rounded-lg shadow-lg z-[200] w-24">
                {["day", "week", "month"].map(p => (
                  <button 
                    key={p} 
                    onClick={() => { setPeriod(p as Period); setDropdownOpen(false); }}
                    className="w-full text-left px-3 py-2 text-[12px] font-medium hover:bg-[#F3F4F6] dark:hover:bg-[#1D1D1D] text-[#171717] dark:text-[#F5F5F5] first:rounded-t-lg last:rounded-b-lg"
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button onClick={handlePrevious} className="p-1 text-[#52525B] dark:text-[#A1A1AA] hover:text-[#171717] dark:hover:text-[#F5F5F5] rounded hover:bg-[#F3F4F6] dark:hover:bg-[#1D1D1D]">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => setStartDate(new Date())} className="text-[11px] font-medium text-[#52525B] dark:text-[#A1A1AA] hover:text-[#171717] dark:hover:text-[#F5F5F5] px-2">
            Today
          </button>
          <button onClick={handleNext} disabled={isSameDay(startDate, new Date()) || startDate > new Date()} className="p-1 text-[#52525B] dark:text-[#A1A1AA] hover:text-[#171717] dark:hover:text-[#F5F5F5] rounded hover:bg-[#F3F4F6] dark:hover:bg-[#1D1D1D] disabled:opacity-30">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Date Range Subtitle */}
      {data && (
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[14px] font-semibold text-[#171717] dark:text-[#F5F5F5]">
              {period === "day" ? "Today's execution" : period === "week" ? "7-day execution" : "Monthly execution"}
            </p>
            <p className="text-[12px] text-[#52525B] dark:text-[#A1A1AA]">
              {period === "day" ? format(new Date(data.startDate), "EEEE, MMM d, yyyy") : 
               period === "month" ? format(new Date(data.startDate), "MMMM yyyy") : 
               `${format(new Date(data.startDate), "MMM d")} - ${format(new Date(data.endDate), "MMM d, yyyy")}`}
            </p>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-medium text-[#52525B] dark:text-[#A1A1AA]">
            <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-[#171717] dark:bg-[#F5F5F5]"></div> Actual</span>
            <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-[#F3F4F6] dark:bg-[#1D1D1D]"></div> Planned</span>
          </div>
        </div>
      )}

      {error ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <p className="text-[13px] text-[#EF4444] mb-3">Unable to load execution analytics.</p>
          <button onClick={fetchAnalytics} className="text-[12px] font-medium bg-[#171717] dark:bg-[#F5F5F5] text-white dark:text-[#080808] px-4 py-1.5 rounded-md">Retry</button>
        </div>
      ) : loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-[#E5E7EB] dark:border-[#242424] border-t-[#D99A00] dark:border-t-[#F5B800] rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {renderChart()}
          <div className="grid grid-cols-3 gap-2 mt-auto pt-4 border-t border-[#F3F4F6] dark:border-[#1D1D1D]">
            <div>
              <p className="text-[10px] text-[#52525B] dark:text-[#A1A1AA] uppercase font-semibold mb-1">Best Day</p>
              <p className="text-[13px] font-bold text-[#171717] dark:text-[#F5F5F5] truncate">
                {data?.summary?.bestDay?.date && (data.summary.bestDay.actualMinutes ?? 0) > 0 ? format(new Date(data.summary.bestDay.date), "EEEE") : "â€”"}
              </p>
              <p className="text-[11px] text-[#52525B] dark:text-[#A1A1AA]">
                {(data?.summary?.bestDay?.actualMinutes ?? 0) > 0 ? formatHrsMins(data!.summary.bestDay.actualMinutes) : "â€”"}
              </p>
            </div>
            
            <div>
              <p className="text-[10px] text-[#52525B] dark:text-[#A1A1AA] uppercase font-semibold mb-1">Average</p>
              <p className="text-[13px] font-bold text-[#171717] dark:text-[#F5F5F5]">
                {(data?.summary?.totalActualMinutes ?? 0) > 0 ? formatHrsMins(data!.summary.averageDailyMinutes) : "â€”"}
              </p>
              <p className="text-[11px] text-[#52525B] dark:text-[#A1A1AA]">/ day</p>
            </div>
            
            <div>
              <p className="text-[10px] text-[#52525B] dark:text-[#A1A1AA] uppercase font-semibold mb-1">Consistency</p>
              <p className="text-[13px] font-bold text-[#171717] dark:text-[#F5F5F5]">
                {(data?.summary?.totalActualMinutes ?? 0) > 0 ? `${data!.summary.consistency}%` : "â€”"}
              </p>
              <p className="text-[11px] text-[#52525B] dark:text-[#A1A1AA] truncate leading-tight" title={(data?.summary?.totalActualMinutes ?? 0) > 0 ? getConsistencyLabel(data!.summary.consistency) : ""}>
                {(data?.summary?.totalActualMinutes ?? 0) > 0 ? `${data!.summary.daysHitTarget} / ${data!.graphData.length} days` : "â€”"}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

