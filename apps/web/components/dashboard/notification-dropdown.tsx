"use client";

import { Bell, Check, CheckCircle2, ShieldAlert, Building2, FileText, CheckSquare } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ResponsivePopover } from "../ui/responsive-popover";
import apiClient from "@/lib/api-client";
import { useSocket } from "../providers/socket-provider";
import { usePushNotifications } from "@/hooks/use-push-notifications";

export function NotificationDropdown({
  activePopover,
  setActivePopover,
}: {
  activePopover?: "none" | "search" | "notifications" | "profile" | "switcher";
  setActivePopover?: (val: "none" | "search" | "notifications" | "profile" | "switcher") => void;
}) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);

  const isOpen = activePopover !== undefined ? activePopover === "notifications" : internalIsOpen;
  const setIsOpen = (open: boolean) => {
    if (setActivePopover) {
      setActivePopover(open ? "notifications" : "none");
    } else {
      setInternalIsOpen(open);
    }
  };

  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");

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
    if (n.workspaceType && n.workspaceType.toUpperCase() !== currentWorkspaceContext) {
      return false;
    }
    if (filter === "unread") {
      return !n.isRead && !n.read;
    }
    return true;
  });

  const unreadCount = notifications.filter(n => {
    const isWsMatch = !n.workspaceType || n.workspaceType.toUpperCase() === currentWorkspaceContext;
    return isWsMatch && !n.isRead && !n.read;
  }).length;

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

    const metaTaskId = item.metadata?.taskId || item.taskId;
    if (metaTaskId || item.type === "TASK_ASSIGNMENT") {
      const roleRaw = (localStorage.getItem("userRole") || "MEMBER").toUpperCase();
      const prefix = roleRaw.includes("CO") ? "co-ceo" : roleRaw.includes("CEO") ? "ceo" : "member";
      router.push(`/${prefix}/my-work?taskId=${metaTaskId || ""}`);
      return;
    }

    if (item.actionUrl) {
      router.push(item.actionUrl);
    } else if (item.entityType === "task" && item.entityId) {
      const roleRaw = (localStorage.getItem("userRole") || "MEMBER").toUpperCase();
      const prefix = roleRaw.includes("CO") ? "co-ceo" : roleRaw.includes("CEO") ? "ceo" : "member";
      router.push(`/${prefix}/my-work?taskId=${item.entityId}`);
    } else if (item.entityType === "project" && item.entityId) {
      router.push(isPersonal ? `/personal/projects` : `/ceo/projects/${item.entityId}`);
    }
  };

  const getIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case "security": return <ShieldAlert className="w-4 h-4 text-red-500" />;
      case "task": return <CheckSquare className="w-4 h-4 text-emerald-500" />;
      case "approval": return <FileText className="w-4 h-4 text-[#B28D18] dark:text-[#D4B12F]" />;
      case "organization": return <Building2 className="w-4 h-4 text-[#B28D18] dark:text-[#D4B12F]" />;
      default: return <Bell className="w-4 h-4 text-[#667085] dark:text-[#8B94A3]" />;
    }
  };

  const triggerBtn = (
    <button 
      type="button"
      onClick={() => setIsOpen(!isOpen)}
      aria-label="Notifications"
      title="Notifications"
      className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
        isOpen
          ? "bg-[#F3F4F6] dark:bg-[#151920] text-[#17202A] dark:text-[#F2F3F5]"
          : "text-[#667085] dark:text-[#8B94A3] hover:text-[#17202A] dark:hover:text-[#F2F3F5] hover:bg-[#F3F4F6] dark:hover:bg-[#151920]"
      }`}
    >
      <Bell className="w-4 h-4" />
      {unreadCount > 0 && (
        <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-[#FFFFFF] dark:ring-[#0B0D10]" />
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
      desktopClassName="w-[380px] rounded-xl border border-[#E5E7EB] dark:border-[#24282E] bg-[#FFFFFF] dark:bg-[#15181D] shadow-2xl overflow-hidden flex flex-col z-50 text-xs"
    >
      {/* Header & Tabs */}
      <div className="p-3 border-b border-[#E5E7EB] dark:border-[#24282E] flex flex-col gap-2 bg-[#FFFFFF] dark:bg-[#15181D]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold text-[#17202A] dark:text-[#F2F3F5]">Notifications</h3>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.2 rounded font-mono text-[10px] font-medium bg-[#B28D18]/10 dark:bg-[#D4B12F]/10 text-[#B28D18] dark:text-[#D4B12F]">
                {unreadCount} new
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button 
              type="button"
              onClick={markAllAsRead}
              className="text-[11px] font-medium text-[#667085] dark:text-[#8B94A3] hover:text-[#17202A] dark:hover:text-[#F2F3F5] transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" /> Mark all read
            </button>
          )}
        </div>

        {/* All / Unread Filter Tabs */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
              filter === "all"
                ? "bg-[#F3F4F6] dark:bg-[#20252C] text-[#17202A] dark:text-[#F2F3F5]"
                : "text-[#667085] dark:text-[#8B94A3] hover:text-[#17202A] dark:hover:text-[#F2F3F5]"
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFilter("unread")}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
              filter === "unread"
                ? "bg-[#F3F4F6] dark:bg-[#20252C] text-[#17202A] dark:text-[#F2F3F5]"
                : "text-[#667085] dark:text-[#8B94A3] hover:text-[#17202A] dark:hover:text-[#F2F3F5]"
            }`}
          >
            Unread
          </button>
        </div>
      </div>

      {/* Notification List (Scrollable, max 420px) */}
      <div className="max-h-[420px] overflow-y-auto min-h-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {isSupported && permission === "default" && (
          <div className="p-3 m-2 bg-[#FFF8E7] dark:bg-[#1A1913] border border-[#B28D18]/30 dark:border-[#D4B12F]/30 rounded-lg flex flex-col items-start gap-2">
            <p className="text-xs text-[#17202A] dark:text-[#F2F3F5]">Enable browser notifications for real-time updates.</p>
            <button 
              type="button"
              onClick={() => subscribe()}
              className="text-[11px] font-semibold bg-[#B28D18] dark:bg-[#D4B12F] text-black px-3 py-1 rounded-md hover:brightness-105 transition-all cursor-pointer"
            >
              Enable
            </button>
          </div>
        )}
        
        {loading ? (
          <div className="py-6 text-center text-xs text-[#667085] dark:text-[#8B94A3]">Loading...</div>
        ) : filteredNotifications.length > 0 ? (
          <div className="flex flex-col divide-y divide-[#E5E7EB] dark:divide-[#24282E]">
            {filteredNotifications.map((n) => {
              const isUnread = !n.isRead && !n.read;
              return (
                <div 
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`relative flex gap-3 p-3 transition-colors cursor-pointer hover:bg-[#F3F4F6] dark:hover:bg-[#1C2027] ${
                    isUnread ? "bg-[#FFF8E7]/40 dark:bg-[#1A1913]/40" : ""
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-[#F3F4F6] dark:bg-[#1B2028] flex items-center justify-center shrink-0 mt-0.5 border border-[#E5E7EB] dark:border-[#24282E]">
                    {getIcon(n.type || n.entityType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className={`text-xs truncate ${isUnread ? "font-semibold text-[#17202A] dark:text-[#F2F3F5]" : "text-[#667085] dark:text-[#8B94A3]"}`}>
                        {n.title || n.type || "Notification"}
                      </p>
                      <span className="text-[10px] text-[#667085] dark:text-[#8B94A3] whitespace-nowrap font-mono">
                        {n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}
                      </span>
                    </div>
                    <p className="text-[11px] leading-snug text-[#667085] dark:text-[#8B94A3] line-clamp-2">
                      {n.message || n.body || n.content || n.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 flex flex-col items-center justify-center text-center px-4">
            <CheckCircle2 className="w-6 h-6 text-[#667085] dark:text-[#8B94A3] opacity-40 mb-2" />
            <p className="text-xs font-semibold text-[#17202A] dark:text-[#F2F3F5]">You're all caught up</p>
            <p className="text-[11px] text-[#667085] dark:text-[#8B94A3] mt-0.5">No new notifications.</p>
          </div>
        )}
      </div>
    </ResponsivePopover>
  );
}
