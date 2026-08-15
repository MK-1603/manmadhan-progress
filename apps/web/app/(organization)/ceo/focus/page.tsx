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
          const initialElapsed = (session.durationSeconds || 0) + Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
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

  // Real-time tick effect
  useEffect(() => {
    if (activeSession?.status === "Active") {
      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    } else {
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

  return (
    <div className="w-full h-full max-h-full flex flex-col justify-between overflow-hidden p-3 sm:p-4 md:p-6 bg-[#F8F9FB] dark:bg-[#0B0E12] text-[#17202A] dark:text-[#F2F4F7] select-none">
      
      {/* 1. FOCUS HEADER BAR */}
      <div className="flex items-center justify-between pb-2.5 border-b border-[#E4E7EC] dark:border-[#272D36] shrink-0">
        <div className="space-y-0.5">
          <h1 className="text-[18px] sm:text-[22px] md:text-[24px] font-bold text-[#17202A] dark:text-[#F2F4F7] tracking-tight leading-none">
            Focus
          </h1>
          <p className="text-[12px] sm:text-[13px] text-[#667085] dark:text-[#8B95A5]">
            Deep work session
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-[10.5px] sm:text-[11px] font-semibold px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full border flex items-center gap-1.5 ${
              systemActive
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
            }`}
          >
            <span className={`w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full ${systemActive ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
            {systemActive ? "System Active · 04:00–23:00" : "System Off"}
          </span>
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="my-1 p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-600 dark:text-rose-400 text-[12px] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="truncate">{error}</span>
          </div>
          <button onClick={() => setError("")} className="font-semibold underline cursor-pointer shrink-0 ml-2">
            Dismiss
          </button>
        </div>
      )}

      {/* 2. UNIFIED PRIMARY FOCUS AREA (ZERO MAIN PAGE SCROLL) */}
      <div className="flex-1 flex flex-col items-center justify-center py-2 sm:py-4 my-auto overflow-hidden">
        <div className="w-full max-w-[440px] md:max-w-[480px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[16px] p-4 sm:p-6 md:p-8 shadow-xs text-center flex flex-col items-center justify-between space-y-3 sm:space-y-5 my-auto shrink-0">
          
          <span className="text-[10.5px] sm:text-[11px] font-bold uppercase tracking-[0.1em] text-[#667085] dark:text-[#8B95A5]">
            CURRENT SESSION
          </span>

          {/* TIMER HERO DISPLAY */}
          <div className="space-y-0.5 py-0.5">
            <div className="text-[48px] sm:text-[64px] md:text-[72px] font-bold font-mono text-[#17202A] dark:text-[#F2F4F7] tracking-tighter leading-none select-all">
              {formatDigitalTimer(elapsed)}
            </div>
            <p className="text-[12px] sm:text-[13px] font-semibold uppercase tracking-wider text-[#C9A52A] dark:text-[#D4B12F] pt-0.5">
              {currentStatus === "Active" ? "FOCUSING" : currentStatus === "Paused" ? "PAUSED" : "READY TO FOCUS"}
            </p>
          </div>

          {/* SESSION CONTEXT & PRIORITY */}
          <div className="w-full min-h-[42px] flex flex-col items-center justify-center text-center space-y-0.5 py-1 px-2.5 bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] rounded-[9px]">
            {activeSession ? (
              <>
                <p className="text-[13px] sm:text-[13.5px] font-semibold text-[#17202A] dark:text-[#F2F4F7] truncate max-w-full">
                  {activeSession.title || activeSession.task?.title || "Executive Focus Session"}
                </p>
                {activeSession.project && (
                  <p className="text-[11px] sm:text-[11.5px] text-[#667085] dark:text-[#8B95A5] flex items-center justify-center gap-1 truncate">
                    <Folder className="w-3 h-3 text-[#667085] dark:text-[#8B95A5]" />
                    <span>{activeSession.project.name}</span>
                  </p>
                )}
              </>
            ) : priorities.length > 0 ? (
              <>
                <p className="text-[12.5px] sm:text-[13px] font-medium text-[#17202A] dark:text-[#F2F4F7] truncate max-w-full">
                  {priorities[0].title}
                </p>
                <p className="text-[10.5px] sm:text-[11px] text-[#667085] dark:text-[#8B95A5]">
                  {priorities[0].priority || "High"} Priority
                </p>
              </>
            ) : (
              <p className="text-[12.5px] sm:text-[13px] font-normal text-[#667085] dark:text-[#8B95A5]">
                No priority selected
              </p>
            )}
          </div>

          {/* PRIMARY FOCUS CONTROL BUTTONS */}
          <div className="w-full max-w-[360px] space-y-2">
            {currentStatus === "Idle" && (
              <button
                disabled={!systemActive || actionLoading}
                onClick={() => {
                  if (priorities.length > 0) {
                    handleStartSession({
                      sourceType: "TASK",
                      taskId: priorities[0].id,
                      title: priorities[0].title,
                      priority: priorities[0].priority,
                      category: "Technical",
                    });
                  } else {
                    setShowStartModal(true);
                  }
                }}
                className="w-full h-[46px] sm:h-[50px] rounded-[10px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[13.5px] sm:text-[14.5px] font-semibold hover:opacity-90 transition-opacity shadow-xs inline-flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer"
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
                  className="flex-1 h-[46px] sm:h-[50px] rounded-[10px] border border-[#E4E7EC] dark:border-[#272D36] bg-[#FFFFFF] dark:bg-[#15191F] text-[13.5px] sm:text-[14px] font-semibold text-[#17202A] dark:text-[#F2F4F7] hover:bg-[#F3F4F6] dark:hover:bg-[#181D24] transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Pause className="w-4 h-4" />
                  <span>PAUSE</span>
                </button>
                <button
                  disabled={actionLoading}
                  onClick={() => setShowEndModal(true)}
                  className="flex-1 h-[46px] sm:h-[50px] rounded-[10px] bg-red-600 text-white text-[13.5px] sm:text-[14px] font-semibold hover:bg-red-700 transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
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
                  className="flex-1 h-[46px] sm:h-[50px] rounded-[10px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[13.5px] sm:text-[14px] font-semibold hover:opacity-90 transition-opacity inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>RESUME</span>
                </button>
                <button
                  disabled={actionLoading}
                  onClick={() => setShowEndModal(true)}
                  className="flex-1 h-[46px] sm:h-[50px] rounded-[10px] bg-red-600 text-white text-[13.5px] sm:text-[14px] font-semibold hover:bg-red-700 transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
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
        onStartSession={handleStartSession}
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
          handleStartSession({
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
