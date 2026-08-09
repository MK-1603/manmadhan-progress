"use client";

import { motion } from "framer-motion";
import { Plus, Lightbulb, Calendar } from "lucide-react";
import { useState, useEffect } from "react";
import apiClient from "@/lib/api-client";

export default function IdeasPage() {
  const [mounted, setMounted] = useState(false);
  const [ideasList, setIdeasList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  useEffect(() => {
    setMounted(true);
    fetchIdeas();
  }, []);

  const fetchIdeas = async () => {
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      if (!workspaceId) return;
      setLoading(true);
      const res = await apiClient.get(`/personal/ideas?workspaceId=${workspaceId}`);
      if (res.data.success) setIdeasList(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      if (!workspaceId) return;
      const res = await apiClient.post("/personal/ideas", { title, content, workspaceId });
      if (res.data.success) {
        setTitle("");
        setContent("");
        setOpen(false);
        fetchIdeas();
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-background pb-24 text-foreground font-sans">
      <header className="px-6 md:px-10 pt-8 pb-6 border-b border-border bg-card">
        <div className="max-w-4xl mx-auto flex justify-between items-end">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              <span>Personal</span> / <span className="text-foreground">Mindset</span>
            </div>
            <h1 className="text-3xl font-bold">Ideas & Brainstorming</h1>
          </div>
          <button onClick={() => setOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-foreground text-background rounded-xl font-bold text-sm shadow-sm hover:bg-foreground/90 transition-all active:scale-95">
            <Plus className="w-4 h-4" /> Add Idea
          </button>
        </div>
      </header>
      <main className="max-w-4xl mx-auto p-6 md:p-10">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
            <div className="h-32 bg-card border border-border/50 rounded-3xl" />
            <div className="h-32 bg-card border border-border/50 rounded-3xl" />
          </div>
        ) : ideasList.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-border/60 rounded-3xl bg-card/25 animate-fadeIn">
            <Lightbulb className="w-12 h-12 text-muted-foreground/60 mx-auto mb-4" />
            <h3 className="text-lg font-bold mb-1">No ideas captured yet</h3>
            <p className="text-sm text-muted-foreground mb-6">Quick capture raw creative thoughts, project concepts or feature updates.</p>
            <button onClick={() => setOpen(true)} className="px-5 py-2.5 bg-foreground text-background font-bold rounded-xl text-sm">Add Idea</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {ideasList.map((idea) => (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={idea.id} className="bg-card border border-border/50 rounded-3xl p-6 shadow-xs hover:border-border transition-colors">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> {new Date(idea.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="text-lg font-bold mb-2 text-foreground">{idea.title}</h3>
                {idea.content && <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{idea.content}</p>}
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold mb-4">Add New Idea</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Idea Title</label>
                <input required placeholder="e.g. Smart focus music integration" type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-2 bg-muted/40 border border-border/80 rounded-xl text-sm text-foreground focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Details</label>
                <textarea placeholder="Describe the idea..." value={content} onChange={(e) => setContent(e.target.value)} rows={4} className="w-full px-4 py-2.5 bg-muted/40 border border-border/80 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-gold/30 text-foreground resize-none" />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-xs font-semibold text-muted-foreground">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-foreground text-background hover:bg-foreground/90 font-bold rounded-lg text-xs shadow-sm">Save Idea</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
