"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CheckSquare, Clock, AlertCircle, Loader2,
  Target, Activity, Bell, ChevronRight,
  Circle, FolderKanban, RefreshCw, LoaderCircle,
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { useSocket } from "@/components/providers/socket-provider";
import { useAuth } from "@/components/auth/auth-context";
import Link from "next/link";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
function isToday(d: string | null) {
  if (!d) return false;
  return new Date(d).toDateString() === new Date().toDateString();
}
function isOverdue(deadline: string | null, status: string) {
  if (!deadline) return false;
  if (["Approved","Completed"].includes(status)) return false;
  return new Date(deadline) < new Date();
}
function daysLeft(d: string) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}
function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60)    return "just now";
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function MemberDashboard() {
  const { user }   = useAuth();
  const { socket } = useSocket();

  const [tasks, setTasks]               = useState<any[]>([]);
  const [currentData, setCurrentData]   = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [myScore, setMyScore]           = useState(0);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");

  const fetchAll = useCallback(async () => {
    try {
      const wid = localStorage.getItem("workspaceId");
      if (!wid) return;
      const [tasksRes, currentRes, notifRes, lbRes] = await Promise.all([
        apiClient.get(`/org/tasks?workspaceId=${wid}`),
        apiClient.get(`/org/tasks/current?workspaceId=${wid}`),
        apiClient.get("/notifications"),
        apiClient.get(`/org/reports/leaderboard?workspaceId=${wid}&period=weekly`),
      ]);
      if (tasksRes.data.success)   setTasks(tasksRes.data.data || []);
      if (currentRes.data.success) setCurrentData(currentRes.data.data);
      if (notifRes.data.success)   setNotifications((notifRes.data.data || []).filter((n: any) => !n.isRead).slice(0, 4));
      if (lbRes.data.success) {
        const me = (lbRes.data.data.leaderboard || []).find((e: any) => e.id === user?.id);
        if (me) setMyScore(me.score);
      }
    } catch { setError("Unable to load dashboard."); }
    finally   { setLoading(false); }
  }, [user?.id]);

  useEffect(() => { if (user?.id) fetchAll(); }, [fetchAll, user?.id]);
  useEffect(() => {
    if (!socket) return;
    socket.on("task.updated",         fetchAll);
    socket.on("task.created",         fetchAll);
    socket.on("TASK_ASSIGNED",        fetchAll);
    socket.on("approval.updated",     fetchAll);
    socket.on("notification.created", fetchAll);
    return () => {
      socket.off("task.updated");
      socket.off("task.created");
      socket.off("TASK_ASSIGNED");
      socket.off("approval.updated");
      socket.off("notification.created");
    };
  }, [socket, fetchAll]);

  const currentTasks  = currentData?.myCurrentTasks || [];
  const todayTasks    = tasks.filter(t => isToday(t.deadline) && !["Completed","Approved"].includes(t.status));
  const overdueTasks  = tasks.filter(t => isOverdue(t.deadline, t.status));
  const pendingReview = tasks.filter(t => t.status === "Review");
  const activeTasks   = tasks.filter(t => ["In Progress","Accepted"].includes(t.status));
  const completionPct = tasks.length
    ? Math.round((tasks.filter(t => ["Approved","Completed"].includes(t.status)).length / tasks.length) * 100)
    : 0;

  const upcomingDeadlines = tasks
    .filter(t => t.deadline && !["Completed","Approved"].includes(t.status))
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    .slice(0, 4);

  if (loading) return (
    <div className="flex items-center justify-center h-full bg-background">
      <LoaderCircle className="w-5 h-5 text-gold animate-spin" />
    </div>
  );

  return (
    <div className="px-5 md:px-8 xl:px-10 pt-7 pb-16 max-w-[1200px] mx-auto space-y-6">

      {/* ── header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
            ManMadhan · Member
          </p>
          <h1 className="text-[26px] sm:text-[28px] font-bold text-foreground tracking-tight leading-none">
            {getGreeting()}, {user?.displayName || user?.name || "Member"}
          </h1>
          <p className="text-[12px] text-muted-foreground mt-2">
            {new Date().toLocaleDateString("en-US", { weekday:"long", year:"numeric", month:"long", day:"numeric" })}
          </p>
        </div>
        <button onClick={fetchAll} className="p-2 rounded-xl border border-border bg-card hover:bg-muted transition-colors shrink-0" aria-label="Refresh">
          <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-card border border-border rounded-xl text-[12px] text-muted-foreground">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
        </div>
      )}

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Due Today",      value: todayTasks.length,    href: "/member/my-work" },
          { label: "In Progress",    value: activeTasks.length,   href: "/member/my-work" },
          { label: "Pending Review", value: pendingReview.length, href: "/member/my-work" },
          { label: "Overdue",        value: overdueTasks.length,  href: "/member/my-work" },
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

        {/* LEFT: current work + today */}
        <div className="lg:col-span-2 space-y-5">

          {/* current / active tasks */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Activity className="w-3.5 h-3.5" /> Currently Working
              </span>
              <Link href="/member/focus" className="text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5">
                Focus <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-border">
              {currentTasks.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <Target className="w-5 h-5 text-muted-foreground/30" />
                  <p className="text-[13px] font-semibold text-foreground">No active task right now</p>
                  {activeTasks.length > 0 && (
                    <Link href="/member/focus" className="text-[11px] font-semibold text-gold hover:underline">
                      Start a focus session →
                    </Link>
                  )}
                </div>
              ) : (
                currentTasks.map((t: any) => (
                  <div key={t.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/20 transition-colors">
                    <span className="w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-foreground truncate">{t.title}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                        {t.projectName && <span>{t.projectName}</span>}
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

          {/* today's tasks */}
          {todayTasks.length > 0 && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" /> Due Today
                </span>
                <Link href="/member/my-work" className="flex items-center gap-0.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors">
                  View all <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="divide-y divide-border">
                {todayTasks.slice(0, 4).map(t => (
                  <div key={t.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/20 transition-colors">
                    <Circle className="w-2 h-2 text-muted-foreground/40 shrink-0 fill-current" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-foreground truncate">{t.title}</p>
                      {t.projectName && <p className="text-[11px] text-muted-foreground truncate">{t.projectName}</p>}
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-muted text-muted-foreground border border-border shrink-0">
                      {t.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* all active tasks */}
          {activeTasks.length > 0 && !currentTasks.some((ct: any) => activeTasks.find((a: any) => a.id === ct.id)) && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Active Work</span>
                <Link href="/member/my-work" className="flex items-center gap-0.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors">
                  View all <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="divide-y divide-border">
                {activeTasks.slice(0, 5).map(t => (
                  <div key={t.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/20 transition-colors">
                    <CheckSquare className="w-4 h-4 text-muted-foreground/30 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-foreground truncate">{t.title}</p>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                        {t.projectName && <span>{t.projectName}</span>}
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
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: progress + deadlines + notifications */}
        <div className="space-y-5">

          {/* progress snapshot */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">My Progress</span>
              <Link href="/member/progress" className="text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors">
                View →
              </Link>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[12px]">
                <span className="text-muted-foreground">Completion</span>
                <span className="font-bold text-foreground">{completionPct}%</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-foreground rounded-full transition-all" style={{ width: `${completionPct}%` }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="p-3 bg-muted/30 rounded-xl text-center">
                <p className="text-[18px] font-bold text-foreground leading-none">{myScore}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Score</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-xl text-center">
                <p className="text-[18px] font-bold text-foreground leading-none">{tasks.filter(t => ["Approved","Completed"].includes(t.status)).length}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Done</p>
              </div>
            </div>
          </div>

          {/* upcoming deadlines */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Deadlines</span>
              <Link href="/member/my-work" className="text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors">View all</Link>
            </div>
            <div className="divide-y divide-border">
              {upcomingDeadlines.length === 0 ? (
                <p className="px-5 py-4 text-[12px] text-muted-foreground">No upcoming deadlines.</p>
              ) : (
                upcomingDeadlines.map(t => {
                  const dl = daysLeft(t.deadline);
                  const ov = isOverdue(t.deadline, t.status);
                  return (
                    <div key={t.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/20 transition-colors">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ov ? "bg-foreground" : dl <= 1 ? "bg-foreground/60" : "bg-muted-foreground/30"}`} />
                      <p className="flex-1 text-[12px] font-medium text-foreground truncate">{t.title}</p>
                      <span className={`text-[11px] font-semibold shrink-0 ${ov ? "text-foreground" : "text-muted-foreground"}`}>
                        {ov ? `${Math.abs(dl)}d late` : dl === 0 ? "Today" : dl === 1 ? "Tomorrow" : `${dl}d`}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* notifications preview */}
          {notifications.length > 0 && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5" /> Unread
                </span>
                <Link href="/member/notifications" className="text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors">All →</Link>
              </div>
              <div className="divide-y divide-border">
                {notifications.map(n => (
                  <div key={n.id} className="px-5 py-3.5 hover:bg-muted/20 transition-colors">
                    <p className="text-[12px] font-semibold text-foreground truncate">{n.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(n.createdAt)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
