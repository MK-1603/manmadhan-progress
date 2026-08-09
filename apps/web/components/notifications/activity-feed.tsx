"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, CheckCircle2, ShieldAlert, UserPlus, FileText, Check, Loader2, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import apiClient from "@/lib/api-client";

type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: "High" | "Low";
  isRead: boolean;
  createdAt: string;
};

export function ActivityFeed({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const fetchNotifications = async () => {
    try {
      const res = await apiClient.get("/notifications");
      if (res.data.success) {
        setNotifications(res.data.data);
      }
    } catch (e) {
      console.error("Failed to fetch notifications", e);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    try {
      const token = localStorage.getItem("auth_token");
      await fetch(`/api/v1/notifications/${id}/read`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${token}` }
      });
    } catch (e) {}
  };

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    try {
      const token = localStorage.getItem("auth_token");
      await fetch(`/api/v1/notifications/read-all`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
    } catch (e) {}
  };

  const getIcon = (type: string, priority: string) => {
    if (priority === "High") return <ShieldAlert className="w-5 h-5 text-red-500" />;
    if (type.includes("TASK")) return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
    if (type.includes("INVITE") || type.includes("ROLE")) return <UserPlus className="w-5 h-5 text-blue-500" />;
    return <Bell className="w-5 h-5 text-zinc-500" />;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 300 }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          className="fixed top-0 right-0 h-[100dvh] w-full max-w-sm bg-white border-l border-zinc-200 shadow-2xl z-50 flex flex-col font-sans"
        >
          <div className="flex items-center justify-between p-4 border-b border-zinc-100 bg-zinc-50/50">
            <div>
              <h2 className="text-16px font-bold text-zinc-900">Activity Feed</h2>
              <p className="text-[12px] text-zinc-500 font-medium">Enterprise Notifications</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={markAllAsRead} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-200 transition-colors" title="Mark all as read">
                <Check className="w-4 h-4 text-zinc-600" />
              </button>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-200 transition-colors">
                <X className="w-4 h-4 text-zinc-600" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center mb-4">
                  <Bell className="w-8 h-8 text-zinc-400" />
                </div>
                <h3 className="text-[15px] font-semibold text-zinc-900 mb-1">You're all caught up</h3>
                <p className="text-[13px] text-zinc-500 max-w-[200px]">No new notifications across your workspaces.</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => !notif.isRead && markAsRead(notif.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    notif.isRead 
                      ? "bg-white border-zinc-100 opacity-70" 
                      : notif.priority === "High"
                        ? "bg-red-50 border-red-100 shadow-sm"
                        : "bg-blue-50/50 border-blue-100 shadow-sm"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 p-2 rounded-xl flex-shrink-0 ${notif.isRead ? 'bg-zinc-100' : 'bg-white shadow-sm'}`}>
                      {getIcon(notif.type, notif.priority)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h4 className="text-[14px] font-bold text-zinc-900 truncate">{notif.title}</h4>
                        <span className="text-[11px] font-medium text-zinc-500 whitespace-nowrap">
                          {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p className={`text-[13px] leading-snug ${notif.isRead ? 'text-zinc-500' : 'text-zinc-700'}`}>
                        {notif.message}
                      </p>
                    </div>
                    {!notif.isRead && (
                      <div className="w-2 h-2 mt-2 rounded-full bg-blue-600 flex-shrink-0" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
