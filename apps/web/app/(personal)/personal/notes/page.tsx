"use client";

import React, { useEffect, useState, useCallback } from "react";
import apiClient from "@/lib/api-client";
import { LoaderCircle, Plus, FileText, Search, Folder, Star, Pin, MoreVertical, X, Check, Save } from "lucide-react";
import { useSocket } from "@/components/providers/socket-provider";
import { useConfirm } from "@/hooks/use-confirm";

export default function NotesPage() {
  const { socket, isConnected } = useSocket();
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFolder, setActiveFolder] = useState("All");
  const { confirm } = useConfirm();

  // Editor State
  const [activeNote, setActiveNote] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [folder, setFolder] = useState("All");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchNotes = useCallback(async () => {
    try {
      const response = await apiClient.get("/personal/notes");
      setNotes(response.data.data);
    } catch (err) {
      console.error("Failed to load notes", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.on("note_created", (newNote: any) => {
      setNotes(prev => [newNote, ...prev]);
    });

    socket.on("note_updated", (updatedNote: any) => {
      setNotes(prev => prev.map(n => n.id === updatedNote.id ? updatedNote : n));
      if (activeNote && activeNote.id === updatedNote.id) {
        // Sync active note state silently if updated remotely
        setActiveNote(updatedNote);
      }
    });

    socket.on("note_deleted", ({ id }: { id: string }) => {
      setNotes(prev => prev.filter(n => n.id !== id));
      if (activeNote && activeNote.id === id) {
        setActiveNote(null);
      }
    });

    return () => {
      socket.off("note_created");
      socket.off("note_updated");
      socket.off("note_deleted");
    };
  }, [socket, isConnected, activeNote]);

  const handleCreateNew = () => {
    setActiveNote({ id: "new" });
    setTitle("");
    setBody("");
    setFolder(activeFolder !== "All" ? activeFolder : "Personal");
  };

  const handleSelectNote = (note: any) => {
    setActiveNote(note);
    setTitle(note.title);
    setBody(note.body || "");
    setFolder(note.folder || "All");
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    setSaveSuccess(false);
    try {
      if (activeNote.id === "new") {
        const response = await apiClient.post("/personal/notes", {
          title,
          body,
          folder,
        });
        setActiveNote(response.data.data);
      } else {
        const response = await apiClient.patch(`/personal/notes/${activeNote.id}`, {
          title,
          body,
          folder,
        });
        setActiveNote(response.data.data);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error("Failed to save note", err);
    } finally {
      setSaving(false);
    }
  };

  const togglePin = async (note: any, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiClient.patch(`/personal/notes/${note.id}`, { isPinned: !note.isPinned });
    } catch (err) {
      console.error("Failed to pin note", err);
    }
  };

  const toggleFavorite = async (note: any, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiClient.patch(`/personal/notes/${note.id}`, { isFavorite: !note.isFavorite });
    } catch (err) {
      console.error("Failed to favorite note", err);
    }
  };

  const deleteNote = async (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await confirm({
      title: "Delete Note",
      description: "Are you sure you want to delete this note? This action cannot be undone.",
      variant: "destructive",
      confirmLabel: "Delete"
    });
    if (ok) {
      try {
        await apiClient.delete(`/personal/notes/${noteId}`);
      } catch (err) {
        console.error("Failed to delete note", err);
      }
    }
  };

  // Derive unique folders
  const folders = ["All", ...Array.from(new Set(notes.map(n => n.folder).filter(Boolean))).filter(f => f !== "All")];

  const filteredNotes = notes.filter(n => {
    if (activeFolder !== "All" && n.folder !== activeFolder) return false;
    if (search.trim()) {
      const s = search.toLowerCase();
      if (!n.title?.toLowerCase().includes(s) && !n.body?.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  const pinnedNotes = filteredNotes.filter(n => n.isPinned);
  const unpinnedNotes = filteredNotes.filter(n => !n.isPinned);

  return (
    <div className="w-full h-full flex flex-col md:flex-row bg-[#FAFAFA] dark:bg-[#080808] animate-in fade-in duration-500 overflow-hidden">
      
      {/* Sidebar: Notes List */}
      <div className={`w-full md:w-[320px] lg:w-[380px] h-full flex flex-col border-r border-[#E5E7EB] dark:border-[#242424] bg-white dark:bg-[#111111] ${activeNote ? 'hidden md:flex' : 'flex'}`}>
        
        <div className="p-4 border-b border-[#E5E7EB] dark:border-[#242424]">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-[#171717] dark:text-[#F5F5F5]">Notes</h1>
            <button 
              onClick={handleCreateNew}
              className="w-8 h-8 rounded-full bg-[#171717] dark:bg-[#F5F5F5] text-white dark:text-[#080808] flex items-center justify-center hover:bg-[#333333] dark:hover:bg-[#E5E7EB] transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A1A1AA]" />
            <input 
              type="text" 
              placeholder="Search notes..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-4 rounded-md border border-[#E5E7EB] dark:border-[#242424] bg-[#F4F4F5]/50 dark:bg-[#1D1D1D]/50 text-sm focus:outline-none focus:border-[#A1A1AA] dark:focus:border-[#52525B] transition-colors"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
            {folders.map(f => (
              <button 
                key={f}
                onClick={() => setActiveFolder(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${activeFolder === f ? 'bg-[#171717] dark:bg-[#F5F5F5] text-white dark:text-[#080808]' : 'bg-[#F4F4F5] dark:bg-[#1D1D1D] text-[#52525B] dark:text-[#A1A1AA] hover:text-[#171717] dark:hover:text-[#F5F5F5]'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading ? (
            <div className="flex justify-center p-8">
              <LoaderCircle className="w-6 h-6 text-[#A1A1AA] animate-spin" />
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-[#A1A1AA]">
              <FileText className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">No notes found.</p>
            </div>
          ) : (
            <>
              {pinnedNotes.length > 0 && (
                <div className="mb-4">
                  <h3 className="px-3 text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider mb-2">Pinned</h3>
                  {pinnedNotes.map(note => (
                    <NoteListItem 
                      key={note.id} 
                      note={note} 
                      isActive={activeNote?.id === note.id}
                      onClick={() => handleSelectNote(note)}
                      onPin={(e: React.MouseEvent) => togglePin(note, e)}
                      onFavorite={(e: React.MouseEvent) => toggleFavorite(note, e)}
                      onDelete={(e: React.MouseEvent) => deleteNote(note.id, e)}
                    />
                  ))}
                </div>
              )}
              
              <div>
                {pinnedNotes.length > 0 && unpinnedNotes.length > 0 && (
                  <h3 className="px-3 text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider mt-4 mb-2">All Notes</h3>
                )}
                {unpinnedNotes.map(note => (
                  <NoteListItem 
                    key={note.id} 
                    note={note} 
                    isActive={activeNote?.id === note.id}
                    onClick={() => handleSelectNote(note)}
                    onPin={(e: React.MouseEvent) => togglePin(note, e)}
                    onFavorite={(e: React.MouseEvent) => toggleFavorite(note, e)}
                    onDelete={(e: React.MouseEvent) => deleteNote(note.id, e)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Editor Area */}
      {activeNote ? (
        <div className="flex-1 h-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
          
          <div className="h-14 border-b border-[#E5E7EB] dark:border-[#242424] bg-white dark:bg-[#111111] flex items-center justify-between px-4 lg:px-8">
            <div className="flex items-center gap-4">
              <button onClick={() => setActiveNote(null)} className="md:hidden text-[#A1A1AA] hover:text-[#171717]">
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2 text-sm text-[#52525B] dark:text-[#A1A1AA]">
                <Folder className="w-4 h-4" />
                <input 
                  type="text" 
                  value={folder} 
                  onChange={(e) => setFolder(e.target.value)}
                  placeholder="Folder"
                  className="bg-transparent focus:outline-none w-32 border-b border-transparent focus:border-[#E5E7EB] dark:focus:border-[#242424] transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className={`text-xs flex items-center gap-1 transition-opacity duration-300 ${saveSuccess ? 'text-green-500 opacity-100' : 'opacity-0'}`}>
                <Check className="w-3 h-3" /> Saved
              </span>
              <button 
                onClick={handleSave}
                disabled={!title.trim() || saving}
                className="h-8 px-4 rounded-md bg-[#171717] dark:bg-[#F5F5F5] text-white dark:text-[#080808] text-sm font-medium hover:bg-[#333333] dark:hover:bg-[#E5E7EB] transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span className="hidden sm:inline">Save</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-[#FAFAFA] dark:bg-[#080808] p-4 lg:p-8">
            <div className="max-w-3xl mx-auto">
              <input 
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Note Title"
                className="w-full text-4xl lg:text-5xl font-bold bg-transparent border-none focus:outline-none focus:ring-0 text-[#171717] dark:text-[#F5F5F5] placeholder:text-[#E5E7EB] dark:placeholder:text-[#242424] mb-8 leading-tight tracking-tight"
              />
              <textarea 
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Start writing..."
                className="w-full min-h-[60vh] bg-transparent border-none focus:outline-none focus:ring-0 text-[#171717] dark:text-[#F5F5F5] text-[16px] lg:text-[18px] leading-relaxed resize-none placeholder:text-[#A1A1AA]"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 h-full flex-col items-center justify-center p-8 text-center bg-[#FAFAFA] dark:bg-[#080808]">
          <FileText className="w-16 h-16 text-[#E5E7EB] dark:text-[#242424] mb-4" />
          <h2 className="text-2xl font-bold text-[#171717] dark:text-[#F5F5F5] mb-2">Select a note</h2>
          <p className="text-[#52525B] dark:text-[#A1A1AA] max-w-sm mb-6">
            Choose a note from the sidebar or create a new one to start capturing your ideas.
          </p>
          <button 
            onClick={handleCreateNew}
            className="h-10 px-6 rounded-full bg-[#171717] dark:bg-[#F5F5F5] text-white dark:text-[#080808] text-sm font-medium hover:bg-[#333333] dark:hover:bg-[#E5E7EB] transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Note
          </button>
        </div>
      )}
    </div>
  );
}

function NoteListItem({ note, isActive, onClick, onPin, onFavorite, onDelete }: any) {
  return (
    <div 
      onClick={onClick}
      className={`group cursor-pointer p-3 rounded-xl border transition-all ${isActive ? 'bg-white dark:bg-[#1A1A1A] border-[#E5E7EB] dark:border-[#333333] shadow-sm' : 'bg-transparent border-transparent hover:bg-[#F4F4F5]/50 dark:hover:bg-[#1D1D1D]/50'}`}
    >
      <div className="flex justify-between items-start mb-1">
        <h4 className={`text-sm font-semibold truncate pr-2 ${isActive ? 'text-[#171717] dark:text-[#F5F5F5]' : 'text-[#171717] dark:text-[#F5F5F5]'}`}>
          {note.title || "Untitled Note"}
        </h4>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onPin} className={`p-1 rounded-md hover:bg-[#E5E7EB] dark:hover:bg-[#333333] ${note.isPinned ? 'text-[#171717] dark:text-[#F5F5F5]' : 'text-[#A1A1AA]'}`}>
            <Pin className="w-3.5 h-3.5" />
          </button>
          <button onClick={onFavorite} className={`p-1 rounded-md hover:bg-[#E5E7EB] dark:hover:bg-[#333333] ${note.isFavorite ? 'text-[#F5B800]' : 'text-[#A1A1AA]'}`}>
            <Star className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete} className="p-1 rounded-md hover:bg-[#E5E7EB] dark:hover:bg-[#333333] text-[#A1A1AA] hover:text-red-500">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      
      <p className="text-xs text-[#A1A1AA] line-clamp-2 mb-2 leading-relaxed">
        {note.body || "No additional content..."}
      </p>
      
      <div className="flex items-center justify-between text-[11px] text-[#A1A1AA]">
        <span>{new Date(note.updatedAt || note.createdAt).toLocaleDateString()}</span>
        <span className="px-1.5 py-0.5 rounded-sm bg-[#E5E7EB]/50 dark:bg-[#242424] text-[10px]">{note.folder}</span>
      </div>
    </div>
  );
}
