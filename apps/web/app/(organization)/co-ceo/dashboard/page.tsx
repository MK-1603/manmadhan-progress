"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  CheckSquare, Users, Clock, AlertCircle, Loader2, Activity,
  Target, ChevronRight, ClipboardCheck, Bell,
  FolderKanban, Plus, RefreshCw, CheckCircle2, ShieldAlert,
  Calendar, ExternalLink, UserCheck
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { useSocket } from "@/components/providers/socket-provider";
import { useAuth } from "@/components/auth/auth-context";
import Link from "next/link";
import { TaskCreateModal } from "@/components/organization/task-create-modal";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { useRegisterRefresh } from "@/components/providers/global-refresh-provider";

interface TaskItem {
  id: string;
  title: string;
  status: string;
  priority?: string;
  deadline?: string | null;
  submittedAt?: string | null;
  projectName?: string;
  assigneeId?: string;
  assigneeName?: string;
  progressPercent?: number;
}

interface MemberCurrentTaskEntry {
  member: {
    id: string;
    name: string;
    avatar?: string | null;
  };
  currentTask?: {
    id: string;
    title: string;
    status: string;
    projectName?: string;
  } | null;
}

interface TimelineLog {
  id: string;
  eventType: string;
  humanizedTitle?: string;
  humanizedDescription?: string;
  details?: any;
  createdAt: string;
  userName?: string;
  userAvatar?: string | null;
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

function timeAgo(d: string | null | undefined) {
  if (!d) return "recently";
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getInitials(name?: string) {
  if (!name) return "U";
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function CoCeoDashboard() {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const [currentData, setCurrentData] = useState<{
    myCurrentTasks?: TaskItem[];
    memberCurrentTasks?: MemberCurrentTaskEntry[];
  } | null>(null);

  const [myTasks, setMyTasks] = useState<TaskItem[]>([]);
  const [pendingReviews, setPendingReviews] = useState<TaskItem[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<TimelineLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      setError(null);
      const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : null;
      if (!wsId) {
        setLoading(false);
        return;
      }

      const wsParam = `?workspaceId=${wsId}`;

      const [currentRes, tasksRes, approvalsRes, notifRes, timelineRes] = await Promise.all([
        apiClient.get(`/org/tasks/current${wsParam}`).catch(() => null),
        apiClient.get(`/org/tasks${wsParam}&assigneeId=${user?.id}`).catch(() => null),
        apiClient.get(`/org/approvals${wsParam}`).catch(() => null),
        apiClient.get("/notifications").catch(() => null),
        apiClient.get(`/org/timeline${wsParam}`).catch(() => null),
      ]);

      if (currentRes?.data?.success) {
        setCurrentData(currentRes.data.data);
      }
      if (tasksRes?.data?.success) {
        setMyTasks(Array.isArray(tasksRes.data.data) ? tasksRes.data.data : []);
      }
      if (approvalsRes?.data?.success) {
        setPendingReviews(Array.isArray(approvalsRes.data.data?.tasks) ? approvalsRes.data.data.tasks : []);
      }
      if (notifRes?.data?.success) {
        setNotifications(Array.isArray(notifRes.data.data) ? notifRes.data.data : []);
      }
      if (timelineRes?.data?.success) {
        const d = timelineRes.data.data;
        const events = Array.isArray(d?.events) ? d.events : Array.isArray(d) ? d : [];
        setActivityLogs(events);
      }
    } catch {
      setError("Unable to load executive dashboard. Please check backend connection.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.id]);

  useRegisterRefresh(fetchAll);

  useEffect(() => {
    if (user?.id) fetchAll();
  }, [fetchAll, user?.id]);

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => fetchAll();

    socket.on("task.updated", handleUpdate);
    socket.on("task.created", handleUpdate);
    socket.on("task.status_changed", handleUpdate);
    socket.on("TASK_ASSIGNED", handleUpdate);
    socket.on("TASK_STARTED", handleUpdate);
    socket.on("TASK_COMPLETED", handleUpdate);
    socket.on("TASK_SUBMITTED", handleUpdate);
    socket.on("MEMBER_ACTIVATED", handleUpdate);
    socket.on("approval.updated", handleUpdate);
    socket.on("notification.created", handleUpdate);
    socket.on("organization.updated", handleUpdate);

    return () => {
      socket.off("task.updated", handleUpdate);
      socket.off("task.created", handleUpdate);
      socket.off("task.status_changed", handleUpdate);
      socket.off("TASK_ASSIGNED", handleUpdate);
      socket.off("TASK_STARTED", handleUpdate);
      socket.off("TASK_COMPLETED", handleUpdate);
      socket.off("TASK_SUBMITTED", handleUpdate);
      socket.off("MEMBER_ACTIVATED", handleUpdate);
      socket.off("approval.updated", handleUpdate);
      socket.off("notification.created", handleUpdate);
      socket.off("organization.updated", handleUpdate);
    };
  }, [socket, fetchAll]);

  const handleManualRefresh = () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    fetchAll();
  };

  const memberCurrentTasks: MemberCurrentTaskEntry[] = currentData?.memberCurrentTasks || [];
  const myCurrentTasks: TaskItem[] = currentData?.myCurrentTasks || [];

  // Metrics computation from authoritative API results
  const kpis = useMemo(() => {
    const activeTasks = myTasks.filter((t) =>
      ["In Progress", "Assigned", "Accepted"].includes(t.status)
    );
    const membersWorking = memberCurrentTasks.filter((e) => !!e.currentTask).length;
    const dueSoonCount = myTasks.filter((t) => isDueSoon(t.deadline, t.status)).length;
    const overdueCount = myTasks.filter((t) => isOverdue(t.deadline, t.status)).length;
    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return {
      myActive: activeTasks.length,
      membersWorking,
      reviews: pendingReviews.length,
      dueSoon: dueSoonCount,
      overdue: overdueCount,
      unread: unreadCount,
    };
  }, [myTasks, memberCurrentTasks, pendingReviews, notifications]);

  // Actionable Attention Items
  const attentionItems = useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      subtext: string;
      type: "REVIEW" | "OVERDUE" | "DUE_SOON" | "ALERT";
      href: string;
      ctaText: string;
      timeAgoText?: string;
    }> = [];

    // 1. Pending Reviews
    pendingReviews.slice(0, 3).forEach((rev) => {
      items.push({
        id: `rev_${rev.id}`,
        title: `Review submission: ${rev.title}`,
        subtext: rev.assigneeName ? `Submitted by ${rev.assigneeName}` : "Pending executive sign-off",
        type: "REVIEW",
        href: "/co-ceo/submissions",
        ctaText: "Review",
        timeAgoText: timeAgo(rev.submittedAt),
      });
    });

    // 2. Overdue Tasks
    myTasks
      .filter((t) => isOverdue(t.deadline, t.status))
      .slice(0, 3)
      .forEach((t) => {
        items.push({
          id: `ovd_${t.id}`,
          title: `Overdue task: ${t.title}`,
          subtext: t.projectName ? `Project: ${t.projectName}` : "Requires immediate action",
          type: "OVERDUE",
          href: "/co-ceo/my-work",
          ctaText: "Open Task",
          timeAgoText: timeAgo(t.deadline),
        });
      });

    // 3. Due Soon Tasks
    myTasks
      .filter((t) => isDueSoon(t.deadline, t.status))
      .slice(0, 2)
      .forEach((t) => {
        items.push({
          id: `due_${t.id}`,
          title: `Due in < 24h: ${t.title}`,
          subtext: t.projectName ? `Project: ${t.projectName}` : "Approaching deadline",
          type: "DUE_SOON",
          href: "/co-ceo/my-work",
          ctaText: "View",
          timeAgoText: timeAgo(t.deadline),
        });
      });

    return items;
  }, [pendingReviews, myTasks]);

  // Queue of active assignments for "My Work"
  const activeQueue = useMemo(() => {
    if (myCurrentTasks.length > 0) return myCurrentTasks.slice(0, 5);
    return myTasks
      .filter((t) => !["Completed", "Approved", "CANCELLED", "RESOLVED"].includes(t.status))
      .slice(0, 5);
  }, [myCurrentTasks, myTasks]);

  const formattedDate = useMemo(() => {
    return new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, []);

  return (
    <PullToRefresh onRefresh={fetchAll}>
      <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-12 max-w-[1440px] mx-auto space-y-5">
        {/* ── Executive Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1 border-b border-[#E5E7EB] dark:border-[#272D36]">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <span className="text-[11px] font-bold text-[#B28D18] dark:text-[#C9A52A] uppercase tracking-wider">
                MANMADHAN · CO-CEO
              </span>
              <span className="text-gray-300 dark:text-gray-700">|</span>
              {/* Real-time Connection Status Indicator */}
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-bold border transition-colors ${
                  isConnected
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    : socket
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 animate-pulse"
                    : "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isConnected
                      ? "bg-emerald-500 animate-pulse"
                      : socket
                      ? "bg-amber-500"
                      : "bg-gray-400"
                  }`}
                />
                {isConnected ? "Live" : socket ? "Reconnecting" : "Offline"}
              </span>
            </div>

            <h1 className="text-[24px] sm:text-[26px] font-extrabold text-[#17202A] dark:text-[#F2F4F7] tracking-tight leading-none">
              {getGreeting()}, {user?.displayName || user?.name || "CO-CEO"}
            </h1>
            <p className="text-[12px] text-[#667085] dark:text-[#8B95A5] mt-1.5 flex items-center gap-2">
              <span>Manage execution, review member progress, and keep assigned work moving.</span>
              <span className="hidden md:inline text-gray-300 dark:text-gray-700">·</span>
              <span className="hidden md:inline text-[11.5px] font-medium text-[#17202A] dark:text-[#F2F4F7]">
                {formattedDate}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 h-[40px] rounded-[10px] bg-[#B28D18] hover:bg-[#967412] dark:bg-[#C9A52A] dark:hover:bg-[#B28D18] text-white dark:text-[#0B0D10] text-[12.5px] font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Assign Task</span>
            </button>

            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="flex items-center justify-center w-[40px] h-[40px] rounded-[10px] bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] text-[#17202A] dark:text-[#F2F4F7] hover:border-[#B28D18] dark:hover:border-[#C9A52A] transition-colors cursor-pointer disabled:opacity-50"
              aria-label="Refresh Dashboard Data"
              title="Refresh Dashboard Data"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-[#B28D18] dark:text-[#C9A52A]" : ""}`} />
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 bg-rose-500/10 border border-rose-500/20 rounded-[12px] text-[12.5px] font-semibold text-rose-600 dark:text-rose-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ── KPI Metric Strip (6 Compact Executive Cards) ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            {
              label: "MY ACTIVE WORK",
              value: kpis.myActive,
              subtext: "In Progress",
              href: "/co-ceo/my-work",
              highlight: kpis.myActive > 0,
            },
            {
              label: "MEMBERS ACTIVE",
              value: kpis.membersWorking,
              subtext: `${kpis.membersWorking} working now`,
              href: "/co-ceo/members",
              highlight: kpis.membersWorking > 0,
            },
            {
              label: "PENDING REVIEWS",
              value: kpis.reviews,
              subtext: kpis.reviews > 0 ? "Needs attention" : "All clear",
              href: "/co-ceo/submissions",
              highlight: kpis.reviews > 0,
              badgeColor: kpis.reviews > 0 ? "text-amber-600 dark:text-amber-400" : undefined,
            },
            {
              label: "DUE SOON",
              value: kpis.dueSoon,
              subtext: "Next 24 hours",
              href: "/co-ceo/my-work",
              highlight: kpis.dueSoon > 0,
            },
            {
              label: "OVERDUE",
              value: kpis.overdue,
              subtext: kpis.overdue > 0 ? "Requires action" : "Zero overdue",
              href: "/co-ceo/my-work",
              highlight: kpis.overdue > 0,
              badgeColor: kpis.overdue > 0 ? "text-rose-600 dark:text-rose-400 font-bold" : undefined,
            },
            {
              label: "UNREAD ALERTS",
              value: kpis.unread,
              subtext: "Notifications",
              href: "/co-ceo/notifications",
              highlight: kpis.unread > 0,
            },
          ].map((item) => (
            <Link key={item.label} href={item.href} className="group block">
              <div className="bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] group-hover:border-[#B28D18] dark:group-hover:border-[#C9A52A] rounded-[14px] p-3.5 transition-all shadow-xs flex flex-col justify-between h-full">
                <p className="text-[10px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider">
                  {item.label}
                </p>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-[26px] font-extrabold text-[#17202A] dark:text-[#F2F4F7] font-mono leading-none">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin text-[#B28D18] dark:text-[#C9A52A]" /> : item.value}
                  </span>
                </div>
                <p className={`text-[11px] mt-1.5 font-medium ${item.badgeColor || "text-[#667085] dark:text-[#8B95A5]"}`}>
                  {item.subtext}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* ── Main Execution Grid (2-Column Desktop Layout) ── */}
        <div className="grid lg:grid-cols-3 gap-5 items-start">
          {/* Left Column (Span 2): My Work Queue + Team Execution */}
          <div className="lg:col-span-2 space-y-5">
            {/* ── MY WORK (Execution Queue) ── */}
            <div className="bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] rounded-[16px] overflow-hidden shadow-xs">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E5E7EB] dark:border-[#272D36] bg-[#F8F9FA] dark:bg-[#111419]">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-[#B28D18] dark:text-[#C9A52A]" />
                  <span className="text-[12px] font-bold text-[#17202A] dark:text-[#F2F4F7] uppercase tracking-wider">
                    MY WORK
                  </span>
                </div>
                <Link
                  href="/co-ceo/my-work"
                  className="flex items-center gap-1 text-[11.5px] font-bold text-[#B28D18] dark:text-[#C9A52A] hover:underline transition-colors"
                >
                  View all <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="divide-y divide-[#E5E7EB] dark:divide-[#272D36]">
                {loading ? (
                  <div className="p-5 space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-10 bg-[#F8F9FA] dark:bg-[#111419] rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : activeQueue.length === 0 ? (
                  <div className="p-6 text-center flex flex-col items-center justify-center space-y-2">
                    <div className="w-9 h-9 rounded-full bg-[#B28D18]/10 dark:bg-[#C9A52A]/10 text-[#B28D18] dark:text-[#C9A52A] flex items-center justify-center">
                      <CheckSquare className="w-4.5 h-4.5" />
                    </div>
                    <p className="text-[13px] font-bold text-[#17202A] dark:text-[#F2F4F7]">No active assignments</p>
                    <p className="text-[12px] text-[#667085] dark:text-[#8B95A5]">You are clear for now.</p>
                    <Link
                      href="/co-ceo/my-work"
                      className="mt-1 px-3 py-1.5 rounded-[8px] bg-[#F8F9FA] dark:bg-[#111419] border border-[#E5E7EB] dark:border-[#272D36] text-[11.5px] font-bold text-[#17202A] dark:text-[#F2F4F7] hover:border-[#B28D18] cursor-pointer"
                    >
                      View Tasks
                    </Link>
                  </div>
                ) : (
                  activeQueue.map((t) => {
                    const overdue = isOverdue(t.deadline, t.status);
                    return (
                      <div
                        key={t.id}
                        className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-[#F8F9FA] dark:hover:bg-[#111419]/60 transition-colors"
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-bold text-[#17202A] dark:text-[#F2F4F7] truncate">
                              {t.title}
                            </span>
                            {t.priority && (
                              <span
                                className={`px-2 py-0.2 rounded-full text-[9.5px] font-bold uppercase ${
                                  t.priority === "High"
                                    ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                                    : "bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-500/20"
                                }`}
                              >
                                {t.priority}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-[#667085] dark:text-[#8B95A5]">
                            {t.projectName && (
                              <span className="flex items-center gap-1">
                                <FolderKanban className="w-3 h-3 text-[#B28D18] dark:text-[#C9A52A]" />
                                {t.projectName}
                              </span>
                            )}
                            {t.deadline && (
                              <span className={`flex items-center gap-1 ${overdue ? "font-bold text-rose-600 dark:text-rose-400" : ""}`}>
                                <Clock className="w-3 h-3" />
                                {new Date(t.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-3">
                          <span className="px-2.5 py-1 rounded-[7px] bg-[#F8F9FA] dark:bg-[#111419] border border-[#E5E7EB] dark:border-[#272D36] text-[11px] font-bold text-[#17202A] dark:text-[#F2F4F7]">
                            {t.status}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* ── TEAM EXECUTION (CO-CEO Scope Only) ── */}
            <div className="bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] rounded-[16px] overflow-hidden shadow-xs">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E5E7EB] dark:border-[#272D36] bg-[#F8F9FA] dark:bg-[#111419]">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#B28D18] dark:text-[#C9A52A]" />
                  <span className="text-[12px] font-bold text-[#17202A] dark:text-[#F2F4F7] uppercase tracking-wider">
                    TEAM EXECUTION
                  </span>
                </div>
                <Link
                  href="/co-ceo/members"
                  className="flex items-center gap-1 text-[11.5px] font-bold text-[#B28D18] dark:text-[#C9A52A] hover:underline transition-colors"
                >
                  View team <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="divide-y divide-[#E5E7EB] dark:divide-[#272D36]">
                {loading ? (
                  <div className="p-5 space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-10 bg-[#F8F9FA] dark:bg-[#111419] rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : memberCurrentTasks.length === 0 ? (
                  <div className="p-6 text-center flex flex-col items-center justify-center space-y-2">
                    <div className="w-9 h-9 rounded-full bg-[#B28D18]/10 dark:bg-[#C9A52A]/10 text-[#B28D18] dark:text-[#C9A52A] flex items-center justify-center">
                      <Users className="w-4.5 h-4.5" />
                    </div>
                    <p className="text-[13px] font-bold text-[#17202A] dark:text-[#F2F4F7]">No team members assigned</p>
                    <p className="text-[12px] text-[#667085] dark:text-[#8B95A5]">
                      Your team will appear here once members are assigned to you.
                    </p>
                    <Link
                      href="/co-ceo/organization/people"
                      className="mt-1 px-3 py-1.5 rounded-[8px] bg-[#F8F9FA] dark:bg-[#111419] border border-[#E5E7EB] dark:border-[#272D36] text-[11.5px] font-bold text-[#17202A] dark:text-[#F2F4F7] hover:border-[#B28D18] cursor-pointer"
                    >
                      View People
                    </Link>
                  </div>
                ) : (
                  memberCurrentTasks.map((entry) => {
                    const isWorking = !!entry.currentTask;
                    return (
                      <div
                        key={entry.member.id}
                        className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-[#F8F9FA] dark:hover:bg-[#111419]/60 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-[#B28D18]/10 dark:bg-[#C9A52A]/10 border border-[#B28D18]/20 dark:border-[#C9A52A]/20 flex items-center justify-center text-[11px] font-bold text-[#B28D18] dark:text-[#C9A52A] shrink-0">
                            {getInitials(entry.member.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[12.5px] font-bold text-[#17202A] dark:text-[#F2F4F7] truncate">
                              {entry.member.name}
                            </p>
                            {isWorking ? (
                              <p className="text-[11px] text-[#667085] dark:text-[#8B95A5] truncate">
                                → {entry.currentTask?.title}
                              </p>
                            ) : (
                              <p className="text-[11px] text-[#667085]/60 dark:text-[#8B95A5]/60 italic">
                                Idle
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border ${
                              isWorking
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                : "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isWorking ? "bg-emerald-500 animate-pulse" : "bg-gray-400"
                              }`}
                            />
                            {isWorking ? "Working" : "Idle"}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Right Column (Span 1): Attention Required + Live Activity */}
          <div className="space-y-5">
            {/* ── ATTENTION REQUIRED (Actionable Executive Panel) ── */}
            <div className="bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] rounded-[16px] overflow-hidden shadow-xs">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E5E7EB] dark:border-[#272D36] bg-[#F8F9FA] dark:bg-[#111419]">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-[#B28D18] dark:text-[#C9A52A]" />
                  <span className="text-[12px] font-bold text-[#17202A] dark:text-[#F2F4F7] uppercase tracking-wider">
                    ATTENTION REQUIRED
                  </span>
                </div>
                {attentionItems.length > 0 && (
                  <span className="w-5 h-5 rounded-full bg-[#B28D18] dark:bg-[#C9A52A] text-white dark:text-[#0B0D10] text-[10px] font-extrabold flex items-center justify-center">
                    {attentionItems.length}
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
                ) : attentionItems.length === 0 ? (
                  <div className="p-6 text-center flex flex-col items-center justify-center space-y-1.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <p className="text-[12.5px] font-bold text-[#17202A] dark:text-[#F2F4F7]">All clear</p>
                    <p className="text-[11.5px] text-[#667085] dark:text-[#8B95A5]">No action is currently required.</p>
                  </div>
                ) : (
                  attentionItems.map((item) => (
                    <div
                      key={item.id}
                      className="px-5 py-3.5 hover:bg-[#F8F9FA] dark:hover:bg-[#111419]/60 transition-colors flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[12.5px] font-bold text-[#17202A] dark:text-[#F2F4F7] truncate">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-[#667085] dark:text-[#8B95A5] truncate mt-0.5">
                          {item.subtext}
                        </p>
                      </div>
                      <Link
                        href={item.href}
                        className="px-2.5 py-1 rounded-[7px] bg-[#B28D18]/10 dark:bg-[#C9A52A]/10 border border-[#B28D18]/20 dark:border-[#C9A52A]/20 text-[11px] font-bold text-[#B28D18] dark:text-[#C9A52A] hover:bg-[#B28D18]/20 transition-colors shrink-0"
                      >
                        {item.ctaText}
                      </Link>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* ── LIVE ACTIVITY (Timeline Feed) ── */}
            <div className="bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] rounded-[16px] overflow-hidden shadow-xs">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E5E7EB] dark:border-[#272D36] bg-[#F8F9FA] dark:bg-[#111419]">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#B28D18] dark:text-[#C9A52A]" />
                  <span className="text-[12px] font-bold text-[#17202A] dark:text-[#F2F4F7] uppercase tracking-wider">
                    LIVE ACTIVITY
                  </span>
                </div>
                <Link
                  href="/co-ceo/timeline"
                  className="flex items-center gap-1 text-[11.5px] font-bold text-[#B28D18] dark:text-[#C9A52A] hover:underline transition-colors"
                >
                  View timeline <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="divide-y divide-[#E5E7EB] dark:divide-[#272D36]">
                {loading ? (
                  <div className="p-5 space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-10 bg-[#F8F9FA] dark:bg-[#111419] rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : !Array.isArray(activityLogs) || activityLogs.length === 0 ? (
                  <div className="p-6 text-center flex flex-col items-center justify-center space-y-1.5">
                    <Activity className="w-5 h-5 text-[#667085]/40 dark:text-[#8B95A5]/40" />
                    <p className="text-[12.5px] font-bold text-[#17202A] dark:text-[#F2F4F7]">No recent activity</p>
                  </div>
                ) : (
                  (Array.isArray(activityLogs) ? activityLogs : []).slice(0, 5).map((log: any) => {
                    const actorName = log.actor?.name || log.userName || "User";
                    const titleText = log.title || log.humanizedTitle || log.eventType || "Activity";
                    return (
                      <div
                        key={log.id || String(Math.random())}
                        className="px-5 py-3 hover:bg-[#F8F9FA] dark:hover:bg-[#111419]/60 transition-colors flex items-start gap-2.5"
                      >
                        <div className="w-6 h-6 rounded-full bg-[#B28D18]/10 dark:bg-[#C9A52A]/10 border border-[#B28D18]/20 dark:border-[#C9A52A]/20 flex items-center justify-center text-[9.5px] font-bold text-[#B28D18] dark:text-[#C9A52A] shrink-0 mt-0.5">
                          {getInitials(actorName)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] font-medium text-[#17202A] dark:text-[#F2F4F7] leading-snug">
                            <span className="font-bold">{actorName}</span>{" "}
                            <span>{titleText}</span>
                          </p>
                          <p className="text-[10.5px] text-[#667085] dark:text-[#8B95A5] mt-0.5">
                            {timeAgo(log.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Task Creation Modal ── */}
        <TaskCreateModal
          isOpen={showCreate}
          onClose={() => setShowCreate(false)}
          onCreated={fetchAll}
          role="CO-CEO"
        />
      </div>
    </PullToRefresh>
  );
}

