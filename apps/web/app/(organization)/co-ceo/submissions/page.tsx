"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ClipboardCheck, Loader2, AlertCircle, CheckCircle2, XCircle,
  MessageSquare, Clock, User, ChevronDown, ChevronUp, RefreshCw
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { PremiumCard } from "@/components/ui/premium-card";
import { useSocket } from "@/components/providers/socket-provider";
import { motion, AnimatePresence } from "framer-motion";

type Tab = "pending" | "approved" | "rejected" | "changes";

const statusColor = (s: string) => {
  const m: Record<string, string> = {
    "Review": "text-purple-500 bg-purple-500/10 border-purple-500/20",
    "Approved": "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    "In Progress": "text-amber-500 bg-amber-500/10 border-amber-500/20",
    "Rejected": "text-rose-500 bg-rose-500/10 border-rose-500/20",
  };
  return m[s] || "text-muted-foreground bg-muted border-border";
};

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function isOverdue(deadline: string | null) {
  if (!deadline) return false;
  return new Date(deadline) < new Date();
}

export default function CoCeoSubmissionsPage() {
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("pending");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { socket } = useSocket();

  const fetchTasks = useCallback(async () => {
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      if (!workspaceId) return;
      const res = await apiClient.get(`/org/approvals?workspaceId=${workspaceId}`);
      if (res.data.success) {
        setAllTasks(res.data.data.tasks || []);
      }
    } catch {
      setError("Unable to load submissions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  useEffect(() => {
    if (!socket) return;
    socket.on("approval.updated", fetchTasks);
    socket.on("task.updated", fetchTasks);
    return () => { socket.off("approval.updated"); socket.off("task.updated"); };
  }, [socket, fetchTasks]);

  const handleApprove = async (taskId: string) => {
    setActionLoading(taskId + "_approve");
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      const res = await apiClient.post(`/org/approvals/tasks/${taskId}/approve`, {
        workspaceId,
        feedback: feedback[taskId] || "",
      });
      if (res.data.success) {
        setExpanded(null);
        setFeedback(prev => { const n = { ...prev }; delete n[taskId]; return n; });
        fetchTasks();
      } else {
        setError(res.data.error || "Failed to approve");
      }
    } catch (e: any) {
      setError(e.message || "Failed to approve");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (taskId: string) => {
    const reason = feedback[taskId]?.trim();
    if (!reason) { setError("Rejection requires a reason"); return; }
    setActionLoading(taskId + "_reject");
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      const res = await apiClient.post(`/org/approvals/tasks/${taskId}/reject`, {
        workspaceId,
        feedback: reason,
      });
      if (res.data.success) {
        setExpanded(null);
        setFeedback(prev => { const n = { ...prev }; delete n[taskId]; return n; });
        fetchTasks();
      } else {
        setError(res.data.error || "Failed to reject");
      }
    } catch (e: any) {
      setError(e.message || "Failed to reject");
    } finally {
      setActionLoading(null);
    }
  };

  // Classify tasks by tab
  const pending = allTasks.filter(t => t.status === "Review");
  const approved = allTasks.filter(t => t.status === "Approved");
  const rejected = allTasks.filter(t => t.status === "In Progress" && t.rejectionFeedback);

  const tabItems: Record<Tab, any[]> = {
    pending,
    approved,
    rejected,
    changes: rejected,
  };

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "pending", label: "Pending Review", count: pending.length },
    { id: "approved", label: "Approved", count: approved.length },
    { id: "rejected", label: "Rejected", count: rejected.length },
    { id: "changes", label: "Changes Requested", count: rejected.length },
  ];

  const displayTasks = tab === "pending" ? pending : tab === "approved" ? approved : rejected;

  return (
    <div className="p-6 lg:p-8 max-w-[1200px] mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-purple-500" /> Submissions
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review and act on submitted work from your team members
          </p>
        </div>
        <button
          onClick={fetchTasks}
          className="p-2 rounded-lg border border-border hover:bg-accent transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
          <button onClick={() => setError("")} className="ml-auto text-xs hover:underline">Dismiss</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-0.5 border-b border-border overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
              tab === t.id
                ? "border-purple-500 text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                t.id === "pending"
                  ? "bg-purple-500/10 text-purple-500"
                  : "bg-muted text-muted-foreground"
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : displayTasks.length === 0 ? (
        <div className="text-center py-16">
          <ClipboardCheck className="w-10 h-10 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-sm font-medium text-muted-foreground">
            {tab === "pending" ? "No submissions awaiting review" : `No ${tab} submissions`}
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            {tab === "pending" ? "When your team members submit work, it will appear here for review." : ""}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayTasks.map((task) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <PremiumCard className={`p-0 overflow-hidden ${expanded === task.id ? "border-purple-500/30" : ""}`}>
                {/* Task Header */}
                <button
                  onClick={() => setExpanded(expanded === task.id ? null : task.id)}
                  className="w-full flex items-start gap-4 p-5 text-left hover:bg-accent/20 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-semibold text-foreground">{task.title}</span>
                      {isOverdue(task.deadline) && task.status === "Review" && (
                        <span className="text-[10px] font-bold text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded-full border border-rose-500/20">
                          LATE SUBMISSION
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      {task.assigneeName && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" /> {task.assigneeName}
                        </span>
                      )}
                      {task.projectName && <span>📁 {task.projectName}</span>}
                      {task.submittedAt && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Submitted {timeAgo(task.submittedAt)}
                        </span>
                      )}
                      {task.deadline && (
                        <span className={`flex items-center gap-1 ${isOverdue(task.deadline) ? "text-rose-500" : ""}`}>
                          Due {new Date(task.deadline).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {task.rejectionFeedback && tab !== "pending" && (
                      <p className="text-xs text-rose-400 mt-1.5 bg-rose-500/5 px-2 py-1 rounded border border-rose-500/10">
                        Rejection reason: {task.rejectionFeedback}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColor(task.status)}`}>
                      {task.status}
                    </span>
                    {tab === "pending" && (
                      expanded === task.id
                        ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {/* Action Panel — only for pending */}
                <AnimatePresence>
                  {expanded === task.id && tab === "pending" && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 pt-0 border-t border-border bg-muted/10">
                        <div className="mt-4">
                          <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                            Feedback / Rejection Reason
                            <span className="text-rose-500 ml-1">(required for rejection)</span>
                          </label>
                          <textarea
                            value={feedback[task.id] || ""}
                            onChange={e => setFeedback(prev => ({ ...prev, [task.id]: e.target.value }))}
                            placeholder="Add feedback or reason for rejection..."
                            rows={3}
                            className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 resize-none"
                          />
                        </div>

                        <div className="flex items-center gap-3 mt-4">
                          <button
                            onClick={() => handleApprove(task.id)}
                            disabled={!!actionLoading}
                            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white text-sm font-semibold rounded-lg hover:bg-emerald-500/90 disabled:opacity-50 transition-colors"
                          >
                            {actionLoading === task.id + "_approve"
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <CheckCircle2 className="w-4 h-4" />
                            }
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(task.id)}
                            disabled={!!actionLoading || !feedback[task.id]?.trim()}
                            className="flex items-center gap-2 px-5 py-2.5 bg-rose-500 text-white text-sm font-semibold rounded-lg hover:bg-rose-500/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {actionLoading === task.id + "_reject"
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <XCircle className="w-4 h-4" />
                            }
                            Reject
                          </button>
                          <button
                            onClick={() => setExpanded(null)}
                            className="px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </PremiumCard>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
