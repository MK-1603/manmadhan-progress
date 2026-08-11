"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Bell, Loader2, AlertCircle, CheckCheck, Circle, Clock, Filter
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { PremiumCard } from "@/components/ui/premium-card";
import { useSocket } from "@/components/providers/socket-provider";
import { motion } from "framer-motion";

const typeIcon = (type: string) => {
  if (type?.includes("approved") || type?.includes("extension_approved") || type?.includes("leave_approved")) return "✅";
  if (type?.includes("rejected") || type?.includes("extension_rejected") || type?.includes("leave_rejected")) return "❌";
  if (type?.includes("assigned")) return "📋";
  if (type?.includes("deadline")) return "⏰";
  if (type?.includes("request") || type?.includes("extension")) return "📅";
  if (type?.includes("leave")) return "🌴";
  if (type?.includes("submission") || type?.includes("review")) return "📤";
  return "🔔";
};

const typeColor = (type: string) => {
  if (type?.includes("approved")) return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
  if (type?.includes("rejected") || type?.includes("overdue")) return "text-rose-500 bg-rose-500/10 border-rose-500/20";
  if (type?.includes("assigned")) return "text-blue-500 bg-blue-500/10 border-blue-500/20";
  if (type?.includes("request") || type?.includes("extension")) return "text-amber-500 bg-amber-500/10 border-amber-500/20";
  if (type?.includes("submission") || type?.includes("review")) return "text-purple-500 bg-purple-500/10 border-purple-500/20";
  return "text-muted-foreground bg-muted border-border";
};

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

type FilterType = "all" | "unread" | "task" | "deadline" | "submission";

export default function CoCeoNotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const { socket } = useSocket();

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await apiClient.get("/notifications");
      if (res.data.success) setNotifications(res.data.data || []);
    } catch { setError("Unable to load notifications"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  useEffect(() => {
    if (!socket) return;
    socket.on("notification.created", fetchNotifications);
    return () => { socket.off("notification.created"); };
  }, [socket, fetchNotifications]);

  const markAllRead = async () => {
    try {
      await apiClient.post("/notifications/read-all");
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch { /* silent */ }
  };

  const markRead = async (id: string) => {
    try {
      await apiClient.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch { /* silent */ }
  };

  const filterNotifications = (notifs: any[]) => {
    switch (filter) {
      case "unread": return notifs.filter(n => !n.isRead);
      case "task": return notifs.filter(n => n.type?.includes("task"));
      case "deadline": return notifs.filter(n => n.type?.includes("deadline") || n.type?.includes("extension"));
      case "submission": return notifs.filter(n => n.type?.includes("submission") || n.type?.includes("review") || n.type?.includes("approved") || n.type?.includes("rejected"));
      default: return notifs;
    }
  };

  const displayed = filterNotifications(notifications);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const filterTabs: { id: FilterType; label: string }[] = [
    { id: "all", label: "All" },
    { id: "unread", label: "Unread" },
    { id: "task", label: "Tasks" },
    { id: "submission", label: "Submissions" },
    { id: "deadline", label: "Deadlines" },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-[900px] mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Bell className="w-6 h-6 text-purple-500" />
            Notifications
            {unreadCount > 0 && (
              <span className="w-6 h-6 rounded-full bg-purple-500 text-white text-xs font-bold flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Task assignments, submissions, deadlines, and system alerts
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <CheckCheck className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-0.5 border-b border-border overflow-x-auto">
        {filterTabs.map(t => {
          const count = filterNotifications(notifications).length;
          return (
            <button
              key={t.id}
              onClick={() => setFilter(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
                filter === t.id
                  ? "border-purple-500 text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
              {t.id === "unread" && unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-500 text-[10px] font-bold">
                  {unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Notification list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-16">
          <Bell className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {filter === "unread" ? "No unread notifications" : "No notifications yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map((n, i) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
            >
              <PremiumCard
                className={`cursor-pointer transition-colors hover:border-border/80 ${!n.isRead ? "border-l-2 border-l-purple-500" : ""}`}
                onClick={() => !n.isRead && markRead(n.id)}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm ${typeColor(n.type)}`}>
                    {typeIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm font-semibold ${!n.isRead ? "text-foreground" : "text-muted-foreground"}`}>
                        {n.title}
                      </p>
                      {!n.isRead && (
                        <Circle className="w-2 h-2 fill-purple-500 text-purple-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1.5 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" /> {timeAgo(n.createdAt)}
                    </p>
                  </div>
                </div>
              </PremiumCard>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
