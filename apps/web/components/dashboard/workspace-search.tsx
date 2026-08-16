"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Search, CheckSquare, FolderKanban, FileText, 
  Book, Target, Bell, Activity, Users, ArrowRight, Loader2, X 
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import apiClient from "@/lib/api-client";
import { useAuth } from "@/components/auth/auth-context";

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

export function WorkspaceSearch({
  activePopover,
  setActivePopover,
}: {
  activePopover?: "none" | "search" | "notifications" | "profile";
  setActivePopover?: (val: "none" | "search" | "notifications" | "profile") => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isPersonal = pathname?.startsWith("/personal");

  const isOpen = activePopover === "search";
  const setIsOpen = (open: boolean) => {
    if (setActivePopover) {
      setActivePopover(open ? "search" : "none");
    }
  };

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<GroupedResults | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Click outside listener
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Keyboard shortcut Cmd/Ctrl + K and Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key?.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Reset indices on state change
  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(0);
    } else {
      setQuery("");
      setResults(null);
      setError(null);
    }
  }, [isOpen]);

  // Debounced search query
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
    }, 250);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  const { user } = useAuth();
  const userRole = (user?.role || "CEO").toUpperCase();

  // Group configurations
  const groupConfig = [
    { key: "tasks", label: "Tasks", icon: CheckSquare, path: (id: string) => isPersonal ? `/personal/tasks` : userRole === "MEMBER" ? `/member/tasks` : userRole === "CO-CEO" ? `/co-ceo/tasks` : `/ceo/tasks` },
    { key: "projects", label: "Projects", icon: FolderKanban, path: (id: string) => isPersonal ? `/personal/projects` : userRole === "MEMBER" ? `/member/projects` : userRole === "CO-CEO" ? `/co-ceo/projects` : `/ceo/projects` },
    { key: "notes", label: "Notes", icon: FileText, path: (id: string) => `/personal/notes` },
    { key: "journals", label: "Journal", icon: Book, path: (id: string) => `/personal/journal` },
    { key: "ideas", label: "Ideas", icon: Book, path: (id: string) => `/personal/notes` },
    { key: "goals", label: "Goals", icon: Target, path: (id: string) => `/personal/tasks` },
    { key: "files", label: "Files", icon: FileText, path: (id: string) => `/personal/documents` },
    { key: "reminders", label: "Reminders", icon: Bell, path: (id: string) => `/personal/reminders` },
    { key: "habits", label: "Habits", icon: Activity, path: (id: string) => `/personal/focus` },
    ...(userRole !== "MEMBER" ? [{ key: "members", label: "Members", icon: Users, path: (id: string) => userRole === "CO-CEO" ? `/co-ceo/people` : `/ceo/people` }] : []),
  ];

  // Flatten results for keyboard navigation
  const flattenedItems = React.useMemo(() => {
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
  }, [results, isPersonal, userRole]);

  // Arrow navigation
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

  const placeholderText = isPersonal ? "Search personal workspace..." : "Search ManMadhan workspace...";

  return (
    <div className="relative flex flex-1 justify-center max-w-[480px] w-full" ref={containerRef}>
      {/* Search Input Box */}
      <div className="relative w-full">
        <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-150 ${isOpen ? "text-[#B28D18] dark:text-[#D4B12F]" : "text-[#667085] dark:text-[#8B94A3]"}`} />
        <input 
          ref={inputRef}
          type="text" 
          aria-label="Search workspace"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholderText}
          className={`h-[42px] w-full bg-[#FFFFFF] dark:bg-[#15181D] border transition-all text-xs font-medium text-[#17202A] dark:text-[#F2F3F5] focus:outline-none placeholder:text-[#667085] dark:placeholder:text-[#8B94A3] pl-10 pr-12 ${
            isOpen
              ? "border-[#E5E7EB] dark:border-[#2A2F36] border-b-transparent rounded-t-xl rounded-b-none"
              : "border-[#E5E7EB] dark:border-[#24282E] rounded-xl hover:border-[#B28D18]/40 dark:hover:border-[#D4B12F]/40"
          }`}
        />
        {!isOpen && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none select-none">
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-[#F3F4F6] dark:bg-[#1B2028] border border-[#E5E7EB] dark:border-[#24282E] rounded text-[#667085] dark:text-[#8B94A3]">⌘</kbd>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-[#F3F4F6] dark:bg-[#1B2028] border border-[#E5E7EB] dark:border-[#24282E] rounded text-[#667085] dark:text-[#8B94A3]">K</kbd>
          </div>
        )}
        {isOpen && query && (
          <button 
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-[#F3F4F6] dark:hover:bg-[#20252C] text-[#667085] dark:text-[#8B94A3]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Centered Command Panel Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14 }}
            className="absolute top-full left-0 right-0 bg-[#FFFFFF] dark:bg-[#15181D] border border-t-0 border-[#E5E7EB] dark:border-[#2A2F36] rounded-b-xl shadow-2xl overflow-hidden z-50 flex flex-col max-h-[460px] select-none"
          >
            {/* Dynamic Search Results & States */}
            <div className="flex-1 overflow-y-auto p-2 min-h-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {loading ? (
                <div className="py-8 flex flex-col items-center justify-center text-[#667085] dark:text-[#8B94A3]">
                  <Loader2 className="w-4 h-4 animate-spin text-[#B28D18] dark:text-[#D4B12F] mb-2" />
                  <span className="text-[11px] font-mono">Searching workspace...</span>
                </div>
              ) : error ? (
                <div className="py-8 text-center text-red-500 flex flex-col items-center justify-center">
                  <span className="text-xs font-semibold">Search unavailable</span>
                </div>
              ) : !query.trim() ? (
                // Shortcuts state
                <div className="py-2 px-2">
                  <p className="text-[10px] font-mono font-medium text-[#667085] dark:text-[#8B94A3] uppercase tracking-[0.1em] mb-2">
                    DESTINATIONS & CATEGORIES
                  </p>
                  <div className="grid grid-cols-2 gap-1">
                    {groupConfig.map((group, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleItemClick(group.path(""))}
                        className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-[#F3F4F6] dark:hover:bg-[#1C2027] text-left text-xs font-medium text-[#667085] dark:text-[#8B94A3] hover:text-[#17202A] dark:hover:text-[#F2F3F5] transition-colors cursor-pointer"
                      >
                        <group.icon className="w-3.5 h-3.5 text-[#B28D18] dark:text-[#D4B12F] shrink-0" />
                        <span>{group.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : flattenedItems.length === 0 ? (
                <div className="py-10 text-center flex flex-col items-center justify-center text-[#667085] dark:text-[#8B94A3]">
                  <Search className="w-6 h-6 opacity-30 mb-2" />
                  <p className="text-xs font-semibold text-[#17202A] dark:text-[#F2F3F5]">No matching results</p>
                  <p className="text-[11px] mt-0.5 font-normal">Try adjusting your query.</p>
                </div>
              ) : (
                // Live Grouped Results List
                <div className="flex flex-col gap-2 py-1">
                  {groupConfig.map(group => {
                    const list = results ? (results[group.key as keyof GroupedResults] || []) : [];
                    if (list.length === 0) return null;

                    return (
                      <div key={group.key} className="flex flex-col">
                        <div className="px-2 py-0.5 text-[10px] font-mono font-medium text-[#667085] dark:text-[#8B94A3] uppercase tracking-[0.1em]">
                          {group.label}
                        </div>
                        <div className="flex flex-col gap-0.5 mt-1">
                          {list.map(item => {
                            const itemIndex = flattenedItems.findIndex(f => f.id === item.id && f.groupLabel === group.label);
                            const isSelected = itemIndex === selectedIndex;

                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => handleItemClick(group.path(item.id))}
                                className={`flex items-center gap-2.5 px-2.5 py-1.5 w-full text-left rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                                  isSelected 
                                    ? "bg-[#FFF8E7] dark:bg-[#1A1913] text-[#17202A] dark:text-[#F2F3F5] font-semibold" 
                                    : "text-[#667085] dark:text-[#8B94A3] hover:bg-[#F3F4F6] dark:hover:bg-[#1C2027] hover:text-[#17202A] dark:hover:text-[#F2F3F5]"
                                }`}
                              >
                                <group.icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-[#B28D18] dark:text-[#D4B12F]" : ""}`} />
                                <div className="flex-1 min-w-0">
                                  <p className="truncate">
                                    {item.title || item.name || item.content || item.email}
                                  </p>
                                </div>
                                {isSelected && <ArrowRight className="w-3 h-3 text-[#B28D18] dark:text-[#D4B12F] shrink-0" />}
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

            {/* Command Panel Footer */}
            <div className="border-t border-[#E5E7EB] dark:border-[#24282E] p-2 px-3 flex items-center justify-between shrink-0 bg-[#FBFBFB] dark:bg-[#111419]">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-[10px] text-[#667085] dark:text-[#8B94A3] font-mono">
                  <kbd className="px-1 py-0.5 bg-[#FFFFFF] dark:bg-[#1A1F26] border border-[#E5E7EB] dark:border-[#24282E] rounded">↑↓</kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1 text-[10px] text-[#667085] dark:text-[#8B94A3] font-mono">
                  <kbd className="px-1 py-0.5 bg-[#FFFFFF] dark:bg-[#1A1F26] border border-[#E5E7EB] dark:border-[#24282E] rounded">↵</kbd>
                  Select
                </span>
              </div>
              <span className="text-[10px] text-[#667085] dark:text-[#8B94A3] font-mono">
                Esc to Close
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

