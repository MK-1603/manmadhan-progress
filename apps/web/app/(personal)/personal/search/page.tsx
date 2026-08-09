"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Search, CheckSquare, FolderKanban, FileText, 
  Book, Target, Bell, Activity, Users, ArrowRight, Loader2, X 
} from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import apiClient from "@/lib/api-client";

interface SearchResultItem {
  id: string;
  name?: string;
  title?: string;
  description?: string;
  content?: string;
  email?: string;
  status?: string;
  url?: string;
}

interface GroupedResults {
  tasks: SearchResultItem[];
  projects: SearchResultItem[];
  notes: SearchResultItem[];
  journals: SearchResultItem[];
  ideas: SearchResultItem[];
  goals: SearchResultItem[];
  files: SearchResultItem[];
  reminders: SearchResultItem[];
  habits: SearchResultItem[];
  members: SearchResultItem[];
}

export default function GenericSearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<GroupedResults | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  // Autofocus input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounced search fetching
  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const delayDebounce = setTimeout(async () => {
      try {
        const workspaceId = localStorage.getItem("workspaceId") || "";
        const res = await apiClient.get(`/search?q=${encodeURIComponent(query)}&workspaceId=${workspaceId}`);
        if (res.data.success) {
          setResults(res.data.data);
        } else {
          setError("Couldn't complete search.");
        }
      } catch (err) {
        console.error(err);
        setError("Error completing search.");
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  // Group configurations
  const groupConfig = [
    { key: "tasks", label: "Tasks", icon: CheckSquare, path: (id: string) => `/personal/tasks` },
    { key: "projects", label: "Projects", icon: FolderKanban, path: (id: string) => `/personal/projects` },
    { key: "notes", label: "Notes", icon: FileText, path: (id: string) => `/personal/notes` },
    { key: "journals", label: "Journal", icon: Book, path: (id: string) => `/personal/journal` },
    { key: "ideas", label: "Ideas", icon: Book, path: (id: string) => `/personal/ideas` },
    { key: "goals", label: "Goals", icon: Target, path: (id: string) => `/personal/goals` },
    { key: "files", label: "Files", icon: FileText, path: (id: string) => `/personal/library` },
    { key: "reminders", label: "Reminders", icon: Bell, path: (id: string) => `/personal/reminders` },
    { key: "habits", label: "Habits", icon: Activity, path: (id: string) => `/personal/habits` },
    { key: "members", label: "Members", icon: Users, path: (id: string) => `/organization/members` },
  ];

  // Flatten results for keyboard navigation
  const getFlattenedItems = () => {
    if (!results) return [];
    const items: { id: string; label: string; url: string; groupLabel: string; icon: any }[] = [];

    groupConfig.forEach(group => {
      const list = results[group.key as keyof GroupedResults] || [];
      list.forEach(item => {
        items.push({
          id: item.id,
          label: item.title || item.name || item.content || item.email || "Untitled",
          url: group.path(item.id),
          groupLabel: group.label,
          icon: group.icon,
        });
      });
    });

    return items;
  };

  const flattenedItems = getFlattenedItems();

  // Keyboard navigation within results
  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      if (flattenedItems.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % flattenedItems.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + flattenedItems.length) % flattenedItems.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const selected = flattenedItems[selectedIndex];
        if (selected) {
          router.push(selected.url);
        }
      }
    };

    window.addEventListener("keydown", handleKeys);
    return () => window.removeEventListener("keydown", handleKeys);
  }, [flattenedItems, selectedIndex, router]);

  const handleItemClick = (url: string) => {
    router.push(url);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col p-4 md:p-8 max-w-4xl mx-auto">
      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">Global Search</h1>
        <p className="text-xs text-muted-foreground mt-1">Search real-time across tasks, projects, goals, notes, and resources.</p>
      </div>

      {/* Input Search Container */}
      <div className="flex items-center gap-3 px-4 py-3 bg-card border border-border rounded-2xl shadow-sm mb-6">
        <Search className="w-5 h-5 text-gold shrink-0 stroke-[2.5]" />
        <input 
          ref={inputRef}
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your workspace..."
          className="flex-1 bg-transparent text-sm text-foreground focus:outline-none placeholder:text-muted-foreground"
        />
        {query && (
          <button onClick={() => setQuery("")} className="p-0.5 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Results / Empty states */}
      <div className="flex-1 bg-card border border-border rounded-2xl p-4 shadow-xs min-h-[300px]">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-gold mb-3.5" />
            <span className="text-xs font-semibold">Querying workspace database...</span>
          </div>
        ) : error ? (
          <div className="py-20 text-center text-rose-500 flex flex-col items-center justify-center">
            <span className="text-base font-bold">Couldn't complete search.</span>
            <span className="text-xs text-muted-foreground mt-1">Try again later.</span>
          </div>
        ) : !query.trim() ? (
          <div className="py-8">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-4">
              Explore categories
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {groupConfig.map((group, idx) => (
                <button
                  key={idx}
                  onClick={() => handleItemClick(group.path(""))}
                  className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-muted/40 hover:bg-accent text-left text-xs font-bold text-muted-foreground hover:text-foreground border border-transparent hover:border-border/40 transition-all duration-150 focus:outline-none"
                >
                  <group.icon className="w-4 h-4 text-gold/80 shrink-0" />
                  <span>{group.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : flattenedItems.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center text-muted-foreground">
            <Search className="w-12 h-12 opacity-25 mb-4" />
            <p className="text-sm font-bold text-foreground">No results found</p>
            <p className="text-xs text-muted-foreground mt-1">Try searching for tasks, projects, or notes.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {groupConfig.map(group => {
              const list = results ? (results[group.key as keyof GroupedResults] || []) : [];
              if (list.length === 0) return null;

              return (
                <div key={group.key} className="flex flex-col">
                  <div className="px-2.5 py-1 text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">
                    {group.label}
                  </div>
                  <div className="flex flex-col gap-1 mt-1.5">
                    {list.map(item => {
                      const itemIndex = flattenedItems.findIndex(f => f.id === item.id && f.groupLabel === group.label);
                      const isSelected = itemIndex === selectedIndex;

                      return (
                        <button
                          key={item.id}
                          onClick={() => handleItemClick(group.path(item.id))}
                          className={`flex items-center gap-3 px-3 py-2.5 w-full text-left rounded-xl text-xs font-semibold transition-all duration-150 focus:outline-none border border-transparent ${
                            isSelected 
                              ? "bg-gold/10 text-foreground border-l-2 border-gold font-bold" 
                              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                          }`}
                        >
                          <group.icon className={`w-4 h-4 shrink-0 ${isSelected ? "text-gold" : "opacity-75"}`} />
                          <div className="flex-1 min-w-0">
                            <p className={`truncate ${isSelected ? "text-foreground font-semibold" : "text-foreground"}`}>
                              {item.title || item.name || item.content || item.email}
                            </p>
                            {(item.description || item.status) && (
                              <p className="text-[10px] text-muted-foreground truncate font-normal mt-0.5">
                                {item.status ? `[${item.status}] ` : ""}{item.description}
                              </p>
                            )}
                          </div>
                          {isSelected && <ArrowRight className="w-4 h-4 text-gold shrink-0 animate-in slide-in-from-left-1 duration-150" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
