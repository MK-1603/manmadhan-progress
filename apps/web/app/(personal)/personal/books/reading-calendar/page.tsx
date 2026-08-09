"use client";

import { ArrowLeft, Calendar, BookOpen } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ReadingCalendarPage() {
  const router = useRouter();

  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden">
      <header className="shrink-0 h-16 border-b border-muted flex items-center px-6 bg-card/50 backdrop-blur-md">
        <button onClick={() => router.back()} className="mr-4 p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Books / <span className="text-foreground">Reading Calendar</span></h1>
      </header>
      
      <main className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
          <Calendar className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Reading Heatmap & Calendar</h2>
        <p className="text-muted-foreground max-w-md mb-8">
          This page will display your reading streaks, session logs, and a Github-style contribution heatmap for your reading habits.
        </p>
        <div className="flex gap-4">
          <button onClick={() => router.push("/personal/books")} className="bg-primary text-primary-foreground px-6 py-2 rounded-full font-semibold">
            Back to Library
          </button>
        </div>
      </main>
    </div>
  );
}
