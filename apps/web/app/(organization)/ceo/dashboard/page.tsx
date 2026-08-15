"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  ChevronRight, Focus as FocusIcon, ArrowUpRight,
  Plus, RefreshCw, Trophy, BarChart2, CheckSquare,
  FolderPlus, Activity
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { useSocket } from "@/components/providers/socket-provider";
import { useAuth } from "@/components/auth/auth-context";
import { format } from "date-fns";

/* ═══════════════════════════════════ helpers & date formatters */
function timeAgo(d: string) {
  if (!d) return "recently";
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function timeOnly(d: string) {
  if (!d) return "—";
  try {
    return format(new Date(d), "HH:mm");
  } catch {
    return "—";
  }
}

function ProgressBar({ value, gold }: { value: number; gold?: boolean }) {
  return (
    <div className="h-1.5 w-full bg-[#E4E7EC] dark:bg-[#272D36] rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${
          gold ? "bg-[#C9A52A] dark:bg-[#D4B12F]" : "bg-[#17202A] dark:text-[#F2F4F7] bg-current"
        }`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

/* Reusable Premium Card Wrapper */
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[12px] p-5 shadow-xs flex flex-col ${className}`}>
      {children}
    </div>
  );
}

/* Reusable Centered Empty State Component with Real Action Button */
function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: {
  icon?: any;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-6 px-4 min-h-[180px] sm:min-h-[220px] w-full my-auto">
      {Icon && (
        <div className="w-9 h-9 rounded-full bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] flex items-center justify-center mb-3 text-[#667085] dark:text-[#8B95A5]">
          <Icon className="w-4.5 h-4.5" />
        </div>
      )}
      <h3 className="text-[15px] sm:text-[16px] font-semibold text-[#17202A] dark:text-[#F2F4F7]">
        {title}
      </h3>
      <p className="text-[13px] text-[#667085] dark:text-[#8B95A5] max-w-[280px] sm:max-w-[340px] mt-1 leading-snug">
        {description}
      </p>
      {actionLabel && (
        actionHref ? (
          <Link
            href={actionHref}
            className="mt-4 inline-flex items-center justify-center gap-1.5 h-[40px] px-4 rounded-[9px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[13px] font-semibold hover:opacity-90 transition-opacity shadow-xs whitespace-nowrap"
          >
            {actionLabel}
          </Link>
        ) : (
          <button
            onClick={onAction}
            className="mt-4 inline-flex items-center justify-center gap-1.5 h-[40px] px-4 rounded-[9px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[13px] font-semibold hover:opacity-90 transition-opacity shadow-xs whitespace-nowrap cursor-pointer"
          >
            {actionLabel}
          </button>
        )
      )}
    </div>
  );
}

/* ═══════════════════════════════════ main dashboard component */
export default function CEODashboard() {
  const { socket } = useSocket();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [secError, setSecError] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);
  const [currentDateStr, setCurrentDateStr] = useState("");
  const [analyticsRange, setAnalyticsRange] = useState<"7D" | "30D" | "90D">("7D");

  // System operating hours check (11 PM to 4 AM system off rule)
  const isWorking = useCallback(() => {
    const h = new Date().getHours();
    return h >= 4 && h < 23;
  }, []);

  // Hydration-safe date calculation (Formatted as "15 Aug 2026")
  useEffect(() => {
    setMounted(true);
    setCurrentDateStr(format(new Date(), "d MMM yyyy"));
  }, []);

  const load = useCallback(async () => {
    try {
      const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : null;
      const param = wsId ? `?workspaceId=${wsId}` : "";
      const res = await apiClient.get(`/organization/dashboard${param}`);
      if (res.data.success) {
        setData(res.data.data);
        setSecError({});
      } else {
        setSecError({ global: true });
      }
    } catch {
      setSecError({ global: true });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!socket) return;
    socket.on("workspace_update", load);
    socket.on("approval.updated", load);
    socket.on("task.updated", load);
    return () => {
      socket.off("workspace_update", load);
      socket.off("approval.updated", load);
      socket.off("task.updated", load);
    };
  }, [socket, load]);

  const approve = async (id: string) => {
    try {
      const wsId = localStorage.getItem("workspaceId");
      await apiClient.post(`/org/approvals/tasks/${id}/approve`, { workspaceId: wsId });
      load();
    } catch {}
  };

  /* Dynamic Time-aware Executive Greeting */
  const greetingTime = useMemo(() => {
    const hr = new Date().getHours();
    if (hr < 12) return "Good morning";
    if (hr < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const firstName = useMemo(() => {
    const nameStr = user?.displayName || user?.name || "";
    if (!nameStr) return "";
    return nameStr.split(" ")[0];
  }, [user?.displayName, user?.name]);

  const greeting = firstName ? `${greetingTime}, ${firstName}` : greetingTime;

  /* Real derived executive metrics & data */
  const active = isWorking();
  const h = data?.health ?? {};
  const decisions = data?.attentionItems ?? [];
  const priorities = data?.todayPriorities ?? [];
  const coceos = data?.coCeoPerformance ?? [];
  const projects = data?.projectHealth ?? [];
  const dl = data?.deadlineWatch ?? { overdue: [], dueToday: [], dueTomorrow: [] };
  const activity = data?.recentActivities ?? [];

  const execPct = loading ? null : (h.overallProgress ?? 0);
  const totalCompleted = (h.completedTodayCount ?? 0) + (h.completedTotalCount ?? 0);
  
  // CRITICAL FIX: On-time rate must show '—' when completed tasks = 0
  const onTimeDisplay = loading || totalCompleted === 0 ? "—" : `${h.onTimeCompletionRate ?? 0}%`;
  const onTimeSubtext = totalCompleted === 0 ? "No completed work yet" : "Completed within deadline";

  const atRisk = (h.overdueCount ?? 0) + (h.blockedCount ?? 0);
  const totalTeam = h.teamMembersCount ?? 1;

  // Deduplicated Activity Log Timeline
  const groupedActivity = useMemo(() => {
    const out: any[] = [];
    const seen = new Map<string, any>();
    for (const act of activity) {
      const key = `${act.eventType}__${act.details ?? ""}`;
      if (seen.has(key)) {
        seen.get(key).count = (seen.get(key).count ?? 1) + 1;
      } else {
        const entry = { ...act, count: 1 };
        seen.set(key, entry);
        out.push(entry);
      }
    }
    return out.slice(0, 6);
  }, [activity]);

  // Unified Today Items (Decisions + Priorities)
  const todayItems = useMemo(() => {
    const list: any[] = [];
    decisions.forEach((d: any) => {
      list.push({ ...d, isDecision: true });
    });
    priorities.forEach((p: any) => {
      if (!list.some((existing) => existing.id === p.id)) {
        list.push({ ...p, isDecision: false });
      }
    });
    return list;
  }, [decisions, priorities]);

  return (
    <div className="w-full max-w-full overflow-x-hidden min-h-full bg-[#F8F9FB] dark:bg-[#0B0E12] text-[#17202A] dark:text-[#F2F4F7] font-sans select-none">
      <div className="px-4 sm:px-6 md:px-10 py-6 md:py-8 max-w-[1400px] mx-auto space-y-6">
        
        {/* ══════════════════════════════════════════════════════════════════
            1. EXECUTIVE WELCOME HEADER (VERTICALLY CENTERED TWO-COLUMN GRID)
        ══════════════════════════════════════════════════════════════════ */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-5 border-b border-[#E4E7EC] dark:border-[#272D36]">
          <div className="space-y-1">
            <h1 className="text-[28px] sm:text-[32px] md:text-[36px] font-semibold text-[#17202A] dark:text-[#F2F4F7] tracking-tight leading-none">
              {mounted ? greeting : "Good afternoon"}
            </h1>
            <p className="text-[14px] sm:text-[15px] font-medium text-[#667085] dark:text-[#9EA8B6]">
              CEO · {data?.organizationName || "ManMadhan Organization"}
            </p>
            <p className="text-[13px] sm:text-[14px] font-normal text-[#667085] dark:text-[#8B95A5] pt-0.5">
              Here&apos;s your organization overview for today.
            </p>
          </div>

          {/* Integrated Action Group Hierarchy (Vertically Centered) */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Link
              href="/ceo/tasks"
              className="inline-flex items-center justify-center gap-2 px-4 h-[42px] rounded-[9px] border border-[#E4E7EC] dark:border-[#272D36] bg-[#FFFFFF] dark:bg-[#15191F] text-[13.5px] font-semibold text-[#17202A] dark:text-[#F2F4F7] hover:bg-[#F3F4F6] dark:hover:bg-[#181D24] transition-colors shadow-2xs whitespace-nowrap"
            >
              <Plus className="w-4 h-4 text-[#667085] dark:text-[#8B95A5] shrink-0" />
              <span>New Task</span>
            </Link>
            <Link
              href="/ceo/projects"
              className="inline-flex items-center justify-center gap-2 px-4 h-[42px] rounded-[9px] border border-[#E4E7EC] dark:border-[#272D36] bg-[#FFFFFF] dark:bg-[#15191F] text-[13.5px] font-semibold text-[#17202A] dark:text-[#F2F4F7] hover:bg-[#F3F4F6] dark:hover:bg-[#181D24] transition-colors shadow-2xs whitespace-nowrap"
            >
              <Plus className="w-4 h-4 text-[#667085] dark:text-[#8B95A5] shrink-0" />
              <span>Project</span>
            </Link>
            <Link
              href="/ceo/focus"
              className="inline-flex items-center justify-center gap-2 px-4 h-[42px] rounded-[9px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[13.5px] font-semibold hover:opacity-90 transition-opacity shadow-xs whitespace-nowrap"
            >
              <FocusIcon className="w-4 h-4 shrink-0" />
              <span>Focus</span>
            </Link>
          </div>
        </div>

        {/* Global Error Banner */}
        {secError.global && (
          <div className="flex items-center justify-between p-3.5 rounded-lg border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400 text-[12px] font-medium">
            <span>Unable to load dashboard data.</span>
            <button
              onClick={load}
              className="flex items-center gap-1 font-semibold hover:underline cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            2. ORGANIZATION OVERVIEW (KPI CARDS)
        ══════════════════════════════════════════════════════════════════ */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-[#17202A] dark:text-[#F2F4F7]">
              Organization Overview
            </h2>
            <span className="text-[12px] font-mono text-[#667085] dark:text-[#8B95A5]">
              {mounted ? currentDateStr : ""}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="justify-between min-h-[110px]">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#667085] dark:text-[#8B95A5]">
                MEMBERS
              </span>
              <div className="my-1">
                <span className="text-[26px] md:text-[28px] font-semibold font-mono text-[#17202A] dark:text-[#F2F4F7] leading-none">
                  {loading ? "—" : totalTeam}
                </span>
              </div>
              <span className="text-[12px] text-[#667085] dark:text-[#8B95A5]">
                Active team members
              </span>
            </Card>

            <Card className="justify-between min-h-[110px]">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#667085] dark:text-[#8B95A5]">
                PROJECTS
              </span>
              <div className="my-1">
                <span className="text-[26px] md:text-[28px] font-semibold font-mono text-[#17202A] dark:text-[#F2F4F7] leading-none">
                  {loading ? "—" : (h.activeProjectsCount ?? 0)}
                </span>
              </div>
              <span className="text-[12px] text-[#667085] dark:text-[#8B95A5]">
                {h.activeTasksCount ?? 0} tasks in flight
              </span>
            </Card>

            <Card className="justify-between min-h-[110px]">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#667085] dark:text-[#8B95A5]">
                APPROVALS
              </span>
              <div className="my-1">
                <span className="text-[26px] md:text-[28px] font-semibold font-mono text-[#17202A] dark:text-[#F2F4F7] leading-none">
                  {loading ? "—" : (h.pendingReviewCount ?? 0)}
                </span>
              </div>
              <span className="text-[12px] text-[#667085] dark:text-[#8B95A5]">
                {(h.pendingReviewCount ?? 0) > 0 ? "Requires review" : "Queue clear"}
              </span>
            </Card>

            <Card className="justify-between min-h-[110px]">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#667085] dark:text-[#8B95A5]">
                STATUS
              </span>
              <div className="my-1 flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${active ? "bg-emerald-500" : "bg-[#667085]"}`} />
                <span className="text-[18px] font-semibold text-[#17202A] dark:text-[#F2F4F7] leading-none uppercase tracking-tight">
                  {active ? "ON TRACK" : "PAUSED"}
                </span>
              </div>
              <span className="text-[12px] text-[#667085] dark:text-[#8B95A5]">
                {active ? "System operational" : "Off-hours pause"}
              </span>
            </Card>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            3. WORKING PROGRESS ANALYTICS
        ══════════════════════════════════════════════════════════════════ */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-[#17202A] dark:text-[#F2F4F7]">
              Progress Overview
            </h2>
            <div className="flex items-center gap-1 bg-[#F8F9FB] dark:bg-[#111419] p-1 rounded-lg border border-[#E4E7EC] dark:border-[#272D36]">
              {(["7D", "30D", "90D"] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setAnalyticsRange(range)}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${
                    analyticsRange === range
                      ? "bg-[#FFFFFF] dark:bg-[#15191F] text-[#17202A] dark:text-[#F2F4F7] shadow-2xs"
                      : "text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7]"
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          <Card className="justify-between min-h-[220px]">
            <div className="py-2 flex-1 flex flex-col justify-center">
              {loading ? (
                <div className="py-6 space-y-2 animate-pulse">
                  <div className="h-4 bg-[#E4E7EC] dark:bg-[#272D36] rounded w-1/3 mx-auto" />
                  <div className="h-12 bg-[#E4E7EC] dark:bg-[#272D36] rounded w-full" />
                </div>
              ) : totalCompleted === 0 && (h.activeTasksCount ?? 0) === 0 ? (
                <EmptyState
                  icon={BarChart2}
                  title="No work data yet"
                  description="Progress analytics will appear once your organization starts recording work."
                  actionLabel="+ Create task"
                  actionHref="/ceo/tasks"
                />
              ) : (
                <div className="space-y-4 py-2">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="text-[12px] font-medium text-[#667085] dark:text-[#8B95A5]">Overall Progress</span>
                      <p className="text-[20px] font-mono font-semibold text-[#17202A] dark:text-[#F2F4F7]">{execPct}%</p>
                    </div>
                    <div className="text-right space-y-0.5">
                      <span className="text-[12px] font-medium text-[#667085] dark:text-[#8B95A5]">Completed Today</span>
                      <p className="text-[20px] font-mono font-semibold text-[#17202A] dark:text-[#F2F4F7]">{h.completedTodayCount ?? 0}</p>
                    </div>
                  </div>
                  <ProgressBar value={execPct} gold />
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            4. TODAY CARD & RISKS & DEADLINES CARD
        ══════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* TODAY CARD */}
          <Card className="md:col-span-7 justify-between min-h-[220px]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E4E7EC] dark:border-[#272D36]">
              <span className="text-[11px] font-semibold text-[#667085] dark:text-[#8B95A5] uppercase tracking-[0.08em]">
                TODAY
              </span>
              {todayItems.length > 0 && (
                <Link
                  href="/ceo/approvals"
                  className="text-[12px] font-semibold text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7] transition-colors flex items-center gap-0.5"
                >
                  View all <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>

            <div className="py-2 flex-1 flex flex-col justify-center">
              {loading ? (
                <div className="space-y-3 animate-pulse py-2">
                  <div className="h-4 bg-[#E4E7EC] dark:bg-[#272D36] rounded w-1/3" />
                  <div className="h-4 bg-[#E4E7EC] dark:bg-[#272D36] rounded w-2/3" />
                </div>
              ) : todayItems.length === 0 ? (
                <EmptyState
                  icon={CheckSquare}
                  title="You're fully caught up"
                  description="No decisions, approvals, or priority actions require your attention."
                />
              ) : (
                <div className="divide-y divide-[#E4E7EC]/60 dark:divide-[#272D36]/60">
                  {todayItems.slice(0, 4).map((item: any, idx: number) => (
                    <div
                      key={item.id ?? idx}
                      className="py-2.5 flex items-center justify-between gap-3 hover:bg-[#F3F4F6]/50 dark:hover:bg-[#181D24]/50 transition-colors rounded-lg px-1.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-[11px] font-mono text-[#667085] dark:text-[#8B95A5] shrink-0">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-[#17202A] dark:text-[#F2F4F7] truncate">
                            {item.title}
                          </p>
                          <p className="text-[11px] text-[#667085] dark:text-[#8B95A5] truncate mt-0.5">
                            {item.projectName || item.category || "Task"}
                            {item.owner && <span> · {item.owner}</span>}
                          </p>
                        </div>
                      </div>

                      {item.isDecision ? (
                        <button
                          onClick={() => approve(item.id)}
                          className="px-3 h-7.5 rounded-lg bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[12px] font-semibold hover:opacity-90 transition-opacity shrink-0 cursor-pointer"
                        >
                          Approve
                        </button>
                      ) : (
                        <Link
                          href={item.projectId ? `/ceo/projects/${item.projectId}` : "/ceo/tasks"}
                          className="px-3 h-7.5 rounded-lg border border-[#E4E7EC] dark:border-[#272D36] bg-[#FFFFFF] dark:bg-[#15191F] text-[12px] font-semibold text-[#17202A] dark:text-[#F2F4F7] hover:bg-[#F3F4F6] dark:hover:bg-[#181D24] transition-colors flex items-center gap-1 shrink-0"
                        >
                          Review <ArrowUpRight className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* RISKS & DEADLINES CARD */}
          <Card className="md:col-span-5 justify-between min-h-[220px]">
            <div className="pb-3 border-b border-[#E4E7EC] dark:border-[#272D36]">
              <span className="text-[11px] font-semibold text-[#667085] dark:text-[#8B95A5] uppercase tracking-[0.08em]">
                RISKS & DEADLINES
              </span>
            </div>

            <div className="py-3 flex-1 flex flex-col justify-center">
              <div className="grid grid-cols-2 gap-3 text-[12px] font-medium text-[#17202A] dark:text-[#F2F4F7]">
                <div className="p-2.5 rounded-lg bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] flex flex-col justify-between">
                  <span className="text-[10px] font-semibold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider">Overdue</span>
                  <span className="text-[20px] font-mono font-semibold mt-1">{dl.overdue?.length ?? 0}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] flex flex-col justify-between">
                  <span className="text-[10px] font-semibold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider">Blocked</span>
                  <span className="text-[20px] font-mono font-semibold mt-1">{h.blockedCount ?? 0}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] flex flex-col justify-between">
                  <span className="text-[10px] font-semibold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider">Due today</span>
                  <span className="text-[20px] font-mono font-semibold mt-1">{dl.dueToday?.length ?? 0}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] flex flex-col justify-between">
                  <span className="text-[10px] font-semibold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider">At risk</span>
                  <span className="text-[20px] font-mono font-semibold mt-1">{atRisk}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            5. PROJECT HEALTH CARD & PEOPLE & LEADERSHIP CARD
        ══════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* PROJECT HEALTH CARD */}
          <Card className="md:col-span-7 justify-between min-h-[200px]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E4E7EC] dark:border-[#272D36]">
              <span className="text-[11px] font-semibold text-[#667085] dark:text-[#8B95A5] uppercase tracking-[0.08em]">
                PROJECT HEALTH
              </span>
              <Link
                href="/ceo/projects"
                className="text-[12px] font-semibold text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7] transition-colors flex items-center gap-0.5"
              >
                View all <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="py-2 flex-1 flex flex-col justify-center">
              {loading ? (
                <div className="space-y-3 animate-pulse py-2">
                  <div className="h-4 bg-[#E4E7EC] dark:bg-[#272D36] rounded w-1/2" />
                  <div className="h-4 bg-[#E4E7EC] dark:bg-[#272D36] rounded w-3/4" />
                </div>
              ) : projects.length === 0 ? (
                <EmptyState
                  icon={FolderPlus}
                  title="No active projects"
                  description="Your organization has no active projects at the moment."
                  actionLabel="+ Create project"
                  actionHref="/ceo/projects"
                />
              ) : (
                <div className="space-y-3 py-1">
                  {projects.slice(0, 3).map((p: any) => (
                    <Link
                      key={p.id}
                      href={`/ceo/projects/${p.id}`}
                      className="block space-y-1.5 group cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-semibold text-[#17202A] dark:text-[#F2F4F7] group-hover:text-[#C9A52A] dark:group-hover:text-[#D4B12F] transition-colors truncate">
                          {p.name}
                        </span>
                        <span className="text-[12px] font-mono font-semibold text-[#17202A] dark:text-[#F2F4F7] shrink-0 ml-2">
                          {p.progress ?? 0}%
                        </span>
                      </div>
                      <ProgressBar value={p.progress ?? 0} gold />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* PEOPLE & LEADERSHIP CARD */}
          <Card className="md:col-span-5 justify-between min-h-[200px]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E4E7EC] dark:border-[#272D36]">
              <span className="text-[11px] font-semibold text-[#667085] dark:text-[#8B95A5] uppercase tracking-[0.08em]">
                PEOPLE & LEADERSHIP
              </span>
              <Link
                href="/ceo/co-ceos"
                className="text-[12px] font-semibold text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7] transition-colors"
              >
                Manage →
              </Link>
            </div>

            <div className="py-2 flex-1 flex flex-col justify-between space-y-3">
              <div className="grid grid-cols-2 gap-3 text-[12px] font-medium text-[#667085] dark:text-[#8B95A5]">
                <div className="p-2.5 rounded-lg bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36]">
                  <span className="block uppercase text-[10px] tracking-wider">CO-CEOs</span>
                  <span className="text-[18px] font-semibold font-mono text-[#17202A] dark:text-[#F2F4F7] mt-0.5 block">
                    {coceos.length}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36]">
                  <span className="block uppercase text-[10px] tracking-wider">Members</span>
                  <span className="text-[18px] font-semibold font-mono text-[#17202A] dark:text-[#F2F4F7] mt-0.5 block">
                    {totalTeam}
                  </span>
                </div>
              </div>

              {coceos.length === 0 ? (
                <div className="py-1 my-auto">
                  <p className="text-[12.5px] font-medium text-[#667085] dark:text-[#8B95A5]">
                    No CO-CEOs assigned
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[#E4E7EC]/60 dark:divide-[#272D36]/60">
                  {coceos.map((c: any) => (
                    <div key={c.id} className="py-2 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-full bg-[#E4E7EC] dark:bg-[#272D36] flex items-center justify-center text-[11px] font-semibold text-[#17202A] dark:text-[#F2F4F7]">
                          {c.name?.charAt(0) ?? "C"}
                        </div>
                        <span className="text-[13px] font-semibold text-[#17202A] dark:text-[#F2F4F7]">
                          {c.name}
                        </span>
                      </div>
                      <span className="text-[12px] font-mono font-semibold text-[#17202A] dark:text-[#F2F4F7]">
                        {c.progress ?? 0}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            6. COMBINED LOWER ROW (LEADERBOARD + RECENT ACTIVITY)
        ══════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* LEADERBOARD CARD (~60-65% width) */}
          <Card className="md:col-span-7 justify-between min-h-[220px]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E4E7EC] dark:border-[#272D36]">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[#C9A52A] dark:text-[#D4B12F]" />
                <span className="text-[11px] font-semibold text-[#667085] dark:text-[#8B95A5] uppercase tracking-[0.08em]">
                  LEADERBOARD
                </span>
              </div>
              <Link
                href="/ceo/co-ceos"
                className="text-[12px] font-semibold text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7] transition-colors flex items-center gap-0.5"
              >
                This week →
              </Link>
            </div>

            <div className="py-2 flex-1 flex flex-col justify-center">
              {loading ? (
                <div className="space-y-2 animate-pulse py-1">
                  <div className="h-4 bg-[#E4E7EC] dark:bg-[#272D36] rounded w-1/3" />
                </div>
              ) : coceos.length === 0 ? (
                <EmptyState
                  icon={Trophy}
                  title="No ranking data yet"
                  description="Leaderboard results will appear once qualifying work is recorded."
                />
              ) : (
                <div className="divide-y divide-[#E4E7EC]/60 dark:divide-[#272D36]/60">
                  {coceos.map((member: any, idx: number) => (
                    <div key={member.id ?? idx} className="py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-[12px] font-mono font-semibold text-[#667085] dark:text-[#8B95A5] w-5">
                          #{String(idx + 1).padStart(2, "0")}
                        </span>
                        <div className="w-7 h-7 rounded-full bg-[#E4E7EC] dark:bg-[#272D36] flex items-center justify-center text-[12px] font-semibold text-[#17202A] dark:text-[#F2F4F7]">
                          {member.name?.charAt(0) ?? "M"}
                        </div>
                        <span className="text-[13px] font-semibold text-[#17202A] dark:text-[#F2F4F7]">
                          {member.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-[12px]">
                        <span className="text-[#667085] dark:text-[#8B95A5]">
                          {member.completedTasks ?? 0} done
                        </span>
                        <span className="font-mono font-semibold text-[#17202A] dark:text-[#F2F4F7]">
                          {member.progress ?? 0}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* RECENT ACTIVITY CARD (~35-40% width) */}
          <Card className="md:col-span-5 justify-between min-h-[220px]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E4E7EC] dark:border-[#272D36]">
              <span className="text-[11px] font-semibold text-[#667085] dark:text-[#8B95A5] uppercase tracking-[0.08em]">
                RECENT ACTIVITY
              </span>
              <Link
                href="/ceo/audit"
                className="text-[12px] font-semibold text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7] transition-colors flex items-center gap-0.5"
              >
                Audit log →
              </Link>
            </div>

            <div className="py-2 flex-1 flex flex-col justify-center">
              {loading ? (
                <div className="space-y-2 animate-pulse py-1">
                  <div className="h-4 bg-[#E4E7EC] dark:bg-[#272D36] rounded w-1/3" />
                </div>
              ) : groupedActivity.length === 0 ? (
                <EmptyState
                  icon={Activity}
                  title="No recent activity"
                  description="Organization activity will appear here."
                />
              ) : (
                <div className="space-y-3 py-1">
                  {groupedActivity.map((act: any, i: number) => (
                    <div key={act.id ?? i} className="flex items-start gap-3 text-[12px]">
                      <span className="font-mono text-[#667085] dark:text-[#8B95A5] shrink-0 pt-0.5">
                        {timeOnly(act.createdAt)}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium text-[#17202A] dark:text-[#F2F4F7] leading-snug">
                          <span className="font-semibold">{act.userName || "System"}</span>{" "}
                          <span className="text-[#667085] dark:text-[#8B95A5]">
                            {act.details || act.eventType}
                          </span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
}
