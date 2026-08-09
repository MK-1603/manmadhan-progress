"use client";

import { useEffect, useState } from "react";
import { BookOpen, Search, Filter, Plus, Book, Clock, Target, Calendar, Library } from "lucide-react";
import apiClient from "@/lib/api-client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { format } from "date-fns";

export default function BooksLibraryPage() {
  const [mounted, setMounted] = useState(false);
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("All");
  const router = useRouter();

  const loadBooks = async () => {
    try {
      const res = await apiClient.get(`/personal/books?status=${filterStatus}`);
      setBooks(res.data.data);
    } catch (err) {
      console.error("Failed to load books", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    void loadBooks();
  }, [filterStatus]);

  if (!mounted) return null;

  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="shrink-0 h-16 border-b border-muted flex items-center justify-between px-6 bg-card/50 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Library className="w-5 h-5 text-primary" />
          <h1 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Personal / <span className="text-foreground">Books Library</span></h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative hidden md:block">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="Search library..." className="pl-9 pr-4 py-1.5 text-sm bg-muted rounded-full border border-transparent focus:bg-background focus:border-border transition-colors w-64 outline-none" />
          </div>
          <button 
            onClick={() => router.push("/personal/books/discover")}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> Discover & Add Book
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Book Sidebar Navigation */}
        <div className="w-64 border-r border-muted bg-card/30 flex flex-col overflow-y-auto hidden lg:flex">
          <div className="p-4 space-y-1">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">Library</h3>
            {["All", "Currently Reading", "Want to Read", "Planned", "Completed", "Paused", "Abandoned"].map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${filterStatus === status ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted"}`}
              >
                {status === "All" ? "All Books" : status}
              </button>
            ))}
          </div>
          <div className="p-4 space-y-1 border-t border-muted">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">Reading</h3>
            <button onClick={() => router.push("/personal/books/today")} className="w-full text-left px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted flex items-center gap-2">
              <Target className="w-4 h-4" /> Today's Plan
            </button>
            <button onClick={() => router.push("/personal/books/reading-calendar")} className="w-full text-left px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Reading Calendar
            </button>
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-[1200px] mx-auto">
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 animate-pulse">
                {[1, 2, 3, 4, 5].map(i => <div key={i} className="aspect-[2/3] bg-muted rounded-xl"></div>)}
              </div>
            ) : books.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {books.map((book) => (
                  <div 
                    key={book.id} 
                    onClick={() => router.push(`/personal/books/${book.id}`)}
                    className="group relative rounded-xl border border-border bg-card hover:border-primary/50 transition-colors overflow-hidden cursor-pointer flex flex-col h-full shadow-sm hover:shadow-md"
                  >
                    <div className="aspect-[2/3] w-full bg-muted relative overflow-hidden flex items-center justify-center">
                      {book.coverUrl ? (
                        <Image src={book.coverUrl} alt={book.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <Book className="w-12 h-12 text-muted-foreground opacity-50" />
                      )}
                      
                      {book.plan?.completionPercent > 0 && book.plan.completionPercent < 100 && (
                        <div className="absolute bottom-0 left-0 w-full h-1 bg-background/50">
                          <div className="h-full bg-primary" style={{ width: `${book.plan.completionPercent}%` }} />
                        </div>
                      )}
                    </div>
                    
                    <div className="p-4 flex flex-col flex-1">
                      <h3 className="font-semibold text-sm line-clamp-2 mb-1">{book.title}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-1 flex-1">{book.author ?? "Unknown Author"}</p>
                      
                      <div className="mt-3 flex items-center justify-between text-[10px] uppercase font-bold tracking-wider">
                        <span className={`
                          ${book.status === 'Reading' ? 'text-blue-500' : ''}
                          ${book.status === 'Completed' ? 'text-green-500' : ''}
                          ${book.status === 'Want to Read' ? 'text-orange-500' : 'text-muted-foreground'}
                        `}>
                          {book.status}
                        </span>
                        {book.plan?.completionPercent > 0 && <span>{book.plan.completionPercent}%</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
                  <Library className="w-8 h-8 text-muted-foreground" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Your library is empty</h2>
                <p className="text-muted-foreground max-w-md mb-8">Start building your personal intelligence system by discovering and adding your first book.</p>
                <button 
                  onClick={() => router.push("/personal/books/discover")}
                  className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-semibold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25"
                >
                  Discover Books
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
