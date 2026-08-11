"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckSquare, Search, Loader2, AlertCircle, Clock, User, Zap, Tag, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
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

const priorityColor = (p: string) => {
  if (p === "Urgent") return "text-rose-500";
  if (p === "High") return "text-orange-500";
  if (p === "Medium") return "text-amber-500";
  return "text-muted-foreground";
};

import { GenerateTasksModal } from "@/components/organization/generate-tasks-modal";
import { ListPlus } from "lucide-react";

export default function CEOTasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const { socket } = useSocket();

  const fetchTasks = useCallback(async () => {
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      if (!workspaceId) return;
      const res = await apiClient.get(`/org/tasks?workspaceId=${workspaceId}`);
      if (res.data.success) setTasks(res.data.data);
      else setError(res.data.error || "Failed to load tasks");
    } catch {
      setError("Unable to load tasks. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  useEffect(() => {
    if (!socket) return;
    socket.on("task.created", fetchTasks);
    socket.on("task.updated", fetchTasks);
    socket.on("tasks.automated", fetchTasks);
    return () => {
      socket.off("task.created");
      socket.off("task.updated");
      socket.off("tasks.automated");
    };
  }, [socket, fetchTasks]);

  const filtered = tasks.filter(t => {
    const s = search.toLowerCase();
    const matchSearch = t.title.toLowerCase().includes(s) || (t.assigneeName || "").toLowerCase().includes(s) || (t.projectName || "").toLowerCase().includes(s);
    const matchStatus = statusFilter === "All" || t.status === statusFilter;
    const matchPriority = priorityFilter === "All" || t.priority === priorityFilter;
    return matchSearch && matchStatus && matchPriority;
  });

  const stats = {
    total: tasks.length,
    inProgress: tasks.filter(t => t.status === "In Progress").length,
    review: tasks.filter(t => t.status === "Review").length,
    completed: tasks.filter(t => t.status === "Completed" || t.status === "Approved").length,
    overdue: tasks.filter(t => t.isOverdue).length,
  };

  return (
    <div className="p-4 lg:p-6 max-w-[1440px] mx-auto w-full space-y-5">
      {/* Header Bar */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-foreground tracking-tight">Tasks</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-emerald-500 bg-emerald-500/10 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Task Automation Active
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">Automated organization work queue generated from project mandates, roadmaps, and milestones</p>
        </div>

        <button
          type="button"
          onClick={() => setShowGenerateModal(true)}
          className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl shadow-sm hover:bg-primary/90 transition-colors flex items-center gap-2"
        >
          <ListPlus className="w-4 h-4" /> Generate Tasks
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Generated", value: stats.total, color: "text-foreground" },
          { label: "In Progress", value: stats.inProgress, color: "text-amber-500" },
          { label: "In Review", value: stats.review, color: "text-purple-500" },
          { label: "Completed", value: stats.completed, color: "text-emerald-500" },
          { label: "Overdue", value: stats.overdue, color: "text-rose-500" },
        ].map(s => (
          <PremiumCard key={s.label} className="p-3">
            <p className="text-[11px] text-muted-foreground">{s.label}</p>
            <p className={`text-xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
          </PremiumCard>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input type="text" placeholder="Search automated tasks..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 bg-card border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:border-primary">
          {["All", "Pending", "In Progress", "Review", "Approved", "Completed", "Blocked"].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="px-3 py-2 bg-card border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:border-primary">
          {["All", "Urgent", "High", "Medium", "Low"].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : error ? (
        <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500 text-xs"><AlertCircle className="w-4 h-4 shrink-0" /> {error}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 p-4 border border-border rounded-xl bg-card space-y-2">
          <CheckSquare className="w-8 h-8 text-muted-foreground/40 mx-auto" />
          <p className="text-xs font-bold text-foreground">No automated tasks in queue</p>
          <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
            Tasks are automatically generated when project mandates, requirement analysis, roadmaps, and milestones are created.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((task, i) => (
            <motion.div key={task.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
              <PremiumCard className="p-3.5 hover:border-primary/40 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-foreground">{task.title}</span>
                      <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border border-primary/20 bg-primary/10 text-primary flex items-center gap-1">
                        <Tag className="w-2.5 h-2.5" /> {task.sourceType || "AUTOMATED"}
                      </span>
                      {task.isOverdue && <span className="text-[9px] font-bold text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">OVERDUE</span>}
                    </div>
                    {task.description && <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">{task.description}</p>}
                    <div className="flex items-center gap-3 mt-2 flex-wrap text-[11px] text-muted-foreground">
                      {task.projectName && <span className="flex items-center gap-1 font-semibold text-foreground">📁 {task.projectName}</span>}
                      {task.assigneeName && <span className="flex items-center gap-1"><User className="w-3 h-3 text-primary" /> {task.assigneeName}</span>}
                      {task.deadline && <span className="flex items-center gap-1 font-mono"><Clock className="w-3 h-3" /> {new Date(task.deadline).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-bold ${priorityColor(task.priority)}`}>{task.priority}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${statusColor(task.status)}`}>{task.status}</span>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!confirm("Are you sure you want to delete this task?")) return;
                        try {
                          const workspaceId = localStorage.getItem("workspaceId");
                          const res = await apiClient.delete(`/org/tasks/${task.id}?workspaceId=${workspaceId}`);
                          if (res.data.success) fetchTasks();
                        } catch (e) {
                          alert("Failed to delete task");
                        }
                      }}
                      className="p-1 rounded hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition-colors"
                      title="Delete Task"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </PremiumCard>
            </motion.div>
          ))}
        </div>
      )}

      <GenerateTasksModal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        onCreated={fetchTasks}
      />
    </div>
  );
}
