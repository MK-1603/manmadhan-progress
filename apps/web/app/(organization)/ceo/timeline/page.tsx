"use client";

import { useState, useEffect, useCallback } from "react";
import {
  History, Search, Loader2, AlertCircle, Folder, CheckSquare, Users, CheckCircle2,
  Zap, Calendar, Clock, ArrowRight, User, X, ChevronRight, Filter, ShieldCheck
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import apiClient from "@/lib/api-client";
import { PremiumCard } from "@/components/ui/premium-card";
import Link from "next/link";

const categoryIcon = (cat: string) => {
  switch (cat) {
    case "Projects": return <Folder className="w-4 h-4 text-amber-500" />;
    case "Tasks": return <CheckSquare className="w-4 h-4 text-blue-500" />;
    case "People": return <Users className="w-4 h-4 text-purple-500" />;
    case "Approvals": return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    case "Automation": return <Zap className="w-4 h-4 text-amber-400" />;
    default: return <ShieldCheck className="w-4 h-4 text-muted-foreground" />;
  }
};

const categoryBadgeClass = (cat: string) => {
  switch (cat) {
    case "Projects": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
    case "Tasks": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    case "People": return "bg-purple-500/10 text-purple-500 border-purple-500/20";
    case "Approvals": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    case "Automation": return "bg-amber-400/10 text-amber-400 border-amber-400/20";
    default: return "bg-muted text-muted-foreground border-border";
  }
};

function formatEventDateGroup(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yestStart = new Date(todayStart.getTime() - 86400000);

  if (d >= todayStart) return "TODAY";
  if (d >= yestStart && d < todayStart) return "YESTERDAY";
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

function timeAgo(dateString: string) {
  const d = new Date(dateString);
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function CEOTimelinePage() {
  const [events, setEvents] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({
    todayCount: 0,
    projectsCount: 0,
    tasksCount: 0,
    peopleCount: 0,
    approvalsCount: 0,
    automationCount: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [categoryFilter, setCategoryFilter] = useState("All");
  const [dateRangeFilter, setDateRangeFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  const fetchTimeline = useCallback(async () => {
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      if (!workspaceId) return;

      const params = new URLSearchParams();
      params.set("workspaceId", workspaceId);
      if (categoryFilter !== "All") params.set("category", categoryFilter);
      if (dateRangeFilter !== "All") params.set("dateRange", dateRangeFilter);
      if (search.trim()) params.set("search", search.trim());

      const res = await apiClient.get(`/org/timeline?${params.toString()}`);
      if (res.data.success) {
        setEvents(res.data.data.events || []);
        if (res.data.data.summary) setSummary(res.data.data.summary);
      } else {
        setError(res.data.error || "Failed to load timeline");
      }
    } catch {
      setError("Unable to load organization execution timeline");
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, dateRangeFilter, search]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  // Group events by Date Heading
  const groupedEvents = events.reduce((acc: Record<string, any[]>, ev) => {
    const groupKey = formatEventDateGroup(ev.createdAt);
    if (!acc[groupKey]) acc[groupKey] = [];
    acc[groupKey].push(ev);
    return acc;
  }, {});

  return (
    <div className="p-4 lg:p-6 max-w-[1240px] mx-auto w-full space-y-5">
      {/* Header Bar */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2.5">
            <History className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground tracking-tight">Timeline</h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Executive organization execution history and audit stream
          </p>
        </div>
      </div>

      {/* Top Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
        {[
          { label: "Today", value: summary.todayCount, color: "text-foreground" },
          { label: "Projects", value: summary.projectsCount, color: "text-amber-500" },
          { label: "Tasks", value: summary.tasksCount, color: "text-blue-500" },
          { label: "People", value: summary.peopleCount, color: "text-purple-500" },
          { label: "Approvals", value: summary.approvalsCount, color: "text-emerald-500" },
          { label: "Automation", value: summary.automationCount, color: "text-amber-400" },
        ].map((s) => (
          <PremiumCard key={s.label} className="p-2.5">
            <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">{s.label}</p>
            <p className={`text-lg font-bold mt-0.5 ${s.color}`}>{s.value}</p>
          </PremiumCard>
        ))}
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search activity by title, actor, or details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:border-primary outline-none"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {["All", "Projects", "Tasks", "People", "Approvals", "Automation"].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                categoryFilter === cat
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Date Range Selector */}
        <select
          value={dateRangeFilter}
          onChange={(e) => setDateRangeFilter(e.target.value)}
          className="px-3 py-1.5 bg-card border border-border rounded-xl text-xs font-semibold text-foreground focus:border-primary outline-none"
        >
          <option value="All">All Time</option>
          <option value="Today">Today</option>
          <option value="Yesterday">Yesterday</option>
        </select>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Main Timeline Stream Grouped by Date */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : Object.keys(groupedEvents).length === 0 ? (
        <div className="text-center py-16 p-6 border border-border rounded-2xl bg-card space-y-2">
          <History className="w-8 h-8 text-muted-foreground/40 mx-auto" />
          <p className="text-xs font-bold text-foreground">No execution activity found</p>
          <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
            Organization execution history will populate automatically as projects, tasks, approvals, and automation events occur.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedEvents).map(([dateGroup, groupItems]) => (
            <div key={dateGroup} className="space-y-3">
              {/* Date Group Heading */}
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary px-2.5 py-0.5 bg-primary/10 border border-primary/20 rounded-md">
                  {dateGroup}
                </span>
                <div className="flex-1 h-px bg-border/60" />
              </div>

              {/* Group Events */}
              <div className="relative pl-4 space-y-2.5 border-l border-border/60 ml-2.5">
                {groupItems.map((ev, i) => (
                  <motion.div
                    key={ev.id || i}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                  >
                    <PremiumCard
                      onClick={() => setSelectedEvent(ev)}
                      className="p-3 hover:border-primary/40 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          {/* Event Icon */}
                          <div className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center shrink-0 mt-0.5">
                            {categoryIcon(ev.category)}
                          </div>

                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                                {ev.title}
                              </span>
                              <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border ${categoryBadgeClass(ev.category)}`}>
                                {ev.category}
                              </span>
                            </div>

                            <p className="text-xs text-foreground/90 font-medium line-clamp-2">
                              {ev.details}
                            </p>

                            <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-0.5 flex-wrap">
                              <span className="flex items-center gap-1 font-semibold text-foreground">
                                <User className="w-3 h-3 text-primary" /> {ev.actor.name}
                              </span>
                              <span className="flex items-center gap-1 font-mono">
                                <Clock className="w-3 h-3" /> {timeAgo(ev.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <span className="text-[10px] text-muted-foreground shrink-0 font-mono hidden sm:inline-block">
                          {new Date(ev.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </PremiumCard>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Slide-over Side Drawer for Event Details */}
      <AnimatePresence>
        {selectedEvent && (
          <div className="fixed inset-0 z-50 flex justify-end bg-background/60 backdrop-blur-sm">
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full max-w-md bg-card border-l border-border h-full shadow-2xl flex flex-col p-6 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
                    {categoryIcon(selectedEvent.category)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">{selectedEvent.title}</h3>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{selectedEvent.category} Event</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="p-1 text-muted-foreground hover:text-foreground rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 flex-1 overflow-y-auto">
                <div>
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block mb-1">
                    Actor / Responsible User
                  </label>
                  <div className="flex items-center gap-2.5 p-2.5 bg-background border border-border rounded-xl">
                    <div className="w-7 h-7 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                      {selectedEvent.actor.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">{selectedEvent.actor.name}</p>
                      {selectedEvent.actor.email && <p className="text-[10px] text-muted-foreground">{selectedEvent.actor.email}</p>}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block mb-1">
                    Event Details & Context
                  </label>
                  <div className="p-3 bg-background border border-border rounded-xl text-xs text-foreground font-medium leading-relaxed">
                    {selectedEvent.details}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-background border border-border rounded-xl">
                    <span className="text-[9px] font-bold uppercase text-muted-foreground block">Relative Time</span>
                    <span className="font-semibold text-foreground">{timeAgo(selectedEvent.createdAt)}</span>
                  </div>
                  <div className="p-2.5 bg-background border border-border rounded-xl">
                    <span className="text-[9px] font-bold uppercase text-muted-foreground block">Exact Timestamp</span>
                    <span className="font-mono text-[11px] text-foreground">{new Date(selectedEvent.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border flex justify-end">
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl"
                >
                  Close Details
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
