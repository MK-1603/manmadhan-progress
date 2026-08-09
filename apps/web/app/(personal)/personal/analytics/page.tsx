"use client";

import { useEffect, useState } from "react";
import { LineChart, BarChart, TrendingUp, Calendar as CalendarIcon, Activity, Clock, CheckCircle2 } from "lucide-react";
import apiClient from "@/lib/api-client";

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [trends, setTrends] = useState<any[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const res = await apiClient.get(`/personal/intelligence/analytics/trends`);
      setTrends(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const avgScore = trends.length > 0 ? Math.floor(trends.reduce((acc, t) => acc + t.score, 0) / trends.length) : 0;
  const totalFocus = trends.length > 0 ? trends.reduce((acc, t) => acc + t.focusMinutes, 0) : 0;
  const totalTasks = trends.length > 0 ? trends.reduce((acc, t) => acc + t.tasksCompleted, 0) : 0;

  return (
    <div className="min-h-screen bg-background pb-24 text-foreground font-sans flex flex-col">
      <header className="px-6 md:px-10 pt-8 pb-6 border-b border-border bg-card shrink-0">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider mb-2">
            <Activity className="w-4 h-4" /> Personal Intelligence
          </div>
          <h1 className="text-3xl font-bold">Analytics & Trends</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 md:p-10 w-full flex-1 space-y-10">
        
        {/* KPI Cards */}
        <section className="grid md:grid-cols-3 gap-6">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 text-muted-foreground mb-4">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              <h3 className="font-semibold text-sm uppercase tracking-wider">Avg Daily Score</h3>
            </div>
            <div className="text-4xl font-black">{loading ? "--" : avgScore}</div>
            <div className="text-sm text-emerald-500 font-medium mt-2">+12% vs last week</div>
          </div>
          
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 text-muted-foreground mb-4">
              <Clock className="w-5 h-5 text-purple-500" />
              <h3 className="font-semibold text-sm uppercase tracking-wider">Total Deep Work</h3>
            </div>
            <div className="text-4xl font-black">{loading ? "--" : `${Math.floor(totalFocus/60)}h ${totalFocus%60}m`}</div>
            <div className="text-sm text-purple-500 font-medium mt-2">Consistent focus</div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 text-muted-foreground mb-4">
              <CheckCircle2 className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold text-sm uppercase tracking-wider">Tasks Completed</h3>
            </div>
            <div className="text-4xl font-black">{loading ? "--" : totalTasks}</div>
            <div className="text-sm text-muted-foreground font-medium mt-2">Over the last 7 days</div>
          </div>
        </section>

        {/* Mock Chart Area */}
        <section className="bg-card border border-border rounded-3xl p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <LineChart className="w-5 h-5 text-primary" /> Execution Trend (7 Days)
            </h2>
            <select className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm font-medium">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>
          
          <div className="h-64 flex items-end justify-between gap-2">
            {loading ? (
              <div className="w-full h-full flex items-center justify-center opacity-50">
                <Activity className="w-10 h-10 animate-pulse text-muted-foreground" />
              </div>
            ) : (
              trends.map((t, i) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-end gap-2 group">
                  <div className="w-full bg-primary/20 hover:bg-primary/40 rounded-t-lg relative transition-all" style={{ height: `${(t.score / 150) * 100}%` }}>
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-foreground text-background text-xs font-bold px-2 py-1 rounded">
                      {t.score}
                    </div>
                  </div>
                  <div className="text-xs font-medium text-muted-foreground">
                    {new Date(t.date).toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
