import { useState } from "react";
import { X, Link as LinkIcon, BookOpen, Loader2 } from "lucide-react";
import apiClient from "@/lib/api-client";
import Image from "next/image";

export function PersonalBookAddModal({
  isOpen,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (book: any) => void;
}) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resolved data
  const [resolvedMetadata, setResolvedMetadata] = useState<any | null>(null);

  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setLoading(true);
    setError(null);
    setResolvedMetadata(null);

    try {
      const res = await apiClient.post("/personal/books/resolve-url", { url });
      if (res.data.success) {
        setResolvedMetadata(res.data.data);
      } else {
        setError(res.data.error || "Failed to resolve book from URL.");
      }
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!resolvedMetadata) return;
    setSaving(true);
    setError(null);

    try {
      // You can inject dailyPageTarget here or let the user choose
      const payload = {
        ...resolvedMetadata,
        status: "Want to Read",
        dailyPageTarget: 20
      };
      const res = await apiClient.post("/personal/books", payload);
      if (res.data.success) {
        onSave(res.data.data);
        reset();
      }
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || "Failed to save book.");
      setSaving(false);
    }
  };

  const reset = () => {
    setUrl("");
    setResolvedMetadata(null);
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
            <BookOpen className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">Add Book</h2>
          </div>
          <button onClick={reset} className="p-1 hover:bg-accent rounded-md transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {error && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-sm">{error}</div>}

          {!resolvedMetadata ? (
            <form onSubmit={handleResolve} className="space-y-4">
              <label className="block text-sm font-medium text-muted-foreground">
                Paste Book URL (e.g. Amazon, Goodreads, OpenLibrary)
              </label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground" />
                <input
                  autoFocus
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full pl-10 pr-4 py-3 text-sm rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <button disabled={!url || loading} type="submit" className="w-full flex items-center justify-center gap-2 py-3 bg-foreground text-background font-bold rounded-xl transition-all disabled:opacity-50">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Find Book Metadata"}
              </button>
            </form>
          ) : (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex gap-4">
                {resolvedMetadata.coverUrl ? (
                  <div className="shrink-0 w-24 h-36 bg-accent rounded-md overflow-hidden relative border border-border">
                    <Image src={resolvedMetadata.coverUrl} alt="Cover" fill className="object-cover" unoptimized />
                  </div>
                ) : (
                  <div className="shrink-0 w-24 h-36 bg-accent/50 rounded-md border border-border flex items-center justify-center">
                    <BookOpen className="w-8 h-8 text-muted-foreground/30" />
                  </div>
                )}
                
                <div className="space-y-1">
                  <h3 className="font-bold text-lg leading-tight">{resolvedMetadata.title}</h3>
                  {resolvedMetadata.subtitle && <p className="text-sm text-muted-foreground">{resolvedMetadata.subtitle}</p>}
                  {resolvedMetadata.author && <p className="text-sm font-medium pt-1">by {resolvedMetadata.author}</p>}
                  
                  <div className="flex flex-wrap gap-2 pt-3 text-xs text-muted-foreground">
                    {resolvedMetadata.pageCount && <span className="bg-accent px-2 py-1 rounded-md">{resolvedMetadata.pageCount} Pages</span>}
                    {resolvedMetadata.publisher && <span className="bg-accent px-2 py-1 rounded-md line-clamp-1">{resolvedMetadata.publisher}</span>}
                    {resolvedMetadata.publicationDate && <span className="bg-accent px-2 py-1 rounded-md">{resolvedMetadata.publicationDate}</span>}
                  </div>
                </div>
              </div>

              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-sm text-emerald-600 dark:text-emerald-400">
                Found legitimate metadata matching your URL!
              </div>
              
              <div className="flex gap-3 pt-2">
                <button onClick={() => setResolvedMetadata(null)} className="flex-1 py-3 border border-border font-medium rounded-xl hover:bg-accent transition-colors">
                  Try Another Link
                </button>
                <button onClick={handleConfirm} disabled={saving} className="flex-1 py-3 bg-primary text-primary-foreground font-bold rounded-xl transition-all hover:bg-primary/90 disabled:opacity-50">
                  {saving ? "Saving..." : "Confirm & Save"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
