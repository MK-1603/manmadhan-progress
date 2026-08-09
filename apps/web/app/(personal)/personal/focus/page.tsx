"use client";

import { useEffect, useState, useRef } from "react";
import { Check, Pause, Play, Maximize2, Settings, Volume2, Square, History } from "lucide-react";
import apiClient from "@/lib/api-client";
import { useSocket } from "@/components/providers/socket-provider";

type FocusState = { id: string; startTime: string; task?: { title?: string } | null; durationSeconds?: number } | null;
type Session = { id: string; durationSeconds: number; createdAt: string; task?: { title: string } };

export default function FocusPage() {
  const [mounted, setMounted] = useState(false);
  const [focus, setFocus] = useState<FocusState>(null);
  const [tasks, setTasks] = useState<{ id: string; title: string; status: string }[]>([]);
  const [recentSessions, setRecentSessions] = useState<Session[]>([]);
  const [selected, setSelected] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const { socket } = useSocket();

  const load = async () => {
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      if (!workspaceId) return;

      const [dashboard, taskResult] = await Promise.all([
        apiClient.get(`/dashboard?workspaceId=${workspaceId}`),
        apiClient.get(`/personal/tasks`)
      ]);

      setFocus(dashboard.data?.data?.activeFocus ?? null);
      setTasks((taskResult.data?.data ?? []).filter((task: { workspaceId: string; status: string }) => task.status !== "Completed"));
      
      // Load recent sessions from dashboard or time-tracking if available.
      // For now, mapping from dashboard activity if possible, or keeping it empty if no endpoint exists yet.
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load focus");
    }
  };

  useEffect(() => {
    setMounted(true);
    void load();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = (payload: any) => {
      const type = payload?.type;
      if (type === "focus_started" || type === "focus_paused" || type === "focus_completed") {
        load();
      }
    };
    socket.on("FOCUS_STARTED", handleUpdate);
    socket.on("FOCUS_PAUSED", handleUpdate);
    socket.on("FOCUS_COMPLETED", handleUpdate);
    return () => {
      socket.off("FOCUS_STARTED", handleUpdate);
      socket.off("FOCUS_PAUSED", handleUpdate);
      socket.off("FOCUS_COMPLETED", handleUpdate);
    };
  }, [socket]);

  useEffect(() => {
    if (!focus) {
      setSeconds(0);
      return;
    }
    const start = new Date(focus.startTime).getTime();
    const tick = () => setSeconds(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [focus]);

  const start = async () => {
    const workspaceId = localStorage.getItem("workspaceId");
    if (!workspaceId || !selected) return;
    await apiClient.post("/focus/start", { workspaceId, taskId: selected });
    await load();
  };

  const pause = async () => {
    const workspaceId = localStorage.getItem("workspaceId");
    if (!workspaceId) return;
    await apiClient.post("/focus/pause", { workspaceId });
    await load();
  };

  const complete = async () => {
    const workspaceId = localStorage.getItem("workspaceId");
    if (!workspaceId) return;
    await apiClient.post("/focus/complete", { workspaceId, completeTask: true });
    await load();
  };

  const format = (value: number) => 
    `${String(Math.floor(value / 3600)).padStart(2, "0")}:${String(Math.floor(value / 60) % 60).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;

  if (!mounted) return null;

  return (
    <div className="h-[100dvh] bg-background font-sans text-foreground flex flex-col overflow-hidden">
      {/* HEADER */}
      <header className="px-6 md:px-10 py-6 shrink-0 flex justify-between items-center z-10">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <span>Personal</span>
          <span>/</span>
          <span className="text-foreground">Focus Mode</span>
        </div>
        <div className="flex items-center gap-4">
           <button className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-muted/50"><Volume2 className="w-5 h-5" /></button>
           <button className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-muted/50"><Settings className="w-5 h-5" /></button>
           <button className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-muted/50"><Maximize2 className="w-5 h-5" /></button>
        </div>
      </header>

      {/* FOCUS TIMER (CENTER) */}
      <main className="flex-1 min-h-0 flex flex-col items-center justify-center p-6 relative z-10">
        {error && <p className="mb-4 text-sm text-rose-500">{error}</p>}
        
        {focus ? (
          <div className="text-center animate-in fade-in zoom-in-95 duration-500">
            <div className="px-4 py-1.5 bg-muted/50 rounded-full text-xs font-bold uppercase tracking-wider text-muted-foreground inline-flex items-center gap-2 mb-8">
              <span>{focus.task?.title ?? "Active work"}</span>
            </div>

            <div className="text-[clamp(4rem,15vw,12rem)] leading-none font-bold font-mono tracking-tighter tabular-nums select-none mb-12">
              {String(Math.floor(seconds / 60)).padStart(2, "0")}<span className="opacity-40 text-muted-foreground">:</span>{String(seconds % 60).padStart(2, "0")}
            </div>

            <div className="flex items-center justify-center gap-6">
               <button onClick={() => void pause()} className="w-14 h-14 rounded-full bg-muted/50 text-muted-foreground flex items-center justify-center hover:bg-muted hover:text-foreground transition-all active:scale-95">
                  <Pause className="w-5 h-5 fill-current" />
               </button>
               
               <button onClick={() => void complete()} className="w-24 h-24 rounded-full shadow-2xl bg-primary text-primary-foreground flex items-center justify-center transition-all active:scale-95">
                  <Check className="w-10 h-10" />
               </button>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-md mt-10 rounded-2xl border border-dashed border-border p-8 text-center bg-card/30 backdrop-blur">
            <p className="text-sm font-semibold">NO ACTIVE WORK</p>
            <p className="mt-1 mb-6 text-xs text-muted-foreground">Select a task to start a persisted focus session.</p>
            
            <div className="flex flex-col gap-3">
              <select 
                value={selected} 
                onChange={(event) => setSelected(event.target.value)} 
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">Select task…</option>
                {tasks.map((task) => (
                  <option key={task.id} value={task.id}>{task.title}</option>
                ))}
              </select>
              
              <button 
                disabled={!selected} 
                onClick={() => void start()} 
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold tracking-wide text-primary-foreground disabled:opacity-50 transition-colors hover:bg-primary/90"
              >
                <Play className="h-4 w-4 fill-current" /> START FOCUS
              </button>
            </div>
          </div>
        )}
      </main>

      {/* BACKGROUND AMBIENT GLOW */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] pointer-events-none transition-opacity duration-1000 ${focus ? 'opacity-100' : 'opacity-0'}`} />

      {/* RECENT SESSIONS */}
      <footer className="shrink-0 p-6 md:px-10 md:py-8 border-t border-muted bg-card/50 backdrop-blur-md relative z-10">
         <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 shrink-0">
               <History className="w-4 h-4" /> Recent Sessions
            </h3>
            
            <div className="flex gap-4 overflow-x-auto hide-scrollbar w-full md:justify-end">
               {recentSessions.length > 0 ? (
                 recentSessions.map((session, i) => (
                   <div key={i} className="px-4 py-3 bg-background rounded-xl border border-muted min-w-[180px] shrink-0">
                      <p className="text-sm font-semibold truncate">{session.task?.title ?? "Work"}</p>
                      <div className="flex items-center justify-between mt-1">
                         <span className="text-xs text-muted-foreground">{Math.floor(session.durationSeconds / 60)}m</span>
                         <span className="text-[10px] text-muted-foreground uppercase">{new Date(session.createdAt).toLocaleDateString()}</span>
                      </div>
                   </div>
                 ))
               ) : (
                 <p className="text-sm text-muted-foreground">No recent sessions yet.</p>
               )}
            </div>
         </div>
      </footer>
    </div>
  );
}
