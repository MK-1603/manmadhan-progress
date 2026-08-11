"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Focus, Play, Pause, Square, Clock, CheckSquare,
  AlertCircle, Loader2, Target, Activity
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { PremiumCard } from "@/components/ui/premium-card";
import { useSocket } from "@/components/providers/socket-provider";
import { motion } from "framer-motion";

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function isWorkingHours() {
  const h = new Date().getHours();
  return h >= 4 && h < 23;
}

function timeUntilEnd() {
  const now = new Date();
  const end = new Date();
  end.setHours(23, 0, 0, 0);
  const mins = Math.max(0, Math.floor((end.getTime() - now.getTime()) / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const statusColor = (s: string) => {
  const m: Record<string, string> = {
    "Assigned":   "text-blue-500 bg-blue-500/10 border-blue-500/20",
    "Accepted":   "text-sky-500 bg-sky-500/10 border-sky-500/20",
    "In Progress":"text-amber-500 bg-amber-500/10 border-amber-500/20",
  };
  return m[s] || "text-muted-foreground bg-muted border-border";
};

export default function MemberFocusPage() {
  const { socket } = useSocket();
  const [tasks, setTasks]           = useState<any[]>([]);
  const [activeTask, setActiveTask] = useState<any>(null);
  const [session, setSession]       = useState<any>(null);
  const [elapsed, setElapsed]       = useState(0);
  const [loading, setLoading]       = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError]           = useState("");
  const [systemOff, setSystemOff]   = useState(!isWorkingHours());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* Poll system state */
  useEffect(() => {
    const check = () => setSystemOff(!isWorkingHours());
    check();
    const interval = setInterval(check, 30_000);
    return () => clearInterval(interval);
  }, []);

  const fetchTasks = useCallback(async () => {
    try {
      const wid = localStorage.getItem("workspaceId");
      if (!wid) return;
      // Members can only start focus on their own assigned / in-progress tasks
      const [r1, r2] = await Promise.all([
        apiClient.get(`/org/tasks?workspaceId=${wid}&status=Assigned`),
        apiClient.get(`/org/tasks?workspaceId=${wid}&status=In Progress`),
      ]);
      const combined = [
        ...(r1.data.success ? r1.data.data : []),
        ...(r2.data.success ? r2.data.data : []),
      ];
      setTasks(combined);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);
  useEffect(() => {
    if (!socket) return;
    socket.on("task.updated", fetchTasks);
    socket.on("TASK_ASSIGNED", fetchTasks);
    return () => { socket.off("task.updated"); socket.off("TASK_ASSIGNED"); };
  }, [socket, fetchTasks]);

  /* Timer — server-based elapsed seed + local ticking */
  useEffect(() => {
    if (session?.status === "Active") {
      timerRef.current = setInterval(() => setElapsed(p => p + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [session?.status]);

  const handleStart = async (task: any) => {
    if (systemOff) { setError("Focus is not available during system-off hours (23:00 – 04:00)."); return; }
    setActionLoading(true); setError("");
    try {
      const wid = localStorage.getItem("workspaceId");
      const res = await apiClient.post(`/org/tasks/${task.id}/focus/start`, { workspaceId: wid });
      if (res.data.success) {
        setActiveTask(task);
        setSession(res.data.data);
        setElapsed(0);
        fetchTasks();
      } else { setError(res.data.error || "Failed to start focus"); }
    } catch (e: any) { setError(e.response?.data?.error || e.message || "Failed to start focus"); }
    finally { setActionLoading(false); }
  };

  const handlePause = async () => {
    if (!activeTask || !session) return;
    setActionLoading(true);
    try {
      const wid = localStorage.getItem("workspaceId");
      await apiClient.post(`/org/tasks/${activeTask.id}/focus/pause`, { workspaceId: wid });
      setSession((s: any) => ({ ...s, status: "Paused" }));
    } catch (e: any) { setError(e.response?.data?.error || "Failed to pause"); }
    finally { setActionLoading(false); }
  };

  const handleResume = async () => {
    if (!activeTask) return;
    if (systemOff) { setError("Cannot resume — system is currently offline (23:00 – 04:00)."); return; }
    setActionLoading(true);
    try {
      const wid = localStorage.getItem("workspaceId");
      await apiClient.post(`/org/tasks/${activeTask.id}/focus/resume`, { workspaceId: wid });
      setSession((s: any) => ({ ...s, status: "Active" }));
    } catch (e: any) { setError(e.response?.data?.error || "Failed to resume"); }
    finally { setActionLoading(false); }
  };

  const handleStop = async () => {
    if (!activeTask) return;
    setActionLoading(true);
    try {
      const wid = localStorage.getItem("workspaceId");
      await apiClient.post(`/org/tasks/${activeTask.id}/focus/stop`, { workspaceId: wid });
      setActiveTask(null);
      setSession(null);
      setElapsed(0);
      fetchTasks();
    } catch (e: any) { setError(e.response?.data?.error || "Failed to stop session"); }
    finally { setActionLoading(false); }
  };

  const isActive  = session?.status === "Active";
  const isPaused  = session?.status === "Paused";

  return (
    <div className="p-6 lg:p-8 max-w-[800px] mx-auto w-full space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">MEMBER</span>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
            systemOff
              ? "text-rose-500 bg-rose-500/10 border-rose-500/20"
              : "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
          }`}>
            {systemOff ? "⏸ System OFF" : `● System Active — ${timeUntilEnd()} remaining`}
          </span>
        </div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
          <Focus className="w-6 h-6 text-emerald-500" /> Focus
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {systemOff
            ? "Focus sessions are unavailable from 23:00 to 04:00."
            : "Deep work sessions on your assigned tasks — time is tracked server-side."
          }
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          <button onClick={() => setError("")} className="ml-auto text-xs hover:underline">Dismiss</button>
        </div>
      )}

      {/* System-off banner */}
      {systemOff && (
        <PremiumCard className="border-rose-500/20 bg-rose-500/5 text-center py-8">
          <div className="text-3xl mb-3">🌙</div>
          <p className="text-sm font-bold text-foreground">System is offline</p>
          <p className="text-xs text-muted-foreground mt-1">
            Working hours are <strong>04:00 – 23:00</strong>.<br />
            Focus sessions are not available right now.
          </p>
          <p className="text-xs text-muted-foreground mt-3">System restarts automatically at 04:00 AM.</p>
        </PremiumCard>
      )}

      {/* Active session */}
      {activeTask && !systemOff && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <PremiumCard className={`border-2 ${isActive ? "border-emerald-500/30" : "border-amber-500/30"}`}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                  {isActive ? "🔴 Recording" : "⏸ Paused"}
                </p>
                <h2 className="text-lg font-bold text-foreground">{activeTask.title}</h2>
                {activeTask.projectName && (
                  <p className="text-xs text-muted-foreground mt-0.5">📁 {activeTask.projectName}</p>
                )}
                {activeTask.deadline && (
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Due {new Date(activeTask.deadline).toLocaleDateString()}
                  </p>
                )}
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full border shrink-0 ${
                isActive
                  ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
                  : "text-amber-500 bg-amber-500/10 border-amber-500/20"
              }`}>
                {isActive ? "Active" : "Paused"}
              </span>
            </div>

            {/* Timer display */}
            <div className={`text-5xl font-mono font-bold text-center py-6 rounded-xl mb-6 ${
              isActive ? "bg-emerald-500/5 text-emerald-500" : "bg-muted/40 text-muted-foreground"
            }`}>
              {formatDuration(elapsed)}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3 justify-center">
              {isActive ? (
                <button
                  onClick={handlePause} disabled={actionLoading}
                  className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 text-white text-sm font-semibold rounded-xl hover:bg-amber-500/90 disabled:opacity-50 transition-colors"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pause className="w-4 h-4" />} Pause
                </button>
              ) : (
                <button
                  onClick={handleResume} disabled={actionLoading}
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 text-white text-sm font-semibold rounded-xl hover:bg-emerald-500/90 disabled:opacity-50 transition-colors"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} Resume
                </button>
              )}
              <button
                onClick={handleStop} disabled={actionLoading}
                className="flex items-center gap-2 px-6 py-2.5 bg-card border border-border text-sm font-semibold rounded-xl hover:bg-accent disabled:opacity-50 transition-colors"
              >
                <Square className="w-4 h-4" /> End Session
              </button>
            </div>
          </PremiumCard>
        </motion.div>
      )}

      {/* Available tasks for focus */}
      {!systemOff && (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">
            {activeTask ? "Other Available Tasks" : "Start Focus On"}
          </h2>

          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : tasks.filter(t => !activeTask || t.id !== activeTask.id).length === 0 ? (
            <div className="text-center py-12">
              <Target className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {activeTask ? "No other tasks to focus on." : "No tasks available for focus."}
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Assigned and In Progress tasks appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.filter(t => !activeTask || t.id !== activeTask.id).map(task => (
                <PremiumCard key={task.id} className="hover:border-border/80 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground flex-wrap">
                        {task.projectName && <span>📁 {task.projectName}</span>}
                        {task.deadline && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Due {new Date(task.deadline).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColor(task.status)}`}>
                        {task.status}
                      </span>
                      <button
                        onClick={() => handleStart(task)}
                        disabled={actionLoading || !!activeTask}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white text-xs font-semibold rounded-lg hover:bg-emerald-500/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {actionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                        Focus
                      </button>
                    </div>
                  </div>
                </PremiumCard>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Working hours reminder */}
      {!systemOff && (
        <div className="flex items-center gap-3 p-3.5 bg-muted/30 rounded-xl border border-border text-xs text-muted-foreground">
          <Activity className="w-4 h-4 shrink-0" />
          <span>Focus sessions are tracked server-side. System automatically pauses sessions at <strong>23:00</strong> and allows work from <strong>04:00</strong>.</span>
        </div>
      )}
    </div>
  );
}
