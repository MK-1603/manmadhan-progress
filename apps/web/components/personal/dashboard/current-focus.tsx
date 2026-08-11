import React, { useState, useEffect } from "react";
import { Play, Pause, CheckCircle2, Target, MoreVertical, ExternalLink, Calendar as CalendarIcon, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api-client";

export function CurrentFocus({ activeFocus, nextTask, onAction }: { activeFocus: any, nextTask: any, onAction: () => void }) {
  const [elapsed, setElapsed] = useState(0);
  const router = useRouter();

  useEffect(() => {
    if (!activeFocus || activeFocus.status !== "RUNNING") {
      setElapsed(activeFocus?.activeDuration || 0);
      return;
    }

    const lastStart = activeFocus.resumedAt ? new Date(activeFocus.resumedAt).getTime() : new Date(activeFocus.startedAt).getTime();
    const baseElapsed = activeFocus.activeDuration || 0;

    const updateTimer = () => {
      const now = Date.now();
      setElapsed(baseElapsed + Math.floor((now - lastStart) / 1000));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeFocus]);

  const handleAction = async (action: "pause" | "resume" | "complete" | "startNext") => {
    try {
      if (action === "startNext" && nextTask) {
        await apiClient.post(`/personal/focus/start`, { taskId: nextTask.id });
      } else if (activeFocus) {
        await apiClient.post(`/personal/focus/${action}`, { sessionId: activeFocus.id });
      }
      onAction(); // Trigger parent refresh
    } catch (e) {
      console.error("Focus action failed:", e);
    }
  };

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h > 0 ? String(h).padStart(2, "0") + ":" : ""}${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  if (!activeFocus?.task) {
    return (
      <div className="bg-card border border-border/50 rounded-xl p-5 shadow-sm h-full flex flex-col relative">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Current Focus</h3>
          </div>
          <button className="text-muted-foreground hover:text-foreground">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 flex flex-col justify-center items-center text-center">
          <h3 className="text-lg font-bold text-foreground mb-1">No Active Task</h3>
          <p className="text-sm text-muted-foreground mb-6">Your schedule is currently clear.</p>
          {nextTask && (
            <button onClick={() => handleAction("startNext")} className="text-sm font-semibold bg-foreground text-background hover:bg-foreground/90 transition-colors px-6 py-2 rounded-lg">
              Start Next Task
            </button>
          )}
        </div>
      </div>
    );
  }

  const estimatedMinutes = activeFocus.task.estimatedMinutes || 60;
  const progressPercent = Math.min(100, Math.round((elapsed / (estimatedMinutes * 60)) * 100));

  // Calculate SVG circle properties
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div className="bg-card border border-border/50 rounded-xl p-5 shadow-sm h-full flex flex-col relative">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Current Focus</h3>
        </div>
        <button className="text-muted-foreground hover:text-foreground">
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      <div className="flex justify-between items-start mb-6">
        <div className="flex-1 pr-4">
          <h3 className="text-xl font-bold text-foreground mb-1.5">{activeFocus.task.title}</h3>
          <p className="text-sm font-medium text-muted-foreground">
            {activeFocus.project ? activeFocus.project.name : "Personal"} 
            {activeFocus.task.category ? ` • ${activeFocus.task.category}` : " • Execution"}
          </p>
          
          <div className="mt-3 flex flex-wrap gap-2">
            {activeFocus.task.milestone && (
              <span className="inline-flex px-2 py-0.5 bg-amber-500/10 text-amber-600 rounded text-xs font-bold uppercase tracking-wider">
                Milestone: {activeFocus.task.milestone}
              </span>
            )}
            {activeFocus.task.priority && (
              <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
                activeFocus.task.priority === 'High' ? 'bg-red-500/10 text-red-600' :
                activeFocus.task.priority === 'Medium' ? 'bg-amber-500/10 text-amber-600' :
                'bg-blue-500/10 text-blue-600'
              }`}>
                Priority: {activeFocus.task.priority}
              </span>
            )}
          </div>
        </div>
        
        {/* Circular Progress */}
        <div className="relative flex flex-col items-center shrink-0 w-[84px]">
          <div className="relative w-[84px] h-[84px]">
            <svg className="w-[84px] h-[84px] transform -rotate-90">
              <circle cx="42" cy="42" r="34" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-border" />
              <circle 
                cx="42" cy="42" r="34" stroke="currentColor" strokeWidth="6" fill="transparent" 
                strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="text-amber-500 transition-all duration-1000 ease-linear" 
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold text-foreground">{progressPercent}%</span>
            </div>
          </div>
          <p className="text-[10px] font-semibold text-muted-foreground mt-2 uppercase tracking-wider">Progress</p>
        </div>
      </div>

      <div className="mb-6">
        <div className="text-3xl font-bold text-foreground tabular-nums tracking-tight">
          {formatTime(elapsed)}
        </div>
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-1">Elapsed time</p>
      </div>
      
      <div className="mb-6 flex items-center gap-6">
        <div className="flex items-center gap-2 text-sm">
          <CalendarIcon className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Started at</p>
            <p className="font-semibold text-foreground">{new Date(activeFocus.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Estimated</p>
            <p className="font-semibold text-foreground">{estimatedMinutes} min</p>
          </div>
        </div>
      </div>

      <div className="mt-auto flex items-center gap-3">
        {activeFocus.status === "RUNNING" ? (
          <button onClick={() => handleAction("pause")} className="flex items-center justify-center gap-2 text-sm font-semibold bg-foreground text-background hover:bg-foreground/90 transition-colors px-4 py-2.5 rounded-lg flex-1">
            <Pause className="w-4 h-4 fill-current" /> Pause
          </button>
        ) : (
          <button onClick={() => handleAction("resume")} className="flex items-center justify-center gap-2 text-sm font-semibold bg-foreground text-background hover:bg-foreground/90 transition-colors px-4 py-2.5 rounded-lg flex-1">
            <Play className="w-4 h-4 fill-current" /> Resume
          </button>
        )}
        <button onClick={() => handleAction("complete")} className="flex items-center justify-center gap-2 text-sm font-semibold border border-border/50 text-foreground hover:bg-secondary/50 transition-colors px-4 py-2.5 rounded-lg flex-1">
          <CheckCircle2 className="w-4 h-4" /> Complete
        </button>
        <button 
          onClick={() => router.push(`/personal/tasks/${activeFocus.task.id}`)}
          className="flex items-center justify-center gap-2 text-sm font-semibold border border-border/50 text-foreground hover:bg-secondary/50 transition-colors px-4 py-2.5 rounded-lg"
        >
          <ExternalLink className="w-4 h-4" /> Open Task
        </button>
      </div>
    </div>
  );
}
