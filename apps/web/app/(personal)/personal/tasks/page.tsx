"use client";

import React, { useEffect, useState, useCallback } from "react";
import apiClient from "@/lib/api-client";
import {
  LoaderCircle, CheckCircle2, Circle, Clock, LayoutList,
  Plus, Search, Trash2, X, ChevronDown, Flag, FolderKanban,
  AlertCircle, ArrowUpDown,
} from "lucide-react";
import { useSocket } from "@/components/providers/socket-provider";

const PRIORITY_COLOR: Record<string, string> = {
  Urgent:   "text-rose-500 bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800",
  High:     "text-orange-500 bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800",
  Medium:   "text-amber-500 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800",
  Low:      "text-[#52525B] dark:text-[#A1A1AA] bg-[#F4F4F5] dark:bg-[#1D1D1D] border-[#E5E7EB] dark:border-[#242424]",
};

const STATUS_TABS = ["All", "Active", "Today", "Completed"];

interface CreateTaskForm {
  title: string;
  description: string;
  priority: string;
  deadline: string;
  estimatedMinutes: string;
}

export default function TasksPage() {
  const { socket, isConnected } = useSocket();
  const [tasks, setTasks]       = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating]     = useState(false);
  const [createError, setCreateError] = useState("");
  const [deletingId, setDeletingId]   = useState<string | null>(null);
  const [form, setForm] = useState<CreateTaskForm>({
    title: "", description: "", priority: "Medium", deadline: "", estimatedMinutes: "",
  });

  const fetchTasks = useCallback(async () => {
    try {
      const response = await apiClient.get("/personal/tasks");
      setTasks(response.data.data || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  useEffect(() => {
    if (!socket || !isConnected) return;
    socket.on("task_created", (t: any) => setTasks(p => [t, ...p]));
    socket.on("task_updated", (t: any) => setTasks(p => p.map(x => x.id === t.id ? t : x)));
    socket.on("task_deleted", ({ id }: { id: string }) => setTasks(p => p.filter(x => x.id !== id)));
    return () => {
      socket.off("task_created");
      socket.off("task_updated");
      socket.off("task_deleted");
    };
  }, [socket, isConnected]);

  const handleToggle = async (task: any) => {
    const isCompleted = task.status === "COMPLETED" || task.status === "Completed";
    const newStatus = isCompleted ? "TODO" : "COMPLETED";
    setTasks(p => p.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    try {
      await apiClient.patch(`/personal/tasks/${task.id}`, { status: newStatus });
    } catch {
      setTasks(p => p.map(t => t.id === task.id ? { ...t, status: task.status } : t));
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      await apiClient.delete(`/personal/tasks/${id}`);
      setTasks(p => p.filter(t => t.id !== id));
    } catch {
      // silent
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setCreateError("Title is required"); return; }
    setCreating(true);
    setCreateError("");
    try {
      const payload: any = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        priority: form.priority,
        deadline: form.deadline || undefined,
        estimatedMinutes: form.estimatedMinutes ? parseInt(form.estimatedMinutes) : undefined,
      };
      await apiClient.post("/personal/tasks", payload);
      setForm({ title: "", description: "", priority: "Medium", deadline: "", estimatedMinutes: "" });
      setShowCreate(false);
      fetchTasks();
    } catch (err: any) {
      setCreateError(err.response?.data?.error || "Failed to create task");
    } finally {
      setCreating(false);
    }
  };

  const today = new Date().toDateString();

  const filtered = tasks.filter(t => {
    const isCompleted = t.status === "COMPLETED" || t.status === "Completed";
    const isToday = t.deadline && new Date(t.deadline).toDateString() === today;

    if (activeTab === "Active"    && isCompleted) return false;
    if (activeTab === "Completed" && !isCompleted) return false;
    if (activeTab === "Today"     && !isToday) return false;

    if (priorityFilter !== "All" && t.priority !== priorityFilter) return false;

    if (search.trim()) {
      const s = search.toLowerCase();
      if (!(t.title || "").toLowerCase().includes(s) &&
          !(t.description || "").toLowerCase().includes(s)) return false;
    }
    return true;
  });

  const stats = {
    total:     tasks.length,
    active:    tasks.filter(t => t.status !== "COMPLETED" && t.status !== "Completed").length,
    completed: tasks.filter(t => t.status === "COMPLETED" || t.status === "Completed").length,
    overdue:   tasks.filter(t => {
      const isCompleted = t.status === "COMPLETED" || t.status === "Completed";
      return t.deadline && !isCompleted && new Date(t.deadline) < new Date();
    }).length,
  };

  return (
    <div className="w-full h-full flex flex-col overflow-y-auto bg-[#FAFAFA] dark:bg-[#080808]">
      <div className="p-4 sm:p-6 lg:p-8 max-w-[900px] mx-auto w-full pb-20">

        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-6">
          <div>
            <p className="text-[10.5px] font-semibold text-[#A1A1AA] uppercase tracking-widest mb-1">
              Personal Workspace
            </p>
            <h1 className="text-[26px] font-bold text-[#171717] dark:text-[#F5F5F5] tracking-tight leading-none">
              Tasks
            </h1>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#171717] dark:bg-[#F5F5F5] text-white dark:text-[#080808] text-[13px] font-semibold hover:opacity-90 transition-opacity shrink-0"
          >
            <Plus className="w-4 h-4" /> New Task
          </button>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total",     value: stats.total,     color: "text-[#171717] dark:text-[#F5F5F5]" },
            { label: "Active",    value: stats.active,    color: "text-blue-500" },
            { label: "Completed", value: stats.completed, color: "text-[#16A34A]" },
            { label: "Overdue",   value: stats.overdue,   color: stats.overdue > 0 ? "text-rose-500" : "text-[#16A34A]" },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-[#111111] border border-[#E5E7EB] dark:border-[#242424] rounded-xl px-4 py-3">
              <p className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-widest">{s.label}</p>
              <p className={`text-[22px] font-bold font-mono leading-none mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A1A1AA]" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-xl border border-[#E5E7EB] dark:border-[#242424] bg-white dark:bg-[#111111] text-sm text-[#171717] dark:text-[#F5F5F5] placeholder-[#A1A1AA] focus:outline-none focus:border-[#A1A1AA] dark:focus:border-[#52525B]"
            />
          </div>
          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="h-9 px-3 rounded-xl border border-[#E5E7EB] dark:border-[#242424] bg-white dark:bg-[#111111] text-sm text-[#52525B] dark:text-[#A1A1AA] focus:outline-none"
          >
            {["All", "Urgent", "High", "Medium", "Low"].map(p => (
              <option key={p} value={p}>{p === "All" ? "All Priorities" : p}</option>
            ))}
          </select>
        </div>

        {/* Status tabs */}
        <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
          {STATUS_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? "bg-[#171717] dark:bg-[#F5F5F5] text-white dark:text-[#080808]"
                  : "bg-[#F4F4F5] dark:bg-[#1D1D1D] text-[#52525B] dark:text-[#A1A1AA] hover:bg-[#E5E7EB] dark:hover:bg-[#242424]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Task list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <LoaderCircle className="w-6 h-6 text-[#A1A1AA] animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 border border-dashed border-[#E5E7EB] dark:border-[#242424] rounded-2xl text-center">
            <LayoutList className="w-10 h-10 text-[#A1A1AA] dark:text-[#52525B] mb-3" />
            <h3 className="text-base font-bold text-[#171717] dark:text-[#F5F5F5] mb-1">
              {search || priorityFilter !== "All" ? "No tasks match" : activeTab === "Completed" ? "No completed tasks" : "No tasks yet"}
            </h3>
            <p className="text-sm text-[#52525B] dark:text-[#A1A1AA] max-w-xs">
              {search ? "Try a different search term." : activeTab === "All" ? "Create your first task to get started." : "Nothing here yet."}
            </p>
            {!search && activeTab === "All" && (
              <button
                onClick={() => setShowCreate(true)}
                className="mt-4 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#171717] dark:bg-[#F5F5F5] text-white dark:text-[#080808] text-sm font-semibold hover:opacity-90"
              >
                <Plus className="w-3.5 h-3.5" /> New Task
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map(task => {
              const isCompleted = task.status === "COMPLETED" || task.status === "Completed";
              const isOverdue = task.deadline && !isCompleted && new Date(task.deadline) < new Date();

              return (
                <div
                  key={task.id}
                  className={`group flex items-start gap-3 px-4 py-3.5 bg-white dark:bg-[#111111] border rounded-xl transition-all ${
                    isCompleted
                      ? "border-[#E5E7EB] dark:border-[#1D1D1D] opacity-60"
                      : "border-[#E5E7EB] dark:border-[#242424] hover:border-[#A1A1AA] dark:hover:border-[#52525B]"
                  }`}
                >
                  {/* Toggle */}
                  <button
                    onClick={() => handleToggle(task)}
                    className="mt-0.5 shrink-0 text-[#A1A1AA] hover:text-[#16A34A] transition-colors"
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-[#16A34A]" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-[14px] font-semibold leading-snug ${
                      isCompleted ? "line-through text-[#A1A1AA] dark:text-[#52525B]" : "text-[#171717] dark:text-[#F5F5F5]"
                    }`}>
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-[12px] text-[#52525B] dark:text-[#A1A1AA] mt-0.5 line-clamp-1">
                        {task.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {task.priority && task.priority !== "Medium" && (
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${PRIORITY_COLOR[task.priority] || PRIORITY_COLOR.Low}`}>
                          {task.priority}
                        </span>
                      )}
                      {task.project?.name && (
                        <span className="flex items-center gap-1 text-[11px] text-[#52525B] dark:text-[#A1A1AA]">
                          <FolderKanban className="w-3 h-3" /> {task.project.name}
                        </span>
                      )}
                      {task.deadline && (
                        <span className={`flex items-center gap-1 text-[11px] font-medium ${
                          isOverdue ? "text-rose-500" : "text-[#52525B] dark:text-[#A1A1AA]"
                        }`}>
                          <Clock className="w-3 h-3" />
                          {isOverdue ? "Overdue · " : ""}
                          {new Date(task.deadline).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </span>
                      )}
                      {task.estimatedMinutes && (
                        <span className="text-[11px] text-[#A1A1AA]">{task.estimatedMinutes}m</span>
                      )}
                    </div>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={e => handleDelete(task.id, e)}
                    disabled={deletingId === task.id}
                    className="shrink-0 p-1.5 rounded-lg text-[#A1A1AA] hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
                  >
                    {deletingId === task.id
                      ? <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
                      : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Task Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-[480px] bg-white dark:bg-[#111111] border border-[#E5E7EB] dark:border-[#242424] rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB] dark:border-[#242424]">
              <h2 className="text-base font-bold text-[#171717] dark:text-[#F5F5F5]">New Task</h2>
              <button
                onClick={() => { setShowCreate(false); setCreateError(""); }}
                className="p-1.5 rounded-lg text-[#A1A1AA] hover:bg-[#F4F4F5] dark:hover:bg-[#1D1D1D]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-4">
              {createError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {createError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#52525B] dark:text-[#A1A1AA] uppercase tracking-wider mb-1.5">
                  Task Title *
                </label>
                <input
                  autoFocus
                  type="text"
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="What needs to be done?"
                  className="w-full h-10 px-3 rounded-xl border border-[#E5E7EB] dark:border-[#242424] bg-[#F4F4F5]/50 dark:bg-[#1D1D1D]/50 text-sm text-[#171717] dark:text-[#F5F5F5] placeholder-[#A1A1AA] focus:outline-none focus:border-[#A1A1AA] dark:focus:border-[#52525B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#52525B] dark:text-[#A1A1AA] uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Optional notes or context..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] dark:border-[#242424] bg-[#F4F4F5]/50 dark:bg-[#1D1D1D]/50 text-sm text-[#171717] dark:text-[#F5F5F5] placeholder-[#A1A1AA] focus:outline-none focus:border-[#A1A1AA] dark:focus:border-[#52525B] resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#52525B] dark:text-[#A1A1AA] uppercase tracking-wider mb-1.5">
                    Priority
                  </label>
                  <select
                    value={form.priority}
                    onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                    className="w-full h-10 px-3 rounded-xl border border-[#E5E7EB] dark:border-[#242424] bg-[#F4F4F5]/50 dark:bg-[#1D1D1D]/50 text-sm text-[#171717] dark:text-[#F5F5F5] focus:outline-none"
                  >
                    {["Urgent", "High", "Medium", "Low"].map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#52525B] dark:text-[#A1A1AA] uppercase tracking-wider mb-1.5">
                    Deadline
                  </label>
                  <input
                    type="date"
                    value={form.deadline}
                    onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))}
                    className="w-full h-10 px-3 rounded-xl border border-[#E5E7EB] dark:border-[#242424] bg-[#F4F4F5]/50 dark:bg-[#1D1D1D]/50 text-sm text-[#171717] dark:text-[#F5F5F5] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#52525B] dark:text-[#A1A1AA] uppercase tracking-wider mb-1.5">
                  Estimated time (minutes)
                </label>
                <input
                  type="number"
                  min="5"
                  step="5"
                  value={form.estimatedMinutes}
                  onChange={e => setForm(p => ({ ...p, estimatedMinutes: e.target.value }))}
                  placeholder="e.g. 30"
                  className="w-full h-10 px-3 rounded-xl border border-[#E5E7EB] dark:border-[#242424] bg-[#F4F4F5]/50 dark:bg-[#1D1D1D]/50 text-sm text-[#171717] dark:text-[#F5F5F5] placeholder-[#A1A1AA] focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowCreate(false); setCreateError(""); }}
                  className="flex-1 h-10 rounded-xl border border-[#E5E7EB] dark:border-[#242424] text-sm font-medium text-[#52525B] dark:text-[#A1A1AA] hover:bg-[#F4F4F5] dark:hover:bg-[#1D1D1D] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !form.title.trim()}
                  className="flex-1 h-10 rounded-xl bg-[#171717] dark:bg-[#F5F5F5] text-white dark:text-[#080808] text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creating && <LoaderCircle className="w-4 h-4 animate-spin" />}
                  {creating ? "Creating..." : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
