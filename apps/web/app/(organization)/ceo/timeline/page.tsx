"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  History, Search, Loader2, AlertCircle, Folder, CheckSquare, Users, CheckCircle2,
  Zap, Clock, User, X, ShieldCheck, RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import apiClient from "@/lib/api-client";
import { useSocket } from "@/components/providers/socket-provider";
import { useRegisterRefresh } from "@/components/providers/global-refresh-provider";

interface NormalizedActivity {
  id: string;
  category: "Projects" | "Tasks" | "People" | "Approvals" | "Automation" | "System";
  eventType: string;
  title: string;
  details: string;
  actor: {
    id?: string;
    name: string;
    email?: string;
    avatar?: string | null;
  };
  createdAt: string;
  isToday: boolean;
}

function normalizeTitle(rawType?: string): string {
  if (!rawType) return "System Activity";
  const upper = rawType.toUpperCase();
  switch (upper) {
    case "PROJECT_CREATED": return "Project created";
    case "PROJECT_UPDATED": return "Project updated";
    case "PROJECT_DELETED": return "Project deleted";
    case "TASK_CREATED": return "Task created";
    case "TASK_ASSIGNED": return "Task assigned";
    case "TASK_ACCEPTED": return "Task accepted";
    case "TASK_COMPLETED": return "Task completed";
    case "TASK_UPDATED": return "Task updated";
    case "TASK_DELETED": return "Task deleted";
    case "PEOPLE_INVITED":
    case "INVITATION_SENT": return "Invitation sent";
    case "INVITATION_ACCEPTED": return "Invitation accepted";
    case "INVITATION_CANCELLED": return "Invitation cancelled";
    case "APPROVAL_REQUESTED": return "Approval requested";
    case "WORK_APPROVED": return "Work approved";
    case "WORK_REJECTED": return "Work rejected";
    case "AUTOMATION_CREATED": return "Automation created";
    case "AUTOMATION_UPDATED": return "Automation updated";
    case "AUTOMATION_PAUSED": return "Automation paused";
    case "AUTOMATION_RESUMED": return "Automation resumed";
    case "FOCUS_STARTED": return "Focus session started";
    case "FOCUS_COMPLETED": return "Focus session completed";
    default: {
      return upper
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
    }
  }
}

function normalizeDetails(rawDetails?: any, eventType?: string): string {
  if (!rawDetails) return normalizeTitle(eventType);

  let str = typeof rawDetails === "object" ? JSON.stringify(rawDetails) : String(rawDetails).trim();

  // If raw details is JSON object, extract human legible names
  if (str.startsWith("{") && str.endsWith("}")) {
    try {
      const parsed = JSON.parse(str);
      if (parsed.name || parsed.title || parsed.projectName || parsed.taskTitle) {
        return String(parsed.name || parsed.title || parsed.projectName || parsed.taskTitle);
      }
      if (parsed.message) return String(parsed.message);
    } catch {
      // Fall through
    }
    return normalizeTitle(eventType);
  }

  // Strip raw UUIDs and JSON braces
  str = str
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "")
    .replace(/["'{}\[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!str || str.length < 2) return normalizeTitle(eventType);
  return str;
}

function formatRelativeTime(dateString?: string): string {
  if (!dateString) return "Just now";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "Just now";

  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hour ago`;
  
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatEventDateGroup(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yestStart = new Date(todayStart.getTime() - 86400000);

  if (d >= todayStart) return "TODAY";
  if (d >= yestStart && d < todayStart) return "YESTERDAY";
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

const categoryIcon = (cat: string) => {
  switch (cat) {
    case "Projects": return <Folder className="w-4 h-4 text-amber-500" />;
    case "Tasks": return <CheckSquare className="w-4 h-4 text-blue-500" />;
    case "People": return <Users className="w-4 h-4 text-purple-500" />;
    case "Approvals": return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    case "Automation": return <Zap className="w-4 h-4 text-[#B28D18] dark:text-[#C9A52A]" />;
    default: return <ShieldCheck className="w-4 h-4 text-[#667085] dark:text-[#8B95A5]" />;
  }
};

const categoryBadgeClass = (cat: string) => {
  switch (cat) {
    case "Projects": return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    case "Tasks": return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    case "People": return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
    case "Approvals": return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    case "Automation": return "bg-[#B28D18]/10 text-[#B28D18] dark:text-[#C9A52A] border-[#B28D18]/20";
    default: return "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20";
  }
};

export default function CEOTimelinePage() {
  const { socket } = useSocket();
  const [events, setEvents] = useState<NormalizedActivity[]>([]);
  const [summary, setSummary] = useState<any>({
    todayCount: 0,
    projectsCount: 0,
    tasksCount: 0,
    peopleCount: 0,
    approvalsCount: 0,
    automationCount: 0,
  });

  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [categoryFilter, setCategoryFilter] = useState("All");
  const [dateRangeFilter, setDateRangeFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<NormalizedActivity | null>(null);

  const fetchTimeline = useCallback(async () => {
    try {
      const workspaceId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : undefined;

      const params = new URLSearchParams();
      if (workspaceId && workspaceId !== "undefined" && workspaceId !== "null") {
        params.set("workspaceId", workspaceId);
      }
      if (categoryFilter !== "All") params.set("category", categoryFilter);
      if (dateRangeFilter !== "All") params.set("dateRange", dateRangeFilter);
      if (search.trim()) params.set("search", search.trim());

      const queryStr = params.toString();
      const res = await apiClient.get(`/org/timeline${queryStr ? `?${queryStr}` : ""}`);
      if (res.data?.success) {
        const rawEvents = Array.isArray(res.data.data.events) ? res.data.data.events : [];
        const normalized = rawEvents.map((ev: any) => ({
          id: ev.id || String(Math.random()),
          category: ev.category || "System",
          eventType: ev.eventType || "SYSTEM",
          title: normalizeTitle(ev.title || ev.eventType),
          details: normalizeDetails(ev.details, ev.eventType),
          actor: {
            id: ev.actor?.id,
            name: ev.actor?.name || ev.actor?.email || "System",
            email: ev.actor?.email || "",
            avatar: ev.actor?.avatar || null,
          },
          createdAt: ev.createdAt || new Date().toISOString(),
          isToday: Boolean(ev.isToday),
        }));

        setEvents(normalized);
        if (res.data.data.summary) setSummary(res.data.data.summary);
        setError("");
      } else {
        setError(res.data?.error || "Unable to load activity timeline right now.");
      }
    } catch (err: any) {
      if (err.code === "ERR_NETWORK" || err.message?.includes("Network Error")) {
        setError("Unable to connect to ManMadhan services.");
      } else {
        setError(err.response?.data?.error?.message || err.response?.data?.error || "Unable to load activity timeline.");
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [categoryFilter, dateRangeFilter, search]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  useRegisterRefresh(fetchTimeline);

  // Realtime Socket Activity Normalization
  useEffect(() => {
    if (!socket) return;
    const handleActivity = (raw: any) => {
      if (!raw) return;
      const normalized: NormalizedActivity = {
        id: raw.id || String(Date.now()),
        category: raw.category || "System",
        eventType: raw.eventType || "ACTIVITY",
        title: normalizeTitle(raw.title || raw.eventType),
        details: normalizeDetails(raw.details, raw.eventType),
        actor: {
          id: raw.actor?.id,
          name: raw.actor?.name || "System",
          email: raw.actor?.email || "",
          avatar: raw.actor?.avatar || null,
        },
        createdAt: raw.createdAt || new Date().toISOString(),
        isToday: true,
      };

      setEvents((prev) => [normalized, ...prev.slice(0, 199)]);
    };

    socket.on("activity.created", handleActivity);
    socket.on("audit.created", handleActivity);
    return () => {
      socket.off("activity.created", handleActivity);
      socket.off("audit.created", handleActivity);
    };
  }, [socket]);

  const handleManualRefresh = () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    fetchTimeline();
  };

  const groupedEvents = events.reduce((acc: Record<string, NormalizedActivity[]>, ev) => {
    const groupKey = formatEventDateGroup(ev.createdAt);
    if (!acc[groupKey]) acc[groupKey] = [];
    acc[groupKey].push(ev);
    return acc;
  }, {});

  return (
    <div className="w-full h-full flex flex-col justify-between overflow-y-auto bg-[#F9FAFB] dark:bg-[#060806] text-[#17202A] dark:text-[#F2F4F7] font-sans select-none p-4 sm:p-5 md:px-8 md:py-5 pb-[calc(84px+env(safe-area-inset-bottom))] md:pb-5 max-w-[1400px] mx-auto space-y-5 box-border [scrollbar-width:none]">
      
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5E7EB] dark:border-[#272D36] shrink-0">
        <div className="space-y-0.5">
          <h1 className="text-[20px] sm:text-[24px] font-bold text-[#17202A] dark:text-[#F2F4F7] tracking-tight leading-none flex items-center gap-2">
            <History className="w-5 h-5 text-[#B28D18] dark:text-[#C9A52A]" />
            <span>Timeline</span>
          </h1>
          <p className="text-[12.5px] text-[#667085] dark:text-[#8B95A5]">
            Executive organization execution history and activity feed.
          </p>
        </div>

        <button
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          className="w-[38px] h-[38px] rounded-[11px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E5E7EB] dark:border-[#272D36] text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7] flex items-center justify-center cursor-pointer transition-colors shrink-0 shadow-xs"
          title="Refresh activity feed"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-[#B28D18] dark:text-[#C9A52A]" : ""}`} />
        </button>
      </div>

      {/* KPI SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
        {[
          { label: "Today", value: summary.todayCount, color: "text-[#17202A] dark:text-[#F2F4F7]" },
          { label: "Projects", value: summary.projectsCount, color: "text-amber-500" },
          { label: "Tasks", value: summary.tasksCount, color: "text-blue-500" },
          { label: "People", value: summary.peopleCount, color: "text-purple-500" },
          { label: "Approvals", value: summary.approvalsCount, color: "text-emerald-500" },
          { label: "Automation", value: summary.automationCount, color: "text-[#B28D18] dark:text-[#C9A52A]" },
        ].map((s) => (
          <div key={s.label} className="p-3 rounded-[14px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E5E7EB] dark:border-[#272D36] shadow-xs">
            <p className="text-[10.5px] uppercase font-bold tracking-wider text-[#667085] dark:text-[#8B95A5]">{s.label}</p>
            <p className={`text-[20px] font-bold mt-0.5 leading-none ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#667085] dark:text-[#8B95A5]" />
          <input
            type="text"
            placeholder="Search activity by title or actor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 h-[38px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E5E7EB] dark:border-[#272D36] rounded-[11px] text-[12.5px] text-[#17202A] dark:text-[#F2F4F7] placeholder-[#667085] dark:placeholder-[#8B95A5] outline-none focus:border-[#B28D18] dark:focus:border-[#C9A52A]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 [scrollbar-width:none]">
          {["All", "Projects", "Tasks", "People", "Approvals", "Automation"].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`h-[38px] px-3.5 rounded-[11px] text-[12px] font-bold transition-all shrink-0 cursor-pointer border ${
                categoryFilter === cat
                  ? "bg-[#B28D18] dark:bg-[#C9A52A] text-white dark:text-[#0B0D10] border-[#B28D18] dark:border-[#C9A52A] shadow-xs"
                  : "bg-[#FFFFFF] dark:bg-[#15191F] border-[#E5E7EB] dark:border-[#272D36] text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A]"
              }`}
            >
              {cat}
            </button>
          ))}

          <select
            value={dateRangeFilter}
            onChange={(e) => setDateRangeFilter(e.target.value)}
            className="h-[38px] px-3 bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E5E7EB] dark:border-[#272D36] rounded-[11px] text-[12px] font-bold text-[#17202A] dark:text-[#F2F4F7] outline-none cursor-pointer shrink-0"
          >
            <option value="All">All Time</option>
            <option value="Today">Today</option>
            <option value="Yesterday">Yesterday</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-[12px] text-rose-600 dark:text-rose-400 text-[12.5px] font-medium flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchTimeline}
            className="px-3 py-1 bg-rose-600 text-white rounded-[8px] text-[11px] font-bold cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* TIMELINE EVENT STREAM */}
      {loading ? (
        <div className="p-12 text-center space-y-3 rounded-[16px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E5E7EB] dark:border-[#272D36]">
          <Loader2 className="w-6 h-6 animate-spin text-[#B28D18] dark:text-[#C9A52A] mx-auto" />
          <span className="text-[13px] font-medium text-[#667085] dark:text-[#8B95A5]">Loading activity...</span>
        </div>
      ) : Object.keys(groupedEvents).length === 0 ? (
        <div className="p-12 text-center space-y-3 rounded-[16px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E5E7EB] dark:border-[#272D36]">
          <History className="w-8 h-8 text-[#667085] dark:text-[#8B95A5]/40 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-[15px] font-bold text-[#17202A] dark:text-[#F2F4F7]">No activity yet</h3>
            <p className="text-[12.5px] text-[#667085] dark:text-[#8B95A5] max-w-sm mx-auto leading-relaxed">
              Your organization's execution history will appear here as work happens.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedEvents).map(([dateGroup, groupItems]) => (
            <div key={dateGroup} className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#B28D18] dark:text-[#C9A52A] px-2.5 py-0.5 bg-[#B28D18]/10 dark:bg-[#C9A52A]/10 border border-[#B28D18]/20 dark:border-[#C9A52A]/20 rounded-md">
                  {dateGroup}
                </span>
                <div className="flex-1 h-px bg-[#E5E7EB] dark:bg-[#272D36]" />
              </div>

              <div className="relative pl-4 space-y-2.5 border-l border-[#E5E7EB] dark:border-[#272D36] ml-2.5">
                {groupItems.map((ev, i) => (
                  <motion.div
                    key={ev.id || i}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.015 }}
                  >
                    <div
                      onClick={() => setSelectedEvent(ev)}
                      className="p-3.5 rounded-[14px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E5E7EB] dark:border-[#272D36] hover:border-[#B28D18] dark:hover:border-[#C9A52A] transition-colors cursor-pointer space-y-2 shadow-xs group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-[9px] bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] flex items-center justify-center shrink-0 mt-0.5">
                            {categoryIcon(ev.category)}
                          </div>

                          <div className="space-y-0.5 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-[13.5px] font-bold text-[#17202A] dark:text-[#F2F4F7] group-hover:text-[#B28D18] dark:group-hover:text-[#C9A52A] transition-colors">
                                {ev.title}
                              </h4>
                              <span className={`text-[9.5px] font-extrabold uppercase px-2 py-0.5 rounded border ${categoryBadgeClass(ev.category)}`}>
                                {ev.category}
                              </span>
                            </div>

                            <p className="text-[12.5px] text-[#17202A] dark:text-[#F2F4F7] font-medium truncate">
                              {ev.details}
                            </p>

                            <div className="flex items-center gap-3 text-[11.5px] text-[#667085] dark:text-[#8B95A5] pt-0.5">
                              <span className="flex items-center gap-1 font-semibold text-[#17202A] dark:text-[#F2F4F7]">
                                <User className="w-3 h-3 text-[#B28D18] dark:text-[#C9A52A]" /> {ev.actor.name}
                              </span>
                              <span>·</span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {formatRelativeTime(ev.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* EVENT DETAILS SIDE DRAWER */}
      <AnimatePresence>
        {selectedEvent && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full max-w-md bg-[#FFFFFF] dark:bg-[#15191F] border-l border-[#E5E7EB] dark:border-[#272D36] h-full shadow-2xl flex flex-col p-5 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-[#E5E7EB] dark:border-[#272D36] pb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-[9px] bg-[#B28D18]/10 dark:bg-[#C9A52A]/10 text-[#B28D18] dark:text-[#C9A52A] flex items-center justify-center">
                    {categoryIcon(selectedEvent.category)}
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-[#17202A] dark:text-[#F2F4F7]">{selectedEvent.title}</h3>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#667085] dark:text-[#8B95A5]">{selectedEvent.category} Event</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="p-1.5 text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7] rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 flex-1 overflow-y-auto">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#667085] dark:text-[#8B95A5] block">
                    User / Actor
                  </label>
                  <div className="flex items-center gap-2.5 p-3 bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] rounded-[12px]">
                    <div className="w-7 h-7 rounded-full bg-[#B28D18]/10 dark:bg-[#C9A52A]/10 text-[#B28D18] dark:text-[#C9A52A] font-bold text-xs flex items-center justify-center">
                      {selectedEvent.actor.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-[#17202A] dark:text-[#F2F4F7]">{selectedEvent.actor.name}</p>
                      {selectedEvent.actor.email && <p className="text-[11px] text-[#667085] dark:text-[#8B95A5]">{selectedEvent.actor.email}</p>}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#667085] dark:text-[#8B95A5] block">
                    Activity Context
                  </label>
                  <div className="p-3.5 bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] rounded-[12px] text-[13px] text-[#17202A] dark:text-[#F2F4F7] font-medium leading-relaxed">
                    {selectedEvent.details}
                  </div>
                </div>

                <div className="p-3 bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] rounded-[12px] space-y-1">
                  <span className="text-[11px] font-bold uppercase text-[#667085] dark:text-[#8B95A5] block">Time</span>
                  <span className="font-semibold text-[13px] text-[#17202A] dark:text-[#F2F4F7]">
                    {formatRelativeTime(selectedEvent.createdAt)}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-[#E5E7EB] dark:border-[#272D36] flex justify-end">
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="px-4 py-2 bg-[#B28D18] dark:bg-[#C9A52A] text-white dark:text-[#0B0D10] text-[12.5px] font-bold rounded-[10px] cursor-pointer"
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
