"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart3, Loader2, AlertCircle, CheckCircle2,
  Clock, Users, TrendingUp, RefreshCw, Target, Calendar
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line
} from "recharts";
import apiClient from "@/lib/api-client";
import { PremiumCard } from "@/components/ui/premium-card";
import { useAuth } from "@/components/auth/auth-context";

export default function CoCeoReportsPage() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("weekly");

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      if (!workspaceId) return;
      const res = await apiClient.get(
        `/org/reports/overview?workspaceId=${workspaceId}&period=${period}`
      );
      if (res.data.success) {
        setData(res.data.data);
      } else {
        setError(res.data.error || "Failed to load reports");
      }
    } catch {
      setError("Unable to load reports. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 lg:p-8 max-w-[1200px] mx-auto w-full">
        <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          <button onClick={fetchReports} className="ml-auto hover:underline text-xs">Retry</button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Filter team performance to only this CO-CEO's team members
  const myTeamPerformance = (data.teamPerformance || []).filter(
    (m: any) => m.managerId === user?.id || m.role === "MEMBER"
  );

  const completionTrend = data.charts?.completionTrend || [];
  const hoursTrend = data.charts?.hoursTrend || [];

  return (
    <div className="p-6 lg:p-8 max-w-[1200px] mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/20">
              CO-CEO
            </span>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-purple-500" /> Reports
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Team and personal performance metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {(["daily", "weekly", "monthly"] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors capitalize ${
                  period === p ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <button
            onClick={fetchReports}
            className="p-2 rounded-lg border border-border hover:bg-accent transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: "Tasks Completed",
            value: data.taskStats?.completed ?? 0,
            sub: `of ${data.taskStats?.total ?? 0} total`,
            icon: CheckCircle2,
            color: "text-emerald-500"
          },
          {
            label: "Hours Logged",
            value: `${data.workingHours?.total ?? 0}h`,
            sub: "verified work time",
            icon: Clock,
            color: "text-blue-500"
          },
          {
            label: "Overdue Tasks",
            value: data.taskStats?.overdue ?? 0,
            sub: "need attention",
            icon: AlertCircle,
            color: "text-rose-500"
          },
          {
            label: "Active Projects",
            value: data.projectStats?.active ?? 0,
            sub: `${data.projectStats?.total ?? 0} total`,
            icon: Target,
            color: "text-purple-500"
          },
        ].map(k => (
          <PremiumCard key={k.label} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground font-medium">{k.label}</p>
              <k.icon className={`w-4 h-4 ${k.color}`} />
            </div>
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{k.sub}</p>
          </PremiumCard>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Task Completion Trend */}
        <PremiumCard>
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            Task Completion (Last 7 Days)
          </h3>
          {completionTrend.length === 0 ? (
            <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground">
              No data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={completionTrend} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={d => d.split("-").slice(1).join("/")}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="completed" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </PremiumCard>

        {/* Working Hours Trend */}
        <PremiumCard>
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            Working Hours (Last 7 Days)
          </h3>
          {hoursTrend.length === 0 ? (
            <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground">
              No data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={hoursTrend} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={d => d.split("-").slice(1).join("/")}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="hours"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#8B5CF6" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </PremiumCard>
      </div>

      {/* Team Performance Table */}
      <PremiumCard className="p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Team Performance</h3>
        </div>
        {myTeamPerformance.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No team performance data available for this period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border">
                <tr className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  <th className="px-5 py-3 text-left">Member</th>
                  <th className="px-4 py-3 text-right">Tasks Done</th>
                  <th className="px-4 py-3 text-right">Hours</th>
                  <th className="px-4 py-3 text-right">Completion</th>
                  <th className="px-4 py-3 text-right">Overdue</th>
                </tr>
              </thead>
              <tbody>
                {myTeamPerformance.map((m: any) => (
                  <tr
                    key={m.id}
                    className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xs font-bold text-emerald-500 shrink-0">
                          {(m.name || "?").charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-semibold text-foreground">{m.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-right font-medium text-emerald-500">
                      {m.tasksCompleted}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-right text-foreground">
                      {m.hoursLogged}h
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-14 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500 rounded-full"
                            style={{ width: `${m.completionRate}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-foreground">{m.completionRate}%</span>
                      </div>
                    </td>
                    <td className={`px-4 py-3.5 text-sm text-right font-medium ${m.tasksOverdue > 0 ? "text-rose-500" : "text-muted-foreground"}`}>
                      {m.tasksOverdue}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PremiumCard>
    </div>
  );
}
