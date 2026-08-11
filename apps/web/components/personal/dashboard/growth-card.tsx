import React from "react";
import { Plus } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface GrowthCardProps {
  className?: string;
  activeBook?: any;
}

export function GrowthCard({ className = "", activeBook }: GrowthCardProps) {
  return (
    <div className={`bg-card border border-border rounded-2xl p-5 sm:p-6 flex flex-col transition-colors ${className}`}>
      <div className="flex items-center justify-between mb-5">
        <span className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-widest">
          Growth
        </span>
        <Link href="/personal/books" className="text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors">
          View all
        </Link>
      </div>

      {activeBook ? (
        <>
          <div className="flex gap-4 mb-5">
            {/* Book cover */}
            <div className="w-[68px] h-[100px] rounded-xl bg-muted border border-border flex-shrink-0 overflow-hidden relative flex items-center justify-center p-2 text-center">
              {activeBook.coverUrl ? (
                <img src={activeBook.coverUrl} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <span className="text-[11px] font-bold text-gold leading-tight line-clamp-3">
                  {activeBook.title}
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
              <div>
                <h3 className="text-[14px] font-semibold text-foreground leading-tight truncate mb-0.5">
                  {activeBook.title}
                </h3>
                <p className="text-[12px] text-muted-foreground truncate">{activeBook.author || "Unknown Author"}</p>
              </div>

              {activeBook.pageCount && activeBook.lastSession?.endPage && (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-muted-foreground">
                      Page {activeBook.lastSession.endPage} of {activeBook.pageCount}
                    </span>
                    <span className="text-[11px] font-semibold text-foreground">
                      {Math.round((activeBook.lastSession.endPage / activeBook.pageCount) * 100)}%
                    </span>
                  </div>
                  <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-foreground rounded-full"
                      style={{ width: `${Math.round((activeBook.lastSession.endPage / activeBook.pageCount) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <p className="text-[12px] text-muted-foreground mb-5">
            Last session:{" "}
            <span className="font-medium text-foreground">
              {activeBook.lastSession
                ? `${formatDistanceToNow(new Date(activeBook.lastSession.createdAt), { addSuffix: true })} · ${activeBook.lastSession.durationMinutes || 0} min`
                : "No sessions yet"}
            </span>
          </p>

          <Link
            href="/personal/books"
            className="mt-auto flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-border text-[12px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add session
          </Link>
        </>
      ) : (
        <div className="flex-1 flex flex-col justify-between pt-1">
          <div>
            <p className="text-[13px] font-semibold text-foreground">No active book</p>
            <p className="text-[12px] text-muted-foreground mt-1">Start tracking your reading to see progress here.</p>
          </div>
          <Link
            href="/personal/books"
            className="mt-6 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-border text-[12px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add book
          </Link>
        </div>
      )}
    </div>
  );
}
