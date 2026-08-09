"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Book, Clock, Target, Calendar, Check, Search, BookOpen, Layers, Edit3, Bookmark, FileText, Activity, MoreVertical, Play } from "lucide-react";
import apiClient from "@/lib/api-client";
import Image from "next/image";
import { format } from "date-fns";

export default function BookDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [book, setBook] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Overview");

  // Reading Session State
  const [loggingSession, setLoggingSession] = useState(false);
  const [pagesRead, setPagesRead] = useState("");
  const [duration, setDuration] = useState("");

  const loadBook = async () => {
    try {
      const res = await apiClient.get(`/personal/books/${params.id}`);
      setBook(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    void loadBook();
  }, [params.id]);

  const handleLogSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoggingSession(true);
      await apiClient.post(`/personal/books/${params.id}/session`, {
        pagesRead,
        durationMinutes: duration
      });
      setPagesRead("");
      setDuration("");
      await loadBook();
    } catch (err) {
      console.error(err);
    } finally {
      setLoggingSession(false);
    }
  };

  if (!mounted) return null;

  if (loading) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center bg-background">
        <h2 className="text-2xl font-bold">Book Not Found</h2>
        <button onClick={() => router.back()} className="mt-4 text-primary hover:underline">Go Back</button>
      </div>
    );
  }

  const tabs = [
    { name: "Overview", icon: BookOpen },
    { name: "Reading", icon: Target },
    { name: "Chapters", icon: Layers },
    { name: "Notes", icon: Edit3 },
    { name: "Highlights", icon: Bookmark },
    { name: "Activity", icon: Activity }
  ];

  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="shrink-0 h-16 border-b border-muted flex items-center justify-between px-6 bg-card/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-muted rounded-full text-muted-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-sm font-bold text-foreground line-clamp-1">{book.title}</h1>
            <span className="text-xs text-muted-foreground">{book.author || "Unknown Author"}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"><MoreVertical className="w-5 h-5" /></button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        
        {/* Book Hero Section */}
        <div className="bg-muted/30 border-b border-border p-6 md:p-12 relative overflow-hidden">
          {book.coverUrl && (
            <div className="absolute inset-0 opacity-10 blur-3xl" style={{ backgroundImage: `url(${book.coverUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
          )}
          
          <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row gap-8 relative z-10">
            <div className="w-48 shrink-0 mx-auto md:mx-0 relative aspect-[2/3] bg-card rounded-xl overflow-hidden border border-border shadow-2xl">
              {book.coverUrl ? (
                <Image src={book.coverUrl} alt="Cover" fill className="object-cover" />
              ) : (
                <Book className="w-16 h-16 text-muted-foreground/30 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              )}
            </div>
            
            <div className="flex flex-col flex-1 text-center md:text-left justify-center">
              <span className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold uppercase tracking-wider mb-4 w-max mx-auto md:mx-0">
                {book.status}
              </span>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">{book.title}</h1>
              {book.subtitle && <h2 className="text-xl text-muted-foreground mb-3">{book.subtitle}</h2>}
              <p className="text-lg font-medium text-foreground/80 mb-6">{book.author}</p>
              
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm">
                {book.pageCount && (
                  <div className="flex items-center gap-2 bg-background px-4 py-2 rounded-lg border border-border">
                    <BookOpen className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{book.pageCount} Pages</span>
                  </div>
                )}
                {book.publisher && (
                  <div className="flex items-center gap-2 bg-background px-4 py-2 rounded-lg border border-border">
                    <span className="text-muted-foreground font-medium">Pub:</span>
                    <span className="font-medium">{book.publisher}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-[1200px] mx-auto p-6 md:p-8 flex flex-col lg:flex-row gap-8">
          
          {/* Main Workspace */}
          <div className="flex-1 min-w-0">
            {/* Tabs */}
            <div className="flex overflow-x-auto no-scrollbar border-b border-border mb-8 gap-6">
              {tabs.map(tab => (
                <button
                  key={tab.name}
                  onClick={() => setActiveTab(tab.name)}
                  className={`pb-3 flex items-center gap-2 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
                    activeTab === tab.name ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.name}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="animate-in fade-in duration-300">
              
              {activeTab === "Overview" && (
                <div className="space-y-8">
                  {book.description && (
                    <section>
                      <h3 className="text-lg font-bold mb-3">Description</h3>
                      <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{book.description}</p>
                    </section>
                  )}
                  
                  <section>
                    <h3 className="text-lg font-bold mb-3">Metadata</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="bg-card border border-border p-4 rounded-xl">
                        <span className="block text-xs uppercase font-bold text-muted-foreground mb-1">ISBN-13</span>
                        <span className="font-medium">{book.isbn13 || "—"}</span>
                      </div>
                      <div className="bg-card border border-border p-4 rounded-xl">
                        <span className="block text-xs uppercase font-bold text-muted-foreground mb-1">ISBN-10</span>
                        <span className="font-medium">{book.isbn10 || "—"}</span>
                      </div>
                      <div className="bg-card border border-border p-4 rounded-xl">
                        <span className="block text-xs uppercase font-bold text-muted-foreground mb-1">Date Added</span>
                        <span className="font-medium">{format(new Date(book.createdAt), 'MMM d, yyyy')}</span>
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {activeTab === "Reading" && book.plan && (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-card border border-border p-6 rounded-2xl flex flex-col">
                      <span className="text-sm font-semibold text-muted-foreground mb-1">Progress</span>
                      <div className="text-4xl font-bold text-foreground mb-4">{book.plan.completionPercent}%</div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-2">
                        <div className="h-full bg-primary" style={{ width: `${book.plan.completionPercent}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground">{book.current} / {book.total} Pages</span>
                    </div>

                    <div className="bg-card border border-border p-6 rounded-2xl flex flex-col justify-between">
                      <div>
                        <span className="text-sm font-semibold text-muted-foreground mb-1">Daily Target</span>
                        <div className="text-4xl font-bold text-foreground mb-1">{book.plan.requiredPagesPerDay} <span className="text-lg text-muted-foreground font-medium">pg/day</span></div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Target className="w-4 h-4 text-orange-500" />
                        <span className="text-muted-foreground">To finish on time</span>
                      </div>
                    </div>

                    <div className="bg-card border border-border p-6 rounded-2xl flex flex-col justify-between">
                      <div>
                        <span className="text-sm font-semibold text-muted-foreground mb-1">Projected Finish</span>
                        <div className="text-2xl font-bold text-foreground mb-1">{format(new Date(book.plan.projectedDate), 'MMM d, yyyy')}</div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-blue-500" />
                        <span className="text-muted-foreground">Based on current pace</span>
                      </div>
                    </div>
                  </div>

                  {/* Log Session Form */}
                  <div className="bg-card border border-border rounded-2xl p-6">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Play className="w-5 h-5 text-primary" /> Log Reading Session</h3>
                    <form onSubmit={handleLogSession} className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1">
                        <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Pages Read Today</label>
                        <input 
                          type="number" 
                          min="1"
                          required
                          value={pagesRead}
                          onChange={(e) => setPagesRead(e.target.value)}
                          className="w-full bg-background border border-border rounded-xl px-4 py-2.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                          placeholder="e.g. 20"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Duration (mins)</label>
                        <input 
                          type="number"
                          min="1"
                          value={duration}
                          onChange={(e) => setDuration(e.target.value)}
                          className="w-full bg-background border border-border rounded-xl px-4 py-2.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                          placeholder="Optional"
                        />
                      </div>
                      <div className="flex items-end">
                        <button 
                          type="submit" 
                          disabled={loggingSession || !pagesRead}
                          className="w-full md:w-auto bg-primary text-primary-foreground px-8 py-2.5 rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 h-[46px]"
                        >
                          {loggingSession ? 'Saving...' : 'Save Log'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {(activeTab === "Notes" || activeTab === "Highlights" || activeTab === "Chapters" || activeTab === "Activity") && (
                <div className="flex flex-col items-center justify-center py-20 text-center bg-card/50 border border-border border-dashed rounded-2xl">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <Layers className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">No {activeTab} Yet</h3>
                  <p className="text-muted-foreground max-w-sm mb-6">This section is currently empty. Start reading and capturing intelligence to populate this area.</p>
                  <button className="bg-primary/10 text-primary px-4 py-2 rounded-lg font-semibold hover:bg-primary/20 transition-colors">
                    Add {activeTab.slice(0,-1)}
                  </button>
                </div>
              )}

            </div>
          </div>

          {/* Side Info */}
          <div className="w-full lg:w-80 shrink-0 space-y-6 hidden md:block">
            <div className="bg-card border border-border rounded-2xl p-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Intelligence Graph</h4>
              <div className="flex items-center gap-3 mb-3">
                <FileText className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium">0 Notes</span>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <Bookmark className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-medium">0 Highlights</span>
              </div>
              <div className="flex items-center gap-3">
                <Layers className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium">0 Chapters mapped</span>
              </div>
            </div>
            
            <div className="bg-card border border-border rounded-2xl p-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Target Schedule</h4>
              <p className="text-sm text-muted-foreground">
                To reach your goal of finishing by {book.targetDate ? format(new Date(book.targetDate), 'MMM d, yyyy') : 'the projected date'}, 
                you must read <strong className="text-foreground">{book.plan?.requiredPagesPerDay} pages</strong> per day.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
