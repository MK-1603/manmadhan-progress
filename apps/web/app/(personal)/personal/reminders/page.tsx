"use client";

import React, { useState, useEffect, useCallback } from "react";
import apiClient from "@/lib/api-client";
import { LoaderCircle, Bell, Search, X } from "lucide-react";
import { useSocket } from "@/components/providers/socket-provider";
import { useConfirm } from "@/hooks/use-confirm";

export default function RemindersPage() {
  const { socket, isConnected } = useSocket();
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { confirm } = useConfirm();

  const fetchReminders = useCallback(async () => {
    try {
      const res = await apiClient.get("/personal/reminders");
      setReminders(res.data.data || []);
    } catch (error) {
      console.error("Failed to load reminders", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.on("reminder.created", (reminder: any) => {
      setReminders((prev) => [reminder, ...prev]);
    });

    socket.on("reminder.updated", (reminder: any) => {
      setReminders((prev) => prev.map((item) => (item.id === reminder.id ? reminder : item)));
    });

    socket.on("reminder.deleted", ({ id }: { id: string }) => {
      setReminders((prev) => prev.filter((item) => item.id !== id));
    });

    return () => {
      socket.off("reminder.created");
      socket.off("reminder.updated");
      socket.off("reminder.deleted");
    };
  }, [socket, isConnected]);

  const filteredReminders = reminders.filter((reminder) => {
    if (!search.trim()) return true;
    const value = search.toLowerCase();
    return (
      reminder.title?.toLowerCase().includes(value) ||
      reminder.notes?.toLowerCase().includes(value) ||
      reminder.category?.toLowerCase().includes(value)
    );
  });

  const deleteReminder = async (id: string) => {
    const confirmed = await confirm({
      title: "Delete reminder",
      description: "Are you sure you want to remove this reminder?",
      variant: "destructive",
      confirmLabel: "Delete",
    });
    if (!confirmed) return;

    try {
      await apiClient.delete(`/personal/reminders/${id}`);
      setReminders((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error("Failed to delete reminder", error);
    }
  };

  return (
    <div className="w-full h-full flex flex-col p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto animate-in fade-in duration-500 overflow-y-auto hide-scrollbar">
      <div className="mb-8 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-[32px] sm:text-[40px] font-bold text-[#171717] dark:text-[#F5F5F5] leading-tight tracking-tight mb-2">
            Reminders
          </h1>
          <p className="text-[16px] text-[#52525B] dark:text-[#A1A1AA] max-w-[600px]">
            Keep track of tasks, follow-up items, and personal reminders in one place.
          </p>
        </div>
        <div className="relative min-w-[240px] w-full lg:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A1A1AA]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reminders..."
            className="w-full h-10 pl-9 pr-4 rounded-full border border-[#E5E7EB] dark:border-[#242424] bg-white dark:bg-[#111111] text-sm text-[#171717] dark:text-[#F5F5F5] focus:outline-none focus:border-[#A1A1AA] dark:focus:border-[#52525B] transition-colors"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <LoaderCircle className="w-8 h-8 text-[#A1A1AA] animate-spin" />
        </div>
      ) : filteredReminders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-4 border border-dashed border-[#E5E7EB] dark:border-[#242424] rounded-2xl bg-[#F4F4F5]/50 dark:bg-[#1D1D1D]/50 text-center">
          <Bell className="w-12 h-12 text-[#A1A1AA] dark:text-[#52525B] mb-4" />
          <h3 className="text-xl font-bold text-[#171717] dark:text-[#F5F5F5] mb-2">No reminders yet</h3>
          <p className="text-[#52525B] dark:text-[#A1A1AA] max-w-md">
            When you create reminders, they will appear here. Use your AI Builder or tasks to capture the next thing you need to remember.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredReminders.map((reminder) => (
            <div key={reminder.id} className="rounded-3xl border border-[#E5E7EB] dark:border-[#242424] bg-white dark:bg-[#111111] p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#171717] dark:text-[#F5F5F5] mb-1 truncate">{reminder.title || "Untitled reminder"}</p>
                  <p className="text-sm text-[#52525B] dark:text-[#A1A1AA] mb-3 line-clamp-2">{reminder.notes || "No additional notes."}</p>
                  <div className="flex flex-wrap gap-2 text-xs text-[#71717A] dark:text-[#A1A1AA]">
                    {reminder.category && <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#F4F4F5] dark:bg-[#1F1F1F]">{reminder.category}</span>}
                    {reminder.dueDate && <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#F4F4F5] dark:bg-[#1F1F1F]">Due {new Date(reminder.dueDate).toLocaleDateString()}</span>}
                  </div>
                </div>
                <button
                  onClick={() => deleteReminder(reminder.id)}
                  className="inline-flex items-center gap-2 self-start rounded-full border border-rose-200 bg-rose-50 text-rose-600 px-4 py-2 text-sm font-semibold transition-colors hover:bg-rose-100"
                >
                  <X className="w-4 h-4" />
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
