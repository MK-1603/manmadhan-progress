"use client";

import { useState, useEffect, useCallback } from "react";
import { History, Loader2, AlertCircle, RefreshCw, Clock } from "lucide-react";
import apiClient from "@/lib/api-client";
import { PremiumCard } from "@/components/ui/premium-card";
import { motion } from "framer-motion";

/* Event icon based on task status / activity type */
const eventIcon = (type: string, status?: string) => {
  if (status === "Approved" || status === "Completed") return "✅";
  if (status === "Review") return "📤";
  if (status === "In Progress" || status === "Accepted") return "▶️";
  if (status === "Assigned") return "📋";
  if (status === "Blocked") return "🚫";
  if (type?.includes("APPROVED")) return "✅";
  if (type?.includes("REJECTED") || type?.includes("CHANGES")) return "🔄";
  if (type?.includes("SUBMITTED") || type?.includes("REVIEW")) return "📤";
  if (type?.includes("STARTED") || type?.includes("IN_PROGRESS")) return "▶️";
  if (type?.includes("ASSIGNED")) return "📋";
  if (type?.includes("FOCUS_START")) return "🎯";
  if (type?.includes("FOCUS_END") || type?.includes("FOCUS_STOP")) return "⏹️";
  if (type?.includes("EXTENSION_APPROVED")) return "📅";
  if (type?.includes("EXTENSION_REJECTED")) return "❌";
  if (type?.includes("LEAVE_APPROVED")) return "🌴";
  if (type?.includes("LOGIN")) return "🔑";
  if (type?.includes("CREATED")) return "➕";
  return "📌";
};

const eventBorder = (type: string, status?: string) => {
  if (status === "Approved" || status === "Completed"
    || type?.includes("APPROVED") || type?.includes("SUCCESS")) return "border-l-emerald-500";
  if (status === "Blocked" || type?.includes("REJECTED") || type?.includes("CHANGES")) return "border-l-rose-500";
  if (status === "Review" || type?.includes("SUBMITTED") || type?.includes("REVIEW")) return "border-l-purple-500";
  if (status === "In Progress" || type?.includes("STARTED")) return "border-l-amber-500";
  if (type?.includes("ASSIGNED") || status === "Assigned") return "border-l-blue-500";
  return "border-l-border";
};

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60)    return "just now";
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/* Build a personal timeline from task data — no audit endpoint needed */
function buildTimeline(tasks: any[]): any[] {
  const events: any[] = [];

  for (const task of tasks) {
    /* Task assigned/created */
    events.push({
      id: `${task.id}_created`,
      type: "TASK_ASSIGNED",
      status: "Assigned",
      title: task.title,
      detail: `Task assigned${task.projectName ? ` in ${task.projectName}` : ""}`,
      date: task.createdAt,
    });

    /* Submission */
    if (task.submittedAt) {
      events.push({
        id: `${task.id}_submitted`,
        type: "TASK_SUBMITTED",
        status: "Review",
        title: task.title,
        detail: "Work submitted for review",
        date: task.submittedAt,
      });
    }

    /* Approved */
    if (task.approvedAt || ["Approved","Completed"].includes(task.status)) {
      events.push({
        id: `${task.id}_approved`,
        type: "TASK_APPROVED",
        status: "Approved",
        title: task.title,
        detail: "Task approved",
        date: task.approvedAt || task.completedAt || task.submittedAt || task.createdAt,
      });
    }

    /* Changes requested (rejection feedback present but not yet re-submitted) */
    if (task.rejectionFeedback && task.status === "In Progress") {
      events.push({
        id: `${task.id}_changes`,
        type: "CHANGES_REQUESTED",
        status: "Blocked",
        title: task.title,
        detail: `Changes requested: "${task.rejectionFeedback}"`,
        date: task.updatedAt || task.createdAt,
      });
    }
  }

  /* Sort newest first */
  return events
    .filter(e => e.date)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

const FILTERS = ["All", "Assignments", "Submissions", "Approvals", "Changes"];

export default function MemberTimelinePage() {
  const [tasks, setTasks]       = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [filter, setFilter]     = useState("All");

  const fetchTasks = useCallback(async () => {
    try {
      const wid = localStorage.getItem("workspaceId");
      if (!wid) return;
      const res = await apiClient.get(`/org/tasks?workspaceId=${wid}`);
      if (res.data.success) setTasks(res.data.data || []);
      else setError(res.data.error || "Failed to load timeline");
    } catch { setError("Unable to load timeline"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const allEvents = buildTimeline(tasks);

  const filterEvents = (evs: any[]) => {
    switch (filter) {
      case "Assignments":  return evs.filter(e => e.type === "TASK_ASSIGNED");
      case "Submissions":  return evs.filter(e => e.type === "TASK_SUBMITTED");
      case "Approvals":    return evs.filter(e => e.type === "TASK_APPROVED");
      case "Changes":      return evs.filter(e => e.type === "CHANGES_REQUESTED");
      default:             return evs;
    }
  };

  const displayed = filterEvents(allEvents);

  return (
    <div className="p-6 lg:p-8 max-w-[900px] mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">MEMBER</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <History className="w-6 h-6 text-emerald-500" /> My Timeline
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your personal execution history — assignments, submissions, and approvals
          </p>
        </div>
        <button onClick={fetchTasks} className="p-2 rounded-lg border border-border hover:bg-accent transition-colors" title="Refresh">
          <RefreshCw className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          <button onClick={fetchTasks} className="ml-auto text-xs hover:underline">Retry</button>
        </div>
      )}

      {/* Filter buttons */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
              filter === f
                ? "bg-emerald-500 text-white border-emerald-500"
                : "bg-card text-muted-foreground border-border hover:text-foreground hover:bg-accent"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Summary */}
      {!loading && allEvents.length > 0 && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span><strong className="text-foreground">{allEvents.filter(e => e.type === "TASK_ASSIGNED").length}</strong> assignments</span>
          <span><strong className="text-foreground">{allEvents.filter(e => e.type === "TASK_SUBMITTED").length}</strong> submissions</span>
          <span><strong className="text-foreground">{allEvents.filter(e => e.type === "TASK_APPROVED").length}</strong> approvals</span>
          {allEvents.filter(e => e.type === "CHANGES_REQUESTED").length > 0 && (
            <span><strong className="text-amber-500">{allEvents.filter(e => e.type === "CHANGES_REQUESTED").length}</strong> changes requested</span>
          )}
        </div>
      )}

      {/* Timeline list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-16">
          <History className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {filter === "All" ? "No activity recorded yet" : `No ${filter.toLowerCase()} events`}
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            {filter === "All" ? "Your task history will appear here." : ""}
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {displayed.map((ev, i) => (
            <motion.div
              key={ev.id}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.02 }}
              className={`pl-4 border-l-2 ${eventBorder(ev.type, ev.status)} ml-3`}
            >
              <div className="flex items-start gap-3 py-3">
                <span className="text-base shrink-0 -ml-6 mt-0.5">{eventIcon(ev.type, ev.status)}</span>
                <div className="flex-1 min-w-0 pb-3 border-b border-border/40 last:border-0 last:pb-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{ev.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{ev.detail}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-muted-foreground">{timeAgo(ev.date)}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                        {new Date(ev.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
