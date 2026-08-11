"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, Loader2, AlertCircle, CheckCheck, Circle, Clock } from "lucide-react";
import apiClient from "@/lib/api-client";
import { PremiumCard } from "@/components/ui/premium-card";
import { useSocket } from "@/components/providers/socket-provider";

const typeColor = (type: string) => {
  if (type?.includes("approved")) return "text-emerald-500 bg-emerald-500/10";
  if (type?.includes("rejected") || type?.includes("overdue")) return "text-rose-500 bg-rose-500/10";
  if (type?.includes("assigned")) return "text-blue-500 bg-blue-500/10";
  if (type?.includes("request") || type?.includes("extension")) return "text-amber-500 bg-amber-500/10";
  return "text-muted-foreground bg-muted";
};

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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
      await apiClient.patch("/notifications/read-all");
      fetchNotifications();
    } catch { }
  };

  const markRead = async (id: string) => {
    try {
      await apiClient.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch { }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="p-6 lg:p-8 max-w-[900px] mx-auto w-full space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Bell className="w-6 h-6 text-primary" /> Notifications
            {unreadCount > 0 && <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">{unreadCount}</span>}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Real-time organization updates</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <CheckCheck className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      {error && <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500 text-sm"><AlertCircle className="w-4 h-4 shrink-0" /> {error}</div>}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16">
          <Bell className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <PremiumCard
              key={n.id}
              className={`cursor-pointer transition-colors hover:border-border/80 ${!n.isRead ? "border-l-2 border-l-primary" : ""}`}
              onClick={() => !n.isRead && markRead(n.id)}
            >
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${typeColor(n.type)}`}>
                  <Bell className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm font-semibold ${!n.isRead ? "text-foreground" : "text-muted-foreground"}`}>{n.title}</p>
                    {!n.isRead && <Circle className="w-2 h-2 fill-primary text-primary shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                  <p className="text-[10px] text-muted-foreground/70 mt-1 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" /> {timeAgo(n.createdAt)}
                  </p>
                </div>
              </div>
            </PremiumCard>
          ))}
        </div>
      )}
    </div>
  );
}
