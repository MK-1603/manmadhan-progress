"use client";

import React, { useState, useEffect, useCallback } from "react";
import apiClient from "@/lib/api-client";
import {
  LoaderCircle, Bell, Search, X, Plus, Clock,
  CheckCircle2, Circle, AlertCircle,
} from "lucide-react";

export default function RemindersPage() {
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating]     = useState(false);
  const [createError, setCreateError] = useState("");
  const [form, setForm] = useState({ title: "", remindAt: "" });

  const fetchReminders = useCallback(async () => {
    try {
      const res = await apiClient.get("/personal/reminders");
      setReminders(res.data.data || []);
    } catch {
      // silent — endpoint may not exist yet
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReminders(); }, [fetchReminders]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setCreateError("Title is required"); return; }
    if (!form.remindAt)     { setCreateError("Remind-at time is required"); return; }
    setCreating(true);
    setCreateError("");
    try {
      const res = await apiClient.post("/personal/reminders", {
        title: form.title.trim(),
        remindAt: new Date(form.remindAt).toISOString(),
      });
      if (res.data.success) {
        setReminders(p => [res.data.data, ...p]);
        setForm({ title: "", remindAt: "" });
        setShowCreate(false);
      }
    } catch (err: any) {
      setCreateError(err.response?.data?.error || "Failed to create reminder");
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (reminder: any) => {
    const next = !reminder.isCompleted;
    setReminders(p => p.map(r => r.id === reminder.id ? { ...r, isCompleted: next } : r));
    try {
      await apiClient.patch(`/personal/reminders/${reminder.id}`, { isCompleted: next });
    } catch {
      setReminders(p => p.map(r => r.id === reminder.id ? { ...r, isCompleted: reminder.isCompleted } : r));
    }
  };

  const handleDelete = async (id: string) => {
    setReminders(p => p.filter(r => r.id !== id));
    try {
      await apiClient.delete(`/personal/reminders/${id}`);
    } catch {
      fetchReminders();
    }
  };

  const filtered = reminders.filter(r => {
    if (!search.trim()) return true;
    return (r.title || "").toLowerCase().includes(search.toLowerCase());
  });

  const pending   = filtered.filter(r => !r.isCompleted);
  const completed = filtered.filter(r => r.isCompleted);

  const isOverdue = (r: any) =>
    !r.isCompleted && r.remindAt && new Date(r.remindAt) < new Date();

  return (
    <div className="w-full h-full flex flex-col overflow-y-auto bg-[#FAFAFA] dark:bg-[#080808]">
      <div className="p-4 sm:p-6 lg:p-8 max-w-[800px] mx-auto w-full pb-20 space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10.5px] font-semibold text-[#A1A1AA] uppercase tracking-widest mb-1">
              Personal Workspace
            </p>
            <h1 className="text-[26px] font-bold text-[#171717] dark:text-[#F5F5F5] tracking-tight leading-none">
              Reminders
            </h1>
          </div>
          <button
            onClick={() => { setShowCreate(p => !p); setCreateError(""); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#171717] dark:bg-[#F5F5F5] text-white dark:text-[#080808] text-[13px] font-semibold hover:opacity-90 transition-opacity shrink-0"
          >
            <Plus className="w-4 h-4" /> New Reminder
          </button>
        </div>

        {/* Inline create form */}
        {showCreate && (
          <div className="bg-white dark:bg-[#111111] border border-[#E5E7EB] dark:border-[#242424] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#171717] dark:text-[#F5F5F5]">New Reminder</h2>
              <button
                onClick={() => { setShowCreate(false); setCreateError(""); }}
                className="p-1 rounded-lg text-[#A1A1AA] hover:bg-[#F4F4F5] dark:hover:bg-[#1D1D1D]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {createError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {createError}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-3">
              <input
                autoFocus
                type="text"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="What do you want to be reminded about?"
                className="w-full h-10 px-3 rounded-xl border border-[#E5E7EB] dark:border-[#242424] bg-[#F4F4F5]/50 dark:bg-[#1D1D1D]/50 text-sm text-[#171717] dark:text-[#F5F5F5] placeholder-[#A1A1AA] focus:outline-none focus:border-[#A1A1AA] dark:focus:border-[#52525B]"
              />
              <div className="flex gap-3">
                <input
                  type="datetime-local"
                  value={form.remindAt}
                  onChange={e => setForm(p => ({ ...p, remindAt: e.target.value }))}
                  className="flex-1 h-10 px-3 rounded-xl border border-[#E5E7EB] dark:border-[#242424] bg-[#F4F4F5]/50 dark:bg-[#1D1D1D]/50 text-sm text-[#171717] dark:text-[#F5F5F5] focus:outline-none focus:border-[#A1A1AA] dark:focus:border-[#52525B]"
                />
                <button
                  type="submit"
                  disabled={creating || !form.title.trim() || !form.remindAt}
                  className="px-4 h-10 rounded-xl bg-[#171717] dark:bg-[#F5F5F5] text-white dark:text-[#080808] text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                >
                  {creating && <LoaderCircle className="w-3.5 h-3.5 animate-spin" />}
                  {creating ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A1A1AA]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search reminders..."
            className="w-full h-9 pl-9 pr-3 rounded-xl border border-[#E5E7EB] dark:border-[#242424] bg-white dark:bg-[#111111] text-sm text-[#171717] dark:text-[#F5F5F5] placeholder-[#A1A1AA] focus:outline-none focus:border-[#A1A1AA] dark:focus:border-[#52525B]"
          />
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <LoaderCircle className="w-6 h-6 text-[#A1A1AA] animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border border-dashed border-[#E5E7EB] dark:border-[#242424] rounded-2xl text-center">
            <Bell className="w-10 h-10 text-[#A1A1AA] dark:text-[#52525B] mb-3" />
            <h3 className="text-base font-bold text-[#171717] dark:text-[#F5F5F5] mb-1">
              {search ? "No reminders match" : "No reminders yet"}
            </h3>
            <p className="text-sm text-[#52525B] dark:text-[#A1A1AA] max-w-xs">
              {search ? "Try a different search." : "Create a reminder to never forget what matters."}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Pending */}
            {pending.length > 0 && (
              <div>
                <p className="text-[10.5px] font-semibold text-[#A1A1AA] uppercase tracking-widest mb-2">
                  Upcoming ({pending.length})
                </p>
                <div className="flex flex-col gap-2">
                  {pending.map(r => (
                    <ReminderRow
                      key={r.id}
                      reminder={r}
                      overdue={isOverdue(r)}
                      onToggle={handleToggle}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Completed */}
            {completed.length > 0 && (
              <div>
                <p className="text-[10.5px] font-semibold text-[#A1A1AA] uppercase tracking-widest mb-2">
                  Completed ({completed.length})
                </p>
                <div className="flex flex-col gap-2 opacity-60">
                  {completed.map(r => (
                    <ReminderRow
                      key={r.id}
                      reminder={r}
                      overdue={false}
                      onToggle={handleToggle}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ReminderRow({ reminder, overdue, onToggle, onDelete }: {
  reminder: any;
  overdue: boolean;
  onToggle: (r: any) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className={`group flex items-center gap-3 px-4 py-3.5 bg-white dark:bg-[#111111] border rounded-xl transition-all ${
      reminder.isCompleted
        ? "border-[#E5E7EB] dark:border-[#1D1D1D]"
        : overdue
        ? "border-rose-200 dark:border-rose-900/50 bg-rose-50/30 dark:bg-rose-950/10"
        : "border-[#E5E7EB] dark:border-[#242424] hover:border-[#A1A1AA] dark:hover:border-[#52525B]"
    }`}>
      <button
        onClick={() => onToggle(reminder)}
        className="shrink-0 text-[#A1A1AA] hover:text-[#16A34A] transition-colors"
      >
        {reminder.isCompleted
          ? <CheckCircle2 className="w-5 h-5 text-[#16A34A]" />
          : <Circle className="w-5 h-5" />}
      </button>

      <div className="flex-1 min-w-0">
        <p className={`text-[14px] font-semibold leading-snug ${
          reminder.isCompleted
            ? "line-through text-[#A1A1AA] dark:text-[#52525B]"
            : "text-[#171717] dark:text-[#F5F5F5]"
        }`}>
          {reminder.title}
        </p>
        {reminder.remindAt && (
          <p className={`text-[12px] mt-0.5 flex items-center gap-1 ${
            overdue ? "text-rose-500 font-semibold" : "text-[#52525B] dark:text-[#A1A1AA]"
          }`}>
            <Clock className="w-3 h-3" />
            {overdue ? "Overdue · " : ""}
            {new Date(reminder.remindAt).toLocaleString(undefined, {
              month: "short", day: "numeric",
              hour: "2-digit", minute: "2-digit",
            })}
          </p>
        )}
      </div>

      <button
        onClick={() => onDelete(reminder.id)}
        className="shrink-0 p-1.5 rounded-lg text-[#A1A1AA] hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 opacity-0 group-hover:opacity-100 transition-all"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
