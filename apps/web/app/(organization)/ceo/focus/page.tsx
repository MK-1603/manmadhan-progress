"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Focus as FocusIcon, 
  Play, 
  Pause, 
  Square, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Loader2, 
  X,
  ChevronRight
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { useAuth } from "@/components/auth/auth-context";
import { useRegisterRefresh } from "@/components/providers/global-refresh-provider";
import { TaskSelectorModal } from "@/components/organization/ceo-focus/task-selector-modal";
import { EndFocusModal } from "@/components/organization/ceo-focus/end-focus-modal";
import { HistoryDrawer } from "@/components/organization/ceo-focus/history-drawer";
import { StatsDrawer } from "@/components/organization/ceo-focus/stats-drawer";

function formatDigitalTimer(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatShortDuration(seconds: number) {
  if (!seconds || seconds <= 0) return "0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function CEOFocusPage() {
  const { user } = useAuth();
  
  // Core State
  const [activeSession, setActiveSession] = useState<any>(null);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [elapsed, setElapsed] = useState(0);
  const [overview, setOverview] = useState<any>(null);
  const [priorities, setPriorities] = useState<any[]>([]);
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [scheduleStatus, setScheduleStatus] = useState<any>(null);
  const [weeklyData, setWeeklyData] = useState<any>(null);
  const [weekOffset, setWeekOffset] = useState(0);

  // Modals & Drawers State
  const [showTaskSelector, setShowTaskSelector] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [pauseReason, setPauseReason] = useState("");
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [showStatsDrawer, setShowStatsDrawer] = useState(false);

  // Loading & Error States
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState("");
  const [error, setError] = useState("");

  const timerRef = useRef<any>(null);

  // Derive Batch ID
  const batchId = useMemo(() => {
    return user?.batchNumber || "MM1107";
  }, [user?.batchNumber]);

  // Fetch Focus Workspace Data
  const loadWorkspaceData = useCallback(async () => {
    try {
      const workspaceId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : null;
      const wsParam = workspaceId ? `?workspaceId=${workspaceId}` : "";
      const wsParamAnd = workspaceId ? `&workspaceId=${workspaceId}` : "";

      const [activeRes, overviewRes, prioritiesRes, historyRes, scheduleRes, weeklyRes] = await Promise.all([
        apiClient.get(`/org/focus/active${wsParam}`).catch(() => null),
        apiClient.get(`/org/focus/overview${wsParam}`).catch(() => null),
        apiClient.get(`/org/focus/priorities${wsParam}`).catch(() => null),
        apiClient.get(`/org/focus/history?limit=20${wsParamAnd}`).catch(() => null),
        apiClient.get(`/org/working-hours/status`).catch(() => null),
        apiClient.get(`/org/focus/weekly?weekOffset=${weekOffset}${wsParamAnd}`).catch(() => null),
      ]);

      if (activeRes?.data?.success) {
        const session = activeRes.data.data;
        setActiveSession(session);
        if (session && session.status === "Active") {
          const startTime = session.resumedAt || session.startTime;
          const initialElapsed = (session.durationSeconds || 0) + Math.max(0, Math.floor((Date.now() - new Date(startTime).getTime()) / 1000));
          setElapsed(initialElapsed);
          if (session.task) setSelectedTask(session.task);
        } else if (session && session.status === "Paused") {
          setElapsed(session.durationSeconds || 0);
          if (session.task) setSelectedTask(session.task);
        } else {
          setElapsed(0);
        }
      }

      if (overviewRes?.data?.success) setOverview(overviewRes.data.data);
      if (prioritiesRes?.data?.success) {
        const taskList = prioritiesRes.data.data.tasks || [];
        setPriorities(prioritiesRes.data.data.priorities || []);
        setAllTasks(taskList);
        setAllProjects(prioritiesRes.data.data.projects || []);

        if (!selectedTask && !activeSession && taskList.length > 0) {
          setSelectedTask(taskList[0]);
        }
      }
      if (historyRes?.data?.success) setHistory(historyRes.data.data || []);
      if (scheduleRes?.data?.success) setScheduleStatus(scheduleRes.data.data);
      if (weeklyRes?.data?.success) setWeeklyData(weeklyRes.data.data);
    } catch {
      setError("Failed to load organization focus workspace data");
    } finally {
      setLoading(false);
    }
  }, [selectedTask, activeSession, weekOffset]);

  useEffect(() => {
    loadWorkspaceData();
  }, [loadWorkspaceData]);

  // Register with Global Pull-to-Refresh
  useRegisterRefresh(loadWorkspaceData);

  // Precision Timestamp-Driven Timer Engine
  useEffect(() => {
    if (activeSession?.status === "Active") {
      const updatePrecisionElapsed = () => {
        const startTime = activeSession.resumedAt || activeSession.startTime;
        if (startTime) {
          const activeMs = Date.now() - new Date(startTime).getTime();
          const currentSegment = Math.max(0, Math.floor(activeMs / 1000));
          setElapsed((activeSession.durationSeconds || 0) + currentSegment);
        }
      };

      updatePrecisionElapsed();
      timerRef.current = setInterval(updatePrecisionElapsed, 1000);
    } else if (activeSession?.status === "Paused") {
      setElapsed(activeSession.durationSeconds || 0);
      clearInterval(timerRef.current);
    } else {
      setElapsed(0);
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [activeSession]);

  // Start Focus Session
  const handleStartFocus = async (taskToStart?: any) => {
    const targetTask = taskToStart || selectedTask;
    const workspaceId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : null;

    setActionLoading(true);
    setError("");
    try {
      const res = await apiClient.post("/org/focus/start", {
        workspaceId,
        sourceType: "TASK",
        taskId: targetTask?.id,
        projectId: targetTask?.projectId,
        title: targetTask?.title || "Executive Focus",
        description: targetTask?.description,
        priority: targetTask?.priority || "High",
      });

      if (res.data?.success) {
        setActionSuccess("✓ Focus session started.");
        setTimeout(() => setActionSuccess(""), 4000);
        await loadWorkspaceData();
      } else {
        setError(res.data?.error || "Failed to start focus session.");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to start focus session.");
    } finally {
      setActionLoading(false);
    }
  };

  // Pause Focus Session
  const handlePauseFocus = async () => {
    if (!activeSession) return;
    const workspaceId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : null;
    setActionLoading(true);
    try {
      const res = await apiClient.post("/org/focus/pause", { workspaceId, reason: pauseReason });
      if (res.data?.success) {
        setActiveSession({ ...activeSession, status: "Paused" });
        setShowPauseModal(false);
        setPauseReason("");
        setActionSuccess("✓ Focus session paused.");
        setTimeout(() => setActionSuccess(""), 4000);
      } else {
        setError(res.data?.error || "Failed to pause session.");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to pause session.");
    } finally {
      setActionLoading(false);
    }
  };

  // Resume Focus Session
  const handleResumeFocus = async () => {
    if (!activeSession) return;
    const workspaceId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : null;
    setActionLoading(true);
    try {
      const res = await apiClient.post("/org/focus/resume", { workspaceId });
      if (res.data?.success) {
        setActiveSession({ ...activeSession, status: "Active" });
        setActionSuccess("✓ Focus session resumed.");
        setTimeout(() => setActionSuccess(""), 4000);
      } else {
        setError(res.data?.error || "Failed to resume session.");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to resume session.");
    } finally {
      setActionLoading(false);
    }
  };

  // Finish Focus Session Workflow
  const handleFinishFocus = async (endData: any) => {
    if (!activeSession) return;
    const workspaceId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : null;
    setActionLoading(true);
    try {
      const res = await apiClient.post("/org/focus/end", {
        workspaceId,
        ...endData,
      });
      if (res.data?.success) {
        setActiveSession(null);
        setElapsed(0);
        setShowEndModal(false);
        setActionSuccess("✓ Focus session completed and recorded.");
        setTimeout(() => setActionSuccess(""), 4000);
        await loadWorkspaceData();
      } else {
        setError(res.data?.error || "Failed to finish session.");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to finish session.");
    } finally {
      setActionLoading(false);
    }
  };

  // Create Follow-Up Task
  const handleCreateFollowUpTask = async (taskData: any) => {
    const workspaceId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : null;
    const res = await apiClient.post("/org/focus/follow-up-task", {
      workspaceId,
      ...taskData,
    });
    if (res.data?.success) {
      await loadWorkspaceData();
      return res.data.data;
    }
    throw new Error(res.data?.error || "Failed to create follow-up task.");
  };

  if (loading) {
    return (
      <div className="h-full w-full min-h-[400px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#C9A52A]" />
      </div>
    );
  }

  const isOperational = scheduleStatus?.isOperational ?? true;
  const activeStatusText = activeSession?.status === "Active" ? "FOCUSING" : activeSession?.status === "Paused" ? "PAUSED" : "READY";
  const currentProject = allProjects.find((p) => p.id === selectedTask?.projectId) || activeSession?.project;

  // Reusable Focus Console Inner Layout
  const consoleContent = (
    <>
      {/* 1. HEADER & CONTEXT */}
      <div className="flex items-center justify-between gap-3 border-b border-border pb-2.5">
        <div className="space-y-0.5">
          <h1 className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight">
            FOCUS
          </h1>
          <p className="text-[11px] sm:text-xs text-muted-foreground font-medium">
            Deep work execution · {batchId} · Organization Workspace
          </p>
        </div>

        {/* Working Hours Status Indicator */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-mono font-bold text-muted-foreground flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isOperational ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
            <span>{isOperational ? "AVAILABLE" : "UNAVAILABLE (23:00–04:00 IST)"}</span>
          </span>

          <button
            type="button"
            onClick={loadWorkspaceData}
            className="p-1 rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> {actionSuccess}
        </div>
      )}
      {error && (
        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {error}
          </div>
          <button type="button" onClick={() => setError("")} className="text-rose-500 hover:text-foreground cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. CURRENT TASK CONTAINER */}
      <div className="p-3 rounded-xl border border-border bg-card flex flex-col space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono font-bold uppercase text-muted-foreground tracking-wider">
            CURRENT TASK
          </span>
          <button
            type="button"
            onClick={() => setShowTaskSelector(true)}
            className="text-[11px] font-extrabold text-[#C9A52A] hover:underline cursor-pointer"
          >
            {selectedTask ? "Change →" : "Select Task"}
          </button>
        </div>

        {selectedTask || activeSession ? (
          <div className="space-y-0.5">
            <span className="text-[10.5px] font-mono font-bold text-[#C9A52A] uppercase block truncate">
              {currentProject?.name || "ORGANIZATION WORK"}
            </span>
            <p className="text-xs font-extrabold text-foreground truncate">
              {selectedTask?.title || activeSession?.title || "Executive Focus Task"}
            </p>
            <p className="text-[11px] text-muted-foreground line-clamp-1">
              {selectedTask?.description || "Milestone execution focus session"}
            </p>
          </div>
        ) : (
          <div className="py-2 text-center space-y-1">
            <p className="text-xs font-bold text-foreground">No task selected</p>
            <p className="text-[11px] text-muted-foreground">Select an assigned task to begin a focused session.</p>
          </div>
        )}
      </div>

      {/* 3. HERO TIMER CENTERPIECE */}
      <div className="flex flex-col items-center justify-center text-center py-4 my-auto space-y-2">
        <div className="text-5xl sm:text-6xl md:text-7xl font-extrabold font-mono text-foreground tracking-tight tabular-nums select-all">
          {formatDigitalTimer(elapsed)}
        </div>

        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${
            activeStatusText === "FOCUSING" ? "bg-[#C9A52A] animate-ping" : activeStatusText === "PAUSED" ? "bg-amber-500" : "bg-muted-foreground"
          }`} />
          <span className="text-xs font-mono font-extrabold tracking-wider uppercase text-muted-foreground">
            {activeStatusText === "FOCUSING" ? "IN FOCUS" : activeStatusText === "PAUSED" ? "PAUSED" : "READY"}
          </span>
        </div>
      </div>

      {/* 4. PRIMARY CONTROLS */}
      <div className="w-full flex items-center justify-center gap-2">
        {activeStatusText === "READY" && (
          <button
            type="button"
            onClick={() => handleStartFocus()}
            disabled={actionLoading || !isOperational}
            className="w-full max-w-sm h-[44px] rounded-xl bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-xs font-extrabold hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
          >
            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
            <span>Start Focus</span>
          </button>
        )}

        {activeStatusText === "FOCUSING" && (
          <div className="w-full max-w-sm flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPauseModal(true)}
              disabled={actionLoading}
              className="flex-1 h-[44px] rounded-xl bg-muted/60 text-foreground border border-border hover:bg-muted text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Pause className="w-3.5 h-3.5" /> Pause
            </button>

            <button
              type="button"
              onClick={() => setShowEndModal(true)}
              disabled={actionLoading}
              className="flex-1 h-[44px] rounded-xl bg-emerald-600 dark:bg-emerald-500 text-white hover:bg-emerald-700 text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> End session
            </button>
          </div>
        )}

        {activeStatusText === "PAUSED" && (
          <div className="w-full max-w-sm flex items-center gap-2">
            <button
              type="button"
              onClick={handleResumeFocus}
              disabled={actionLoading || !isOperational}
              className="flex-1 h-[44px] rounded-xl bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-xs font-extrabold hover:opacity-90 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Play className="w-3.5 h-3.5 fill-current" /> Resume
            </button>

            <button
              type="button"
              onClick={() => setShowEndModal(true)}
              disabled={actionLoading}
              className="flex-1 h-[44px] rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20 text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Square className="w-3.5 h-3.5" /> End session
            </button>
          </div>
        )}
      </div>

      {/* 5. TODAY'S COMPACT METRICS */}
      <div className="grid grid-cols-3 gap-2 p-3 rounded-xl border border-border bg-card text-center">
        <div>
          <span className="text-[9.5px] font-mono text-muted-foreground uppercase font-bold block">Focus Time</span>
          <span className="text-xs font-extrabold font-mono text-[#C9A52A] mt-0.5 block">
            {formatShortDuration(overview?.totalFocusedSeconds || 0)}
          </span>
        </div>
        <div>
          <span className="text-[9.5px] font-mono text-muted-foreground uppercase font-bold block">Sessions</span>
          <span className="text-xs font-extrabold font-mono text-foreground mt-0.5 block">
            {overview?.totalSessionsCount || 0}
          </span>
        </div>
        <div>
          <span className="text-[9.5px] font-mono text-muted-foreground uppercase font-bold block">Tasks Done</span>
          <span className="text-xs font-extrabold font-mono text-emerald-500 mt-0.5 block">
            {overview?.completedCount || 0}
          </span>
        </div>
      </div>

      {/* 6. TODAY'S SESSIONS (COMPACT) */}
      <div className="space-y-1">
        <div className="flex items-center justify-between px-1">
          <span className="text-[9.5px] font-mono font-bold uppercase text-muted-foreground tracking-wider">
            TODAY&apos;S SESSIONS
          </span>
          <button
            type="button"
            onClick={() => setShowHistoryDrawer(true)}
            className="text-[11px] font-extrabold text-[#C9A52A] hover:underline cursor-pointer"
          >
            History →
          </button>
        </div>

        {history.length > 0 ? (
          <div className="space-y-1">
            {history.slice(0, 2).map((item, idx) => (
              <div
                key={idx}
                className="p-2 rounded-lg border border-border bg-card flex items-center justify-between text-xs font-mono"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-muted-foreground text-[10.5px] shrink-0">
                    {new Date(item.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="font-bold text-foreground truncate">
                    {item.displayTitle}
                  </span>
                </div>
                <span className="text-[#C9A52A] font-extrabold shrink-0 ml-2">
                  {formatShortDuration(item.durationSeconds)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-2.5 rounded-lg border border-border bg-card text-center text-[11px] text-muted-foreground">
            No focus sessions recorded today.
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="w-full min-h-full bg-[#F8F9FB] dark:bg-[#0B0E12] text-foreground select-none">
      
      {/* MOBILE SHELL: STRICT 100DVH NON-SCROLLABLE CONTAINER */}
      <div className="md:hidden h-[100dvh] w-full max-w-md mx-auto flex flex-col justify-between p-3.5 overflow-hidden pb-[calc(76px+env(safe-area-inset-bottom))]">
        {consoleContent}
      </div>

      {/* DESKTOP CONSOLE: ELEGANT CENTERED WORKSPACE */}
      <div className="hidden md:flex flex-col max-w-[720px] w-full mx-auto py-8 px-4 space-y-5 justify-center min-h-[calc(100vh-80px)]">
        {consoleContent}
      </div>

      {/* TASK SELECTOR MODAL */}
      <TaskSelectorModal
        isOpen={showTaskSelector}
        onClose={() => setShowTaskSelector(false)}
        tasks={allTasks}
        projects={allProjects}
        onSelectTask={(task) => {
          setSelectedTask(task);
        }}
      />

      {/* PAUSE MODAL */}
      {showPauseModal && (
        <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider">
                Pause Focus Session
              </h3>
              <button type="button" onClick={() => setShowPauseModal(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-muted-foreground">
                Select an optional reason for pausing your active focus session:
              </p>

              <div className="grid grid-cols-2 gap-2">
                {["Break", "Blocked", "Meeting", "Other"].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setPauseReason(reason)}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                      pauseReason === reason
                        ? "bg-[#C9A52A]/20 text-[#C9A52A] border-[#C9A52A]/40"
                        : "bg-muted text-muted-foreground border-border hover:text-foreground"
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setShowPauseModal(false)}
                className="px-4 py-1.5 rounded-lg bg-muted border border-border text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePauseFocus}
                className="px-4 py-1.5 rounded-lg bg-[#C9A52A] text-[#0B0D10] text-xs font-bold hover:opacity-90 cursor-pointer"
              >
                Confirm Pause
              </button>
            </div>
          </div>
        </div>
      )}

      {/* END / FINISH FOCUS MODAL */}
      {showEndModal && (
        <EndFocusModal
          isOpen={showEndModal}
          onClose={() => setShowEndModal(false)}
          session={activeSession}
          elapsedSeconds={elapsed}
          projects={allProjects}
          onEndSession={handleFinishFocus}
          onCreateFollowUpTask={handleCreateFollowUpTask}
        />
      )}

      {/* HISTORY & STATS DRAWERS */}
      <HistoryDrawer
        isOpen={showHistoryDrawer}
        onClose={() => setShowHistoryDrawer(false)}
        history={history}
        onSelectSession={() => {}}
      />

      <StatsDrawer
        isOpen={showStatsDrawer}
        onClose={() => setShowStatsDrawer(false)}
        overview={overview}
        weeklyData={weeklyData}
        weekOffset={weekOffset}
        onChangeWeekOffset={setWeekOffset}
      />
    </div>
  );
}
