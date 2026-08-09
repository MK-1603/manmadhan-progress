"use client";

import { motion } from "framer-motion";
import { PenTool, NotebookPen, Plus } from "lucide-react";
import Link from "next/link";
import { PremiumCard } from "@/components/ui/premium-card";

export function JournalModule({
  recentEntries = [
    { title: "Reflections on Q3", date: "Today" },
    { title: "Product Ideas Sync", date: "Yesterday" }
  ]
}: {
  recentEntries?: Array<{ title: string; date: string }>;
}) {
  return (
    <motion.section 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="flex-1"
    >
      <PremiumCard className="flex flex-col gap-4 h-full p-6">
        <div className="flex items-center justify-between">
          <Link href="/personal/journal" className="flex items-center gap-2 group cursor-pointer outline-none focus-ring-brand rounded-sm">
            <span className="meta-text text-muted-foreground flex items-center gap-2 group-hover:text-foreground transition-colors">
              <NotebookPen className="w-4 h-4 text-primary" /> 
              Quick Capture
            </span>
          </Link>
          <button className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors text-secondary-foreground shadow-sm">
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Input */}
        <div className="relative mt-2">
          <div className="absolute top-1/2 -translate-y-1/2 left-3">
            <PenTool className="w-4 h-4 text-muted-foreground" />
          </div>
          <input 
            type="text" 
            placeholder="Jot down a thought..." 
            className="w-full bg-layer-2 border border-border focus:border-primary focus:bg-layer-3 rounded-md py-2.5 pl-9 pr-4 text-sm transition-all outline-none placeholder:text-muted-foreground shadow-sm"
          />
        </div>

        {/* Recent Entries */}
        <div className="flex flex-col gap-2 overflow-y-auto min-h-0 flex-1 mt-2">
          {recentEntries.map((entry, index) => (
            <Link 
              href={`/personal/journal/${index}`} 
              key={index} 
              className="px-3 py-2.5 rounded-md flex items-center justify-between hover:bg-layer-2 transition-colors group outline-none focus-ring-brand border border-transparent hover:border-border"
            >
              <span className="body-text text-foreground truncate max-w-[70%]">{entry.title}</span>
              <span className="caption-text text-muted-foreground whitespace-nowrap">{entry.date}</span>
            </Link>
          ))}
        </div>
      </PremiumCard>
    </motion.section>
  );
}
