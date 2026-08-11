"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart3, Loader2, AlertCircle, CheckCircle2, Clock,
  TrendingUp, RefreshCw, Trophy, Target, Activity
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line
} from "recharts";
import apiClient from "@/lib/api-client";
import { PremiumCard } from "@/components/ui/premium-card";
import { useAuth } from "@/components/auth/auth-context";
import { motion } from "framer-motion";

type Period = "daily" | "weekly";

function isOverdue(deadline: string | null, status: string) {
  if (!deadline) return false;
  if (["Approved", "Completed"].includes(status)) return false;
  return new Date(deadline) < new Date();
}

export default function MemberReportsPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>("weekly");
  const [data, setData]     = useState<any>(null);
  const [tasks, setTasks]   = useState<any[]>([]);
  const [myScore, setMyScore] = useState(0);
  const [myRank, setMyRank]   = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  const fetchAll = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const wid = localStorage.getItem("workspaceId");
      if (!wid) return;
      const [reportRes, tasksRes, lbRes] = await Promise.all([
        apiClient.get(`/org/reports/overview?workspaceId=${wid}&period=${period}`),
        apiClient.get(`/org/tasks?workspaceId=${wid}`),
        apiClient.get(`/org/reports/leaderboard?workspaceId=${wid}&period=weekly`),
      ]);
      if (reportRes.data.success) setData(reportRes.data.data);
      else setError(reportRes.data.error || "Failed to load reports");
      if (tasksRes.data.success)  setTasks(tasksRes.data.data || []);
      if (lbRes.data.success) {
        const me = (lbRes.data.data.leaderboard || []).find((e: any) => e.id === user?.id);
        if (me) { setMyScore(me.score); setMyRank(me.rank); }
      }
    } catch { setError("Unable to load reports. Please try again."); }
    finally { setLoading(false); }
  }, [period, user?.id]);

  useEffect(() => { if (user?.id) fetchAll(); }, [fetchAll, user?.id]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  if (error || !data) return (
    <div className="p-6 lg:p-8 max-w-[1000px] mx-auto w-full">
      <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500 text-sm">
        <AlertCircle className="w-4 h-4 shrink-0" /> {error || "No data available"}
        <button onClick={fetchAll} className="ml-auto text-xs hover:underline">Retry</button>
      </div>
    </div>
  );

  /* Task breakdown — member only sees own data (backend enforces this) */
  const taskStats = {
    total:      tasks.length,
    assigned:   tasks.filter(t => t.status === "Assigned").length,
    inProgress: tasks.filter(t => ["In Progress", "Accepted"].includes(t.status)).length,
    submitted:  tasks.filter(t => t.status === "Review").length,
    approved:   tasks.filter(t => ["Approved", "Completed"].includes(t.status)).length,
    overdue:    tasks.filter(t => isOverdue(t.deadline, t.status)).length,
    completionRate: tasks.length > 0
      ? Math.round((tasks.filter(t => ["Approved", "Completed"].includes(t.status)).length / tasks.length) * 100)
      : 0,
  };

  const totalHours       = data.workingHours?.total || 0;
  const completionTrend  = data.charts?.completionTrend || [];
  const hoursTrend       = data.charts?.hoursTrend || [];

  /* Daily-specific summary: focus on today's stats */
  const todayTasks = tasks.filter(t => {
    const d = new Date(t.completedAt || t.createdAt);
    return d.toDateString() === new Date().toDateString();
  });

  return (
    <div className="p-6 lg:p-8 max-w-[1000px] mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">MEMBER</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-emerald-500" /> My Reports
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Your personal performance — tasks, hours, score</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {(["daily", "weekly"] as const).map(p => (
              <button
                key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors capitalize ${period === p ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                {p}
              </button>
            ))}
          </div>
          <button onClick={fetchAll} className="p-2 rounded-lg border border-border hover:bg-accent transition-colors">
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Tasks Assigned", value: taskStats.assigned,   color: "text-blue-500",    icon: Target },
          { label: "Completed",      value: taskStats.approved,   color: "text-emerald-500", icon: CheckCircle2 },
          { label: period === "daily" ? "Today's Hours" : "Hours Logged",
            value: `${totalHours}h`,               color: "text-foreground",  icon: Clock },
          { label: "Overdue",        value: taskStats.overdue,    color: taskStats.overdue > 0 ? "text-rose-500" : "text-muted-foreground", icon: AlertCircle },
        ].map((k, i) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <PremiumCard className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground font-medium">{k.label}</p>
                <k.icon className={`w-4 h-4 ${k.color}`} />
              </div>
              <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
            </PremiumCard>
          </motion.div>
        ))}
      </div>

      {/* Score + rank + completion rate */}
      <div className="grid sm:grid-cols-3 gap-4">
        <PremiumCard className="p-5 text-center">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">My Score</p>
          <p className="text-4xl font-bold text-gold mb-1">{myScore}</p>
          <p className="text-xs text-muted-foreground">Organisation points</p>
        </PremiumCard>
        <PremiumCard className="p-5 text-center">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Leaderboard Rank</p>
          <p className="text-4xl font-bold text-foreground mb-1">
            {myRank !== null ? `#${myRank}` : "—"}
          </p>
          <p className="text-xs text-muted-foreground">Weekly ranking</p>
        </PremiumCard>
        <PremiumCard className="p-5 text-center">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Completion Rate</p>
          <p className="text-4xl font-bold text-emerald-500 mb-1">{taskStats.completionRate}%</p>
          <p className="text-xs text-muted-foreground">{taskStats.approved} of {taskStats.total} approved</p>
        </PremiumCard>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <PremiumCard>
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            Task Completion (Last 7 Days)
          </h3>
          {completionTrend.length === 0 ? (
            <div className="h-[160px] flex items-center justify-center text-sm text-muted-foreground">No completion data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={completionTrend} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={d => d.split("-").slice(1).join("/")} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="completed" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </PremiumCard>

        <PremiumCard>
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            Focus Hours (Last 7 Days)
          </h3>
          {hoursTrend.length === 0 ? (
            <div className="h-[160px] flex items-center justify-center text-sm text-muted-foreground">No hours data yet</div>
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

      {/* Detailed task breakdown */}
      <PremiumCard>
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-muted-foreground" />
          {period === "daily" ? "Today's Summary" : "Weekly Summary"}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label: "Total Assigned",  value: taskStats.total,      color: "text-foreground" },
            { label: "In Progress",     value: taskStats.inProgress,  color: "text-amber-500" },
            { label: "Submitted",       value: taskStats.submitted,   color: "text-purple-500" },
            { label: "Approved",        value: taskStats.approved,    color: "text-emerald-500" },
            { label: "Overdue",         value: taskStats.overdue,     color: taskStats.overdue > 0 ? "text-rose-500" : "text-muted-foreground" },
            { label: "Completion Rate", value: `${taskStats.completionRate}%`, color: "text-emerald-500" },
          ].map(s => (
            <div key={s.label} className="p-3 bg-muted/30 rounded-xl border border-border">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      </PremiumCard>

      {/* Task list with status */}
      <PremiumCard className="p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">All My Tasks</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Only your own tasks are shown here</p>
        </div>
        {tasks.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No tasks assigned yet.</div>
        ) : (
          <div className="divide-y divide-border">
            {tasks.map(t => (
              <div key={t.id} className="flex items-center gap-3 px-5 py-3 hover:bg-accent/20 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{t.title}</p>
                  {t.projectName && <p className="text-xs text-muted-foreground mt-0.5">📁 {t.projectName}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {t.deadline && (
                    <span className={`text-[11px] ${isOverdue(t.deadline, t.status) ? "text-rose-500 font-semibold" : "text-muted-foreground"}`}>
                      {isOverdue(t.deadline, t.status) ? "Overdue" : new Date(t.deadline).toLocaleDateString()}
                    </span>
                  )}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    t.status === "Approved" || t.status === "Completed" ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
                    : t.status === "Review"      ? "text-purple-500 bg-purple-500/10 border-purple-500/20"
                    : t.status === "In Progress" ? "text-amber-500 bg-amber-500/10 border-amber-500/20"
                    : "text-muted-foreground bg-muted border-border"
                  }`}>
                    {t.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </PremiumCard>
    </div>
  );
}
