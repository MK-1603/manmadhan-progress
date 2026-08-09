"use client";

import { motion } from "framer-motion";
import { Plus, Bell, Calendar, Check } from "lucide-react";
import { useState, useEffect } from "react";
import apiClient from "@/lib/api-client";

export default function RemindersPage() {
  const [mounted, setMounted] = useState(false);
  const [remindersList, setRemindersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [remindAt, setRemindAt] = useState("");

  useEffect(() => {
    setMounted(true);
    fetchReminders();
  }, []);

  const fetchReminders = async () => {
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      if (!workspaceId) return;
      setLoading(true);
      const res = await apiClient.get(`/personal/reminders?workspaceId=${workspaceId}`);
      if (res.data.success) setRemindersList(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !remindAt) return;
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      if (!workspaceId) return;
      const res = await apiClient.post("/personal/reminders", { title, remindAt, workspaceId });
      if (res.data.success) {
        setTitle("");
        setRemindAt("");
        setOpen(false);
        fetchReminders();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleComplete = async (id: string) => {
    try {
      const res = await apiClient.patch(`/personal/reminders/${id}/complete`);
      if (res.data.success) fetchReminders();
    } catch (e) {
      console.error(e);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-background pb-24 text-foreground font-sans">
      <header className="px-6 md:px-10 pt-8 pb-6 border-b border-border bg-card">
        <div className="max-w-5xl mx-auto flex justify-between items-end">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              <span>Personal</span> / <span className="text-foreground">Planner</span>
            </div>
            <h1 className="text-3xl font-bold">Reminders</h1>
          </div>
          <button onClick={() => setOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-foreground text-background rounded-xl font-bold text-sm shadow-sm hover:bg-foreground/90 transition-all active:scale-95">
            <Plus className="w-4 h-4" /> Add Reminder
          </button>
        </div>
      </header>
      <main className="max-w-5xl mx-auto p-6 md:p-10">
        {loading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-16 bg-card border border-border/50 rounded-2xl" />
            <div className="h-16 bg-card border border-border/50 rounded-2xl" />
          </div>
        ) : remindersList.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-border/60 rounded-3xl bg-card/25">
            <Bell className="w-12 h-12 text-muted-foreground/60 mx-auto mb-4" />
            <h3 className="text-lg font-bold mb-1">No reminders pending</h3>
            <p className="text-sm text-muted-foreground mb-6">Schedule critical alarms, alerts or deadlines.</p>
            <button onClick={() => setOpen(true)} className="px-5 py-2.5 bg-foreground text-background font-bold rounded-xl text-sm">Add Reminder</button>
          </div>
        ) : (
          <div className="space-y-4">
            {remindersList.map((reminder) => (
              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} key={reminder.id} className="bg-card border border-border/50 rounded-2xl p-4 flex items-center justify-between shadow-xs hover:border-border transition-colors">
                <div className="flex items-center gap-3">
                  <button onClick={() => !reminder.isCompleted && handleComplete(reminder.id)} className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${reminder.isCompleted ? "bg-emerald-500/25 border-emerald-500 text-emerald-500 cursor-default" : "border-muted-foreground/45 hover:border-gold"}`}>
                    {reminder.isCompleted && <Check className="w-3.5 h-3.5" />}
                  </button>
                  <div>
                    <span className={`text-sm font-semibold ${reminder.isCompleted ? "line-through text-muted-foreground" : "text-foreground"}`}>{reminder.title}</span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                      <Calendar className="w-3 h-3" /> {new Date(reminder.remindAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold mb-4">Add Reminder</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Reminder Text</label>
                <input required placeholder="e.g. Take daily backup" type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-2 bg-muted/40 border border-border/80 rounded-xl text-sm text-foreground focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Schedule Time</label>
                <input required type="datetime-local" value={remindAt} onChange={(e) => setRemindAt(e.target.value)} className="w-full px-4 py-2 bg-muted/40 border border-border/80 rounded-xl text-sm text-foreground focus:outline-none" />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-xs font-semibold text-muted-foreground">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-foreground text-background hover:bg-foreground/90 font-bold rounded-lg text-xs shadow-sm">Schedule</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
