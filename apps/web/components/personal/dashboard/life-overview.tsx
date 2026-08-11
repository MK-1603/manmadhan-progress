import React from "react";
import { BookOpen, Headphones, PenTool, Book } from "lucide-react";

export function LifeOverview({ learning, journal }: { learning: any, journal: any }) {
  const { activeBook, activePodcast } = learning || {};

  return (
    <div className="flex flex-col gap-4 pb-6">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Personal</p>
      <div className="flex flex-col">
        {/* Journal */}
        <div className="group flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-border/40 hover:bg-secondary/30 transition-colors cursor-pointer">
          <div className="text-sm font-medium text-foreground w-24">
            Journal
          </div>
          <div className="flex-1 text-sm text-muted-foreground">
            {journal ? "Logged today" : "No entry today"}
          </div>
        </div>

        {/* Book */}
        <div className="group flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-border/40 hover:bg-secondary/30 transition-colors cursor-pointer">
          <div className="text-sm font-medium text-foreground w-24">
            Book
          </div>
          <div className="flex-1 text-sm text-muted-foreground">
            {activeBook ? activeBook.title : "No active book"}
          </div>
        </div>

        {/* Podcast */}
        <div className="group flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-border/40 hover:bg-secondary/30 transition-colors cursor-pointer">
          <div className="text-sm font-medium text-foreground w-24">
            Podcast
          </div>
          <div className="flex-1 text-sm text-muted-foreground">
            {activePodcast ? activePodcast.title : "Nothing playing"}
          </div>
        </div>

        {/* Learning */}
        <div className="group flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-border/40 hover:bg-secondary/30 transition-colors cursor-pointer">
          <div className="text-sm font-medium text-foreground w-24">
            Learning
          </div>
          <div className="flex-1 text-sm text-muted-foreground">
            {learning?.activeCourse ? learning.activeCourse.title : "No active course"}
          </div>
        </div>
      </div>
    </div>
  );
}
