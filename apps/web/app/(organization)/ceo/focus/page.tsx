"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Focus as FocusIcon,
  Play,
  Pause,
  Square,
  Clock,
  BarChart3,
  CheckSquare,
  AlertCircle,
  Loader2,
  Folder
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { useRegisterRefresh } from "@/components/providers/global-refresh-provider";
import { StartFocusModal } from "@/components/organization/ceo-focus/start-focus-modal";
import { EndFocusModal } from "@/components/organization/ceo-focus/end-focus-modal";
import { SessionDetailModal } from "@/components/organization/ceo-focus/session-detail-modal";
import { TaskDetailDrawer } from "@/components/organization/ceo-focus/task-detail-drawer";
import { HistoryDrawer } from "@/components/organization/ceo-focus/history-drawer";
import { StatsDrawer } from "@/components/organization/ceo-focus/stats-drawer";
import { NextSessionDrawer } from "@/components/organization/ceo-focus/next-session-drawer";

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
  // Core State
  const [activeSession, setActiveSession] = useState<any>(null);
  const [elapsed, setElapsed] = useState(0);
  const [overview, setOverview] = useState<any>(null);
  const [priorities, setPriorities] = useState<any[]>([]);
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [weeklyData, setWeeklyData] = useState<any>(null);
  const [weekOffset, setWeekOffset] = useState(0);

  // Countdown & Timer State Machine
  const [countdown, setCountdown] = useState<number | null>(null);

  // Loading & Error states
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  // Modals & Drawers states
  const [showStartModal, setShowStartModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showNextSessionDrawer, setShowNextSessionDrawer] = useState(false);
  const [selectedHistorySession, setSelectedHistorySession] = useState<any>(null);

  // Slide-over Drawers
  const [showTaskDrawer, setShowTaskDrawer] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [showStatsDrawer, setShowStatsDrawer] = useState(false);

  const timerRef = useRef<any>(null);

  const isWorkingHours = () => {
    const h = new Date().getHours();
    return h >= 4 && h < 23;
  };

  // Fetch focus workspace data
  const loadWorkspaceData = useCallback(async () => {
    try {
      const workspaceId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : null;
      const wsParam = workspaceId ? `?workspaceId=${workspaceId}` : "";
      const wsParamAnd = workspaceId ? `&workspaceId=${workspaceId}` : "";

      const [activeRes, overviewRes, prioritiesRes, historyRes, weeklyRes] = await Promise.all([
        apiClient.get(`/org/focus/active${wsParam}`).catch(() => null),
        apiClient.get(`/org/focus/overview${wsParam}`).catch(() => null),
        apiClient.get(`/org/focus/priorities${wsParam}`).catch(() => null),
        apiClient.get(`/org/focus/history?limit=20${wsParamAnd}`).catch(() => null),
        apiClient.get(`/org/focus/weekly?weekOffset=${weekOffset}${wsParamAnd}`).catch(() => null),
      ]);

      if (activeRes?.data?.success) {
        const session = activeRes.data.data;
        setActiveSession(session);
        if (session && session.status === "Active") {
          const startTime = session.resumedAt || session.startTime;
          const initialElapsed = (session.durationSeconds || 0) + Math.max(0, Math.floor((Date.now() - new Date(startTime).getTime()) / 1000));
          setElapsed(initialElapsed);
        } else if (session && session.status === "Paused") {
          setElapsed(session.durationSeconds || 0);
        } else {
          setElapsed(0);
        }
      }

      if (overviewRes?.data?.success) setOverview(overviewRes.data.data);
      if (prioritiesRes?.data?.success) {
        setPriorities(prioritiesRes.data.data.priorities || []);
        setAllTasks(prioritiesRes.data.data.tasks || []);
        setAllProjects(prioritiesRes.data.data.projects || []);
      }
      if (historyRes?.data?.success) setHistory(historyRes.data.data || []);
      if (weeklyRes?.data?.success) setWeeklyData(weeklyRes.data.data);
    } catch {
      setError("Failed to load organization focus workspace data");
    } finally {
      setLoading(false);
    }
  }, [weekOffset]);

  useEffect(() => {
    loadWorkspaceData();
  }, [loadWorkspaceData]);

  // Register with Global Pull-to-Refresh system
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

  // Focus Handlers
  const handleStartSession = async (sessionData: any) => {
    if (!isWorkingHours()) {
      setError("Focus is not available outside working hours (04:00 – 23:00)");
      return;
    }
    const workspaceId = localStorage.getItem("workspaceId");

    setActionLoading(true);
    setError("");
    try {
      const res = await apiClient.post("/org/focus/start", {
        workspaceId,
        ...sessionData,
      });
      if (res.data.success) {
        await loadWorkspaceData();
      } else {
        setError(res.data.error || "Failed to start focus session");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to start focus session");
    } finally {
      setActionLoading(false);
    }
  };

  const startCountdownSequence = async (pendingData: any): Promise<void> => {
    if (!isWorkingHours()) {
      setError("Focus is not available outside working hours (04:00 – 23:00)");
      return;
    }
    setCountdown(3);
    return new Promise<void>((resolve) => {
      const cdTimer = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(cdTimer);
            handleStartSession(pendingData);
            resolve();
            return null;
          }
          return prev - 1;
        });
      }, 800);
    });
  };

  const handlePauseSession = async () => {
    if (!activeSession) return;
    const workspaceId = localStorage.getItem("workspaceId");
    setActionLoading(true);
    try {
      const res = await apiClient.post("/org/focus/pause", { workspaceId });
      if (res.data.success) {
        setActiveSession({ ...activeSession, status: "Paused" });
      } else {
        setError(res.data.error || "Failed to pause session");
      }
    } catch (err: any) {
      setError(err.message || "Failed to pause session");
    } finally {
      setActionLoading(false);
    }
  };

  const handleResumeSession = async () => {
    if (!activeSession) return;
    if (!isWorkingHours()) {
      setError("Focus is not available outside working hours (04:00 – 23:00)");
      return;
    }
    const workspaceId = localStorage.getItem("workspaceId");
    setActionLoading(true);
    try {
      const res = await apiClient.post("/org/focus/resume", { workspaceId });
      if (res.data.success) {
        setActiveSession({ ...activeSession, status: "Active" });
      } else {
        setError(res.data.error || "Failed to resume session");
      }
    } catch (err: any) {
      setError(err.message || "Failed to resume session");
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndSession = async (endData: any) => {
    if (!activeSession) return;
    const workspaceId = localStorage.getItem("workspaceId");
    setActionLoading(true);
    try {
      const res = await apiClient.post("/org/focus/end", {
        workspaceId,
        ...endData,
      });
      if (res.data.success) {
        setActiveSession(null);
        setElapsed(0);
        await loadWorkspaceData();
        setShowNextSessionDrawer(true);
      } else {
        setError(res.data.error || "Failed to end session");
      }
    } catch (err: any) {
      setError(err.message || "Failed to end session");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateFollowUpTask = async (taskData: any) => {
    const workspaceId = localStorage.getItem("workspaceId");
    const res = await apiClient.post("/org/focus/follow-up-task", {
      workspaceId,
      ...taskData,
    });
    if (res.data.success) {
      return res.data.data;
    }
    throw new Error(res.data.error || "Failed to create follow-up task");
  };

  if (loading) {
    return (
      <div className="h-full w-full min-h-[300px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#C9A52A] dark:text-[#D4B12F]" />
      </div>
    );
  }

  const systemActive = isWorkingHours();
  const currentStatus = activeSession?.status || "Idle";
  const targetSeconds = activeSession?.targetDurationSeconds || 1500;
  const ringProgress = activeSession?.targetDurationSeconds
    ? Math.min(100, (elapsed / targetSeconds) * 100)
    : (elapsed % 3600) / 3600 * 100;

  return (
    <div className="w-full h-full flex flex-col justify-between overflow-y-auto sm:overflow-hidden bg-[#F9FAFB] dark:bg-[#060806] text-[#17202A] dark:text-[#F2F4F7] font-sans select-none p-4 sm:p-5 md:px-8 md:py-4 pb-[calc(84px+env(safe-area-inset-bottom))] md:pb-4 max-w-[1600px] mx-auto space-y-3.5 box-border [scrollbar-width:none]">
      
      {/* 1. FOCUS HEADER BAR */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] dark:border-[#272D36] shrink-0">
        <div className="space-y-1">
          <h1 className="text-[20px] sm:text-[24px] font-bold text-[#17202A] dark:text-[#F2F4F7] tracking-tight leading-none">
            Focus
          </h1>
          <p className="text-[12px] text-[#667085] dark:text-[#8B95A5]">
            Deep work execution instrument
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-[11px] sm:text-[12px] font-semibold px-3 py-1 rounded-full border flex items-center gap-1.5 ${
              systemActive
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-amber-500/10 text-amber-400 border-amber-500/20"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${systemActive ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
            {systemActive ? "System Active · 04:00–23:00" : "System Offline · 23:00–04:00"}
          </span>
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="my-1 p-2 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-600 dark:text-rose-400 text-[11.5px] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{error}</span>
          </div>
          <button onClick={() => setError("")} className="font-semibold underline cursor-pointer shrink-0 ml-2">
            Dismiss
          </button>
        </div>
      )}

      {/* 2. UNIFIED PHYSICAL 3D STOPWATCH INSTRUMENT */}
      <div className="flex-1 flex flex-col items-center justify-center py-1 sm:py-2 my-auto">
        
        {/* Layer 2: Outer Stopwatch Body */}
        <div style={{ width: "min(440px, calc(100vw - 24px))" }} className="mx-auto bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[22px] p-3 sm:p-4.5 shadow-[0_12px_32px_rgba(0,0,0,0.45),0_1px_2px_rgba(255,255,255,0.06)_inset] text-center flex flex-col items-center justify-between space-y-3 sm:space-y-3.5 my-auto shrink-0 relative transition-transform duration-300">
          
          {/* Top Metallic Bevel Crown Indicator */}
          <div className="w-10 h-2 rounded-full bg-[#E4E7EC] dark:bg-[#222933] border border-[#D0D5DD] dark:border-[#2A323D] mx-auto shadow-inner -mt-1" />

          {/* Layer 3: Inner Bevel Surface */}
          <div className="w-full rounded-[18px] bg-[#F8F9FB] dark:bg-[#11161D] border border-[#E4E7EC] dark:border-[#212933] p-2.5 sm:p-3.5 shadow-[inset_0_2px_6px_rgba(0,0,0,0.4)] relative">
            
            {/* Layer 4: Recessed Display Box */}
            <div className="w-full rounded-[14px] bg-[#07090D] border border-[#19202A] p-3 sm:p-5 shadow-[inset_0_4px_16px_rgba(0,0,0,0.9)] flex flex-col items-center justify-center relative overflow-hidden">
              
              {/* Layer 5: SVG Progress Ring */}
              <div className="relative w-[140px] h-[140px] sm:w-[175px] sm:h-[175px] flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  {/* Track Circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    stroke="#161C24"
                    strokeWidth="6"
                    fill="none"
                  />
                  {/* Active Progress Circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    stroke="#C9A52A"
                    strokeWidth="6"
                    fill="none"
                    strokeDasharray={263.89}
                    strokeDashoffset={263.89 - (263.89 * Math.min(100, ringProgress)) / 100}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                </svg>

                {/* Layer 6: Hero Timer & Status Centered Inside Ring */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
                  <span className="text-[8.5px] sm:text-[9px] font-bold uppercase tracking-[0.12em] text-[#8B95A5]">
                    {countdown !== null
                      ? "STARTING IN"
                      : !systemActive
                      ? "OFFLINE"
                      : currentStatus === "Active"
                      ? "FOCUSING"
                      : currentStatus === "Paused"
                      ? "PAUSED"
                      : "STOPWATCH"}
                  </span>

                  {/* Hero Digital Timer */}
                  <div className="text-[28px] sm:text-[36px] font-extrabold font-mono tabular-nums text-[#F2F4F7] tracking-tight leading-none my-1 select-all">
                    {countdown !== null ? (
                      <span className="text-[#C9A52A] dark:text-[#D4B12F]">{countdown}</span>
                    ) : (
                      formatDigitalTimer(elapsed)
                    )}
                  </div>

                  {/* Status Indicator Pill */}
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        currentStatus === "Active"
                          ? "bg-[#39D393] animate-pulse"
                          : currentStatus === "Paused"
                          ? "bg-amber-500"
                          : systemActive
                          ? "bg-[#C9A52A]"
                          : "bg-rose-500"
                      }`}
                    />
                    <span className="text-[10px] sm:text-[10.5px] font-semibold text-[#8B95A5] uppercase tracking-wider">
                      {!systemActive ? "System Off" : currentStatus === "Active" ? "Active" : currentStatus === "Paused" ? "Paused" : "Ready"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Session Context Display */}
          <div className="w-full min-h-[38px] flex flex-col items-center justify-center text-center space-y-0.5 py-1 px-3 bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] rounded-[10px]">
            {activeSession ? (
              <>
                <p className="text-[12.5px] sm:text-[13px] font-semibold text-[#17202A] dark:text-[#F2F4F7] truncate max-w-full">
                  {activeSession.title || activeSession.task?.title || "Executive Focus Session"}
                </p>
                {activeSession.project && (
                  <p className="text-[10.5px] sm:text-[11px] text-[#667085] dark:text-[#8B95A5] flex items-center justify-center gap-1 truncate">
                    <Folder className="w-3 h-3 text-[#667085] dark:text-[#8B95A5]" />
                    <span>{activeSession.project.name}</span>
                  </p>
                )}
              </>
            ) : priorities.length > 0 ? (
              <>
                <p className="text-[12px] sm:text-[12.5px] font-medium text-[#17202A] dark:text-[#F2F4F7] truncate max-w-full">
                  {priorities[0].title}
                </p>
                <p className="text-[10px] sm:text-[10.5px] text-[#667085] dark:text-[#8B95A5]">
                  {priorities[0].priority || "High"} Priority
                </p>
              </>
            ) : (
              <p className="text-[12px] font-medium text-[#667085] dark:text-[#8B95A5]">
                No priority task selected
              </p>
            )}
          </div>

          {/* Layer 7: Physical 3D Controls */}
          <div className="w-full max-w-[340px] space-y-2 pt-1">
            {currentStatus === "Idle" && (
              <button
                disabled={!systemActive || actionLoading || countdown !== null}
                onClick={() => {
                  const pendingData = priorities.length > 0
                    ? {
                        sourceType: "TASK",
                        taskId: priorities[0].id,
                        title: priorities[0].title,
                        priority: priorities[0].priority,
                        category: "Technical",
                      }
                    : null;

                  if (pendingData) {
                    startCountdownSequence(pendingData);
                  } else {
                    setShowStartModal(true);
                  }
                }}
                className="w-full h-[48px] rounded-[12px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[13.5px] sm:text-[14px] font-bold shadow-[0_4px_0_#9E801B,0_6px_16px_rgba(0,0,0,0.25)] active:translate-y-[2px] active:shadow-[0_2px_0_#9E801B] hover:brightness-105 transition-all duration-100 flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer"
              >
                {actionLoading ? (
                  <Loader2 className="w-4.5 h-4.5 animate-spin" />
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>START FOCUS</span>
                  </>
                )}
              </button>
            )}

            {currentStatus === "Active" && (
              <div className="flex items-center gap-2.5 w-full">
                <button
                  disabled={actionLoading}
                  onClick={handlePauseSession}
                  className="flex-1 h-[48px] rounded-[12px] border border-[#E4E7EC] dark:border-[#272D36] bg-[#FFFFFF] dark:bg-[#15191F] text-[13px] sm:text-[13.5px] font-bold text-[#17202A] dark:text-[#F2F4F7] shadow-[0_4px_0_#1E2530] active:translate-y-[2px] active:shadow-[0_2px_0_#1E2530] hover:bg-[#F3F4F6] dark:hover:bg-[#181D24] transition-all duration-100 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Pause className="w-4 h-4" />
                  <span>PAUSE</span>
                </button>
                <button
                  disabled={actionLoading}
                  onClick={() => setShowEndModal(true)}
                  className="flex-1 h-[48px] rounded-[12px] bg-rose-600 text-white text-[13px] sm:text-[13.5px] font-bold shadow-[0_4px_0_#9F1239] active:translate-y-[2px] active:shadow-[0_2px_0_#9F1239] hover:bg-rose-700 transition-all duration-100 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>END</span>
                </button>
              </div>
            )}

            {currentStatus === "Paused" && (
              <div className="flex items-center gap-2.5 w-full">
                <button
                  disabled={!systemActive || actionLoading}
                  onClick={handleResumeSession}
                  className="flex-1 h-[48px] rounded-[12px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[13px] sm:text-[13.5px] font-bold shadow-[0_4px_0_#9E801B] active:translate-y-[2px] active:shadow-[0_2px_0_#9E801B] hover:brightness-105 transition-all duration-100 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>RESUME</span>
                </button>
                <button
                  disabled={actionLoading}
                  onClick={() => setShowEndModal(true)}
                  className="flex-1 h-[48px] rounded-[12px] bg-rose-600 text-white text-[13px] sm:text-[13.5px] font-bold shadow-[0_4px_0_#9F1239] active:translate-y-[2px] active:shadow-[0_2px_0_#9F1239] hover:bg-rose-700 transition-all duration-100 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>END</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. COMPACT TODAY SUMMARY & SECONDARY SURFACES */}
      <div className="flex items-center justify-between pt-2.5 border-t border-[#E4E7EC] dark:border-[#272D36] text-[11.5px] sm:text-[12px] shrink-0">
        <div className="flex items-center gap-3 sm:gap-4 text-[#667085] dark:text-[#8B95A5]">
          <span>
            Today <strong className="text-[#17202A] dark:text-[#F2F4F7] font-semibold ml-0.5 sm:ml-1">{formatShortDuration(overview?.totalFocusedSeconds || 0)}</strong>
          </span>
          <span>·</span>
          <span>
            Sessions <strong className="text-[#17202A] dark:text-[#F2F4F7] font-semibold ml-0.5 sm:ml-1">{overview?.totalSessionsCount || 0}</strong>
          </span>
        </div>

        {/* Secondary Triggers (Drawers & Modals) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {activeSession?.task && (
            <button
              onClick={() => setShowTaskDrawer(true)}
              className="px-2.5 sm:px-3 h-[32px] sm:h-[34px] rounded-lg border border-[#E4E7EC] dark:border-[#272D36] bg-[#FFFFFF] dark:bg-[#15191F] text-[11.5px] sm:text-[12px] font-semibold text-[#17202A] dark:text-[#F2F4F7] hover:bg-[#F3F4F6] dark:hover:bg-[#181D24] transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <CheckSquare className="w-3.5 h-3.5 text-[#C9A52A] dark:text-[#D4B12F]" />
              <span className="hidden sm:inline">Task Details</span>
            </button>
          )}

          <button
            onClick={() => setShowHistoryDrawer(true)}
            className="px-2.5 sm:px-3 h-[32px] sm:h-[34px] rounded-lg border border-[#E4E7EC] dark:border-[#272D36] bg-[#FFFFFF] dark:bg-[#15191F] text-[11.5px] sm:text-[12px] font-semibold text-[#17202A] dark:text-[#F2F4F7] hover:bg-[#F3F4F6] dark:hover:bg-[#181D24] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5 text-[#667085] dark:text-[#8B95A5]" />
            <span>History ({history.length})</span>
          </button>

          <button
            onClick={() => setShowStatsDrawer(true)}
            className="px-2.5 sm:px-3 h-[32px] sm:h-[34px] rounded-lg border border-[#E4E7EC] dark:border-[#272D36] bg-[#FFFFFF] dark:bg-[#15191F] text-[11.5px] sm:text-[12px] font-semibold text-[#17202A] dark:text-[#F2F4F7] hover:bg-[#F3F4F6] dark:hover:bg-[#181D24] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <BarChart3 className="w-3.5 h-3.5 text-[#667085] dark:text-[#8B95A5]" />
            <span>Statistics</span>
          </button>
        </div>
      </div>

      {/* Modals & Slide-over Drawers */}
      <StartFocusModal
        isOpen={showStartModal}
        onClose={() => setShowStartModal(false)}
        tasks={allTasks}
        projects={allProjects}
        onStartSession={(data) => startCountdownSequence(data)}
      />

      <EndFocusModal
        isOpen={showEndModal}
        onClose={() => setShowEndModal(false)}
        session={activeSession}
        elapsedSeconds={elapsed}
        projects={allProjects}
        onEndSession={handleEndSession}
        onCreateFollowUpTask={handleCreateFollowUpTask}
      />

      <NextSessionDrawer
        isOpen={showNextSessionDrawer}
        onClose={() => setShowNextSessionDrawer(false)}
        tasks={allTasks}
        onStartNextSession={(t) =>
          startCountdownSequence({
            sourceType: "TASK",
            taskId: t.id,
            title: t.title,
            priority: t.priority,
            category: "Technical",
          })
        }
      />

      <SessionDetailModal
        isOpen={!!selectedHistorySession}
        onClose={() => setSelectedHistorySession(null)}
        session={selectedHistorySession}
      />

      <TaskDetailDrawer
        isOpen={showTaskDrawer}
        onClose={() => setShowTaskDrawer(false)}
        task={activeSession?.task}
        project={activeSession?.project}
      />

      <HistoryDrawer
        isOpen={showHistoryDrawer}
        onClose={() => setShowHistoryDrawer(false)}
        history={history}
        onSelectSession={(s) => {
          setSelectedHistorySession(s);
          setShowHistoryDrawer(false);
        }}
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
