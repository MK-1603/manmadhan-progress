"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CheckSquare, Users, Clock, AlertCircle, Loader2, Activity,
  Target, ChevronRight, ClipboardCheck, Bell,
  FolderKanban, Plus, RefreshCw, LoaderCircle,
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { useSocket } from "@/components/providers/socket-provider";
import { useAuth } from "@/components/auth/auth-context";
import Link from "next/link";
import { TaskCreateModal } from "@/components/organization/task-create-modal";

function isOverdue(deadline: string | null, status: string) {
  if (!deadline) return false;
  if (["Approved","Completed"].includes(status)) return false;
  return new Date(deadline) < new Date();
}
function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60)    return "just now";
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
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
  const { user }   = useAuth();
  const { socket } = useSocket();
  const [currentData, setCurrentData]       = useState<any>(null);
  const [myTasks, setMyTasks]               = useState<any[]>([]);
  const [pendingReviews, setPendingReviews] = useState<any[]>([]);
  const [notifications, setNotifications]   = useState<any[]>([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState("");
  const [showCreate, setShowCreate]         = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const wsId = localStorage.getItem("workspaceId");
      if (!wsId) return;
      const [currentRes, tasksRes, approvalsRes, notifRes] = await Promise.all([
        apiClient.get(`/org/tasks/current?workspaceId=${wsId}`),
        apiClient.get(`/org/tasks?workspaceId=${wsId}&assigneeId=${user?.id}`),
        apiClient.get(`/org/approvals?workspaceId=${wsId}`),
        apiClient.get("/notifications"),
      ]);
      if (currentRes.data.success)   setCurrentData(currentRes.data.data);
      if (tasksRes.data.success)     setMyTasks(tasksRes.data.data || []);
      if (approvalsRes.data.success) setPendingReviews(approvalsRes.data.data?.tasks || []);
      if (notifRes.data.success)     setNotifications((notifRes.data.data || []).slice(0, 5));
    } catch { setError("Unable to load dashboard data."); }
    finally  { setLoading(false); }
  }, [user?.id]);

  useEffect(() => { if (user?.id) fetchAll(); }, [fetchAll, user?.id]);
  useEffect(() => {
    if (!socket) return;
    socket.on("task.updated",     fetchAll);
    socket.on("task.created",     fetchAll);
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
  const myCurrentTasks: any[]    = currentData?.myCurrentTasks || [];

  const kpis = {
    myActive:    myTasks.filter(t => ["In Progress","Assigned","Accepted"].includes(t.status)).length,
    membersOn:   memberCurrentTasks.filter((e: any) => e.currentTask).length,
    reviews:     pendingReviews.length,
    overdue:     myTasks.filter(t => isOverdue(t.deadline, t.status)).length,
    activeTeam:  memberCurrentTasks.length,
    unread:      notifications.filter(n => !n.isRead).length,
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full bg-background">
      <LoaderCircle className="w-5 h-5 text-gold animate-spin" />
    </div>
  );

  return (
    <div className="px-5 md:px-8 xl:px-10 pt-7 pb-16 max-w-[1440px] mx-auto space-y-6">

      {/* ── header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
            ManMadhan · CO-CEO
          </p>
          <h1 className="text-[26px] sm:text-[28px] font-bold text-foreground tracking-tight leading-none">
            {getGreeting()}, {user?.displayName || user?.name || "CO-CEO"}
          </h1>
          <p className="text-[12px] text-muted-foreground mt-2">
            {new Date().toLocaleDateString("en-US", { weekday:"long", year:"numeric", month:"long", day:"numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gold hover:bg-gold-hover text-[#111827] text-[12px] font-bold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Assign Task
          </button>
          <button onClick={fetchAll} className="p-2 rounded-xl border border-border bg-card hover:bg-muted transition-colors" aria-label="Refresh">
            <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-card border border-border rounded-xl text-[12px] text-muted-foreground">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
        </div>
      )}

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "My Active Tasks",  value: kpis.myActive,   href: "/co-ceo/my-work" },
          { label: "Members Working",  value: kpis.membersOn,  href: "/co-ceo/members" },
          { label: "Pending Reviews",  value: kpis.reviews,    href: "/co-ceo/submissions" },
          { label: "Overdue",          value: kpis.overdue,    href: "/co-ceo/my-work" },
          { label: "Active Members",   value: kpis.activeTeam, href: "/co-ceo/members" },
          { label: "Unread Alerts",    value: kpis.unread,     href: "/co-ceo/notifications" },
        ].map(s => (
          <Link key={s.label} href={s.href}>
            <div className="bg-card border border-border rounded-2xl p-4 hover:bg-muted/30 transition-colors">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{s.label}</p>
              <p className="text-[28px] font-bold text-foreground font-mono leading-none mt-1.5">{s.value}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* ── main grid ── */}
      <div className="grid lg:grid-cols-3 gap-5">

        {/* left: my work + team progress */}
        <div className="lg:col-span-2 space-y-5">

          {/* my current tasks */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Target className="w-3.5 h-3.5" /> My Work
              </span>
              <Link href="/co-ceo/my-work" className="flex items-center gap-0.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors">
                View all <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-border">
              {myCurrentTasks.length === 0 && myTasks.filter(t => !["Completed","Approved"].includes(t.status)).length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <CheckSquare className="w-5 h-5 text-muted-foreground/30" />
                  <p className="text-[13px] font-semibold text-foreground">No active tasks</p>
                </div>
              ) : (
                (myCurrentTasks.length > 0 ? myCurrentTasks : myTasks.filter(t => !["Completed","Approved"].includes(t.status)))
                  .slice(0, 5)
                  .map((t: any) => (
                    <div key={t.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/20 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-foreground truncate">{t.title}</p>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5 flex-wrap">
                          {t.projectName && <span className="flex items-center gap-0.5"><FolderKanban className="w-2.5 h-2.5" /> {t.projectName}</span>}
                          {t.deadline && (
                            <span className={isOverdue(t.deadline, t.status) ? "font-semibold text-foreground" : ""}>
                              {new Date(t.deadline).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-muted text-muted-foreground border border-border shrink-0">
                        {t.status}
                      </span>
                    </div>
                  ))
              )}
            </div>
          </div>

          {/* team progress */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Users className="w-3.5 h-3.5" /> Team Progress
              </span>
              <Link href="/co-ceo/members" className="flex items-center gap-0.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors">
                View team <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-border">
              {memberCurrentTasks.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <Users className="w-5 h-5 text-muted-foreground/30" />
                  <p className="text-[13px] font-semibold text-foreground">No team members yet</p>
                  <p className="text-[12px] text-muted-foreground">Ask the CEO to assign members under your management.</p>
                </div>
              ) : (
                memberCurrentTasks.slice(0, 6).map((entry: any) => (
                  <div key={entry.member.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/20 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center text-[11px] font-bold text-foreground shrink-0">
                      {(entry.member.name || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-foreground">{entry.member.name}</p>
                      {entry.currentTask ? (
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">→ {entry.currentTask.title}</p>
                      ) : (
                        <p className="text-[11px] text-muted-foreground/50 italic mt-0.5">Idle</p>
                      )}
                    </div>
                    {entry.currentTask ? (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-muted text-muted-foreground border border-border shrink-0">
                        {entry.currentTask.status}
                      </span>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* right: reviews + notifications */}
        <div className="space-y-5">

          {/* pending reviews */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                  <ClipboardCheck className="w-3.5 h-3.5" /> Pending Reviews
                </span>
                {pendingReviews.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-gold text-[#111827] text-[9px] font-bold flex items-center justify-center">
                    {pendingReviews.length}
                  </span>
                )}
              </div>
              <Link href="/co-ceo/submissions" className="flex items-center gap-0.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors">
                Review <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-border">
              {pendingReviews.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <ClipboardCheck className="w-5 h-5 text-muted-foreground/30" />
                  <p className="text-[12px] text-muted-foreground">No pending submissions</p>
                </div>
              ) : (
                pendingReviews.slice(0, 4).map((task: any) => (
                  <div key={task.id} className="px-5 py-3.5 hover:bg-muted/20 transition-colors">
                    <p className="text-[13px] font-semibold text-foreground truncate">{task.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                      {task.assigneeName && <span>{task.assigneeName}</span>}
                      {task.submittedAt && <span>· {timeAgo(task.submittedAt)}</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* notifications */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5" /> Notifications
              </span>
              <Link href="/co-ceo/notifications" className="flex items-center gap-0.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors">
                All <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-border">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <Bell className="w-5 h-5 text-muted-foreground/30" />
                  <p className="text-[12px] text-muted-foreground">No notifications</p>
                </div>
              ) : (
                notifications.map((n: any) => (
                  <div key={n.id} className={`px-5 py-3.5 hover:bg-muted/20 transition-colors ${!n.isRead ? "border-l-2 border-l-gold" : ""}`}>
                    <p className={`text-[12px] font-semibold truncate ${n.isRead ? "text-muted-foreground" : "text-foreground"}`}>{n.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(n.createdAt)}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <TaskCreateModal isOpen={showCreate} onClose={() => setShowCreate(false)} onCreated={fetchAll} role="CO-CEO" />
    </div>
  );
}
