"use client";

import { useEffect, useState } from "react";
import { Plus, Book, Star, Sparkles, Image as ImageIcon } from "lucide-react";
import apiClient from "@/lib/api-client";

type JournalEntry = {
  id: string;
  title: string;
  body: string;
  mood?: string;
  energy?: number;
  isMemory: boolean;
  date: string;
};

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [isDrafting, setIsDrafting] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [draftMood, setDraftMood] = useState("");
  const [draftIsMemory, setDraftIsMemory] = useState(false);

  const fetchEntries = async () => {
    try {
      const result = await apiClient.get(`/personal/journal`);
      const data = result.data?.data ?? [];
      setEntries(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const saveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftTitle) return;

    try {
      await apiClient.post(`/personal/journal`, {
        title: draftTitle,
        body: draftBody,
        mood: draftMood,
        isMemory: draftIsMemory
      });
      setIsDrafting(false);
      setDraftTitle("");
      setDraftBody("");
      setDraftMood("");
      setDraftIsMemory(false);
      fetchEntries();
    } catch (error) {
      console.error(error);
    }
  };

  const selectedEntry = entries.find(e => e.id === selectedEntryId);

  return (
    <div className="h-screen bg-background flex text-foreground font-sans overflow-hidden">
      {/* Sidebar: Life Timeline */}
      <aside className="w-80 md:w-96 border-r border-border bg-card/30 flex flex-col shrink-0">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            <span>Personal</span> / <span className="text-foreground">Life</span>
          </div>
          <h1 className="text-2xl font-bold mb-4">Journal</h1>
          <button 
            onClick={() => { setIsDrafting(true); setSelectedEntryId(null); }}
            className="w-full flex items-center justify-center gap-2 py-3 bg-foreground text-background font-bold rounded-xl hover:bg-foreground/90 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" /> Write Entry
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 relative">
          <div className="absolute left-[39px] top-0 bottom-0 w-px bg-border z-0"></div>
          <div className="space-y-6 relative z-10">
            {entries.map(entry => {
              const dateObj = new Date(entry.date);
              const day = dateObj.getDate();
              const month = dateObj.toLocaleString('default', { month: 'short' });

              return (
                <button 
                  key={entry.id} 
                  onClick={() => { setSelectedEntryId(entry.id); setIsDrafting(false); }}
                  className="w-full flex text-left group"
                >
                  <div className="w-16 shrink-0 flex flex-col items-center pt-1">
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-colors ${selectedEntryId === entry.id ? "bg-primary border-primary text-primary-foreground" : "bg-card border-border text-foreground group-hover:border-primary"}`}>
                      {day}
                    </div>
                    <span className="text-[10px] font-bold uppercase mt-1 text-muted-foreground">{month}</span>
                  </div>
                  
                  <div className={`flex-1 ml-2 p-4 rounded-2xl border transition-all ${selectedEntryId === entry.id ? "bg-card border-foreground/30 shadow-sm" : "bg-card/50 border-border group-hover:bg-card"}`}>
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-bold text-sm leading-tight line-clamp-1">{entry.title}</h3>
                      {entry.isMemory && <Star className="w-3.5 h-3.5 text-yellow-500 fill-current shrink-0 ml-2" />}
                    </div>
                    {entry.body && <p className="text-xs text-muted-foreground line-clamp-2 mt-1.5">{entry.body}</p>}
                    {entry.mood && (
                      <div className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-semibold bg-accent text-foreground px-2 py-1 rounded-md">
                        {entry.mood}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}

            {loading && (
              <div className="flex items-center justify-center py-10 opacity-50">
                <Book className="w-8 h-8 animate-pulse text-muted-foreground" />
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col bg-background overflow-y-auto relative">
        {isDrafting ? (
          <div className="max-w-3xl mx-auto w-full p-8 md:p-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-6 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-500" /> Today's Reflection
            </div>
            
            <form onSubmit={saveEntry} className="space-y-6">
              <input 
                type="text" 
                value={draftTitle}
                onChange={e => setDraftTitle(e.target.value)}
                placeholder="What is on your mind?"
                className="w-full text-4xl font-black bg-transparent border-none outline-none placeholder:text-muted-foreground/30 leading-tight"
                autoFocus
              />
              
              <textarea 
                value={draftBody}
                onChange={e => setDraftBody(e.target.value)}
                placeholder="Write your entry here..."
                className="w-full min-h-[300px] text-lg leading-relaxed bg-transparent border-none outline-none resize-none placeholder:text-muted-foreground/30 font-serif"
              />

              <div className="grid grid-cols-2 gap-6 p-6 bg-card border border-border rounded-3xl">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Mood (Optional)</label>
                  <input type="text" value={draftMood} onChange={e => setDraftMood(e.target.value)} placeholder="e.g. Focused, Anxious, Joyful" className="w-full h-10 px-3 text-sm rounded-xl border border-input bg-background" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Mark as Memory</label>
                  <label className="flex items-center gap-3 h-10 px-3 border border-border rounded-xl cursor-pointer hover:bg-accent transition-colors">
                    <input type="checkbox" checked={draftIsMemory} onChange={e => setDraftIsMemory(e.target.checked)} className="rounded" />
                    <span className="text-sm font-medium">Highlight in Life Timeline</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-border">
                <button type="submit" disabled={!draftTitle} className="px-8 py-3 bg-foreground text-background font-bold rounded-xl disabled:opacity-50 hover:bg-foreground/90 transition-all">
                  Save Entry
                </button>
                <button type="button" className="px-4 py-3 border border-border text-foreground font-bold rounded-xl hover:bg-accent transition-all flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" /> Add Photo
                </button>
                <button type="button" onClick={() => setIsDrafting(false)} className="px-6 py-3 font-semibold text-muted-foreground hover:text-foreground ml-auto">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        ) : selectedEntry ? (
          <div className="max-w-3xl mx-auto w-full p-8 md:p-12 animate-in fade-in duration-300">
            <div className="flex items-center justify-between mb-8">
              <div className="text-sm font-bold text-muted-foreground">
                {new Date(selectedEntry.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
              {selectedEntry.isMemory && (
                <div className="flex items-center gap-1.5 bg-yellow-500/10 text-yellow-600 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border border-yellow-500/20">
                  <Star className="w-3.5 h-3.5 fill-current" /> Core Memory
                </div>
              )}
            </div>
            
            <h1 className="text-4xl font-black leading-tight mb-8">{selectedEntry.title}</h1>
            
            {selectedEntry.mood && (
              <div className="inline-block px-4 py-2 bg-card border border-border rounded-xl text-sm font-semibold mb-8 shadow-sm">
                Mood: {selectedEntry.mood}
              </div>
            )}
            
            <div className="prose prose-lg dark:prose-invert font-serif leading-relaxed whitespace-pre-wrap max-w-none text-foreground/90">
              {selectedEntry.body || <span className="italic text-muted-foreground/50">No content.</span>}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-12 text-center">
            <Book className="w-16 h-16 opacity-20 mb-6" />
            <h2 className="text-xl font-bold text-foreground mb-2">Your Life Journey</h2>
            <p className="max-w-md">Select an entry from the timeline to read, or start writing to capture a new memory.</p>
          </div>
        )}
      </main>
    </div>
  );
}
