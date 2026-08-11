"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, CheckCheck, Loader2, AlertCircle, Circle, Clock, RefreshCw } from "lucide-react";
import apiClient from "@/lib/api-client";
import { useSocket } from "@/components/providers/socket-provider";
import Link from "next/link";

type FilterTab = "all" | "unread" | "task" | "approval" | "deadline";

function notifAccent(type: string) {
  const t = (type || "").toLowerCase();
  if (t.includes("approv")) return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
  if (t.includes("reject") || t.includes("overdue")) return "bg-red-500/10 text-red-500";
  if (t.includes("assign")) return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
  if (t.includes("request") || t.includes("extension") || t.includes("deadline"))
    return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
  return "bg-muted text-muted-foreground";
}

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60)    return "just now";
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(d).toLocaleDateString();
}

const TABS: { id: FilterTab; label: string }[] = [
  { id: "all",      label: "All" },
  { id: "unread",   label: "Unread" },
  { id: "task",     label: "Tasks" },
  { id: "approval", label: "Approvals" },
  { id: "deadline", label: "Deadlines" },
];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [tab, setTab]         = useState<FilterTab>("all");
  const { socket } = useSocket();

  const fetch = useCallback(async () => {
    try {
      const res = await apiClient.get("/notifications");
      if (res.data.success) setNotifications(res.data.data || []);
      else setError("Failed to load notifications.");
    } catch { setError("Unable to load notifications."); }
    finally   { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  useEffect(() => {
    if (!socket) return;
    socket.on("notification.created", fetch);
    return () => { socket.off("notification.created", fetch); };
  }, [socket, fetch]);

  const markAll = async () => {
    try {
      await apiClient.patch("/notifications/read-all");
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch {}
  };

  const markOne = async (id: string) => {
    try {
      await apiClient.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch {}
  };

  const filtered = notifications.filter(n => {
    const t = (n.type || "").toLowerCase();
    if (tab === "unread")   return !n.isRead;
    if (tab === "task")     return t.includes("task");
    if (tab === "approval") return t.includes("approv") || t.includes("reject") || t.includes("review");
    if (tab === "deadline") return t.includes("deadline") || t.includes("extension") || t.includes("overdue");
    return true;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="px-5 md:px-8 xl:px-10 pt-7 pb-16 max-w-[800px] mx-auto space-y-5">

      {/* ── header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">ManMadhan · CEO</p>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[24px] font-bold text-foreground tracking-tight leading-none">Notifications</h1>
            {unreadCount > 0 && (
              <span className="w-6 h-6 rounded-full bg-gold text-[#111827] text-[10px] font-bold flex items-center justify-center">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>
          <p className="text-[12px] text-muted-foreground mt-1.5">Real-time organization events and actions.</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            onClick={fetch}
            className="p-2 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground transition-colors"
            aria-label="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          {unreadCount > 0 && (
            <button
              onClick={markAll}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-muted text-[12px] font-semibold text-foreground transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" /> Mark all read
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-card border border-border rounded-xl text-[12px] text-muted-foreground">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
        </div>
      )}

      {/* ── tabs ── */}
      <div className="flex items-center gap-0 border-b border-border overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`
              flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-semibold border-b-2 transition-colors whitespace-nowrap -mb-px
              ${tab === t.id ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}
            `}
          >
            {t.label}
            {t.id === "unread" && unreadCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-gold text-[#111827] text-[9px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── list ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 text-gold animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <Bell className="w-5 h-5 text-muted-foreground/30" />
          <p className="text-[13px] font-semibold text-foreground">
            {tab === "unread" ? "All caught up" : "No notifications"}
          </p>
          <p className="text-[12px] text-muted-foreground">
            {tab === "unread" ? "No unread notifications." : "Organization events will appear here."}
          </p>
        </div>
      ) : (
        <div className="border border-border rounded-2xl overflow-hidden bg-card divide-y divide-border">
          {filtered.map(n => (
            <div
              key={n.id}
              onClick={() => !n.isRead && markOne(n.id)}
              className={`
                flex items-start gap-4 px-5 py-4 transition-colors cursor-pointer
                ${!n.isRead ? "bg-gold/[0.03]" : "hover:bg-muted/20"}
              `}
            >
              {/* accent icon */}
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${notifAccent(n.type)}`}>
                <Bell className="w-3.5 h-3.5" />
              </div>

              {/* content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <p className={`text-[13px] font-semibold leading-snug ${!n.isRead ? "text-foreground" : "text-muted-foreground"}`}>
                    {n.title}
                  </p>
                  {!n.isRead && (
                    <Circle className="w-2 h-2 fill-gold text-gold shrink-0 mt-1" aria-label="Unread" />
                  )}
                </div>
                {n.message && (
                  <p className="text-[12px] text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                )}
                <p className="text-[10.5px] text-muted-foreground/60 mt-1.5 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  {timeAgo(n.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
