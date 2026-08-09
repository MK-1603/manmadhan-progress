"use client";

import { useState } from "react";
import { ArrowLeft, Search, Loader2, BookOpen, ExternalLink, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api-client";
import Image from "next/image";

export default function DiscoverBookPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const res = await apiClient.post("/personal/books/discover", { query: query.trim() });
      if (res.data.success && res.data.data) {
        setResult(res.data.data);
      } else {
        setError("No book found for this query.");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to discover book.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddBook = async () => {
    if (!result) return;
    setAdding(true);
    
    try {
      const res = await apiClient.post("/personal/books", result);
      if (res.data.success) {
        router.push(`/personal/books/${res.data.data.id}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to add book.");
      setAdding(false);
    }
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="shrink-0 h-16 border-b border-muted flex items-center px-6 bg-card/50 backdrop-blur-md">
        <button 
          onClick={() => router.back()}
          className="mr-4 p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold">Discover & Add Book</h1>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-6 md:p-12">
        <div className="max-w-[700px] mx-auto">
          
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-4 text-foreground">Import from anywhere</h2>
            <p className="text-muted-foreground text-lg">Paste an Amazon URL, Goodreads link, ISBN, or search by title.</p>
          </div>

          <form onSubmit={handleSearch} className="relative mb-12">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground" />
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., 9780132350884, 'Clean Code', or https://..."
              className="w-full pl-14 pr-32 py-4 bg-card border border-border rounded-2xl text-lg shadow-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
            />
            <button 
              type="submit" 
              disabled={loading || !query.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary text-primary-foreground px-6 py-2 rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Search"}
            </button>
          </form>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 mb-8 text-center">
              {error}
            </div>
          )}

          {result && (
            <div className="bg-card border border-border rounded-2xl p-8 shadow-sm flex flex-col md:flex-row gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="w-40 shrink-0 mx-auto md:mx-0 relative aspect-[2/3] bg-muted rounded-lg overflow-hidden flex items-center justify-center border border-border shadow-md">
                {result.coverUrl ? (
                  <Image src={result.coverUrl} alt="Cover" fill className="object-cover" />
                ) : (
                  <BookOpen className="w-12 h-12 text-muted-foreground/30" />
                )}
              </div>
              
              <div className="flex flex-col flex-1 text-center md:text-left">
                <div className="flex items-start justify-between mb-2">
                  <span className="px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-semibold uppercase tracking-wider">
                    {result.metadataProvider}
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-1">{result.title}</h3>
                {result.subtitle && <h4 className="text-lg text-muted-foreground mb-2">{result.subtitle}</h4>}
                <p className="text-foreground/80 font-medium mb-6">By {result.author || "Unknown"}</p>
                
                <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground mb-6 bg-background p-4 rounded-xl border border-border">
                  <div>
                    <span className="block text-xs uppercase font-bold tracking-wider mb-1">Publisher</span>
                    {result.publisher || "—"}
                  </div>
                  <div>
                    <span className="block text-xs uppercase font-bold tracking-wider mb-1">Published</span>
                    {result.publicationDate || "—"}
                  </div>
                  <div>
                    <span className="block text-xs uppercase font-bold tracking-wider mb-1">Pages</span>
                    {result.pageCount || "—"}
                  </div>
                  <div>
                    <span className="block text-xs uppercase font-bold tracking-wider mb-1">ISBN-13</span>
                    {result.isbn13 || "—"}
                  </div>
                </div>

                {result.description && (
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-6">
                    {result.description}
                  </p>
                )}
                
                <div className="mt-auto flex items-center gap-4 justify-center md:justify-start">
                  <button 
                    onClick={handleAddBook}
                    disabled={adding}
                    className="flex-1 bg-primary text-primary-foreground py-3 rounded-xl font-bold shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    {adding ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Plus className="w-5 h-5" /> Add to Library</>}
                  </button>
                  {result.sourceUrl && (
                    <a href={result.sourceUrl} target="_blank" rel="noreferrer" className="p-3 bg-muted text-foreground rounded-xl hover:bg-muted/80 transition-colors">
                      <ExternalLink className="w-5 h-5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
