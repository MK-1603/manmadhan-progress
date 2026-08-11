"use client";

import React, { useEffect, useState, useCallback } from "react";
import apiClient from "@/lib/api-client";
import {
  LoaderCircle, History, CheckCircle2, FolderKanban, Target, FileText,
  Clock, GitBranch, Zap, ChevronDown, RefreshCw
} from "lucide-react";

type Filter = "All" | "Projects" | "Tasks" | "Milestones" | "Documents" | "Focus" | "GitHub";

const EVENT_ICONS: Record<string, React.ReactNode> = {
  PROJECT_CREATED: <FolderKanban className="w-4 h-4 text-blue-500" />,
  PROJECT_UPDATED: <FolderKanban className="w-4 h-4 text-blue-400" />,
  PROJECT_COMPLETED: <FolderKanban className="w-4 h-4 text-green-500" />,
  PROJECT_ARCHIVED: <FolderKanban className="w-4 h-4 text-gray-400" />,
  TASK_CREATED: <CheckCircle2 className="w-4 h-4 text-purple-500" />,
  TASK_UPDATED: <CheckCircle2 className="w-4 h-4 text-purple-400" />,
  TASK_COMPLETED: <CheckCircle2 className="w-4 h-4 text-green-500" />,
  TASK_STARTED: <CheckCircle2 className="w-4 h-4 text-amber-500" />,
  MILESTONE_CREATED: <Target className="w-4 h-4 text-indigo-500" />,
  MILESTONE_UPDATED: <Target className="w-4 h-4 text-indigo-400" />,
  MILESTONE_COMPLETED: <Target className="w-4 h-4 text-green-500" />,
  DOCUMENT_CREATED: <FileText className="w-4 h-4 text-orange-500" />,
  DOCUMENT_UPLOADED: <FileText className="w-4 h-4 text-orange-500" />,
  DOCUMENT_UPDATED: <FileText className="w-4 h-4 text-orange-400" />,
  FOCUS_STARTED: <Clock className="w-4 h-4 text-cyan-500" />,
  FOCUS_PAUSED: <Clock className="w-4 h-4 text-cyan-400" />,
  FOCUS_COMPLETED: <Clock className="w-4 h-4 text-green-500" />,
  FOCUS_CANCELLED: <Clock className="w-4 h-4 text-red-400" />,
  GITHUB_CONNECTED: <GitBranch className="w-4 h-4 text-gray-700 dark:text-gray-300" />,
  GITHUB_PR_VERIFIED: <GitBranch className="w-4 h-4 text-green-500" />,
};

const DEFAULT_ICON = <Zap className="w-4 h-4 text-[#D99A00]" />;

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function groupByDate(events: any[]): Record<string, any[]> {
  return events.reduce((acc, ev) => {
    const key = new Date(ev.createdAt).toLocaleDateString(undefined, {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
    if (!acc[key]) acc[key] = [];
    acc[key].push(ev);
    return acc;
  }, {} as Record<string, any[]>);
}

export default function TimelinePage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState<Filter>("All");
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");
  const LIMIT = 50;

  const fetchTimeline = useCallback(async (reset = false) => {
    const currentOffset = reset ? 0 : offset;
    if (reset) setLoading(true); else setLoadingMore(true);
    setError("");
    try {
      const params = new URLSearchParams({
        limit: String(LIMIT),
        offset: String(currentOffset),
        ...(filter !== "All" ? { filter } : {}),
      });
      const res = await apiClient.get(`/personal/timeline?${params}`);
      if (res.data.success) {
        const newEvents = res.data.data;
        setEvents(prev => reset ? newEvents : [...prev, ...newEvents]);
        setHasMore(res.data.pagination?.hasMore || false);
        if (!reset) setOffset(currentOffset + LIMIT);
      }
    } catch (err: any) {
      setError("Failed to load timeline.");
      console.error(err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filter, offset]);

  useEffect(() => {
    setOffset(0);
    fetchTimeline(true);
  }, [filter]);

  const FILTERS: Filter[] = ["All", "Projects", "Tasks", "Milestones", "Documents", "Focus", "GitHub"];
  const grouped = groupByDate(events);

  return (
    <div className="w-full h-full flex flex-col p-4 sm:p-6 lg:p-8 max-w-[800px] mx-auto animate-in fade-in duration-500">

      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] sm:text-[36px] font-bold text-[#171717] dark:text-[#F5F5F5] leading-tight tracking-tight mb-1">Timeline</h1>
          <p className="text-sm text-[#52525B] dark:text-[#A1A1AA]">A real chronological record of your work and progress.</p>
        </div>
        <button onClick={() => fetchTimeline(true)} className="p-2 rounded-xl border border-[#E5E7EB] dark:border-[#242424] text-[#52525B] dark:text-[#A1A1AA] hover:bg-[#F4F4F5] dark:hover:bg-[#1D1D1D] transition-colors self-start sm:self-auto">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2 mb-6">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === f
                ? "bg-[#171717] dark:bg-[#F5F5F5] text-white dark:text-[#080808]"
                : "bg-[#F4F4F5] dark:bg-[#1D1D1D] text-[#52525B] dark:text-[#A1A1AA] hover:bg-[#E5E7EB] dark:hover:bg-[#242424]"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <LoaderCircle className="w-7 h-7 text-[#D99A00] dark:text-[#F5B800] animate-spin" />
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-4 border border-dashed border-[#E5E7EB] dark:border-[#242424] rounded-2xl text-center">
          <History className="w-12 h-12 text-[#A1A1AA] dark:text-[#52525B] mb-4" />
          <h3 className="text-xl font-bold text-[#171717] dark:text-[#F5F5F5] mb-2">No events yet</h3>
          <p className="text-sm text-[#52525B] dark:text-[#A1A1AA] max-w-sm">
            Create a project, complete a task, or start a focus session to begin your timeline.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-8 pb-20">
          {Object.entries(grouped).map(([date, dayEvents]) => (
            <div key={date}>
              {/* Date Header */}
              <div className="sticky top-0 bg-[#F7F7F5] dark:bg-[#080808] py-2 z-10 mb-3">
                <span className="inline-block text-xs font-bold text-[#171717] dark:text-[#F5F5F5] uppercase tracking-widest bg-white dark:bg-[#111111] px-4 py-1.5 rounded-full border border-[#E5E7EB] dark:border-[#242424] shadow-sm">
                  {date}
                </span>
              </div>

              {/* Events */}
              <div className="relative pl-6 border-l-2 border-[#E5E7EB] dark:border-[#242424] ml-4 flex flex-col gap-4">
                {(dayEvents as any[]).map((ev) => (
                  <div key={ev.id} className="relative group">
                    {/* Dot */}
                    <div className="absolute -left-[27px] top-2 w-4 h-4 rounded-full bg-white dark:bg-[#111111] border-2 border-[#E5E7EB] dark:border-[#242424] flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-[#D99A00] dark:bg-[#F5B800]" />
                    </div>

                    <div className="bg-white dark:bg-[#111111] border border-[#E5E7EB] dark:border-[#242424] rounded-xl p-4 hover:shadow-sm transition-shadow">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="mt-0.5 shrink-0">
                            {EVENT_ICONS[ev.eventType] || DEFAULT_ICON}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[#171717] dark:text-[#F5F5F5] leading-snug">
                              {ev.details || ev.eventType.replace(/_/g, " ").toLowerCase()}
                            </p>
                            {(ev.projectName || ev.taskTitle) && (
                              <p className="text-xs text-[#52525B] dark:text-[#A1A1AA] mt-1 truncate">
                                {ev.projectName && <span className="font-medium">{ev.projectName}</span>}
                                {ev.projectName && ev.taskTitle && " · "}
                                {ev.taskTitle}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="text-xs text-[#A1A1AA] shrink-0 font-mono">
                          {timeAgo(ev.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {hasMore && (
            <div className="flex justify-center">
              <button
                onClick={() => fetchTimeline(false)}
                disabled={loadingMore}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#E5E7EB] dark:border-[#242424] text-sm font-medium text-[#52525B] dark:text-[#A1A1AA] hover:bg-[#F4F4F5] dark:hover:bg-[#1D1D1D] transition-colors disabled:opacity-50"
              >
                {loadingMore ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <ChevronDown className="w-4 h-4" />}
                Load more
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
