"use client";

import React, { useEffect, useState, useCallback } from "react";
import apiClient from "@/lib/api-client";
import { LoaderCircle, Plus, Book, Calendar, Search, Smile, Zap, MapPin, Tag as TagIcon, X } from "lucide-react";
import { useSocket } from "@/components/providers/socket-provider";

export default function JournalPage() {
  const { socket, isConnected } = useSocket();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Editor State
  const [isComposing, setIsComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [mood, setMood] = useState("");
  const [energy, setEnergy] = useState(5);
  const [location, setLocation] = useState("");
  const [tags, setTags] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchEntries = useCallback(async () => {
    try {
      const response = await apiClient.get("/personal/journal");
      setEntries(response.data.data);
    } catch (err) {
      console.error("Failed to load journal entries", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.on("journal_created", (newEntry: any) => {
      setEntries(prev => [newEntry, ...prev]);
    });

    socket.on("journal_updated", (updatedEntry: any) => {
      setEntries(prev => prev.map(e => e.id === updatedEntry.id ? updatedEntry : e));
    });

    socket.on("journal_deleted", ({ id }: { id: string }) => {
      setEntries(prev => prev.filter(e => e.id !== id));
    });

    return () => {
      socket.off("journal_created");
      socket.off("journal_updated");
      socket.off("journal_deleted");
    };
  }, [socket, isConnected]);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await apiClient.post("/personal/journal", {
        title,
        body,
        mood,
        energy,
        location,
        tags: tags.split(",").map(t => t.trim()).filter(Boolean),
      });
      // Reset
      setTitle("");
      setBody("");
      setMood("");
      setEnergy(5);
      setLocation("");
      setTags("");
      setIsComposing(false);
    } catch (err) {
      console.error("Failed to save entry", err);
    } finally {
      setSaving(false);
    }
  };

  const filteredEntries = entries.filter(e => {
    if (search.trim()) {
      const s = search.toLowerCase();
      if (!e.title?.toLowerCase().includes(s) && !e.body?.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  return (
    <div className="w-full h-full flex flex-col p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto animate-in fade-in duration-500 overflow-y-auto hide-scrollbar">
      
      {/* Header */}
      <div className="mb-8 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-[32px] sm:text-[40px] font-bold text-[#171717] dark:text-[#F5F5F5] leading-tight tracking-tight mb-2">
            Journal
          </h1>
          <p className="text-[16px] text-[#52525B] dark:text-[#A1A1AA] max-w-[600px]">
            Document your thoughts, track your mood, and reflect on your daily progress.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="relative min-w-[200px] flex-1 lg:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A1A1AA]" />
            <input 
              type="text" 
              placeholder="Search entries..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-full border border-[#E5E7EB] dark:border-[#242424] bg-white dark:bg-[#111111] text-sm focus:outline-none focus:border-[#A1A1AA] dark:focus:border-[#52525B] transition-colors"
            />
          </div>
          <button 
            onClick={() => setIsComposing(true)}
            className="h-10 px-4 rounded-full bg-[#171717] dark:bg-[#F5F5F5] text-white dark:text-[#080808] text-sm font-medium hover:bg-[#333333] dark:hover:bg-[#E5E7EB] transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            New Entry
          </button>
        </div>
      </div>

      {isComposing && (
        <div className="mb-10 w-full bg-white dark:bg-[#111111] p-6 rounded-2xl border border-[#E5E7EB] dark:border-[#242424] shadow-sm animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-[#171717] dark:text-[#F5F5F5]">New Journal Entry</h2>
            <button onClick={() => setIsComposing(false)} className="text-[#A1A1AA] hover:text-[#171717] dark:hover:text-[#F5F5F5]">
              <X className="w-5 h-5" />
            </button>
          </div>

          <input 
            type="text" 
            placeholder="Entry Title..." 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-2xl font-bold bg-transparent border-none focus:outline-none focus:ring-0 text-[#171717] dark:text-[#F5F5F5] placeholder:text-[#A1A1AA] mb-4"
          />
          
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="flex items-center gap-2 text-sm text-[#52525B] dark:text-[#A1A1AA]">
              <Smile className="w-4 h-4" />
              <input type="text" placeholder="Mood (e.g. Happy)" value={mood} onChange={(e) => setMood(e.target.value)} className="bg-transparent focus:outline-none w-32 border-b border-[#E5E7EB] dark:border-[#242424]" />
            </div>
            <div className="flex items-center gap-2 text-sm text-[#52525B] dark:text-[#A1A1AA]">
              <Zap className="w-4 h-4" />
              <span>Energy: {energy}/10</span>
              <input type="range" min="1" max="10" value={energy} onChange={(e) => setEnergy(Number(e.target.value))} className="w-24 accent-[#171717] dark:accent-[#F5F5F5]" />
            </div>
            <div className="flex items-center gap-2 text-sm text-[#52525B] dark:text-[#A1A1AA]">
              <MapPin className="w-4 h-4" />
              <input type="text" placeholder="Location..." value={location} onChange={(e) => setLocation(e.target.value)} className="bg-transparent focus:outline-none w-32 border-b border-[#E5E7EB] dark:border-[#242424]" />
            </div>
            <div className="flex items-center gap-2 text-sm text-[#52525B] dark:text-[#A1A1AA]">
              <TagIcon className="w-4 h-4" />
              <input type="text" placeholder="Tags (comma separated)..." value={tags} onChange={(e) => setTags(e.target.value)} className="bg-transparent focus:outline-none w-48 border-b border-[#E5E7EB] dark:border-[#242424]" />
            </div>
          </div>

          <textarea 
            placeholder="Write your thoughts here..." 
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full min-h-[250px] bg-[#F4F4F5]/50 dark:bg-[#080808]/50 border border-[#E5E7EB] dark:border-[#242424] rounded-xl p-4 text-[#171717] dark:text-[#F5F5F5] text-[15px] leading-relaxed resize-y focus:outline-none focus:border-[#A1A1AA] dark:focus:border-[#52525B] transition-colors mb-4"
          />

          <div className="flex justify-end gap-3">
            <button 
              onClick={() => setIsComposing(false)}
              className="px-6 py-2.5 rounded-full text-sm font-medium text-[#52525B] dark:text-[#A1A1AA] hover:bg-[#F4F4F5] dark:hover:bg-[#1D1D1D] transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              disabled={!title.trim() || saving}
              className="px-6 py-2.5 rounded-full bg-[#171717] dark:bg-[#F5F5F5] text-white dark:text-[#080808] text-sm font-medium hover:bg-[#333333] dark:hover:bg-[#E5E7EB] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save Entry"}
            </button>
          </div>
        </div>
      )}

      {/* Entries List */}
      <div>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <LoaderCircle className="w-8 h-8 text-[#A1A1AA] animate-spin" />
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-4 border border-dashed border-[#E5E7EB] dark:border-[#242424] rounded-2xl bg-[#F4F4F5]/50 dark:bg-[#1D1D1D]/50 text-center">
            <Book className="w-12 h-12 text-[#A1A1AA] dark:text-[#52525B] mb-4" />
            <h3 className="text-xl font-bold text-[#171717] dark:text-[#F5F5F5] mb-2">No journal entries</h3>
            <p className="text-[#52525B] dark:text-[#A1A1AA] max-w-md">
              Start writing to track your personal growth and reflections.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredEntries.map(entry => (
              <div key={entry.id} className="bg-white dark:bg-[#111111] border border-[#E5E7EB] dark:border-[#242424] rounded-2xl p-6 shadow-sm group hover:border-[#A1A1AA] dark:hover:border-[#52525B] transition-colors">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-[#171717] dark:text-[#F5F5F5] mb-1">{entry.title}</h3>
                    <div className="flex items-center gap-3 text-xs font-medium text-[#52525B] dark:text-[#A1A1AA]">
                      <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {new Date(entry.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                      {entry.location && <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {entry.location}</span>}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    {entry.mood && (
                      <span className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-md bg-[#8B5CF6]/10 text-[#8B5CF6] flex items-center gap-1">
                        <Smile className="w-3 h-3" /> {entry.mood}
                      </span>
                    )}
                    {entry.energy !== null && (
                      <span className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-md bg-[#F5B800]/10 text-[#D99A00] dark:text-[#F5B800] flex items-center gap-1">
                        <Zap className="w-3 h-3" /> Energy: {entry.energy}
                      </span>
                    )}
                  </div>
                </div>
                
                <p className="text-[15px] text-[#52525B] dark:text-[#A1A1AA] leading-relaxed whitespace-pre-wrap">
                  {entry.body}
                </p>

                {entry.tags && entry.tags.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-[#E5E7EB] dark:border-[#242424] flex items-center gap-2 flex-wrap">
                    <TagIcon className="w-4 h-4 text-[#A1A1AA]" />
                    {entry.tags.map((tag: string, i: number) => (
                      <span key={i} className="text-xs text-[#52525B] dark:text-[#A1A1AA] hover:text-[#171717] dark:hover:text-[#F5F5F5] cursor-pointer">#{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
