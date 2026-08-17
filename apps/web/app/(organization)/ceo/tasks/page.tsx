"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  CheckSquare, Search, Loader2, AlertCircle, User, Trash2, Plus, FolderKanban,
  RefreshCw, ChevronRight, BookOpen, Sparkles, Zap, Flame, Filter, LayoutGrid,
  List, Play, CheckCircle2, Clock, AlertTriangle, ShieldCheck, Check, X
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { useSocket } from "@/components/providers/socket-provider";
import { CreateTaskModal } from "@/components/tasks/create-task-modal";
import { TaskDetailModal } from "@/components/tasks/task-detail-modal";
import { useAuth } from "@/components/auth/auth-context";
import { useRouter } from "next/navigation";

const STATUS_STYLE: Record<string, string> = {
  "Draft": "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
  "Not Started": "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
  "Pending": "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
  "In Progress": "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  "Assigned": "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  "Accepted": "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  "Review": "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  "Submitted": "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  "Completed": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  "Approved": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  "Blocked": "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
};

const TASK_TYPE_TABS = ["All", "PROJECT WORK", "PERSONAL WORK", "LEARNING", "DOCUMENTATION", "RESEARCH", "SUBMISSION", "REVIEW"];

const PRIORITY_OPTIONS = [
  { value: "All", label: "All Priorities" },
  { value: "Low", label: "Low Priority", color: "bg-slate-400" },
  { value: "Medium", label: "Medium Priority", color: "bg-[#C9A52A]" },
  { value: "High", label: "High Priority", color: "bg-amber-500" },
  { value: "Critical", label: "Critical Priority", color: "bg-rose-500" },
];

const KANBAN_COLUMNS = [
  { id: "Not Started", title: "Not Started", color: "border-slate-500/30" },
  { id: "In Progress", title: "In Progress", color: "border-blue-500/30" },
  { id: "Blocked", title: "Blocked", color: "border-rose-500/30" },
  { id: "Completed", title: "Completed", color: "border-emerald-500/30" },
];

export default function TasksPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { socket } = useSocket();

  const [viewMode, setViewMode] = useState<"TABLE" | "BOARD">("TABLE");
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeTypeTab, setActiveTypeTab] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

  // Bulk Action State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  const isCEOorCOCEO = user?.role === "CEO" || user?.role === "CO_CEO";

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : null;
      const res = await apiClient.get(`/org/tasks${wsId ? `?workspaceId=${wsId}` : ""}`);
      if (res.data?.success && Array.isArray(res.data.data)) {
        setTasks(res.data.data);
        setError("");
      } else {
        setError("Failed to fetch tasks from backend.");
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || "Tasks couldn't be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

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

  // Filtering
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchSearch =
        !search.trim() ||
        (t.title || "").toLowerCase().includes(search.toLowerCase()) ||
        (t.description || "").toLowerCase().includes(search.toLowerCase()) ||
        (t.projectName || "").toLowerCase().includes(search.toLowerCase()) ||
        (t.assigneeName || "").toLowerCase().includes(search.toLowerCase());

      const matchType =
        activeTypeTab === "All" ||
        (t.type || "").toUpperCase() === activeTypeTab.toUpperCase();

      const matchPriority =
        priorityFilter === "All" ||
        (t.priority || "").toLowerCase() === priorityFilter.toLowerCase();

      return matchSearch && matchType && matchPriority;
    });
  }, [tasks, search, activeTypeTab, priorityFilter]);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const total = tasks.length;
    const inProgress = tasks.filter((t) => ["In Progress", "Accepted", "Assigned"].includes(t.status)).length;
    const completed = tasks.filter((t) => ["Completed", "Approved"].includes(t.status)).length;
    const blocked = tasks.filter((t) => t.status === "Blocked").length;
    const overdue = tasks.filter((t) => t.deadline && new Date(t.deadline) < new Date() && !["Completed", "Approved"].includes(t.status)).length;
    return { total, inProgress, completed, blocked, overdue };
  }, [tasks]);

  // Checkbox Selection
  const isAllSelected = filteredTasks.length > 0 && filteredTasks.every((t) => selectedIds.includes(t.id));
  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredTasks.map((t) => t.id));
    }
  };

  const toggleSelectId = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  // Status Change
  const handleUpdateStatus = async (taskId: string, newStatus: string) => {
    try {
      const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : null;
      await apiClient.patch(`/org/tasks/${taskId}${wsId ? `?workspaceId=${wsId}` : ""}`, {
        status: newStatus,
        progressPercent: newStatus === "Completed" ? 100 : undefined,
      });
      fetchTasks();
    } catch (e) {
      console.error("Failed to update status:", e);
    }
  };

  // Bulk Delete Execution
  const handleExecuteBulkDelete = async () => {
    setIsBulkProcessing(true);
    try {
      const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : null;
      await Promise.all(
        selectedIds.map((id) =>
          apiClient.delete(`/org/tasks/${id}${wsId ? `?workspaceId=${wsId}` : ""}`).catch(() => null)
        )
      );
      setSelectedIds([]);
      setShowBulkDeleteModal(false);
      fetchTasks();
    } catch (e) {
      console.error("Bulk delete failed:", e);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // Start Focus session integration
  const handleStartFocus = (taskId: string) => {
    router.push(`/ceo/focus?taskId=${taskId}`);
  };

  return (
    <div className="w-full h-full max-h-full flex flex-col justify-between overflow-hidden px-4 sm:px-6 md:px-10 py-4 sm:py-5 max-w-[1400px] mx-auto bg-[#F8F9FB] dark:bg-[#0B0E12] text-[#17202A] dark:text-[#F2F4F7] font-sans space-y-4">
      {/* ── Header Region ────────────────────────────────────────────── */}
      <div className="shrink-0 space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E4E7EC] dark:border-[#272D36]">
          <div>
            <div className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-[#C9A52A] dark:text-[#D4B12F]" />
              <h1 className="text-[22px] sm:text-[26px] font-bold text-[#17202A] dark:text-[#F2F4F7] tracking-tight leading-none">
                Tasks & Execution Control Center
              </h1>
            </div>
            <p className="text-[12.5px] text-[#667085] dark:text-[#8B95A5] mt-1">
              Track and manage execution across your organization projects, learning plans, and personal work.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            {/* View Mode Toggle */}
            <div className="flex items-center p-0.5 rounded-[9px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36]">
              <button
                type="button"
                onClick={() => setViewMode("TABLE")}
                className={`px-3 h-[32px] rounded-[7px] text-[12px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === "TABLE"
                    ? "bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10]"
                    : "text-[#667085] hover:text-[#17202A] dark:hover:text-[#F2F4F7]"
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Table</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("BOARD")}
                className={`px-3 h-[32px] rounded-[7px] text-[12px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === "BOARD"
                    ? "bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10]"
                    : "text-[#667085] hover:text-[#17202A] dark:hover:text-[#F2F4F7]"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Board</span>
              </button>
            </div>

            <button
              type="button"
              onClick={fetchTasks}
              className="p-2 rounded-[9px] border border-[#E4E7EC] dark:border-[#272D36] bg-[#FFFFFF] dark:bg-[#15191F] text-[#667085] hover:text-[#17202A] dark:hover:text-[#F2F4F7] transition-colors cursor-pointer"
              title="Refresh tasks"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-1.5 px-4 h-[38px] rounded-[9px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[12.5px] font-bold hover:opacity-90 transition-opacity shadow-xs cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Create Task</span>
            </button>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-3.5 rounded-[12px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] space-y-1">
            <div className="text-[11px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider">Total Tasks</div>
            <div className="text-[20px] font-bold text-[#17202A] dark:text-[#F2F4F7]">{summaryMetrics.total}</div>
          </div>
          <div className="p-3.5 rounded-[12px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] space-y-1">
            <div className="text-[11px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider">In Progress</div>
            <div className="text-[20px] font-bold text-blue-600 dark:text-blue-400">{summaryMetrics.inProgress}</div>
          </div>
          <div className="p-3.5 rounded-[12px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] space-y-1">
            <div className="text-[11px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider">Completed</div>
            <div className="text-[20px] font-bold text-emerald-600 dark:text-emerald-400">{summaryMetrics.completed}</div>
          </div>
          <div className="p-3.5 rounded-[12px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] space-y-1">
            <div className="text-[11px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider">Blocked</div>
            <div className="text-[20px] font-bold text-rose-600 dark:text-rose-400">{summaryMetrics.blocked}</div>
          </div>
          <div className="p-3.5 rounded-[12px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] space-y-1 col-span-2 sm:col-span-1">
            <div className="text-[11px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider">Overdue</div>
            <div className="text-[20px] font-bold text-amber-600 dark:text-amber-400">{summaryMetrics.overdue}</div>
          </div>
        </div>

        {/* Toolbar & Filters */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
            {TASK_TYPE_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTypeTab(tab)}
                className={`px-3 py-1.5 rounded-[8px] text-[12px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTypeTab === tab
                    ? "bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10]"
                    : "bg-[#FFFFFF] dark:bg-[#15191F] text-[#667085] dark:text-[#8B95A5] border border-[#E4E7EC] dark:border-[#272D36] hover:text-[#17202A]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 md:w-56">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#667085]" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 h-[36px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[8px] text-[12px] text-[#17202A] dark:text-[#F2F4F7] outline-none"
              />
            </div>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="h-[36px] px-3 bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[8px] text-[12px] font-semibold text-[#17202A] dark:text-[#F2F4F7] outline-none"
            >
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Bulk Actions Floating Toolbar ──────────────────────────────── */}
      {selectedIds.length > 0 && (
        <div className="shrink-0 p-3 rounded-[12px] bg-[#17202A] dark:bg-[#15191F] text-white flex items-center justify-between shadow-lg border border-[#C9A52A]/40 animate-in fade-in duration-200">
          <div className="text-[13px] font-bold flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#C9A52A] text-[#0B0D10] font-mono text-[11px] flex items-center justify-center">
              {selectedIds.length}
            </span>
            <span>tasks selected</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBulkDeleteModal(true)}
              className="px-3 h-[32px] rounded-[7px] bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 text-[12px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected</span>
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="p-1 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Scrollable Body Region ──────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto pb-6">
        {error ? (
          /* REAL ERROR STATE */
          <div className="p-8 text-center bg-[#FFFFFF] dark:bg-[#15191F] rounded-[14px] border border-rose-500/20 space-y-3 max-w-md mx-auto my-6">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-[15px] font-bold text-[#17202A] dark:text-[#F2F4F7]">
                Tasks couldn't be loaded
              </h3>
              <p className="text-[12px] text-[#667085] dark:text-[#8B95A5]">{error}</p>
            </div>
            <button
              onClick={fetchTasks}
              className="px-4 h-[36px] rounded-[8px] bg-[#C9A52A] text-[#0B0D10] text-[12.5px] font-bold hover:opacity-90 transition-opacity cursor-pointer inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        ) : loading ? (
          <div className="p-12 flex items-center justify-center bg-[#FFFFFF] dark:bg-[#15191F] rounded-[14px] border border-[#E4E7EC] dark:border-[#272D36]">
            <Loader2 className="w-7 h-7 animate-spin text-[#C9A52A] dark:text-[#D4B12F]" />
          </div>
        ) : filteredTasks.length === 0 ? (
          /* REAL EMPTY STATE */
          <div className="p-10 text-center bg-[#FFFFFF] dark:bg-[#15191F] rounded-[14px] border border-[#E4E7EC] dark:border-[#272D36] space-y-4 max-w-lg mx-auto my-8">
            <CheckSquare className="w-12 h-12 text-[#C9A52A] dark:text-[#D4B12F] mx-auto opacity-70" />
            <div className="space-y-1.5">
              <h3 className="text-[16.5px] font-bold text-[#17202A] dark:text-[#F2F4F7]">
                No active work yet
              </h3>
              <p className="text-[12.5px] text-[#667085] dark:text-[#8B95A5] leading-relaxed">
                Create a task to start tracking execution, assigning responsibilities, and measuring progress.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-1.5 px-5 h-[40px] rounded-[10px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[13px] font-bold hover:opacity-90 transition-opacity shadow-xs cursor-pointer mt-2"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Create Task</span>
            </button>
          </div>
        ) : viewMode === "TABLE" ? (
          /* DENSE EXECUTIVE TABLE VIEW */
          <div className="bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[14px] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12.5px]">
                <thead className="bg-[#F8F9FB] dark:bg-[#111419] border-b border-[#E4E7EC] dark:border-[#272D36] text-[11px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider">
                  <tr>
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300 text-[#C9A52A] focus:ring-[#C9A52A]"
                      />
                    </th>
                    <th className="p-3">Task</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Priority</th>
                    <th className="p-3">Assignee</th>
                    <th className="p-3">Project / Source</th>
                    <th className="p-3">Due Date</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E7EC]/60 dark:divide-[#272D36]/60">
                  {filteredTasks.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => setSelectedTask(t)}
                      className="hover:bg-[#F8F9FB] dark:hover:bg-[#111419] transition-colors cursor-pointer"
                    >
                      <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(t.id)}
                          onChange={() => toggleSelectId(t.id)}
                          className="rounded border-gray-300 text-[#C9A52A] focus:ring-[#C9A52A]"
                        />
                      </td>
                      <td className="p-3 font-semibold text-[#17202A] dark:text-[#F2F4F7]">
                        <div className="flex items-center gap-2">
                          <span>{t.title}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20 uppercase">
                          {t.type || "Task"}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${STATUS_STYLE[t.status] || STATUS_STYLE["Pending"]}`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="font-semibold text-[12px]">{t.priority || "Medium"}</span>
                      </td>
                      <td className="p-3 font-medium text-[#17202A] dark:text-[#F2F4F7]">
                        {t.assigneeName || "Unassigned"}
                      </td>
                      <td className="p-3 text-[#667085] dark:text-[#8B95A5]">
                        {t.projectName || t.sourceType || "General Workspace"}
                      </td>
                      <td className="p-3 font-mono text-[11.5px] text-[#667085]">
                        {t.deadline ? new Date(t.deadline).toLocaleDateString() : "Flexible"}
                      </td>
                      <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleStartFocus(t.id)}
                            className="p-1.5 rounded-md hover:bg-[#E4E7EC] dark:hover:bg-[#272D36] text-[#C9A52A] transition-colors"
                            title="Start Focus Session"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </button>
                          <button
                            onClick={() => setSelectedTask(t)}
                            className="p-1.5 rounded-md hover:bg-[#E4E7EC] dark:hover:bg-[#272D36] text-[#667085] transition-colors"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* KANBAN BOARD VIEW */
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {KANBAN_COLUMNS.map((col) => {
              const colTasks = filteredTasks.filter((t) => {
                if (col.id === "Not Started") return ["Draft", "Not Started", "Pending"].includes(t.status);
                if (col.id === "In Progress") return ["In Progress", "Assigned", "Accepted", "Review", "Submitted"].includes(t.status);
                if (col.id === "Blocked") return t.status === "Blocked";
                if (col.id === "Completed") return ["Completed", "Approved"].includes(t.status);
                return false;
              });

              return (
                <div
                  key={col.id}
                  className="bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[14px] p-4 flex flex-col space-y-3"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[#E4E7EC] dark:border-[#272D36]">
                    <h4 className="text-[13.5px] font-bold text-[#17202A] dark:text-[#F2F4F7]">
                      {col.title}
                    </h4>
                    <span className="w-5 h-5 rounded-full bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] text-[11px] font-mono font-bold text-[#667085] flex items-center justify-center">
                      {colTasks.length}
                    </span>
                  </div>

                  <div className="flex-1 space-y-2.5 min-h-[200px]">
                    {colTasks.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTask(t)}
                        className="p-3.5 rounded-[12px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] hover:border-[#C9A52A]/50 transition-all cursor-pointer space-y-2.5 shadow-2xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h5 className="text-[13px] font-bold text-[#17202A] dark:text-[#F2F4F7] leading-tight">
                            {t.title}
                          </h5>
                          <span className="px-2 py-0.5 rounded text-[9.5px] font-bold bg-[#C9A52A]/10 text-[#C9A52A] border border-[#C9A52A]/20 uppercase shrink-0">
                            {t.priority}
                          </span>
                        </div>

                        {t.description && (
                          <p className="text-[11.5px] text-[#667085] dark:text-[#8B95A5] line-clamp-2">
                            {t.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between text-[11px] text-[#667085] pt-2 border-t border-[#E4E7EC]/60 dark:border-[#272D36]/60">
                          <span>{t.assigneeName || "Unassigned"}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleUpdateStatus(t.id, col.id === "Completed" ? "In Progress" : "Completed"); }}
                            className="text-[#C9A52A] hover:underline font-bold"
                          >
                            {col.id === "Completed" ? "Reopen" : "Complete"}
                          </button>
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

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={() => fetchTasks()}
      />

      {/* Task Detail Modal */}
      <TaskDetailModal
        task={selectedTask}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onUpdate={() => fetchTasks()}
      />

      {/* Bulk Delete Custom Confirmation Modal */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs font-sans">
          <div className="w-full max-w-md bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[16px] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-500">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-[16px] font-bold">Delete {selectedIds.length} Selected Tasks?</h3>
            </div>
            <p className="text-[12.5px] text-[#667085] dark:text-[#8B95A5] leading-relaxed">
              This action cannot be undone. Selected tasks will be permanently removed from PostgreSQL.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowBulkDeleteModal(false)}
                className="h-[36px] px-4 rounded-[8px] border border-[#E4E7EC] dark:border-[#272D36] text-[12.5px] font-semibold text-[#667085]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isBulkProcessing}
                onClick={handleExecuteBulkDelete}
                className="h-[36px] px-5 rounded-[8px] bg-rose-500 text-white text-[12.5px] font-bold hover:bg-rose-600 transition-colors flex items-center gap-1.5"
              >
                {isBulkProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>Delete Tasks</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
