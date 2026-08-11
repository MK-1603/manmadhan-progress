"use client";

import React, { useEffect, useState, useCallback } from "react";
import apiClient from "@/lib/api-client";
import { LoaderCircle } from "lucide-react";
import { useSocket } from "@/components/providers/socket-provider";

import { CurrentFocusCard, TimerState } from "@/components/personal/focus/current-focus-card";
import { TodaySummary } from "@/components/personal/focus/today-summary";
import { TodayPlanList } from "@/components/personal/focus/today-plan-list";
import { RecentSessions } from "@/components/personal/focus/recent-sessions";

export default function FocusPage() {
  const { socket, isConnected } = useSocket();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const fetchFocusData = useCallback(async () => {
    try {
      // Personal focus sessions are persisted in the personal workspace namespace.
      const workspaceId = "personal";
      const [coreRes, historyRes] = await Promise.all([
        apiClient.get(`/dashboard/core?workspaceId=${workspaceId}`),
        apiClient.get(`/personal/focus/history`)
      ]);
      
      if (coreRes.data.success) setData(coreRes.data.data);
      if (historyRes.data.success) setHistory(historyRes.data.data);
      
    } catch (error) {
      console.error("Failed to fetch focus data", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFocusData();
  }, [fetchFocusData]);

  // Real-time Socket Listeners
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleFocusUpdated = (updatedSession: any) => {
      setData((prev: any) => {
        if (!prev) return prev;
        
        // If session was completed, we might want to refetch history
        if (updatedSession.status === "COMPLETED") {
          fetchFocusData();
        }
        
        return {
          ...prev,
          activeFocus: { ...prev.activeFocus, ...updatedSession }
        };
      });
    };

    const handleTaskUpdated = () => {
      fetchFocusData();
    };

    socket.on("focus_updated", handleFocusUpdated);
    socket.on("task_updated", handleTaskUpdated);

    return () => {
      socket.off("focus_updated", handleFocusUpdated);
      socket.off("task_updated", handleTaskUpdated);
    };
  }, [socket, isConnected, fetchFocusData]);

  const handleStartFocus = async (taskId?: string) => {
    setIsActionLoading(true);
    try {
      await apiClient.post("/personal/focus/start", {
        taskId,
        workspaceId: localStorage.getItem("workspaceId") || "personal"
      });
    } catch (e) {
      console.error("Failed to start focus", e);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handlePauseFocus = async () => {
    if (!data?.activeFocus?.id) return;
    setIsActionLoading(true);
    try {
      await apiClient.post("/personal/focus/pause", {
        sessionId: data.activeFocus.id,
        workspaceId: localStorage.getItem("workspaceId") || "personal"
      });
    } catch (e) {
      console.error("Failed to pause focus", e);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleResumeFocus = async () => {
    if (!data?.activeFocus?.id) return;
    setIsActionLoading(true);
    try {
      await apiClient.post("/personal/focus/resume", {
        sessionId: data.activeFocus.id,
        workspaceId: localStorage.getItem("workspaceId") || "personal"
      });
    } catch (e) {
      console.error("Failed to resume focus", e);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCompleteFocus = async () => {
    if (!data?.activeFocus?.id) return;
    setIsActionLoading(true);
    try {
      await apiClient.post("/personal/focus/complete", {
        sessionId: data.activeFocus.id,
        workspaceId: localStorage.getItem("workspaceId") || "personal"
      });
    } catch (e) {
      console.error("Failed to complete focus", e);
    } finally {
      setIsActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-[100dvh] flex flex-col items-center justify-center bg-[#F7F7F5] dark:bg-[#080808]">
        <LoaderCircle className="w-5 h-5 md:w-6 md:h-6 text-[#D99A00] dark:text-[#F5B800] animate-spin mb-3" strokeWidth={2} />
        <span className="text-[13px] font-medium text-[#52525B] dark:text-[#A1A1AA]">Loading...</span>
      </div>
    );
  }

  if (!data) return null;

  const activeFocus = data.activeFocus;
  let timerState: TimerState = "IDLE";
  if (activeFocus && activeFocus.status !== "COMPLETED") {
    if (activeFocus.status === "RUNNING") timerState = "RUNNING";
    else if (activeFocus.status === "PAUSED") timerState = "PAUSED";
  }

  // Use the same fallback goal as dashboard
  const userFocusGoalSeconds = data.userProfile?.focusGoalMinutes 
    ? data.userProfile.focusGoalMinutes * 60 
    : 6 * 3600; // default 6 hours
    
  const tasksRemaining = (data.tasksToday || data.priorities || []).filter((t: any) => t.status !== "Completed");

  return (
    <div className="flex flex-col h-full bg-[#F7F7F5] dark:bg-[#080808] relative w-full h-[100dvh] overflow-hidden transition-colors">
      <div className="site-container pt-6 md:pt-8 pb-24 md:pb-6 px-4 md:px-[36px] min-[1536px]:px-[40px] w-full flex-1 overflow-y-auto min-h-0 box-border">
        <div className="mb-6">
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#A1A1AA] dark:text-[#71717A]">Personal workspace</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#171717] dark:text-[#F5F5F5]">Focus</h1>
          <p className="mt-1 text-sm text-[#71717A] dark:text-[#A1A1AA]">Make progress on one meaningful thing at a time.</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 w-full items-start">
          
          {/* Main Focus Area (Left Column on Desktop) */}
          <div className="lg:col-span-8 flex flex-col gap-5 lg:gap-6">
            <CurrentFocusCard 
              timerState={timerState}
              currentTaskTitle={activeFocus?.task?.title || null}
              currentProjectName={activeFocus?.project?.name || null}
              startedAt={activeFocus?.startedAt || null}
              resumedAt={activeFocus?.resumedAt || null}
              accumulatedDuration={activeFocus?.activeDuration || 0}
              dailyGoalSeconds={userFocusGoalSeconds}
              todayTotalSeconds={data.totalFocusSecondsToday || 0}
              availableTasks={tasksRemaining}
              isActionLoading={isActionLoading}
              onStart={handleStartFocus}
              onPause={handlePauseFocus}
              onResume={handleResumeFocus}
              onComplete={handleCompleteFocus}
            />
          </div>

          {/* Context Area (Right Column on Desktop) */}
          <div className="lg:col-span-4 flex flex-col gap-5 lg:gap-6">
            <TodaySummary 
              totalFocusSeconds={data.totalFocusSecondsToday || 0}
              dailyGoalSeconds={userFocusGoalSeconds}
              completedSessionsCount={data.focusSessionsToday?.length || 0}
            />
            
            <TodayPlanList 
              tasks={data.tasksToday || data.priorities || []}
            />
            
          </div>

        </div>
        <div className="mt-5 lg:mt-6 w-full">
          <RecentSessions sessions={history || []} />
        </div>
      </div>
    </div>
  );
}

