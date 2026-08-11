"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Focus as FocusIcon,
  Folder,
  Clock,
  BarChart3,
  CheckSquare,
  AlertCircle,
  Loader2,
  Moon,
  Info,
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { Stopwatch3D } from "@/components/organization/ceo-focus/3d-stopwatch";
import { StartFocusModal } from "@/components/organization/ceo-focus/start-focus-modal";
import { EndFocusModal } from "@/components/organization/ceo-focus/end-focus-modal";
import { SessionDetailModal } from "@/components/organization/ceo-focus/session-detail-modal";
import { TaskDetailDrawer } from "@/components/organization/ceo-focus/task-detail-drawer";
import { HistoryDrawer } from "@/components/organization/ceo-focus/history-drawer";
import { StatsDrawer } from "@/components/organization/ceo-focus/stats-drawer";
import { NextSessionDrawer } from "@/components/organization/ceo-focus/next-session-drawer";

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
    } catch (err: any) {
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
        // Trigger Next Session Flow
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
      <div className="h-[calc(100vh-4rem)] flex justify-center items-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const systemActive = isWorkingHours();
  const currentStatus = activeSession?.status || "Idle";

  return (
    <div className="h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)] max-h-screen overflow-hidden flex flex-col justify-between p-3 md:p-6 select-none bg-background">
      {/* 1. Compact Header Bar */}
      <div className="flex items-center justify-between border-b border-border pb-2.5 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
            <FocusIcon className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm md:text-base font-bold text-foreground tracking-tight flex items-center gap-2">
              Focus
            </h1>
            <p className="text-[11px] text-muted-foreground hidden sm:block">
              Executive deep work and physical timing instrument.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${
              systemActive
                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                : "bg-amber-500/10 text-amber-500 border-amber-500/20"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${systemActive ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
            {systemActive ? "System Active • 04:00–23:00" : "System Off"}
          </span>
        </div>
      </div>

      {error && (
        <div className="my-1 p-2 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500 text-xs flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError("")} className="font-semibold underline">Dismiss</button>
        </div>
      )}

      {!systemActive && (
        <div className="my-1 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-500 text-xs flex items-center gap-2 shrink-0">
          <Moon className="w-3.5 h-3.5 shrink-0" />
          <span>Focus is unavailable between 23:00 and 04:00. Next activation at 04:00.</span>
        </div>
      )}

      {/* 2. Main Focus Viewport (Zero Main Page Scroll) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 items-center justify-center py-2 overflow-hidden">
        {/* Left/Center: Physical 3D Stopwatch Instrument */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center h-full max-h-[440px]">
          <Stopwatch3D
            elapsedSeconds={elapsed}
            status={currentStatus}
            onStart={() => setShowStartModal(true)}
            onPause={handlePauseSession}
            onResume={handleResumeSession}
            onEnd={() => setShowEndModal(true)}
            actionLoading={actionLoading}
            isSystemActive={systemActive}
          />
        </div>

        {/* Right: Native Inspector Context Panel */}
        <div className="lg:col-span-5 flex flex-col justify-center h-full max-h-[400px] space-y-3">
          {activeSession ? (
            <div className="p-4 border border-border rounded-xl bg-card space-y-3 shadow-sm">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Current Focus
                </span>
                <span className="text-xs text-primary font-mono font-bold">
                  {activeSession.category || activeSession.sourceType}
                </span>
              </div>

              <div className="space-y-1">
                <h2 className="text-sm font-bold text-foreground tracking-tight leading-snug line-clamp-2">
                  {activeSession.title || activeSession.task?.title || "Executive Focus Session"}
                </h2>
                {activeSession.project && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    <Folder className="w-3.5 h-3.5 text-muted-foreground" /> {activeSession.project.name}
                  </p>
                )}
              </div>

              {activeSession.objective && (
                <div className="p-2 bg-muted/30 border border-border rounded-lg text-xs text-muted-foreground leading-relaxed line-clamp-2">
                  "{activeSession.objective}"
                </div>
              )}

              <div className="pt-2 flex items-center justify-between border-t border-border text-xs">
                <span className="text-muted-foreground font-mono">
                  Started: {activeSession.startTime ? new Date(activeSession.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}
                </span>
                {activeSession.task && (
                  <button
                    onClick={() => setShowTaskDrawer(true)}
                    className="font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    <Info className="w-3.5 h-3.5" /> View Task
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 border border-border rounded-xl bg-card space-y-3 shadow-sm">
              <div className="border-b border-border pb-2">
                <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Ready to Focus
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Select an organization priority below or start a custom focus activity.
                </p>
              </div>

              {priorities.length > 0 && (
                <div className="space-y-2 pt-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Up Next
                  </span>
                  <div className="p-2.5 border border-border rounded-lg bg-muted/10 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {priorities[0].title}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {priorities[0].priority || "High"} Priority
                      </p>
                    </div>
                    <button
                      disabled={!systemActive}
                      onClick={() =>
                        handleStartSession({
                          sourceType: "TASK",
                          taskId: priorities[0].id,
                          title: priorities[0].title,
                          priority: priorities[0].priority,
                          category: "Technical",
                        })
                      }
                      className="px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-md hover:bg-primary/90 disabled:opacity-40 transition-colors shrink-0"
                    >
                      Focus
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3. Bottom Essential Status Bar (Compact Pills + Secondary Triggers) */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border shrink-0">
        <div className="flex items-center gap-2">
          <div className="px-2.5 py-1 bg-muted/20 border border-border rounded-lg text-xs font-medium flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span className="text-foreground">Today: {formatShortDuration(overview?.totalFocusedSeconds || 0)}</span>
          </div>

          <div className="px-2.5 py-1 bg-muted/20 border border-border rounded-lg text-xs font-medium flex items-center gap-1.5">
            <span className="text-muted-foreground">Sessions:</span>
            <span className="text-foreground">{overview?.totalSessionsCount || 0}</span>
          </div>
        </div>

        {/* Secondary Content Triggers */}
        <div className="flex items-center gap-2">
          {activeSession?.task && (
            <button
              onClick={() => setShowTaskDrawer(true)}
              className="px-3 py-1 bg-card border border-border text-xs font-medium rounded-lg hover:bg-muted text-foreground transition-colors flex items-center gap-1.5"
            >
              <CheckSquare className="w-3.5 h-3.5 text-primary" /> Task Details
            </button>
          )}

          <button
            onClick={() => setShowHistoryDrawer(true)}
            className="px-3 py-1 bg-card border border-border text-xs font-medium rounded-lg hover:bg-muted text-foreground transition-colors flex items-center gap-1.5"
          >
            <Clock className="w-3.5 h-3.5 text-primary" /> History ({history.length})
          </button>

          <button
            onClick={() => setShowStatsDrawer(true)}
            className="px-3 py-1 bg-card border border-border text-xs font-medium rounded-lg hover:bg-muted text-foreground transition-colors flex items-center gap-1.5"
          >
            <BarChart3 className="w-3.5 h-3.5 text-primary" /> Statistics
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
