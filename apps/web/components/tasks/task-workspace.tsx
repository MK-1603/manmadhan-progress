"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  CheckSquare, Search, Loader2, AlertCircle, Trash2, Plus, RefreshCw, ChevronRight,
  LayoutGrid, List, Play, CheckCircle2, AlertTriangle, Check, X, MoreVertical,
  SlidersHorizontal, ChevronDown, Calendar, User, Layers, Shield, FileText, Send,
  Github, ArrowLeft, Lock, ArrowUpRight, Copy, Flag
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { useAuth } from "@/components/auth/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { useSocket } from "@/components/providers/socket-provider";
import { CreateTaskModal, renderNeatTextWithMentions } from "@/components/tasks/create-task-modal";
import { TaskDetailModal } from "@/components/tasks/task-detail-modal";
import { MobileSheet } from "@/components/ui/mobile-sheet";

interface TaskWorkspaceProps {
  userRole: "CEO" | "CO-CEO" | "MEMBER";
  basePath: string;
}

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  TODO: { bg: "bg-slate-500/10 border-slate-500/20", text: "text-slate-400", label: "TODO" },
  Pending: { bg: "bg-amber-500/10 border-amber-500/20", text: "text-amber-500", label: "Pending" },
  "In Progress": { bg: "bg-blue-500/10 border-blue-500/20", text: "text-blue-500", label: "In Progress" },
  "IN_PROGRESS": { bg: "bg-blue-500/10 border-blue-500/20", text: "text-blue-500", label: "In Progress" },
  Submitted: { bg: "bg-amber-500/15 border-amber-500/30", text: "text-amber-400 font-bold", label: "Submitted" },
  "SUBMITTED": { bg: "bg-amber-500/15 border-amber-500/30", text: "text-amber-400 font-bold", label: "Submitted" },
  "In Review": { bg: "bg-purple-500/10 border-purple-500/20", text: "text-purple-400", label: "In Review" },
  "IN_REVIEW": { bg: "bg-purple-500/10 border-purple-500/20", text: "text-purple-400", label: "In Review" },
  Approved: { bg: "bg-emerald-500/15 border-emerald-500/30", text: "text-emerald-400 font-bold", label: "Approved" },
  "APPROVED": { bg: "bg-emerald-500/15 border-emerald-500/30", text: "text-emerald-400 font-bold", label: "Approved" },
  Completed: { bg: "bg-emerald-500/10 border-emerald-500/20", text: "text-emerald-500", label: "Completed" },
  "COMPLETED": { bg: "bg-emerald-500/10 border-emerald-500/20", text: "text-emerald-500", label: "Completed" },
  Blocked: { bg: "bg-rose-500/10 border-rose-500/20", text: "text-rose-500", label: "Blocked" },
  "BLOCKED": { bg: "bg-rose-500/10 border-rose-500/20", text: "text-rose-500", label: "Blocked" },
};

const PRIORITY_BADGE: Record<string, { text: string; dot: string }> = {
  Critical: { text: "text-rose-500 font-extrabold", dot: "bg-rose-500" },
  CRITICAL: { text: "text-rose-500 font-extrabold", dot: "bg-rose-500" },
  High: { text: "text-amber-500 font-bold", dot: "bg-amber-500" },
  HIGH: { text: "text-amber-500 font-bold", dot: "bg-amber-500" },
  Medium: { text: "text-[#C9A52A] font-semibold", dot: "bg-[#C9A52A]" },
  MEDIUM: { text: "text-[#C9A52A] font-semibold", dot: "bg-[#C9A52A]" },
  Low: { text: "text-slate-400 font-normal", dot: "bg-slate-400" },
  LOW: { text: "text-slate-400 font-normal", dot: "bg-slate-400" },
};

export function TaskWorkspace({ userRole, basePath }: TaskWorkspaceProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const { socket } = useSocket();

  const [viewMode, setViewMode] = useState<"TABLE" | "BOARD">("TABLE");
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Tabs State
  const [search, setSearch] = useState("");
  const [workspaceTab, setWorkspaceTab] = useState<"MY_TASKS" | "ASSIGNED" | "CREATED" | "COMPLETED">("MY_TASKS");
  const [projectFilter, setProjectFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [assigneeFilter, setAssigneeFilter] = useState("All");

  // Metadata dropdown lists
  const [authorizedProjects, setAuthorizedProjects] = useState<any[]>([]);
  const [assigneeOptions, setAssigneeOptions] = useState<any[]>([]);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<any | null>(null);

  const canManageAssignments = userRole === "CEO" || userRole === "CO-CEO";

  // Fetch Tasks from API
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : undefined;
      const queryParams = new URLSearchParams();
      if (wsId) queryParams.set("workspaceId", wsId);
      if (projectFilter !== "All") queryParams.set("projectId", projectFilter);
      if (statusFilter !== "All") queryParams.set("status", statusFilter);
      if (priorityFilter !== "All") queryParams.set("priority", priorityFilter);
      if (assigneeFilter !== "All" && canManageAssignments) queryParams.set("assigneeId", assigneeFilter);

      const res = await apiClient.get(`/org/tasks?${queryParams.toString()}`);
      if (res.data?.success && Array.isArray(res.data.data)) {
        setTasks(res.data.data);
      } else {
        setTasks([]);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [projectFilter, statusFilter, priorityFilter, assigneeFilter, canManageAssignments]);

  // Fetch Authorized Projects & Assignees for filters
  useEffect(() => {
    async function fetchMetadata() {
      try {
        const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : undefined;
        const [projRes, assRes] = await Promise.all([
          apiClient.get(`/org/projects${wsId ? `?workspaceId=${wsId}` : ""}`),
          canManageAssignments ? apiClient.get(`/org/projects/eligible-assignees${wsId ? `?workspaceId=${wsId}` : ""}`) : null
        ]);

        if (projRes.data?.success && Array.isArray(projRes.data.data)) {
          setAuthorizedProjects(projRes.data.data);
        }
        if (assRes?.data?.members || assRes?.data?.coCeos) {
          const all = [...(assRes.data.coCeos || []), ...(assRes.data.members || [])];
          setAssigneeOptions(all);
        }
      } catch (err) {
        console.warn("Failed to fetch task workspace metadata:", err);
      }
    }
    fetchMetadata();
  }, [canManageAssignments]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Socket listener for real-time task updates
  useEffect(() => {
    if (!socket) return;
    const handleTaskEvent = () => fetchTasks();
    socket.on("task.created", handleTaskEvent);
    socket.on("task.updated", handleTaskEvent);
    socket.on("task.deleted", handleTaskEvent);
    return () => {
      socket.off("task.created", handleTaskEvent);
      socket.off("task.updated", handleTaskEvent);
      socket.off("task.deleted", handleTaskEvent);
    };
  }, [socket, fetchTasks]);

  // Calculate Execution Metrics
  const metrics = useMemo(() => {
    let active = 0;
    let inReview = 0;
    let atRisk = 0;
    let completed = 0;

    tasks.forEach((t) => {
      const s = (t.status || "").toUpperCase();
      const isOverdue = t.deadline && new Date(t.deadline).getTime() < Date.now() && s !== "COMPLETED" && s !== "APPROVED";

      if (s === "COMPLETED" || s === "APPROVED") {
        completed++;
      } else if (s === "SUBMITTED" || s === "IN_REVIEW" || s === "IN REVIEW") {
        inReview++;
      } else {
        active++;
      }

      if (s === "BLOCKED" || isOverdue) {
        atRisk++;
      }
    });

    return { active, inReview, atRisk, completed };
  }, [tasks]);

  // Filter Tasks by Workspace Tab & Search
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const s = (task.status || "").toUpperCase();
      // 1. Workspace Tab Filter
      if (workspaceTab === "MY_TASKS") {
        if (task.assigneeId !== user?.id && task.assignedToId !== user?.id) return false;
      } else if (workspaceTab === "ASSIGNED") {
        if (task.assigneeId !== user?.id && task.assignedToId !== user?.id) return false;
      } else if (workspaceTab === "CREATED") {
        if (s !== "SUBMITTED" && s !== "IN_REVIEW" && s !== "IN REVIEW") return false;
      } else if (workspaceTab === "COMPLETED") {
        if (s !== "COMPLETED" && s !== "APPROVED") return false;
      }

      // 2. Search Query
      if (search.trim()) {
        const q = search.toLowerCase();
        const titleMatch = (task.title || "").toLowerCase().includes(q);
        const descMatch = (task.description || "").toLowerCase().includes(q);
        const projMatch = (task.projectName || "").toLowerCase().includes(q);
        if (!titleMatch && !descMatch && !projMatch) return false;
      }

      return true;
    });
  }, [tasks, workspaceTab, search, user?.id]);

  const clearFilters = () => {
    setSearch("");
    setProjectFilter("All");
    setStatusFilter("All");
    setPriorityFilter("All");
    setAssigneeFilter("All");
    setWorkspaceTab("MY_TASKS");
  };

  return (
    <div className="w-full h-[calc(100vh-65px)] max-h-[calc(100vh-65px)] flex flex-col overflow-hidden bg-background text-foreground font-sans">
      
      {/* ── 1. HEADER & TOP CONTROL BAR ────────────────────────────────────────── */}
      <header className="px-4 sm:px-6 pt-4 pb-3 border-b border-border shrink-0 bg-card/60 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
            <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-[#C9A52A]" />
              <span>Tasks</span>
            </h1>
            <p className="text-xs text-muted-foreground truncate">
              Organizational execution workspace
            </p>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-background border border-border rounded-xl p-0.5 text-xs font-bold shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("TABLE")}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === "TABLE" ? "bg-[#C9A52A] text-[#0B0D10] font-extrabold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Table</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("BOARD")}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === "BOARD" ? "bg-[#C9A52A] text-[#0B0D10] font-extrabold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Board</span>
              </button>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={fetchTasks}
                className="p-2 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                title="Refresh Tasks"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#C9A52A]" : ""}`} />
              </button>

              {canManageAssignments && (
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#C9A52A] to-[#D4B12F] text-[#0B0D10] font-extrabold text-xs transition-all hover:brightness-105 shadow-sm flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Create Task</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── 2. COMPACT SUMMARY METRICS BAR ────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
          <div className="px-3 py-1.5 rounded-xl bg-background border border-border flex items-center justify-between">
            <span className="text-muted-foreground font-semibold">Active</span>
            <span className="font-extrabold text-foreground font-mono">{metrics.active}</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-between text-purple-400">
            <span className="font-semibold">In Review</span>
            <span className="font-extrabold font-mono">{metrics.inReview}</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between text-rose-500">
            <span className="font-semibold">At Risk / Overdue</span>
            <span className="font-extrabold font-mono">{metrics.atRisk}</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-emerald-500">
            <span className="font-semibold">Completed</span>
            <span className="font-extrabold font-mono">{metrics.completed}</span>
          </div>
        </div>

        {/* ── 3. SUB-NAVIGATION TABS (All / My Tasks / Assigned / In Review / Completed) */}
        <div className="flex items-center gap-1 border-b border-border/60 pb-2 overflow-x-auto text-xs font-bold [scrollbar-width:none]">
          {[
            { id: "MY_TASKS", label: "My Tasks" },
            { id: "ASSIGNED", label: "Assigned" },
            { id: "CREATED", label: "In Review" },
            { id: "COMPLETED", label: "Completed" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setWorkspaceTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                workspaceTab === tab.id
                  ? "bg-[#C9A52A] text-[#0B0D10] font-extrabold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── 3. SEARCH & COMPACT FILTER ROW ────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs pt-0.5">
          <div className="sm:col-span-4 relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks by title, description..."
              className="w-full h-[36px] pl-9 pr-7 rounded-xl bg-background border border-border text-foreground text-xs focus:outline-none focus:border-[#C9A52A] transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="sm:col-span-8 flex items-center gap-2 overflow-x-auto [scrollbar-width:none]">
            {/* Project Filter */}
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="h-[36px] px-3 rounded-xl bg-background border border-border text-foreground text-xs focus:outline-none focus:border-[#C9A52A] transition-colors font-medium shrink-0"
            >
              <option value="All">All Projects</option>
              {authorizedProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-[36px] px-3 rounded-xl bg-background border border-border text-foreground text-xs focus:outline-none focus:border-[#C9A52A] transition-colors font-medium shrink-0"
            >
              <option value="All">All Statuses</option>
              <option value="TODO">TODO / Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Submitted">Submitted</option>
              <option value="In Review">In Review</option>
              <option value="Approved">Approved</option>
              <option value="Completed">Completed</option>
              <option value="Blocked">Blocked</option>
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="h-[36px] px-3 rounded-xl bg-background border border-border text-foreground text-xs focus:outline-none focus:border-[#C9A52A] transition-colors font-medium shrink-0"
            >
              <option value="All">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            {/* Assignee Filter (Only for users with assignment rights!) */}
            {canManageAssignments && (
              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="h-[36px] px-3 rounded-xl bg-background border border-border text-foreground text-xs focus:outline-none focus:border-[#C9A52A] transition-colors font-medium shrink-0"
              >
                <option value="All">All Assignees</option>
                {assigneeOptions.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.role})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </header>

      {/* ── 4. CONTENT REGION (TABLE OR BOARD) ─────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4">
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center bg-card rounded-2xl border border-border space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#C9A52A]" />
            <span className="text-xs text-muted-foreground font-medium">Loading execution tasks...</span>
          </div>
        ) : filteredTasks.length === 0 ? (
          /* Role-Aware Empty State */
          <div className="p-8 text-center bg-card rounded-2xl border border-border space-y-3 max-w-md mx-auto my-8">
            <CheckSquare className="w-8 h-8 text-[#C9A52A] mx-auto opacity-80" />
            <div className="space-y-1">
              <h3 className="text-sm font-extrabold text-foreground">
                {search || projectFilter !== "All" || statusFilter !== "All" || priorityFilter !== "All"
                  ? "No tasks match your filters."
                  : canManageAssignments
                  ? "No tasks yet"
                  : "No tasks assigned"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {search || projectFilter !== "All" || statusFilter !== "All" || priorityFilter !== "All"
                  ? "Try clearing your filters or search keywords."
                  : canManageAssignments
                  ? "Create a task to begin execution."
                  : "Tasks assigned to you will appear here."}
              </p>
            </div>
            {search || projectFilter !== "All" || statusFilter !== "All" || priorityFilter !== "All" ? (
              <button
                type="button"
                onClick={clearFilters}
                className="h-[34px] px-4 rounded-xl bg-secondary text-foreground font-extrabold text-xs hover:bg-muted inline-flex items-center gap-1.5 cursor-pointer"
              >
                Clear Filters
              </button>
            ) : canManageAssignments ? (
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="h-[34px] px-4 rounded-xl bg-[#C9A52A] text-[#0B0D10] text-xs font-extrabold hover:brightness-105 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>+ Create Task</span>
              </button>
            ) : null}
          </div>
        ) : viewMode === "TABLE" ? (
          /* Desktop & Mobile Compact Table View */
          <div className="bg-card rounded-2xl border border-border shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-muted-foreground uppercase text-[10px] tracking-wider font-extrabold">
                    <th className="py-3 px-4">Task Title</th>
                    <th className="py-3 px-4">Project</th>
                    <th className="py-3 px-4">Milestone</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4">Assignee</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredTasks.map((task) => {
                    const statusObj = STATUS_BADGE[task.status] || { bg: "bg-muted text-muted-foreground border-border", label: task.status || "TODO" };
                    const priorityObj = PRIORITY_BADGE[task.priority] || { text: "text-foreground", dot: "bg-muted-foreground" };
                    const isOverdue = task.deadline && new Date(task.deadline).getTime() < Date.now() && task.status !== "Completed" && task.status !== "Approved";

                    return (
                      <tr
                        key={task.id}
                        onClick={() => setSelectedTaskDetail(task)}
                        className="hover:bg-muted/40 transition-colors cursor-pointer group"
                      >
                        <td className="py-3.5 px-4 font-bold text-foreground max-w-[280px]">
                          <div className="flex items-center gap-2">
                            <span className="truncate group-hover:text-[#C9A52A] transition-colors">{task.title}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-muted-foreground font-medium truncate max-w-[160px]">
                          {task.projectName || "General"}
                        </td>
                        <td className="py-3.5 px-4 text-muted-foreground truncate max-w-[140px]">
                          {task.milestoneName || "—"}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className={`px-2.5 py-0.5 rounded-full border text-[10.5px] font-semibold ${statusObj.bg} ${statusObj.text}`}>
                            {statusObj.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${priorityObj.dot}`} />
                            <span className={`text-[11px] ${priorityObj.text}`}>{task.priority || "Medium"}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px]">
                          {task.deadline ? (
                            <span className={isOverdue ? "text-rose-500 font-bold" : "text-muted-foreground"}>
                              {new Date(task.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              {isOverdue ? " (Overdue)" : ""}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/60">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-[#C9A52A]/10 border border-[#C9A52A]/20 text-[#C9A52A] flex items-center justify-center text-[10px] font-extrabold shrink-0">
                              {task.assigneeName ? task.assigneeName.charAt(0).toUpperCase() : "U"}
                            </div>
                            <span className="font-semibold text-foreground truncate max-w-[120px]">
                              {task.assigneeName || "Unassigned"}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setSelectedTaskDetail(task)}
                            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                            title="View Details"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Kanban Board View */
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { id: "TODO", title: "TODO / Pending" },
              { id: "In Progress", title: "In Progress" },
              { id: "Submitted", title: "In Review / Submitted" },
              { id: "Completed", title: "Completed / Approved" },
            ].map((col) => {
              const colTasks = filteredTasks.filter((t) => {
                const s = (t.status || "").toUpperCase();
                if (col.id === "TODO") return s === "TODO" || s === "PENDING" || s === "NOT STARTED";
                if (col.id === "In Progress") return s === "IN PROGRESS" || s === "IN_PROGRESS" || s === "ACCEPTED";
                if (col.id === "Submitted") return s === "SUBMITTED" || s === "IN REVIEW" || s === "IN_REVIEW";
                if (col.id === "Completed") return s === "COMPLETED" || s === "APPROVED";
                return false;
              });

              return (
                <div key={col.id} className="p-3 rounded-2xl bg-card border border-border space-y-3 flex flex-col min-h-[400px]">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider">{col.title}</h4>
                    <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-mono font-bold">
                      {colTasks.length}
                    </span>
                  </div>

                  <div className="space-y-2.5 flex-1">
                    {colTasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => setSelectedTaskDetail(task)}
                        className="p-3 rounded-xl bg-background border border-border hover:border-[#C9A52A]/40 transition-all cursor-pointer shadow-2xs space-y-2"
                      >
                        <h5 className="font-extrabold text-foreground text-xs leading-snug">{task.title}</h5>
                        <div className="flex items-center justify-between text-[10.5px] text-muted-foreground">
                          <span className="truncate max-w-[120px]">{task.projectName || "General"}</span>
                          <span className="font-mono text-[#C9A52A] font-bold">{task.priority}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 5. MODALS & DETAILED DRAWERS ───────────────────────────────────────── */}
      {isCreateModalOpen && (
        <CreateTaskModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            setIsCreateModalOpen(false);
            fetchTasks();
          }}
        />
      )}

      {selectedTaskDetail && (
        <TaskDetailModal
          task={selectedTaskDetail}
          isOpen={!!selectedTaskDetail}
          onClose={() => setSelectedTaskDetail(null)}
          onUpdate={() => {
            fetchTasks();
            setSelectedTaskDetail(null);
          }}
        />
      )}
    </div>
  );
}
