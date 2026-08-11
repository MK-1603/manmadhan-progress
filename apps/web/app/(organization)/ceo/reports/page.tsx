"use client";

import { useState, useEffect } from "react";
import { BarChart3, Loader2, AlertCircle, TrendingUp, Clock, CheckCircle2, Users, Target, RefreshCw } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import apiClient from "@/lib/api-client";
import { PremiumCard } from "@/components/ui/premium-card";

export default function CEOReportsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("weekly");

  const fetchReports = async () => {
    setLoading(true);
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      if (!workspaceId) return;
      const res = await apiClient.get(`/org/reports/overview?workspaceId=${workspaceId}&period=${period}`);
      if (res.data.success) setData(res.data.data);
      else setError(res.data.error || "Failed to load reports");
    } catch { setError("Unable to load reports. Please try again."); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchReports(); }, [period]);

  const COLORS = ["#D4AF37", "#8B5CF6", "#10B981", "#3B82F6", "#F59E0B", "#EF4444"];

  if (loading) return <div className="flex items-center justify-center min-h-[calc(100vh-80px)]"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (error) return <div className="p-6"><div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500 text-sm"><AlertCircle className="w-4 h-4 shrink-0" /> {error} <button onClick={fetchReports} className="ml-auto hover:underline text-xs">Retry</button></div></div>;
  if (!data) return null;

  const plannedHours = Math.round(data.plannedVsActual.plannedMinutes / 60);
  const actualHours = Math.round(data.plannedVsActual.actualMinutes / 60);
  const plannedVsActual = [
    { label: "Planned", hours: plannedHours, fill: "#D4AF37" },
    { label: "Actual", hours: actualHours, fill: "#8B5CF6" },
  ];

  const projectHealthData = [
    { name: "Healthy", value: data.projectStats.healthy, color: "#10B981" },
    { name: "At Risk", value: data.projectStats.atRisk, color: "#F59E0B" },
    { name: "Off Track", value: data.projectStats.offTrack || 0, color: "#EF4444" },
  ].filter(d => d.value > 0);

  return (
    <div className="p-6 lg:p-8 max-w-[1440px] mx-auto w-full space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" /> Reports
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Organization performance metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {(["daily", "weekly", "monthly"] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors capitalize ${period === p ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{p}</button>
            ))}
          </div>
          <button onClick={fetchReports} className="p-2 rounded-lg border border-border hover:bg-accent transition-colors"><RefreshCw className="w-4 h-4 text-muted-foreground" /></button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Projects", value: data.projectStats.total, sub: `${data.projectStats.active} active`, icon: Target, color: "text-blue-500" },
          { label: "Tasks Completed", value: data.taskStats.completed, sub: `of ${data.taskStats.total} total`, icon: CheckCircle2, color: "text-emerald-500" },
          { label: "Hours Logged", value: `${data.workingHours.total}h`, sub: "verified work time", icon: Clock, color: "text-gold" },
          { label: "Overdue Tasks", value: data.taskStats.overdue, sub: "need attention", icon: AlertCircle, color: "text-rose-500" },
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
        {/* Planned vs Actual Work */}
        <PremiumCard>
          <h3 className="text-sm font-semibold text-foreground mb-4">Planned vs Actual Work</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={plannedVsActual} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="hours" fill="#D4AF37" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </PremiumCard>

        {/* Work Hours Trend */}
        <PremiumCard>
          <h3 className="text-sm font-semibold text-foreground mb-4">Work Hours (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data.charts.hoursTrend} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={d => d.split("-").slice(1).join("/")} />
              <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="hours" stroke="#D4AF37" strokeWidth={2} dot={{ r: 3, fill: "#D4AF37" }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </PremiumCard>

        {/* Project Health */}
        <PremiumCard>
          <h3 className="text-sm font-semibold text-foreground mb-4">Project Health</h3>
          {projectHealthData.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">No projects to display</div>
          ) : (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={projectHealthData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                    {projectHealthData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {projectHealthData.map(d => (
                  <div key={d.name} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                    <span className="text-foreground">{d.name}</span>
                    <span className="font-bold text-foreground ml-auto">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </PremiumCard>

        {/* Task Completion Trend */}
        <PremiumCard>
          <h3 className="text-sm font-semibold text-foreground mb-4">Task Completion (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={data.charts.completionTrend} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={d => d.split("-").slice(1).join("/")} />
              <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="completed" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </PremiumCard>
      </div>

      {/* Team Performance */}
      <PremiumCard>
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-muted-foreground" /> Team Performance</h3>
        {data.teamPerformance.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No performance data available</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border">
                <tr className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">Member</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="px-4 py-3 text-right">Tasks Done</th>
                  <th className="px-4 py-3 text-right">Hours</th>
                  <th className="px-4 py-3 text-right">Completion</th>
                  <th className="px-4 py-3 text-right">Overdue</th>
                </tr>
              </thead>
              <tbody>
                {data.teamPerformance.map((m: any) => (
                  <tr key={m.id} className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-3.5 text-sm font-semibold text-foreground">{m.name}</td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">{m.role}</td>
                    <td className="px-4 py-3.5 text-sm text-right font-medium text-emerald-500">{m.tasksCompleted}</td>
                    <td className="px-4 py-3.5 text-sm text-right text-foreground">{m.hoursLogged}h</td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${m.completionRate}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-foreground">{m.completionRate}%</span>
                      </div>
                    </td>
                    <td className={`px-4 py-3.5 text-sm text-right font-medium ${m.tasksOverdue > 0 ? "text-rose-500" : "text-muted-foreground"}`}>{m.tasksOverdue}</td>
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
