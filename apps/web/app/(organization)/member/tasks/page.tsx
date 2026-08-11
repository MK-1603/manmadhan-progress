"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CheckSquare, Search, Loader2, AlertCircle, Clock, Filter,
  Play, Pause, CheckCircle2, Send, Calendar, ChevronDown
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import apiClient from "@/lib/api-client";
import { useSocket } from "@/components/providers/socket-provider";
import { PremiumCard } from "@/components/ui/premium-card";

const statusColor = (s: string) => {
  const m: Record<string, string> = {
    "Draft": "text-muted-foreground bg-muted border-border",
    "Assigned": "text-blue-500 bg-blue-500/10 border-blue-500/20",
    "In Progress": "text-amber-500 bg-amber-500/10 border-amber-500/20",
    "Review": "text-purple-500 bg-purple-500/10 border-purple-500/20",
    "Approved": "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    "Completed": "text-emerald-600 bg-emerald-600/10 border-emerald-600/20",
    "Blocked": "text-rose-500 bg-rose-500/10 border-rose-500/20",
  };
  return m[s] || "text-muted-foreground bg-muted border-border";
};

export default function MemberTasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [extModal, setExtModal] = useState<{ taskId: string; taskTitle: string } | null>(null);
  const [extReason, setExtReason] = useState("");
  const [extDeadline, setExtDeadline] = useState("");
  const { socket } = useSocket();

  const fetchTasks = useCallback(async () => {
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      if (!workspaceId) return;
      const res = await apiClient.get(`/org/tasks?workspaceId=${workspaceId}`);
      if (res.data.success) setTasks(res.data.data || []);
    } catch { setError("Unable to load tasks"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);
  useEffect(() => {
    if (!socket) return;
    socket.on("task.updated", fetchTasks);
    socket.on("TASK_ASSIGNED", fetchTasks);
    return () => { socket.off("task.updated"); socket.off("TASK_ASSIGNED"); };
  }, [socket, fetchTasks]);

  const updateStatus = async (taskId: string, status: string) => {
    setActionLoading(taskId);
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      const res = await apiClient.patch(`/org/tasks/${taskId}`, { workspaceId, status });
      if (res.data.success) fetchTasks();
      else setError(res.data.error || "Failed to update task");
    } catch (e: any) { setError(e.message || "Failed to update task"); }
    finally { setActionLoading(null); }
  };

  const submitExtension = async () => {
    if (!extModal || !extReason.trim() || !extDeadline) return;
    setActionLoading(extModal.taskId);
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      await apiClient.post(`/org/tasks/${extModal.taskId}/deadline-extension`, {
        workspaceId, reason: extReason, proposedDeadline: extDeadline,
      });
      setExtModal(null); setExtReason(""); setExtDeadline("");
    } catch { setError("Failed to submit extension request"); }
    finally { setActionLoading(null); }
  };

  const filtered = tasks.filter(t => {
    const s = search.toLowerCase();
    return (t.title.toLowerCase().includes(s) || (t.projectName || "").toLowerCase().includes(s)) &&
      (statusFilter === "All" || t.status === statusFilter);
  });

  const getActions = (task: any) => {
    const actions: { label: string; icon: any; status?: string; variant: string; onClick?: () => void }[] = [];
    if (task.status === "Assigned") {
      actions.push({ label: "Accept", icon: CheckCircle2, status: "Accepted", variant: "emerald" });
    }
    if (task.status === "Accepted") {
      actions.push({ label: "Start", icon: Play, status: "In Progress", variant: "amber" });
    }
    if (task.status === "In Progress") {
      actions.push({ label: "Submit", icon: Send, status: "Review", variant: "purple" });
      actions.push({ label: "Pause", icon: Pause, status: "Accepted", variant: "muted" });
    }
    if (task.status === "Review") {
      actions.push({ label: "Revise", icon: CheckSquare, status: "In Progress", variant: "blue" });
    }
    if (!["Approved", "Completed"].includes(task.status) && task.deadline) {
      actions.push({ label: "Extend", icon: Calendar, variant: "muted", onClick: () => setExtModal({ taskId: task.id, taskTitle: task.title }) });
    }
    return actions;
  };

  const variantClass = (v: string) => {
    const m: Record<string, string> = {
      "emerald": "bg-emerald-500 text-white hover:bg-emerald-500/90",
      "amber": "bg-amber-500 text-white hover:bg-amber-500/90",
      "purple": "bg-purple-500 text-white hover:bg-purple-500/90",
      "blue": "bg-blue-500 text-white hover:bg-blue-500/90",
      "muted": "bg-card border border-border text-muted-foreground hover:bg-accent hover:text-foreground",
    };
    return m[v] || m.muted;
  };

  return (
    <div className="p-6 lg:p-8 max-w-[1200px] mx-auto w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
          <CheckSquare className="w-6 h-6 text-primary" /> My Tasks
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Your assigned tasks — start, submit, and track progress</p>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          <button onClick={() => setError("")} className="ml-auto text-xs hover:underline">Dismiss</button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks..." className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/30" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2.5 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/30">
          {["All", "Assigned", "Accepted", "In Progress", "Review", "Approved", "Completed", "Blocked"].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <CheckSquare className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">
            {search ? "No tasks match your search" : "No tasks assigned yet"}
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Tasks will appear here once assigned by your CEO or CO-CEO
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((task, i) => {
            const actions = getActions(task);
            return (
              <motion.div key={task.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <PremiumCard className={`${task.isOverdue ? "border-rose-500/20" : ""} hover:border-border/80 transition-colors`}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-semibold text-foreground">{task.title}</span>
                        {task.isOverdue && (
                          <span className="text-[10px] font-bold text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded-full border border-rose-500/20">OVERDUE</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        {task.projectName && <span>📁 {task.projectName}</span>}
                        {task.milestoneName && <span>🏁 {task.milestoneName}</span>}
                        {task.deadline && (
                          <span className={`flex items-center gap-1 ${task.isOverdue ? "text-rose-500 font-medium" : ""}`}>
                            <Clock className="w-3 h-3" /> Due {new Date(task.deadline).toLocaleDateString()}
                          </span>
                        )}
                        {task.estimatedMinutes && (
                          <span className="flex items-center gap-1">
                            ⏱ {task.estimatedMinutes}min est.
                          </span>
                        )}
                      </div>
                      {task.description && (
                        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{task.description}</p>
                      )}
                      {task.rejectionFeedback && (
                        <div className="mt-2 p-2 bg-rose-500/5 border border-rose-500/10 rounded-lg">
                          <p className="text-xs text-rose-500">Feedback: {task.rejectionFeedback}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColor(task.status)}`}>
                        {task.status}
                      </span>
                      <span className={`text-[10px] font-semibold ${task.priority === "Urgent" ? "text-rose-500" : task.priority === "High" ? "text-orange-500" : "text-muted-foreground"}`}>
                        {task.priority}
                      </span>
                    </div>
                  </div>

                  {actions.length > 0 && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border flex-wrap">
                      {actions.map(action => (
                        <button
                          key={action.label}
                          disabled={actionLoading === task.id}
                          onClick={() => action.onClick ? action.onClick() : (action.status && updateStatus(task.id, action.status))}
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 ${variantClass(action.variant)}`}
                        >
                          {actionLoading === task.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <action.icon className="w-3 h-3" />
                          )}
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </PremiumCard>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Extension Modal */}
      <AnimatePresence>
        {extModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setExtModal(null)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
              className="relative bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <h3 className="text-sm font-bold text-foreground mb-1">Request Deadline Extension</h3>
              <p className="text-xs text-muted-foreground mb-4">Task: {extModal.taskTitle}</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Proposed New Deadline</label>
                  <input type="date" value={extDeadline} onChange={e => setExtDeadline(e.target.value)} className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/30" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Reason for Extension</label>
                  <textarea value={extReason} onChange={e => setExtReason(e.target.value)} rows={3} placeholder="Explain why you need more time..." className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 resize-none" />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={() => { setExtModal(null); setExtReason(""); setExtDeadline(""); }} className="flex-1 py-2 border border-border rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent transition-colors">Cancel</button>
                <button
                  onClick={submitExtension}
                  disabled={!extReason.trim() || !extDeadline || !!actionLoading}
                  className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Submit Request"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
