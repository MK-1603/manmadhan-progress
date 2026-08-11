"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Activity, Loader2, AlertCircle, CheckCircle2, Clock,
  Target, TrendingUp, RefreshCw, Circle, Trophy
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import apiClient from "@/lib/api-client";
import { PremiumCard } from "@/components/ui/premium-card";
import { useSocket } from "@/components/providers/socket-provider";
import { useAuth } from "@/components/auth/auth-context";
import { motion } from "framer-motion";

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60)    return "just now";
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function isOverdue(deadline: string | null, status: string) {
  if (!deadline) return false;
  if (["Approved","Completed"].includes(status)) return false;
  return new Date(deadline) < new Date();
}

const statusColor = (s: string) => {
  const m: Record<string, string> = {
    "Assigned":    "text-blue-500",
    "Accepted":    "text-sky-500",
    "In Progress": "text-amber-500",
    "Review":      "text-purple-500",
    "Approved":    "text-emerald-500",
    "Completed":   "text-emerald-600",
    "Blocked":     "text-rose-500",
  };
  return m[s] || "text-muted-foreground";
};

const eventIcon = (type: string) => {
  if (type?.includes("COMPLETED") || type?.includes("APPROVED")) return "✅";
  if (type?.includes("STARTED") || type?.includes("IN_PROGRESS")) return "▶️";
  if (type?.includes("SUBMITTED") || type?.includes("REVIEW")) return "📤";
  if (type?.includes("ASSIGNED")) return "📋";
  if (type?.includes("PAUSED")) return "⏸️";
  if (type?.includes("FOCUS")) return "🎯";
  if (type?.includes("REJECTED") || type?.includes("CHANGES")) return "🔄";
  return "📌";
};

export default function MemberProgressPage() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [tasks, setTasks]      = useState<any[]>([]);
  const [reportData, setReportData] = useState<any>(null);
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [loading, setLoading]  = useState(true);
  const [error, setError]      = useState("");
  const [period, setPeriod]    = useState<"daily" | "weekly">("weekly");
  const [myScore, setMyScore]  = useState<number>(0);

  const fetchAll = useCallback(async () => {
    try {
      const wid = localStorage.getItem("workspaceId");
      if (!wid) return;
      const [tasksRes, reportRes, lbRes] = await Promise.all([
        apiClient.get(`/org/tasks?workspaceId=${wid}`),
        apiClient.get(`/org/reports/overview?workspaceId=${wid}&period=${period}`),
        apiClient.get(`/org/reports/leaderboard?workspaceId=${wid}&period=weekly`),
      ]);
      if (tasksRes.data.success)  setTasks(tasksRes.data.data || []);
      if (reportRes.data.success) setReportData(reportRes.data.data);
      if (lbRes.data.success) {
        const me = (lbRes.data.data.leaderboard || []).find((e: any) => e.id === user?.id);
        if (me) setMyScore(me.score);
      }
    } catch { setError("Unable to load progress"); }
    finally { setLoading(false); }
  }, [period, user?.id]);

  useEffect(() => { if (user?.id) fetchAll(); }, [fetchAll, user?.id]);
  useEffect(() => {
    if (!socket) return;
    socket.on("task.updated", fetchAll);
    socket.on("approval.updated", fetchAll);
    return () => { socket.off("task.updated"); socket.off("approval.updated"); };
  }, [socket, fetchAll]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  const stats = {
    total:        tasks.length,
    inProgress:   tasks.filter(t => ["In Progress","Accepted"].includes(t.status)).length,
    submitted:    tasks.filter(t => t.status === "Review").length,
    approved:     tasks.filter(t => ["Approved","Completed"].includes(t.status)).length,
    overdue:      tasks.filter(t => isOverdue(t.deadline, t.status)).length,
    completionRate: tasks.length > 0
      ? Math.round((tasks.filter(t => ["Approved","Completed"].includes(t.status)).length / tasks.length) * 100)
      : 0,
  };

  const completionTrend  = reportData?.charts?.completionTrend  || [];
  const hoursTrend       = reportData?.charts?.hoursTrend        || [];
  const totalHours       = reportData?.workingHours?.total        || 0;

  /* Build a simple timeline from tasks sorted by assignment */
  const timeline = tasks
    .filter(t => t.createdAt)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(-15)
    .reverse()
    .map(t => ({
      id: t.id,
      title: t.title,
      event: `Task ${t.status}`,
      eventType: `TASK_${t.status.toUpperCase().replace(" ", "_")}`,
      date: t.completedAt || t.submittedAt || t.createdAt,
      status: t.status,
    }));

  return (
    <div className="p-6 lg:p-8 max-w-[1100px] mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">MEMBER</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">My Progress</h1>
          <p className="text-sm text-muted-foreground mt-1">Your personal execution summary within this organization</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {(["daily","weekly"] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors capitalize ${period === p ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{p}</button>
            ))}
          </div>
          <button onClick={fetchAll} className="p-2 rounded-lg border border-border hover:bg-accent transition-colors">
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          <button onClick={fetchAll} className="ml-auto text-xs hover:underline">Retry</button>
        </div>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Total",         value: stats.total,          color: "text-foreground",    icon: Target },
          { label: "In Progress",   value: stats.inProgress,     color: "text-amber-500",     icon: Activity },
          { label: "Submitted",     value: stats.submitted,      color: "text-purple-500",    icon: TrendingUp },
          { label: "Approved",      value: stats.approved,       color: "text-emerald-500",   icon: CheckCircle2 },
          { label: "Overdue",       value: stats.overdue,        color: stats.overdue > 0 ? "text-rose-500" : "text-muted-foreground", icon: AlertCircle },
          { label: "My Score",      value: myScore,              color: "text-gold",          icon: Trophy },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <PremiumCard className="p-4">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[11px] text-muted-foreground font-medium">{s.label}</p>
                <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
              </div>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </PremiumCard>
          </motion.div>
        ))}
      </div>

      {/* Completion rate + hours */}
      <div className="grid lg:grid-cols-3 gap-4">
        <PremiumCard className="p-5 text-center">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Completion Rate</p>
          <div className="relative w-24 h-24 mx-auto mb-3">
            <svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--muted)" strokeWidth="3" />
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#10B981" strokeWidth="3"
                strokeDasharray={`${stats.completionRate} ${100 - stats.completionRate}`} strokeLinecap="round" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-foreground">
              {stats.completionRate}%
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{stats.approved} of {stats.total} completed</p>
        </PremiumCard>

        <PremiumCard className="p-5 text-center">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Focus Time</p>
          <p className="text-4xl font-bold text-foreground mb-1">{totalHours}<span className="text-lg font-medium text-muted-foreground ml-1">h</span></p>
          <p className="text-xs text-muted-foreground">{period === "daily" ? "Today" : "This week"}</p>
        </PremiumCard>

        <PremiumCard className="p-5 text-center">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Current Score</p>
          <p className="text-4xl font-bold text-gold mb-1">{myScore}</p>
          <p className="text-xs text-muted-foreground">Organisation points</p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">+10 pts on-time · +5 pts late</p>
        </PremiumCard>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <PremiumCard>
          <h3 className="text-sm font-semibold text-foreground mb-4">Task Completion (Last 7 Days)</h3>
          {completionTrend.length === 0 ? (
            <div className="h-[160px] flex items-center justify-center text-sm text-muted-foreground">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={completionTrend} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={d => d.split("-").slice(1).join("/")} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="completed" fill="#10B981" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </PremiumCard>

        <PremiumCard>
          <h3 className="text-sm font-semibold text-foreground mb-4">Focus Hours (Last 7 Days)</h3>
          {hoursTrend.length === 0 ? (
            <div className="h-[160px] flex items-center justify-center text-sm text-muted-foreground">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={hoursTrend} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={d => d.split("-").slice(1).join("/")} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="hours" stroke="#10B981" strokeWidth={2} dot={{ r: 3, fill: "#10B981" }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </PremiumCard>
      </div>

      {/* Task status breakdown */}
      <PremiumCard className="p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">My Tasks by Status</h3>
        </div>
        {tasks.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No tasks assigned yet.</div>
        ) : (
          <div className="divide-y divide-border">
            {tasks.map(t => (
              <div key={t.id} className="flex items-center gap-3 px-5 py-3 hover:bg-accent/20 transition-colors">
                <Circle className={`w-2 h-2 fill-current shrink-0 ${
                  isOverdue(t.deadline, t.status) ? "text-rose-500"
                  : t.status === "In Progress" ? "text-amber-500"
                  : t.status === "Review" ? "text-purple-500"
                  : ["Approved","Completed"].includes(t.status) ? "text-emerald-500"
                  : "text-muted-foreground/40"
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{t.title}</p>
                  {t.deadline && (
                    <p className={`text-[11px] mt-0.5 ${isOverdue(t.deadline, t.status) ? "text-rose-500 font-semibold" : "text-muted-foreground"}`}>
                      Due {new Date(t.deadline).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                  isOverdue(t.deadline, t.status)
                    ? "text-rose-500 bg-rose-500/10 border-rose-500/20"
                    : `${statusColor(t.status)} bg-muted border-border`
                }`}>
                  {isOverdue(t.deadline, t.status) ? "OVERDUE" : t.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </PremiumCard>

      {/* Execution timeline */}
      {timeline.length > 0 && (
        <PremiumCard className="p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Execution Timeline</h3>
          </div>
          <div className="p-5 space-y-4">
            {timeline.map((event, i) => (
              <div key={event.id + i} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-muted border border-border flex items-center justify-center text-sm shrink-0 mt-0.5">
                  {eventIcon(event.eventType)}
                </div>
                <div className="flex-1 min-w-0 pb-4 border-b border-border/50 last:border-0 last:pb-0">
                  <p className="text-sm font-medium text-foreground truncate">{event.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{event.event}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" /> {timeAgo(event.date)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </PremiumCard>
      )}
    </div>
  );
}
