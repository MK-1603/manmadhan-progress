"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Play,
  Pause,
  Square,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Loader2,
  X,
  ChevronRight,
  Clock,
  Briefcase,
  Calendar,
  UserCheck
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { useAuth } from "@/components/auth/auth-context";
import { FocusService } from "@/services/focus-service";
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

export function OrganizationFocusConsole() {
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionSuccess, setActionSuccess] = useState("");
  const [error, setError] = useState("");

  const timerRef = useRef<any>(null);

  // Derive Batch ID
  const batchId = useMemo(() => {
    return user?.batchNumber || "MM1107";
  }, [user?.batchNumber]);

  // Fetch Focus Workspace Data via FocusService
  const loadWorkspaceData = useCallback(async (force = false) => {
    try {
      if (force) setIsRefreshing(true);

      const workspaceId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") || undefined : undefined;

      const [activeData, overviewData, prioritiesData, historyData, scheduleData, weeklyDataRes] = await Promise.all([
        FocusService.getActiveSession(workspaceId, force).catch(() => null),
        FocusService.getOverview(workspaceId, force).catch(() => null),
        FocusService.getPriorities(workspaceId, force).catch(() => null),
        FocusService.getHistory(workspaceId, 20, force).catch(() => null),
        FocusService.getWorkingHoursStatus(workspaceId, force).catch(() => null),
        FocusService.getWeekly(workspaceId, weekOffset, force).catch(() => null),
      ]);

      if (activeData) {
        const session = activeData as any;
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
      } else {
        setActiveSession(null);
      }

      if (overviewData) setOverview(overviewData);
      if (prioritiesData) {
        const prio = prioritiesData as any;
        const taskList = prio.tasks || [];
        setPriorities(prio.priorities || []);
        setAllTasks(taskList);
        setAllProjects(prio.projects || []);

        if (!selectedTask && !activeData && taskList.length > 0) {
          setSelectedTask(taskList[0]);
        }
      }
      if (historyData && Array.isArray(historyData)) setHistory(historyData);
      if (scheduleData) setScheduleStatus(scheduleData);
      if (weeklyDataRes) setWeeklyData(weeklyDataRes);
    } catch {
      setError("Failed to load organization focus workspace data");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedTask, weekOffset]);

  useEffect(() => {
    loadWorkspaceData();
  }, [loadWorkspaceData]);

  // Register with Global Pull-to-Refresh
  useRegisterRefresh(() => loadWorkspaceData(true));

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
        title: targetTask?.title || "Work Execution Focus",
        description: targetTask?.description,
        priority: targetTask?.priority || "High",
      });

      if (res.data?.success) {
        setActionSuccess("✓ Focus session started.");
        setTimeout(() => setActionSuccess(""), 4000);
        await loadWorkspaceData(true);
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
        await loadWorkspaceData(true);
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
      await loadWorkspaceData(true);
      return res.data.data;
    }
    throw new Error(res.data?.error || "Failed to create follow-up task.");
  };

  if (loading) {
    return (
      <div className="h-full w-full min-h-[400px] flex items-center justify-center bg-[#F8F9FA] dark:bg-[#0B0D10]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-[#B28D18] dark:text-[#D4B12F]" />
          <span className="text-xs font-mono text-[#667085] dark:text-[#8B94A3] uppercase tracking-wider">
            Loading Focus Workspace...
          </span>
        </div>
      </div>
    );
  }

  const isOperational = scheduleStatus?.isOperational ?? true;
  const activeStatusText = activeSession?.status === "Active" ? "FOCUSING" : activeSession?.status === "Paused" ? "PAUSED" : "READY";
  const currentProject = allProjects.find((p) => p.id === selectedTask?.projectId) || activeSession?.project;

  return (
    <div className="w-full min-h-full bg-[#F8F9FA] dark:bg-[#0B0D10] text-[#17202A] dark:text-[#F2F3F5] select-none overflow-x-hidden">
      <div className="max-w-[1280px] w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* 1. FOCUS HEADER */}
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB] dark:border-[#24282E]">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#17202A] dark:text-[#F2F3F5]">
              FOCUS
            </h1>
            <p className="text-xs font-mono text-[#667085] dark:text-[#8B94A3]">
              Deep work execution <span className="text-[#B28D18] dark:text-[#D4B12F] font-semibold">· {batchId}</span> · Organization Workspace
            </p>
          </div>

          {/* Real Working Hours Status Indicator */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFFFFF] dark:bg-[#15181D] border border-[#E5E7EB] dark:border-[#24282E] shadow-xs">
              <span className={`w-2 h-2 rounded-full ${isOperational ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
              <span className="text-[11px] font-mono font-semibold text-[#17202A] dark:text-[#F2F3F5]">
                {isOperational ? "AVAILABLE" : "UNAVAILABLE"}
              </span>
            </div>

            <button
              type="button"
              onClick={() => loadWorkspaceData(true)}
              disabled={isRefreshing}
              className="p-2 rounded-lg bg-[#FFFFFF] dark:bg-[#15181D] border border-[#E5E7EB] dark:border-[#24282E] text-[#667085] dark:text-[#8B94A3] hover:text-[#17202A] dark:hover:text-[#F2F3F5] transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh Focus Workspace"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#B28D18] dark:text-[#D4B12F]" : ""}`} />
            </button>
          </div>
        </div>

        {/* Notifications */}
        {actionSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> {actionSuccess}
          </div>
        )}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs font-medium flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
            </div>
            <button type="button" onClick={() => setError("")} className="text-rose-500 hover:text-foreground cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 2. PRIMARY EXECUTION WORKSPACE (2-COLUMN DESKTOP / STACKED MOBILE) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT / PRIMARY EXECUTION AREA (65%) */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-6">
            
            {/* CURRENT ASSIGNMENT PANEL */}
            <div className="p-5 rounded-xl border border-[#E5E7EB] dark:border-[#24282E] bg-[#FFFFFF] dark:bg-[#15181D] shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#667085] dark:text-[#8B94A3]">
                  CURRENT ASSIGNMENT
                </span>
                <button
                  type="button"
                  onClick={() => setShowTaskSelector(true)}
                  className="text-xs font-semibold text-[#B28D18] dark:text-[#D4B12F] hover:underline cursor-pointer flex items-center gap-1"
                >
                  <span>{selectedTask ? "Change Task →" : "Select Task →"}</span>
                </button>
              </div>

              {selectedTask || activeSession ? (
                <div className="space-y-2">
                  <h2 className="text-base sm:text-lg font-bold text-[#17202A] dark:text-[#F2F3F5] line-clamp-1">
                    {selectedTask?.title || activeSession?.title || "Focus Execution Task"}
                  </h2>
                  <p className="text-xs font-mono text-[#B28D18] dark:text-[#D4B12F] font-semibold">
                    {currentProject?.name || "Organization Workspace"} · {selectedTask?.category || "Task Execution"}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-[#667085] dark:text-[#8B94A3] pt-1">
                    {selectedTask?.dueDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> Due {new Date(selectedTask.dueDate).toLocaleDateString()}
                      </span>
                    )}
                    {selectedTask?.priority && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#F3F4F6] dark:bg-[#20252C] uppercase">
                        {selectedTask.priority} Priority
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                      <UserCheck className="w-3.5 h-3.5" /> Assigned to you
                    </span>
                  </div>
                </div>
              ) : (
                <div className="py-4 text-center space-y-1.5 min-h-[90px] flex flex-col items-center justify-center">
                  <p className="text-xs font-semibold text-[#17202A] dark:text-[#F2F3F5]">No task selected</p>
                  <p className="text-xs text-[#667085] dark:text-[#8B94A3]">Choose an assigned organization task to begin focused execution.</p>
                </div>
              )}
            </div>

            {/* TIMER & PRIMARY CONTROLS PANEL */}
            <div className="flex flex-col items-center justify-center text-center p-8 bg-[#FFFFFF] dark:bg-[#15181D] rounded-xl border border-[#E5E7EB] dark:border-[#24282E] shadow-xs space-y-4">
              <div className="text-7xl sm:text-8xl font-bold font-mono text-[#17202A] dark:text-[#F2F3F5] tracking-tight tabular-nums select-all">
                {formatDigitalTimer(elapsed)}
              </div>

              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${
                  activeStatusText === "FOCUSING" ? "bg-[#B28D18] dark:bg-[#D4B12F] animate-pulse" : activeStatusText === "PAUSED" ? "bg-amber-500" : "bg-[#9AA2AF]"
                }`} />
                <span className="text-xs font-mono font-bold tracking-widest uppercase text-[#667085] dark:text-[#8B94A3]">
                  {activeStatusText === "FOCUSING" ? "FOCUSING" : activeStatusText === "PAUSED" ? "PAUSED" : "READY"}
                </span>
              </div>

              {/* PRIMARY CONTROLS */}
              <div className="w-full max-w-md pt-2 flex items-center justify-center gap-3">
                {activeStatusText === "READY" && (
                  <button
                    type="button"
                    onClick={() => handleStartFocus()}
                    disabled={actionLoading || !isOperational || !selectedTask}
                    className="w-full h-12 rounded-xl bg-[#B28D18] dark:bg-[#D4B12F] text-black font-semibold text-sm hover:brightness-105 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-40"
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                    <span>▶ Start Focus</span>
                  </button>
                )}

                {activeStatusText === "FOCUSING" && (
                  <div className="w-full flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowPauseModal(true)}
                      disabled={actionLoading}
                      className="flex-1 h-12 rounded-xl bg-[#F3F4F6] dark:bg-[#20252C] text-[#17202A] dark:text-[#F2F3F5] border border-[#E5E7EB] dark:border-[#24282E] hover:bg-[#E5E7EB] dark:hover:bg-[#2A3038] text-xs font-semibold transition-all cursor-pointer"
                    >
                      Pause
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowEndModal(true)}
                      disabled={actionLoading}
                      className="flex-1 h-12 rounded-xl bg-emerald-600 dark:bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-700 transition-all cursor-pointer shadow-xs"
                    >
                      Finish Session
                    </button>
                  </div>
                )}

                {activeStatusText === "PAUSED" && (
                  <div className="w-full flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleResumeFocus}
                      disabled={actionLoading || !isOperational}
                      className="flex-1 h-12 rounded-xl bg-[#B28D18] dark:bg-[#D4B12F] text-black text-xs font-semibold hover:brightness-105 transition-all cursor-pointer"
                    >
                      Resume
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowEndModal(true)}
                      disabled={actionLoading}
                      className="flex-1 h-12 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-semibold transition-all cursor-pointer"
                    >
                      Finish Session
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT / SECONDARY RECENT TIMING AREA (35%) */}
          <div className="lg:col-span-5 xl:col-span-4 p-5 rounded-xl border border-[#E5E7EB] dark:border-[#24282E] bg-[#FFFFFF] dark:bg-[#15181D] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB] dark:border-[#24282E]">
              <div className="space-y-0.5">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#667085] dark:text-[#8B94A3] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#B28D18] dark:text-[#D4B12F]" />
                  RECENT TIMING
                </span>
                <span className="text-[10px] font-mono text-[#667085] dark:text-[#8B94A3] block">TODAY</span>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryDrawer(true)}
                className="text-xs font-semibold text-[#B28D18] dark:text-[#D4B12F] hover:underline cursor-pointer flex items-center gap-0.5"
              >
                <span>View history →</span>
              </button>
            </div>

            {history.length > 0 ? (
              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                {history.slice(0, 6).map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-[#E5E7EB] dark:border-[#24282E] bg-[#F8F9FA] dark:bg-[#1C2027] flex items-center justify-between text-xs font-mono"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-[#667085] dark:text-[#8B94A3] text-[11px] shrink-0 font-medium">
                        {new Date(item.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <span className="font-semibold text-[#17202A] dark:text-[#F2F3F5] truncate">
                        {item.displayTitle}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-[#B28D18] dark:text-[#D4B12F] font-bold">
                        {formatShortDuration(item.durationSeconds)}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#E5E7EB] dark:bg-[#2A3038] text-[#667085] dark:text-[#8B94A3]">
                        {item.status || "Completed"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-[#667085] dark:text-[#8B94A3] space-y-1">
                <p className="font-medium">No focus sessions recorded today.</p>
                <p className="text-[11px]">Start a focus session to record execution time.</p>
              </div>
            )}
          </div>
        </div>

        {/* 3. TODAY'S EXECUTION SUMMARY STRIP */}
        <div className="p-4 rounded-xl border border-[#E5E7EB] dark:border-[#24282E] bg-[#FFFFFF] dark:bg-[#15181D] shadow-xs">
          <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#667085] dark:text-[#8B94A3] mb-3">
            TODAY
          </div>
          <div className="grid grid-cols-3 gap-4 text-center divide-x divide-[#E5E7EB] dark:divide-[#24282E]">
            <div>
              <span className="text-base sm:text-lg font-bold font-mono text-[#B28D18] dark:text-[#D4B12F] block">
                {formatShortDuration(overview?.totalFocusedSeconds || 0)}
              </span>
              <span className="text-[10px] font-mono text-[#667085] dark:text-[#8B94A3] uppercase font-semibold block mt-0.5">
                Focus Time
              </span>
            </div>
            <div>
              <span className="text-base sm:text-lg font-bold font-mono text-[#17202A] dark:text-[#F2F3F5] block">
                {overview?.totalSessionsCount || 0}
              </span>
              <span className="text-[10px] font-mono text-[#667085] dark:text-[#8B94A3] uppercase font-semibold block mt-0.5">
                Sessions
              </span>
            </div>
            <div>
              <span className="text-base sm:text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 block">
                {overview?.completedCount || 0}
              </span>
              <span className="text-[10px] font-mono text-[#667085] dark:text-[#8B94A3] uppercase font-semibold block mt-0.5">
                Tasks Done
              </span>
            </div>
          </div>
        </div>

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
          <div className="bg-[#FFFFFF] dark:bg-[#15181D] border border-[#E5E7EB] dark:border-[#24282E] rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] dark:border-[#24282E] pb-3">
              <h3 className="text-xs font-bold text-[#17202A] dark:text-[#F2F3F5] uppercase tracking-wider">
                Pause Focus Session
              </h3>
              <button type="button" onClick={() => setShowPauseModal(false)} className="text-[#667085] dark:text-[#8B94A3] hover:text-[#17202A] dark:hover:text-[#F2F3F5] cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-[#667085] dark:text-[#8B94A3]">
                Select an optional reason for pausing your active focus session:
              </p>

              <div className="grid grid-cols-2 gap-2">
                {["Break", "Blocked", "Meeting", "Other"].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setPauseReason(reason)}
                    className={`p-3 rounded-xl border text-xs font-semibold transition-all text-center cursor-pointer ${
                      pauseReason === reason
                        ? "bg-[#B28D18]/15 dark:bg-[#D4B12F]/15 text-[#B28D18] dark:text-[#D4B12F] border-[#B28D18]/40 dark:border-[#D4B12F]/40"
                        : "bg-[#F3F4F6] dark:bg-[#20252C] text-[#667085] dark:text-[#8B94A3] border-[#E5E7EB] dark:border-[#24282E] hover:text-[#17202A] dark:hover:text-[#F2F3F5]"
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E7EB] dark:border-[#24282E]">
              <button
                type="button"
                onClick={() => setShowPauseModal(false)}
                className="px-4 py-2 rounded-lg bg-[#F3F4F6] dark:bg-[#20252C] border border-[#E5E7EB] dark:border-[#24282E] text-xs font-semibold text-[#667085] dark:text-[#8B94A3] hover:text-[#17202A] dark:hover:text-[#F2F3F5] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePauseFocus}
                className="px-4 py-2 rounded-lg bg-[#B28D18] dark:bg-[#D4B12F] text-black text-xs font-semibold hover:brightness-105 cursor-pointer"
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
