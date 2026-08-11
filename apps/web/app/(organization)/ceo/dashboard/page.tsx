"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  CheckCircle2, ChevronRight, Focus as FocusIcon, ArrowUpRight,
  Plus, Moon, LoaderCircle, AlertTriangle, TrendingUp,
  Users, Clock, Layers, RefreshCw,
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { useSocket } from "@/components/providers/socket-provider";
import { format } from "date-fns";

/* ═══════════════════════════════════ helpers */
function timeAgo(d: string) {
  if (!d) return "recently";
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60)    return "just now";
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
function fmtDur(sec: number) {
  if (!sec || sec <= 0) return "—";
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
function pct(a: number, b: number) {
  if (!b) return 0;
  return Math.min(100, Math.round((a / b) * 100));
}

/* ═══════════════════════════════════ design primitives */
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-card border border-border rounded-2xl overflow-hidden ${className}`}>{children}</div>;
}
function CH({ label, count, href, action }: {
  label: string; count?: number; href?: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
      <div className="flex items-center gap-2.5">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">{label}</span>
        {count !== undefined && count > 0 && (
          <span className="text-[10px] font-mono font-semibold bg-muted text-muted-foreground px-1.5 py-0.5 rounded-md">
            {count}
          </span>
        )}
      </div>
      {action ?? (href && (
        <Link href={href} className="flex items-center gap-0.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors">
          View all <ChevronRight className="w-3 h-3" />
        </Link>
      ))}
    </div>
  );
}
function Empty({ icon: Icon = CheckCircle2, title, sub }: {
  icon?: React.ElementType; title: string; sub?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 py-7 text-center">
      <Icon className="w-4 h-4 text-muted-foreground/30 mb-0.5" />
      <p className="text-[13px] font-semibold text-foreground">{title}</p>
      {sub && <p className="text-[12px] text-muted-foreground max-w-[220px]">{sub}</p>}
    </div>
  );
}
function Bar({ value, gold }: { value: number; gold?: boolean }) {
  return (
    <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${gold ? "bg-gold" : "bg-foreground"}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

/* ═══════════════════════════════════ KPI strip tile */
function KpiTile({
  label, primary, sub, gold, href,
}: { label: string; primary: string | number; sub: string; gold?: boolean; href?: string }) {
  const inner = (
    <div className={`bg-card border border-border rounded-2xl p-4 flex flex-col gap-1 ${href ? "hover:bg-muted/30 transition-colors" : ""}`}>
      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{label}</span>
      <span className={`text-[28px] font-bold font-mono leading-none mt-0.5 ${gold ? "text-gold" : "text-foreground"}`}>
        {primary}
      </span>
      <span className="text-[11px] text-muted-foreground leading-tight">{sub}</span>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

/* ═══════════════════════════════════ health status dot */
function StatusDot({ status }: { status: string }) {
  const s = status?.toLowerCase() ?? "";
  const cls =
    s.includes("track")    ? "bg-foreground" :
    s.includes("risk")     ? "bg-gold"       :
    s.includes("block")    ? "bg-foreground/40" :
    s.includes("overdue")  ? "bg-foreground"    : "bg-muted-foreground/40";
  return <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${cls}`} />;
}

/* ═══════════════════════════════════ skeleton row */
function SkeletonRow({ rows = 3 }: { rows?: number }) {
  return (
    <div className="p-5 space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-3 bg-muted rounded w-1/3" />
          <div className="h-3 bg-muted rounded flex-1" />
          <div className="h-3 bg-muted rounded w-10" />
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════ approval health summary row */
function ApprovalStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
      <span className="text-[12px] text-muted-foreground">{label}</span>
      <span className="text-[13px] font-semibold font-mono text-foreground">{value}</span>
    </div>
  );
}

/* ═══════════════════════════════════ main page */
export default function CEODashboard() {
  const { socket } = useSocket();
  const [loading,  setLoading]  = useState(true);
  const [data,     setData]     = useState<any>(null);
  const [secError, setSecError] = useState<Record<string, boolean>>({});

  const isWorking = () => { const h = new Date().getHours(); return h >= 4 && h < 23; };

  const load = useCallback(async () => {
    try {
      const wsId  = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : null;
      const param = wsId ? `?workspaceId=${wsId}` : "";
      const res   = await apiClient.get(`/organization/dashboard${param}`);
      if (res.data.success) { setData(res.data.data); setSecError({}); }
      else setSecError({ global: true });
    } catch { setSecError({ global: true }); }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!socket) return;
    socket.on("workspace_update", load);
    socket.on("approval.updated", load);
    socket.on("task.updated",     load);
    return () => {
      socket.off("workspace_update", load);
      socket.off("approval.updated", load);
      socket.off("task.updated",     load);
    };
  }, [socket, load]);

  const approve = async (id: string) => {
    try {
      const wsId = localStorage.getItem("workspaceId");
      await apiClient.post(`/org/approvals/tasks/${id}/approve`, { workspaceId: wsId });
      load();
    } catch {}
  };

  /* ── derived data ── */
  const active    = isWorking();
  const h         = data?.health          ?? {};
  const decisions = data?.attentionItems  ?? [];
  const priorities= data?.todayPriorities ?? [];
  const coceos    = data?.coCeoPerformance?? [];
  const projects  = data?.projectHealth   ?? [];
  const dl        = data?.deadlineWatch   ?? { overdue: [], dueToday: [], dueTomorrow: [] };
  const focus     = data?.ceoFocusSummary ?? { activeSession: null, focusedSecondsToday: 0, sessionsCountToday: 0 };
  const activity  = data?.recentActivities?? [];
  const today     = format(new Date(), "EEEE, d MMM yyyy");

  /* CEO-level KPIs derived from health */
  const execPct    = h.overallProgress      ?? 0;
  const onTimePct  = h.onTimeCompletionRate ?? 0;
  const atRisk     = (h.overdueCount ?? 0) + (h.blockedCount ?? 0);
  const awaitingApproval = h.pendingReviewCount ?? 0;
  const totalTeam  = h.teamMembersCount ?? 0;

  /* group activity by deduplication (same eventType+details within 5 min) */
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
    return out.slice(0, 8);
  }, [activity]);

  /* loading — skeleton rather than blank */
  if (loading) {
    return (
      <div className="bg-background min-h-full px-5 md:px-8 xl:px-10 pt-7 pb-16 max-w-[1440px] mx-auto space-y-5">
        {/* header skeleton */}
        <div className="flex justify-between items-start">
          <div className="space-y-2 animate-pulse">
            <div className="h-3 w-28 bg-muted rounded" />
            <div className="h-7 w-56 bg-muted rounded" />
            <div className="h-3 w-44 bg-muted rounded" />
          </div>
          <div className="flex gap-2 animate-pulse">
            <div className="h-9 w-20 bg-muted rounded-xl" />
            <div className="h-9 w-20 bg-muted rounded-xl" />
            <div className="h-9 w-20 bg-muted rounded-xl" />
          </div>
        </div>
        {/* kpi skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 animate-pulse">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-4 h-[88px]" />
          ))}
        </div>
        {/* decisions skeleton */}
        <Card><SkeletonRow rows={2} /></Card>
        {/* health row skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <Card className="lg:col-span-7"><SkeletonRow rows={4} /></Card>
          <Card className="lg:col-span-5"><SkeletonRow rows={3} /></Card>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-full">
      <div className="px-5 md:px-8 xl:px-10 pt-7 pb-16 max-w-[1440px] mx-auto space-y-5">

        {/* ══════════ HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <p className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
              ManMadhan · CEO
            </p>
            <h1 className="text-[26px] sm:text-[28px] font-bold text-foreground tracking-tight leading-none">
              Organization Dashboard
            </h1>
            <p className="text-[12px] text-muted-foreground mt-2 flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${active ? "bg-foreground" : "bg-muted-foreground/30"}`} />
              {today} · {active ? "System active" : "Off hours"}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/ceo/tasks"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-muted text-[12px] font-semibold text-foreground transition-colors">
              <Plus className="w-3.5 h-3.5" /> Task
            </Link>
            <Link href="/ceo/projects"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-muted text-[12px] font-semibold text-foreground transition-colors">
              <Plus className="w-3.5 h-3.5" /> Project
            </Link>
            <Link href="/ceo/focus"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gold hover:bg-gold-hover text-white text-[12px] font-semibold transition-colors">
              <FocusIcon className="w-3.5 h-3.5" /> Focus
            </Link>
          </div>
        </div>

        {/* off-hours / error banners */}
        {!active && (
          <div className="flex items-center gap-2.5 px-4 py-3 bg-card border border-border rounded-xl text-[12px] text-muted-foreground">
            <Moon className="w-3.5 h-3.5 shrink-0" />
            Operations pause automatically between 23:00 and 04:00.
          </div>
        )}
        {secError.global && (
          <div className="flex items-center justify-between px-4 py-3 bg-card border border-border rounded-xl text-[12px] text-muted-foreground">
            Unable to load dashboard data.
            <button onClick={load} className="flex items-center gap-1 font-semibold text-foreground hover:text-gold transition-colors">
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          </div>
        )}

        {/* ══════════ ROW 1 — CEO KPI STRIP */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          <KpiTile
            label="Execution"
            primary={`${execPct}%`}
            sub="Organization progress"
            href="/ceo/projects"
          />
          <KpiTile
            label="On-Time Rate"
            primary={`${onTimePct}%`}
            sub="Completed within deadline"
            href="/ceo/tasks"
          />
          <KpiTile
            label="Active Projects"
            primary={h.activeProjectsCount ?? 0}
            sub={`${h.activeTasksCount ?? 0} tasks in flight`}
            href="/ceo/projects"
          />
          <KpiTile
            label="Awaiting Approval"
            primary={awaitingApproval}
            sub={awaitingApproval > 0 ? "Needs CEO review" : "Queue clear"}
            gold={awaitingApproval > 0}
            href="/ceo/approvals"
          />
          <KpiTile
            label="At Risk"
            primary={atRisk}
            sub={`${h.overdueCount ?? 0} overdue · ${h.blockedCount ?? 0} blocked`}
            href="/ceo/tasks"
          />
          <KpiTile
            label="Team"
            primary={totalTeam || "—"}
            sub={`${h.completedTodayCount ?? 0} completed today`}
            href="/ceo/members"
          />
        </div>

        {/* ══════════ ROW 2 — REQUIRES YOUR DECISION */}
        <Card>
          <CH
            label="Requires Your Decision"
            count={decisions.length}
            action={
              decisions.length > 0
                ? <Link href="/ceo/approvals" className="text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5">
                    All approvals <ChevronRight className="w-3 h-3" />
                  </Link>
                : undefined
            }
          />
          {decisions.length === 0 ? (
            <Empty icon={CheckCircle2} title="You're fully caught up" sub="No decisions or approvals require your attention." />
          ) : (
            <div className="divide-y divide-border">
              {decisions.map((item: any, idx: number) => (
                <div key={item.id ?? idx} className="flex items-start sm:items-center gap-4 px-5 py-3.5 hover:bg-muted/20 transition-colors">
                  {/* index */}
                  <span className="text-[11px] font-mono text-muted-foreground/50 w-5 shrink-0 pt-0.5">{String(idx + 1).padStart(2, "0")}</span>
                  {/* content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[13px] font-semibold text-foreground truncate">{item.title}</p>
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide shrink-0">
                        {item.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {item.owner && <span>{item.owner}</span>}
                      {item.deadline && <span className="ml-1.5 text-muted-foreground/60">· {format(new Date(item.deadline), "d MMM")}</span>}
                      <span className="ml-1.5 text-muted-foreground/50">· {timeAgo(item.createdAt || item.deadline)}</span>
                    </p>
                  </div>
                  {/* action */}
                  {item.type === "TASK_REVIEW" ? (
                    <button onClick={() => approve(item.id)}
                      className="shrink-0 px-3 py-1.5 rounded-xl bg-gold hover:bg-gold-hover text-white text-[11px] font-semibold transition-colors">
                      Approve
                    </button>
                  ) : (
                    <Link href={item.projectId ? `/ceo/projects/${item.projectId}` : "/ceo/approvals"}
                      className="shrink-0 px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-[11px] font-semibold text-foreground transition-colors flex items-center gap-1">
                      Review <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ══════════ ROW 3 — ORG HEALTH (8) + RISKS & DEADLINES (4) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

          {/* ORGANIZATION HEALTH */}
          <Card className="lg:col-span-8 flex flex-col">
            <CH label="Organization Health" />
            <div className="p-5 flex-1 space-y-4">
              {/* 2-col stat summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-4 border-b border-border">
                {[
                  { label: "Execution",    value: `${execPct}%` },
                  { label: "On-Time",      value: `${onTimePct}%` },
                  { label: "Completed",    value: h.completedTodayCount ?? 0 },
                  { label: "Pending",      value: awaitingApproval },
                ].map(s => (
                  <div key={s.label}>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">{s.label}</p>
                    <p className="text-[22px] font-bold font-mono text-foreground leading-none">{s.value}</p>
                  </div>
                ))}
              </div>
              {/* execution progress rows */}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-medium text-foreground">Overall Execution</span>
                    <span className="text-[12px] font-mono text-foreground">{execPct}%</span>
                  </div>
                  <Bar value={execPct} />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-medium text-foreground">On-Time Completion Rate</span>
                    <span className="text-[12px] font-mono text-foreground">{onTimePct}%</span>
                  </div>
                  <Bar value={onTimePct} />
                </div>
                {atRisk > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-medium text-foreground">Risk Exposure</span>
                      <span className="text-[12px] font-mono text-foreground">{atRisk} item{atRisk !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-foreground/60 rounded-full" style={{ width: `${pct(atRisk, (h.activeTasksCount || 1))}%` }} />
                    </div>
                  </div>
                )}
              </div>
              {/* CEO focus strip */}
              <div className="pt-3 border-t border-border flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">CEO Focus</p>
                    <p className="text-[16px] font-bold font-mono text-foreground leading-none">{fmtDur(focus.focusedSecondsToday)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">Sessions</p>
                    <p className="text-[16px] font-bold font-mono text-foreground leading-none">{focus.sessionsCountToday}</p>
                  </div>
                  {focus.activeSession && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-muted/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse shrink-0" />
                      <span className="text-[11px] font-semibold text-foreground truncate max-w-[120px]">
                        {focus.activeSession.title || "Executive Focus"}
                      </span>
                    </div>
                  )}
                </div>
                <Link href="/ceo/focus"
                  className="text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5 shrink-0">
                  Open <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </Card>

          {/* RISKS & DEADLINES */}
          <Card className="lg:col-span-4 flex flex-col">
            <CH label="Risks & Deadlines" />
            <div className="p-5 flex-1 space-y-4">
              {/* risk counter row */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Overdue",    n: dl.overdue?.length ?? 0 },
                  { label: "Due Today",  n: dl.dueToday?.length ?? 0 },
                  { label: "Blocked",    n: h.blockedCount ?? 0 },
                  { label: "At Risk",    n: atRisk },
                ].map(r => (
                  <div key={r.label} className="flex flex-col gap-0.5 px-3 py-2.5 border border-border rounded-xl bg-muted/10">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{r.label}</span>
                    <span className={`text-[22px] font-bold font-mono leading-none ${r.n > 0 ? "text-foreground" : "text-muted-foreground/30"}`}>{r.n}</span>
                  </div>
                ))}
              </div>

              {/* overdue list */}
              {dl.overdue?.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Overdue</p>
                  {dl.overdue.slice(0, 3).map((item: any) => (
                    <Link key={item.id}
                      href={item.projectId ? `/ceo/projects/${item.projectId}` : "/ceo/tasks"}
                      className="flex items-center justify-between px-3 py-2 border border-border rounded-xl hover:bg-muted/30 transition-colors group">
                      <p className="text-[12px] font-medium text-foreground truncate group-hover:text-gold transition-colors">{item.title}</p>
                      <span className="text-[10px] font-mono text-muted-foreground shrink-0 ml-2">{item.daysLate}d</span>
                    </Link>
                  ))}
                </div>
              )}

              {/* due today list */}
              {dl.dueToday?.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Due Today</p>
                  {dl.dueToday.slice(0, 3).map((item: any) => (
                    <Link key={item.id}
                      href={item.projectId ? `/ceo/projects/${item.projectId}` : "/ceo/tasks"}
                      className="flex items-center justify-between px-3 py-2 border border-border rounded-xl hover:bg-muted/30 transition-colors group">
                      <p className="text-[12px] font-medium text-foreground truncate group-hover:text-gold transition-colors">{item.title}</p>
                      <span className="text-[10px] font-mono text-gold shrink-0 ml-2">Today</span>
                    </Link>
                  ))}
                </div>
              )}

              {(dl.overdue?.length ?? 0) === 0 && (dl.dueToday?.length ?? 0) === 0 && atRisk === 0 && (
                <Empty icon={CheckCircle2} title="No immediate risks" sub="All work is within expected deadlines." />
              )}
            </div>
          </Card>
        </div>

        {/* ══════════ ROW 4 — PROJECT HEALTH (7) + PEOPLE & LEADERSHIP (5) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

          {/* PROJECT HEALTH */}
          <Card className="lg:col-span-7 flex flex-col">
            <CH label="Project Health" href="/ceo/projects" />
            <div className="flex-1">
              {projects.length === 0 ? (
                <Empty icon={Layers} title="No active projects" sub="Create your first organization project." />
              ) : (
                <div className="divide-y divide-border">
                  {projects.map((p: any) => (
                    <Link key={p.id} href={`/ceo/projects/${p.id}`}
                      className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/20 transition-colors group">
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <StatusDot status={p.healthStatus} />
                          <p className="text-[13px] font-semibold text-foreground truncate group-hover:text-gold transition-colors">
                            {p.name}
                          </p>
                          <span className="text-[10px] text-muted-foreground shrink-0">{p.healthStatus}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                          <span>{p.completedTasks ?? 0} / {p.totalTasks ?? 0} tasks</span>
                          {p.deadline && <span>Due {format(new Date(p.deadline), "d MMM")}</span>}
                        </div>
                        <Bar value={p.progress ?? 0} />
                      </div>
                      <span className="text-[13px] font-mono font-semibold text-foreground shrink-0 w-10 text-right">
                        {p.progress ?? 0}%
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* PEOPLE & LEADERSHIP */}
          <Card className="lg:col-span-5 flex flex-col">
            <CH
              label="People & Leadership"
              action={
                <Link href="/ceo/co-ceos"
                  className="text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors">
                  Manage
                </Link>
              }
            />
            {/* summary strip */}
            <div className="px-5 pt-4 pb-3 border-b border-border">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">CO-CEOs</p>
                  <p className="text-[20px] font-bold font-mono text-foreground leading-none">{coceos.length}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">Team</p>
                  <p className="text-[20px] font-bold font-mono text-foreground leading-none">{totalTeam || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">Done</p>
                  <p className="text-[20px] font-bold font-mono text-foreground leading-none">{h.completedTodayCount ?? 0}</p>
                </div>
              </div>
            </div>
            <div className="flex-1">
              {coceos.length === 0 ? (
                <Empty icon={Users} title="No CO-CEOs assigned" />
              ) : (
                <div className="divide-y divide-border">
                  {coceos.map((c: any) => (
                    <Link key={c.id} href="/ceo/co-ceos"
                      className="flex items-start gap-3 px-5 py-3.5 hover:bg-muted/20 transition-colors group">
                      <div className="w-7 h-7 rounded-full bg-muted border border-border flex items-center justify-center text-[11px] font-bold text-foreground shrink-0 mt-0.5">
                        {c.name?.charAt(0) ?? "—"}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[13px] font-semibold text-foreground truncate group-hover:text-gold transition-colors">{c.name}</p>
                          <span className="text-[12px] font-mono font-semibold text-foreground shrink-0">{c.progress ?? 0}%</span>
                        </div>
                        <Bar value={c.progress ?? 0} />
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                          <span>{c.assignedTasks ?? 0} assigned</span>
                          <span>{c.completedTasks ?? 0} done</span>
                          {(c.overdueTasks ?? 0) > 0 && <span>{c.overdueTasks} overdue</span>}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* ══════════ ROW 5 — TODAY'S PRIORITIES (7) + APPROVAL HEALTH (5) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

          {/* TODAY'S CEO PRIORITIES */}
          <Card className="lg:col-span-7 flex flex-col">
            <CH label="Today's CEO Priorities" href="/ceo/tasks" />
            <div className="flex-1">
              {priorities.length === 0 ? (
                <Empty icon={CheckCircle2} title="No priority actions today" sub="Your task queue is clear." />
              ) : (
                <div className="divide-y divide-border">
                  {priorities.slice(0, 5).map((item: any, idx: number) => (
                    <Link key={item.id ?? idx}
                      href={item.projectId ? `/ceo/projects/${item.projectId}` : "/ceo/tasks"}
                      className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/20 transition-colors group">
                      <span className="text-[11px] font-mono text-muted-foreground/50 w-5 shrink-0">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-foreground truncate group-hover:text-gold transition-colors">{item.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {item.projectName && <span>{item.projectName}</span>}
                          {item.owner && <span className="ml-1.5">{item.owner}</span>}
                          {item.priority === "Critical" && <span className="ml-1.5 font-semibold text-muted-foreground/60">Critical</span>}
                        </p>
                      </div>
                      <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-gold shrink-0 transition-colors" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* APPROVAL HEALTH */}
          <Card className="lg:col-span-5 flex flex-col">
            <CH
              label="Approval Health"
              action={
                <Link href="/ceo/approvals"
                  className="text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors">
                  All approvals
                </Link>
              }
            />
            <div className="px-5 py-4 flex-1">
              <ApprovalStat label="Pending Approval"  value={awaitingApproval} />
              <ApprovalStat label="Completed Today"   value={h.completedTodayCount ?? 0} />
              <ApprovalStat label="Overdue"           value={dl.overdue?.length ?? 0} />
              <ApprovalStat label="Blocked"           value={h.blockedCount ?? 0} />
              <ApprovalStat label="Active Tasks"      value={h.activeTasksCount ?? 0} />
            </div>
          </Card>
        </div>

        {/* ══════════ ROW 6 — RECENT ACTIVITY */}
        <Card>
          <CH
            label="Recent Activity"
            action={
              <Link href="/ceo/audit"
                className="text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5">
                Audit log <ChevronRight className="w-3 h-3" />
              </Link>
            }
          />
          {groupedActivity.length === 0 ? (
            <Empty title="No recent activity" sub="Organization activity will appear here." />
          ) : (
            <div className="divide-y divide-border">
              {groupedActivity.map((act: any, i: number) => (
                <div key={act.id ?? i} className="flex items-start gap-3 px-5 py-3.5">
                  <div className="w-7 h-7 rounded-full bg-muted border border-border flex items-center justify-center text-[11px] font-bold text-muted-foreground shrink-0 mt-0.5">
                    {act.userName?.charAt(0) ?? "S"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-foreground leading-snug">
                      <span className="font-semibold">{act.userName || "System"}</span>
                      {" "}
                      <span className="text-muted-foreground">{act.details || act.eventType}</span>
                      {(act.count ?? 1) > 1 && (
                        <span className="ml-1.5 text-[10px] font-mono text-muted-foreground/50">×{act.count}</span>
                      )}
                    </p>
                    <span className="text-[10.5px] font-mono text-muted-foreground/50 mt-0.5 block">
                      {timeAgo(act.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

      </div>
    </div>
  );
}
