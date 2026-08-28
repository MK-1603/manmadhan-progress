"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  ChevronRight, Focus as FocusIcon, ArrowUpRight,
  Plus, RefreshCw, Trophy, BarChart2, CheckSquare,
  FolderPlus, Activity, CheckCircle2, AlertCircle, ShieldAlert
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { useSocket } from "@/components/providers/socket-provider";
import { useAuth } from "@/components/auth/auth-context";
import { format } from "date-fns";
import { useRegisterRefresh } from "@/components/providers/global-refresh-provider";
import { fetchDashboardData, isDemoModeEnabled } from "@/services/dashboard-service";

/* ═══════════════════════════════════ helpers & date formatters */
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

/* Reusable Premium Card Wrapper — content-driven height, mobile-responsive padding */
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[14px] p-3.5 sm:p-4 md:p-5 shadow-xs flex flex-col ${className}`}>
      {children}
    </div>
  );
}

/* Reusable Compact Empty State Component — content-driven height (NO 200px visual voids) */
function CompactEmpty({
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-3.5 px-3 w-full my-auto">
      <p className="text-[13px] font-semibold text-[#17202A] dark:text-[#F2F4F7]">
        {title}
      </p>
      <p className="text-[11.5px] text-[#667085] dark:text-[#8B95A5] max-w-[280px] mt-0.5 leading-snug">
        {description}
      </p>
      {actionLabel && (
        actionHref ? (
          <Link
            href={actionHref}
            className="mt-2.5 inline-flex items-center justify-center h-[34px] px-3.5 rounded-[8px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[12px] font-semibold hover:opacity-90 transition-opacity shadow-2xs whitespace-nowrap"
          >
            {actionLabel}
          </Link>
        ) : (
          <button
            onClick={onAction}
            className="mt-2.5 inline-flex items-center justify-center h-[34px] px-3.5 rounded-[8px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[12px] font-semibold hover:opacity-90 transition-opacity shadow-2xs whitespace-nowrap cursor-pointer"
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
  const { user, authStatus } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [secError, setSecError] = useState<{ global?: boolean; unauthorized?: boolean }>({});
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
      const dashData = await fetchDashboardData({ workspaceId: wsId, forceRefresh: true });
      setData(dashData);
      setSecError({});
    } catch (err: any) {
      if (err?.response?.status === 401) {
        setSecError({ unauthorized: true });
      } else {
        setSecError({ global: true });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch real dashboard data when authenticated; handle unauthenticated session state cleanly.
  useEffect(() => {
    if (authStatus === "authenticated") {
      load();
    } else if (authStatus === "unauthenticated") {
      setLoading(false);
      setSecError({ unauthorized: true });
    }
  }, [load, authStatus, user?.id]);

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
    return out.slice(0, 5);
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

  // Register load handler with the global mobile pull-to-refresh system
  useRegisterRefresh(load);

  return (
    <div className="w-full max-w-full overflow-x-hidden min-h-full bg-[#F8F9FB] dark:bg-[#0B0E12] text-[#17202A] dark:text-[#F2F4F7] font-sans select-none">
      {/* Mobile-first wrapper: generous bottom padding accounts for BottomNav + FAB + iOS home indicator */}
      <div className="px-4 sm:px-5 md:px-10 py-3.5 md:py-8 max-w-[1400px] mx-auto space-y-3.5 md:space-y-6 pb-[calc(84px+env(safe-area-inset-bottom))] md:pb-8">

        {/* ══════════════════════════════════════════════════════════════════
            1. EXECUTIVE WELCOME HEADER (RIGHT-ALIGNED FOCUS ACTION)
        ══════════════════════════════════════════════════════════════════ */}
        <div className="pb-3 md:pb-4 border-b border-[#E4E7EC] dark:border-[#272D36]">
          <div className="flex flex-row items-center justify-between gap-3">
            <div className="space-y-0.5 min-w-0">
              <h1 className="text-[20px] sm:text-[26px] md:text-[32px] font-bold text-[#17202A] dark:text-[#F2F4F7] tracking-tight leading-none truncate">
                {mounted ? greeting : "Good afternoon"}
              </h1>
              <p className="text-[12.5px] sm:text-[14px] font-medium text-[#667085] dark:text-[#9EA8B6] truncate">
                CEO · {data?.organizationName || "ManMadhan Organization"}
              </p>
            </div>

            {/* Top Right Primary Action: Focus Button Only */}
            <div className="shrink-0">
              <Link
                href="/ceo/focus"
                className="inline-flex items-center justify-center gap-1.5 px-4 sm:px-5 h-[46px] sm:h-[50px] rounded-[14px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[13px] sm:text-[13.5px] font-bold hover:opacity-90 active:scale-[0.98] transition-all shadow-xs whitespace-nowrap"
              >
                <FocusIcon className="w-4 h-4 shrink-0" />
                <span>Focus</span>
                <ChevronRight className="w-3.5 h-3.5 stroke-[3] text-[#0B0D10]/70" />
              </Link>
            </div>
          </div>
        </div>

        {/* Global Error Banners */}
        {secError.unauthorized && (
          <div className="flex items-center justify-between p-3.5 rounded-[12px] border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[12.5px] font-medium">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Session expired. Please sign in again.</span>
            </div>
            <Link href="/login" className="font-semibold underline hover:opacity-90">
              Sign In
            </Link>
          </div>
        )}

        {secError.global && !secError.unauthorized && (
          <div className="flex items-center justify-between p-3.5 rounded-[12px] border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400 text-[12.5px] font-medium">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Unable to load dashboard data.</span>
            </div>
            <button
              onClick={load}
              className="flex items-center gap-1 font-semibold hover:underline cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            2. PROGRESS OVERVIEW TREND GRAPH (MOVED TO TOP)
        ══════════════════════════════════════════════════════════════════ */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-[13.5px] sm:text-[14.5px] font-bold tracking-tight text-[#17202A] dark:text-[#F2F4F7]">
              Progress Overview
            </h2>
            <div className="flex items-center gap-1 bg-[#F8F9FB] dark:bg-[#111419] p-0.5 rounded-lg border border-[#E4E7EC] dark:border-[#272D36]">
              {(["7D", "30D", "90D"] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setAnalyticsRange(range)}
                  className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${
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

          <Card className="py-3.5 px-4">
            {loading ? (
              <div className="py-6 space-y-3 animate-pulse">
                <div className="h-4 bg-[#E4E7EC] dark:bg-[#272D36] rounded w-1/3" />
                <div className="h-24 bg-[#E4E7EC] dark:bg-[#272D36] rounded w-full" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Header Metrics Row */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-semibold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider">
                      Overall Progress
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-[24px] sm:text-[28px] font-mono font-bold text-[#17202A] dark:text-[#F2F4F7] leading-none">
                        {execPct ?? 0}%
                      </span>
                      {data?.progressTrend && (
                        <span className="text-[11px] font-semibold text-[#39D393] bg-[#39D393]/15 px-1.5 py-0.5 rounded">
                          {data.progressTrend}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <div className="space-y-0.5">
                      <span className="text-[10.5px] font-medium text-[#667085] dark:text-[#8B95A5]">
                        Completed Today
                      </span>
                      <p className="text-[16px] font-mono font-semibold text-[#17202A] dark:text-[#F2F4F7]">
                        {h.completedTodayCount ?? 0}
                      </p>
                    </div>
                    <div className="hidden sm:block space-y-0.5">
                      <span className="text-[10.5px] font-medium text-[#667085] dark:text-[#8B95A5]">
                        On-Time Rate
                      </span>
                      <p className="text-[16px] font-mono font-semibold text-[#39D393]">
                        {h.onTimeCompletionRate ?? 100}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Progress Bar Header */}
                <ProgressBar value={execPct ?? 0} gold />

                {/* Real Telemetry Graph (or clean empty state if no telemetry points) */}
                {Array.isArray(data?.trendSeries?.[analyticsRange]) && data.trendSeries[analyticsRange].length > 0 ? (
                  <div className="pt-2 border-t border-[#E4E7EC]/60 dark:border-[#272D36]/60">
                    <div className="flex items-end justify-between gap-1.5 h-28 pt-4 pb-1">
                      {data.trendSeries[analyticsRange].map((item: any, index: number) => {
                        const maxVal = Math.max(...data.trendSeries[analyticsRange].map((d: any) => d.val ?? 0));
                        const isMax = (item.val ?? 0) === maxVal && maxVal > 0;
                        const heightPercent = Math.max(12, ((item.val ?? 0) / 100) * 100);

                        return (
                          <div
                            key={item.label + index}
                            className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group"
                          >
                            <span className="text-[10px] font-mono text-[#667085] dark:text-[#8B95A5] opacity-75 group-hover:opacity-100 transition-opacity">
                              {item.val ?? 0}%
                            </span>
                            <div className="w-full max-w-[32px] bg-[#F3F4F6] dark:bg-[#181D24] rounded-t-md h-full flex items-end overflow-hidden p-0.5 border border-[#E4E7EC]/40 dark:border-[#272D36]/40">
                              <div
                                className={`w-full rounded-t-sm transition-all duration-500 ${
                                  isMax
                                    ? "bg-[#C9A52A] dark:bg-[#D4B12F] shadow-[0_0_12px_rgba(212,177,47,0.35)]"
                                    : "bg-[#27303B] dark:bg-[#323B46]"
                                }`}
                                style={{ height: `${heightPercent}%` }}
                              />
                            </div>
                            <span className="text-[10px] sm:text-[10.5px] font-medium text-[#667085] dark:text-[#8B95A5]">
                              {item.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </Card>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            3. ORGANIZATION OVERVIEW (COMPACT 2-COLUMN KPI GRID: 110–130px)
        ══════════════════════════════════════════════════════════════════ */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-[13.5px] sm:text-[14.5px] font-bold tracking-tight text-[#17202A] dark:text-[#F2F4F7]">
              Organization Overview
            </h2>
            <span className="text-[11px] font-mono text-[#667085] dark:text-[#8B95A5]">
              {mounted ? currentDateStr : ""}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-4">
            <Card className="justify-between h-[110px] md:h-[125px]">
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#667085] dark:text-[#8B95A5]">
                MEMBERS
              </span>
              <div>
                <span className="text-[22px] md:text-[26px] font-semibold font-mono text-[#17202A] dark:text-[#F2F4F7] leading-none">
                  {loading ? "—" : totalTeam}
                </span>
              </div>
              <span className="text-[11px] text-[#667085] dark:text-[#8B95A5]">
                Active team
              </span>
            </Card>

            <Card className="justify-between h-[110px] md:h-[125px]">
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#667085] dark:text-[#8B95A5]">
                PROJECTS
              </span>
              <div>
                <span className="text-[22px] md:text-[26px] font-semibold font-mono text-[#17202A] dark:text-[#F2F4F7] leading-none">
                  {loading ? "—" : (h.activeProjectsCount ?? 0)}
                </span>
              </div>
              <span className="text-[11px] text-[#667085] dark:text-[#8B95A5]">
                {h.activeTasksCount ?? 0} tasks active
              </span>
            </Card>

            <Card className="justify-between h-[110px] md:h-[125px]">
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#667085] dark:text-[#8B95A5]">
                APPROVALS
              </span>
              <div>
                <span className="text-[22px] md:text-[26px] font-semibold font-mono text-[#17202A] dark:text-[#F2F4F7] leading-none">
                  {loading ? "—" : (h.pendingReviewCount ?? 0)}
                </span>
              </div>
              <span className="text-[11px] text-[#667085] dark:text-[#8B95A5]">
                {(h.pendingReviewCount ?? 0) > 0 ? "Review needed" : "Clear"}
              </span>
            </Card>

            <Card className="justify-between h-[110px] md:h-[125px]">
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#667085] dark:text-[#8B95A5]">
                STATUS
              </span>
              <div className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${active ? "bg-emerald-500" : "bg-[#667085]"}`} />
                <span className="text-[15px] md:text-[17px] font-semibold text-[#17202A] dark:text-[#F2F4F7] leading-none uppercase tracking-tight">
                  {active ? "ON TRACK" : "PAUSED"}
                </span>
              </div>
              <span className="text-[11px] text-[#667085] dark:text-[#8B95A5]">
                {active ? "Operational" : "Off-hours"}
              </span>
            </Card>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            4. TODAY / ATTENTION
        ══════════════════════════════════════════════════════════════════ */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-[13.5px] sm:text-[14.5px] font-bold tracking-tight text-[#17202A] dark:text-[#F2F4F7]">
              TODAY
            </h2>
            {todayItems.length > 0 && (
              <Link
                href="/ceo/approvals"
                className="text-[12px] font-semibold text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7] transition-colors flex items-center gap-0.5"
              >
                View all <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>

          {loading ? (
            <div className="p-3 rounded-[12px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] animate-pulse">
              <div className="h-4 bg-[#E4E7EC] dark:bg-[#272D36] rounded w-2/5" />
            </div>
          ) : todayItems.length === 0 ? (
            <div className="flex items-center gap-2.5 p-3 rounded-[12px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] text-[13px] font-medium text-[#17202A] dark:text-[#F2F4F7]">
              <CheckCircle2 className="w-4.5 h-4.5 text-[#39D393] shrink-0" />
              <span>You&apos;re fully caught up · No actions require attention</span>
            </div>
          ) : (
            <Card className="py-2.5 px-3.5">
              <div className="divide-y divide-[#E4E7EC]/60 dark:divide-[#272D36]/60">
                {todayItems.slice(0, 3).map((item: any, idx: number) => (
                  <div
                    key={item.id ?? idx}
                    className="py-2 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-[11px] font-mono text-[#667085] dark:text-[#8B95A5] shrink-0">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-[#17202A] dark:text-[#F2F4F7] truncate">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-[#667085] dark:text-[#8B95A5] truncate mt-0.2">
                          {item.projectName || item.category || "Task"}
                          {item.owner && <span> · {item.owner}</span>}
                        </p>
                      </div>
                    </div>

                    {item.isDecision ? (
                      <button
                        onClick={() => approve(item.id)}
                        className="px-3 h-7 rounded-md bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[11.5px] font-semibold hover:opacity-90 transition-opacity shrink-0 cursor-pointer"
                      >
                        Approve
                      </button>
                    ) : (
                      <Link
                        href={item.projectId ? `/ceo/projects/${item.projectId}` : "/ceo/tasks"}
                        className="px-2.5 h-7 rounded-md border border-[#E4E7EC] dark:border-[#272D36] bg-[#FFFFFF] dark:bg-[#15191F] text-[11.5px] font-semibold text-[#17202A] dark:text-[#F2F4F7] hover:bg-[#F3F4F6] dark:hover:bg-[#181D24] transition-colors flex items-center gap-1 shrink-0"
                      >
                        Review <ArrowUpRight className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            5. RISKS & DEADLINES + PROJECT HEALTH
        ══════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4">
          {/* RISKS & DEADLINES CARD */}
          <Card className="md:col-span-5 py-3 px-3.5">
            <div className="pb-2 border-b border-[#E4E7EC] dark:border-[#272D36]">
              <span className="text-[10.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-[0.08em]">
                RISKS &amp; DEADLINES
              </span>
            </div>
            <div className="pt-2.5">
              <div className="grid grid-cols-2 gap-2 text-[12px] font-medium text-[#17202A] dark:text-[#F2F4F7]">
                <div className="p-2 rounded-lg bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] flex flex-col justify-between">
                  <span className="text-[9.5px] font-semibold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider">Overdue</span>
                  <span className="text-[17px] font-mono font-semibold mt-0.5">{dl.overdue?.length ?? 0}</span>
                </div>
                <div className="p-2 rounded-lg bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] flex flex-col justify-between">
                  <span className="text-[9.5px] font-semibold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider">Blocked</span>
                  <span className="text-[17px] font-mono font-semibold mt-0.5">{h.blockedCount ?? 0}</span>
                </div>
                <div className="p-2 rounded-lg bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] flex flex-col justify-between">
                  <span className="text-[9.5px] font-semibold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider">Due today</span>
                  <span className="text-[17px] font-mono font-semibold mt-0.5">{dl.dueToday?.length ?? 0}</span>
                </div>
                <div className="p-2 rounded-lg bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] flex flex-col justify-between">
                  <span className="text-[9.5px] font-semibold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider">At risk</span>
                  <span className="text-[17px] font-mono font-semibold mt-0.5">{atRisk}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* PROJECT HEALTH CARD */}
          <Card className="md:col-span-7 py-3 px-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-[#E4E7EC] dark:border-[#272D36]">
              <span className="text-[10.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-[0.08em]">
                PROJECT HEALTH
              </span>
              <Link
                href="/ceo/projects"
                className="text-[11.5px] font-semibold text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7] transition-colors flex items-center gap-0.5"
              >
                View all <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="pt-2 flex-1 flex flex-col justify-center">
              {loading ? (
                <div className="space-y-2 animate-pulse py-2">
                  <div className="h-3.5 bg-[#E4E7EC] dark:bg-[#272D36] rounded w-1/2" />
                  <div className="h-3.5 bg-[#E4E7EC] dark:bg-[#272D36] rounded w-3/4" />
                </div>
              ) : projects.length === 0 ? (
                <CompactEmpty
                  title="No active projects"
                  description="Create a project to begin tracking organization work."
                  actionLabel="+ Create project"
                  actionHref="/ceo/projects"
                />
              ) : (
                <div className="space-y-2.5 py-0.5">
                  {projects.slice(0, 3).map((p: any) => (
                    <Link
                      key={p.id}
                      href={`/ceo/projects/${p.id}`}
                      className="block space-y-1 group cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[12.5px] font-semibold text-[#17202A] dark:text-[#F2F4F7] group-hover:text-[#C9A52A] dark:group-hover:text-[#D4B12F] transition-colors truncate">
                          {p.name}
                        </span>
                        <span className="text-[11.5px] font-mono font-semibold text-[#17202A] dark:text-[#F2F4F7] shrink-0 ml-2">
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
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            6. PEOPLE & LEADERSHIP CARD
        ══════════════════════════════════════════════════════════════════ */}
        <Card className="py-3 px-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-[#E4E7EC] dark:border-[#272D36]">
            <span className="text-[10.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-[0.08em]">
              PEOPLE &amp; LEADERSHIP
            </span>
            <Link
              href="/ceo/co-ceos"
              className="text-[11.5px] font-semibold text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7] transition-colors"
            >
              Manage →
            </Link>
          </div>

          <div className="pt-2 space-y-3">
            <div className="grid grid-cols-2 gap-2 text-[12px] font-medium text-[#667085] dark:text-[#8B95A5]">
              <div className="p-2 rounded-lg bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36]">
                <span className="block uppercase text-[9.5px] tracking-wider font-semibold">CO-CEOs</span>
                <span className="text-[16px] font-semibold font-mono text-[#17202A] dark:text-[#F2F4F7] mt-0.5 block">
                  {coceos.filter((c: any) => c.role === "CO-CEO").length}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36]">
                <span className="block uppercase text-[9.5px] tracking-wider font-semibold">Members</span>
                <span className="text-[16px] font-semibold font-mono text-[#17202A] dark:text-[#F2F4F7] mt-0.5 block">
                  {coceos.filter((c: any) => c.role === "MEMBER").length}
                </span>
              </div>
            </div>

            {coceos.filter((c: any) => c.role === "CO-CEO").length === 0 ? (
              <p className="text-[11.5px] text-[#667085] dark:text-[#8B95A5] pt-0.5">
                No CO-CEOs assigned yet
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {coceos.filter((c: any) => c.role === "CO-CEO").map((c: any) => (
                  <div key={c.id} className="p-2.5 rounded-xl bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC]/80 dark:border-[#272D36]/80 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#C9A52A]/20 text-[#C9A52A] dark:text-[#D4B12F] flex items-center justify-center text-[10.5px] font-bold">
                          {c.name?.charAt(0) ?? "C"}
                        </div>
                        <span className="text-[13px] font-semibold text-[#17202A] dark:text-[#F2F4F7]">
                          {c.name}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono font-semibold text-[#39D393]">
                        {c.progress ?? 0}%
                      </span>
                    </div>

                    {Array.isArray(c.members) && c.members.length > 0 && (
                      <div className="text-[11px] text-[#667085] dark:text-[#8B95A5] pt-0.5 border-t border-[#E4E7EC]/40 dark:border-[#272D36]/40 flex items-center justify-between">
                        <span>Reporting members:</span>
                        <span className="font-medium text-[#17202A] dark:text-[#F2F4F7]">
                          {c.members.join(", ")}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* ══════════════════════════════════════════════════════════════════
            7. LOWER ROW (LEADERBOARD & RECENT ACTIVITY)
        ══════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4">
          {/* LEADERBOARD CARD */}
          <Card className="md:col-span-6 py-3 px-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-[#E4E7EC] dark:border-[#272D36]">
              <div className="flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-[#C9A52A] dark:text-[#D4B12F]" />
                <span className="text-[10.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-[0.08em]">
                  LEADERBOARD
                </span>
              </div>
              <Link
                href="/ceo/co-ceos"
                className="text-[11.5px] font-semibold text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7] transition-colors flex items-center gap-0.5"
              >
                This week →
              </Link>
            </div>

            <div className="pt-2 flex-1 flex flex-col justify-center">
              {loading ? (
                <div className="space-y-2 animate-pulse py-1">
                  <div className="h-3.5 bg-[#E4E7EC] dark:bg-[#272D36] rounded w-1/3" />
                </div>
              ) : coceos.length === 0 ? (
                <CompactEmpty
                  title="No ranking data yet"
                  description="Results appear after qualifying work is recorded."
                />
              ) : (
                <div className="divide-y divide-[#E4E7EC]/60 dark:divide-[#272D36]/60">
                  {coceos.map((member: any, idx: number) => (
                    <div key={member.id ?? idx} className="py-2 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-[11px] font-mono font-semibold text-[#667085] dark:text-[#8B95A5] w-4">
                          #{String(idx + 1).padStart(2, "0")}
                        </span>
                        <div className="w-6 h-6 rounded-full bg-[#E4E7EC] dark:bg-[#272D36] flex items-center justify-center text-[11px] font-semibold text-[#17202A] dark:text-[#F2F4F7]">
                          {member.name?.charAt(0) ?? "M"}
                        </div>
                        <span className="text-[12.5px] font-semibold text-[#17202A] dark:text-[#F2F4F7]">
                          {member.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11.5px]">
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

          {/* RECENT ACTIVITY CARD */}
          <Card className="md:col-span-6 py-3 px-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-[#E4E7EC] dark:border-[#272D36]">
              <span className="text-[10.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-[0.08em]">
                RECENT ACTIVITY
              </span>
              <Link
                href="/ceo/audit"
                className="text-[11.5px] font-semibold text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7] transition-colors flex items-center gap-0.5"
              >
                Audit log →
              </Link>
            </div>

            <div className="pt-2 flex-1 flex flex-col justify-center">
              {loading ? (
                <div className="space-y-2 animate-pulse py-1">
                  <div className="h-3.5 bg-[#E4E7EC] dark:bg-[#272D36] rounded w-1/3" />
                </div>
              ) : groupedActivity.length === 0 ? (
                <CompactEmpty
                  title="No recent activity"
                  description="Organization activity will appear here."
                />
              ) : (
                <div className="space-y-2.5 py-0.5">
                  {groupedActivity.map((act: any, i: number) => (
                    <div key={act.id ?? i} className="flex items-start gap-2.5 text-[11.5px]">
                      <span className="font-mono text-[#667085] dark:text-[#8B95A5] shrink-0 pt-0.2">
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
