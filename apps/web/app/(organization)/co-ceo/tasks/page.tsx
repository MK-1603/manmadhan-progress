"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FolderKanban, Plus, Search, Loader2, AlertCircle, Clock,
  User, Filter, ChevronDown, RefreshCw
} from "lucide-react";
import { motion } from "framer-motion";
import apiClient from "@/lib/api-client";
import { useSocket } from "@/components/providers/socket-provider";
import { PremiumCard } from "@/components/ui/premium-card";
import { TaskCreateModal } from "@/components/organization/task-create-modal";

const statusColor = (s: string) => {
  const m: Record<string, string> = {
    "Draft": "text-muted-foreground bg-muted border-border",
    "Assigned": "text-blue-500 bg-blue-500/10 border-blue-500/20",
    "Accepted": "text-blue-400 bg-blue-400/10 border-blue-400/20",
    "In Progress": "text-amber-500 bg-amber-500/10 border-amber-500/20",
    "Review": "text-purple-500 bg-purple-500/10 border-purple-500/20",
    "Approved": "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    "Completed": "text-emerald-600 bg-emerald-600/10 border-emerald-600/20",
    "Blocked": "text-rose-500 bg-rose-500/10 border-rose-500/20",
  };
  return m[s] || "text-muted-foreground bg-muted border-border";
};

const priorityColor = (p: string) => {
  const m: Record<string, string> = {
    "Urgent": "text-rose-500",
    "High": "text-orange-500",
    "Medium": "text-amber-500",
    "Low": "text-muted-foreground",
  };
  return m[p] || "text-muted-foreground";
};

function isOverdue(deadline: string | null, status: string) {
  if (!deadline) return false;
  if (["Approved", "Completed"].includes(status)) return false;
  return new Date(deadline) < new Date();
}

const STATUSES = ["All", "Assigned", "In Progress", "Review", "Approved", "Completed", "Blocked"];
const PRIORITIES = ["All", "Urgent", "High", "Medium", "Low"];

export default function CoCeoTasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const { socket } = useSocket();

  const fetchTasks = useCallback(async () => {
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      if (!workspaceId) return;
      // CO-CEO can see all tasks in the workspace (backend enforces proper scope)
      const res = await apiClient.get(`/org/tasks?workspaceId=${workspaceId}`);
      if (res.data.success) setTasks(res.data.data || []);
    } catch { setError("Unable to load tasks"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  useEffect(() => {
    if (!socket) return;
    socket.on("task.created", fetchTasks);
    socket.on("task.updated", fetchTasks);
    return () => { socket.off("task.created"); socket.off("task.updated"); };
  }, [socket, fetchTasks]);

  const filtered = tasks.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = !q || t.title.toLowerCase().includes(q)
      || (t.assigneeName || "").toLowerCase().includes(q)
      || (t.projectName || "").toLowerCase().includes(q);
    const matchStatus = statusFilter === "All" || t.status === statusFilter;
    const matchPriority = priorityFilter === "All" || t.priority === priorityFilter;
    return matchSearch && matchStatus && matchPriority;
  });

  // Group by status for cleaner display
  const grouped = STATUSES.slice(1).reduce<Record<string, any[]>>((acc, s) => {
    const items = filtered.filter(t => t.status === s);
    if (items.length > 0) acc[s] = items;
    return acc;
  }, {});

  const overdueCount = filtered.filter(t => isOverdue(t.deadline, t.status)).length;

  return (
    <div className="p-6 lg:p-8 max-w-[1200px] mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <FolderKanban className="w-6 h-6 text-purple-500" /> Tasks
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            All workspace tasks — assign, track, and review
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchTasks}
            className="p-2 rounded-lg border border-border hover:bg-accent transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> Assign Task
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Overdue alert */}
      {overdueCount > 0 && (
        <div className="flex items-center gap-3 p-4 bg-rose-500/5 border border-rose-500/20 rounded-lg text-rose-500 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="font-semibold">{overdueCount} overdue task{overdueCount > 1 ? "s" : ""}</span>
          <span className="text-rose-400">— require immediate attention</span>
        </div>
      )}

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tasks, members, projects..."
            className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
          >
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="px-3 py-2.5 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
          >
            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">{filtered.length}</span> tasks
        {overdueCount > 0 && <span className="text-rose-500 font-semibold">{overdueCount} overdue</span>}
        <span>{filtered.filter(t => t.status === "Review").length} pending review</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <FolderKanban className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {search || statusFilter !== "All" || priorityFilter !== "All"
              ? "No tasks match your filters"
              : "No tasks in the workspace yet"
            }
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
            >
              <PremiumCard className="hover:border-border/80 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground">{t.title}</span>
                      {isOverdue(t.deadline, t.status) && (
                        <span className="text-[10px] font-bold text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded-full border border-rose-500/20">
                          OVERDUE
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs flex-wrap">
                      {t.projectName && (
                        <span className="text-muted-foreground flex items-center gap-1">
                          <FolderKanban className="w-3 h-3" /> {t.projectName}
                        </span>
                      )}
                      {t.assigneeName && (
                        <span className="text-muted-foreground flex items-center gap-1">
                          <User className="w-3 h-3" /> {t.assigneeName}
                        </span>
                      )}
                      {t.deadline && (
                        <span className={`flex items-center gap-1 ${isOverdue(t.deadline, t.status) ? "text-rose-500 font-semibold" : "text-muted-foreground"}`}>
                          <Clock className="w-3 h-3" /> {new Date(t.deadline).toLocaleDateString()}
                        </span>
                      )}
                      <span className={`font-medium ${priorityColor(t.priority)}`}>{t.priority}</span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${statusColor(t.status)}`}>
                    {t.status}
                  </span>
                </div>
              </PremiumCard>
            </motion.div>
          ))}
        </div>
      )}

      <TaskCreateModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={fetchTasks}
        role="CO-CEO"
      />
    </div>
  );
}
