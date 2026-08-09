"use client";

import { useEffect, useState } from "react";
import { Plus, BookOpen, Clock, Activity, Calendar } from "lucide-react";
import apiClient from "@/lib/api-client";
import { PersonalBookAddModal } from "@/components/personal/personal-book-add-modal";
import Image from "next/image";

type Book = {
  id: string;
  title: string;
  subtitle?: string;
  author?: string;
  pageCount?: number;
  coverUrl?: string;
  status: string;
  currentPage: number;
  dailyPageTarget: number;
  targetDate?: string;
};

export default function LibraryPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Quick reading session form states
  const [sessionBookId, setSessionBookId] = useState<string | null>(null);
  const [pagesRead, setPagesRead] = useState("");
  const [sessionDuration, setSessionDuration] = useState("");

  const fetchBooks = async () => {
    try {
      const result = await apiClient.get(`/personal/books`);
      setBooks(result.data?.data ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  const submitReadingSession = async (bookId: string) => {
    if (!pagesRead) return;
    try {
      await apiClient.post(`/personal/books/${bookId}/session`, {
        pagesRead,
        durationMinutes: sessionDuration
      });
      setSessionBookId(null);
      setPagesRead("");
      setSessionDuration("");
      fetchBooks();
    } catch (e) {
      console.error("Failed to log reading session");
    }
  };

  // Split books into Reading and Others
  const readingBooks = books.filter(b => b.status === "Reading");
  const otherBooks = books.filter(b => b.status !== "Reading");

  const calculateProgress = (book: Book) => {
    if (!book.pageCount) return 0;
    return Math.min(100, Math.round((book.currentPage / book.pageCount) * 100));
  };

  return (
    <div className="min-h-screen bg-background pb-24 text-foreground font-sans">
      <header className="px-6 md:px-10 pt-8 pb-6 border-b border-border bg-card">
        <div className="max-w-6xl mx-auto flex justify-between items-end">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              <span>Personal</span> / <span className="text-foreground">Knowledge</span>
            </div>
            <h1 className="text-3xl font-bold">Book Library</h1>
            <p className="mt-2 text-sm text-muted-foreground max-w-lg">
              Manage your reading plan. Track progress, log sessions, and link books to your learning path.
            </p>
          </div>
          <button onClick={() => setOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-foreground text-background rounded-xl font-bold text-sm shadow-sm hover:bg-foreground/90 transition-all active:scale-95">
            <Plus className="w-4 h-4" /> Add Book from URL
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 md:p-10 space-y-12">
        {loading ? (
          <div className="flex gap-6 animate-pulse">
            <div className="w-64 h-80 bg-card border border-border rounded-2xl" />
            <div className="w-64 h-80 bg-card border border-border rounded-2xl" />
          </div>
        ) : books.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-border/60 rounded-3xl bg-card/25 max-w-3xl mx-auto">
            <BookOpen className="w-12 h-12 text-muted-foreground/60 mx-auto mb-4" />
            <h3 className="text-lg font-bold mb-1">No books yet</h3>
            <p className="text-sm text-muted-foreground mb-6">Paste a link from Amazon or Goodreads to automatically resolve book details.</p>
            <button onClick={() => setOpen(true)} className="px-5 py-2.5 bg-foreground text-background font-bold rounded-xl text-sm">Add Book</button>
          </div>
        ) : (
          <>
            {/* CURRENTLY READING WIDGET */}
            {readingBooks.length > 0 && (
              <section>
                <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4" /> Today's Reading
                </h2>
                <div className="grid gap-6 md:grid-cols-2">
                  {readingBooks.map(book => {
                    const pct = calculateProgress(book);
                    return (
                      <article key={book.id} className="bg-card border border-border rounded-3xl p-6 flex gap-6 shadow-sm">
                        <div className="w-28 shrink-0 flex flex-col gap-3">
                          <div className="aspect-[2/3] w-full bg-accent rounded-xl border border-border overflow-hidden relative shadow-sm">
                            {book.coverUrl ? (
                              <Image src={book.coverUrl} alt="Cover" fill className="object-cover" unoptimized />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <BookOpen className="w-8 h-8 text-muted-foreground/30" />
                              </div>
                            )}
                          </div>
                          <div className="text-center">
                            <span className="text-xs font-bold text-muted-foreground">{pct}% Done</span>
                          </div>
                        </div>

                        <div className="flex-1 flex flex-col">
                          <h3 className="font-bold text-lg leading-tight line-clamp-2">{book.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">by {book.author}</p>
                          
                          <div className="mt-4 mb-4">
                            <div className="flex justify-between text-xs mb-1 font-medium">
                              <span>Page {book.currentPage}</span>
                              <span className="text-muted-foreground">{book.pageCount ? `${book.pageCount} total` : ""}</span>
                            </div>
                            <div className="h-1.5 w-full bg-accent rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                            <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-2 flex items-center justify-between">
                              <span>Target: {book.dailyPageTarget} pgs/day</span>
                              {book.targetDate && <span className="flex items-center gap-1"><Calendar className="w-3 h-3"/> Deadline: {new Date(book.targetDate).toLocaleDateString()}</span>}
                            </div>
                          </div>

                          <div className="mt-auto border-t border-border pt-4">
                            {sessionBookId === book.id ? (
                              <div className="flex gap-2">
                                <input type="number" placeholder="Pgs Read" value={pagesRead} onChange={e=>setPagesRead(e.target.value)} className="w-full h-9 text-xs rounded-lg border bg-background px-2 outline-none" />
                                <input type="number" placeholder="Mins" value={sessionDuration} onChange={e=>setSessionDuration(e.target.value)} className="w-full h-9 text-xs rounded-lg border bg-background px-2 outline-none" />
                                <button onClick={() => submitReadingSession(book.id)} className="h-9 px-3 bg-primary text-primary-foreground text-xs font-bold rounded-lg shrink-0">Log</button>
                                <button onClick={() => setSessionBookId(null)} className="h-9 px-3 border border-border text-xs font-bold rounded-lg shrink-0">Cancel</button>
                              </div>
                            ) : (
                              <button onClick={() => setSessionBookId(book.id)} className="w-full py-2 bg-foreground text-background font-bold text-xs rounded-xl flex items-center justify-center gap-2 hover:bg-foreground/90 transition-colors">
                                <Clock className="w-3.5 h-3.5" /> Log Reading Session
                              </button>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}

            {/* UP NEXT */}
            {otherBooks.length > 0 && (
              <section>
                <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 border-b border-border pb-2">Library & Backlog</h2>
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {otherBooks.map(book => (
                    <article key={book.id} className="group relative rounded-xl border border-border bg-card p-3 hover:border-foreground/30 transition-colors flex flex-col">
                      <div className="aspect-[2/3] w-full bg-accent rounded-lg border border-border overflow-hidden relative mb-3">
                        {book.coverUrl ? (
                          <Image src={book.coverUrl} alt="Cover" fill className="object-cover" unoptimized />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpen className="w-6 h-6 text-muted-foreground/30" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <button onClick={() => {
                            // Quick start reading
                            apiClient.post(`/personal/books/${book.id}/session`, { pagesRead: 0 }).then(() => fetchBooks());
                          }} className="px-4 py-2 bg-foreground text-background text-xs font-bold rounded-lg shadow-xl">
                            Start Reading
                          </button>
                        </div>
                      </div>
                      <div className="flex-1 flex flex-col">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">{book.status}</span>
                        <h3 className="font-bold text-sm leading-tight line-clamp-2">{book.title}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{book.author}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      <PersonalBookAddModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onSave={() => fetchBooks()}
      />
    </div>
  );
}
