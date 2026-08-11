import React from "react";
import { BookOpen, Plus } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface GrowthCardProps {
  className?: string;
  activeBook?: any; // Will match personalBooks schema + lastSession
}

export function GrowthCard({ className = "", activeBook }: GrowthCardProps) {
  return (
    <div className={`bg-[#FFFFFF] dark:bg-[#141414] border border-[#E5E7EB] dark:border-[#242424] rounded-[14px] p-6 flex flex-col shadow-sm dark:shadow-none transition-colors ${className}`}>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[13px] font-semibold text-[#171717] dark:text-[#F5F5F5] uppercase tracking-wider">
          GROWTH
        </h2>
        <Link href="/personal/books" className="text-[13px] font-medium text-[#52525B] dark:text-[#A1A1AA] hover:text-[#D99A00] dark:hover:text-[#F5B800] transition-colors">
          View all
        </Link>
      </div>

      {activeBook ? (
        <>
          <div className="flex gap-4 mb-5">
            <div className="w-[72px] h-[104px] bg-[#FAFAF9] dark:bg-[#1D1D1D] rounded flex-shrink-0 border border-[#E5E7EB] dark:border-[#242424] overflow-hidden flex flex-col justify-center items-center p-2 text-center relative">
              {activeBook.coverUrl ? (
                <img src={activeBook.coverUrl} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <>
                  <span className="text-[12px] font-bold text-[#D99A00] dark:text-[#F5B800] leading-tight mb-1 line-clamp-3">
                    {activeBook.title}
                  </span>
                  <span className="text-[8px] text-[#52525B] dark:text-[#A1A1AA] line-clamp-1">
                    {activeBook.author || "Unknown"}
                  </span>
                </>
              )}
            </div>

            <div className="flex-1 min-w-0 py-1 flex flex-col justify-between">
              <div>
                <h3 className="text-[14px] font-bold text-[#171717] dark:text-[#F5F5F5] leading-tight mb-1 truncate">
                  {activeBook.title}
                </h3>
                <p className="text-[12px] text-[#52525B] dark:text-[#A1A1AA] truncate mb-2">
                  {activeBook.author || "Unknown Author"}
                </p>
                
                {activeBook.pageCount && activeBook.lastSession?.endPage && (
                  <>
                    <div className="flex items-center justify-between mt-3 mb-1">
                      <span className="text-[12px] font-medium text-[#171717] dark:text-[#F5F5F5]">
                        Page {activeBook.lastSession.endPage} of {activeBook.pageCount}
                      </span>
                      <span className="text-[12px] font-bold text-[#171717] dark:text-[#F5F5F5]">
                        {Math.round((activeBook.lastSession.endPage / activeBook.pageCount) * 100)}%
                      </span>
                    </div>
                    <div className="w-full h-1 bg-[#F3F4F6] dark:bg-[#1D1D1D] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#171717] dark:bg-[#F5F5F5] rounded-full transition-all" 
                        style={{ width: `${Math.round((activeBook.lastSession.endPage / activeBook.pageCount) * 100)}%` }} 
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <p className="text-[12px] text-[#52525B] dark:text-[#A1A1AA] mb-4">
            Last session:<br />
            <span className="font-medium text-[#171717] dark:text-[#F5F5F5]">
              {activeBook.lastSession 
                ? `${formatDistanceToNow(new Date(activeBook.lastSession.createdAt), { addSuffix: true })} · ${activeBook.lastSession.durationMinutes || 0} min` 
                : "No sessions yet"}
            </span>
          </p>

          <Link href="/personal/books" className="flex items-center justify-center w-full gap-2 h-[40px] mt-auto rounded-lg border border-[#E5E7EB] dark:border-[#242424] text-[14px] font-medium text-[#52525B] dark:text-[#A1A1AA] hover:text-[#171717] dark:hover:text-[#F5F5F5] hover:bg-[#F3F4F6] dark:hover:bg-[#1D1D1D] transition-colors">
            <Plus className="w-4 h-4" strokeWidth={2} />
            Add book
          </Link>
        </>
      ) : (
        <div className="flex-1 flex flex-col justify-center">
          <h3 className="text-[14px] font-semibold text-[#171717] dark:text-[#F5F5F5] mb-2">
            No active book
          </h3>
          <p className="text-[13px] text-[#52525B] dark:text-[#A1A1AA] mb-4">
            You are not currently tracking any reading material.
          </p>
          <Link href="/personal/books" className="flex items-center justify-center gap-2 bg-[#D99A00] hover:bg-[#B77900] dark:bg-[#F5B800] dark:hover:bg-[#FFD43B] text-white dark:text-[#111111] px-4 h-[40px] rounded-[8px] font-medium text-[14px] transition-colors self-start">
            <Plus className="w-4 h-4" strokeWidth={2} />
            Add book
          </Link>
        </div>
      )}
    </div>
  );
}
