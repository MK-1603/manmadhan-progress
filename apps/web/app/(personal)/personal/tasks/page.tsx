"use client";

import React, { useEffect, useState, useCallback } from "react";
import apiClient from "@/lib/api-client";
import {
  CheckCircle2,
  Circle,
  Clock,
  Plus,
  Search,
  Trash2,
  X,
  AlertCircle,
  ArrowRight,
  Filter,
} from "lucide-react";
import { useSocket } from "@/components/providers/socket-provider";
import { useConfirm } from "@/hooks/use-confirm";

export default function TasksPage() {
  const { confirm } = useConfirm();
  const { socket, isConnected } = useSocket();

  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [error, setError] = useState("");

  // Integrated Prompt Creation
  const [promptInput, setPromptInput] = useState("");
  const [isInterpreting, setIsInterpreting] = useState(false);

  // Manual Form
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "Medium",
    deadline: "",
    estimatedMinutes: "",
  });

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiClient.get("/personal/tasks");
      if (response.data?.success && Array.isArray(response.data.data)) {
        setTasks(response.data.data);
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to fetch tasks.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    if (!socket || !isConnected) return;
    socket.on("task_created", (t: any) => setTasks((p) => [t, ...p]));
    socket.on("task_updated", (t: any) => setTasks((p) => p.map((x) => (x.id === t.id ? t : x))));
    socket.on("task_deleted", ({ id }: { id: string }) => setTasks((p) => p.filter((x) => x.id !== id)));
    return () => {
      socket.off("task_created");
      socket.off("task_updated");
      socket.off("task_deleted");
    };
  }, [socket, isConnected]);

  const handleToggle = async (task: any) => {
    const isCompleted = task.status === "COMPLETED" || task.status === "Completed";
    const newStatus = isCompleted ? "TODO" : "COMPLETED";
    setTasks((p) => p.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)));
    try {
      await apiClient.patch(`/personal/tasks/${task.id}`, { status: newStatus });
    } catch {
      fetchTasks();
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this task?")) return;
    setTasks((p) => p.filter((t) => t.id !== id));
    try {
      await apiClient.delete(`/personal/tasks/${id}`);
    } catch {
      fetchTasks();
    }
  };

  const handlePromptCreate = async () => {
    if (!promptInput.trim()) return;
    setIsInterpreting(true);
    setError("");
    try {
      const title = promptInput.replace(/create a task to|create task|tomorrow at 7 pm/gi, "").trim() || promptInput;
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const res = await apiClient.post("/personal/tasks", {
        title: title.charAt(0).toUpperCase() + title.slice(1),
        priority: "High",
        deadline: tomorrow.toISOString(),
      });

      if (res.data?.success) {
        setPromptInput("");
        await fetchTasks();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create task from prompt.");
    } finally {
      setIsInterpreting(false);
    }
  };

  const handleManualCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setCreating(true);
    setError("");
    try {
      const payload: any = {
        title: form.title.trim(),
        priority: form.priority,
      };
      if (form.description.trim()) payload.description = form.description.trim();
      if (form.deadline) payload.deadline = new Date(form.deadline).toISOString();
      if (form.estimatedMinutes) payload.estimatedMinutes = parseInt(form.estimatedMinutes, 10);

      const res = await apiClient.post("/personal/tasks", payload);
      if (res.data?.success) {
        setForm({ title: "", description: "", priority: "Medium", deadline: "", estimatedMinutes: "" });
        setShowCreate(false);
        await fetchTasks();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create task.");
    } finally {
      setCreating(false);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (search.trim() && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (priorityFilter !== "All" && (t.priority || "").toLowerCase() !== priorityFilter.toLowerCase()) return false;
    const isComp = t.status === "COMPLETED" || t.status === "Completed";
    if (activeTab === "Active" && isComp) return false;
    if (activeTab === "Completed" && !isComp) return false;
    if (activeTab === "Today" && t.deadline) {
      const today = new Date().toDateString();
      const dDate = new Date(t.deadline).toDateString();
      if (today !== dDate) return false;
    }
    return true;
  });

  const totalCount = tasks.length;
  const activeCount = tasks.filter((t) => t.status !== "COMPLETED" && t.status !== "Completed").length;
  const completedCount = tasks.filter((t) => t.status === "COMPLETED" || t.status === "Completed").length;
  const overdueCount = tasks.filter((t) => {
    const isComp = t.status === "COMPLETED" || t.status === "Completed";
    return !isComp && t.deadline && new Date(t.deadline) < new Date();
  }).length;

  return (
    <div className="w-full min-h-full flex flex-col p-4 sm:p-6 md:p-8 space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Tasks</h1>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">
            Operational task backlog and execution workspace.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="px-4 h-9 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-all flex items-center gap-1.5 shrink-0 shadow-xs self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" /> New Task
        </button>
      </header>

      {/* Compact Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-border bg-card shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">TOTAL</span>
          <p className="text-lg font-bold text-foreground mt-0.5">{totalCount}</p>
        </div>
        <div className="p-3.5 rounded-xl border border-border bg-card shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">ACTIVE</span>
          <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-0.5">{activeCount}</p>
        </div>
        <div className="p-3.5 rounded-xl border border-border bg-card shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">COMPLETED</span>
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{completedCount}</p>
        </div>
        <div className="p-3.5 rounded-xl border border-border bg-card shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">OVERDUE</span>
          <p className="text-lg font-bold text-rose-600 dark:text-rose-400 mt-0.5">{overdueCount}</p>
        </div>
      </div>

      {/* Prompt Creation */}
      <section className="p-4 rounded-2xl border border-border bg-card space-y-3 shadow-xs">
        <div>
          <h2 className="text-xs font-bold text-foreground">Create Task with Prompt</h2>
          <p className="text-[11px] text-muted-foreground font-medium">
            Describe what you need done and when.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2">
          <input
            type="text"
            placeholder="e.g. Create a task to finish the GraphQL API tomorrow at 7 PM..."
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            className="w-full h-10 px-3.5 rounded-xl bg-background border border-border text-xs font-medium text-foreground focus:outline-none focus:border-foreground/30"
          />
          <button
            type="button"
            onClick={handlePromptCreate}
            disabled={isInterpreting || !promptInput.trim()}
            className="w-full sm:w-auto px-4 h-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs transition-all flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-40"
          >
            Create Task <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>

      {/* Toolbar & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
          {["All", "Active", "Today", "Completed"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                activeTab === tab
                  ? "bg-foreground text-background shadow-xs"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-background border border-border text-xs font-medium text-foreground focus:outline-none focus:border-foreground/30"
            />
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-9 px-3 rounded-xl bg-background border border-border text-xs font-medium text-foreground focus:outline-none"
          >
            <option value="All">All Priorities</option>
            <option value="Urgent">Urgent</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Task List / Table */}
      <section className="flex-1 min-h-0">
        {loading ? (
          <div className="py-12 text-center text-xs text-muted-foreground font-medium">
            Loading tasks...
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-dashed border-border bg-card space-y-2">
            <CheckCircle2 className="w-8 h-8 text-muted-foreground mx-auto opacity-50" />
            <p className="text-xs font-bold text-foreground">No tasks found</p>
            <p className="text-[11px] text-muted-foreground max-w-sm mx-auto font-medium">
              Describe what you want to do above to create your first task.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
            {/* Header Row */}
            <div className="hidden sm:grid grid-cols-12 px-4 py-2.5 bg-muted/30 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              <span className="col-span-6">TASK TITLE</span>
              <span className="col-span-2">PRIORITY</span>
              <span className="col-span-2">DUE DATE</span>
              <span className="col-span-2 text-right">ACTIONS</span>
            </div>

            {/* Rows */}
            {filteredTasks.map((t) => {
              const isComp = t.status === "COMPLETED" || t.status === "Completed";
              return (
                <div
                  key={t.id}
                  className="p-3.5 sm:p-4 sm:grid sm:grid-cols-12 sm:items-center flex flex-col gap-2 hover:bg-muted/20 transition-colors group"
                >
                  <div className="col-span-6 flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => handleToggle(t)}
                      className={`shrink-0 transition-colors ${
                        isComp ? "text-emerald-500" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {isComp ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                    </button>
                    <span
                      className={`text-xs font-bold truncate ${
                        isComp ? "line-through text-muted-foreground" : "text-foreground"
                      }`}
                    >
                      {t.title}
                    </span>
                  </div>

                  <div className="col-span-2 flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        t.priority === "Urgent"
                          ? "bg-rose-500/10 text-rose-600"
                          : t.priority === "High"
                          ? "bg-orange-500/10 text-orange-600"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {t.priority || "Normal"}
                    </span>
                  </div>

                  <div className="col-span-2 text-xs text-muted-foreground font-medium flex items-center gap-1">
                    {t.deadline && (
                      <>
                        <Clock className="w-3 h-3" />
                        {new Date(t.deadline).toLocaleDateString()}
                      </>
                    )}
                  </div>

                  <div className="col-span-2 flex items-center justify-end gap-1">
                    <button
                      onClick={(e) => handleDelete(t.id, e)}
                      className="p-1 rounded-lg text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Manual Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleManualCreate}
            className="bg-card border border-border text-card-foreground rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground">New Task</h3>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-foreground mb-1">TASK TITLE *</label>
                <input
                  type="text"
                  placeholder="e.g. Complete API integration"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-background border border-border text-xs font-medium text-foreground focus:outline-none focus:border-gold"
                />
              </div>

              <div>
                <label className="block font-bold text-foreground mb-1">PRIORITY</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-background border border-border text-xs font-medium text-foreground focus:outline-none focus:border-gold"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-foreground mb-1">DUE DATE</label>
                <input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-background border border-border text-xs font-medium text-foreground focus:outline-none focus:border-gold"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 rounded-xl border border-border text-xs font-bold text-muted-foreground"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating || !form.title.trim()}
                className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs disabled:opacity-50"
              >
                {creating ? "Saving..." : "Save Task"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
