"use client";

import { useEffect, useState } from "react";
import { Play, Square, Trophy, Target, Clock, Activity, ArrowRight, Zap, CheckCircle2 } from "lucide-react";
import apiClient from "@/lib/api-client";
import Link from "next/link";

export default function ProductivityPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [focusing, setFocusing] = useState(false);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    fetchProductivity();
  }, []);

  const fetchProductivity = async () => {
    try {
      const res = await apiClient.get(`/personal/intelligence/productivity/today`);
      setData(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (focusing) {
      interval = setInterval(() => {
        setTimer(t => t + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [focusing]);

  const startFocus = async () => {
    try {
      const res = await apiClient.post(`/personal/intelligence/focus/start`, {});
      setActiveSession(res.data.data.id);
      setFocusing(true);
      setTimer(0);
    } catch (e) {
      console.error(e);
    }
  };

  const stopFocus = async () => {
    if (!activeSession) return;
    try {
      await apiClient.post(`/personal/intelligence/focus/complete`, {
        sessionId: activeSession,
        durationMinutes: Math.floor(timer / 60)
      });
      setFocusing(false);
      setActiveSession(null);
      setTimer(0);
      fetchProductivity();
    } catch (e) {
      console.error(e);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="min-h-screen bg-background pb-24 text-foreground font-sans flex flex-col">
      <header className="px-6 md:px-10 pt-8 pb-6 border-b border-border bg-card shrink-0">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider mb-2">
            <Zap className="w-4 h-4 fill-primary" /> Execution Center
          </div>
          <h1 className="text-3xl font-bold">Today's Productivity</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 md:p-10 w-full flex-1 space-y-10">
        
        {/* Main Score Board */}
        <section className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-gradient-to-br from-zinc-900 to-black dark:from-zinc-100 dark:to-white text-zinc-100 dark:text-zinc-900 rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden flex flex-col justify-between">
            {/* Background elements */}
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
            <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-blue-500/20 rounded-full blur-2xl" />
            
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div>
                <h2 className="text-lg font-medium opacity-80 mb-2">Daily Execution Score</h2>
                <div className="text-7xl font-black tracking-tighter tabular-nums flex items-end gap-3">
                  {loading ? "--" : data?.score}
                  <span className="text-2xl font-bold opacity-60 tracking-normal pb-2">pts</span>
                </div>
              </div>
              <div className="mt-8 flex gap-8">
                <div>
                  <div className="text-3xl font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    {loading ? "-" : data?.tasksCompleted}
                  </div>
                  <div className="text-xs font-semibold uppercase tracking-wider opacity-60 mt-1">Tasks Done</div>
                </div>
                <div>
                  <div className="text-3xl font-bold flex items-center gap-2">
                    <Activity className="w-6 h-6 text-blue-400" />
                    {loading ? "-" : data?.habitsCompleted}
                  </div>
                  <div className="text-xs font-semibold uppercase tracking-wider opacity-60 mt-1">Habits Hit</div>
                </div>
                <div>
                  <div className="text-3xl font-bold flex items-center gap-2">
                    <Clock className="w-6 h-6 text-purple-400" />
                    {loading ? "-" : data?.focusMinutes}<span className="text-lg">m</span>
                  </div>
                  <div className="text-xs font-semibold uppercase tracking-wider opacity-60 mt-1">Deep Work</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-3xl p-8 flex flex-col justify-between items-center text-center shadow-lg">
            <div>
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">Focus Session</h3>
              <p className="text-sm text-muted-foreground mb-6">Enter deep work mode to accumulate focus minutes.</p>
              
              <div className="text-5xl font-black font-mono tracking-tight mb-8">
                {formatTime(timer)}
              </div>
            </div>
            
            {focusing ? (
              <button onClick={stopFocus} className="w-full py-4 bg-red-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-red-600 transition-all shadow-xl shadow-red-500/20">
                <Square className="w-5 h-5 fill-current" /> Stop Session
              </button>
            ) : (
              <button onClick={startFocus} className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-xl shadow-primary/20">
                <Play className="w-5 h-5 fill-current" /> Start Deep Work
              </button>
            )}
          </div>
        </section>

        {/* Links */}
        <section className="flex justify-end">
          <Link href="/personal/analytics" className="px-5 py-3 bg-card border border-border font-bold rounded-xl hover:border-foreground/30 transition-all flex items-center gap-2 group">
            View Long-term Analytics <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </section>

      </main>
    </div>
  );
}
