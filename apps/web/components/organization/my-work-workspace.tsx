"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  CheckSquare, Loader2, AlertCircle, Clock, FolderKanban,
  Play, CheckCircle2, XCircle, ShieldAlert, ExternalLink, ArrowRight,
  Bell, CheckCheck, RefreshCw, Plus, Calendar, Flag, MessageSquare,
  ChevronRight, ShieldCheck, Sparkles, Filter
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { useSocket } from "@/components/providers/socket-provider";
import { TaskAssignmentModal } from "@/components/tasks/task-assignment-modal";
import { ProjectAssignmentModal } from "@/components/organization/project-assignment-modal";
import { TaskCreateModal } from "@/components/organization/task-create-modal";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import Link from "next/link";
import { useRegisterRefresh } from "@/components/providers/global-refresh-provider";

interface MyWorkWorkspaceProps {
  userRole?: string;
}

interface NotificationItem {
  id: string;
  type?: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  metadata?: any;
  taskId?: string;
  projectId?: string;
}

function timeAgo(d: string | null | undefined) {
  if (!d) return "recently";
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function isOverdue(deadline: string | null | undefined, status: string) {
  if (!deadline) return false;
  if (["Approved", "Completed", "CANCELLED", "RESOLVED"].includes(status)) return false;
  return new Date(deadline) < new Date();
}

function isDueSoon(deadline: string | null | undefined, status: string) {
  if (!deadline) return false;
  if (["Approved", "Completed", "CANCELLED", "RESOLVED"].includes(status)) return false;
  const due = new Date(deadline).getTime();
  const now = Date.now();
  const diffHours = (due - now) / (1000 * 60 * 60);
  return diffHours > 0 && diffHours <= 24;
}

export function MyWorkWorkspace({ userRole = "CO-CEO" }: MyWorkWorkspaceProps) {
  const { socket } = useSocket();
  const [data, setData] = useState<any>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [startWorkLoading, setStartWorkLoading] = useState<string | null>(null);
  const [acceptingTaskId, setAcceptingTaskId] = useState<string | null>(null);
  const [decliningTaskId, setDecliningTaskId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [showDeclineModal, setShowDeclineModal] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchAllData = useCallback(async () => {
    try {
      setError("");
      const workspaceId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : null;
      if (!workspaceId) {
        setLoading(false);
        return;
      }

      const [workRes, notifRes] = await Promise.all([
        apiClient.get(`/org/my-work?workspaceId=${workspaceId}`).catch(() => null),
        apiClient.get("/notifications").catch(() => null),
      ]);

      if (workRes?.data?.success) {
        setData(workRes.data.data);
      } else if (workRes?.data?.error) {
        setError(workRes.data.error);
      }

      if (notifRes?.data?.success) {
        setNotifications(Array.isArray(notifRes.data.data) ? notifRes.data.data : []);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load My Work data");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useRegisterRefresh(fetchAllData);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlTaskId = params.get("taskId");
      const urlProjectId = params.get("projectId");
      if (urlTaskId) setSelectedTaskId(urlTaskId);
      if (urlProjectId) setSelectedProjectId(urlProjectId);
    }
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleRefresh = () => fetchAllData();

    socket.on("task.updated", handleRefresh);
    socket.on("task.created", handleRefresh);
    socket.on("task.status_changed", handleRefresh);
    socket.on("project.created", handleRefresh);
    socket.on("project_created", handleRefresh);
    socket.on("project.accepted", handleRefresh);
    socket.on("project.updated", handleRefresh);
    socket.on("notification.created", handleRefresh);
    socket.on("approval.updated", handleRefresh);
    socket.on("TASK_ASSIGNED", handleRefresh);
    socket.on("TASK_ACCEPTED", handleRefresh);
    socket.on("TASK_STARTED", handleRefresh);
    socket.on("TASK_COMPLETED", handleRefresh);

    return () => {
      socket.off("task.updated", handleRefresh);
      socket.off("task.created", handleRefresh);
      socket.off("task.status_changed", handleRefresh);
      socket.off("project.created", handleRefresh);
      socket.off("project_created", handleRefresh);
      socket.off("project.accepted", handleRefresh);
      socket.off("project.updated", handleRefresh);
      socket.off("notification.created", handleRefresh);
      socket.off("approval.updated", handleRefresh);
      socket.off("TASK_ASSIGNED", handleRefresh);
      socket.off("TASK_ACCEPTED", handleRefresh);
      socket.off("TASK_STARTED", handleRefresh);
      socket.off("TASK_COMPLETED", handleRefresh);
    };
  }, [socket, fetchAllData]);

  const handleManualRefresh = () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    fetchAllData();
  };

  const handleStartWork = async (taskId: string) => {
    setStartWorkLoading(taskId);
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      const res = await apiClient.post(`/org/tasks/${taskId}/start-work?workspaceId=${workspaceId}`);
      if (res.data?.success) {
        fetchAllData();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to start work");
    } finally {
      setStartWorkLoading(null);
    }
  };

  const handleAcceptTask = async (taskId: string) => {
    setAcceptingTaskId(taskId);
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      const res = await apiClient.post(`/org/tasks/${taskId}/assignment/accept?workspaceId=${workspaceId}`);
      if (res.data?.success) {
        fetchAllData();
      } else {
        setError(res.data?.error || "Failed to accept task assignment");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to accept task assignment");
    } finally {
      setAcceptingTaskId(null);
    }
  };

  const handleAcceptProject = async (projectId: string) => {
    setAcceptingTaskId(projectId);
    try {
      const workspaceId = localStorage.getItem("workspaceId") || "";
      const res = await apiClient.post(`/org/projects/${projectId}/assignment/accept?workspaceId=${workspaceId}`);
      if (res.data?.success) {
        fetchAllData();
      } else {
        setError(res.data?.error || "Failed to accept project assignment");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to accept project assignment");
    } finally {
      setAcceptingTaskId(null);
    }
  };

  const handleDeclineTask = async (taskId: string) => {
    if (!declineReason.trim()) {
      setError("Please provide a reason to decline the assignment.");
      return;
    }
    setDecliningTaskId(taskId);
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      const res = await apiClient.post(`/org/tasks/${taskId}/assignment/decline?workspaceId=${workspaceId}`, {
        reason: declineReason.trim(),
      });
      if (res.data?.success) {
        setShowDeclineModal(null);
        setDeclineReason("");
        fetchAllData();
      } else {
        setError(res.data?.error || "Failed to decline task assignment");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to decline task assignment");
    } finally {
      setDecliningTaskId(null);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await apiClient.post("/notifications/read-all");
      if (res.data?.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to mark notifications as read");
    }
  };

  const handleMarkSingleRead = async (notif: NotificationItem) => {
    if (!notif.isRead) {
      try {
        await apiClient.patch(`/notifications/${notif.id}/read`);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
        );
      } catch {
        // silent fallback
      }
    }
    if (notif.taskId) {
      setSelectedTaskId(notif.taskId);
    } else if (notif.projectId) {
      setSelectedProjectId(notif.projectId);
    }
  };

  const summary = data?.summary || {
    pendingCount: 0,
    activeCount: 0,
    dueTodayCount: 0,
    overdueCount: 0,
    completedCount: 0,
  };
  const pendingTaskList: any[] = data?.pendingAcceptance || [];
  const pendingProjectList: any[] = data?.pendingProjectAssignments || [];
  const activeTaskList: any[] = data?.activeWork || [];
  const assignedProjectsList: any[] = data?.assignedProjects || [];
  const completedList: any[] = data?.completed || [];

  // Notification Counts
  const notificationSummary = useMemo(() => {
    const unread = notifications.filter((n) => !n.isRead).length;
    const assignments = notifications.filter((n) =>
      n.type?.includes("ASSIGN") || n.title?.toLowerCase().includes("assign")
    ).length;
    const deadlines = notifications.filter((n) =>
      n.type?.includes("DEADLINE") || n.title?.toLowerCase().includes("due") || n.title?.toLowerCase().includes("overdue")
    ).length;
    const reviews = notifications.filter((n) =>
      n.type?.includes("REVIEW") || n.title?.toLowerCase().includes("review") || n.title?.toLowerCase().includes("submission")
    ).length;

    return { unread, assignments, deadlines, reviews };
  }, [notifications]);

  // Actionable Attention Required Panel items
  const attentionRequiredItems = useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      subtext: string;
      type: "OVERDUE" | "DUE_SOON" | "PENDING_ACCEPT" | "REVIEW";
      actionText: string;
      onClick: () => void;
    }> = [];

    // Overdue tasks
    activeTaskList
      .filter((item) => isOverdue((item.task || item).deadline, (item.task || item).status))
      .forEach((item) => {
        const t = item.task || item;
        items.push({
          id: `ovd_${t.id}`,
          title: `Overdue: ${t.title}`,
          subtext: `${timeAgo(t.deadline)} overdue`,
          type: "OVERDUE",
          actionText: "Open Task",
          onClick: () => setSelectedTaskId(t.id),
        });
      });

    // Due Soon tasks
    activeTaskList
      .filter((item) => isDueSoon((item.task || item).deadline, (item.task || item).status))
      .forEach((item) => {
        const t = item.task || item;
        items.push({
          id: `due_${t.id}`,
          title: `Due in < 24h: ${t.title}`,
          subtext: t.projectName ? `Project: ${t.projectName}` : "Approaching deadline",
          type: "DUE_SOON",
          actionText: "View",
          onClick: () => setSelectedTaskId(t.id),
        });
      });

    // Pending acceptance items
    pendingTaskList.slice(0, 3).forEach((item) => {
      const t = item.task || item;
      items.push({
        id: `acc_${t.id}`,
        title: `Pending acceptance: ${t.title}`,
        subtext: item.assignedByName ? `Assigned by ${item.assignedByName}` : "Awaiting your response",
        type: "PENDING_ACCEPT",
        actionText: "Review",
        onClick: () => setSelectedTaskId(t.id),
      });
    });

    return items;
  }, [activeTaskList, pendingTaskList]);

  return (
    <PullToRefresh onRefresh={fetchAllData}>
      <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-20 sm:pb-12 max-w-[1440px] mx-auto w-full space-y-5 text-xs">
        {/* ── Executive Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1 border-b border-[#E5E7EB] dark:border-[#272D36]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold text-[#B28D18] dark:text-[#C9A52A] uppercase tracking-wider">
                CO-CEO WORKSPACE
              </span>
            </div>
            <h1 className="text-[24px] sm:text-[26px] font-extrabold text-[#17202A] dark:text-[#F2F4F7] tracking-tight flex items-center gap-2.5">
              <CheckSquare className="w-6 h-6 text-[#B28D18] dark:text-[#C9A52A]" />
              <span>My Work</span>
            </h1>
            <p className="text-[12px] text-[#667085] dark:text-[#8B95A5] mt-1">
              Work assigned to you, pending items, and tasks requiring your action.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 h-[40px] rounded-[10px] bg-[#B28D18] hover:bg-[#967412] dark:bg-[#C9A52A] dark:hover:bg-[#B28D18] text-white dark:text-[#0B0D10] text-[12.5px] font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Quick Action</span>
            </button>

            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="flex items-center justify-center w-[40px] h-[40px] rounded-[10px] bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] text-[#17202A] dark:text-[#F2F4F7] hover:border-[#B28D18] dark:hover:border-[#C9A52A] transition-colors cursor-pointer disabled:opacity-50"
              aria-label="Refresh My Work"
              title="Refresh My Work"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-[#B28D18] dark:text-[#C9A52A]" : ""}`} />
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-[12px] text-rose-600 dark:text-rose-400 text-[12.5px] font-semibold flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1">{error}</span>
          </div>
        )}

        {/* ── NOTIFICATION / ACTION CENTER (Top Priority Section) ── */}
        <div className="bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] rounded-[16px] overflow-hidden shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 border-b border-[#E5E7EB] dark:border-[#272D36] bg-[#F8F9FA] dark:bg-[#111419]">
            <div className="flex items-center gap-2.5">
              <Bell className="w-4 h-4 text-[#B28D18] dark:text-[#C9A52A]" />
              <span className="text-[12px] font-bold text-[#17202A] dark:text-[#F2F4F7] uppercase tracking-wider">
                NOTIFICATIONS & ACTION CENTER
              </span>
              {notificationSummary.unread > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-[#B28D18] dark:bg-[#C9A52A] text-white dark:text-[#0B0D10] text-[10px] font-extrabold">
                  {notificationSummary.unread} Unread
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {notificationSummary.unread > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 text-[11.5px] font-bold text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7] transition-colors cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark all as read</span>
                </button>
              )}
              <Link
                href="/co-ceo/notifications"
                className="flex items-center gap-1 text-[11.5px] font-bold text-[#B28D18] dark:text-[#C9A52A] hover:underline transition-colors"
              >
                View all <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Executive Summary Pills */}
          <div className="px-5 py-2.5 border-b border-[#E5E7EB] dark:border-[#272D36] bg-[#F8F9FA]/50 dark:bg-[#0B0D10] flex items-center gap-4 flex-wrap text-[11.5px] font-semibold text-[#667085] dark:text-[#8B95A5]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#B28D18] dark:bg-[#C9A52A]" />
              <strong className="text-[#17202A] dark:text-[#F2F4F7]">{notificationSummary.unread}</strong> Unread
            </span>
            <span>·</span>
            <span>
              <strong className="text-[#17202A] dark:text-[#F2F4F7]">{notificationSummary.assignments}</strong> Assignments
            </span>
            <span>·</span>
            <span>
              <strong className="text-[#17202A] dark:text-[#F2F4F7]">{notificationSummary.deadlines}</strong> Deadlines
            </span>
            <span>·</span>
            <span>
              <strong className="text-[#17202A] dark:text-[#F2F4F7]">{notificationSummary.reviews}</strong> Reviews
            </span>
          </div>

          {/* Real Notifications List */}
          <div className="divide-y divide-[#E5E7EB] dark:divide-[#272D36]">
            {loading ? (
              <div className="p-4 space-y-2.5">
                {[1, 2].map((i) => (
                  <div key={i} className="h-10 bg-[#F8F9FA] dark:bg-[#111419] rounded-lg animate-pulse" />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-5 text-center flex flex-col items-center justify-center space-y-1 my-1">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <p className="text-[13px] font-bold text-[#17202A] dark:text-[#F2F4F7]">You're all caught up</p>
                <p className="text-[11.5px] text-[#667085] dark:text-[#8B95A5]">
                  No new messages or actions require your attention.
                </p>
              </div>
            ) : (
              notifications.slice(0, 4).map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleMarkSingleRead(n)}
                  className={`px-5 py-3 flex items-start justify-between gap-3 hover:bg-[#F8F9FA] dark:hover:bg-[#111419]/60 transition-colors cursor-pointer ${
                    !n.isRead ? "bg-[#B28D18]/5 dark:bg-[#C9A52A]/5" : ""
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <span className="mt-1 flex items-center justify-center shrink-0">
                      {!n.isRead ? (
                        <span className="w-2 h-2 rounded-full bg-[#B28D18] dark:bg-[#C9A52A] animate-pulse" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-700" />
                      )}
                    </span>

                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[12.5px] font-bold ${!n.isRead ? "text-[#17202A] dark:text-[#F2F4F7]" : "text-[#667085] dark:text-[#8B95A5]"}`}>
                          {n.title}
                        </span>
                        <span className="text-[10.5px] text-[#667085] dark:text-[#8B95A5]">
                          · {timeAgo(n.createdAt)}
                        </span>
                      </div>
                      <p className="text-[11.5px] text-[#667085] dark:text-[#8B95A5] line-clamp-1">
                        {n.message}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkSingleRead(n);
                    }}
                    className="px-2.5 py-1 rounded-[7px] bg-[#F8F9FA] dark:bg-[#111419] border border-[#E5E7EB] dark:border-[#272D36] text-[11px] font-bold text-[#B28D18] dark:text-[#C9A52A] hover:border-[#B28D18] transition-colors shrink-0"
                  >
                    Open
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Summary Executive Metric Strip ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="p-3.5 rounded-[14px] bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] shadow-xs">
            <span className="text-[10px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider block">
              PENDING
            </span>
            <p className="text-[26px] font-extrabold text-[#B28D18] dark:text-[#C9A52A] font-mono leading-none mt-1.5">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : summary.pendingCount}
            </p>
            <p className="text-[11px] text-[#667085] dark:text-[#8B95A5] mt-1 font-medium">Awaiting acceptance</p>
          </div>

          <div className="p-3.5 rounded-[14px] bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] shadow-xs">
            <span className="text-[10px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider block">
              IN PROGRESS
            </span>
            <p className="text-[26px] font-extrabold text-blue-500 font-mono leading-none mt-1.5">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : summary.activeCount}
            </p>
            <p className="text-[11px] text-[#667085] dark:text-[#8B95A5] mt-1 font-medium">Currently active</p>
          </div>

          <div className="p-3.5 rounded-[14px] bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] shadow-xs">
            <span className="text-[10px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider block">
              DUE TODAY
            </span>
            <p className="text-[26px] font-extrabold text-amber-500 font-mono leading-none mt-1.5">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : summary.dueTodayCount}
            </p>
            <p className="text-[11px] text-[#667085] dark:text-[#8B95A5] mt-1 font-medium">Needs attention</p>
          </div>

          <div className="p-3.5 rounded-[14px] bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] shadow-xs">
            <span className="text-[10px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider block">
              OVERDUE
            </span>
            <p className="text-[26px] font-extrabold text-rose-500 font-mono leading-none mt-1.5">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : summary.overdueCount}
            </p>
            <p className="text-[11px] text-[#667085] dark:text-[#8B95A5] mt-1 font-medium">
              {summary.overdueCount > 0 ? "Requires action" : "All clear"}
            </p>
          </div>

          <div className="p-3.5 rounded-[14px] bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] shadow-xs">
            <span className="text-[10px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider block">
              COMPLETED
            </span>
            <p className="text-[26px] font-extrabold text-emerald-500 font-mono leading-none mt-1.5">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : summary.completedCount}
            </p>
            <p className="text-[11px] text-[#667085] dark:text-[#8B95A5] mt-1 font-medium">Completed work</p>
          </div>
        </div>

        {/* ── Main Content Grid (2-Column Desktop Layout) ── */}
        <div className="grid lg:grid-cols-3 gap-5 items-start">
          {/* Left Column (Span 2): Pending Assignments + Active Work + Projects */}
          <div className="lg:col-span-2 space-y-5">
            {/* ── PENDING ASSIGNMENTS ── */}
            {(pendingTaskList.length > 0 || pendingProjectList.length > 0) && (
              <div className="bg-[#FFFFFF] dark:bg-[#07090D] border border-[#B28D18]/30 dark:border-[#C9A52A]/30 rounded-[16px] overflow-hidden shadow-xs space-y-0">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E5E7EB] dark:border-[#272D36] bg-[#B28D18]/5 dark:bg-[#C9A52A]/5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#B28D18] dark:bg-[#C9A52A] animate-pulse" />
                    <span className="text-[12px] font-bold text-[#B28D18] dark:text-[#C9A52A] uppercase tracking-wider">
                      PENDING ASSIGNMENTS ({pendingTaskList.length + pendingProjectList.length})
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-[#E5E7EB] dark:divide-[#272D36]">
                  {/* Task Assignments */}
                  {pendingTaskList.map((item: any) => {
                    const task = item.task || item;
                    const proj = item.project;
                    return (
                      <div
                        key={task.id}
                        className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F8F9FA] dark:hover:bg-[#111419]/60 transition-colors"
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[13px] font-bold text-[#17202A] dark:text-[#F2F4F7]">
                              {task.title}
                            </span>
                            <span className="px-2 py-0.2 rounded-full bg-[#B28D18]/10 text-[#B28D18] border border-[#B28D18]/20 text-[9.5px] font-bold uppercase">
                              PENDING ACCEPTANCE
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-[#667085] dark:text-[#8B95A5] flex-wrap">
                            {proj?.name && (
                              <span className="flex items-center gap-1 font-medium text-[#17202A] dark:text-[#F2F4F7]">
                                <FolderKanban className="w-3 h-3 text-[#B28D18]" />
                                {proj.name}
                              </span>
                            )}
                            {item.assignedByName && (
                              <span>Assigned by {item.assignedByName}</span>
                            )}
                            {task.deadline && (
                              <span>Due: {new Date(task.deadline).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleAcceptTask(task.id)}
                            disabled={acceptingTaskId === task.id}
                            className="px-3.5 py-1.5 rounded-[9px] bg-[#B28D18] hover:bg-[#967412] dark:bg-[#C9A52A] dark:hover:bg-[#B28D18] text-white dark:text-[#0B0D10] text-[11.5px] font-extrabold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                          >
                            {acceptingTaskId === task.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            )}
                            <span>Accept</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setShowDeclineModal(task.id)}
                            className="px-3.5 py-1.5 rounded-[9px] bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[11.5px] font-bold hover:bg-rose-500/20 cursor-pointer transition-colors"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Project Assignments */}
                  {pendingProjectList.map((proj: any) => (
                    <div
                      key={proj.id}
                      className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F8F9FA] dark:hover:bg-[#111419]/60 transition-colors"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-bold text-[#17202A] dark:text-[#F2F4F7]">
                            Project: {proj.name}
                          </span>
                          <span className="px-2 py-0.2 rounded-full bg-[#B28D18]/10 text-[#B28D18] border border-[#B28D18]/20 text-[9.5px] font-bold uppercase">
                            PROJECT ASSIGNMENT
                          </span>
                        </div>
                        <p className="text-[11px] text-[#667085] dark:text-[#8B95A5]">
                          Assigned by {proj.assignedByName || "CEO"}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleAcceptProject(proj.id)}
                          disabled={acceptingTaskId === proj.id}
                          className="px-3.5 py-1.5 rounded-[9px] bg-[#B28D18] hover:bg-[#967412] dark:bg-[#C9A52A] dark:hover:bg-[#B28D18] text-white dark:text-[#0B0D10] text-[11.5px] font-extrabold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                        >
                          {acceptingTaskId === proj.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          <span>Accept Project</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedProjectId(proj.id)}
                          className="px-3.5 py-1.5 rounded-[9px] bg-[#141820] hover:bg-[#1C222C] border border-white/10 text-[#F4F7F5] text-[11.5px] font-bold cursor-pointer transition-colors"
                        >
                          Review Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── MY ACTIVE WORK ── */}
            <div className="bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] rounded-[16px] overflow-hidden shadow-xs">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E5E7EB] dark:border-[#272D36] bg-[#F8F9FA] dark:bg-[#111419]">
                <div className="flex items-center gap-2">
                  <Play className="w-4 h-4 text-blue-500" />
                  <span className="text-[12px] font-bold text-[#17202A] dark:text-[#F2F4F7] uppercase tracking-wider">
                    MY ACTIVE WORK ({activeTaskList.length})
                  </span>
                </div>
              </div>

              <div className="divide-y divide-[#E5E7EB] dark:divide-[#272D36]">
                {loading ? (
                  <div className="p-5 space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-10 bg-[#F8F9FA] dark:bg-[#111419] rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : activeTaskList.length === 0 ? (
                  <div className="p-6 text-center flex flex-col items-center justify-center space-y-1.5">
                    <CheckSquare className="w-5 h-5 text-[#667085]/40" />
                    <p className="text-[12.5px] font-bold text-[#17202A] dark:text-[#F2F4F7]">No active work</p>
                    <p className="text-[11.5px] text-[#667085] dark:text-[#8B95A5]">
                      You're currently clear of active assignments.
                    </p>
                  </div>
                ) : (
                  activeTaskList.map((item: any) => {
                    const task = item.task || item;
                    const proj = item.project;
                    const overdue = isOverdue(task.deadline, task.status);

                    return (
                      <div
                        key={task.id}
                        className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-[#F8F9FA] dark:hover:bg-[#111419]/60 transition-colors"
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-bold text-[#17202A] dark:text-[#F2F4F7] truncate">
                              {task.title}
                            </span>
                            {task.priority && (
                              <span
                                className={`px-2 py-0.2 rounded-full text-[9.5px] font-bold uppercase ${
                                  task.priority === "High"
                                    ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                                    : "bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-500/20"
                                }`}
                              >
                                {task.priority}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-[#667085] dark:text-[#8B95A5] flex-wrap">
                            {proj?.name && (
                              <span className="flex items-center gap-1">
                                <FolderKanban className="w-3 h-3 text-[#B28D18]" />
                                {proj.name}
                              </span>
                            )}
                            {task.deadline && (
                              <span className={`flex items-center gap-1 ${overdue ? "font-bold text-rose-600 dark:text-rose-400" : ""}`}>
                                <Clock className="w-3 h-3" />
                                {new Date(task.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {task.status === "ACCEPTED" || task.status === "Accepted" ? (
                            <button
                              type="button"
                              onClick={() => handleStartWork(task.id)}
                              disabled={startWorkLoading === task.id}
                              className="px-3.5 py-1.5 rounded-[9px] bg-[#B28D18] hover:bg-[#967412] dark:bg-[#C9A52A] dark:hover:bg-[#B28D18] text-white dark:text-[#0B0D10] text-[11.5px] font-extrabold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                            >
                              {startWorkLoading === task.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Play className="w-3.5 h-3.5 fill-current" />
                              )}
                              <span>Start Work</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setSelectedTaskId(task.id)}
                              className="px-3.5 py-1.5 rounded-[9px] bg-[#F8F9FA] dark:bg-[#111419] border border-[#E5E7EB] dark:border-[#272D36] text-[11.5px] font-bold text-[#17202A] dark:text-[#F2F4F7] hover:border-[#B28D18] cursor-pointer transition-colors"
                            >
                              Open Details
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* ── MY PROJECTS ── */}
            <div className="bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] rounded-[16px] overflow-hidden shadow-xs">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E5E7EB] dark:border-[#272D36] bg-[#F8F9FA] dark:bg-[#111419]">
                <div className="flex items-center gap-2">
                  <FolderKanban className="w-4 h-4 text-[#B28D18] dark:text-[#C9A52A]" />
                  <span className="text-[12px] font-bold text-[#17202A] dark:text-[#F2F4F7] uppercase tracking-wider">
                    MY PROJECTS ({assignedProjectsList.length})
                  </span>
                </div>
              </div>

              <div className="divide-y divide-[#E5E7EB] dark:divide-[#272D36]">
                {loading ? (
                  <div className="p-5 space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-10 bg-[#F8F9FA] dark:bg-[#111419] rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : assignedProjectsList.length === 0 ? (
                  <div className="p-6 text-center flex flex-col items-center justify-center space-y-1.5">
                    <FolderKanban className="w-5 h-5 text-[#667085]/40" />
                    <p className="text-[12.5px] font-bold text-[#17202A] dark:text-[#F2F4F7]">No assigned projects</p>
                    <p className="text-[11.5px] text-[#667085] dark:text-[#8B95A5]">
                      Projects assigned to you will appear here.
                    </p>
                  </div>
                ) : (
                  assignedProjectsList.map((proj: any) => (
                    <div
                      key={proj.id}
                      className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-[#F8F9FA] dark:hover:bg-[#111419]/60 transition-colors"
                    >
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-bold text-[#17202A] dark:text-[#F2F4F7]">
                            {proj.name}
                          </span>
                          <span className="font-mono text-[10px] font-semibold text-[#B28D18] dark:text-[#C9A52A]">
                            {proj.currentStage || "Stage 01 / 08"}
                          </span>
                        </div>
                        <p className="text-[11.5px] text-[#667085] dark:text-[#8B95A5] line-clamp-1">
                          {proj.description || proj.objective || "No objective set"}
                        </p>
                      </div>

                      <Link
                        href={`/co-ceo/projects/${proj.id}`}
                        className="px-3 py-1.5 rounded-[8px] bg-[#F8F9FA] dark:bg-[#111419] border border-[#E5E7EB] dark:border-[#272D36] text-[11.5px] font-bold text-[#17202A] dark:text-[#F2F4F7] hover:border-[#B28D18] transition-colors flex items-center gap-1 shrink-0"
                      >
                        <span>Open Project</span>
                        <ExternalLink className="w-3 h-3 text-[#B28D18]" />
                      </Link>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column (Span 1): Attention Required */}
          <div className="space-y-5">
            <div className="bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] rounded-[16px] overflow-hidden shadow-xs">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E5E7EB] dark:border-[#272D36] bg-[#F8F9FA] dark:bg-[#111419]">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-[#B28D18] dark:text-[#C9A52A]" />
                  <span className="text-[12px] font-bold text-[#17202A] dark:text-[#F2F4F7] uppercase tracking-wider">
                    ATTENTION REQUIRED
                  </span>
                </div>
                {attentionRequiredItems.length > 0 && (
                  <span className="w-5 h-5 rounded-full bg-[#B28D18] dark:bg-[#C9A52A] text-white dark:text-[#0B0D10] text-[10px] font-extrabold flex items-center justify-center">
                    {attentionRequiredItems.length}
                  </span>
                )}
              </div>

              <div className="divide-y divide-[#E5E7EB] dark:divide-[#272D36]">
                {loading ? (
                  <div className="p-5 space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-10 bg-[#F8F9FA] dark:bg-[#111419] rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : attentionRequiredItems.length === 0 ? (
                  <div className="p-6 text-center flex flex-col items-center justify-center space-y-1.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <p className="text-[12.5px] font-bold text-[#17202A] dark:text-[#F2F4F7]">ALL CLEAR</p>
                    <p className="text-[11.5px] text-[#667085] dark:text-[#8B95A5]">
                      Nothing currently requires your attention.
                    </p>
                  </div>
                ) : (
                  attentionRequiredItems.map((item) => (
                    <div
                      key={item.id}
                      className="px-5 py-3.5 hover:bg-[#F8F9FA] dark:hover:bg-[#111419]/60 transition-colors flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="text-[12.5px] font-bold text-[#17202A] dark:text-[#F2F4F7] truncate">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-[#667085] dark:text-[#8B95A5] truncate">
                          {item.subtext}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={item.onClick}
                        className="px-2.5 py-1 rounded-[7px] bg-[#B28D18]/10 dark:bg-[#C9A52A]/10 border border-[#B28D18]/20 dark:border-[#C9A52A]/20 text-[11px] font-bold text-[#B28D18] dark:text-[#C9A52A] hover:bg-[#B28D18]/20 transition-colors shrink-0"
                      >
                        {item.actionText}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Decline Reason Application Dialog ── */}
        {showDeclineModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] rounded-[16px] max-w-md w-full p-5 space-y-4 shadow-xl">
              <h3 className="text-[15px] font-bold text-[#17202A] dark:text-[#F2F4F7]">
                Decline Task Assignment
              </h3>
              <p className="text-[12px] text-[#667085] dark:text-[#8B95A5]">
                Please provide a brief reason for declining this assignment to notify your supervisor.
              </p>
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="Reason for declining assignment..."
                rows={3}
                className="w-full p-3 bg-[#F8F9FA] dark:bg-[#111419] border border-[#E5E7EB] dark:border-[#272D36] rounded-[10px] text-[12.5px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#B28D18]"
              />
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeclineModal(null);
                    setDeclineReason("");
                  }}
                  className="px-3.5 py-1.5 rounded-[8px] border border-[#E5E7EB] dark:border-[#272D36] text-[12px] font-bold text-[#17202A] dark:text-[#F2F4F7]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDeclineTask(showDeclineModal)}
                  disabled={!declineReason.trim() || decliningTaskId === showDeclineModal}
                  className="px-4 py-1.5 rounded-[8px] bg-rose-600 text-white text-[12px] font-bold disabled:opacity-50 flex items-center gap-1.5"
                >
                  {decliningTaskId === showDeclineModal && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm Decline</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Real Task Assignment Modal */}
        {selectedTaskId && (
          <TaskAssignmentModal
            taskId={selectedTaskId}
            isOpen={Boolean(selectedTaskId)}
            onClose={() => setSelectedTaskId(null)}
            onRefresh={fetchAllData}
          />
        )}

        {/* Real Project Assignment Modal */}
        {selectedProjectId && (
          <ProjectAssignmentModal
            projectId={selectedProjectId}
            isOpen={Boolean(selectedProjectId)}
            onClose={() => setSelectedProjectId(null)}
            onRefresh={fetchAllData}
          />
        )}

        {/* Task Creation Modal */}
        <TaskCreateModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreated={fetchAllData}
          role={userRole as any || "CO-CEO"}
          isPersonalWorkspace={true}
        />
      </div>
    </PullToRefresh>
  );
}


