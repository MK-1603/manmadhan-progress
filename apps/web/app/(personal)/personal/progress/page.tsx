"use client";

import { motion } from "framer-motion";
import { Plus, TrendingUp, Calendar, Heart, FileText, Smile } from "lucide-react";
import { useState, useEffect } from "react";
import apiClient from "@/lib/api-client";

interface ProgressUpdate {
  id: string;
  content: string;
  type: string;
  mood: string | null;
  blockers: string | null;
  createdAt: string;
}

export default function ProgressPage() {
  const [mounted, setMounted] = useState(false);
  const [updates, setUpdates] = useState<ProgressUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  
  const [content, setContent] = useState("");
  const [type, setType] = useState("Daily");
  const [mood, setMood] = useState("Productive");
  const [blockers, setBlockers] = useState("");

  useEffect(() => {
    setMounted(true);
    fetchUpdates();
  }, []);

  const fetchUpdates = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/progress");
      if (res.data.success) {
        setUpdates(res.data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content) return;
    try {
      const res = await apiClient.post("/progress", {
        content,
        type,
        mood,
        blockers: blockers || null,
      });

      if (res.data.success) {
        setContent("");
        setBlockers("");
        setCreateOpen(false);
        fetchUpdates();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* HEADER */}
      <header className="px-6 md:px-10 pt-8 pb-6 border-b border-border bg-card">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              <span>Personal</span>
              <span>/</span>
              <span className="text-foreground">Productivity</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Progress Updates</h1>
            <p className="text-sm text-muted-foreground mt-1">Review and log your workspace updates and deliverables.</p>
          </div>
          <button 
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-foreground text-background hover:bg-foreground/90 active:scale-[0.98] transition-all text-sm font-bold shadow-sm rounded-xl"
          >
            <Plus className="w-4 h-4" /> Log Progress
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-[1400px] mx-auto p-6 md:p-10">
        {loading ? (
          <div className="space-y-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 rounded-3xl bg-card border border-border/50 animate-pulse" />
            ))}
          </div>
        ) : updates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border/60 rounded-3xl bg-card/20">
            <TrendingUp className="w-12 h-12 text-muted-foreground/60 mb-4" />
            <h3 className="text-lg font-bold text-foreground mb-1">No progress updates logged</h3>
            <p className="text-sm text-muted-foreground mb-6">Log your first progress update to start tracking your daily or weekly execution velocity.</p>
            <button 
              onClick={() => setCreateOpen(true)}
              className="px-5 py-2.5 bg-foreground text-background hover:bg-foreground/90 transition-colors text-sm font-bold rounded-xl"
            >
              Log Progress
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {updates.map((update, i) => (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                key={update.id}
                className="bg-card border border-border/50 rounded-3xl p-6 shadow-xs hover:shadow-md hover:border-border transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-gold/10 text-gold border border-gold/20">
                      {update.type} Update
                    </span>
                    {update.mood && (
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-md">
                        <Smile className="w-3.5 h-3.5 text-gold" />
                        {update.mood}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(update.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm font-medium text-foreground leading-relaxed whitespace-pre-wrap">
                  {update.content}
                </p>
                {update.blockers && (
                  <div className="mt-4 p-3 bg-red-500/5 border border-red-500/10 rounded-xl">
                    <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest block mb-1">Blockers</span>
                    <p className="text-xs text-muted-foreground leading-relaxed">{update.blockers}</p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* LOG PROGRESS POPUP */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl"
          >
            <h3 className="text-lg font-bold mb-4">Log Progress Update</h3>
            <form onSubmit={handleCreateUpdate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Interval</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-3 py-2 bg-muted/40 border border-border/80 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-gold/30 text-foreground"
                  >
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Mood/Energy</label>
                  <select
                    value={mood}
                    onChange={(e) => setMood(e.target.value)}
                    className="w-full px-3 py-2 bg-muted/40 border border-border/80 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-gold/30 text-foreground"
                  >
                    <option value="Productive">Productive</option>
                    <option value="Focused">Focused</option>
                    <option value="Creative">Creative</option>
                    <option value="Tired">Tired</option>
                    <option value="Stressed">Stressed</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Progress details</label>
                <textarea
                  required
                  placeholder="What did you work on or accomplish?"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2.5 bg-muted/40 border border-border/80 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-gold/30 text-foreground resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Blockers (Optional)</label>
                <textarea
                  placeholder="Are there any bottlenecks holding you back?"
                  value={blockers}
                  onChange={(e) => setBlockers(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2.5 bg-muted/40 border border-border/80 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-gold/30 text-foreground resize-none"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-foreground text-background hover:bg-foreground/90 transition-colors text-xs font-bold rounded-lg shadow-sm"
                >
                  Save Update
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
