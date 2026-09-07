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
  UserCheck,
  Target,
  FolderKanban,
  Flag,
  BarChart3,
  PieChart,
  MoreVertical,
  Quote,
  Sparkles
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
    return user?.batchNumber || "MK1603";
  }, [user?.batchNumber]);

  // Current Date String Formatted
  const currentDateStr = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }, []);

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

  // Window Event Listener for Automatic Resynchronization on Foreground & Reconnect
  useEffect(() => {
    const handleResync = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        loadWorkspaceData(true);
      }
    };

    window.addEventListener("visibilitychange", handleResync);
    window.addEventListener("focus", handleResync);
    window.addEventListener("pageshow", handleResync);
    window.addEventListener("online", handleResync);

    return () => {
      window.removeEventListener("visibilitychange", handleResync);
      window.removeEventListener("focus", handleResync);
      window.removeEventListener("pageshow", handleResync);
      window.removeEventListener("online", handleResync);
    };
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
      <div className="h-full w-full min-h-[400px] flex items-center justify-center bg-[#0A0C10]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-[#D4B12F]" />
          <span className="text-xs font-mono text-[#8A92A6] uppercase tracking-wider">
            Loading Focus Workspace...
          </span>
        </div>
      </div>
    );
  }

  const isOperational = scheduleStatus?.isOperational ?? true;
  const activeStatusText = activeSession?.status === "Active" ? "FOCUSING" : activeSession?.status === "Paused" ? "PAUSED" : "READY";
  const currentProject = allProjects.find((p) => p.id === selectedTask?.projectId) || activeSession?.project;

  // SVG Circular Progress Ring Calculation
  const circleRadius = 85;
  const circumference = 2 * Math.PI * circleRadius; // ~534.07
  const targetDurationSeconds = activeSession?.estimatedDuration ? activeSession.estimatedDuration * 60 : 3600;
  const progressRatio = Math.min(1, Math.max(0, (elapsed % targetDurationSeconds) / targetDurationSeconds));
  const strokeDashoffset = circumference * (1 - progressRatio);

  // Position of indicator dot on circle
  const angleRad = (progressRatio * 360 - 90) * (Math.PI / 180);
  const dotX = 110 + circleRadius * Math.cos(angleRad);
  const dotY = 110 + circleRadius * Math.sin(angleRad);

  return (
    <div className="w-full min-h-full bg-[#0A0C10] text-[#FFFFFF] select-none overflow-x-hidden">
      <div className="max-w-[1280px] w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 pb-[calc(100px+env(safe-area-inset-bottom,0px))] md:pb-10">
        
        {/* 1. FOCUS HEADER */}
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-[#1E2330]">
          <div className="space-y-1">
            <p className="text-xs font-mono text-[#8A92A6]">
              Organization Workspace <span className="text-[#D4B12F]">· {batchId}</span> · CO-CEO
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Focus
            </h1>
            <p className="text-xs text-[#8A92A6]">
              Deep work execution for meaningful progress.
            </p>
          </div>

          {/* Header Status Controls */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#8A92A6] font-mono bg-[#13161F] px-3 py-1.5 rounded-lg border border-[#212634]">
              <Calendar className="w-3.5 h-3.5 text-[#8A92A6]" />
              <span>{currentDateStr}</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#13161F] border border-[#212634]">
              <span className={`w-2 h-2 rounded-full ${isOperational ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
              <span className="text-[11px] font-mono font-semibold text-white">
                {isOperational ? "AVAILABLE" : "UNAVAILABLE"}
              </span>
            </div>

            <button
              type="button"
              onClick={() => loadWorkspaceData(true)}
              disabled={isRefreshing}
              className="p-2 rounded-lg bg-[#13161F] border border-[#212634] text-[#8A92A6] hover:text-white transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh Focus Workspace"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#D4B12F]" : ""}`} />
            </button>
          </div>
        </div>

        {/* Notifications */}
        {actionSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> {actionSuccess}
          </div>
        )}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
            </div>
            <button type="button" onClick={() => setError("")} className="text-rose-400 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 2. PRIMARY EXECUTION WORKSPACE (3-COLUMN TOP GRID ON DESKTOP) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* COLUMN 1: CURRENT WORK PANEL (4 COLS) */}
          <div className="lg:col-span-4 p-5 rounded-2xl border border-[#212634] bg-[#12151D] shadow-xl flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-[#1E2330] pb-2.5">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#8A92A6] flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-[#D4B12F]" />
                  CURRENT WORK
                </span>
                <button
                  type="button"
                  onClick={() => setShowTaskSelector(true)}
                  className="text-xs font-semibold text-[#D4B12F] hover:underline cursor-pointer flex items-center gap-1"
                >
                  <span>{selectedTask ? "Change Task →" : "Select Task →"}</span>
                </button>
              </div>

              {selectedTask || activeSession ? (
                <div className="space-y-3 pt-1">
                  <div className="space-y-1">
                    <h2 className="text-lg sm:text-xl font-bold text-white leading-snug line-clamp-2">
                      {selectedTask?.title || activeSession?.title || "Focus Execution Task"}
                    </h2>
                    <p className="text-xs text-[#8A92A6] line-clamp-2">
                      {selectedTask?.description || "Connect third-party APIs for data sync & workflow automation."}
                    </p>
                  </div>

                  {/* Project & Status Badges */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#1C212D] text-[11px] font-mono text-[#8A92A6]">
                      <FolderKanban className="w-3.5 h-3.5 text-[#D4B12F]" />
                      <span className="font-medium text-white truncate max-w-[130px]">
                        {currentProject?.name || "Platform Development"}
                      </span>
                    </div>

                    <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase bg-blue-500/15 text-blue-400 border border-blue-500/30">
                      {selectedTask?.status || "In Progress"}
                    </span>
                  </div>

                  {/* Date & Priority Metadata Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-[#8A92A6] font-mono pt-2 border-t border-[#1E2330]">
                    <div>
                      <span className="text-[10px] uppercase text-[#626A7E] block">Due Date</span>
                      <span className="text-white font-medium flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3.5 h-3.5 text-[#8A92A6]" />
                        {selectedTask?.dueDate ? new Date(selectedTask.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Dec 20, 2024"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-[#626A7E] block">Priority</span>
                      <span className="text-amber-400 font-medium flex items-center gap-1 mt-0.5">
                        <Flag className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
                        {selectedTask?.priority || "High"}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center space-y-2 flex flex-col items-center justify-center">
                  <p className="text-xs font-semibold text-white">
                    {allTasks.length === 0 ? "No assigned tasks available for focus." : "No task selected"}
                  </p>
                  <p className="text-xs text-[#8A92A6] max-w-xs">
                    {allTasks.length === 0
                      ? "Check your work queue or request task assignments from your organization CEO."
                      : "Choose an assigned organization task to begin focused execution."}
                  </p>
                </div>
              )}
            </div>

            {/* Assigned to User Footer */}
            <div className="pt-3 border-t border-[#1E2330] flex items-center justify-between text-xs text-emerald-400 font-medium">
              <span className="flex items-center gap-1.5">
                <UserCheck className="w-4 h-4" /> Assigned to you
              </span>
              {!selectedTask && (
                <button
                  type="button"
                  onClick={() => setShowTaskSelector(true)}
                  className="text-xs font-bold text-[#D4B12F] hover:underline"
                >
                  Select Task
                </button>
              )}
            </div>
          </div>

          {/* COLUMN 2: CENTERPIECE CIRCULAR FOCUS TIMER (4 COLS) */}
          <div className="lg:col-span-4 p-6 rounded-2xl border border-[#212634] bg-[#12151D] shadow-xl flex flex-col items-center justify-center text-center space-y-5 relative overflow-hidden">
            
            {/* SVG Circular Progress Ring Container */}
            <div className="relative w-[210px] h-[210px] sm:w-[220px] sm:h-[220px] flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 220 220">
                {/* Background Ring Track */}
                <circle
                  cx="110"
                  cy="110"
                  r={circleRadius}
                  stroke="#1C212E"
                  strokeWidth="8"
                  fill="none"
                />
                {/* Active Progress Arc */}
                <circle
                  cx="110"
                  cy="110"
                  r={circleRadius}
                  stroke="#D4B12F"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-1000 ease-linear"
                />
                {/* Glowing Gold Progress Indicator Dot */}
                {activeStatusText === "FOCUSING" && (
                  <circle
                    cx={dotX}
                    cy={dotY}
                    r="6.5"
                    fill="#D4B12F"
                    className="drop-shadow-[0_0_8px_rgba(212,177,47,0.9)] transition-all duration-1000 ease-linear"
                  />
                )}
              </svg>

              {/* Inside Ring Centered Content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center space-y-1 p-2">
                <Target className="w-5 h-5 text-[#D4B12F] stroke-[2.2]" />
                
                <span className="text-[10px] font-mono font-extrabold tracking-widest uppercase text-[#D4B12F]">
                  {activeStatusText}
                </span>

                <div className="text-4xl sm:text-5xl font-bold font-mono text-white tracking-tight tabular-nums select-all">
                  {formatDigitalTimer(elapsed)}
                </div>

                <span className="text-[11px] text-[#8A92A6] font-medium">
                  {activeStatusText === "FOCUSING" ? "Stay focused. Keep going." : activeStatusText === "PAUSED" ? "Session paused." : "Ready to execute."}
                </span>
              </div>
            </div>

            {/* DUAL ACTION BUTTONS BAR */}
            <div className="w-full max-w-xs pt-1 flex items-center justify-center gap-3">
              {activeStatusText === "READY" && (
                <button
                  type="button"
                  onClick={() => handleStartFocus()}
                  disabled={actionLoading || !isOperational || !selectedTask}
                  className="w-full h-11 rounded-xl bg-[#D4B12F] text-black font-bold text-xs hover:brightness-105 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-40"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                  <span>Start Focus</span>
                </button>
              )}

              {activeStatusText === "FOCUSING" && (
                <div className="w-full flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowPauseModal(true)}
                    disabled={actionLoading}
                    className="flex-1 h-11 rounded-xl bg-[#1A1F2B] border border-[#D4B12F]/40 text-white text-xs font-semibold hover:bg-[#222836] transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Pause className="w-4 h-4 text-[#D4B12F]" />
                    <span>Pause</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEndModal(true)}
                    disabled={actionLoading}
                    className="flex-1 h-11 rounded-xl bg-[#2A171A] border border-rose-500/40 text-rose-400 text-xs font-semibold hover:bg-[#381C20] transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>End Session</span>
                  </button>
                </div>
              )}

              {activeStatusText === "PAUSED" && (
                <div className="w-full flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleResumeFocus}
                    disabled={actionLoading || !isOperational}
                    className="flex-1 h-11 rounded-xl bg-[#D4B12F] text-black text-xs font-bold hover:brightness-105 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Resume</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEndModal(true)}
                    disabled={actionLoading}
                    className="flex-1 h-11 rounded-xl bg-[#2A171A] border border-rose-500/40 text-rose-400 text-xs font-semibold hover:bg-[#381C20] transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>End</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* COLUMN 3: TODAY'S PROGRESS PANEL (4 COLS) */}
          <div className="lg:col-span-4 p-5 rounded-2xl border border-[#212634] bg-[#12151D] shadow-xl flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-[#1E2330] pb-2.5">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#8A92A6] flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-[#D4B12F]" />
                  TODAY'S PROGRESS
                </span>
              </div>

              {/* Stack of 3 Metric Items */}
              <div className="space-y-2.5 pt-1">
                {/* 1. Focus Time Metric */}
                <div className="p-3 rounded-xl bg-[#181D28] border border-[#232938] flex items-center gap-3.5">
                  <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400 shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xl sm:text-2xl font-bold font-mono text-white block leading-tight">
                      {formatShortDuration(overview?.totalFocusedSeconds || 0)}
                    </span>
                    <span className="text-[10px] font-mono text-[#8A92A6] uppercase block mt-0.5">
                      Focus Time
                    </span>
                  </div>
                </div>

                {/* 2. Sessions Metric */}
                <div className="p-3 rounded-xl bg-[#181D28] border border-[#232938] flex items-center gap-3.5">
                  <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
                    <PieChart className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xl sm:text-2xl font-bold font-mono text-white block leading-tight">
                      {overview?.totalSessionsCount || 0}
                    </span>
                    <span className="text-[10px] font-mono text-[#8A92A6] uppercase block mt-0.5">
                      Sessions
                    </span>
                  </div>
                </div>

                {/* 3. Tasks Done Metric */}
                <div className="p-3 rounded-xl bg-[#181D28] border border-[#232938] flex items-center gap-3.5">
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xl sm:text-2xl font-bold font-mono text-white block leading-tight">
                      {overview?.completedCount || 0}
                    </span>
                    <span className="text-[10px] font-mono text-[#8A92A6] uppercase block mt-0.5">
                      Tasks Done
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* View History Link Footer */}
            <div className="pt-3 border-t border-[#1E2330] flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowHistoryDrawer(true)}
                className="text-xs font-bold text-[#D4B12F] hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>View history →</span>
              </button>
            </div>
          </div>

        </div>

        {/* 3. RECENT SESSIONS DATA TABLE PANEL */}
        <div className="p-5 rounded-2xl border border-[#212634] bg-[#12151D] shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#1E2330] pb-3">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#8A92A6] flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#D4B12F]" />
              RECENT SESSIONS
            </span>
            <button
              type="button"
              onClick={() => setShowHistoryDrawer(true)}
              className="text-xs font-bold text-[#D4B12F] hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>View all →</span>
            </button>
          </div>

          {history.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="border-b border-[#1E2330] text-[#626A7E] text-[10px] uppercase font-semibold">
                    <th className="py-2.5 px-3">Task</th>
                    <th className="py-2.5 px-3">Project</th>
                    <th className="py-2.5 px-3">Duration</th>
                    <th className="py-2.5 px-3">Started At</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E2330]">
                  {history.slice(0, 5).map((item, idx) => (
                    <tr key={idx} className="hover:bg-[#181D28] transition-colors">
                      <td className="py-3 px-3 font-semibold text-white truncate max-w-[200px]">
                        {item.displayTitle}
                      </td>
                      <td className="py-3 px-3 text-[#8A92A6]">
                        {item.projectName || "Platform Development"}
                      </td>
                      <td className="py-3 px-3 font-bold text-[#D4B12F]">
                        {formatShortDuration(item.durationSeconds)}
                      </td>
                      <td className="py-3 px-3 text-[#8A92A6]">
                        {item.startTime ? new Date(item.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "10:14 AM"}
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          {item.status || "Completed"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button type="button" className="p-1 rounded text-[#8A92A6] hover:text-white cursor-pointer">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-[#8A92A6] space-y-1">
              <p className="font-semibold text-white">No focus sessions recorded today.</p>
              <p className="text-[11px]">Start a focus session to record execution time.</p>
            </div>
          )}
        </div>

        {/* 4. MOTIVATION QUOTE BANNER */}
        <div className="p-5 rounded-2xl border border-[#212634] bg-[#12151D] shadow-xl relative overflow-hidden flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 z-10">
            <Quote className="w-7 h-7 text-[#D4B12F] shrink-0 fill-[#D4B12F]/10 stroke-[1.8]" />
            <div>
              <p className="text-xs sm:text-sm font-semibold text-white tracking-wide italic">
                "Discipline today builds the progress you want tomorrow."
              </p>
              <p className="text-[11px] font-mono text-[#D4B12F] font-bold mt-0.5">
                — ManMadhan
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-[#D4B12F]/30 shrink-0 z-10">
            <Sparkles className="w-6 h-6 animate-pulse" />
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
        <div className="fixed inset-0 z-[10000] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#12151D] border border-[#212634] rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1E2330] pb-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Pause Focus Session
              </h3>
              <button type="button" onClick={() => setShowPauseModal(false)} className="text-[#8A92A6] hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-[#8A92A6]">
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
                        ? "bg-[#D4B12F]/15 text-[#D4B12F] border-[#D4B12F]/40"
                        : "bg-[#181D28] text-[#8A92A6] border-[#232938] hover:text-white"
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1E2330]">
              <button
                type="button"
                onClick={() => setShowPauseModal(false)}
                className="px-4 py-2 rounded-lg bg-[#181D28] border border-[#232938] text-xs font-semibold text-[#8A92A6] hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePauseFocus}
                className="px-4 py-2 rounded-lg bg-[#D4B12F] text-black text-xs font-bold hover:brightness-105 cursor-pointer"
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
