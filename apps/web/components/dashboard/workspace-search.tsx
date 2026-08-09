"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Search, CheckSquare, FolderKanban, FileText, 
  Book, Target, Bell, Activity, Users, ArrowRight, Loader2, X 
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import apiClient from "@/lib/api-client";
import { useMediaQuery } from "../../hooks/use-media-query";

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

export function WorkspaceSearch() {
  const pathname = usePathname();
  const router = useRouter();
  const isPersonal = pathname?.startsWith("/personal");
  const isMobile = useMediaQuery("(max-width: 768px)");

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<GroupedResults | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard shortcut Ctrl+K / Cmd+K to focus input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key?.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen(true);
        inputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Reset indices on open/close
  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(0);
    } else {
      setQuery("");
      setResults(null);
      setError(null);
    }
  }, [isOpen]);

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
    { key: "tasks", label: "Tasks", icon: CheckSquare, path: (id: string) => isPersonal ? `/personal/tasks` : `/tasks` },
    { key: "projects", label: "Projects", icon: FolderKanban, path: (id: string) => isPersonal ? `/personal/projects` : `/projects` },
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

  // Keyboard navigation within the flattened list
  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      if (!isOpen || flattenedItems.length === 0) return;

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
          setIsOpen(false);
          inputRef.current?.blur();
        }
      }
    };

    window.addEventListener("keydown", handleKeys);
    return () => window.removeEventListener("keydown", handleKeys);
  }, [isOpen, flattenedItems, selectedIndex, router]);

  const handleItemClick = (url: string) => {
    router.push(url);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div className="relative flex flex-1 justify-center max-w-[480px] w-full" ref={containerRef}>
      {/* Search Input Box */}
      <div className="relative w-full">
        <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-150 ${isOpen ? "text-gold" : "text-muted-foreground"}`} />
        <input 
          ref={inputRef}
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={isPersonal ? "Search personal workspace..." : "Search organization..."}
          className={`h-10 w-full bg-card border transition-all text-xs font-semibold text-foreground focus:outline-none placeholder:text-muted-foreground pl-10 pr-12 shadow-xs ${
            isOpen ? "border-border border-b-transparent rounded-t-xl rounded-b-none" : "border-border rounded-xl hover:border-border/80"
          }`}
        />
        {!isOpen && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none select-none">
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-background border border-border rounded text-muted-foreground shadow-xs">⌘</kbd>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-background border border-border rounded text-muted-foreground shadow-xs">K</kbd>
          </div>
        )}
        {isOpen && query && (
          <button 
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown Menu (Inline) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute top-full left-0 right-0 bg-card border border-t-0 border-border rounded-b-xl shadow-2xl overflow-hidden z-50 flex flex-col max-h-[60vh] select-none"
          >
            {/* Dynamic Search Results & States */}
            <div className="flex-1 overflow-y-auto p-2 min-h-0 scrollbar-thin scrollbar-thumb-muted-foreground/20">
              {loading ? (
                <div className="py-10 flex flex-col items-center justify-center text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin text-gold mb-2" />
                  <span className="text-[11px] font-semibold">Querying database...</span>
                </div>
              ) : error ? (
                <div className="py-10 text-center text-rose-500 flex flex-col items-center justify-center">
                  <span className="text-xs font-bold">Couldn't complete search.</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">Please check connection.</span>
                </div>
              ) : !query.trim() ? (
                // Shortcuts state
                <div className="py-2.5 px-2">
                  <p className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wider mb-2">
                    Search Categories
                  </p>
                  <div className="grid grid-cols-2 gap-1">
                    {groupConfig.map((group, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleItemClick(group.path(""))}
                        className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-accent/60 text-left text-xs font-semibold text-muted-foreground hover:text-foreground transition-all duration-150 focus:outline-none border border-transparent"
                      >
                        <group.icon className="w-3.5 h-3.5 text-gold/80 shrink-0" />
                        <span>{group.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : flattenedItems.length === 0 ? (
                <div className="py-12 text-center flex flex-col items-center justify-center text-muted-foreground">
                  <Search className="w-8 h-8 opacity-20 mb-2.5" />
                  <p className="text-xs font-bold text-foreground">No results found</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Try another search term.</p>
                </div>
              ) : (
                // Live Grouped Results List
                <div className="flex flex-col gap-2.5 py-1">
                  {groupConfig.map(group => {
                    const list = results ? (results[group.key as keyof GroupedResults] || []) : [];
                    if (list.length === 0) return null;

                    return (
                      <div key={group.key} className="flex flex-col">
                        <div className="px-2 py-0.5 text-[9px] font-extrabold text-muted-foreground uppercase tracking-wider">
                          {group.label}
                        </div>
                        <div className="flex flex-col gap-0.5 mt-1">
                          {list.map(item => {
                            const itemIndex = flattenedItems.findIndex(f => f.id === item.id && f.groupLabel === group.label);
                            const isSelected = itemIndex === selectedIndex;

                            return (
                              <button
                                key={item.id}
                                onClick={() => handleItemClick(group.path(item.id))}
                                className={`flex items-center gap-2.5 px-2.5 py-1.5 w-full text-left rounded-lg text-xs font-semibold transition-all duration-150 focus:outline-none border border-transparent ${
                                  isSelected 
                                    ? "bg-gold/10 text-foreground border-l-2 border-gold font-bold" 
                                    : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                                }`}
                              >
                                <group.icon className={`w-3.5 h-3.5 shrink-0 transition-colors ${isSelected ? "text-gold" : "opacity-75"}`} />
                                <div className="flex-1 min-w-0">
                                  <p className={`truncate ${isSelected ? "text-foreground" : "text-foreground/95"}`}>
                                    {item.title || item.name || item.content || item.email}
                                  </p>
                                  {(item.description || item.status) && (
                                    <p className="text-[10px] text-muted-foreground truncate font-normal mt-0.5">
                                      {item.status ? `[${item.status}] ` : ""}{item.description}
                                    </p>
                                  )}
                                </div>
                                {isSelected && <ArrowRight className="w-3 h-3 text-gold shrink-0" />}
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

            {/* Dropdown Footer */}
            <div className="border-t border-border/70 p-2 px-3 flex items-center justify-between shrink-0 bg-muted/15">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-[9.5px] text-muted-foreground font-semibold">
                  <kbd className="px-1 py-0.5 bg-card border border-border rounded shadow-xs">↑</kbd>
                  <kbd className="px-1 py-0.5 bg-card border border-border rounded shadow-xs">↓</kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1.5 text-[9.5px] text-muted-foreground font-semibold">
                  <kbd className="px-1 py-0.5 bg-card border border-border rounded shadow-xs">↵</kbd>
                  Select
                </span>
              </div>
              <span className="text-[9.5px] text-muted-foreground font-semibold">
                Esc to Close
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
