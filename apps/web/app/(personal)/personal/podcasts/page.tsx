"use client";

import { useEffect, useState } from "react";
import { Plus, Headphones, Play, Pause, ChevronRight } from "lucide-react";
import apiClient from "@/lib/api-client";
import { PersonalPodcastAddModal } from "@/components/personal/personal-podcast-add-modal";
import Image from "next/image";

type Podcast = {
  id: string;
  title: string;
  publisher?: string;
  description?: string;
  coverUrl?: string;
};

type Episode = {
  id: string;
  title: string;
  publishedDate?: string;
  audioUrl?: string;
  progressSeconds: number;
  durationSeconds?: number;
};

export default function PodcastsPage() {
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [selectedPodcastId, setSelectedPodcastId] = useState<string | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Simple mocked player state for prototype
  const [playingId, setPlayingId] = useState<string | null>(null);

  const fetchPodcasts = async () => {
    try {
      const result = await apiClient.get(`/personal/podcasts`);
      const data = result.data?.data ?? [];
      setPodcasts(data);
      if (data.length > 0 && !selectedPodcastId) {
        setSelectedPodcastId(data[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchEpisodes = async (id: string) => {
    try {
      const result = await apiClient.get(`/personal/podcasts/${id}/episodes`);
      setEpisodes(result.data?.data ?? []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchPodcasts();
  }, []);

  useEffect(() => {
    if (selectedPodcastId) {
      fetchEpisodes(selectedPodcastId);
    }
  }, [selectedPodcastId]);

  return (
    <div className="min-h-screen bg-background pb-24 text-foreground font-sans flex flex-col">
      <header className="px-6 md:px-10 pt-8 pb-6 border-b border-border bg-card shrink-0">
        <div className="max-w-6xl mx-auto flex justify-between items-end">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              <span>Personal</span> / <span className="text-foreground">Learning</span>
            </div>
            <h1 className="text-3xl font-bold">Podcasts</h1>
          </div>
          <button onClick={() => setOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-foreground text-background rounded-xl font-bold text-sm shadow-sm hover:bg-foreground/90 transition-all active:scale-95">
            <Plus className="w-4 h-4" /> Add Feed
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 md:p-10 w-full flex-1 grid lg:grid-cols-12 gap-8">
        {loading ? (
          <div className="lg:col-span-12 flex items-center justify-center py-20 animate-pulse">
            <Headphones className="w-12 h-12 text-muted-foreground/30" />
          </div>
        ) : podcasts.length === 0 ? (
          <div className="lg:col-span-12 text-center py-20 border border-dashed border-border/60 rounded-3xl bg-card/25 max-w-3xl mx-auto w-full">
            <Headphones className="w-12 h-12 text-muted-foreground/60 mx-auto mb-4" />
            <h3 className="text-lg font-bold mb-1">No podcasts</h3>
            <p className="text-sm text-muted-foreground mb-6">Listen to educational audio by importing any standard RSS feed.</p>
            <button onClick={() => setOpen(true)} className="px-5 py-2.5 bg-foreground text-background font-bold rounded-xl text-sm">Add Podcast</button>
          </div>
        ) : (
          <>
            {/* Sidebar List */}
            <aside className="lg:col-span-4 space-y-3">
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 px-2">Subscriptions</h2>
              {podcasts.map(pod => (
                <button 
                  key={pod.id}
                  onClick={() => setSelectedPodcastId(pod.id)}
                  className={`w-full flex items-center gap-4 p-3 rounded-2xl border transition-all text-left ${selectedPodcastId === pod.id ? "bg-accent border-border shadow-sm" : "bg-transparent border-transparent hover:bg-accent/50"}`}
                >
                  <div className="w-14 h-14 shrink-0 rounded-xl bg-background border border-border overflow-hidden relative">
                    {pod.coverUrl ? (
                      <Image src={pod.coverUrl} alt="Cover" fill className="object-cover" unoptimized />
                    ) : (
                      <Headphones className="w-full h-full p-3 text-muted-foreground/30" />
                    )}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <h3 className="font-bold text-sm truncate">{pod.title}</h3>
                    {pod.publisher && <p className="text-xs text-muted-foreground truncate">{pod.publisher}</p>}
                  </div>
                </button>
              ))}
            </aside>

            {/* Main Episodes List */}
            <section className="lg:col-span-8">
              {selectedPodcastId && (
                <div className="bg-card border border-border rounded-3xl p-2">
                  <div className="p-6 border-b border-border/50">
                    {podcasts.find(p => p.id === selectedPodcastId) && (
                      <div className="flex items-center gap-6">
                        <div className="w-24 h-24 shrink-0 rounded-2xl bg-accent border border-border overflow-hidden relative shadow-sm">
                          {podcasts.find(p => p.id === selectedPodcastId)?.coverUrl ? (
                            <Image src={podcasts.find(p => p.id === selectedPodcastId)!.coverUrl!} alt="Cover" fill className="object-cover" unoptimized />
                          ) : (
                            <Headphones className="w-full h-full p-6 text-muted-foreground/30" />
                          )}
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold">{podcasts.find(p => p.id === selectedPodcastId)?.title}</h2>
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {podcasts.find(p => p.id === selectedPodcastId)?.description}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    {episodes.map(ep => (
                      <div key={ep.id} className="group flex gap-4 p-4 rounded-2xl hover:bg-accent transition-colors">
                        <button 
                          onClick={() => setPlayingId(playingId === ep.id ? null : ep.id)}
                          className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center transition-all ${playingId === ep.id ? "bg-primary text-primary-foreground" : "bg-background border border-border text-foreground group-hover:bg-foreground group-hover:text-background"}`}
                        >
                          {playingId === ep.id ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
                        </button>
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <h4 className="font-semibold text-sm line-clamp-1">{ep.title}</h4>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                            {ep.publishedDate && <span>{new Date(ep.publishedDate).toLocaleDateString()}</span>}
                            {ep.audioUrl && (
                              <a href={ep.audioUrl} target="_blank" rel="noreferrer" className="flex items-center hover:text-foreground">
                                Download Audio <ChevronRight className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <PersonalPodcastAddModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onSave={() => fetchPodcasts()}
      />
    </div>
  );
}
