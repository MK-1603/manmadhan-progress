"use client";

import { useEffect, useState } from "react";
import { Plus, Target, TrendingUp, Calendar, AlertTriangle } from "lucide-react";
import apiClient from "@/lib/api-client";
import { PersonalGoalCreateModal } from "@/components/personal/personal-goal-create-modal";

type Goal = {
  id: string;
  name: string;
  description?: string;
  category: string;
  startDate?: string;
  targetDate?: string;
  priority: string;
  status: string;
  progress: number;
  targetValue?: number;
  currentValue?: number;
  unit?: string;
};

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchGoals = async () => {
    try {
      const result = await apiClient.get(`/personal/goals`);
      setGoals(result.data?.data ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High": return "text-red-500 bg-red-500/10 border-red-500/20";
      case "Medium": return "text-amber-500 bg-amber-500/10 border-amber-500/20";
      default: return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
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
            <h1 className="text-3xl font-bold">Goals</h1>
            <p className="mt-2 text-sm text-muted-foreground max-w-lg">
              Set clear objectives, define success criteria, and track your progress across all areas of your life.
            </p>
          </div>
          <button onClick={() => setOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-foreground text-background rounded-xl font-bold text-sm shadow-sm hover:bg-foreground/90 transition-all active:scale-95">
            <Plus className="w-4 h-4" /> New Goal
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 md:p-10">
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1,2,3].map(i => <div key={i} className="h-48 bg-card border border-border rounded-2xl animate-pulse" />)}
          </div>
        ) : goals.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-border/60 rounded-3xl bg-card/25">
            <Target className="w-12 h-12 text-muted-foreground/60 mx-auto mb-4" />
            <h3 className="text-lg font-bold mb-1">No active goals</h3>
            <p className="text-sm text-muted-foreground mb-6">Goals give your daily tasks direction and purpose.</p>
            <button onClick={() => setOpen(true)} className="px-5 py-2.5 bg-foreground text-background font-bold rounded-xl text-sm">Create Goal</button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {goals.map((goal) => {
              const hasTargetValue = goal.targetValue !== null && goal.targetValue !== undefined;
              const numericProgress = hasTargetValue ? ((goal.currentValue || 0) / goal.targetValue!) * 100 : goal.progress;
              
              return (
                <article key={goal.id} className="rounded-2xl border border-border bg-card p-6 flex flex-col hover:border-foreground/30 transition-colors shadow-xs">
                  <div className="flex justify-between items-start mb-4">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border ${getPriorityColor(goal.priority)}`}>
                      {goal.priority}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground bg-accent px-2 py-1 rounded-md">
                      {goal.category}
                    </span>
                  </div>

                  <h2 className="text-lg font-bold line-clamp-1">{goal.name}</h2>
                  {goal.description && (
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                      {goal.description}
                    </p>
                  )}

                  <div className="mt-auto pt-6 space-y-4">
                    {hasTargetValue ? (
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold">{goal.currentValue || 0} <span className="text-muted-foreground font-normal">{goal.unit}</span></span>
                        <span className="text-muted-foreground">/ {goal.targetValue} {goal.unit}</span>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-semibold text-foreground flex items-center gap-1.5"><TrendingUp className="w-4 h-4 text-emerald-500"/> {numericProgress}%</span>
                      </div>
                    )}

                    <div className="h-2 w-full bg-accent rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(numericProgress, 100)}%` }} />
                    </div>

                    {goal.targetDate && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-2 border-t border-border/50">
                        <Calendar className="w-3.5 h-3.5" />
                        Deadline: {new Date(goal.targetDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      <PersonalGoalCreateModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onSave={() => fetchGoals()}
      />
    </div>
  );
}
