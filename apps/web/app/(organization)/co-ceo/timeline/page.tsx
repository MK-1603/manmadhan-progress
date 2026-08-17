"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  History, Search, Loader2, AlertCircle, Folder, CheckSquare, Users, CheckCircle2,
  Zap, Clock, User, X, ShieldCheck, RefreshCw, ChevronRight, SlidersHorizontal, ArrowLeft, ExternalLink
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { useSocket } from "@/components/providers/socket-provider";
import { useRegisterRefresh } from "@/components/providers/global-refresh-provider";
import Link from "next/link";
import { TaskAssignmentModal } from "@/components/tasks/task-assignment-modal";
import { ProjectAssignmentModal } from "@/components/organization/project-assignment-modal";

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
  metadata?: any;
  taskId?: string;
  projectId?: string;
}

function normalizeTitle(rawType?: string): string {
  if (!rawType) return "SYSTEM EVENT";
  const upper = rawType.toUpperCase();
  switch (upper) {
    case "PROJECT_CREATED": return "PROJECT CREATED";
    case "PROJECT_UPDATED": return "PROJECT UPDATED";
    case "PROJECT_ASSIGNED": return "PROJECT ASSIGNED";
    case "PROJECT_DELETED": return "PROJECT DELETED";
    case "TASK_CREATED": return "TASK CREATED";
    case "TASK_ASSIGNED": return "TASK ASSIGNED";
    case "TASK_ACCEPTED": return "TASK ACCEPTED";
    case "TASK_STARTED": return "TASK STARTED";
    case "TASK_PAUSED": return "TASK PAUSED";
    case "TASK_RESUMED": return "TASK RESUMED";
    case "TASK_COMPLETED": return "TASK COMPLETED";
    case "TASK_SUBMITTED": return "APPROVAL SUBMITTED";
    case "TASK_APPROVED":
    case "WORK_APPROVED": return "WORK APPROVED";
    case "TASK_REJECTED":
    case "WORK_REJECTED": return "CHANGES REQUESTED";
    case "TASK_OVERDUE": return "TASK OVERDUE";
    case "TASK_DEADLINE_CHANGED": return "DEADLINE CHANGED";
    case "MEMBER_JOINED":
    case "PEOPLE_INVITED":
    case "INVITATION_SENT": return "MEMBER INVITED";
    case "INVITATION_ACCEPTED": return "MEMBER JOINED";
    case "APPROVAL_REQUESTED":
    case "APPROVAL_SUBMITTED": return "APPROVAL SUBMITTED";
    case "APPROVAL_APPROVED": return "APPROVAL APPROVED";
    case "APPROVAL_REJECTED": return "APPROVAL REJECTED";
    case "AUTOMATION_CREATED": return "AUTOMATION CREATED";
    case "AUTOMATION_ACTIVATED": return "AUTOMATION ACTIVATED";
    case "AUTOMATION_PAUSED": return "AUTOMATION PAUSED";
    case "AUTOMATION_EXECUTED": return "AUTOMATION EXECUTED";
    default: {
      return upper.replace(/_/g, " ");
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

function timeAgo(dateString?: string): string {
  if (!dateString) return "just now";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "just now";

  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function formatEventDateGroup(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yestStart = new Date(todayStart.getTime() - 86400000);
  const weekStart = new Date(todayStart.getTime() - 7 * 86400000);

  if (d >= todayStart) return "TODAY";
  if (d >= yestStart && d < todayStart) return "YESTERDAY";
  if (d >= weekStart && d < yestStart) return "EARLIER THIS WEEK";
  return "OLDER";
}

const categoryIcon = (cat: string) => {
  switch (cat) {
    case "Projects": return <Folder className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
    case "Tasks": return <CheckSquare className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
    case "People": return <Users className="w-3.5 h-3.5 text-purple-500 shrink-0" />;
    case "Approvals": return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
    case "Automation": return <Zap className="w-3.5 h-3.5 text-[#B28D18] dark:text-[#C9A52A] shrink-0" />;
    default: return <ShieldCheck className="w-3.5 h-3.5 text-[#667085] dark:text-[#8B95A5] shrink-0" />;
  }
};

const categoryBadgeClass = (cat: string) => {
  switch (cat) {
    case "Projects": return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    case "Tasks": return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    case "People": return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
    case "Approvals": return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    case "Automation": return "bg-[#B28D18]/10 text-[#B28D18] dark:text-[#C9A52A] border-[#B28D18]/20";
    default: return "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20";
  }
};

export default function CoCeoTimelinePage() {
  const { socket, isConnected } = useSocket();
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

  // Modal / Sheet states
  const [selectedEvent, setSelectedEvent] = useState<NormalizedActivity | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

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
          taskId: ev.taskId || ev.metadata?.taskId,
          projectId: ev.projectId || ev.metadata?.projectId,
        }));

        setEvents(normalized);
        if (res.data.data.summary) setSummary(res.data.data.summary);
        setError("");
      } else {
        setError(res.data?.error || "Unable to load execution ledger history.");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Unable to load execution history.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [categoryFilter, dateRangeFilter, search]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  useRegisterRefresh(fetchTimeline);

  // Realtime Socket Activity Insertion without full page reload
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
        taskId: raw.taskId || raw.metadata?.taskId,
        projectId: raw.projectId || raw.metadata?.projectId,
      };

      setEvents((prev) => [normalized, ...prev.slice(0, 199)]);
      setSummary((prev: any) => ({
        ...prev,
        todayCount: (prev.todayCount || 0) + 1,
      }));
    };

    socket.on("activity.created", handleActivity);
    socket.on("audit.created", handleActivity);
    socket.on("task.created", handleActivity);
    socket.on("task.updated", handleActivity);
    socket.on("project.created", handleActivity);
    socket.on("approval.updated", handleActivity);

    return () => {
      socket.off("activity.created", handleActivity);
      socket.off("audit.created", handleActivity);
      socket.off("task.created", handleActivity);
      socket.off("task.updated", handleActivity);
      socket.off("project.created", handleActivity);
      socket.off("approval.updated", handleActivity);
    };
  }, [socket]);

  const handleManualRefresh = () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    fetchTimeline();
  };

  const groupedEvents = useMemo(() => {
    return events.reduce((acc: Record<string, NormalizedActivity[]>, ev) => {
      const groupKey = formatEventDateGroup(ev.createdAt);
      if (!acc[groupKey]) acc[groupKey] = [];
      acc[groupKey].push(ev);
      return acc;
    }, {});
  }, [events]);

  const socketStatusLabel = isConnected ? "LIVE" : socket ? "RECONNECTING" : "OFFLINE";

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-20 sm:pb-12 max-w-[1440px] mx-auto w-full space-y-5 text-xs">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1 border-b border-[#E5E7EB] dark:border-[#272D36]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-[#B28D18] dark:text-[#C9A52A] uppercase tracking-wider">
              MANMADHAN · EXECUTION LEDGER
            </span>
          </div>
          <h1 className="text-[24px] sm:text-[26px] font-extrabold text-[#17202A] dark:text-[#F2F4F7] tracking-tight flex items-center gap-2.5">
            <History className="w-6 h-6 text-[#B28D18] dark:text-[#C9A52A]" />
            <span>Timeline</span>
          </h1>
          <p className="text-[12px] text-[#667085] dark:text-[#8B95A5] mt-1">
            Real-time organization execution history and audit log.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
          {/* Socket Connection Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] text-[11px] font-bold">
            <span className={`w-2 h-2 rounded-full ${
              isConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
            }`} />
            <span className="text-[#17202A] dark:text-[#F2F4F7] uppercase tracking-wider font-mono">
              {socketStatusLabel}
            </span>
          </div>

          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="flex items-center justify-center w-[38px] h-[38px] rounded-[10px] bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] text-[#17202A] dark:text-[#F2F4F7] hover:border-[#B28D18] dark:hover:border-[#C9A52A] transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh Timeline"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-[#B28D18] dark:text-[#C9A52A]" : ""}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-[12px] text-rose-600 dark:text-rose-400 text-[12.5px] font-semibold flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={fetchTimeline} className="underline text-[11.5px]">Retry</button>
        </div>
      )}

      {/* ── KPI Metric Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "TODAY", val: summary.todayCount || 0, sub: "events logged" },
          { label: "PROJECTS", val: summary.projectsCount || 0, sub: "project actions" },
          { label: "TASKS", val: summary.tasksCount || 0, sub: "task actions" },
          { label: "PEOPLE", val: summary.peopleCount || 0, sub: "member events" },
          { label: "APPROVALS", val: summary.approvalsCount || 0, sub: "decisions" },
          { label: "AUTOMATION", val: summary.automationCount || 0, sub: "executions" },
        ].map((item) => (
          <div key={item.label} className="p-3.5 rounded-[14px] bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] shadow-xs">
            <span className="text-[10px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider block">
              {item.label}
            </span>
            <p className="text-[24px] font-extrabold text-[#17202A] dark:text-[#F2F4F7] font-mono leading-none mt-1.5">
              {loading ? <Loader2 className="w-4 h-4 animate-spin text-[#B28D18]" /> : item.val}
            </p>
            <p className="text-[10.5px] text-[#667085] dark:text-[#8B95A5] mt-1 truncate">{item.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Filter Bar ── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#667085] dark:text-[#8B95A5]" />
          <input
            type="text"
            placeholder="Search activity by title, actor, or details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 h-[38px] bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] rounded-[10px] text-[12.5px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#B28D18]"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1 bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] p-1 rounded-[10px] overflow-x-auto shrink-0 [scrollbar-width:none]">
          {["All", "Projects", "Tasks", "People", "Approvals", "Automation"].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`h-[30px] px-3 rounded-[7px] text-[11.5px] font-bold transition-colors cursor-pointer shrink-0 ${
                categoryFilter === cat
                  ? "bg-[#B28D18] dark:bg-[#C9A52A] text-white dark:text-[#0B0D10]"
                  : "text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Time Range Selector */}
        <select
          value={dateRangeFilter}
          onChange={(e) => setDateRangeFilter(e.target.value)}
          className="h-[38px] px-3 bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] rounded-[10px] text-[12px] font-bold text-[#17202A] dark:text-[#F2F4F7] outline-none cursor-pointer shrink-0"
        >
          <option value="All">All Time</option>
          <option value="Today">Today</option>
          <option value="Yesterday">Yesterday</option>
          <option value="Last 7 days">Last 7 days</option>
          <option value="Last 30 days">Last 30 days</option>
        </select>
      </div>

      {/* ── Chronological Event List ── */}
      {loading ? (
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 rounded-[12px] bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] animate-pulse h-16" />
          ))}
        </div>
      ) : Object.keys(groupedEvents).length === 0 ? (
        <div className="p-12 text-center bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] rounded-[16px] space-y-2">
          <Clock className="w-8 h-8 text-[#667085]/40 mx-auto" />
          <h3 className="text-[14px] font-bold text-[#17202A] dark:text-[#F2F4F7]">No activity yet</h3>
          <p className="text-[12px] text-[#667085] dark:text-[#8B95A5] max-w-sm mx-auto">
            Organization execution history will appear here as work happens.
          </p>
        </div>
      ) : (
        <div className="space-y-6 pt-1">
          {Object.entries(groupedEvents).map(([groupTitle, groupItems]) => (
            <div key={groupTitle} className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#B28D18] dark:text-[#C9A52A]">
                  {groupTitle}
                </span>
                <div className="flex-1 h-px bg-[#E5E7EB] dark:bg-[#272D36]" />
              </div>

              <div className="divide-y divide-[#E5E7EB] dark:divide-[#272D36] bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] rounded-[16px] overflow-hidden shadow-xs">
                {groupItems.map((ev) => (
                  <div
                    key={ev.id}
                    onClick={() => setSelectedEvent(ev)}
                    className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F8F9FA] dark:hover:bg-[#111419]/60 transition-colors cursor-pointer"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {categoryIcon(ev.category)}
                        <span className="text-[12.5px] font-bold text-[#17202A] dark:text-[#F2F4F7]">
                          {ev.title}
                        </span>
                        <span className={`px-2 py-0.2 rounded text-[9.5px] font-extrabold uppercase border ${categoryBadgeClass(ev.category)}`}>
                          {ev.category}
                        </span>
                      </div>
                      <p className="text-[12px] text-[#667085] dark:text-[#8B95A5] line-clamp-1">
                        {ev.details}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-[#667085] dark:text-[#8B95A5] shrink-0 font-medium">
                      <span>{ev.actor.name}</span>
                      <span>·</span>
                      <span>{timeAgo(ev.createdAt)}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (ev.taskId) setSelectedTaskId(ev.taskId);
                          else if (ev.projectId) setSelectedProjectId(ev.projectId);
                          else setSelectedEvent(ev);
                        }}
                        className="px-2.5 py-1 rounded-[7px] bg-[#F8F9FA] dark:bg-[#111419] border border-[#E5E7EB] dark:border-[#272D36] text-[11px] font-bold text-[#B28D18] dark:text-[#C9A52A] hover:border-[#B28D18] transition-colors"
                      >
                        Open
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Event Detail Modal / Sheet ── */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] rounded-[16px] max-w-lg w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] dark:border-[#272D36] pb-3">
              <div className="flex items-center gap-2">
                {categoryIcon(selectedEvent.category)}
                <h3 className="text-[15px] font-bold text-[#17202A] dark:text-[#F2F4F7]">
                  {selectedEvent.title}
                </h3>
              </div>
              <button onClick={() => setSelectedEvent(null)} className="p-1 text-[#667085]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-[12px]">
              <div className="p-3 bg-[#F8F9FA] dark:bg-[#111419] rounded-[10px] space-y-1">
                <span className="text-[10px] font-bold text-[#667085] uppercase tracking-wider block">Description / Context</span>
                <p className="text-[#17202A] dark:text-[#F2F4F7] leading-relaxed">{selectedEvent.details}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 p-3 bg-[#F8F9FA] dark:bg-[#111419] rounded-[10px]">
                <div>
                  <span className="text-[10px] font-bold text-[#667085] uppercase tracking-wider block">Actor</span>
                  <p className="font-semibold text-[#17202A] dark:text-[#F2F4F7]">{selectedEvent.actor.name}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#667085] uppercase tracking-wider block">Time</span>
                  <p className="font-semibold text-[#17202A] dark:text-[#F2F4F7]">{new Date(selectedEvent.createdAt).toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-1.5 rounded-[8px] border border-[#E5E7EB] dark:border-[#272D36] text-[12px] font-bold text-[#17202A] dark:text-[#F2F4F7]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task & Project Assignment Modals */}
      {selectedTaskId && (
        <TaskAssignmentModal
          taskId={selectedTaskId}
          isOpen={Boolean(selectedTaskId)}
          onClose={() => setSelectedTaskId(null)}
          onRefresh={fetchTimeline}
        />
      )}
      {selectedProjectId && (
        <ProjectAssignmentModal
          projectId={selectedProjectId}
          isOpen={Boolean(selectedProjectId)}
          onClose={() => setSelectedProjectId(null)}
          onRefresh={fetchTimeline}
        />
      )}
    </div>
  );
}
