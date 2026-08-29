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
  ChevronDown
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
import apiClient from "@/lib/api-client";
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
    <div className="flex flex-col items-center justify-center text-center py-4 px-3 w-full my-auto">
      <p className="text-xs font-bold text-foreground">
        {title}
      </p>
      <p className="text-[11px] text-muted-foreground max-w-[260px] mt-0.5 leading-snug">
        {description}
      </p>
      {actionLabel && (
        actionHref ? (
          <Link
            href={actionHref}
            className="mt-2.5 inline-flex items-center justify-center h-[30px] px-3 rounded-lg bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-xs font-bold hover:opacity-90 transition-opacity shadow-2xs whitespace-nowrap"
          >
            {actionLabel}
          </Link>
        ) : (
          <button
            onClick={onAction}
            className="mt-2.5 inline-flex items-center justify-center h-[30px] px-3 rounded-lg bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-xs font-bold hover:opacity-90 transition-opacity shadow-2xs whitespace-nowrap cursor-pointer"
          >
            {actionLabel}
          </button>
        )
      )}
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
      <div className="h-44 w-full flex flex-col items-center justify-center border border-dashed border-border rounded-xl p-4 text-center my-2">
        <p className="text-xs font-bold text-foreground">No execution trend data yet</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 max-w-[260px]">
          Complete qualifying work to start building your execution trend over time.
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
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<"week" | "month" | "all">("week");
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

  // Derive Batch ID
  const batchId = useMemo(() => {
    return user?.batchNumber || data?.workspace?.batchNumber || "MM1107";
  }, [user?.batchNumber, data?.workspace?.batchNumber]);

  // Derived greeting based strictly on user's local time (No personal names allowed!)
  const greetingTime = useMemo(() => {
    if (!now) return "Good Morning";
    const hr = now.getHours();
    if (hr < 12) return "Good Morning";
    if (hr < 18) return "Good Afternoon";
    return "Good Evening";
  }, [now]);

  const formattedDateStr = useMemo(() => {
    if (!now) return "";
    return format(now, "EEEE, d MMMM yyyy");
  }, [now]);

  const formattedTimeStr = useMemo(() => {
    if (!now) return "";
    return format(now, "hh:mm:ss a");
  }, [now]);

  // Derived Metrics & Telemetry
  const h = data?.health ?? {};
  const active = isWorking();
  const execPct = loading ? null : (h.overallProgress ?? 0);

  const decisions = data?.attentionItems ?? [];
  const priorities = data?.todayPriorities ?? [];
  const activity = data?.recentActivities ?? [];
  const coceos = data?.coCeoPerformance ?? [];

  // Today Action Items
  const todayTasks = priorities.length;
  const todayApprovals = decisions.length;
  const totalTodayActions = todayTasks + todayApprovals;
  const hasUrgentAction = (h.overdueCount ?? 0) > 0 || (h.blockedCount ?? 0) > 0;

  // Deduplicated Activity Logs
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

  // Current User Position in Leaderboard
  const userRankIndex = useMemo(() => {
    if (!user?.id || !Array.isArray(coceos)) return -1;
    return coceos.findIndex((m: any) => m.id === user.id || m.userId === user.id);
  }, [user?.id, coceos]);

  // Role-specific navigation hrefs
  const rolePrefix = role === "CEO" ? "/ceo" : role === "CO-CEO" ? "/co-ceo" : "/member";

  const chartData = useMemo(() => {
    return Array.isArray(data?.trendSeries?.[analyticsRange])
      ? data.trendSeries[analyticsRange]
      : [];
  }, [data?.trendSeries, analyticsRange]);

  return (
    <div className="w-full max-w-full overflow-x-hidden min-h-full bg-[#F8F9FB] dark:bg-[#0B0E12] text-foreground font-sans select-none">
      <div className="px-3.5 sm:px-5 md:px-8 py-3.5 md:py-6 max-w-[1400px] mx-auto space-y-4 md:space-y-6 pb-[calc(84px+env(safe-area-inset-bottom))] md:pb-8">

        {/* ══════════════════════════════════════════════════════════════════
            01 & 02 & 03. GREETING / TIME + WORKSPACE CONTEXT + FOCUS
        ══════════════════════════════════════════════════════════════════ */}
        <div className="pb-4 border-b border-border space-y-3">
          <div className="flex flex-row items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              {/* Dynamic Local Time Greeting with Batch ID */}
              <h1 className="text-[20px] sm:text-[26px] md:text-[30px] font-extrabold text-foreground tracking-tight leading-tight truncate">
                {greetingTime}, {batchId}
              </h1>

              {/* Dynamic Date & Ticking Time */}
              <p className="text-xs sm:text-sm font-semibold text-muted-foreground flex items-center gap-1.5 flex-wrap">
                <span>{now ? formattedDateStr : "Loading date..."}</span>
                <span className="text-muted-foreground/40">•</span>
                <span className="font-mono text-foreground">{now ? formattedTimeStr : "--:--:--"}</span>
              </p>

              {/* Subtle Workspace & Batch Context Identifier */}
              <div className="pt-1">
                <span className="text-xs font-mono font-bold text-foreground block leading-none">
                  Organization Workspace
                </span>
                <span className="text-[11px] font-medium text-muted-foreground block mt-0.5">
                  Batch ID · {batchId}
                </span>
              </div>
            </div>

            {/* Compact Focus Action Button (CO-CEO and Member only) */}
            {rolePrefix !== "/ceo" && (
              <div className="shrink-0 pt-0.5">
                <Link
                  href={`${rolePrefix}/focus`}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 h-[38px] sm:h-[40px] rounded-xl bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-xs font-extrabold hover:opacity-90 active:scale-[0.98] transition-all shadow-2xs whitespace-nowrap cursor-pointer"
                >
                  <FocusIcon className="w-3.5 h-3.5 shrink-0" />
                  <span>Focus →</span>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Global Security / Error Banners */}
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
              <span>Unable to load dashboard telemetry.</span>
            </div>
            <button
              onClick={loadData}
              className="flex items-center gap-1 font-extrabold hover:underline cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            04. TODAY SECTION (REAL DAILY STATE)
        ══════════════════════════════════════════════════════════════════ */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[10px] font-mono font-bold tracking-wider text-muted-foreground uppercase">
              TODAY
            </h2>
          </div>

          {loading ? (
            <div className="p-3 rounded-xl bg-card border border-border animate-pulse h-12" />
          ) : totalTodayActions === 0 ? (
            <div className="p-3.5 rounded-xl border border-border bg-card flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-foreground">✓ You&apos;re fully caught up</span>
                <span className="text-[11px] text-muted-foreground mt-0.5">No actions require your attention.</span>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl border border-border bg-card flex items-center justify-between gap-3">
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-extrabold text-foreground">
                  {hasUrgentAction ? "Attention required" : `${totalTodayActions} action${totalTodayActions > 1 ? "s" : ""} scheduled`}
                </span>
                <span className="text-[11px] text-muted-foreground mt-0.5">
                  {todayTasks > 0 ? `${todayTasks} task${todayTasks > 1 ? "s" : ""}` : ""}
                  {todayTasks > 0 && todayApprovals > 0 ? " · " : ""}
                  {todayApprovals > 0 ? `${todayApprovals} approval${todayApprovals > 1 ? "s" : ""}` : ""}
                </span>
              </div>
              <Link
                href={role === "CEO" ? `${rolePrefix}/approvals` : `${rolePrefix}/tasks`}
                className="inline-flex items-center gap-1 text-xs font-extrabold text-[#C9A52A] hover:underline shrink-0"
              >
                <span>{hasUrgentAction ? "Review →" : "View today →"}</span>
              </Link>
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            05. EXECUTION SECTION (TIME-SERIES GRAPH WITH RECHARTS)
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

          <Card className="py-3.5 px-4">
            {loading ? (
              <div className="py-6 space-y-3 animate-pulse">
                <div className="h-4 bg-muted rounded w-1/3" />
                <div className="h-32 bg-muted rounded w-full" />
              </div>
            ) : (
              <div className="space-y-3.5">
                {/* Metrics Summary Row */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10.5px] font-mono font-bold text-muted-foreground uppercase">
                      Overall Progress
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-[22px] sm:text-[26px] font-mono font-extrabold text-foreground leading-none">
                        {execPct ?? 0}%
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-medium text-muted-foreground">
                        Completed Today
                      </span>
                      <p className="text-[15px] font-mono font-bold text-foreground">
                        {h.completedTodayCount ?? 0}
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-medium text-muted-foreground">
                        On-Time Rate
                      </span>
                      <p className="text-[15px] font-mono font-bold text-emerald-500">
                        {h.onTimeCompletionRate ?? 100}%
                      </p>
                    </div>
                  </div>
                </div>

                <ProgressBar value={execPct ?? 0} gold />

                {/* Recharts Time-Series Graph */}
                <ExecutionTimeGraph data={chartData} />
              </div>
            )}
          </Card>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            06. ORGANIZATION SNAPSHOT (EXACTLY 4 METRICS ONLY)
        ══════════════════════════════════════════════════════════════════ */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[10px] font-mono font-bold tracking-wider text-muted-foreground uppercase">
              ORGANIZATION
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3.5">
            {/* Metric 1: Projects */}
            <Card className="justify-between h-[95px] md:h-[105px] p-3">
              <span className="text-[9.5px] font-mono font-bold uppercase text-muted-foreground">
                PROJECTS
              </span>
              <span className="text-[20px] md:text-[24px] font-extrabold font-mono text-foreground leading-none">
                {loading ? "—" : (h.activeProjectsCount ?? 0)}
              </span>
              <span className="text-[10.5px] text-muted-foreground font-medium">
                Active
              </span>
            </Card>

            {/* Metric 2: Tasks */}
            <Card className="justify-between h-[95px] md:h-[105px] p-3">
              <span className="text-[9.5px] font-mono font-bold uppercase text-muted-foreground">
                TASKS
              </span>
              <span className="text-[20px] md:text-[24px] font-extrabold font-mono text-foreground leading-none">
                {loading ? "—" : (h.activeTasksCount ?? 0)}
              </span>
              <span className="text-[10.5px] text-muted-foreground font-medium">
                Active
              </span>
            </Card>

            {/* Metric 3: Approvals */}
            <Card className="justify-between h-[95px] md:h-[105px] p-3">
              <span className="text-[9.5px] font-mono font-bold uppercase text-muted-foreground">
                APPROVALS
              </span>
              <span className="text-[20px] md:text-[24px] font-extrabold font-mono text-foreground leading-none">
                {loading ? "—" : (h.pendingReviewCount ?? 0)}
              </span>
              <span className="text-[10.5px] text-muted-foreground font-medium">
                Pending
              </span>
            </Card>

            {/* Metric 4: Status (Working Hours Logic) */}
            <Card className="justify-between h-[95px] md:h-[105px] p-3">
              <span className="text-[9.5px] font-mono font-bold uppercase text-muted-foreground">
                STATUS
              </span>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full shrink-0 ${active ? "bg-emerald-500" : "bg-muted-foreground"}`} />
                <span className="text-[14px] md:text-[15px] font-extrabold text-foreground leading-none uppercase tracking-tight">
                  {active ? "ON TRACK" : "PAUSED"}
                </span>
              </div>
              <span className="text-[10.5px] text-muted-foreground font-medium">
                {active ? "Operational" : "Off-hours"}
              </span>
            </Card>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            07 & 08. LEADERBOARD & RECENT ACTIVITY (GRID SIDE-BY-SIDE)
        ══════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 md:gap-4">
          
          {/* LEADERBOARD CARD */}
          <Card className="md:col-span-6 py-3 px-3.5 min-h-[220px]">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-[#C9A52A]" />
                <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase">
                  LEADERBOARD
                </span>
              </div>

              {/* Period Dropdown Selector */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsLeaderboardDropdownOpen(prev => !prev)}
                  className="text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 cursor-pointer focus:outline-none"
                >
                  <span>
                    {leaderboardPeriod === "week" ? "This week" : leaderboardPeriod === "month" ? "This month" : "All time"}
                  </span>
                  <ChevronDown className="w-3 h-3" />
                </button>

                {isLeaderboardDropdownOpen && (
                  <div className="absolute right-0 mt-1 w-28 rounded-lg border border-border bg-card shadow-lg py-1 z-30 text-xs">
                    {[
                      { id: "week", label: "This week" },
                      { id: "month", label: "This month" },
                      { id: "all", label: "All time" },
                    ].map(p => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setLeaderboardPeriod(p.id as any);
                          setIsLeaderboardDropdownOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-1 text-[11px] font-medium hover:bg-muted ${
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

            <div className="pt-2 flex-1 flex flex-col justify-between">
              {loading ? (
                <div className="space-y-2 animate-pulse py-2">
                  <div className="h-4 bg-muted rounded w-1/2" />
                  <div className="h-4 bg-muted rounded w-3/4" />
                </div>
              ) : coceos.length === 0 ? (
                <CompactEmpty
                  title="No ranking data yet"
                  description="Rankings will appear after qualifying execution is recorded."
                />
              ) : (
                <div className="divide-y divide-border/60">
                  {coceos.slice(0, 4).map((member: any, idx: number) => (
                    <div key={member.id ?? idx} className="py-2 flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`text-[11px] font-mono font-bold w-4 shrink-0 ${idx === 0 ? "text-[#C9A52A]" : "text-muted-foreground"}`}>
                          #{String(idx + 1).padStart(2, "0")}
                        </span>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10.5px] font-bold shrink-0 ${
                          idx === 0 ? "bg-[#C9A52A]/20 text-[#C9A52A] border border-[#C9A52A]/30" : "bg-muted text-muted-foreground"
                        }`}>
                          {member.name?.charAt(0) ?? "M"}
                        </div>
                        <span className="text-xs font-bold text-foreground truncate">
                          {member.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 text-[11px] shrink-0">
                        <span className="font-mono font-bold text-foreground">
                          {member.progress ?? member.score ?? 0} pts
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* User Position Badge */}
              {userRankIndex >= 0 && (
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
          <Card className="md:col-span-6 py-3 px-3.5 min-h-[220px]">
            <div className="flex items-center justify-between pb-2 border-b border-border">
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

            <div className="pt-2 flex-1 flex flex-col justify-center">
              {loading ? (
                <div className="space-y-2 animate-pulse py-2">
                  <div className="h-4 bg-muted rounded w-1/3" />
                </div>
              ) : groupedActivity.length === 0 ? (
                <CompactEmpty
                  title="No recent activity"
                  description="Organization activity will appear here."
                />
              ) : (
                <div className="space-y-2 py-0.5">
                  {groupedActivity.map((act: any, i: number) => (
                    <div key={act.id ?? i} className="flex items-start gap-2 text-[11px]">
                      <span className="font-mono text-muted-foreground shrink-0 pt-0.5">
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
