"use client";

import React, { useEffect, useState, useCallback } from "react";
import apiClient from "@/lib/api-client";
import { LoaderCircle, BarChart2, Clock, CheckCircle2, AlertTriangle, Target, TrendingUp, Calendar, Zap, RefreshCw } from "lucide-react";

type Period = "daily" | "weekly" | "monthly";

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [focusData, setFocusData] = useState<any>(null);
  const [period, setPeriod] = useState<Period>("weekly");
  const [error, setError] = useState("");

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [overviewRes, focusRes] = await Promise.all([
        apiClient.get(`/personal/reports/overview?period=${period}`),
        apiClient.get(`/personal/reports/focus?period=${period}`),
      ]);
      if (overviewRes.data.success) setData(overviewRes.data.data);
      if (focusRes.data.success) setFocusData(focusRes.data.data);
    } catch (err: any) {
      setError("Failed to load reports. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const periodLabel = { daily: "Today", weekly: "This Week", monthly: "This Month" }[period];

  if (loading) {
    return (
      <div className="w-full h-[100dvh] flex flex-col items-center justify-center bg-[#F7F7F5] dark:bg-[#080808]">
        <LoaderCircle className="w-6 h-6 text-[#D99A00] dark:text-[#F5B800] animate-spin mb-3" />
        <span className="text-sm text-[#52525B] dark:text-[#A1A1AA]">Loading reports...</span>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto animate-in fade-in duration-500">

      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] sm:text-[36px] font-bold text-[#171717] dark:text-[#F5F5F5] leading-tight tracking-tight mb-1">Reports</h1>
          <p className="text-sm text-[#52525B] dark:text-[#A1A1AA]">Your personal execution analytics — all calculated from real data.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-[#E5E7EB] dark:border-[#242424] overflow-hidden">
            {(["daily", "weekly", "monthly"] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-2 text-sm font-medium transition-colors capitalize ${
                  period === p
                    ? "bg-[#171717] dark:bg-[#F5F5F5] text-white dark:text-[#080808]"
                    : "text-[#52525B] dark:text-[#A1A1AA] hover:bg-[#F4F4F5] dark:hover:bg-[#1D1D1D]"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <button
            onClick={fetchReports}
            className="p-2 rounded-xl border border-[#E5E7EB] dark:border-[#242424] text-[#52525B] dark:text-[#A1A1AA] hover:bg-[#F4F4F5] dark:hover:bg-[#1D1D1D] transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchReports} className="underline font-medium">Retry</button>
        </div>
      )}

      {data && (
        <>
          {/* KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            <KpiCard icon={<CheckCircle2 className="w-4 h-4 text-green-500" />} label="Tasks Completed" value={data.summary.tasksCompleted} sub={periodLabel} color="green" />
            <KpiCard icon={<AlertTriangle className="w-4 h-4 text-red-500" />} label="Tasks Overdue" value={data.summary.tasksOverdue} sub="Needs attention" color="red" />
            <KpiCard icon={<Target className="w-4 h-4 text-blue-500" />} label="Completion Rate" value={`${data.summary.completionRate}%`} sub="of scheduled tasks" color="blue" />
            <KpiCard icon={<Clock className="w-4 h-4 text-amber-500" />} label="Focus Time" value={`${data.summary.totalFocusHours}h`} sub={periodLabel} color="amber" />
            <KpiCard icon={<TrendingUp className="w-4 h-4 text-purple-500" />} label="Deadline Rate" value={`${data.summary.deadlineAdherence}%`} sub="on-time delivery" color="purple" />
            <KpiCard icon={<Zap className="w-4 h-4 text-cyan-500" />} label="Active Projects" value={data.summary.activeProjects} sub={`${data.summary.completedProjects} completed`} color="cyan" />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* Daily Task Completion */}
            <div className="bg-white dark:bg-[#111111] border border-[#E5E7EB] dark:border-[#242424] rounded-2xl p-5">
              <h2 className="text-sm font-bold text-[#171717] dark:text-[#F5F5F5] uppercase tracking-wider mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" /> Daily Task Completion
              </h2>
              <BarChart data={data.charts.dailyData.map((d: any) => ({ label: d.date.slice(5), value: d.tasksCompleted, max: Math.max(...data.charts.dailyData.map((x: any) => x.tasksCompleted), 1) }))} color="bg-green-500" />
            </div>

            {/* Daily Focus */}
            {focusData && (
              <div className="bg-white dark:bg-[#111111] border border-[#E5E7EB] dark:border-[#242424] rounded-2xl p-5">
                <h2 className="text-sm font-bold text-[#171717] dark:text-[#F5F5F5] uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" /> Daily Focus (minutes)
                </h2>
                <BarChart data={focusData.dailyFocus.map((d: any) => ({ label: d.date.slice(5), value: d.minutes, max: Math.max(...focusData.dailyFocus.map((x: any) => x.minutes), 1) }))} color="bg-amber-500" />
              </div>
            )}
          </div>

          {/* Task Breakdown + Project Progress */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* Task Priority Breakdown */}
            <div className="bg-white dark:bg-[#111111] border border-[#E5E7EB] dark:border-[#242424] rounded-2xl p-5">
              <h2 className="text-sm font-bold text-[#171717] dark:text-[#F5F5F5] uppercase tracking-wider mb-4">Pending by Priority</h2>
              <div className="space-y-3">
                {[
                  { label: "High", value: data.charts.priorityBreakdown.High, color: "bg-red-500" },
                  { label: "Medium", value: data.charts.priorityBreakdown.Medium, color: "bg-amber-500" },
                  { label: "Low", value: data.charts.priorityBreakdown.Low, color: "bg-blue-500" },
                ].map(row => {
                  const total = data.charts.priorityBreakdown.High + data.charts.priorityBreakdown.Medium + data.charts.priorityBreakdown.Low || 1;
                  return (
                    <div key={row.label} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium text-[#52525B] dark:text-[#A1A1AA]">
                        <span>{row.label}</span>
                        <span>{row.value} tasks</span>
                      </div>
                      <div className="h-2 bg-[#F4F4F5] dark:bg-[#1D1D1D] rounded-full overflow-hidden">
                        <div className={`h-full ${row.color} transition-all`} style={{ width: `${(row.value / total) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Project Progress */}
            <div className="bg-white dark:bg-[#111111] border border-[#E5E7EB] dark:border-[#242424] rounded-2xl p-5">
              <h2 className="text-sm font-bold text-[#171717] dark:text-[#F5F5F5] uppercase tracking-wider mb-4">Project Progress</h2>
              {data.charts.projectProgress.length === 0 ? (
                <p className="text-sm text-[#A1A1AA] text-center py-8">No active projects</p>
              ) : (
                <div className="space-y-3">
                  {data.charts.projectProgress.map((p: any) => (
                    <div key={p.id} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-[#171717] dark:text-[#F5F5F5] truncate max-w-[70%]">{p.name}</span>
                        <span className="text-[#52525B] dark:text-[#A1A1AA]">{p.progress}%</span>
                      </div>
                      <div className="h-1.5 bg-[#F4F4F5] dark:bg-[#1D1D1D] rounded-full overflow-hidden">
                        <div className="h-full bg-[#D99A00] dark:bg-[#F5B800] transition-all" style={{ width: `${p.progress}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Focus Summary */}
          {focusData && (
            <div className="bg-white dark:bg-[#111111] border border-[#E5E7EB] dark:border-[#242424] rounded-2xl p-5 mb-6">
              <h2 className="text-sm font-bold text-[#171717] dark:text-[#F5F5F5] uppercase tracking-wider mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" /> Focus Summary
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatBox label="Total Focus" value={`${focusData.totalHours}h`} />
                <StatBox label="Sessions" value={focusData.totalSessions} />
                <StatBox label="Avg Session" value={`${focusData.avgSessionMinutes}m`} />
                <StatBox label="Longest Session" value={`${focusData.longestSessionMinutes}m`} />
              </div>
            </div>
          )}
        </>
      )}

      {!data && !loading && !error && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <BarChart2 className="w-12 h-12 text-[#A1A1AA] mb-4" />
          <h3 className="text-lg font-bold text-[#171717] dark:text-[#F5F5F5] mb-2">No data available</h3>
          <p className="text-sm text-[#52525B] dark:text-[#A1A1AA]">Complete some tasks or focus sessions to see your reports.</p>
        </div>
      )}
    </div>
  );
}

function KpiCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string | number; sub: string; color: string }) {
  return (
    <div className="bg-white dark:bg-[#111111] border border-[#E5E7EB] dark:border-[#242424] rounded-2xl p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-semibold text-[#52525B] dark:text-[#A1A1AA] uppercase tracking-wider truncate">{label}</span>
      </div>
      <div className="text-2xl font-bold text-[#171717] dark:text-[#F5F5F5] font-mono">{value}</div>
      <div className="text-xs text-[#A1A1AA]">{sub}</div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center p-3 bg-[#F4F4F5] dark:bg-[#1D1D1D] rounded-xl">
      <div className="text-xl font-bold text-[#171717] dark:text-[#F5F5F5] font-mono">{value}</div>
      <div className="text-xs text-[#52525B] dark:text-[#A1A1AA] mt-1">{label}</div>
    </div>
  );
}

function BarChart({ data, color }: { data: Array<{ label: string; value: number; max: number }>; color: string }) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-[#A1A1AA] text-center py-4">No data for this period</p>;
  }
  return (
    <div className="flex items-end gap-1 h-32">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
          <div className="w-full flex items-end justify-center" style={{ height: "96px" }}>
            <div
              className={`w-full rounded-t ${color} transition-all`}
              style={{ height: `${d.max > 0 ? Math.max((d.value / d.max) * 96, d.value > 0 ? 4 : 0) : 0}px` }}
            />
          </div>
          <span className="text-[9px] text-[#A1A1AA] truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
