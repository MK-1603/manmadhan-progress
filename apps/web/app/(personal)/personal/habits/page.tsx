"use client";

import { useEffect, useState } from "react";
import { Plus, Activity, CheckCircle2, Circle, Flame } from "lucide-react";
import apiClient from "@/lib/api-client";
import { PersonalHabitCreateModal } from "@/components/personal/personal-habit-create-modal";

type Habit = {
  id: string;
  name: string;
  description?: string;
  category: string;
  frequency: string;
  target: number;
  preferredTime: string;
  currentStreak: number;
  longestStreak: number;
  status: string;
};

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [todayLogs, setTodayLogs] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchHabits = async () => {
    try {
      const result = await apiClient.get(`/personal/habits`);
      const habitsData = result.data?.data ?? [];
      setHabits(habitsData);

      const todayStr = new Date().toISOString().split("T")[0];
      const logsMap: Record<string, boolean> = {};

      // Fetch logs for today
      for (const h of habitsData) {
        const logsRes = await apiClient.get(`/personal/habits/${h.id}/logs`);
        const logs = logsRes.data?.data ?? [];
        const todayLog = logs.find((l: any) => l.date === todayStr);
        if (todayLog) {
          logsMap[h.id] = true;
        }
      }
      setTodayLogs(logsMap);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHabits();
  }, []);

  const toggleHabit = async (habitId: string) => {
    const todayStr = new Date().toISOString().split("T")[0];
    const isCompleted = todayLogs[habitId];

    // Optimistic UI
    setTodayLogs(prev => ({ ...prev, [habitId]: !isCompleted }));

    try {
      await apiClient.post(`/personal/habits/${habitId}/log`, {
        date: todayStr,
        value: !isCompleted ? 1 : 0
      });
      // Optionally re-fetch to get updated streaks
      fetchHabits();
    } catch (e) {
      console.error("Failed to toggle habit");
      // Revert optimistic UI
      setTodayLogs(prev => ({ ...prev, [habitId]: isCompleted }));
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 text-foreground font-sans">
      <header className="px-6 md:px-10 pt-8 pb-6 border-b border-border bg-card">
        <div className="max-w-5xl mx-auto flex justify-between items-end">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              <span>Personal</span> / <span className="text-foreground">Planner</span>
            </div>
            <h1 className="text-3xl font-bold">Habits</h1>
            <p className="mt-2 text-sm text-muted-foreground max-w-lg">
              Track your daily routines, build consistency, and visualize your progress over time.
            </p>
          </div>
          <button onClick={() => setOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-foreground text-background rounded-xl font-bold text-sm shadow-sm hover:bg-foreground/90 transition-all active:scale-95">
            <Plus className="w-4 h-4" /> New Habit
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 md:p-10">
        {loading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-24 bg-card border border-border rounded-2xl animate-pulse" />)}
          </div>
        ) : habits.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-border/60 rounded-3xl bg-card/25">
            <Activity className="w-12 h-12 text-muted-foreground/60 mx-auto mb-4" />
            <h3 className="text-lg font-bold mb-1">No habits configured</h3>
            <p className="text-sm text-muted-foreground mb-6">Start building good routines by adding your first habit.</p>
            <button onClick={() => setOpen(true)} className="px-5 py-2.5 bg-foreground text-background font-bold rounded-xl text-sm">Add Habit</button>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Today's Habits</h2>
            
            {habits.map((habit) => {
              const isDone = !!todayLogs[habit.id];

              return (
                <article key={habit.id} className={`rounded-2xl border bg-card p-5 flex items-center justify-between transition-colors shadow-xs ${isDone ? "border-emerald-500/30 bg-emerald-500/5" : "border-border hover:border-foreground/30"}`}>
                  <div className="flex items-center gap-4">
                    <button onClick={() => toggleHabit(habit.id)} className="shrink-0 transition-transform active:scale-90 focus:outline-none">
                      {isDone ? (
                        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                      ) : (
                        <Circle className="w-8 h-8 text-muted-foreground/40 hover:text-emerald-500/50 transition-colors" />
                      )}
                    </button>
                    <div>
                      <h2 className={`text-lg font-bold ${isDone ? "line-through text-muted-foreground" : ""}`}>{habit.name}</h2>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="bg-accent px-2 py-0.5 rounded-md">{habit.preferredTime}</span>
                        <span>{habit.category}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex flex-col items-end">
                      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Streak</span>
                      <div className="flex items-center gap-1.5 font-bold text-lg">
                        <Flame className={`w-5 h-5 ${habit.currentStreak > 0 ? "text-orange-500" : "text-muted-foreground/30"}`} />
                        {habit.currentStreak}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      <PersonalHabitCreateModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onSave={() => fetchHabits()}
      />
    </div>
  );
}
