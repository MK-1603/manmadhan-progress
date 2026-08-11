"use client";

import { useState, useEffect, useCallback } from "react";
import { Notebook, Plus, Search, Loader2, AlertCircle, Pin, Trash2, X } from "lucide-react";
import apiClient from "@/lib/api-client";

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(d).toLocaleDateString();
}

export default function CEONotesPage() {
  const [notes, setNotes]       = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [search, setSearch]     = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      const wsId = localStorage.getItem("workspaceId");
      if (!wsId) return;
      const res = await apiClient.get(`/personal/notes?workspaceId=${wsId}&type=org`);
      if (res.data.success) setNotes(res.data.data || []);
      else setError("Failed to load notes.");
    } catch { setError("Unable to load notes."); }
    finally   { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async () => {
    if (!newTitle.trim()) return;
    setSaving(true);
    try {
      const wsId = localStorage.getItem("workspaceId");
      const res  = await apiClient.post("/personal/notes", { workspaceId: wsId, title: newTitle.trim(), content: newContent.trim() });
      if (res.data.success) { setNewTitle(""); setNewContent(""); setShowCreate(false); fetch(); }
      else setError("Failed to create note.");
    } catch { setError("Failed to create note."); }
    finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this note?")) return;
    setDeleting(id);
    try {
      await apiClient.delete(`/personal/notes/${id}`);
      fetch();
    } catch { setError("Failed to delete note."); }
    finally { setDeleting(null); }
  };

  const filtered = notes.filter(n =>
    (n.title || "").toLowerCase().includes(search.toLowerCase()) ||
    (n.content || "").toLowerCase().includes(search.toLowerCase())
  );

  const pinned = filtered.filter(n => n.isPinned);
  const rest   = filtered.filter(n => !n.isPinned);

  const NoteCard = ({ note }: { note: any }) => (
    <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-3 hover:border-border/80 transition-colors group">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[13px] font-semibold text-foreground line-clamp-1 flex-1">{note.title}</h3>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {note.isPinned && <Pin className="w-3 h-3 text-gold" />}
          <button
            onClick={() => remove(note.id)}
            disabled={deleting === note.id}
            className="p-1 rounded-lg text-muted-foreground hover:text-red-500 transition-colors"
            aria-label="Delete note"
          >
            {deleting === note.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
          </button>
        </div>
      </div>
      {note.content && (
        <p className="text-[12px] text-muted-foreground line-clamp-3 leading-relaxed">{note.content}</p>
      )}
      <p className="text-[10px] text-muted-foreground/60 mt-auto">{timeAgo(note.createdAt)}</p>
    </div>
  );

  return (
    <div className="px-5 md:px-8 xl:px-10 pt-7 pb-16 max-w-[1200px] mx-auto space-y-5">

      {/* ── header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">ManMadhan · CEO</p>
          <h1 className="text-[24px] font-bold text-foreground tracking-tight leading-none">Notes</h1>
          <p className="text-[12px] text-muted-foreground mt-1.5">Organization decisions, meeting notes, and working records.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gold hover:bg-gold-hover text-[#111827] text-[12px] font-bold transition-colors self-start sm:self-center"
        >
          <Plus className="w-3.5 h-3.5" /> New Note
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-card border border-border rounded-xl text-[12px] text-muted-foreground">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
        </div>
      )}

      {/* ── search ── */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search notes..."
          className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-xl text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-gold"
        />
      </div>

      {/* ── create note panel ── */}
      {showCreate && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-widest">New Note</span>
            <button onClick={() => { setShowCreate(false); setNewTitle(""); setNewContent(""); }} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <input
            autoFocus
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="Note title..."
            className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-[13px] font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-gold"
          />
          <textarea
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
            placeholder="Write your note..."
            rows={4}
            className="w-full px-3.5 py-3 bg-background border border-border rounded-xl text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-gold resize-none"
          />
          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={() => { setShowCreate(false); setNewTitle(""); setNewContent(""); }}
              className="px-4 py-2 rounded-xl border border-border text-[12px] font-semibold text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={create}
              disabled={saving || !newTitle.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gold hover:bg-gold-hover text-[#111827] text-[12px] font-bold transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Save Note
            </button>
          </div>
        </div>
      )}

      {/* ── notes ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 text-gold animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center border border-border border-dashed rounded-2xl">
          <Notebook className="w-8 h-8 text-muted-foreground/30" />
          <p className="text-[13px] font-semibold text-foreground">{search ? "No notes match your search" : "No notes yet"}</p>
          <p className="text-[12px] text-muted-foreground">Create a note to capture decisions, meeting notes, or working records.</p>
          {!search && (
            <button onClick={() => setShowCreate(true)} className="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gold hover:bg-gold-hover text-[#111827] text-[12px] font-bold transition-colors">
              <Plus className="w-3.5 h-3.5" /> Create First Note
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {pinned.length > 0 && (
            <div>
              <p className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Pin className="w-3 h-3" /> Pinned
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {pinned.map(n => <NoteCard key={n.id} note={n} />)}
              </div>
            </div>
          )}
          {rest.length > 0 && (
            <div>
              {pinned.length > 0 && (
                <p className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">Notes</p>
              )}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {rest.map(n => <NoteCard key={n.id} note={n} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
