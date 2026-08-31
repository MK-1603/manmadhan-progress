"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { 
  Focus as FocusIcon, 
  CheckCircle2, 
  Trophy, 
  AlertCircle, 
  RefreshCw, 
  ShieldAlert, 
  ChevronDown,
  ArrowRight,
  Clock,
  Plus
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { useAuth } from "../auth/auth-context";
import { useSocket } from "../providers/socket-provider";
import { useRegisterRefresh } from "../providers/global-refresh-provider";
import { fetchDashboardData } from "@/services/dashboard-service";

export interface OrganizationDashboardViewProps {
  role: "CEO" | "CO-CEO" | "MEMBER";
}

function ProgressBar({ value, gold }: { value: number; gold?: boolean }) {
  return (
    <div className="h-1.5 w-full bg-[#E4E7EC] dark:bg-[#272D36] rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${
          gold ? "bg-[#C9A52A] dark:bg-[#D4B12F]" : "bg-[#17202A] dark:bg-[#F2F4F7]"
        }`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-card border border-border rounded-xl p-3.5 sm:p-4 shadow-2xs flex flex-col ${className}`}>
      {children}
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg p-2.5 shadow-xl text-xs font-sans select-none">
        <p className="font-bold text-foreground">{label}</p>
        <p className="text-[11px] font-mono text-[#C9A52A] font-extrabold mt-0.5">
          Execution: {payload[0].value}%
        </p>
      </div>
    );
  }
  return null;
}

function ExecutionTimeGraph({ data }: { data: any[] }) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !data || data.length === 0) {
    return (
      <div className="py-3 px-3.5 border border-dashed border-border rounded-lg text-center my-1 select-none">
        <p className="text-xs font-bold text-foreground">Not enough execution history yet.</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Complete more qualifying work to build your organization trend.
        </p>
      </div>
    );
  }

  return (
    <div className="h-44 sm:h-52 w-full pt-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#C9A52A" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#C9A52A" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-10" />
          <XAxis 
            dataKey="label" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 11, fill: "currentColor", opacity: 0.6 }} 
            dy={8}
          />
          <YAxis 
            domain={[0, 100]} 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 11, fill: "currentColor", opacity: 0.6 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area 
            type="monotone" 
            dataKey="val" 
            stroke="#C9A52A" 
            strokeWidth={2.5} 
            fillOpacity={1} 
            fill="url(#goldGradient)" 
            dot={{ r: 3, fill: "#C9A52A", strokeWidth: 0 }}
            activeDot={{ r: 5, fill: "#C9A52A", stroke: "#ffffff", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function OrganizationDashboardView({ role }: OrganizationDashboardViewProps) {
  const { user, authStatus } = useAuth();
  const { socket } = useSocket();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [secError, setSecError] = useState<{ global?: boolean; unauthorized?: boolean }>({});
  
  // Real-time ticking clock for local greeting and date/time
  const [now, setNow] = useState<Date | null>(null);
  const [analyticsRange, setAnalyticsRange] = useState<"7D" | "30D" | "90D">("7D");
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<"week" | "month" | "quarter" | "all">("week");
  const [isLeaderboardDropdownOpen, setIsLeaderboardDropdownOpen] = useState(false);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const isWorking = useCallback(() => {
    const h = (now || new Date()).getHours();
    return h >= 4 && h < 23;
  }, [now]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : null;
      const dashData = await fetchDashboardData({
        workspaceId: wsId,
        forceRefresh: true,
        range: analyticsRange,
        leaderboardPeriod: leaderboardPeriod,
      });
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
  }, [analyticsRange, leaderboardPeriod]);

  useEffect(() => {
    if (authStatus === "authenticated") {
      loadData();
    } else if (authStatus === "unauthenticated") {
      setLoading(false);
      setSecError({ unauthorized: true });
    }
  }, [loadData, authStatus, user?.id]);

  useEffect(() => {
    if (!socket) return;
    socket.on("workspace_update", loadData);
    socket.on("approval.updated", loadData);
    socket.on("task.updated", loadData);
    return () => {
      socket.off("workspace_update", loadData);
      socket.off("approval.updated", loadData);
      socket.off("task.updated", loadData);
    };
  }, [socket, loadData]);

  useRegisterRefresh(loadData);

  // Authenticated CEO User Name (Never hardcoded!)
  const ceoDisplayName = useMemo(() => {
    return user?.displayName || user?.name || "Executive";
  }, [user?.displayName, user?.name]);

  // Derived Batch ID & Org Name
  const batchId = useMemo(() => {
    return user?.batchNumber || data?.organization?.batchNumber || data?.workspace?.batchNumber || "";
  }, [user?.batchNumber, data?.organization?.batchNumber, data?.workspace?.batchNumber]);

  const orgName = useMemo(() => {
    return data?.organization?.name || "Organization Workspace";
  }, [data?.organization?.name]);

  // Dynamic time-of-day greeting (Good Morning / Afternoon / Evening / Night)
  const greetingPrefix = useMemo(() => {
    if (!now) return "Good Morning";
    const hr = now.getHours();
    if (hr >= 4 && hr < 12) return "Good Morning";
    if (hr >= 12 && hr < 17) return "Good Afternoon";
    if (hr >= 17 && hr < 22) return "Good Evening";
    return "Good Night";
  }, [now]);

  const formattedDateStr = useMemo(() => {
    if (!now) return "";
    return format(now, "EEEE, d MMMM yyyy");
  }, [now]);

  const formattedTimeStr = useMemo(() => {
    if (!now) return "";
    return format(now, "hh:mm:ss a");
  }, [now]);

  // Derived Telemetry & Metrics
  const health = data?.health ?? {};
  const execution = data?.execution ?? {
    overallProgress: health.overallProgress ?? 0,
    completedToday: health.completedTodayCount ?? 0,
    onTimeRate: health.onTimeCompletionRate ?? 100,
    overdue: health.overdueCount ?? 0,
  };

  const snapshot = data?.snapshot ?? {
    projects: {
      total: health.activeProjectsCount ?? 0,
      active: health.activeProjectsCount ?? 0,
      atRisk: 0,
      completed: 0,
    },
    tasks: {
      total: health.activeTasksCount ?? 0,
      active: health.activeTasksCount ?? 0,
      completed: 0,
      overdue: health.overdueCount ?? 0,
    },
    approvals: {
      pendingCount: health.pendingReviewCount ?? 0,
    },
    status: {
      indicator: isWorking() ? "ON TRACK" : "PAUSED",
      label: isWorking() ? "Operational" : "Off-hours",
    },
  };

  // Work-Started State Machine Signal
  const hasQualifyingWorkStarted = useMemo(() => {
    if (typeof data?.hasQualifyingWorkStarted === "boolean") {
      return data.hasQualifyingWorkStarted;
    }
    return (snapshot.projects.total > 0 || snapshot.tasks.total > 0 || execution.overallProgress > 0);
  }, [data?.hasQualifyingWorkStarted, snapshot.projects.total, snapshot.tasks.total, execution.overallProgress]);

  const attentionItems: any[] = data?.attentionItems ?? [];
  const leaderboard: any[] = data?.leaderboard ?? data?.coCeoPerformance ?? [];
  const activity: any[] = data?.recentActivities ?? [];

  // Deduplicated Activity Logs
  const groupedActivity = useMemo(() => {
    const out: any[] = [];
    const seen = new Set<string>();
    for (const act of activity) {
      const key = `${act.id || act.createdAt}__${act.eventType || ""}__${act.details || ""}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push(act);
      }
    }
    return out.slice(0, 6);
  }, [activity]);

  // Current User Rank in Leaderboard
  const userRankIndex = useMemo(() => {
    if (!user?.id || !Array.isArray(leaderboard)) return -1;
    return leaderboard.findIndex((m: any) => m.id === user.id || m.userId === user.id);
  }, [user?.id, leaderboard]);

  // Role-specific navigation href
  const rolePrefix = role === "CEO" ? "/ceo" : role === "CO-CEO" ? "/co-ceo" : "/member";

  // Active trend series data
  const chartData = useMemo(() => {
    if (Array.isArray(data?.trendSeries?.data) && data.trendSeries.data.length > 0) {
      return data.trendSeries.data;
    }
    if (Array.isArray(data?.trendSeries?.[analyticsRange]) && data.trendSeries[analyticsRange].length > 0) {
      return data.trendSeries[analyticsRange];
    }
    return [];
  }, [data?.trendSeries, analyticsRange]);

  return (
    <div className="w-full max-w-full min-h-full bg-[#F8F9FB] dark:bg-[#0B0E12] text-foreground font-sans select-none">
      <div className="px-3.5 sm:px-5 md:px-8 py-3.5 md:py-6 max-w-[1400px] mx-auto space-y-4 md:space-y-5 pb-8">

        {/* ══════════════════════════════════════════════════════════════════
            01. CONTEXT & CEO INTRO
        ══════════════════════════════════════════════════════════════════ */}
        <div className="pb-3.5 border-b border-border space-y-2.5">
          <div className="flex flex-row items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              {/* Dynamic Time Greeting with Organization Batch ID */}
              <h1 className="text-[20px] sm:text-[24px] md:text-[28px] font-extrabold text-foreground tracking-tight leading-tight truncate">
                {greetingPrefix}{batchId ? `, ${batchId}` : ""}
              </h1>

              {/* Date & System Clock */}
              <p className="text-xs sm:text-sm font-semibold text-muted-foreground flex items-center gap-1.5 flex-wrap">
                <span>{now ? formattedDateStr : "Loading date..."}</span>
                <span className="text-muted-foreground/40">•</span>
                <span className="font-mono text-foreground font-medium">{now ? formattedTimeStr : "--:--:--"}</span>
              </p>

              {/* Organization Context */}
              <div className="pt-0.5 flex items-center gap-2 text-xs">
                <span className="font-mono font-bold text-foreground">
                  Organization Workspace
                </span>
                {batchId && (
                  <>
                    <span className="text-muted-foreground/40">•</span>
                    <span className="font-mono font-medium text-muted-foreground">
                      Batch ID · {batchId}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Role Focus Shortcut */}
            {rolePrefix !== "/ceo" && (
              <div className="shrink-0 pt-0.5">
                <Link
                  href={`${rolePrefix}/focus`}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 h-[36px] rounded-xl bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-xs font-extrabold hover:opacity-90 active:scale-[0.98] transition-all shadow-2xs whitespace-nowrap cursor-pointer"
                >
                  <FocusIcon className="w-3.5 h-3.5 shrink-0" />
                  <span>Focus →</span>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Security & Error Banners */}
        {secError.unauthorized && (
          <div className="flex items-center justify-between p-3 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Session expired. Please sign in again.</span>
            </div>
            <Link href="/login" className="font-extrabold underline hover:opacity-90">
              Sign In
            </Link>
          </div>
        )}

        {secError.global && !secError.unauthorized && (
          <div className="flex items-center justify-between p-3 rounded-xl border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-semibold">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Unable to load organization dashboard metrics.</span>
            </div>
            <button
              onClick={loadData}
              className="flex items-center gap-1 font-extrabold hover:underline cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        )}

        {/* FIRST-TIME ORGANIZATION ONBOARDING BANNER */}
        {!loading && !hasQualifyingWorkStarted && snapshot.projects.total === 0 && (
          <Card className="p-4 sm:p-4.5 border-l-4 border-l-[#C9A52A] bg-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 shadow-2xs">
            <div className="space-y-1">
              <h2 className="text-sm font-extrabold text-foreground">Your organization is ready</h2>
              <p className="text-xs text-muted-foreground">
                Create your first project to start tracking organization execution, tasks, and team contribution.
              </p>
            </div>
            {role === "CEO" && (
              <Link
                href={`${rolePrefix}/projects`}
                className="px-4 h-[34px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-xs font-extrabold hover:opacity-90 transition-all shadow-2xs whitespace-nowrap cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Project</span>
              </Link>
            )}
          </Card>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            02. NEEDS ATTENTION PANEL
        ══════════════════════════════════════════════════════════════════ */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[10px] font-mono font-bold tracking-wider text-muted-foreground uppercase">
              NEEDS ATTENTION
            </h2>
          </div>

          {loading ? (
            <div className="p-4 rounded-xl bg-card border border-border animate-pulse h-16" />
          ) : attentionItems.length === 0 ? (
            <Card className="p-4 flex flex-row items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                  ✓ ALL CAUGHT UP
                </span>
                <span className="text-[11px] text-muted-foreground mt-0.5">
                  No actions require your attention.
                </span>
              </div>
            </Card>
          ) : (
            <Card className="p-3.5 sm:p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-foreground">
                  {attentionItems.length} item{attentionItems.length > 1 ? "s" : ""} require your attention
                </span>
                <Link
                  href={`${rolePrefix}/approvals`}
                  className="text-xs font-extrabold text-[#C9A52A] hover:underline inline-flex items-center gap-1"
                >
                  <span>Review all →</span>
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {attentionItems.slice(0, 6).map((item: any, idx: number) => (
                  <Link
                    key={item.id || idx}
                    href={item.targetUrl || `${rolePrefix}/approvals`}
                    className="p-3 rounded-lg border border-border hover:border-[#C9A52A]/40 bg-muted/30 hover:bg-muted/60 transition-all flex flex-col justify-between group"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className={`text-[9.5px] font-mono font-extrabold uppercase px-1.5 py-0.5 rounded ${
                          item.type === "APPROVAL" ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" :
                          item.type === "OVERDUE" ? "bg-red-500/15 text-red-600 dark:text-red-400" :
                          "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                        }`}>
                          {item.category || item.type || "ATTENTION"}
                        </span>
                        <ArrowRight className="w-3 h-3 text-muted-foreground group-hover:text-[#C9A52A] transition-colors" />
                      </div>
                      <p className="text-xs font-bold text-foreground leading-snug line-clamp-1 group-hover:text-[#C9A52A] transition-colors pt-0.5">
                        {item.title}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[10.5px] text-muted-foreground pt-2 mt-1 border-t border-border/40">
                      <span className="truncate max-w-[120px]">{item.owner}</span>
                      {item.deadline && (
                        <span className="font-mono flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {format(new Date(item.deadline), "d MMM")}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            03. EXECUTION SECTION & TREND GRAPH
        ══════════════════════════════════════════════════════════════════ */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[10px] font-mono font-bold tracking-wider text-muted-foreground uppercase">
              EXECUTION
            </h2>
            <div className="flex items-center gap-0.5 bg-muted/60 p-0.5 rounded-lg border border-border select-none">
              {(["7D", "30D", "90D"] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setAnalyticsRange(range)}
                  className={`px-2.5 py-0.5 text-[10.5px] font-bold rounded-md transition-all cursor-pointer ${
                    analyticsRange === range
                      ? "bg-card text-foreground shadow-2xs font-extrabold border border-border"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          <Card className="py-3.5 px-4 space-y-3.5">
            {loading ? (
              <div className="py-4 space-y-3 animate-pulse">
                <div className="h-4 bg-muted rounded w-1/3" />
                <div className="h-24 bg-muted rounded w-full" />
              </div>
            ) : (
              <div className="space-y-3.5">
                {/* 4 Compact Metric Cards Header */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pb-2 border-b border-border">
                  <div className="space-y-0.5">
                    <span className="text-[9.5px] font-mono font-bold text-muted-foreground uppercase">
                      OVERALL PROGRESS
                    </span>
                    <p className="text-[20px] sm:text-[24px] font-mono font-extrabold text-foreground leading-none">
                      {execution.overallProgress}%
                    </p>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[9.5px] font-mono font-bold text-muted-foreground uppercase">
                      COMPLETED TODAY
                    </span>
                    <p className="text-[20px] sm:text-[24px] font-mono font-extrabold text-foreground leading-none">
                      {execution.completedToday}
                    </p>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[9.5px] font-mono font-bold text-muted-foreground uppercase">
                      ON-TIME RATE
                    </span>
                    <p className="text-[20px] sm:text-[24px] font-mono font-extrabold text-emerald-500 leading-none">
                      {execution.onTimeRate}%
                    </p>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[9.5px] font-mono font-bold text-muted-foreground uppercase">
                      OVERDUE
                    </span>
                    <p className={`text-[20px] sm:text-[24px] font-mono font-extrabold leading-none ${
                      execution.overdue > 0 ? "text-red-500" : "text-foreground"
                    }`}>
                      {execution.overdue}
                    </p>
                  </div>
                </div>

                <ProgressBar value={execution.overallProgress} gold />

                {/* Execution Trend Visualization */}
                <ExecutionTimeGraph data={chartData} />
              </div>
            )}
          </Card>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            04. ORGANIZATION SNAPSHOT (4 METRICS)
        ══════════════════════════════════════════════════════════════════ */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[10px] font-mono font-bold tracking-wider text-muted-foreground uppercase">
              ORGANIZATION
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3.5">
            {/* PROJECTS */}
            <Card className="justify-between h-[105px] p-3.5">
              <span className="text-[9.5px] font-mono font-bold uppercase text-muted-foreground">
                PROJECTS
              </span>
              <span className="text-[22px] md:text-[26px] font-extrabold font-mono text-foreground leading-none">
                {loading ? "—" : snapshot.projects.total}
              </span>
              <span className="text-[10.5px] text-muted-foreground font-medium truncate">
                {snapshot.projects.total === 0 ? "No projects yet" : `${snapshot.projects.active} Active · ${snapshot.projects.atRisk} At Risk · ${snapshot.projects.completed} Completed`}
              </span>
            </Card>

            {/* TASKS */}
            <Card className="justify-between h-[105px] p-3.5">
              <span className="text-[9.5px] font-mono font-bold uppercase text-muted-foreground">
                TASKS
              </span>
              <span className="text-[22px] md:text-[26px] font-extrabold font-mono text-foreground leading-none">
                {loading ? "—" : snapshot.tasks.total}
              </span>
              <span className="text-[10.5px] text-muted-foreground font-medium truncate">
                {snapshot.tasks.total === 0 ? "No active tasks" : `${snapshot.tasks.active} Active · ${snapshot.tasks.completed} Completed · ${snapshot.tasks.overdue} Overdue`}
              </span>
            </Card>

            {/* APPROVALS */}
            <Card className="justify-between h-[105px] p-3.5">
              <span className="text-[9.5px] font-mono font-bold uppercase text-muted-foreground">
                APPROVALS
              </span>
              <span className="text-[22px] md:text-[26px] font-extrabold font-mono text-foreground leading-none">
                {loading ? "—" : snapshot.approvals.pendingCount}
              </span>
              <span className="text-[10.5px] text-muted-foreground font-medium">
                Pending CEO Review
              </span>
            </Card>

            {/* STATUS */}
            <Card className="justify-between h-[105px] p-3.5">
              <span className="text-[9.5px] font-mono font-bold uppercase text-muted-foreground">
                STATUS
              </span>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  snapshot.status.indicator === "ON TRACK" ? "bg-emerald-500 animate-pulse" :
                  snapshot.status.indicator === "CRITICAL" ? "bg-red-500 animate-pulse" :
                  snapshot.status.indicator === "AT RISK" || snapshot.status.indicator === "NEEDS ATTENTION" ? "bg-amber-500 animate-pulse" :
                  "bg-muted-foreground"
                }`} />
                <span className="text-[14px] md:text-[16px] font-extrabold text-foreground leading-none uppercase tracking-tight">
                  {snapshot.status.indicator}
                </span>
              </div>
              <span className="text-[10.5px] text-muted-foreground font-medium">
                {snapshot.status.label}
              </span>
            </Card>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            05 & 06. LEADERBOARD & RECENT ACTIVITY (GRID SIDE-BY-SIDE)
        ══════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 md:gap-4">
          
          {/* REAL LEADERBOARD CARD */}
          <Card className="md:col-span-6 py-3.5 px-4 min-h-[220px] justify-between">
            <div className="flex items-center justify-between pb-2.5 border-b border-border">
              <div className="flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-[#C9A52A]" />
                <div>
                  <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase block leading-none">
                    LEADERBOARD
                  </span>
                  <span className="text-[9.5px] font-medium text-muted-foreground/80 block mt-0.5">
                    Team contribution
                  </span>
                </div>
              </div>

              {/* Period Dropdown Selector */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsLeaderboardDropdownOpen(prev => !prev)}
                  className="text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 cursor-pointer focus:outline-none"
                >
                  <span>
                    {leaderboardPeriod === "week" ? "This week" : leaderboardPeriod === "month" ? "This month" : leaderboardPeriod === "quarter" ? "This quarter" : "All time"}
                  </span>
                  <ChevronDown className="w-3 h-3" />
                </button>

                {isLeaderboardDropdownOpen && (
                  <div className="absolute right-0 mt-1 w-32 rounded-lg border border-border bg-card shadow-lg py-1 z-30 text-xs select-none">
                    {[
                      { id: "week", label: "This week" },
                      { id: "month", label: "This month" },
                      { id: "quarter", label: "This quarter" },
                      { id: "all", label: "All time" },
                    ].map(p => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setLeaderboardPeriod(p.id as any);
                          setIsLeaderboardDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-[11px] font-medium hover:bg-muted transition-colors cursor-pointer ${
                          leaderboardPeriod === p.id ? "font-bold text-[#C9A52A]" : "text-foreground"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="py-2 flex-1 flex flex-col justify-between">
              {loading ? (
                <div className="space-y-2.5 animate-pulse py-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-2/3" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </div>
              ) : !hasQualifyingWorkStarted ? (
                <div className="py-6 flex flex-col items-center justify-center text-center">
                  <p className="text-xs font-bold text-foreground">Leaderboard starts when your team begins qualifying work.</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 max-w-[260px]">
                    No rankings yet. Complete tasks to start building team contribution.
                  </p>
                </div>
              ) : leaderboard.length === 0 ? (
                <div className="py-6 flex flex-col items-center justify-center text-center">
                  <p className="text-xs font-bold text-foreground">No execution activity yet.</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 max-w-[240px]">
                    Complete work to start building the leaderboard.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {leaderboard.slice(0, 5).map((member: any, idx: number) => {
                    const canonicalId = member.userId || member.id || `mem-${idx}`;
                    const scoreVal = member.score ?? member.progress ?? 0;
                    return (
                      <div key={canonicalId} className="py-2 flex items-center justify-between">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`text-[11px] font-mono font-bold w-4 shrink-0 ${idx === 0 ? "text-[#C9A52A]" : "text-muted-foreground"}`}>
                            #{String(idx + 1).padStart(2, "0")}
                          </span>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10.5px] font-bold shrink-0 ${
                            idx === 0 ? "bg-[#C9A52A]/20 text-[#C9A52A] border border-[#C9A52A]/30" : "bg-muted text-muted-foreground"
                          }`}>
                            {(member.displayName || member.name || "M").charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs font-bold text-foreground truncate">
                            {member.displayName || member.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] shrink-0">
                          <span className="font-mono font-bold text-foreground">
                            {scoreVal} pts
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Position badge (Team members only, excluded for CEO) */}
              {role !== "CEO" && hasQualifyingWorkStarted && userRankIndex >= 0 && (
                <div className="pt-2 mt-2 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Your position</span>
                  <span className="font-mono font-extrabold text-[#C9A52A]">
                    #{String(userRankIndex + 1).padStart(2, "0")}
                  </span>
                </div>
              )}
            </div>
          </Card>

          {/* RECENT ACTIVITY CARD */}
          <Card className="md:col-span-6 py-3.5 px-4 min-h-[220px] justify-between">
            <div className="flex items-center justify-between pb-2.5 border-b border-border">
              <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase">
                RECENT ACTIVITY
              </span>
              <Link
                href={`${rolePrefix}/audit`}
                className="text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5"
              >
                Audit log →
              </Link>
            </div>

            <div className="py-2 flex-1 flex flex-col justify-center">
              {loading ? (
                <div className="space-y-2.5 animate-pulse py-2">
                  <div className="h-4 bg-muted rounded w-2/3" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </div>
              ) : groupedActivity.length === 0 ? (
                <div className="py-6 flex flex-col items-center justify-center text-center">
                  <p className="text-xs font-bold text-foreground">No recent organization activity.</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 max-w-[240px]">
                    Organization activity will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 py-0.5">
                  {groupedActivity.map((act: any, i: number) => (
                    <div key={act.id || i} className="flex items-start gap-2.5 text-[11px]">
                      <span className="font-mono text-muted-foreground shrink-0 pt-0.5 text-[10px]">
                        {act.createdAt ? format(new Date(act.createdAt), "HH:mm") : "—"}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground leading-snug truncate">
                          <span className="font-bold">{act.userName || "System"}</span>{" "}
                          <span className="text-muted-foreground">
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
