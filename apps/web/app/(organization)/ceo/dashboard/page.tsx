"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Activity,
  Target,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  Focus as FocusIcon,
  ShieldAlert,
  ArrowUpRight,
  UserCheck,
  Calendar,
  Layers,
  Plus,
  Moon,
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { useSocket } from "@/components/providers/socket-provider";

function timeAgo(dateString: string) {
  if (!dateString) return "recently";
  const date = new Date(dateString);
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  let interval = Math.floor(seconds / 31536000);
  if (interval >= 1) return interval + "y ago";
  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) return interval + "mo ago";
  interval = Math.floor(seconds / 86400);
  if (interval >= 1) return interval + "d ago";
  interval = Math.floor(seconds / 3600);
  if (interval >= 1) return interval + "h ago";
  interval = Math.floor(seconds / 60);
  if (interval >= 1) return interval + "m ago";
  return "just now";
}

function formatShortDuration(seconds: number) {
  if (!seconds || seconds <= 0) return "0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function CEODashboard() {
  const { socket } = useSocket();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  const isWorkingHours = () => {
    const h = new Date().getHours();
    return h >= 4 && h < 23;
  };

  const fetchDashboard = useCallback(async () => {
    try {
      const workspaceId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : null;
      const wsParam = workspaceId ? `?workspaceId=${workspaceId}` : "";
      const res = await apiClient.get(`/organization/dashboard${wsParam}`);
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to fetch executive dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    if (!socket) return;
    const handleWorkspaceUpdate = () => fetchDashboard();
    socket.on("workspace_update", handleWorkspaceUpdate);
    return () => {
      socket.off("workspace_update", handleWorkspaceUpdate);
    };
  }, [socket, fetchDashboard]);

  const handleApproveTask = async (taskId: string) => {
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      await apiClient.post(`/org/approvals/tasks/${taskId}/approve`, { workspaceId });
      fetchDashboard();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[calc(100vh-80px)]">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const systemActive = isWorkingHours();
  const health = data?.health || {
    overallProgress: 0,
    onTimeCompletionRate: 100,
    activeProjectsCount: 0,
    activeTasksCount: 0,
    completedTodayCount: 0,
    pendingReviewCount: 0,
    overdueCount: 0,
    blockedCount: 0,
    teamMembersCount: 0,
    hoursLogged: 0,
  };

  const attentionItems = data?.attentionItems || [];
  const todayPriorities = data?.todayPriorities || [];
  const coCeoPerformance = data?.coCeoPerformance || [];
  const projectHealth = data?.projectHealth || [];
  const deadlineWatch = data?.deadlineWatch || { overdue: [], dueToday: [], dueTomorrow: [] };
  const ceoFocusSummary = data?.ceoFocusSummary || { activeSession: null, focusedSecondsToday: 0, sessionsCountToday: 0 };
  const recentActivities = data?.recentActivities || [];

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-[1440px] mx-auto w-full min-h-[calc(100vh-80px)] bg-background select-none">
      {/* 1. Executive Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">
              Executive Control Center
            </h1>
            <span
              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                systemActive
                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-500 border-amber-500/20"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${systemActive ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
              {systemActive ? "System Active • 04:00–23:00" : "System Off"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Real-time organizational progress, attention priorities, and execution analytics.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/ceo/tasks"
            className="px-3.5 py-2 bg-card border border-border text-xs font-semibold rounded-lg hover:bg-muted text-foreground transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Task
          </Link>
          <Link
            href="/ceo/projects"
            className="px-3.5 py-2 bg-card border border-border text-xs font-semibold rounded-lg hover:bg-muted text-foreground transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Project
          </Link>
          <Link
            href="/ceo/focus"
            className="px-3.5 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <FocusIcon className="w-3.5 h-3.5" /> Focus Cockpit
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")} className="font-bold underline">Dismiss</button>
        </div>
      )}

      {!systemActive && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-500 text-xs flex items-center gap-2">
          <Moon className="w-4 h-4 shrink-0" />
          <span>System is OFF between 23:00 and 04:00. Operations automatically pause overnight.</span>
        </div>
      )}

      {/* 2. Level 1: Executive Health Summary Metrics */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3.5 border border-border rounded-xl bg-card space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase block">Active Projects</span>
            <div className="text-2xl font-bold text-foreground font-mono">{health.activeProjectsCount}</div>
            <span className="text-[10px] text-muted-foreground">In Execution</span>
          </div>

          <div className="p-3.5 border border-border rounded-xl bg-card space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase block">Active Tasks</span>
            <div className="text-2xl font-bold text-foreground font-mono">{health.activeTasksCount}</div>
            <span className="text-[10px] text-muted-foreground">Pending Work</span>
          </div>

          <div className="p-3.5 border border-border rounded-xl bg-card space-y-1">
            <span className="text-[10px] font-bold text-emerald-500 uppercase block">Completed Today</span>
            <div className="text-2xl font-bold text-emerald-500 font-mono">{health.completedTodayCount}</div>
            <span className="text-[10px] text-muted-foreground">Daily Output</span>
          </div>

          <div className="p-3.5 border border-border rounded-xl bg-card space-y-1">
            <span className="text-[10px] font-bold text-blue-500 uppercase block">Pending Review</span>
            <div className="text-2xl font-bold text-blue-500 font-mono">{health.pendingReviewCount}</div>
            <span className="text-[10px] text-muted-foreground">Requires Approval</span>
          </div>

          <div className="p-3.5 border border-border rounded-xl bg-card space-y-1">
            <span className="text-[10px] font-bold text-amber-500 uppercase block">Overdue</span>
            <div className="text-2xl font-bold text-amber-500 font-mono">{health.overdueCount}</div>
            <span className="text-[10px] text-muted-foreground">Past Deadline</span>
          </div>

          <div className="p-3.5 border border-border rounded-xl bg-card space-y-1">
            <span className="text-[10px] font-bold text-rose-500 uppercase block">Blocked Work</span>
            <div className="text-2xl font-bold text-rose-500 font-mono">{health.blockedCount}</div>
            <span className="text-[10px] text-muted-foreground">Action Required</span>
          </div>
        </div>

        {/* Execution Health Progress Bars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-border rounded-xl bg-card">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-foreground">Overall Organization Progress</span>
              <span className="font-mono text-primary">{health.overallProgress}%</span>
            </div>
            <div className="h-2 w-full bg-muted/40 rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all duration-500" style={{ width: `${health.overallProgress}%` }} />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-foreground">On-Time Execution Rate</span>
              <span className="font-mono text-emerald-500">{health.onTimeCompletionRate}%</span>
            </div>
            <div className="h-2 w-full bg-muted/40 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${health.onTimeCompletionRate}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Level 2: Executive Attention Center (Requires CEO Action) */}
      <div className="p-5 border border-border rounded-xl bg-card space-y-3.5">
        <div className="flex items-center justify-between border-b border-border pb-2.5">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Requires Your Attention
            </h2>
          </div>
          <span className="text-[10px] font-mono font-bold text-muted-foreground">
            {attentionItems.length} Urgent Items
          </span>
        </div>

        {attentionItems.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground space-y-1">
            <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto opacity-80" />
            <p className="font-bold text-foreground">ALL CLEAR</p>
            <p>No urgent organization actions currently require CEO review.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {attentionItems.map((item: any) => (
              <div key={item.id} className="p-3.5 border border-border rounded-xl bg-muted/10 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${
                        item.category === "APPROVAL REQUIRED"
                          ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                          : item.category === "CRITICAL OVERDUE"
                          ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                          : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                      }`}
                    >
                      {item.category}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {item.owner}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-foreground leading-snug line-clamp-2">
                    {item.title}
                  </h4>
                </div>

                <div className="pt-2 border-t border-border flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {item.deadline ? new Date(item.deadline).toLocaleDateString() : "No deadline"}
                  </span>
                  {item.type === "TASK_REVIEW" ? (
                    <button
                      onClick={() => handleApproveTask(item.id)}
                      className="px-2.5 py-1 bg-primary text-primary-foreground text-[10px] font-bold rounded hover:bg-primary/90 transition-colors"
                    >
                      Approve
                    </button>
                  ) : (
                    <Link
                      href="/ceo/tasks"
                      className="text-[10px] font-bold text-primary hover:underline flex items-center gap-0.5"
                    >
                      View <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Level 3: Today's Priorities & Organization Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Today's Priorities */}
        <div className="lg:col-span-7 p-5 border border-border rounded-xl bg-card space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" /> Today's Priorities
            </h2>
            <Link href="/ceo/tasks" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
              View All Tasks <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {todayPriorities.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No pending active priority tasks today.
            </div>
          ) : (
            <div className="space-y-2">
              {todayPriorities.map((item: any) => (
                <div key={item.id} className="p-3 border border-border rounded-lg bg-muted/10 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                          item.priority === "Critical"
                            ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                            : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                        }`}
                      >
                        {item.priority}
                      </span>
                      <h4 className="text-xs font-semibold text-foreground truncate">{item.title}</h4>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {item.projectName ? `${item.projectName} • ` : ""}{item.owner}
                    </p>
                  </div>
                  <Link
                    href="/ceo/tasks"
                    className="px-2.5 py-1 bg-card border border-border text-xs font-medium rounded hover:bg-muted text-foreground transition-colors shrink-0"
                  >
                    View
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CO-CEO Performance Matrix */}
        <div className="lg:col-span-5 p-5 border border-border rounded-xl bg-card space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> CO-CEO Performance
            </h2>
            <Link href="/ceo/co-ceos" className="text-xs font-semibold text-primary hover:underline">
              Manage
            </Link>
          </div>

          {coCeoPerformance.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No CO-CEOs assigned to this workspace.
            </div>
          ) : (
            <div className="space-y-3">
              {coCeoPerformance.map((c: any) => (
                <div key={c.id} className="p-3 border border-border rounded-lg bg-muted/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-xs text-primary">
                        {c.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-foreground">{c.name}</h4>
                        <span className="text-[10px] text-muted-foreground font-mono">{c.email}</span>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-foreground">{c.progress}%</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[10px] text-muted-foreground pt-1 border-t border-border">
                    <div>Assigned: <span className="font-bold text-foreground">{c.assignedTasks}</span></div>
                    <div>Completed: <span className="font-bold text-emerald-500">{c.completedTasks}</span></div>
                    <div>Overdue: <span className="font-bold text-rose-500">{c.overdueTasks}</span></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 5. Level 4: Project Health & Deadline Watch */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Project Health Table */}
        <div className="lg:col-span-7 p-5 border border-border rounded-xl bg-card space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" /> Project Health
            </h2>
            <Link href="/ceo/projects" className="text-xs font-semibold text-primary hover:underline">
              All Projects
            </Link>
          </div>

          {projectHealth.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No active projects found.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {projectHealth.map((p: any) => (
                <div key={p.id} className="py-2.5 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-foreground truncate">{p.name}</h4>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase ${
                          p.healthStatus === "On Track"
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            : p.healthStatus === "At Risk"
                            ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                            : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                        }`}
                      >
                        {p.healthStatus}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {p.totalTasks} Tasks ({p.remainingTasks} remaining)
                    </span>
                  </div>

                  <div className="w-32 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-muted/40 rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${p.progress}%` }} />
                    </div>
                    <span className="text-xs font-mono font-bold text-foreground">{p.progress}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Deadline Watch */}
        <div className="lg:col-span-5 p-5 border border-border rounded-xl bg-card space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" /> Deadline Watch
            </h2>
          </div>

          <div className="space-y-3">
            {/* Overdue */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block">
                Overdue ({deadlineWatch.overdue.length})
              </span>
              {deadlineWatch.overdue.length === 0 ? (
                <p className="text-[11px] text-muted-foreground italic">None</p>
              ) : (
                deadlineWatch.overdue.map((item: any) => (
                  <div key={item.id} className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs flex justify-between">
                    <span className="font-semibold text-rose-500 truncate">{item.title}</span>
                    <span className="font-mono text-rose-500 text-[10px] shrink-0">{item.daysLate}d late</span>
                  </div>
                ))
              )}
            </div>

            {/* Due Today */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block">
                Due Today ({deadlineWatch.dueToday.length})
              </span>
              {deadlineWatch.dueToday.length === 0 ? (
                <p className="text-[11px] text-muted-foreground italic">None</p>
              ) : (
                deadlineWatch.dueToday.map((item: any) => (
                  <div key={item.id} className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs flex justify-between">
                    <span className="font-semibold text-amber-500 truncate">{item.title}</span>
                    <span className="font-mono text-amber-500 text-[10px] shrink-0">Today</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 6. Level 5: CEO Focus Integration & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CEO Focus Summary */}
        <div className="lg:col-span-5 p-5 border border-border rounded-xl bg-card space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <FocusIcon className="w-4 h-4 text-primary" /> CEO Focus Today
            </h2>
            <Link
              href="/ceo/focus"
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
            >
              Open Cockpit <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="p-4 border border-border rounded-xl bg-muted/10 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Today's Focus Time:</span>
              <span className="text-base font-mono font-bold text-foreground">
                {formatShortDuration(ceoFocusSummary.focusedSecondsToday)}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Focus Sessions:</span>
              <span className="text-xs font-mono font-bold text-foreground">
                {ceoFocusSummary.sessionsCountToday} Sessions
              </span>
            </div>

            <div className="pt-2 border-t border-border">
              {ceoFocusSummary.activeSession ? (
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs space-y-1">
                  <span className="text-[10px] font-bold text-emerald-500 uppercase block">Active Session</span>
                  <p className="font-semibold text-foreground truncate">{ceoFocusSummary.activeSession.title || "Executive Focus"}</p>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground italic text-center py-1">
                  No active focus session running.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Organization Activity */}
        <div className="lg:col-span-7 p-5 border border-border rounded-xl bg-card space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" /> Recent Activity Stream
            </h2>
          </div>

          {recentActivities.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No recent activity recorded.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[220px] overflow-y-auto">
              {recentActivities.map((act: any) => (
                <div key={act.id} className="flex items-start gap-3 text-xs">
                  <div className="w-6 h-6 rounded-full bg-muted border border-border flex items-center justify-center font-bold text-[10px] text-muted-foreground shrink-0 mt-0.5">
                    {act.userName ? act.userName.charAt(0) : "S"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground leading-snug">
                      <span className="font-bold">{act.userName || "System"}</span>{" "}
                      <span className="text-muted-foreground">{act.details || act.eventType}</span>
                    </p>
                    <span className="text-[10px] font-mono text-muted-foreground block mt-0.5">
                      {timeAgo(act.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
