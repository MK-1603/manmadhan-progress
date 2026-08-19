"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import apiClient from "@/lib/api-client";
import {
  format, addDays, addWeeks, addMonths,
  subDays, subWeeks, subMonths, isSameDay,
} from "date-fns";
import { NumericValue } from "../../ui/numeric-value";

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

function fmtHM(mins: number) {
  if (!mins) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

function consistencyLabel(pct: number) {
  if (pct >= 90) return "Excellent";
  if (pct >= 75) return "Strong";
  if (pct >= 50) return "Building";
  if (pct >= 25) return "Early days";
  return "Getting started";
}

export function ExecutionAnalytics({ className = "" }: { className?: string }) {
  const [period, setPeriod]       = useState<Period>("week");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [data, setData]           = useState<AnalyticsData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(false);
  const [periodOpen, setPeriodOpen] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const wsId = localStorage.getItem("workspaceId") || "personal";
      const res  = await apiClient.get(
        `/dashboard/analytics/execution?workspaceId=${wsId}&period=${period}&startDate=${startDate.toISOString()}`
      );
      if (res.data.success) setData(res.data.data);
      else setError(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [period, startDate]);

  useEffect(() => { fetch(); }, [fetch]);

  const prev = () => {
    if (period === "day")   setStartDate(d => subDays(d, 1));
    if (period === "week")  setStartDate(d => subWeeks(d, 1));
    if (period === "month") setStartDate(d => subMonths(d, 1));
  };
  const next = () => {
    const n = period === "day" ? addDays(startDate, 1) : period === "week" ? addWeeks(startDate, 1) : addMonths(startDate, 1);
    if (n <= new Date()) setStartDate(n);
  };
  const atToday = isSameDay(startDate, new Date()) || startDate > new Date();

  const periodLabel = { day: "Day", week: "Week", month: "Month" }[period];

  /* ── bar chart ── */
  const renderChart = () => {
    if (!data?.graphData?.length) return null;
    const { graphData } = data;
    const maxMins   = Math.max(...graphData.map(d => Math.max(d.plannedMinutes, d.actualMinutes)), 60);
    const chartH    = 120;

    const xLabel = (d: { date: string }) => {
      const dt = new Date(d.date);
      if (period === "day")   return format(dt, "HH:mm");
      if (period === "week")  return format(dt, "EEE");
      return format(dt, "dd");
    };

    return (
      <div className="relative w-full mb-6 mt-1" style={{ height: chartH + 28 }}>
        {/* y-axis */}
        <div
          className="absolute left-0 top-0 flex flex-col justify-between text-[10px] font-medium text-muted-foreground"
          style={{ bottom: 24, width: 32 }}
        >
          <span>{Math.round(maxMins / 60)}h</span>
          <span>{Math.round(maxMins / 2 / 60)}h</span>
          <span>0h</span>
        </div>

        {/* x-axis labels */}
        <div
          className="absolute left-9 right-0 flex justify-between items-end text-[10px] font-medium text-muted-foreground"
          style={{ bottom: 0, height: 20 }}
        >
          {graphData.map((d, i) => (
            <span key={i} className="flex-1 text-center truncate">{xLabel(d)}</span>
          ))}
        </div>

        {/* bars */}
        <div
          className="absolute left-9 right-0 top-0"
          style={{ bottom: 24 }}
        >
          {graphData.map((d, i) => {
            const planned = (d.plannedMinutes / maxMins) * chartH;
            const actual  = (d.actualMinutes  / maxMins) * chartH;
            const w = period === "month" ? 3 : 10;

            return (
              <div
                key={i}
                className="absolute bottom-0 h-full flex justify-center items-end group"
                style={{ left: `${(i / graphData.length) * 100}%`, width: `${100 / graphData.length}%` }}
              >
                <div className="relative flex items-end justify-center w-full h-full">
                  {/* planned (bg) */}
                  <div
                    className="absolute bottom-0 bg-muted rounded-t-sm"
                    style={{ height: planned, width: w }}
                  />
                  {/* actual (fg) */}
                  <div
                    className="absolute bottom-0 bg-foreground rounded-t-sm z-10 transition-all duration-500"
                    style={{ height: actual, width: w }}
                  />

                  {/* tooltip */}
                  <div className={`
                    hidden group-hover:flex absolute bottom-full mb-2 z-50
                    bg-card border border-border shadow-xl rounded-xl p-3
                    flex-col text-[11px] whitespace-nowrap pointer-events-none w-[160px]
                    ${i < graphData.length / 2 ? "left-0" : "right-0"}
                  `}>
                    <span className="font-semibold text-foreground mb-1.5 pb-1.5 border-b border-border block">
                      {format(new Date(d.date), "EEE, MMM d")}
                    </span>
                    <span className="flex justify-between gap-3 mb-1">
                      <span className="text-muted-foreground">Actual</span>
                      <strong className="text-foreground">{fmtHM(d.actualMinutes)}</strong>
                    </span>
                    <span className="flex justify-between gap-3 mb-1">
                      <span className="text-muted-foreground">Planned</span>
                      <strong className="text-foreground">{fmtHM(d.plannedMinutes)}</strong>
                    </span>
                    <span className="flex justify-between gap-3 pt-1.5 mt-0.5 border-t border-border">
                      <span className="text-muted-foreground">Done</span>
                      <strong className="text-foreground">
                        {d.plannedMinutes > 0
                          ? `${Math.min(100, Math.round((d.actualMinutes / d.plannedMinutes) * 100))}%`
                          : d.actualMinutes > 0 ? "100%" : "—"}
                      </strong>
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
    <div className={`bg-card border border-border rounded-2xl p-5 sm:p-6 flex flex-col h-full transition-colors relative ${className}`}>

      {/* header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-widest">
            Execution
          </span>

          {/* period selector */}
          <div className="relative">
            <button
              onClick={() => setPeriodOpen(o => !o)}
              className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted px-2.5 py-1 rounded-lg transition-colors"
            >
              {periodLabel}
              <ChevronRight className={`w-3 h-3 transition-transform ${periodOpen ? "rotate-90" : ""}`} />
            </button>
            {periodOpen && (
              <div className="absolute top-full left-0 mt-1.5 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden w-24">
                {(["day", "week", "month"] as Period[]).map(p => (
                  <button
                    key={p}
                    onClick={() => { setPeriod(p); setPeriodOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-[12px] font-medium transition-colors
                      ${period === p
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* navigation */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={prev}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Previous period"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setStartDate(new Date())}
            className="px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
          >
            Today
          </button>
          <button
            onClick={next}
            disabled={atToday}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30"
            aria-label="Next period"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* date subtitle + legend */}
      {data && (
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[14px] font-semibold text-foreground leading-none">
              {period === "day" ? "Today" : period === "week" ? "7-day execution" : "Monthly execution"}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {period === "day"
                ? format(new Date(data.startDate), "EEEE, MMM d yyyy")
                : period === "month"
                ? format(new Date(data.startDate), "MMMM yyyy")
                : `${format(new Date(data.startDate), "MMM d")} – ${format(new Date(data.endDate), "MMM d, yyyy")}`}
            </p>
          </div>
          <div className="flex items-center gap-3 text-[10.5px] font-medium text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-foreground" />
              Actual
            </span>
            <span className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-muted" />
              Planned
            </span>
          </div>
        </div>
      )}

      {error ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <p className="text-[13px] text-red-500">Unable to load analytics.</p>
          <button
            onClick={fetch}
            className="text-[12px] font-semibold px-4 py-1.5 rounded-xl bg-muted hover:bg-muted/70 text-foreground transition-colors"
          >
            Retry
          </button>
        </div>
      ) : loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-5 h-5 rounded-full border-2 border-border border-t-gold animate-spin" />
        </div>
      ) : (
        <>
          {renderChart()}

          {/* summary row */}
          <div className="grid grid-cols-3 gap-3 mt-auto pt-4 border-t border-border">
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">Best Day</p>
              <p className="text-[13px] text-foreground truncate">
                {(data?.summary?.bestDay?.actualMinutes ?? 0) > 0
                  ? format(new Date(data!.summary.bestDay.date), "EEE")
                  : "—"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {(data?.summary?.bestDay?.actualMinutes ?? 0) > 0 ? (
                  <NumericValue size="meta" value={fmtHM(data!.summary.bestDay.actualMinutes)} />
                ) : (
                  "—"
                )}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">Average</p>
              <p className="text-[13px] text-foreground">
                {(data?.summary?.totalActualMinutes ?? 0) > 0 ? (
                  <NumericValue size="table" value={fmtHM(data!.summary.averageDailyMinutes)} />
                ) : (
                  "—"
                )}
              </p>
              <p className="text-[11px] text-muted-foreground">per day</p>
            </div>

            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">Consistency</p>
              <p className="text-[13px] text-foreground">
                {(data?.summary?.totalActualMinutes ?? 0) > 0 ? (
                  <NumericValue size="table" value={`${data!.summary.consistency}%`} />
                ) : (
                  "—"
                )}
              </p>
              <p className="text-[11px] text-muted-foreground truncate" title={
                (data?.summary?.totalActualMinutes ?? 0) > 0
                  ? consistencyLabel(data!.summary.consistency)
                  : ""
              }>
                {(data?.summary?.totalActualMinutes ?? 0) > 0 ? (
                  <><NumericValue size="meta" value={data!.summary.daysHitTarget} /> / <NumericValue size="meta" value={data!.graphData.length} /> days</>
                ) : (
                  "—"
                )}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
