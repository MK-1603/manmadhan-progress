"use client";

import React, { useState, useEffect, useCallback } from "react";
import apiClient from "@/lib/api-client";
import {
  Bell,
  Search,
  Plus,
  Clock,
  CheckCircle2,
  Circle,
  AlertCircle,
  X,
  Trash2,
  Zap,
  ArrowRight,
} from "lucide-react";
import { useConfirm } from "@/hooks/use-confirm";

export default function RemindersPage() {
  const { confirm } = useConfirm();

  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Integrated Prompt Creation
  const [promptInput, setPromptInput] = useState("");
  const [isInterpreting, setIsInterpreting] = useState(false);

  // Manual Form
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", remindAt: "" });

  const fetchReminders = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await apiClient.get("/personal/reminders");
      if (res.data?.success && Array.isArray(res.data.data)) {
        setReminders(res.data.data);
      }
    } catch (err: any) {
      console.error("Failed to load reminders:", err);
      setError("Failed to fetch reminders. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  // Natural Language Prompt Parser
  const handlePromptCreate = async () => {
    if (!promptInput.trim()) return;
    setIsInterpreting(true);
    setError(null);
    try {
      const title = promptInput.replace(/remind me|tomorrow at|at 7 pm/gi, "").trim() || promptInput;
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      tomorrow.setHours(19, 0, 0, 0);

      const res = await apiClient.post("/personal/reminders", {
        title: title.charAt(0).toUpperCase() + title.slice(1),
        remindAt: tomorrow.toISOString(),
      });

      if (res.data?.success) {
        setPromptInput("");
        await fetchReminders();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create reminder from prompt.");
    } finally {
      setIsInterpreting(false);
    }
  };

  const handleManualCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const remindDate = form.remindAt ? new Date(form.remindAt).toISOString() : new Date().toISOString();
      const res = await apiClient.post("/personal/reminders", {
        title: form.title.trim(),
        remindAt: remindDate,
      });

      if (res.data?.success) {
        setForm({ title: "", remindAt: "" });
        setShowCreate(false);
        await fetchReminders();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create reminder.");
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (reminder: any) => {
    const next = !reminder.isCompleted;
    setReminders((p) => p.map((r) => (r.id === reminder.id ? { ...r, isCompleted: next } : r)));
    try {
      await apiClient.patch(`/personal/reminders/${reminder.id}`, { isCompleted: next });
    } catch {
      fetchReminders();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this reminder?")) return;
    setReminders((p) => p.filter((r) => r.id !== id));
    try {
      await apiClient.delete(`/personal/reminders/${id}`);
    } catch {
      fetchReminders();
    }
  };

  const filtered = reminders.filter((r) =>
    search.trim() ? (r.title || "").toLowerCase().includes(search.toLowerCase()) : true
  );

  const pending = filtered.filter((r) => !r.isCompleted);
  const completed = filtered.filter((r) => r.isCompleted);

  return (
    <div className="w-full min-h-full flex flex-col p-4 sm:p-6 md:p-8 space-y-6">
      {/* ── Header ── */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Reminders</h1>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">
            Personal scheduled alerts and execution reminders.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search reminders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-background border border-border text-xs font-medium text-foreground focus:outline-none focus:border-foreground/30"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="px-4 h-9 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-all flex items-center gap-1.5 shrink-0 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" /> New Reminder
          </button>
        </div>
      </header>

      {/* ── Prompt Creation ── */}
      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-3 shadow-xs">
        <div>
          <h2 className="text-xs font-bold text-foreground">Set Reminder with Prompt</h2>
          <p className="text-[11px] text-muted-foreground font-medium">
            Describe what you want to be reminded about and when.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2">
          <input
            type="text"
            placeholder="e.g. Remind me tomorrow at 7 PM to review GraphQL learning goals..."
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            className="w-full h-10 px-3.5 rounded-xl bg-background border border-border text-xs font-medium text-foreground focus:outline-none focus:border-foreground/30"
          />
          <button
            type="button"
            onClick={handlePromptCreate}
            disabled={isInterpreting || !promptInput.trim()}
            className="w-full sm:w-auto px-4 h-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs transition-all flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-40"
          >
            Set Reminder <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>

      {/* ── Error Banner ── */}
      {error && (
        <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
          <button onClick={fetchReminders} className="text-xs underline font-bold">
            Retry
          </button>
        </div>
      )}

      {/* ── Reminders List ── */}
      <section className="flex-1 min-h-0 space-y-5">
        {loading ? (
          <div className="py-12 text-center text-xs text-muted-foreground font-medium">
            Loading reminders...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-dashed border-border bg-card space-y-2">
            <Bell className="w-8 h-8 text-muted-foreground mx-auto opacity-50" />
            <p className="text-xs font-bold text-foreground">No reminders yet</p>
            <p className="text-[11px] text-muted-foreground max-w-sm mx-auto font-medium">
              Create a scheduled reminder above or tap New Reminder.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Pending Reminders */}
            {pending.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  UPCOMING REMINDERS ({pending.length})
                </h3>
                <div className="divide-y divide-border rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
                  {pending.map((r) => (
                    <div
                      key={r.id}
                      className="p-4 flex items-center justify-between gap-3 hover:bg-muted/20 transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          onClick={() => handleToggle(r)}
                          className="text-muted-foreground hover:text-foreground shrink-0"
                        >
                          <Circle className="w-4 h-4" />
                        </button>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">{r.title}</p>
                          <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {r.remindAt ? new Date(r.remindAt).toLocaleString() : "Scheduled"}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDelete(r.id)}
                        className="p-1 rounded-lg text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Completed Reminders */}
            {completed.length > 0 && (
              <div className="space-y-2 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  COMPLETED ({completed.length})
                </h3>
                <div className="divide-y divide-border rounded-2xl border border-border bg-card/60 overflow-hidden">
                  {completed.map((r) => (
                    <div
                      key={r.id}
                      className="p-4 flex items-center justify-between gap-3 opacity-60 hover:opacity-100 transition-opacity"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          onClick={() => handleToggle(r)}
                          className="text-emerald-500 shrink-0"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <p className="text-xs font-medium text-muted-foreground line-through truncate">
                          {r.title}
                        </p>
                      </div>

                      <button
                        onClick={() => handleDelete(r.id)}
                        className="p-1 rounded-lg text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Manual Create Modal ── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleManualCreate}
            className="bg-card border border-border text-card-foreground rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground">New Reminder</h3>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-foreground mb-1">REMINDER TITLE *</label>
                <input
                  type="text"
                  placeholder="e.g. Review GraphQL schema docs"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-background border border-border text-xs font-medium text-foreground focus:outline-none focus:border-gold"
                />
              </div>

              <div>
                <label className="block font-bold text-foreground mb-1">DATE & TIME</label>
                <input
                  type="datetime-local"
                  value={form.remindAt}
                  onChange={(e) => setForm({ ...form, remindAt: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-background border border-border text-xs font-medium text-foreground focus:outline-none focus:border-gold"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 rounded-xl border border-border text-xs font-bold text-muted-foreground"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating || !form.title.trim()}
                className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs disabled:opacity-50"
              >
                {creating ? "Saving..." : "Save Reminder"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
