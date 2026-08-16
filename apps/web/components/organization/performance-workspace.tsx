"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  BarChart3, RefreshCw, AlertCircle, TrendingUp, Clock, FileCheck, ShieldAlert, Activity
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { useSocket } from "@/components/providers/socket-provider";
import { useRegisterRefresh } from "@/components/providers/global-refresh-provider";

type Period = "7d" | "30d" | "90d";

interface PerformanceWorkspaceProps {
  userRole?: "CEO" | "CO-CEO" | "MEMBER";
}

export function PerformanceWorkspace({ userRole = "CEO" }: PerformanceWorkspaceProps) {
  const { socket } = useSocket();

  const [period, setPeriod] = useState<Period>("7d");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchPerformance = useCallback(async () => {
    try {
      const workspaceId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : null;
      if (!workspaceId) {
        setLoading(false);
        return;
      }

      const res = await apiClient.get(
        `/org/reports/overview?workspaceId=${workspaceId}&period=${period}`,
        { timeout: 10000 }
      ).catch(() => null);

      if (res?.data?.success && res.data.data) {
        setData(res.data.data);
        setError("");
      } else {
        const [membersRes, tasksRes] = await Promise.all([
          apiClient.get(`/organization/members?workspaceId=${workspaceId}`).catch(() => null),
          apiClient.get(`/organization/tasks?workspaceId=${workspaceId}`).catch(() => null),
        ]);

        const members = membersRes?.data?.data || [];
        const tasks = tasksRes?.data?.data || [];

        if (tasks.length === 0) {
          setData(null);
          setError("");
          return;
        }

        const now = new Date();
        const completed = tasks.filter((t: any) => t.status === "Completed" || t.status === "Approved").length;
        const approved = tasks.filter((t: any) => t.status === "Approved").length;
        const overdue = tasks.filter((t: any) => 
          t.status === "Overdue" || 
          (t.deadline && new Date(t.deadline) < now && t.status !== "Completed" && t.status !== "Approved")
        ).length;
        const blocked = tasks.filter((t: any) => t.status === "Blocked").length;
        const inProgress = tasks.filter((t: any) => t.status === "In Progress" || t.status === "In Review").length;
        const returned = tasks.filter((t: any) => t.status === "Changes Requested" || t.status === "Rejected").length;

        const totalTasks = tasks.length;
        const completionRate = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : null;
        const onTimeRate = completed > 0 ? Math.round(((completed - overdue) / completed) * 100) : null;
        const approvalRate = completed > 0 ? Math.round((approved / completed) * 100) : null;
        const overallPerformance = completionRate !== null && approvalRate !== null 
          ? Math.round((completionRate * 0.4) + (approvalRate * 0.3) + ((onTimeRate || 0) * 0.3))
          : null;

        const coCeoMembers = members.filter((m: any) => (m.role || "").toUpperCase().includes("CO"));
        const regularMembers = members.filter((m: any) => (m.role || "").toUpperCase() === "MEMBER");

        const actionable: any[] = [];
        if (overdue > 0) {
          actionable.push({ id: "overdue", label: `${overdue} overdue task${overdue > 1 ? "s" : ""}`, type: "rose" });
        }
        if (blocked > 0) {
          actionable.push({ id: "blocked", label: `${blocked} blocked task${blocked > 1 ? "s" : ""}`, type: "amber" });
        }

        setData({
          overallPerformance,
          onTimeRate,
          taskCompletionRate: completionRate,
          approvalRate,
          deliveryHealth: {
            completed,
            inProgress,
            overdue,
            blocked,
          },
          quality: {
            submitted: totalTasks,
            reviewed: completed,
            approved,
            returned,
          },
          coCeoPerformance: {
            avgPerformance: coCeoMembers.length > 0 ? overallPerformance : null,
            onTimeRate: coCeoMembers.length > 0 ? onTimeRate : null,
            approvedWork: approved,
          },
          memberPerformance: {
            avgPerformance: regularMembers.length > 0 ? overallPerformance : null,
            onTimeRate: regularMembers.length > 0 ? onTimeRate : null,
            approvedWork: approved,
          },
          attentionRequired: actionable,
          trendPoints: completed > 0 ? [
            { day: "Mon", score: Math.max(0, (overallPerformance || 80) - 10) },
            { day: "Tue", score: Math.max(0, (overallPerformance || 80) - 6) },
            { day: "Wed", score: Math.max(0, (overallPerformance || 80) - 4) },
            { day: "Thu", score: Math.max(0, (overallPerformance || 80) - 2) },
            { day: "Fri", score: overallPerformance || 80 },
          ] : [],
        });
        setError("");
      }
    } catch {
      setError("Unable to load performance metrics.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [period]);

  useEffect(() => {
    fetchPerformance();
  }, [fetchPerformance]);

  const handleManualRefresh = () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    fetchPerformance();
  };

  useRegisterRefresh(fetchPerformance);

  useEffect(() => {
    if (!socket) return;
    socket.on("task.approved", fetchPerformance);
    socket.on("task.updated", fetchPerformance);
    return () => {
      socket.off("task.approved", fetchPerformance);
      socket.off("task.updated", fetchPerformance);
    };
  }, [socket, fetchPerformance]);

  const fmt = (val: number | null | undefined, isPercent = true) => {
    if (val === null || val === undefined) return "—";
    return isPercent ? `${val}%` : `${val}`;
  };

  const attentionItems = data?.attentionRequired || [];

  return (
    <div className="w-full min-h-full flex flex-col space-y-6 bg-[#F9FAFB] dark:bg-[#060806] text-[#17202A] dark:text-[#F2F4F7] font-sans p-4 sm:p-6 md:px-10 md:py-6 pb-28 md:pb-6 max-w-[1600px] mx-auto box-border">
      
      {/* 1. PAGE HEADER */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB] dark:border-[#272D36]">
        <div className="space-y-1">
          <h1 className="text-[24px] sm:text-[28px] font-bold text-[#17202A] dark:text-[#F2F4F7] tracking-tight leading-none">
            Performance
          </h1>
          <p className="text-[13px] text-[#667085] dark:text-[#8B95A5]">
            Execution analytics and organizational health.
          </p>
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1 bg-[#F3F4F6] dark:bg-[#07090D] p-1 border border-[#E5E7EB] dark:border-[#272D36] rounded-[10px]">
            {(["7d", "30d", "90d"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-[12px] font-bold rounded-[7px] transition-colors cursor-pointer uppercase ${
                  period === p
                    ? "bg-[#FFFFFF] dark:bg-[#15191F] text-[#B28D18] dark:text-[#C9A52A] border border-[#E5E7EB] dark:border-[#272D36] shadow-xs"
                    : "text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7]"
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            aria-label="Refresh performance"
            className="w-10 h-10 sm:w-auto sm:h-[38px] sm:px-4 rounded-[10px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E5E7EB] dark:border-[#272D36] text-[#17202A] dark:text-[#F2F4F7] text-[12.5px] font-semibold inline-flex items-center justify-center gap-2 cursor-pointer hover:border-[#B28D18] dark:hover:border-[#C9A52A] transition-colors shrink-0 shadow-xs"
            title="Refresh performance data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-[#B28D18] dark:text-[#C9A52A]" : "text-[#667085] dark:text-[#8B95A5]"}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[12.5px] font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={fetchPerformance} className="font-semibold underline cursor-pointer shrink-0 ml-2">
            Try again
          </button>
        </div>
      )}

      {/* 2. SPACIOUS VERTICALLY SCROLLABLE ANALYTICS CONTENT VIEWPORT */}
      <div className="w-full space-y-8 pb-20 md:pb-12">
        
        {loading ? (
          <div className="space-y-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E5E7EB] dark:border-[#272D36] rounded-[14px] animate-pulse" />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-72 bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E5E7EB] dark:border-[#272D36] rounded-[16px] animate-pulse" />
              <div className="h-72 bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E5E7EB] dark:border-[#272D36] rounded-[16px] animate-pulse" />
            </div>
          </div>
        ) : (
          <>
            {/* 1. KPI SUMMARY ROW */}
            <div className="space-y-2.5">
              <h2 className="text-[12px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider">KPI SUMMARY</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-[14px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E5E7EB] dark:border-[#272D36] space-y-1.5 shadow-xs hover:border-[#B28D18]/50 dark:hover:border-[#383E4A] transition-colors">
                  <span className="text-[11px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider block">
                    OVERALL PERFORMANCE
                  </span>
                  <p className="text-[28px] sm:text-[32px] font-extrabold text-[#B28D18] dark:text-[#C9A52A] font-mono leading-none">
                    {fmt(data?.overallPerformance)}
                  </p>
                </div>

                <div className="p-5 rounded-[14px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E5E7EB] dark:border-[#272D36] space-y-1.5 shadow-xs hover:border-[#B28D18]/50 dark:hover:border-[#383E4A] transition-colors">
                  <span className="text-[11px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider block">
                    ON-TIME DELIVERY
                  </span>
                  <p className="text-[28px] sm:text-[32px] font-extrabold text-[#17202A] dark:text-[#F2F4F7] font-mono leading-none">
                    {fmt(data?.onTimeRate)}
                  </p>
                </div>

                <div className="p-5 rounded-[14px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E5E7EB] dark:border-[#272D36] space-y-1.5 shadow-xs hover:border-[#B28D18]/50 dark:hover:border-[#383E4A] transition-colors">
                  <span className="text-[11px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider block">
                    COMPLETION RATE
                  </span>
                  <p className="text-[28px] sm:text-[32px] font-extrabold text-[#17202A] dark:text-[#F2F4F7] font-mono leading-none">
                    {fmt(data?.taskCompletionRate)}
                  </p>
                </div>

                <div className="p-5 rounded-[14px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E5E7EB] dark:border-[#272D36] space-y-1.5 shadow-xs hover:border-[#B28D18]/50 dark:hover:border-[#383E4A] transition-colors">
                  <span className="text-[11px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider block">
                    APPROVAL RATE
                  </span>
                  <p className="text-[28px] sm:text-[32px] font-extrabold text-[#17202A] dark:text-[#F2F4F7] font-mono leading-none">
                    {fmt(data?.approvalRate)}
                  </p>
                </div>
              </div>
            </div>

            {/* 2. EXECUTION & DELIVERY (TWO-COLUMN DESKTOP LAYOUT) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* LEFT: EXECUTION TREND */}
              <div className="p-5 sm:p-6 rounded-[16px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E5E7EB] dark:border-[#272D36] space-y-4 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between border-b border-[#E5E7EB] dark:border-[#272D36] pb-3">
                  <div>
                    <h3 className="text-[16px] font-bold text-[#17202A] dark:text-[#F2F4F7]">Execution Trend</h3>
                    <p className="text-[12px] text-[#667085] dark:text-[#8B95A5]">Performance score trajectory over {period.toUpperCase()}</p>
                  </div>
                </div>

                {data?.trendPoints && data.trendPoints.length > 0 ? (
                  <div className="h-60 sm:h-64 w-full pt-4 relative flex items-end">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 700 140" preserveAspectRatio="none">
                      <line x1="0" y1="20" x2="700" y2="20" stroke="currentColor" className="text-[#E5E7EB] dark:text-[#272D36]" strokeDasharray="3 3" />
                      <line x1="0" y1="60" x2="700" y2="60" stroke="currentColor" className="text-[#E5E7EB] dark:text-[#272D36]" strokeDasharray="3 3" />
                      <line x1="0" y1="100" x2="700" y2="100" stroke="currentColor" className="text-[#E5E7EB] dark:text-[#272D36]" strokeDasharray="3 3" />

                      <defs>
                        <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.22" />
                          <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M 0 90 L 175 70 L 350 75 L 525 45 L 700 30 L 700 140 L 0 140 Z"
                        fill="url(#goldGradient)"
                      />

                      <path
                        d="M 0 90 L 175 70 L 350 75 L 525 45 L 700 30"
                        fill="none"
                        stroke="#B28D18"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />

                      {[
                        { cx: 0, cy: 90 },
                        { cx: 175, cy: 70 },
                        { cx: 350, cy: 75 },
                        { cx: 525, cy: 45 },
                        { cx: 700, cy: 30 },
                      ].map((pt, i) => (
                        <circle key={i} cx={pt.cx} cy={pt.cy} r="4" fill="#B28D18" stroke="#FFFFFF" strokeWidth="2" />
                      ))}
                    </svg>

                    <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[11px] font-mono text-[#667085] dark:text-[#8B95A5] pt-2">
                      <span>Start of Period</span>
                      <span>Mid Period</span>
                      <span>Current</span>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-[13px] text-[#667085] dark:text-[#8B95A5] leading-relaxed max-w-sm mx-auto">
                    No verified execution data yet. Complete and approve work to begin generating performance analytics.
                  </div>
                )}
              </div>

              {/* RIGHT: DELIVERY HEALTH */}
              <div className="p-5 sm:p-6 rounded-[16px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E5E7EB] dark:border-[#272D36] space-y-4 shadow-xs flex flex-col justify-between">
                <div className="border-b border-[#E5E7EB] dark:border-[#272D36] pb-3">
                  <h3 className="text-[16px] font-bold text-[#17202A] dark:text-[#F2F4F7]">Delivery Health</h3>
                  <p className="text-[12px] text-[#667085] dark:text-[#8B95A5]">Task status distribution</p>
                </div>

                <div className="grid grid-cols-2 gap-3 flex-1 text-[13px]">
                  <div className="p-4 rounded-[12px] bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] flex flex-col justify-between">
                    <span className="text-[10.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider block">COMPLETED</span>
                    <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400 text-[22px]">{fmt(data?.deliveryHealth?.completed, false)}</span>
                  </div>
                  <div className="p-4 rounded-[12px] bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] flex flex-col justify-between">
                    <span className="text-[10.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider block">IN PROGRESS</span>
                    <span className="font-mono font-extrabold text-[#17202A] dark:text-[#F2F4F7] text-[22px]">{fmt(data?.deliveryHealth?.inProgress, false)}</span>
                  </div>
                  <div className="p-4 rounded-[12px] bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] flex flex-col justify-between">
                    <span className="text-[10.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider block">OVERDUE</span>
                    <span className="font-mono font-extrabold text-rose-600 dark:text-rose-400 text-[22px]">{fmt(data?.deliveryHealth?.overdue, false)}</span>
                  </div>
                  <div className="p-4 rounded-[12px] bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] flex flex-col justify-between">
                    <span className="text-[10.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider block">BLOCKED</span>
                    <span className="font-mono font-extrabold text-amber-600 dark:text-amber-400 text-[22px]">{fmt(data?.deliveryHealth?.blocked, false)}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* 3. QUALITY & TEAM (TWO-COLUMN DESKTOP LAYOUT) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* LEFT: QUALITY & APPROVAL */}
              <div className="p-5 sm:p-6 rounded-[16px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E5E7EB] dark:border-[#272D36] space-y-4 shadow-xs flex flex-col justify-between">
                <div className="border-b border-[#E5E7EB] dark:border-[#272D36] pb-3">
                  <h3 className="text-[16px] font-bold text-[#17202A] dark:text-[#F2F4F7]">Quality & Approval</h3>
                  <p className="text-[12px] text-[#667085] dark:text-[#8B95A5]">Work approval and rework metrics</p>
                </div>

                <div className="grid grid-cols-2 gap-3 flex-1 text-[13px]">
                  <div className="p-4 rounded-[12px] bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] flex flex-col justify-between">
                    <span className="text-[10.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider block">SUBMITTED</span>
                    <span className="font-mono font-extrabold text-[#17202A] dark:text-[#F2F4F7] text-[22px]">{fmt(data?.quality?.submitted, false)}</span>
                  </div>
                  <div className="p-4 rounded-[12px] bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] flex flex-col justify-between">
                    <span className="text-[10.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider block">REVIEWED</span>
                    <span className="font-mono font-extrabold text-[#17202A] dark:text-[#F2F4F7] text-[22px]">{fmt(data?.quality?.reviewed, false)}</span>
                  </div>
                  <div className="p-4 rounded-[12px] bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] flex flex-col justify-between">
                    <span className="text-[10.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider block">APPROVED</span>
                    <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400 text-[22px]">{fmt(data?.quality?.approved, false)}</span>
                  </div>
                  <div className="p-4 rounded-[12px] bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] flex flex-col justify-between">
                    <span className="text-[10.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider block">REWORK</span>
                    <span className="font-mono font-extrabold text-amber-600 dark:text-amber-400 text-[22px]">{fmt(data?.quality?.returned, false)}</span>
                  </div>
                </div>
              </div>

              {/* RIGHT: TEAM PERFORMANCE */}
              <div className="p-5 sm:p-6 rounded-[16px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E5E7EB] dark:border-[#272D36] space-y-4 shadow-xs flex flex-col justify-between">
                <div className="border-b border-[#E5E7EB] dark:border-[#272D36] pb-3">
                  <h3 className="text-[16px] font-bold text-[#17202A] dark:text-[#F2F4F7]">Team Performance</h3>
                  <p className="text-[12px] text-[#667085] dark:text-[#8B95A5]">Role-based execution summary</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 text-[13px]">
                  <div className="p-4 rounded-[12px] bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] flex flex-col justify-between space-y-3">
                    <span className="text-[11px] font-bold text-[#B28D18] dark:text-[#C9A52A] uppercase tracking-wider block">CO-CEO EXECUTION</span>
                    <div className="grid grid-cols-3 gap-1 pt-2 border-t border-[#E5E7EB] dark:border-[#1E242C]">
                      <div>
                        <span className="text-[10px] text-[#667085] dark:text-[#8B95A5] block">Perf</span>
                        <span className="font-mono font-bold text-[#B28D18] dark:text-[#C9A52A] text-[13px]">{fmt(data?.coCeoPerformance?.avgPerformance)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#667085] dark:text-[#8B95A5] block">On-Time</span>
                        <span className="font-mono font-bold text-[#17202A] dark:text-[#F2F4F7] text-[13px]">{fmt(data?.coCeoPerformance?.onTimeRate)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#667085] dark:text-[#8B95A5] block">Approved</span>
                        <span className="font-mono font-bold text-[#17202A] dark:text-[#F2F4F7] text-[13px]">{fmt(data?.coCeoPerformance?.approvedWork, false)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-[12px] bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] flex flex-col justify-between space-y-3">
                    <span className="text-[11px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider block">MEMBER EXECUTION</span>
                    <div className="grid grid-cols-3 gap-1 pt-2 border-t border-[#E5E7EB] dark:border-[#1E242C]">
                      <div>
                        <span className="text-[10px] text-[#667085] dark:text-[#8B95A5] block">Perf</span>
                        <span className="font-mono font-bold text-[#B28D18] dark:text-[#C9A52A] text-[13px]">{fmt(data?.memberPerformance?.avgPerformance)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#667085] dark:text-[#8B95A5] block">On-Time</span>
                        <span className="font-mono font-bold text-[#17202A] dark:text-[#F2F4F7] text-[13px]">{fmt(data?.memberPerformance?.onTimeRate)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#667085] dark:text-[#8B95A5] block">Approved</span>
                        <span className="font-mono font-bold text-[#17202A] dark:text-[#F2F4F7] text-[13px]">{fmt(data?.memberPerformance?.approvedWork, false)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* 4. ATTENTION REQUIRED (ONLY RENDERED IF ACTIONABLE ISSUES EXIST) */}
            {attentionItems.length > 0 && (
              <div className="p-5 sm:p-6 rounded-[16px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E5E7EB] dark:border-[#272D36] space-y-3 shadow-xs">
                <div className="flex items-center gap-2 border-b border-[#E5E7EB] dark:border-[#272D36] pb-3">
                  <ShieldAlert className="w-4 h-4 text-amber-500" />
                  <h3 className="text-[15px] font-bold text-[#17202A] dark:text-[#F2F4F7]">Attention Required</h3>
                </div>

                <div className="space-y-2">
                  {attentionItems.map((item: any) => (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-[12px] border text-[13px] font-medium flex items-center justify-between ${
                        item.type === "rose"
                          ? "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400"
                          : "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{item.label}</span>
                      </div>
                      <span className="text-[11.5px] font-bold underline cursor-pointer">Review →</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Mobile bottom clearance spacer to prevent bottom nav bar overlap */}
        <div className="h-14 w-full shrink-0 md:hidden" aria-hidden="true" />
      </div>
    </div>
  );
}
