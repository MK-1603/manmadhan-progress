import { useState } from "react";
import { X, Headphones, Rss, Loader2 } from "lucide-react";
import apiClient from "@/lib/api-client";
import Image from "next/image";

export function PersonalPodcastAddModal({
  isOpen,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (podcast: any) => void;
}) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolvedData, setResolvedData] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setLoading(true);
    setError(null);
    setResolvedData(null);

    try {
      const res = await apiClient.post("/personal/podcasts/resolve-rss", { url });
      if (res.data.success) {
        setResolvedData(res.data.data);
      } else {
        setError(res.data.error || "Failed to resolve RSS feed.");
      }
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!resolvedData) return;
    setSaving(true);
    setError(null);

    try {
      const res = await apiClient.post("/personal/podcasts", resolvedData);
      if (res.data.success) {
        onSave(res.data.data);
        reset();
      }
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || "Failed to subscribe to podcast.");
      setSaving(false);
    }
  };

  const reset = () => {
    setUrl("");
    setResolvedData(null);
    setError(null);
    setLoading(false);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Headphones className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">Add Podcast</h2>
          </div>
          <button onClick={reset} className="p-1 hover:bg-accent rounded-md transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {error && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-sm">{error}</div>}

          {!resolvedData ? (
            <form onSubmit={handleResolve} className="space-y-4">
              <label className="block text-sm font-medium text-muted-foreground">
                Paste Podcast RSS Feed URL
              </label>
              <div className="relative">
                <Rss className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground" />
                <input
                  autoFocus
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://anchor.fm/s/.../podcast/rss"
                  className="w-full pl-10 pr-4 py-3 text-sm rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <button disabled={!url || loading} type="submit" className="w-full flex items-center justify-center gap-2 py-3 bg-foreground text-background font-bold rounded-xl transition-all disabled:opacity-50">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Fetch Podcast"}
              </button>
            </form>
          ) : (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex gap-4">
                {resolvedData.coverUrl ? (
                  <div className="shrink-0 w-24 h-24 bg-accent rounded-xl border border-border overflow-hidden relative">
                    <Image src={resolvedData.coverUrl} alt="Cover" fill className="object-cover" unoptimized />
                  </div>
                ) : (
                  <div className="shrink-0 w-24 h-24 bg-accent/50 rounded-xl border border-border flex items-center justify-center">
                    <Headphones className="w-8 h-8 text-muted-foreground/30" />
                  </div>
                )}
                
                <div className="space-y-1">
                  <h3 className="font-bold text-lg leading-tight line-clamp-2">{resolvedData.title}</h3>
                  <div className="flex items-center gap-2 pt-2 text-xs font-semibold text-emerald-500">
                    <Rss className="w-3.5 h-3.5" />
                    Feed Loaded Successfully
                  </div>
                  <p className="text-xs text-muted-foreground pt-1">
                    Found {resolvedData.episodesPreview?.length || 0} episodes for preview.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button onClick={() => setResolvedData(null)} className="flex-1 py-3 border border-border font-medium rounded-xl hover:bg-accent transition-colors">
                  Try Another
                </button>
                <button onClick={handleConfirm} disabled={saving} className="flex-1 py-3 bg-primary text-primary-foreground font-bold rounded-xl transition-all hover:bg-primary/90 disabled:opacity-50">
                  {saving ? "Subscribing..." : "Subscribe"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
