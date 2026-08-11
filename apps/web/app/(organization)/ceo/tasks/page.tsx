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
      socket.off("task.created", fetchTasks);
      socket.off("task.updated", fetchTasks);
      socket.off("tasks.automated", fetchTasks);
    };
  }, [socket, fetchTasks]);

  const filtered = tasks.filter(t => {
    const s = search.toLowerCase();
    const matchSearch = (t.title || "").toLowerCase().includes(s)
      || (t.assigneeName || "").toLowerCase().includes(s)
      || (t.projectName || "").toLowerCase().includes(s);
    const matchPriority = priorityFilter === "All" || t.priority === priorityFilter;
    if (!matchSearch || !matchPriority) return false;

    if (activeTab === "Pending")     return t.status === "Pending" || t.status === "PENDING_ACCEPTANCE";
    if (activeTab === "In Progress") return ["Assigned", "Accepted", "In Progress"].includes(t.status);
    if (activeTab === "Review")      return ["Review", "Submitted"].includes(t.status);
    if (activeTab === "Completed")   return ["Completed", "Approved"].includes(t.status);
    if (activeTab === "Blocked")     return t.status === "Blocked";
    return true;
  });

  const stats = {
    total:      tasks.length,
    inProgress: tasks.filter(t => ["Assigned", "Accepted", "In Progress"].includes(t.status)).length,
    review:     tasks.filter(t => ["Review", "Submitted"].includes(t.status)).length,
    completed:  tasks.filter(t => ["Completed", "Approved"].includes(t.status)).length,
    overdue:    tasks.filter(t => t.isOverdue || (t.deadline && !["Completed","Approved"].includes(t.status) && new Date(t.deadline) < new Date())).length,
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this task? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      const wsId = localStorage.getItem("workspaceId");
      await apiClient.delete(`/org/tasks/${id}?workspaceId=${wsId}`);
      fetchTasks();
    } catch {
      alert("Failed to delete task");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="px-5 md:px-8 xl:px-10 pt-7 pb-16 max-w-[1440px] mx-auto w-full space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
            ManMadhan · Organization
          </p>
          <h1 className="text-[28px] sm:text-[30px] font-bold text-foreground tracking-tight leading-none">Tasks</h1>
          <p className="text-[12px] text-muted-foreground mt-2">Track and manage all assigned work across the organization.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={fetchTasks} className="p-2 rounded-xl border border-border bg-card hover:bg-muted transition-colors">
            <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gold hover:bg-gold/90 text-[#111827] text-[12px] font-bold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> New Task
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-card border border-border rounded-xl text-[12px] text-muted-foreground">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
        </div>
      )}

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: "Total Tasks", value: stats.total,      color: "text-foreground" },
          { label: "In Progress", value: stats.inProgress, color: "text-blue-500" },
          { label: "Pending Review",value: stats.review,   color: "text-amber-600" },
          { label: "Completed",   value: stats.completed,  color: "text-emerald-600" },
          { label: "Overdue",     value: stats.overdue,    color: "text-destructive" },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-2xl px-4 py-4">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{s.label}</p>
            <p className={`text-[26px] font-bold font-mono leading-none mt-1.5 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2.5 bg-card border border-border rounded-xl text-[12px] text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-gold transition-all"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
          {STATUS_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-2 rounded-xl text-[11px] font-semibold transition-all shrink-0 ${
                activeTab === tab
                  ? "bg-foreground text-background"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <select
          value={priorityFilter}
          onChange={e => setPriorityFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-card border border-border text-[11px] font-semibold text-muted-foreground focus:outline-none focus:ring-1 focus:ring-gold"
        >
          {["All", "Urgent", "High", "Medium", "Low"].map(p => (
            <option key={p} value={p}>{p === "All" ? "All Priorities" : p}</option>
          ))}
        </select>
      </div>

      {/* ── Task Table ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 animate-spin text-gold" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center border border-dashed border-border rounded-2xl">
          <CheckSquare className="w-8 h-8 text-muted-foreground/20" />
          <p className="text-[14px] font-semibold text-foreground">
            {search ? "No tasks match your search" : `No ${activeTab !== "All" ? activeTab.toLowerCase() : ""} tasks`}
          </p>
          <p className="text-[12px] text-muted-foreground">
            {search ? "Try a different search term." : "Tasks will appear here when created or assigned."}
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {/* Table Header */}
          <div className="hidden md:grid grid-cols-[2.5fr_1fr_1fr_1fr_90px_50px] items-center gap-4 px-5 py-3 border-b border-border bg-muted/30">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Task</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Project</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Assignee</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Status</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Deadline</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-right">·</span>
          </div>

          <AnimatePresence>
            <div className="divide-y divide-border">
              {filtered.map((task, idx) => {
                const isOverdue = task.deadline
                  && !["Completed","Approved"].includes(task.status)
                  && new Date(task.deadline) < new Date();

                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.02 }}
                    onClick={() => setSelectedTask(task)}
                    className="group cursor-pointer"
                  >
                    {/* Desktop Row */}
                    <div className="hidden md:grid grid-cols-[2.5fr_1fr_1fr_1fr_90px_50px] items-center gap-4 px-5 py-3.5 hover:bg-muted/20 transition-colors">
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-foreground truncate">{task.title}</p>
                        {task.milestoneName && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{task.milestoneName}</p>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {task.projectName
                          ? <span className="flex items-center gap-1"><FolderKanban className="w-3 h-3 shrink-0" />{task.projectName}</span>
                          : <span className="text-muted-foreground/40 italic">Standalone</span>}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {task.assigneeName
                          ? <span className="flex items-center gap-1"><User className="w-3 h-3 shrink-0" />{task.assigneeName}</span>
                          : <span className="text-muted-foreground/40">Unassigned</span>}
                      </div>
                      <div>
                        <span className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold ${STATUS_STYLE[task.status] || STATUS_STYLE.Pending}`}>
                          {task.status}
                        </span>
                      </div>
                      <div className={`text-[11px] ${isOverdue ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                        {task.deadline
                          ? new Date(task.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                          : <span className="text-muted-foreground/40">—</span>}
                      </div>
                      <div className="flex justify-end">
                        <button
                          onClick={(e) => handleDelete(task.id, e)}
                          disabled={deletingId === task.id}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                    </div>

                    {/* Mobile Card */}
                    <div className="md:hidden p-4 hover:bg-muted/20 transition-colors">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-[13px] font-semibold text-foreground">{task.title}</p>
                        <span className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold shrink-0 ${STATUS_STYLE[task.status] || STATUS_STYLE.Pending}`}>
                          {task.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                        {task.projectName && <span className="flex items-center gap-1"><FolderKanban className="w-3 h-3" />{task.projectName}</span>}
                        {task.assigneeName && <span className="flex items-center gap-1"><User className="w-3 h-3" />{task.assigneeName}</span>}
                        {task.deadline && (
                          <span className={isOverdue ? "text-destructive font-semibold" : ""}>
                            Due {new Date(task.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        )}
                        {task.priority && (
                          <span className={PRIORITY_STYLE[task.priority] || ""}>
                            {task.priority}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        </div>
      )}

      {showCreate && (
        <CreateTaskModal
          isOpen={showCreate}
          onClose={() => setShowCreate(false)}
          onSuccess={fetchTasks}
        />
      )}

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          isOpen={Boolean(selectedTask)}
          onClose={() => setSelectedTask(null)}
          onUpdate={fetchTasks}
        />
      )}
    </div>
  );
}
