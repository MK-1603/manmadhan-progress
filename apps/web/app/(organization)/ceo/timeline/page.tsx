"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  History, Search, Loader2, AlertCircle, Folder, CheckSquare, Users, CheckCircle2,
  Zap, Clock, User, X, ShieldCheck, RefreshCw, ChevronRight, SlidersHorizontal
} from "lucide-react";
import Link from "next/link";
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
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
  
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatEventDateGroup(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yestStart = new Date(todayStart.getTime() - 86400000);

  if (d >= todayStart) return "TODAY";
  if (d >= yestStart && d < todayStart) return "YESTERDAY";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }).toUpperCase();
}

const categoryIcon = (cat: string) => {
  switch (cat) {
    case "Projects": return <Folder className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
    case "Tasks": return <CheckSquare className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
    case "People": return <Users className="w-3.5 h-3.5 text-purple-500 shrink-0" />;
    case "Approvals": return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
    case "Automation": return <Zap className="w-3.5 h-3.5 text-[#C9A52A] dark:text-[#D4B12F] shrink-0" />;
    default: return <ShieldCheck className="w-3.5 h-3.5 text-[#667085] dark:text-[#8B95A5] shrink-0" />;
  }
};

const categoryBadgeClass = (cat: string) => {
  switch (cat) {
    case "Projects": return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    case "Tasks": return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    case "People": return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
    case "Approvals": return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    case "Automation": return "bg-[#C9A52A]/10 text-[#C9A52A] dark:text-[#D4B12F] border-[#C9A52A]/20";
    default: return "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20";
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
  
  // Sheet & Modal States
  const [selectedEvent, setSelectedEvent] = useState<NormalizedActivity | null>(null);
  const [showMobileFilterSheet, setShowMobileFilterSheet] = useState(false);

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
        setError(res.data?.error || "Unable to load execution history.");
      }
    } catch (err: any) {
      if (err.code === "ERR_NETWORK" || err.message?.includes("Network Error")) {
        setError("Unable to connect to ManMadhan services.");
      } else {
        setError(err.response?.data?.error?.message || err.response?.data?.error || "Unable to load execution history.");
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

  // Lock body scroll when modal/sheet is open
  useEffect(() => {
    if (selectedEvent || showMobileFilterSheet) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedEvent, showMobileFilterSheet]);

  // Handle Escape key to close modal/sheet
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedEvent(null);
        setShowMobileFilterSheet(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
    <div className="w-full h-full flex flex-col overflow-hidden bg-[#F8F9FB] dark:bg-[#0B0E12] text-[#17202A] dark:text-[#F2F4F7] font-sans select-none">
      
      {/* ========================================================================= */}
      {/* ── DESKTOP FULL-WIDTH WORKSPACE LAYOUT (hidden md:flex) ────────────────── */}
      {/* ========================================================================= */}
      <div className="hidden md:flex flex-col w-full h-full overflow-y-auto bg-[#F8F9FB] dark:bg-[#0B0E12]">
        <div className="w-full min-w-0 px-8 py-6 space-y-5 box-border">
          
          {/* PAGE HEADER */}
          <div className="w-full flex items-center justify-between gap-4 pb-3 border-b border-[#E4E7EC] dark:border-[#272D36]">
            <div>
              <span className="text-[10px] uppercase font-extrabold tracking-widest text-[#C9A52A] dark:text-[#D4B12F]">
                MANMADHAN · EXECUTION LEDGER
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <History className="w-6 h-6 text-[#C9A52A] dark:text-[#D4B12F] shrink-0" />
                <h1 className="text-[28px] font-bold text-[#17202A] dark:text-[#F2F4F7] tracking-tight leading-none">
                  Timeline
                </h1>
              </div>
              <p className="text-[13.5px] text-[#667085] dark:text-[#8B95A5] mt-1 font-medium">
                Organization execution history
              </p>
            </div>

            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="w-[36px] h-[36px] rounded-[10px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7] hover:border-[#C9A52A] flex items-center justify-center cursor-pointer transition-colors shrink-0 shadow-2xs"
              title="Refresh execution ledger"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-[#C9A52A]" : ""}`} />
            </button>
          </div>

          {/* EXECUTIVE SUMMARY UNIFIED SURFACE */}
          <div className="w-full bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[14px] p-3.5 grid grid-cols-6 divide-x divide-[#E4E7EC] dark:divide-[#272D36] shadow-2xs">
            {[
              { label: "TODAY", value: summary.todayCount, sub: "events" },
              { label: "PROJECTS", value: summary.projectsCount, sub: "logged" },
              { label: "TASKS", value: summary.tasksCount, sub: "logged" },
              { label: "PEOPLE", value: summary.peopleCount, sub: "actions" },
              { label: "APPROVALS", value: summary.approvalsCount, sub: "processed" },
              { label: "AUTOMATION", value: summary.automationCount, sub: "runs" },
            ].map((s, idx) => (
              <div key={s.label} className={`px-4 ${idx === 0 ? "pl-2" : ""}`}>
                <p className="text-[10px] uppercase font-bold tracking-wider text-[#667085] dark:text-[#8B95A5]">{s.label}</p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-[20px] font-extrabold text-[#17202A] dark:text-[#F2F4F7] leading-none">{s.value}</span>
                  <span className="text-[11px] font-medium text-[#667085]">{s.sub}</span>
                </div>
              </div>
            ))}
          </div>

          {/* FULL-WIDTH COMMAND TOOLBAR */}
          <div className="w-full flex items-center gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#667085] dark:text-[#8B95A5]" />
              <input
                type="text"
                placeholder="Search activity..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3.5 h-[38px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[10px] text-[12.5px] text-[#17202A] dark:text-[#F2F4F7] placeholder-[#667085] dark:placeholder-[#8B95A5] outline-none focus:border-[#C9A52A]"
              />
            </div>

            <div className="flex items-center gap-1 bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] p-1 rounded-[10px] shrink-0">
              {["All", "Projects", "Tasks", "People", "Approvals", "Automation"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`h-[30px] px-3 rounded-[7px] text-[12px] font-bold transition-all cursor-pointer ${
                    categoryFilter === cat
                      ? "bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] shadow-2xs"
                      : "text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7]"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <select
              value={dateRangeFilter}
              onChange={(e) => setDateRangeFilter(e.target.value)}
              className="h-[38px] px-3 bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[10px] text-[12px] font-bold text-[#17202A] dark:text-[#F2F4F7] outline-none cursor-pointer shrink-0"
            >
              <option value="All">All Time</option>
              <option value="Today">Today</option>
              <option value="Yesterday">Yesterday</option>
            </select>
          </div>

          {/* FULL-WIDTH TIMELINE STREAM & STATES */}
          {error ? (
            <div className="w-full p-8 text-center bg-[#FFFFFF] dark:bg-[#15191F] border border-rose-500/20 rounded-[16px] space-y-3 max-w-md mx-auto my-8 shadow-2xs">
              <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-[15px] font-bold text-[#17202A] dark:text-[#F2F4F7]">Unable to load activity</h3>
                <p className="text-[12.5px] text-[#667085] dark:text-[#8B95A5]">We couldn't retrieve the execution history.</p>
              </div>
              <button onClick={fetchTimeline} className="px-4 h-[36px] bg-[#C9A52A] text-[#0B0D10] rounded-[8px] text-[12.5px] font-bold inline-flex items-center gap-1.5 cursor-pointer">
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            </div>
          ) : loading ? (
            <div className="w-full space-y-3 pt-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="w-full p-4 rounded-[12px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] animate-pulse flex items-center gap-3">
                  <div className="w-7 h-7 rounded-[6px] bg-[#E4E7EC] dark:bg-[#272D36]" />
                  <div className="flex-1 space-y-2">
                    <div className="w-1/4 h-3 bg-[#E4E7EC] dark:bg-[#272D36] rounded" />
                    <div className="w-1/2 h-3.5 bg-[#E4E7EC] dark:bg-[#272D36] rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : Object.keys(groupedEvents).length === 0 ? (
            <div className="w-full p-12 text-center bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[16px] space-y-3.5 my-4 shadow-2xs">
              <div className="w-12 h-12 rounded-full bg-[#C9A52A]/10 text-[#C9A52A] flex items-center justify-center mx-auto border border-[#C9A52A]/20">
                <Clock className="w-6 h-6 stroke-[2]" />
              </div>
              <div className="space-y-1">
                <h3 className="text-[16px] font-bold text-[#17202A] dark:text-[#F2F4F7]">No activity yet</h3>
                <p className="text-[12.5px] text-[#667085] dark:text-[#8B95A5] leading-relaxed max-w-sm mx-auto">
                  Your organization's execution history will appear here as work happens.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-1">
                <Link href="/ceo/projects" className="px-4 h-[34px] rounded-[8px] bg-[#C9A52A] text-[#0B0D10] text-[12px] font-bold inline-flex items-center">View Projects</Link>
                <Link href="/ceo/tasks" className="px-4 h-[34px] rounded-[8px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] text-[12px] font-bold inline-flex items-center">View Tasks</Link>
              </div>
            </div>
          ) : (
            <div className="w-full space-y-6">
              {Object.entries(groupedEvents).map(([dateGroup, groupItems]) => (
                <div key={dateGroup} className="w-full space-y-3">
                  <div className="w-full flex items-center gap-3">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#C9A52A] dark:text-[#D4B12F] px-2 py-0.5 shrink-0">
                      {dateGroup}
                    </span>
                    <div className="flex-1 h-px bg-[#E4E7EC] dark:border-[#272D36]" />
                  </div>

                  <div className="w-full relative pl-5 space-y-2.5 border-l border-[#E4E7EC] dark:border-[#272D36] ml-3">
                    {groupItems.map((ev, i) => (
                      <div
                        key={ev.id || i}
                        onClick={() => setSelectedEvent(ev)}
                        className="w-full p-4 rounded-[12px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] hover:border-[#C9A52A]/60 transition-colors cursor-pointer space-y-1.5 shadow-2xs group relative"
                      >
                        {/* Timeline Marker Dot */}
                        <div className="absolute -left-[27px] top-5 w-2.5 h-2.5 rounded-full bg-[#C9A52A] ring-4 ring-[#F8F9FB] dark:ring-[#0B0E12]" />

                        <div className="w-full flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {categoryIcon(ev.category)}
                            <h4 className="text-[14px] font-bold text-[#17202A] dark:text-[#F2F4F7] group-hover:text-[#C9A52A] transition-colors">
                              {ev.title}
                            </h4>
                          </div>
                          <span className={`text-[9.5px] font-extrabold uppercase px-2.5 py-0.5 rounded border ${categoryBadgeClass(ev.category)}`}>
                            {ev.category}
                          </span>
                        </div>

                        <p className="text-[13px] text-[#17202A] dark:text-[#F2F4F7] font-medium leading-normal">
                          {ev.details}
                        </p>

                        <div className="flex items-center gap-3 text-[11.5px] text-[#667085] dark:text-[#8B95A5] pt-0.5 font-medium">
                          <span className="flex items-center gap-1 font-semibold text-[#17202A] dark:text-[#F2F4F7]">
                            <User className="w-3 h-3 text-[#C9A52A]" /> {ev.actor.name}
                          </span>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {formatRelativeTime(ev.createdAt)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── DESKTOP CENTERED PREMIUM DETAIL MODAL (>= 1024px) ────────────────── */}
        {selectedEvent && (
          <div
            className="hidden lg:flex fixed inset-0 z-[150] items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs font-sans transition-opacity animate-in fade-in duration-150"
            onClick={() => setSelectedEvent(null)}
          >
            <div
              className="w-[560px] max-w-[calc(100vw-80px)] max-h-[80vh] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[18px] shadow-2xl flex flex-col animate-in zoom-in-95 duration-150 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-[#E4E7EC] dark:border-[#272D36] flex items-start justify-between shrink-0">
                <div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[9.5px] font-extrabold uppercase border ${categoryBadgeClass(selectedEvent.category)}`}>
                    {selectedEvent.category}
                  </span>
                  <h3 className="text-[18px] font-bold text-[#17202A] dark:text-[#F2F4F7] tracking-tight leading-snug mt-1.5 flex items-center gap-2">
                    {categoryIcon(selectedEvent.category)}
                    <span>{selectedEvent.title}</span>
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedEvent(null)}
                  className="p-1.5 rounded-full text-[#667085] hover:bg-[#F8F9FB] dark:hover:bg-[#111419] transition-colors cursor-pointer"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 text-[13px]">
                {/* 2-Column Metadata */}
                <div className="grid grid-cols-2 gap-4 p-4 rounded-[12px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36]">
                  <div>
                    <span className="text-[10.5px] uppercase font-bold text-[#667085] block mb-0.5">Actor / User</span>
                    <p className="font-bold text-[#17202A] dark:text-[#F2F4F7]">{selectedEvent.actor.name}</p>
                    {selectedEvent.actor.email && <p className="text-[11.5px] text-[#667085] truncate">{selectedEvent.actor.email}</p>}
                  </div>

                  <div>
                    <span className="text-[10.5px] uppercase font-bold text-[#667085] block mb-0.5">Timestamp</span>
                    <p className="font-bold text-[#17202A] dark:text-[#F2F4F7]">{new Date(selectedEvent.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                    <p className="text-[11.5px] font-mono text-[#667085]">{formatRelativeTime(selectedEvent.createdAt)}</p>
                  </div>
                </div>

                {/* Activity Details / Context */}
                <div className="space-y-1">
                  <span className="text-[11px] uppercase font-bold text-[#667085]">Activity Context</span>
                  <div className="p-4 rounded-[12px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] font-medium text-[#17202A] dark:text-[#F2F4F7] leading-relaxed">
                    {selectedEvent.details}
                  </div>
                </div>

                {/* Category & Status */}
                <div className="grid grid-cols-2 gap-4 p-4 rounded-[12px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36]">
                  <div>
                    <span className="text-[10.5px] uppercase font-bold text-[#667085] block mb-0.5">Category</span>
                    <p className="font-bold text-[#17202A] dark:text-[#F2F4F7]">{selectedEvent.category}</p>
                  </div>
                  <div>
                    <span className="text-[10.5px] uppercase font-bold text-[#667085] block mb-0.5">Event Type</span>
                    <p className="font-mono text-[12px] font-bold text-[#C9A52A]">{selectedEvent.eventType}</p>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-3.5 border-t border-[#E4E7EC] dark:border-[#272D36] bg-[#FFFFFF] dark:bg-[#15191F] flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedEvent(null)}
                  className="h-[36px] px-4 rounded-[8px] border border-[#E4E7EC] dark:border-[#272D36] text-[12.5px] font-bold text-[#667085] hover:bg-[#F8F9FB] dark:hover:bg-[#111419] transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>


      {/* ========================================================================= */}
      {/* ── MOBILE BREAKPOINT LAYOUT (flex md:hidden) - 100% UNTOUCHED ──────────── */}
      {/* ========================================================================= */}
      <div className="flex md:hidden flex-col w-full h-[100dvh] overflow-hidden bg-[#F8F9FB] dark:bg-[#0B0E12] relative pb-[76px]">
        
        {/* MOBILE PAGE HEADER */}
        <div className="shrink-0 px-4 py-2 bg-[#FFFFFF] dark:bg-[#15191F] border-b border-[#E4E7EC] dark:border-[#272D36] flex items-center justify-between">
          <div>
            <h1 className="text-[20px] font-bold text-[#17202A] dark:text-[#F2F4F7] tracking-tight leading-none flex items-center gap-1.5">
              <History className="w-4.5 h-4.5 text-[#C9A52A] dark:text-[#D4B12F] shrink-0" />
              <span>Timeline</span>
            </h1>
            <p className="text-[11.5px] text-[#667085] dark:text-[#8B95A5] font-medium mt-0.5">
              Organization execution history.
            </p>
          </div>

          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="w-[32px] h-[32px] rounded-[8px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] text-[#667085] flex items-center justify-center"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#C9A52A]" : ""}`} />
          </button>
        </div>

        {/* MOBILE SUMMARY UNIFIED SURFACE (2 Rows × 3 Cols) */}
        <div className="shrink-0 p-3 bg-[#FFFFFF] dark:bg-[#15191F] border-b border-[#E4E7EC] dark:border-[#272D36] grid grid-cols-3 gap-2">
          {[
            { label: "Today", value: summary.todayCount },
            { label: "Projects", value: summary.projectsCount },
            { label: "Tasks", value: summary.tasksCount },
            { label: "People", value: summary.peopleCount },
            { label: "Approvals", value: summary.approvalsCount },
            { label: "Automation", value: summary.automationCount },
          ].map((s) => (
            <div key={s.label} className="p-2 rounded-[8px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] text-center">
              <p className="text-[9.5px] uppercase font-bold tracking-wider text-[#667085]">{s.label}</p>
              <p className="text-[15px] font-extrabold leading-none mt-0.5 text-[#17202A] dark:text-[#F2F4F7]">{s.value}</p>
            </div>
          ))}
        </div>

        {/* MOBILE SEARCH & FILTER BAR */}
        <div className="shrink-0 px-3 py-2 bg-[#FFFFFF] dark:bg-[#15191F] border-b border-[#E4E7EC] dark:border-[#272D36] space-y-2">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#667085]" />
            <input
              type="text"
              placeholder="Search activity..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-7 pr-3 h-[32px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] rounded-[6px] text-[11.5px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#C9A52A]"
            />
          </div>

          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none]">
              {["All", "Projects", "Tasks", "People", "Approvals"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-[5px] text-[10.5px] font-bold shrink-0 capitalize ${
                    categoryFilter === cat
                      ? "bg-[#C9A52A] text-[#0B0D10]"
                      : "bg-[#F8F9FB] dark:bg-[#111419] text-[#667085]"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowMobileFilterSheet(true)}
              className="p-1 rounded bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] text-[#667085] shrink-0"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* MOBILE STREAM CONTAINER */}
        <div className="flex-1 min-h-0 px-3 py-2.5 overflow-y-auto bg-[#FFFFFF] dark:bg-[#15191F]">
          {error ? (
            <div className="p-4 text-center bg-[#FFFFFF] dark:bg-[#15191F] border border-rose-500/20 rounded-[10px] my-auto space-y-1.5">
              <AlertCircle className="w-6 h-6 text-rose-500 mx-auto" />
              <h4 className="text-[12.5px] font-bold">Unable to load activity</h4>
              <p className="text-[11px] text-[#667085]">We couldn't retrieve the execution history.</p>
              <button onClick={fetchTimeline} className="px-3 py-1 rounded bg-[#C9A52A] text-[#0B0D10] text-[11px] font-bold">Retry</button>
            </div>
          ) : loading ? (
            <div className="my-auto text-center py-8">
              <Loader2 className="w-6 h-6 text-[#C9A52A] animate-spin mx-auto" />
            </div>
          ) : Object.keys(groupedEvents).length === 0 ? (
            <div className="py-12 text-center space-y-2.5">
              <Clock className="w-8 h-8 text-[#C9A52A] mx-auto" />
              <h4 className="text-[14px] font-bold text-[#17202A] dark:text-[#F2F4F7]">No activity yet</h4>
              <p className="text-[11.5px] text-[#667085] max-w-xs mx-auto">
                Real organization activity will appear here as work happens.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedEvents).map(([dateGroup, groupItems]) => (
                <div key={dateGroup} className="space-y-2">
                  <div className="text-[10px] font-extrabold uppercase text-[#C9A52A] tracking-wider pb-1 border-b border-[#E4E7EC] dark:border-[#272D36]">
                    {dateGroup}
                  </div>

                  <div className="space-y-2">
                    {groupItems.map((ev, i) => (
                      <div
                        key={ev.id || i}
                        onClick={() => setSelectedEvent(ev)}
                        className="p-3 rounded-[10px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] space-y-1 cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${categoryBadgeClass(ev.category)}`}>
                            {ev.category}
                          </span>
                          <span className="text-[10.5px] font-mono text-[#667085]">{formatRelativeTime(ev.createdAt)}</span>
                        </div>

                        <h4 className="text-[12.5px] font-bold text-[#17202A] dark:text-[#F2F4F7]">{ev.title}</h4>
                        <p className="text-[11.5px] text-[#667085] truncate">{ev.details}</p>

                        <div className="text-[10.5px] font-semibold text-[#17202A] dark:text-[#F2F4F7] pt-1 flex items-center justify-between border-t border-[#E4E7EC]/60 dark:border-[#272D36]/60">
                          <span>{ev.actor.name}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-[#667085]" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* MOBILE NATIVE BOTTOM SHEET FOR EVENT DETAILS (< 1024px) */}
        {selectedEvent && (
          <div
            className="lg:hidden fixed inset-0 z-[140] flex flex-col justify-end bg-black/40 backdrop-blur-xs font-sans transition-opacity animate-in fade-in duration-150"
            onClick={() => setSelectedEvent(null)}
          >
            <div
              className="w-full max-h-[75vh] min-h-[40vh] bg-[#FFFFFF] dark:bg-[#15191F] border-t border-[#E4E7EC] dark:border-[#272D36] rounded-t-[24px] shadow-2xl p-4 flex flex-col animate-in slide-in-from-bottom duration-200 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-[#E4E7EC] dark:bg-[#272D36] rounded-full mx-auto shrink-0 mb-3" />

              <div className="flex items-center justify-between pb-3 border-b border-[#E4E7EC] dark:border-[#272D36] shrink-0">
                <div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${categoryBadgeClass(selectedEvent.category)}`}>
                    {selectedEvent.category} Event
                  </span>
                  <h3 className="text-[16px] font-bold text-[#17202A] dark:text-[#F2F4F7] mt-1">
                    {selectedEvent.title}
                  </h3>
                </div>
                <button type="button" onClick={() => setSelectedEvent(null)} className="p-1 rounded-full text-[#667085]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-3 space-y-3">
                <div className="p-3 bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] rounded-[12px] space-y-1">
                  <span className="text-[10.5px] uppercase font-bold text-[#667085]">Actor</span>
                  <p className="text-[13px] font-bold text-[#17202A] dark:text-[#F2F4F7]">{selectedEvent.actor.name}</p>
                  {selectedEvent.actor.email && <p className="text-[11px] text-[#667085]">{selectedEvent.actor.email}</p>}
                </div>

                <div className="p-3 bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] rounded-[12px] space-y-1">
                  <span className="text-[10.5px] uppercase font-bold text-[#667085]">Details</span>
                  <p className="text-[12.5px] font-medium text-[#17202A] dark:text-[#F2F4F7] leading-relaxed">{selectedEvent.details}</p>
                </div>

                <div className="p-3 bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] rounded-[12px] space-y-1">
                  <span className="text-[10.5px] uppercase font-bold text-[#667085]">Timestamp</span>
                  <p className="text-[12px] font-mono text-[#17202A] dark:text-[#F2F4F7]">{new Date(selectedEvent.createdAt).toLocaleString()}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-[#E4E7EC] dark:border-[#272D36]">
                <button
                  type="button"
                  onClick={() => setSelectedEvent(null)}
                  className="w-full h-[40px] rounded-[10px] bg-[#C9A52A] text-[#0B0D10] text-[12.5px] font-bold"
                >
                  Close Details
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MOBILE FILTER BOTTOM SHEET */}
        {showMobileFilterSheet && (
          <div
            className="md:hidden fixed inset-0 z-[150] flex flex-col justify-end bg-black/40 backdrop-blur-xs font-sans transition-opacity animate-in fade-in duration-150"
            onClick={() => setShowMobileFilterSheet(false)}
          >
            <div
              className="w-full bg-[#FFFFFF] dark:bg-[#15191F] border-t border-[#E4E7EC] dark:border-[#272D36] rounded-t-[24px] shadow-2xl p-4 flex flex-col animate-in slide-in-from-bottom duration-200 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-[#E4E7EC] dark:bg-[#272D36] rounded-full mx-auto shrink-0" />
              <div className="flex items-center justify-between pb-2 border-b border-[#E4E7EC] dark:border-[#272D36]">
                <h3 className="text-[15px] font-bold text-[#17202A] dark:text-[#F2F4F7]">Filter Activity</h3>
                <button type="button" onClick={() => setShowMobileFilterSheet(false)} className="p-1 rounded-full text-[#667085]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-[12px]">
                <div>
                  <label className="font-bold text-[#667085] block mb-1.5">Category</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {["All", "Projects", "Tasks", "People", "Approvals", "Automation"].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => { setCategoryFilter(cat); setShowMobileFilterSheet(false); }}
                        className={`py-1.5 rounded-[6px] font-bold text-center border ${categoryFilter === cat ? "bg-[#C9A52A] text-[#0B0D10] border-[#C9A52A]" : "bg-[#F8F9FB] dark:bg-[#111419] border-[#E4E7EC] dark:border-[#272D36] text-[#667085]"}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="font-bold text-[#667085] block mb-1.5">Time Period</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {["All", "Today", "Yesterday"].map((tr) => (
                      <button
                        key={tr}
                        type="button"
                        onClick={() => { setDateRangeFilter(tr); setShowMobileFilterSheet(false); }}
                        className={`py-1.5 rounded-[6px] font-bold text-center border ${dateRangeFilter === tr ? "bg-[#C9A52A] text-[#0B0D10] border-[#C9A52A]" : "bg-[#F8F9FB] dark:bg-[#111419] border-[#E4E7EC] dark:border-[#272D36] text-[#667085]"}`}
                      >
                        {tr === "All" ? "All Time" : tr}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
