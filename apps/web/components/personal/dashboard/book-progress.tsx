import React from "react";
import { Book as BookIcon, MoreVertical, ArrowRight, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

export function BookProgress({ book }: { book: any }) {
  const router = useRouter();

  if (!book) {
    return (
      <div className="bg-card border border-border/50 rounded-xl p-5 shadow-sm h-full flex flex-col relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BookIcon className="w-4 h-4 text-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Book Progress</h3>
          </div>
          <button className="text-muted-foreground hover:text-foreground">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 flex flex-col justify-center items-center text-center">
          <BookIcon className="w-8 h-8 text-muted-foreground mb-3 opacity-50" />
          <p className="text-sm font-bold text-foreground mb-1">No Active Book</p>
          <p className="text-xs text-muted-foreground mb-4">Start reading to track progress</p>
          <button 
            onClick={() => router.push("/personal/books/new")}
            className="flex items-center gap-2 px-4 py-2 bg-foreground text-background text-xs font-semibold rounded-lg hover:bg-foreground/90 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Book
          </button>
        </div>
      </div>
    );
  }

  const title = book.title;
  const author = book.author;
  const progress = book.progressPercent || 0;
  const currentChapter = book.currentChapter || "Keep reading!";

  return (
    <div className="bg-card border border-border/50 rounded-xl p-5 shadow-sm h-full flex flex-col relative">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BookIcon className="w-4 h-4 text-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Book Progress</h3>
        </div>
        <button className="text-muted-foreground hover:text-foreground">
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      <div className="flex gap-4 mb-5">
        <div className="w-20 h-28 bg-secondary/50 rounded flex items-center justify-center shrink-0 border border-border/50 overflow-hidden shadow-sm">
          {book.coverUrl ? (
             <img src={book.coverUrl} alt="Cover" className="w-full h-full object-cover" />
          ) : (
             <div className="text-[10px] font-bold text-muted-foreground text-center px-2">{title}</div>
          )}
        </div>
        <div className="flex flex-col justify-center flex-1 min-w-0 py-1">
          <h4 className="text-sm font-bold text-foreground truncate mb-1">{title}</h4>
          <p className="text-xs text-muted-foreground truncate mb-4">{author}</p>
          
          <div className="mt-auto">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-muted-foreground">Reading progress</span>
              <span className="text-xs font-bold text-foreground">{progress}%</span>
            </div>
            <div className="w-full h-1 bg-border/50 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-auto pt-2">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Current Chapter</p>
        <p className="text-xs font-medium text-foreground truncate mb-4">{currentChapter}</p>
        <button 
          onClick={() => router.push(`/personal/books/${book.id}`)}
          className="w-full py-2.5 px-3 border border-border/50 rounded-lg text-xs font-semibold text-foreground flex items-center justify-center gap-2 hover:bg-secondary/50 transition-colors"
        >
          Continue Reading
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
