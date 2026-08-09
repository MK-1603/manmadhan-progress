"use client";

import { Bell, Check, CheckCircle2, ShieldAlert, Building2, User, Clock, FileText, CheckSquare, AlertCircle } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ResponsivePopover } from "../ui/responsive-popover";
import apiClient from "@/lib/api-client";
import { useSocket } from "../providers/socket-provider";
import { usePushNotifications } from "@/hooks/use-push-notifications";

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { socket } = useSocket();
  const { isSupported, permission, subscribe } = usePushNotifications();

  const isPersonal = pathname?.startsWith("/personal");
  const currentWorkspaceContext = isPersonal ? "PERSONAL" : "ORGANIZATION";

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/notifications");
      if (res.data.success) {
        setNotifications(res.data.data || []);
      }
    } catch (e) {
      console.error("Failed to fetch notifications", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Real-time socket listener
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (data: any) => {
      setNotifications(prev => [data, ...prev]);
    };

    socket.on("notification_created", handleNewNotification);
    socket.on("INVITATION_ACCEPTED", fetchNotifications);
    socket.on("MEMBER_ACTIVATED", fetchNotifications);

    return () => {
      socket.off("notification_created", handleNewNotification);
      socket.off("INVITATION_ACCEPTED", fetchNotifications);
      socket.off("MEMBER_ACTIVATED", fetchNotifications);
    };
  }, [socket, fetchNotifications]);

  // Filter notifications by active workspace context
  const filteredNotifications = notifications.filter(n => {
    if (!n.workspaceType) return true; // Show legacy if not specified
    return n.workspaceType.toUpperCase() === currentWorkspaceContext;
  });

  const unreadCount = filteredNotifications.filter(n => !n.isRead && !n.read).length;

  const markAllAsRead = async () => {
    try {
      await apiClient.post("/notifications/read-all");
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true, read: true })));
    } catch (e) {
      console.error("Failed to mark all as read", e);
    }
  };

  const handleNotificationClick = async (item: any) => {
    try {
      if (!item.isRead && !item.read) {
        await apiClient.patch(`/notifications/${item.id}/read`);
        setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, isRead: true, read: true } : n));
      }
    } catch (e) {
      console.error("Failed to mark notification read", e);
    }

    setIsOpen(false);

    if (item.actionUrl) {
      router.push(item.actionUrl);
    } else if (item.entityType === "task" && item.entityId) {
      router.push(isPersonal ? `/personal/tasks` : `/tasks`);
    } else if (item.entityType === "project" && item.entityId) {
      router.push(isPersonal ? `/personal/projects` : `/projects`);
    }
  };

  const getIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case "security": return <ShieldAlert className="w-4 h-4 text-rose-500" />;
      case "task": return <CheckSquare className="w-4 h-4 text-emerald-500" />;
      case "approval": return <FileText className="w-4 h-4 text-amber-500" />;
      case "organization": return <Building2 className="w-4 h-4 text-gold" />;
      default: return <Bell className="w-4 h-4 text-cyan-400" />;
    }
  };

  const triggerBtn = (
    <button 
      onClick={() => setIsOpen(!isOpen)}
      className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-colors duration-150 focus:outline-none shrink-0 ${
        isOpen ? "bg-accent text-foreground" : "text-muted-foreground bg-transparent hover:bg-accent hover:text-foreground"
      }`}
      title="Notifications"
    >
      <Bell className="w-5 h-5 stroke-[2]" />
      {unreadCount > 0 && (
        <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-rose-500 border-2 border-background animate-pulse" />
      )}
    </button>
  );

  return (
    <ResponsivePopover 
      trigger={triggerBtn} 
      isOpen={isOpen} 
      setIsOpen={setIsOpen}
      align="right"
      offsetY={6}
      desktopClassName="w-[340px] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/20">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-extrabold text-foreground">Notifications</h3>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-gold/15 text-gold text-[10px] font-extrabold border border-gold/30">
              {unreadCount} New
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button 
            onClick={markAllAsRead}
            className="text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" /> Mark all read
          </button>
        )}
      </div>

      {/* List */}
      <div data-lenis-prevent="true" className="max-h-[60vh] overflow-y-auto overscroll-contain py-1 scrollbar-thin scrollbar-thumb-muted-foreground/30">
        {isSupported && permission === "default" && (
          <div className="p-3 mx-2 my-1 bg-gold/10 border border-gold/30 rounded-xl flex flex-col items-start gap-2">
            <p className="text-xs font-medium text-foreground">Turn on notifications to get real-time updates.</p>
            <button 
              onClick={() => subscribe()}
              className="text-[11px] font-bold bg-gold text-black px-3 py-1.5 rounded-lg hover:bg-gold/90 transition-colors"
            >
              Enable Notifications
            </button>
          </div>
        )}
        
        {loading ? (
          <div className="py-8 flex justify-center text-xs text-muted-foreground">Loading notifications...</div>
        ) : filteredNotifications.length > 0 ? (
          <div className="flex flex-col divide-y divide-border/40">
            {filteredNotifications.map((n) => {
              const isUnread = !n.isRead && !n.read;
              return (
                <div 
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`relative flex gap-3 p-3.5 transition-colors cursor-pointer hover:bg-accent/60 ${isUnread ? "bg-accent/30 font-semibold" : ""}`}
                >
                  {isUnread && (
                    <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-gold" />
                  )}
                  <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center shrink-0 mt-0.5 border border-border/50">
                    {getIcon(n.type || n.entityType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className={`text-xs font-bold truncate ${isUnread ? "text-foreground" : "text-foreground/80"}`}>
                        {n.title || n.type || "Notification"}
                      </p>
                      <span className="text-[9.5px] font-medium text-muted-foreground whitespace-nowrap">
                        {n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-muted-foreground line-clamp-2">
                      {n.message || n.body || n.content || n.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center text-center px-6">
            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3 border border-border/60">
              <CheckCircle2 className="w-6 h-6 text-muted-foreground/60" />
            </div>
            <p className="text-sm font-bold text-foreground">You're all caught up!</p>
            <p className="text-xs text-muted-foreground mt-1">No new {isPersonal ? "personal" : "organization"} notifications.</p>
          </div>
        )}
      </div>
    </ResponsivePopover>
  );
}
