"use client";

import React, { useEffect, useState, useCallback } from "react";
import apiClient from "@/lib/api-client";
import { LoaderCircle } from "lucide-react";
import { useSocket } from "@/components/providers/socket-provider";
import { useAuth } from "@/components/auth/auth-context";

import { DashboardGreeting } from "@/components/personal/dashboard/dashboard-greeting";
import { HeroProgress, TimerState } from "@/components/personal/dashboard/hero-progress";
import { KpiGrid } from "@/components/personal/dashboard/kpi-grid";
import { TodayPlan, DashboardTask } from "@/components/personal/dashboard/today-plan";
import { ExecutionAnalytics } from "@/components/personal/dashboard/execution-analytics";
import { DailyMotivation } from "@/components/personal/dashboard/daily-motivation";
import { ActiveProjects } from "@/components/personal/dashboard/active-projects";
import { NextBestAction } from "@/components/personal/dashboard/next-best-action";
import { GrowthCard } from "@/components/personal/dashboard/growth-card";
import { RecentActivity } from "@/components/personal/dashboard/recent-activity";

export default function PersonalDashboard() {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      const workspaceId = localStorage.getItem("workspaceId") || "personal";
      const res = await apiClient.get(`/dashboard/core?workspaceId=${workspaceId}`);
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Real-time Socket Listeners
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleFocusUpdated = (updatedSession: any) => {
      setData((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          activeFocus: { ...prev.activeFocus, ...updatedSession }
        };
      });
    };

    const handleTaskUpdated = () => {
      fetchDashboardData();
    };

    const handleActivityCreated = () => {
      fetchDashboardData();
    };

    socket.on("focus_updated", handleFocusUpdated);
    socket.on("task_updated", handleTaskUpdated);
    socket.on("ACTIVITY_CREATED", handleActivityCreated);

    return () => {
      socket.off("focus_updated", handleFocusUpdated);
      socket.off("task_updated", handleTaskUpdated);
      socket.off("ACTIVITY_CREATED", handleActivityCreated);
    };
  }, [socket, isConnected, fetchDashboardData]);

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-background">
        <LoaderCircle className="w-5 h-5 text-gold animate-spin mb-3" strokeWidth={2} />
        <span className="text-[12px] font-medium text-muted-foreground">Loading</span>
      </div>
    );
  }

  if (!data) return null;

  // Compute Timer State & Data
  const activeFocus = data.activeFocus;
  let timerState: TimerState = "IDLE";
  if (activeFocus) {
    if (activeFocus.status === "RUNNING") timerState = "RUNNING";
    else if (activeFocus.status === "PAUSED") timerState = "PAUSED";
  }

  const formatTimeStr = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    return `${h.toString().padStart(2, "0")}h ${m.toString().padStart(2, "0")}m`;
  };

  const focusTimeStr = formatTimeStr(data.totalFocusSecondsToday || 0);
  const focusGoalSeconds = data.kpis?.dailyFocusGoalSeconds || (6 * 3600); 
  const focusPercent = Math.min(100, Math.round(((data.totalFocusSecondsToday || 0) / focusGoalSeconds) * 100));

  const yesterdaySecs = data.totalFocusSecondsYesterday || 0;
  const todaySecs = data.totalFocusSecondsToday || 0;
  
  let trendPercent = 0;
  let trendText = "from yesterday";
  
  if (yesterdaySecs === 0 && todaySecs === 0) {
    trendPercent = 0;
    trendText = "No focus time yet";
  } else if (yesterdaySecs === 0 && todaySecs > 0) {
    trendPercent = 0;
    trendText = "Started today";
  } else {
    trendPercent = Math.round(((todaySecs - yesterdaySecs) / yesterdaySecs) * 100);
  }

  // Compute KPI Data
  const kpiData = {
    focusTime: focusTimeStr,
    focusGoal: formatTimeStr(focusGoalSeconds),
    focusPercent: focusPercent,
    focusTrendPercent: yesterdaySecs > 0 ? Math.round(((todaySecs - yesterdaySecs) / yesterdaySecs) * 100) : null,
    tasksCompleted: data.tasksToday?.filter((t: any) => t.status === "Completed")?.length || 0,
    tasksTotal: data.tasksToday?.length || 0,
    tasksPercent: data.tasksToday?.length ? Math.round(((data.tasksToday?.filter((t: any) => t.status === "Completed")?.length || 0) / data.tasksToday.length) * 100) : null,
    projectsActive: data.activeProjects?.filter((p: any) => p.status === "Active")?.length || 0,
    projectsAttention: data.projectPulses?.filter((p: any) => p.progress < 50)?.length || 0,
    score: data.todayProgressPercent || 0,
    scoreAvailable: (data.tasksToday?.length || 0) > 0 || todaySecs > 0,
    scoreTrend: null, 
  };

  const highestPriorityTask = data.tasksToday?.filter((t: any) => t.status !== "Completed")?.[0] || null;

  // Timer Actions
  const handleStartFocus = async () => {
    if (!highestPriorityTask) return; 
    setIsActionLoading(true);
    try {
      await apiClient.post("/personal/focus/start", {
        taskId: highestPriorityTask.id,
        workspaceId: localStorage.getItem("workspaceId") || "personal"
      });
    } catch (e) {
      console.error("Failed to start focus", e);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handlePauseFocus = async () => {
    setIsActionLoading(true);
    try {
      await apiClient.post("/personal/focus/pause", {
        sessionId: activeFocus.id,
        workspaceId: localStorage.getItem("workspaceId") || "personal"
      });
    } catch (e) {
      console.error("Failed to pause focus", e);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleResumeFocus = async () => {
    setIsActionLoading(true);
    try {
      await apiClient.post("/personal/focus/resume", {
        sessionId: activeFocus.id,
        workspaceId: localStorage.getItem("workspaceId") || "personal"
      });
    } catch (e) {
      console.error("Failed to resume focus", e);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCompleteFocus = async () => {
    setIsActionLoading(true);
    try {
      await apiClient.post("/personal/focus/complete", {
        sessionId: activeFocus.id,
        workspaceId: localStorage.getItem("workspaceId") || "personal"
      });
    } catch (e) {
      console.error("Failed to stop focus", e);
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background w-full overflow-hidden">
      <div className="pt-7 pb-24 md:pb-8 px-4 md:px-8 xl:px-10 w-full flex-1 overflow-y-auto min-h-0">

        {/* ONE CSS GRID SYSTEM */}
        <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-4 lg:gap-5 w-full items-stretch">
          
          {/* ROW 1: Greeting & Motivation */}
          <div className="md:col-span-6 lg:col-span-12 flex flex-col gap-3 mb-1">
            <DashboardGreeting 
              greetingName={user?.displayName || user?.name?.split(" ")[0] || ""} 
            />
            <DailyMotivation 
              focusPercent={focusPercent}
              timerState={timerState}
              tasksCompleted={kpiData.tasksCompleted}
              tasksTotal={kpiData.tasksTotal}
            />
          </div>

          {/* ROW 2: Today (8) + Plan (4) */}
          <HeroProgress 
            className="md:col-span-6 lg:col-span-8 h-full"
            focusTime={focusTimeStr}
            focusGoal={formatTimeStr(focusGoalSeconds)}
            focusPercent={focusPercent}
            trendPercent={trendPercent}
            trendText={trendText}
            currentTaskTitle={activeFocus?.task?.title || null}
            currentProjectName={activeFocus?.project?.name || null}
            timerState={timerState}
            startedAt={activeFocus?.startedAt}
            resumedAt={activeFocus?.resumedAt}
            accumulatedDuration={activeFocus?.activeDuration || 0}
            upcomingTask={highestPriorityTask}
            isActionLoading={isActionLoading}
            onStart={handleStartFocus}
            onPause={handlePauseFocus}
            onResume={handleResumeFocus}
            onComplete={handleCompleteFocus}
          />
          <TodayPlan 
            className="md:col-span-6 lg:col-span-4 h-full"
            tasks={data.tasksToday || []} 
          />

          {/* ROW 3: KPI Grid (12 internal 4x3) */}
          <div className="md:col-span-6 lg:col-span-12">
            <KpiGrid data={kpiData} />
          </div>

          {/* ROW 4: 7-Day Execution (8) + Active Projects (4) */}
          <ExecutionAnalytics className="md:col-span-6 lg:col-span-8 h-full" />
          <ActiveProjects 
            className="md:col-span-6 lg:col-span-4 h-full"
            projects={data.projectPulses || []} 
          />

          {/* ROW 5: Next Action (8) + Growth (4) */}
          <NextBestAction 
            className="md:col-span-6 lg:col-span-8 h-full"
            task={highestPriorityTask}
            isActionLoading={isActionLoading}
            onStartFocus={handleStartFocus}
          />
          <GrowthCard 
            className="md:col-span-6 lg:col-span-4 h-full" 
            activeBook={data.learning?.activeBook || null} 
          />

          {/* ROW 6: Recent Activity (12) */}
          <RecentActivity 
            className="md:col-span-6 lg:col-span-12"
            activities={data.recentActivityList || []} 
          />
          
        </div>
      </div>
    </div>
  );
}

