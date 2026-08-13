"use client";

import React, { useEffect, useState, useCallback } from "react";
import apiClient from "@/lib/api-client";
import {
  History,
  CheckCircle2,
  FolderKanban,
  Target,
  FileText,
  Clock,
  GitBranch,
  Zap,
  ChevronDown,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

type Filter = "All" | "Projects" | "Tasks" | "Milestones" | "Focus";

const EVENT_ICONS: Record<string, React.ReactNode> = {
  PROJECT_CREATED: <FolderKanban className="w-4 h-4 text-blue-500" />,
  PROJECT_UPDATED: <FolderKanban className="w-4 h-4 text-blue-400" />,
  PROJECT_COMPLETED: <FolderKanban className="w-4 h-4 text-emerald-500" />,
  TASK_CREATED: <CheckCircle2 className="w-4 h-4 text-purple-500" />,
  TASK_COMPLETED: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
  MILESTONE_COMPLETED: <Target className="w-4 h-4 text-indigo-500" />,
  FOCUS_COMPLETED: <Clock className="w-4 h-4 text-amber-500" />,
};

const DEFAULT_ICON = <Zap className="w-4 h-4 text-gold" />;

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
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    if (!acc[key]) acc[key] = [];
    acc[key].push(ev);
    return acc;
  }, {} as Record<string, any[]>);
}

export default function TimelinePage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("All");
  const [error, setError] = useState("");

  const fetchTimeline = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        limit: "50",
        ...(filter !== "All" ? { filter } : {}),
      });
      const res = await apiClient.get(`/personal/timeline?${params}`);
      if (res.data?.success && Array.isArray(res.data.data)) {
        setEvents(res.data.data);
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to load timeline events.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  const FILTERS: Filter[] = ["All", "Projects", "Tasks", "Milestones", "Focus"];
  const grouped = groupByDate(events);

  return (
    <div className="w-full min-h-full flex flex-col p-4 sm:p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Timeline</h1>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">
            A real chronological feed of your work events, task completions, and focus activity.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchTimeline()}
          className="p-2 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </header>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
              filter === f
                ? "bg-foreground text-background shadow-xs"
                : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Events Stream */}
      <section className="flex-1 min-h-0">
        {loading ? (
          <div className="py-12 text-center text-xs text-muted-foreground font-medium">
            Loading timeline activity...
          </div>
        ) : events.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-dashed border-border bg-card space-y-2">
            <History className="w-8 h-8 text-muted-foreground mx-auto opacity-50" />
            <p className="text-xs font-bold text-foreground">No activity events recorded yet</p>
            <p className="text-[11px] text-muted-foreground max-w-sm mx-auto font-medium">
              Create a project, complete a task, or log a focus session to see your activity timeline.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([date, dayEvents]) => (
              <div key={date} className="space-y-3">
                <div className="sticky top-0 bg-background/95 backdrop-blur-xs py-2 z-10">
                  <span className="text-[10px] font-bold text-foreground uppercase tracking-widest bg-card border border-border px-3 py-1 rounded-full shadow-xs">
                    {date}
                  </span>
                </div>

                <div className="relative pl-5 sm:pl-6 border-l-2 border-border ml-3 sm:ml-4 space-y-3">
                  {(dayEvents as any[]).map((ev) => (
                    <div key={ev.id} className="relative group">
                      <div className="absolute -left-[27px] sm:-left-[31px] top-3 w-3.5 h-3.5 rounded-full bg-card border-2 border-border flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-gold" />
                      </div>

                      <div className="p-3.5 sm:p-4 rounded-xl bg-card border border-border hover:border-foreground/20 transition-all flex items-start justify-between gap-3 shadow-xs">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="mt-0.5 shrink-0">
                            {EVENT_ICONS[ev.eventType] || DEFAULT_ICON}
                          </div>
                          <div className="min-w-0 space-y-0.5">
                            <p className="text-xs font-bold text-foreground leading-snug">
                              {ev.details || ev.eventType.replace(/_/g, " ").toLowerCase()}
                            </p>
                            {(ev.projectName || ev.taskTitle) && (
                              <p className="text-[11px] text-muted-foreground font-medium truncate">
                                {ev.projectName && <span>{ev.projectName}</span>}
                                {ev.projectName && ev.taskTitle && " • "}
                                {ev.taskTitle}
                              </p>
                            )}
                          </div>
                        </div>

                        <span className="text-[10px] text-muted-foreground font-medium shrink-0">
                          {timeAgo(ev.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
