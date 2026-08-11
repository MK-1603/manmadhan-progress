"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CheckSquare, Clock, AlertCircle, Loader2, Focus, ChevronRight,
  Target, Activity, Play, Bell, Trophy, TrendingUp, RefreshCw, Circle
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { useSocket } from "@/components/providers/socket-provider";
import { PremiumCard } from "@/components/ui/premium-card";
import { useAuth } from "@/components/auth/auth-context";
import { motion } from "framer-motion";
import Link from "next/link";

const statusColor = (s: string) => {
  const m: Record<string, string> = {
    "Assigned":    "text-blue-500 bg-blue-500/10 border-blue-500/20",
    "Accepted":    "text-sky-500 bg-sky-500/10 border-sky-500/20",
    "In Progress": "text-amber-500 bg-amber-500/10 border-amber-500/20",
    "Review":      "text-purple-500 bg-purple-500/10 border-purple-500/20",
    "Approved":    "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    "Completed":   "text-emerald-600 bg-emerald-600/10 border-emerald-600/20",
    "Blocked":     "text-rose-500 bg-rose-500/10 border-rose-500/20",
  };
  return m[s] || "text-muted-foreground bg-muted border-border";
};

function isWorkingHours() {
  const h = new Date().getHours();
  return h >= 4 && h < 23;
}
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
function isToday(d: string | null) {
  if (!d) return false;
  return new Date(d).toDateString() === new Date().toDateString();
}
function isOverdue(deadline: string | null, status: string) {
  if (!deadline) return false;
  if (["Approved","Completed"].includes(status)) return false;
  return new Date(deadline) < new Date();
}
function daysLeft(d: string) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}
function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60)    return "just now";
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function MemberDashboard() {
  const { user }    = useAuth();
  const { socket }  = useSocket();
  const [tasks, setTasks]       = useState<any[]>([]);
  const [currentData, setCurrentData] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [myScore, setMyScore]   = useState(0);
  const [totalHours, setTotalHours] = useState(0);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [systemActive] = useState(isWorkingHours());

  const fetchAll = useCallback(async () => {
    try {
      const wid = localStorage.getItem("workspaceId");
      if (!wid) return;
      const [tasksRes, currentRes, notifRes, reportRes, lbRes] = await Promise.all([
        apiClient.get(`/org/tasks?workspaceId=${wid}`),
        apiClient.get(`/org/tasks/current?workspaceId=${wid}`),
        apiClient.get("/notifications"),
        apiClient.get(`/org/reports/overview?workspaceId=${wid}&period=daily`),
        apiClient.get(`/org/reports/leaderboard?workspaceId=${wid}&period=weekly`),
      ]);
      if (tasksRes.data.success)   setTasks(tasksRes.data.data || []);
      if (currentRes.data.success) setCurrentData(currentRes.data.data);
      if (notifRes.data.success)   setNotifications((notifRes.data.data || []).filter((n: any) => !n.isRead).slice(0, 4));
      if (reportRes.data.success)  setTotalHours(reportRes.data.data.workingHours?.total || 0);
      if (lbRes.data.success) {
        const me = (lbRes.data.data.leaderboard || []).find((e: any) => e.id === user?.id);
        if (me) setMyScore(me.score);
      }
    } catch { setError("Unable to load dashboard"); }
    finally { setLoading(false); }
  }, [user?.id]);

  useEffect(() => { if (user?.id) fetchAll(); }, [fetchAll, user?.id]);
  useEffect(() => {
    if (!socket) return;
    socket.on("task.updated",  fetchAll);
    socket.on("task.created",  fetchAll);
    socket.on("TASK_ASSIGNED", fetchAll);
    socket.on("approval.updated", fetchAll);
    socket.on("notification.created", fetchAll);
    return () => {
      socket.off("task.updated");
      socket.off("task.created");
      socket.off("TASK_ASSIGNED");
      socket.off("approval.updated");
      socket.off("notification.created");
    };
  }, [socket, fetchAll]);

  const currentTasks  = currentData?.myCurrentTasks || [];
  const todayTasks    = tasks.filter(t => isToday(t.deadline) && !["Completed","Approved"].includes(t.status));
  const overdueTasks  = tasks.filter(t => isOverdue(t.deadline, t.status));
  const pendingReview = tasks.filter(t => t.status === "Review");
  const activeTasks   = tasks.filter(t => ["In Progress","Accepted"].includes(t.status));

  const kpis = {
    today:    todayTasks.length,
    progress: activeTasks.length,
    review:   pendingReview.length,
    overdue:  overdueTasks.length,
  };

  const upcomingDeadlines = tasks
    .filter(t => t.deadline && !["Completed","Approved"].includes(t.status))
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    .slice(0, 4);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="p-6 lg:p-8 max-w-[1200px] mx-auto w-full space-y-6">

      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">MEMBER</span>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
              systemActive
                ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
                : "text-rose-500 bg-rose-500/10 border-rose-500/20"
            }`}>
              {systemActive ? "● System Active" : "⏸ System OFF"}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            {getGreeting()}, {user?.displayName || user?.name || "Member"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date().toLocaleDateString("en-US", { weekday:"long", year:"numeric", month:"long", day:"numeric" })}
          </p>
        </div>
        <button onClick={fetchAll} className="p-2 rounded-lg border border-border hover:bg-accent transition-colors shrink-0" title="Refresh">
          <RefreshCw className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* ── KPI Strip ──────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Due Today",      value: kpis.today,    color: "text-orange-500",  icon: Target,       href: "/member/my-work?tab=today" },
          { label: "In Progress",    value: kpis.progress, color: "text-amber-500",   icon: Activity,     href: "/member/my-work?tab=in-progress" },
          { label: "Pending Review", value: kpis.review,   color: "text-purple-500",  icon: CheckSquare,  href: "/member/my-work?tab=pending-review" },
          { label: "Overdue",        value: kpis.overdue,  color: kpis.overdue > 0 ? "text-rose-500" : "text-muted-foreground", icon: AlertCircle, href: "/member/my-work?tab=overdue" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <Link href={s.href}>
              <PremiumCard className="p-4 hover:border-border/80 transition-colors cursor-pointer">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[11px] text-muted-foreground font-medium">{s.label}</p>
                  <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
                </div>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              </PremiumCard>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* ── Main grid ──────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* LEFT: Current work + Today's tasks */}
        <div className="lg:col-span-2 space-y-6">

          {/* Current / active tasks */}
          <PremiumCard className="p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" /> Currently Working
              </h2>
              <Link href="/member/focus" className="text-xs text-emerald-500 hover:underline flex items-center gap-1">
                <Focus className="w-3 h-3" /> Focus
              </Link>
            </div>
            <div className="divide-y divide-border">
              {currentTasks.length === 0 ? (
                <div className="p-8 text-center">
                  <Target className="w-7 h-7 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No active task right now</p>
                  {activeTasks.length > 0 && (
                    <Link href="/member/focus" className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-white text-xs font-semibold rounded-lg hover:bg-emerald-500/90 transition-colors">
                      <Play className="w-3.5 h-3.5" /> Start a focus session
                    </Link>
                  )}
                </div>
              ) : (
                currentTasks.map((t: any) => (
                  <div key={t.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-accent/20 transition-colors">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{t.title}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                        {t.projectName && <span>📁 {t.projectName}</span>}
                        {t.deadline && <span className={`flex items-center gap-1 ${isOverdue(t.deadline, t.status) ? "text-rose-500 font-semibold" : ""}`}><Clock className="w-3 h-3" />{new Date(t.deadline).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${statusColor(t.status)}`}>{t.status}</span>
                  </div>
                ))
              )}
            </div>
          </PremiumCard>

          {/* Today's priority tasks */}
          {todayTasks.length > 0 && (
            <PremiumCard className="p-0 overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-400" /> Due Today
                </h2>
                <Link href="/member/my-work" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                  View all <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="divide-y divide-border">
                {todayTasks.slice(0, 4).map(t => (
                  <div key={t.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-accent/20 transition-colors">
                    <Circle className={`w-2.5 h-2.5 shrink-0 ${
                      t.priority === "Urgent" ? "text-rose-500 fill-rose-500" :
                      t.priority === "High"   ? "text-orange-500 fill-orange-500" : "text-amber-500 fill-amber-500"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{t.title}</p>
                      {t.projectName && <p className="text-xs text-muted-foreground truncate">📁 {t.projectName}</p>}
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${statusColor(t.status)}`}>{t.status}</span>
                  </div>
                ))}
              </div>
            </PremiumCard>
          )}

          {/* All assigned tasks */}
          {activeTasks.length > 0 && !currentTasks.some((ct: any) => activeTasks.find((a: any) => a.id === ct.id)) && (
            <PremiumCard className="p-0 overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Active Work</h2>
                <Link href="/member/my-work" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                  View all <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="divide-y divide-border">
                {activeTasks.slice(0, 5).map(t => (
                  <div key={t.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-accent/20 transition-colors">
                    <CheckSquare className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{t.title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        {t.projectName && <span>📁 {t.projectName}</span>}
                        {t.deadline && <span className={`flex items-center gap-1 ${isOverdue(t.deadline, t.status) ? "text-rose-500 font-semibold" : ""}`}><Clock className="w-3 h-3" />{new Date(t.deadline).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${statusColor(t.status)}`}>{t.status}</span>
                  </div>
                ))}
              </div>
            </PremiumCard>
          )}
        </div>

        {/* RIGHT: Progress + deadlines + notifications */}
        <div className="space-y-6">

          {/* Progress snapshot */}
          <PremiumCard>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" /> My Progress
              </h2>
              <Link href="/member/progress" className="text-xs text-muted-foreground hover:text-foreground transition-colors">View →</Link>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Completion rate</span>
                <span className="font-bold text-foreground">
                  {tasks.length > 0 ? Math.round((tasks.filter(t => ["Approved","Completed"].includes(t.status)).length / tasks.length) * 100) : 0}%
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{
                  width: `${tasks.length > 0 ? Math.round((tasks.filter(t => ["Approved","Completed"].includes(t.status)).length / tasks.length) * 100) : 0}%`
                }} />
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-2.5 bg-muted/30 rounded-lg text-center">
                  <p className="text-lg font-bold text-gold">{myScore}</p>
                  <p className="text-[10px] text-muted-foreground">Score</p>
                </div>
                <div className="p-2.5 bg-muted/30 rounded-lg text-center">
                  <p className="text-lg font-bold text-blue-500">{totalHours}h</p>
                  <p className="text-[10px] text-muted-foreground">Today</p>
                </div>
              </div>
            </div>
          </PremiumCard>

          {/* Upcoming deadlines */}
          <PremiumCard className="p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" /> Deadlines
              </h2>
              <Link href="/member/my-work" className="text-xs text-muted-foreground hover:text-foreground transition-colors">View all</Link>
            </div>
            <div className="divide-y divide-border">
              {upcomingDeadlines.length === 0 ? (
                <div className="p-6 text-center"><p className="text-xs text-muted-foreground">No upcoming deadlines</p></div>
              ) : (
                upcomingDeadlines.map(t => {
                  const dl = daysLeft(t.deadline);
                  const ov = isOverdue(t.deadline, t.status);
                  return (
                    <div key={t.id} className="flex items-center gap-3 px-5 py-3 hover:bg-accent/20 transition-colors">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${ov ? "bg-rose-500" : dl <= 1 ? "bg-orange-500" : "bg-muted-foreground/40"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{t.title}</p>
                      </div>
                      <span className={`text-[11px] font-semibold shrink-0 ${ov ? "text-rose-500" : dl === 0 ? "text-orange-500" : dl === 1 ? "text-amber-500" : "text-muted-foreground"}`}>
                        {ov ? `${Math.abs(dl)}d late` : dl === 0 ? "Today" : dl === 1 ? "Tomorrow" : `${dl}d`}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </PremiumCard>

          {/* Notifications preview */}
          {notifications.length > 0 && (
            <PremiumCard className="p-0 overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Bell className="w-4 h-4 text-muted-foreground" /> Unread
                </h2>
                <Link href="/member/notifications" className="text-xs text-muted-foreground hover:text-foreground transition-colors">All →</Link>
              </div>
              <div className="divide-y divide-border">
                {notifications.map(n => (
                  <div key={n.id} className="px-5 py-3 hover:bg-accent/20 transition-colors">
                    <p className="text-xs font-medium text-foreground truncate">{n.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(n.createdAt)}</p>
                  </div>
                ))}
              </div>
            </PremiumCard>
          )}
        </div>
      </div>
    </div>
  );
}
