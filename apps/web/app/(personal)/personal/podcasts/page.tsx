"use client";

import React, { useEffect, useState, useCallback } from "react";
import apiClient from "@/lib/api-client";
import { LoaderCircle, Plus, Headphones, Search, Trash2, X, Image as ImageIcon } from "lucide-react";
import { useSocket } from "@/components/providers/socket-provider";
import { useConfirm } from "@/hooks/use-confirm";

export default function PodcastsPage() {
  const { socket, isConnected } = useSocket();
  const [podcasts, setPodcasts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { confirm } = useConfirm();

  // Modal State
  const [showPodcastModal, setShowPodcastModal] = useState(false);
  const [newPodcast, setNewPodcast] = useState({ title: "", host: "", description: "", coverUrl: "", topic: "General" });
  const [saving, setSaving] = useState(false);

  const fetchPodcasts = useCallback(async () => {
    try {
      const response = await apiClient.get("/personal/podcasts");
      setPodcasts(response.data.data);
    } catch (err) {
      console.error("Failed to load podcasts", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPodcasts();
  }, [fetchPodcasts]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.on("podcast_created", (podcast: any) => {
      setPodcasts(prev => [podcast, ...prev]);
    });

    socket.on("podcast_updated", (podcast: any) => {
      setPodcasts(prev => prev.map(p => p.id === podcast.id ? podcast : p));
    });

    socket.on("podcast_deleted", ({ id }: { id: string }) => {
      setPodcasts(prev => prev.filter(p => p.id !== id));
    });

    return () => {
      socket.off("podcast_created");
      socket.off("podcast_updated");
      socket.off("podcast_deleted");
    };
  }, [socket, isConnected]);

  const handleCreatePodcast = async () => {
    if (!newPodcast.title.trim()) return;
    setSaving(true);
    try {
      await apiClient.post("/personal/podcasts", newPodcast);
      setShowPodcastModal(false);
      setNewPodcast({ title: "", host: "", description: "", coverUrl: "", topic: "General" });
    } catch (err) {
      console.error("Failed to create podcast", err);
    } finally {
      setSaving(false);
    }
  };

  const deletePodcast = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await confirm({ title: "Confirm Action", description: "Delete this podcast?", variant: "destructive", confirmLabel: "Confirm" });
    if (ok) {
      try {
        await apiClient.delete(`/personal/podcasts/${id}`);
      } catch (err) {
        console.error("Failed to delete", err);
      }
    }
  };

  const filteredPodcasts = podcasts.filter(p => {
    if (search.trim()) {
      const s = search.toLowerCase();
      if (!p.title?.toLowerCase().includes(s) && !p.host?.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  return (
    <div className="w-full h-full flex flex-col p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto animate-in fade-in duration-500 overflow-y-auto hide-scrollbar">
      
      {/* Header */}
      <div className="mb-8 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-[32px] sm:text-[40px] font-bold text-[#171717] dark:text-[#F5F5F5] leading-tight tracking-tight mb-2">
            Podcasts
          </h1>
          <p className="text-[16px] text-[#52525B] dark:text-[#A1A1AA] max-w-[600px]">
            Organize your favorite shows and log key insights from episodes.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="relative min-w-[200px] flex-1 lg:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A1A1AA]" />
            <input 
              type="text" 
              placeholder="Search podcasts..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-full border border-[#E5E7EB] dark:border-[#242424] bg-white dark:bg-[#111111] text-sm focus:outline-none focus:border-[#A1A1AA] dark:focus:border-[#52525B] transition-colors"
            />
          </div>
          <button 
            onClick={() => setShowPodcastModal(true)}
            className="h-10 px-4 rounded-full bg-[#171717] dark:bg-[#F5F5F5] text-white dark:text-[#080808] text-sm font-medium hover:bg-[#333333] dark:hover:bg-[#E5E7EB] transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Add Podcast
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <LoaderCircle className="w-8 h-8 text-[#A1A1AA] animate-spin" />
        </div>
      ) : filteredPodcasts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-4 border border-dashed border-[#E5E7EB] dark:border-[#242424] rounded-2xl bg-[#F4F4F5]/50 dark:bg-[#1D1D1D]/50 text-center">
          <Headphones className="w-12 h-12 text-[#A1A1AA] dark:text-[#52525B] mb-4" />
          <h3 className="text-xl font-bold text-[#171717] dark:text-[#F5F5F5] mb-2">No podcasts found</h3>
          <p className="text-[#52525B] dark:text-[#A1A1AA] max-w-md">
            Start tracking the podcasts you listen to and capture their insights.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {filteredPodcasts.map(podcast => (
            <div key={podcast.id} className="group relative flex flex-col">
              <button 
                onClick={(e) => deletePodcast(podcast.id, e)}
                className="absolute top-2 right-2 z-10 p-1.5 rounded-md bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              
              <div className="aspect-square rounded-xl overflow-hidden bg-[#F4F4F5] dark:bg-[#1D1D1D] mb-3 shadow-sm border border-[#E5E7EB] dark:border-[#242424] flex items-center justify-center relative">
                {podcast.coverUrl ? (
                  <img src={podcast.coverUrl} alt={podcast.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <Headphones className="w-8 h-8 text-[#A1A1AA]" />
                )}
              </div>
              
              <div className="flex-1 text-center">
                <h3 className="text-sm font-bold text-[#171717] dark:text-[#F5F5F5] leading-tight line-clamp-1 mb-0.5 group-hover:text-blue-500 transition-colors">
                  {podcast.title}
                </h3>
                <p className="text-xs text-[#52525B] dark:text-[#A1A1AA] line-clamp-1">{podcast.host || "Unknown Host"}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Podcast Modal */}
      {showPodcastModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#111111] border border-[#E5E7EB] dark:border-[#242424] rounded-2xl w-full max-w-md p-6 shadow-xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-[#171717] dark:text-[#F5F5F5]">Add New Podcast</h2>
              <button onClick={() => setShowPodcastModal(false)} className="text-[#A1A1AA] hover:text-[#171717] dark:hover:text-[#F5F5F5]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-[#52525B] dark:text-[#A1A1AA] mb-1.5">Podcast Title</label>
                <input 
                  type="text" 
                  value={newPodcast.title} 
                  onChange={(e) => setNewPodcast({...newPodcast, title: e.target.value})}
                  className="w-full h-10 px-3 rounded-lg border border-[#E5E7EB] dark:border-[#242424] bg-transparent text-[#171717] dark:text-[#F5F5F5] text-sm focus:outline-none focus:border-[#A1A1AA] dark:focus:border-[#52525B]" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#52525B] dark:text-[#A1A1AA] mb-1.5">Host(s)</label>
                <input 
                  type="text" 
                  value={newPodcast.host} 
                  onChange={(e) => setNewPodcast({...newPodcast, host: e.target.value})}
                  className="w-full h-10 px-3 rounded-lg border border-[#E5E7EB] dark:border-[#242424] bg-transparent text-[#171717] dark:text-[#F5F5F5] text-sm focus:outline-none focus:border-[#A1A1AA] dark:focus:border-[#52525B]" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#52525B] dark:text-[#A1A1AA] mb-1.5">Cover Image URL (Optional)</label>
                <input 
                  type="text" 
                  value={newPodcast.coverUrl} 
                  onChange={(e) => setNewPodcast({...newPodcast, coverUrl: e.target.value})}
                  className="w-full h-10 px-3 rounded-lg border border-[#E5E7EB] dark:border-[#242424] bg-transparent text-[#171717] dark:text-[#F5F5F5] text-sm focus:outline-none focus:border-[#A1A1AA] dark:focus:border-[#52525B]" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#52525B] dark:text-[#A1A1AA] mb-1.5">Topic</label>
                <input 
                  type="text" 
                  value={newPodcast.topic} 
                  onChange={(e) => setNewPodcast({...newPodcast, topic: e.target.value})}
                  className="w-full h-10 px-3 rounded-lg border border-[#E5E7EB] dark:border-[#242424] bg-transparent text-[#171717] dark:text-[#F5F5F5] text-sm focus:outline-none focus:border-[#A1A1AA] dark:focus:border-[#52525B]" 
                  placeholder="e.g. Technology, Business, Comedy"
                />
              </div>
            </div>

            <button 
              onClick={handleCreatePodcast}
              disabled={saving || !newPodcast.title.trim()}
              className="w-full h-10 rounded-lg bg-[#171717] dark:bg-[#F5F5F5] text-white dark:text-[#080808] text-sm font-medium hover:bg-[#333333] dark:hover:bg-[#E5E7EB] transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Add Podcast"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
