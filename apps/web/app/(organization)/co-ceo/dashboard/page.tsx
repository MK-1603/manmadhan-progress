"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CheckSquare, Users, Clock, AlertCircle, Loader2, Activity,
  Target, ChevronRight, ClipboardCheck, TrendingUp, Play, Bell,
  Circle, FolderKanban, Plus, RefreshCw
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { useSocket } from "@/components/providers/socket-provider";
import { PremiumCard } from "@/components/ui/premium-card";
import { useAuth } from "@/components/auth/auth-context";
import { motion } from "framer-motion";
import Link from "next/link";
import { TaskCreateModal } from "@/components/organization/task-create-modal";

const statusColor = (s: string) => {
  const m: Record<string, string> = {
    "In Progress": "text-amber-500 bg-amber-500/10 border-amber-500/20",
    "Accepted": "text-blue-500 bg-blue-500/10 border-blue-500/20",
    "Review": "text-purple-500 bg-purple-500/10 border-purple-500/20",
    "Assigned": "text-blue-400 bg-blue-400/10 border-blue-400/20",
    "Completed": "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    "Blocked": "text-rose-500 bg-rose-500/10 border-rose-500/20",
    "Approved": "text-emerald-600 bg-emerald-600/10 border-emerald-600/20",
  };
  return m[s] || "text-muted-foreground bg-muted border-border";
};

const priorityDot = (p: string) => {
  const m: Record<string, string> = {
    "Urgent": "bg-rose-500",
    "High": "bg-orange-500",
    "Medium": "bg-amber-500",
    "Low": "bg-muted-foreground",
  };
  return m[p] || "bg-muted-foreground";
};

function isOverdue(deadline: string | null, status: string) {
  if (!deadline) return false;
  if (["Approved", "Completed"].includes(status)) return false;
  return new Date(deadline) < new Date();
}

function timeAgo(d: string) {
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

export default function CoCeoDashboard() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [currentData, setCurrentData] = useState<any>(null);
  const [myTasks, setMyTasks] = useState<any[]>([]);
  const [pendingReviews, setPendingReviews] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      if (!workspaceId) return;
      const [currentRes, tasksRes, approvalsRes, notifRes] = await Promise.all([
        apiClient.get(`/org/tasks/current?workspaceId=${workspaceId}`),
        apiClient.get(`/org/tasks?workspaceId=${workspaceId}&assigneeId=${user?.id}`),
        apiClient.get(`/org/approvals?workspaceId=${workspaceId}`),
        apiClient.get("/notifications"),
      ]);
      if (currentRes.data.success) setCurrentData(currentRes.data.data);
      if (tasksRes.data.success) setMyTasks(tasksRes.data.data || []);
      if (approvalsRes.data.success) setPendingReviews(approvalsRes.data.data?.tasks || []);
      if (notifRes.data.success) setNotifications((notifRes.data.data || []).slice(0, 5));
    } catch {
      setError("Unable to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { if (user?.id) fetchAll(); }, [fetchAll, user?.id]);

  useEffect(() => {
    if (!socket) return;
    socket.on("task.updated", fetchAll);
    socket.on("task.created", fetchAll);
    socket.on("MEMBER_ACTIVATED", fetchAll);
    socket.on("approval.updated", fetchAll);
    socket.on("notification.created", fetchAll);
    return () => {
      socket.off("task.updated");
      socket.off("task.created");
      socket.off("MEMBER_ACTIVATED");
      socket.off("approval.updated");
      socket.off("notification.created");
    };
  }, [socket, fetchAll]);

  const memberCurrentTasks: any[] = currentData?.memberCurrentTasks || [];
  const myCurrentTasks: any[] = currentData?.myCurrentTasks || [];

  const kpis = {
    myActiveTasks: myTasks.filter(t => ["In Progress", "Assigned", "Accepted"].includes(t.status)).length,
    assignedToMembers: memberCurrentTasks.filter(e => e.currentTask).length,
    pendingReviews: pendingReviews.length,
    overdueTasks: myTasks.filter(t => isOverdue(t.deadline, t.status)).length,
    activeMembers: memberCurrentTasks.length,
    unreadNotifications: notifications.filter(n => !n.isRead).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1440px] mx-auto w-full space-y-6">

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/20">
              CO-CEO
            </span>
            <span className="text-xs text-muted-foreground">Organization Workspace</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            {getGreeting()}, {user?.displayName || user?.name || "CO-CEO"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long", year: "numeric", month: "long", day: "numeric",
            })}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> Assign Task
          </button>
          <button
            onClick={fetchAll}
            className="p-2 rounded-lg border border-border hover:bg-accent transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* ── KPI Strip ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "My Active Tasks", value: kpis.myActiveTasks, color: "text-foreground", icon: CheckSquare, href: "/co-ceo/my-work" },
          { label: "Members Working", value: kpis.assignedToMembers, color: "text-emerald-500", icon: Users, href: "/co-ceo/members" },
          { label: "Pending Reviews", value: kpis.pendingReviews, color: "text-purple-500", icon: ClipboardCheck, href: "/co-ceo/submissions" },
          { label: "Overdue", value: kpis.overdueTasks, color: "text-rose-500", icon: AlertCircle, href: "/co-ceo/my-work?tab=overdue" },
          { label: "Active Members", value: kpis.activeMembers, color: "text-blue-500", icon: Activity, href: "/co-ceo/members" },
          { label: "Unread Alerts", value: kpis.unreadNotifications, color: "text-amber-500", icon: Bell, href: "/co-ceo/notifications" },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Link href={s.href}>
              <PremiumCard className="p-4 hover:border-border/80 transition-colors cursor-pointer">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] text-muted-foreground font-medium leading-snug">{s.label}</p>
                  <s.icon className={`w-3.5 h-3.5 ${s.color} shrink-0`} />
                </div>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              </PremiumCard>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* ── Main Grid ─────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* LEFT col — My Work + Member Progress */}
        <div className="lg:col-span-2 space-y-6">

          {/* My Current Tasks */}
          <PremiumCard className="p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Target className="w-4 h-4 text-purple-400" />
                My Work
              </h2>
              <Link
                href="/co-ceo/my-work"
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                View all <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-border">
              {myCurrentTasks.length === 0 && myTasks.filter(t => !["Completed", "Approved"].includes(t.status)).length === 0 ? (
                <div className="p-8 text-center">
                  <CheckSquare className="w-7 h-7 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No active tasks assigned to you</p>
                </div>
              ) : (
                (myCurrentTasks.length > 0 ? myCurrentTasks : myTasks.filter(t => !["Completed", "Approved"].includes(t.status)))
                  .slice(0, 5)
                  .map((t: any) => (
                    <div key={t.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-accent/20 transition-colors">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${priorityDot(t.priority)}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{t.title}</p>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5 flex-wrap">
                          {t.projectName && <span className="flex items-center gap-0.5"><FolderKanban className="w-2.5 h-2.5" /> {t.projectName}</span>}
                          {t.deadline && (
                            <span className={isOverdue(t.deadline, t.status) ? "text-rose-500 font-semibold" : ""}>
                              Due {new Date(t.deadline).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${statusColor(t.status)}`}>
                        {t.status}
                      </span>
                    </div>
                  ))
              )}
            </div>
          </PremiumCard>

          {/* Member Progress */}
          <PremiumCard className="p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                Team Progress
              </h2>
              <Link
                href="/co-ceo/members"
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                View team <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-border">
              {memberCurrentTasks.length === 0 ? (
                <div className="p-8 text-center">
                  <Users className="w-7 h-7 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No team members assigned yet</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Ask the CEO to assign members under your management.</p>
                </div>
              ) : (
                memberCurrentTasks.slice(0, 6).map((entry: any) => (
                  <div key={entry.member.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-accent/20 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xs font-bold text-emerald-500 shrink-0">
                      {(entry.member.name || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground">{entry.member.name}</p>
                      {entry.currentTask ? (
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          → {entry.currentTask.title}
                        </p>
                      ) : (
                        <p className="text-[11px] text-muted-foreground/50 italic mt-0.5">Idle</p>
                      )}
                    </div>
                    {entry.currentTask ? (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${statusColor(entry.currentTask.status)}`}>
                        {entry.currentTask.status}
                      </span>
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-muted-foreground/30 shrink-0" />
                    )}
                  </div>
                ))
              )}
            </div>
          </PremiumCard>
        </div>

        {/* RIGHT col — Pending Reviews + Notifications */}
        <div className="space-y-6">

          {/* Pending Reviews */}
          <PremiumCard className="p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-purple-400" />
                Pending Reviews
                {pendingReviews.length > 0 && (
                  <span className="w-5 h-5 rounded-full bg-purple-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {pendingReviews.length}
                  </span>
                )}
              </h2>
              <Link
                href="/co-ceo/submissions"
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                Review <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-border">
              {pendingReviews.length === 0 ? (
                <div className="p-6 text-center">
                  <ClipboardCheck className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No pending submissions</p>
                </div>
              ) : (
                pendingReviews.slice(0, 4).map((task: any) => (
                  <div key={task.id} className="px-5 py-3.5 hover:bg-accent/20 transition-colors">
                    <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] text-muted-foreground">{task.assigneeName || "Member"}</span>
                      {task.submittedAt && (
                        <span className="text-[11px] text-muted-foreground">· {timeAgo(task.submittedAt)}</span>
                      )}
                    </div>
                    <Link
                      href="/co-ceo/submissions"
                      className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-purple-500 hover:text-purple-400 transition-colors"
                    >
                      Review now <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                ))
              )}
            </div>
          </PremiumCard>

          {/* Recent Notifications */}
          <PremiumCard className="p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Bell className="w-4 h-4 text-purple-400" />
                Notifications
              </h2>
              <Link
                href="/co-ceo/notifications"
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                All <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-border">
              {notifications.length === 0 ? (
                <div className="p-6 text-center">
                  <Bell className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No notifications</p>
                </div>
              ) : (
                notifications.map((n: any) => (
                  <div
                    key={n.id}
                    className={`px-5 py-3 hover:bg-accent/20 transition-colors ${!n.isRead ? "border-l-2 border-l-purple-500" : ""}`}
                  >
                    <p className={`text-xs font-medium ${!n.isRead ? "text-foreground" : "text-muted-foreground"}`}>
                      {n.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(n.createdAt)}</p>
                  </div>
                ))
              )}
            </div>
          </PremiumCard>
        </div>
      </div>

      {/* ── Task Create Modal ─────────────────────────────────── */}
      <TaskCreateModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={fetchAll}
        role="CO-CEO"
      />
    </div>
  );
}
