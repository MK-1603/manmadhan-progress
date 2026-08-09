"use client";

import { useEffect, useState } from "react";
import { Plus, FileText, Search, Folder, Hash, Settings, MoreHorizontal } from "lucide-react";
import apiClient from "@/lib/api-client";

type Note = {
  id: string;
  title: string;
  body: string;
  folder: string;
  tags: string[];
  updatedAt: string;
};

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Editor State
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const fetchNotes = async () => {
    try {
      const result = await apiClient.get(`/personal/notes`);
      const data = result.data?.data ?? [];
      setNotes(data);
      if (data.length > 0 && !selectedNoteId) {
        selectNote(data[0]);
      } else if (data.length === 0) {
        // create new draft
        createNewNote();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const selectNote = (note: Note) => {
    setSelectedNoteId(note.id);
    setTitle(note.title);
    setBody(note.body || "");
  };

  const createNewNote = async () => {
    try {
      const res = await apiClient.post(`/personal/notes`, {
        title: "Untitled Note",
        body: "",
        folder: "All"
      });
      const newNote = res.data.data;
      setNotes([newNote, ...notes]);
      selectNote(newNote);
    } catch (e) {
      console.error(e);
    }
  };

  const saveNote = async () => {
    if (!selectedNoteId) return;
    setIsSaving(true);
    try {
      await apiClient.patch(`/personal/notes/${selectedNoteId}`, {
        title,
        body
      });
      setNotes(notes.map(n => n.id === selectedNoteId ? { ...n, title, body, updatedAt: new Date().toISOString() } : n));
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  // Debounced auto-save effect
  useEffect(() => {
    if (!selectedNoteId || loading) return;
    const timeout = setTimeout(() => {
      const original = notes.find(n => n.id === selectedNoteId);
      if (original && (original.title !== title || original.body !== body)) {
        saveNote();
      }
    }, 1000);
    return () => clearTimeout(timeout);
  }, [title, body]);

  return (
    <div className="h-screen bg-background flex text-foreground font-sans overflow-hidden">
      {/* Sidebar 1: Folders & Tags */}
      <aside className="w-64 border-r border-border bg-card/50 flex flex-col shrink-0">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="font-bold text-sm tracking-widest uppercase text-muted-foreground">Knowledge Base</div>
          <button className="p-1 hover:bg-accent rounded"><Settings className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-6 text-sm">
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">Folders</h3>
            <div className="space-y-0.5">
              <button className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent text-foreground font-medium"><Folder className="w-4 h-4" /> All Notes</button>
              <button className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-accent/50 text-muted-foreground"><Folder className="w-4 h-4" /> Study</button>
              <button className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-accent/50 text-muted-foreground"><Folder className="w-4 h-4" /> Research</button>
              <button className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-accent/50 text-muted-foreground"><Folder className="w-4 h-4" /> Projects</button>
            </div>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">Tags</h3>
            <div className="space-y-0.5">
              <button className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-accent/50 text-muted-foreground"><Hash className="w-4 h-4" /> ai-engineering</button>
              <button className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-accent/50 text-muted-foreground"><Hash className="w-4 h-4" /> ideas</button>
            </div>
          </div>
        </div>
      </aside>

      {/* Sidebar 2: Note List */}
      <aside className="w-80 border-r border-border bg-background flex flex-col shrink-0">
        <div className="p-4 border-b border-border flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg">All Notes</h2>
            <button onClick={createNewNote} className="p-1.5 bg-foreground text-background rounded-lg hover:bg-foreground/90 transition-all">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <input type="text" placeholder="Search notes..." className="w-full pl-9 pr-3 py-2 text-sm bg-card border border-border rounded-xl outline-none focus:ring-2 focus:ring-ring" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {notes.map(note => (
            <button 
              key={note.id} 
              onClick={() => selectNote(note)}
              className={`w-full text-left p-4 border-b border-border/50 hover:bg-accent/50 transition-colors ${selectedNoteId === note.id ? "bg-accent/80" : ""}`}
            >
              <h3 className="font-bold text-sm line-clamp-1">{note.title}</h3>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{note.body || "No content"}</p>
              <div className="text-[10px] text-muted-foreground font-semibold mt-2">{new Date(note.updatedAt).toLocaleDateString()}</div>
            </button>
          ))}
        </div>
      </aside>

      {/* Main Editor */}
      <main className="flex-1 flex flex-col bg-background h-full">
        {selectedNoteId ? (
          <>
            <div className="h-14 border-b border-border flex items-center justify-between px-6 shrink-0">
              <div className="text-xs text-muted-foreground font-medium">
                {isSaving ? "Saving..." : "All changes saved"}
              </div>
              <button className="p-2 hover:bg-accent rounded-lg text-muted-foreground"><MoreHorizontal className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 md:p-12 max-w-4xl mx-auto w-full">
              <input 
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Note Title"
                className="w-full text-4xl font-bold bg-transparent border-none outline-none mb-6 placeholder:text-muted-foreground/30"
              />
              {/* Fallback to simple textarea for now until TipTap is mounted */}
              <textarea 
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Start writing... Use [[Backlinks]] to connect concepts."
                className="w-full h-full min-h-[500px] text-base leading-relaxed bg-transparent border-none outline-none resize-none placeholder:text-muted-foreground/30 font-serif"
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center flex-col text-muted-foreground">
            <FileText className="w-16 h-16 opacity-20 mb-4" />
            <p>Select a note or create a new one</p>
          </div>
        )}
      </main>
    </div>
  );
}
