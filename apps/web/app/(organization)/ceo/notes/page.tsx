"use client";

import { useState, useEffect } from "react";
import { Notebook, Plus, Search, Loader2, AlertCircle, Pin, PinOff, Trash2 } from "lucide-react";
import apiClient from "@/lib/api-client";
import { PremiumCard } from "@/components/ui/premium-card";
import { motion, AnimatePresence } from "framer-motion";

export default function CEONotesPage() {
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchNotes = async () => {
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      if (!workspaceId) return;
      const res = await apiClient.get(`/personal/notes?workspaceId=${workspaceId}&type=org`);
      if (res.data.success) setNotes(res.data.data || []);
    } catch { setError("Unable to load notes"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchNotes(); }, []);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setSaving(true);
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      const res = await apiClient.post("/personal/notes", { workspaceId, title: newTitle, content: newContent });
      if (res.data.success) { setNewTitle(""); setNewContent(""); setShowCreate(false); fetchNotes(); }
    } catch { setError("Failed to create note"); }
    finally { setSaving(false); }
  };

  const filtered = notes.filter(n => (n.title || "").toLowerCase().includes(search.toLowerCase()) || (n.content || "").toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 lg:p-8 max-w-[1200px] mx-auto w-full space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Notebook className="w-6 h-6 text-primary" /> Notes
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Organization notes, decisions, and meeting minutes</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> New Note
        </button>
      </div>

      {error && <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500 text-sm"><AlertCircle className="w-4 h-4 shrink-0" /> {error}</div>}

      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <PremiumCard className="border-primary/20">
              <div className="space-y-3">
                <input
                  autoFocus
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Note title..."
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 font-semibold"
                />
                <textarea
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  placeholder="Write your note..."
                  rows={4}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 resize-none"
                />
                <div className="flex gap-3">
                  <button onClick={handleCreate} disabled={saving || !newTitle.trim()} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors">
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Save Note
                  </button>
                  <button onClick={() => { setShowCreate(false); setNewTitle(""); setNewContent(""); }} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors">Cancel</button>
                </div>
              </div>
            </PremiumCard>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notes..." className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/30" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Notebook className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{search ? "No notes match your search" : "No notes yet"}</p>
          {!search && <button onClick={() => setShowCreate(true)} className="mt-3 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90">Create First Note</button>}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(note => (
            <PremiumCard key={note.id} className="hover:border-border/80 transition-colors cursor-pointer">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="text-sm font-semibold text-foreground line-clamp-1">{note.title}</h3>
                {note.isPinned && <Pin className="w-3.5 h-3.5 text-gold shrink-0" />}
              </div>
              {note.content && <p className="text-xs text-muted-foreground line-clamp-3">{note.content}</p>}
              <p className="text-[10px] text-muted-foreground/70 mt-3">{new Date(note.createdAt).toLocaleDateString()}</p>
            </PremiumCard>
          ))}
        </div>
      )}
    </div>
  );
}
