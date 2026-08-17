"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  CheckSquare, Search, Loader2, AlertCircle, User, Trash2, Plus, FolderKanban,
  RefreshCw, ChevronRight, BookOpen, Sparkles, Zap, Flame, Filter, LayoutGrid,
  List, Play, CheckCircle2, Clock, AlertTriangle, ShieldCheck, Check, X, MoreVertical, SlidersHorizontal, UserPlus, ArrowRightLeft, CornerUpRight
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { useSocket } from "@/components/providers/socket-provider";
import { CreateTaskModal } from "@/components/tasks/create-task-modal";
import { TaskDetailModal } from "@/components/tasks/task-detail-modal";
import { MobileSheet } from "@/components/ui/mobile-sheet";
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

const TASK_TYPE_CHIPS = [
  { id: "All", label: "All" },
  { id: "PROJECT WORK", label: "Project" },
  { id: "PERSONAL WORK", label: "Personal" },
  { id: "LEARNING", label: "Learning" },
  { id: "DOCUMENTATION", label: "Docs" },
  { id: "RESEARCH", label: "Research" },
  { id: "SUBMISSION", label: "Submission" },
  { id: "REVIEW", label: "Review" },
];

const PRIORITY_OPTIONS = [
  { value: "All", label: "All Priorities" },
  { value: "Low", label: "Low Priority", color: "bg-slate-400" },
  { value: "Medium", label: "Medium Priority", color: "bg-[#C9A52A]" },
  { value: "High", label: "High Priority", color: "bg-amber-500" },
  { value: "Critical", label: "Critical Priority", color: "bg-rose-500" },
];

const KANBAN_COLUMNS = [
  { id: "Not Started", title: "Not Started" },
  { id: "In Progress", title: "In Progress" },
  { id: "Blocked", title: "Blocked" },
  { id: "Completed", title: "Completed" },
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
  const [statusFilter, setStatusFilter] = useState("All");

  // Selection & Mobile Select Mode
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isMobileSelectionMode, setIsMobileSelectionMode] = useState(false);
  const lastSelectedIndexRef = useRef<number | null>(null);

  // Modals & Action Sheets
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [actionTaskSheet, setActionTaskSheet] = useState<any | null>(null);
  const [showBulkAssignSheet, setShowBulkAssignSheet] = useState(false);
  const [showBulkStatusSheet, setShowBulkStatusSheet] = useState(false);
  const [showBulkPrioritySheet, setShowBulkPrioritySheet] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Workspace Directory
  const [assignableUsers, setAssignableUsers] = useState<any[]>([]);

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
    // Load directory for bulk assign
    apiClient.get("/org/projects/eligible-assignees").then((res) => {
      if (res.data?.data?.all) setAssignableUsers(res.data.data.all);
    }).catch(() => null);
  }, [fetchTasks]);

  useEffect(() => {
    if (!socket) return;
    socket.on("task.created", fetchTasks);
    socket.on("task.updated", fetchTasks);
    socket.on("task.deleted", fetchTasks);
    return () => {
      socket.off("task.created", fetchTasks);
      socket.off("task.updated", fetchTasks);
      socket.off("task.deleted", fetchTasks);
    };
  }, [socket, fetchTasks]);

  // Esc key clears selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedIds([]);
        setIsMobileSelectionMode(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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

      const matchStatus =
        statusFilter === "All" ||
        (t.status || "").toLowerCase() === statusFilter.toLowerCase();

      return matchSearch && matchType && matchPriority && matchStatus;
    });
  }, [tasks, search, activeTypeTab, priorityFilter, statusFilter]);

  // Metrics
  const summaryMetrics = useMemo(() => {
    const total = tasks.length;
    const active = tasks.filter((t) => ["In Progress", "Accepted", "Assigned"].includes(t.status)).length;
    const completed = tasks.filter((t) => ["Completed", "Approved"].includes(t.status)).length;
    const overdue = tasks.filter((t) => t.deadline && new Date(t.deadline) < new Date() && !["Completed", "Approved"].includes(t.status)).length;
    return { total, active, completed, overdue };
  }, [tasks]);

  // Master Checkbox State
  const isAllSelected = filteredTasks.length > 0 && filteredTasks.every((t) => selectedIds.includes(t.id));
  const isIndeterminate = selectedIds.length > 0 && !isAllSelected;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredTasks.map((t) => t.id));
    }
  };

  const handleTaskRowClick = (task: any, index: number, e: React.MouseEvent) => {
    if (e.shiftKey && lastSelectedIndexRef.current !== null) {
      // Range selection
      const start = Math.min(lastSelectedIndexRef.current, index);
      const end = Math.max(lastSelectedIndexRef.current, index);
      const rangeIds = filteredTasks.slice(start, end + 1).map((t) => t.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...rangeIds])));
    } else if (selectedIds.length > 0 || isMobileSelectionMode) {
      // Toggle single item selection
      toggleSelectId(task.id);
      lastSelectedIndexRef.current = index;
    } else {
      // Normal click opens task details
      setSelectedTask(task);
    }
  };

  const toggleSelectId = (id: string) => {
    setSelectedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id];
      if (next.length === 0) setIsMobileSelectionMode(false);
      return next;
    });
  };

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

  // Bulk API Handlers
  const handleExecuteBulkStatus = async (status: string) => {
    setIsBulkProcessing(true);
    try {
      await apiClient.post("/org/tasks/bulk/status", { taskIds: selectedIds, status });
      setShowBulkStatusSheet(false);
      fetchTasks();
    } catch (e) {
      console.error("Bulk status error:", e);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleExecuteBulkPriority = async (priority: string) => {
    setIsBulkProcessing(true);
    try {
      await apiClient.post("/org/tasks/bulk/priority", { taskIds: selectedIds, priority });
      setShowBulkPrioritySheet(false);
      fetchTasks();
    } catch (e) {
      console.error("Bulk priority error:", e);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleExecuteBulkAssign = async (assigneeId: string) => {
    setIsBulkProcessing(true);
    try {
      await apiClient.post("/org/tasks/bulk/assign", { taskIds: selectedIds, assigneeId });
      setShowBulkAssignSheet(false);
      fetchTasks();
    } catch (e) {
      console.error("Bulk assign error:", e);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleExecuteBulkComplete = async () => {
    setIsBulkProcessing(true);
    try {
      await apiClient.post("/org/tasks/bulk/complete", { taskIds: selectedIds });
      setSelectedIds([]);
      setIsMobileSelectionMode(false);
      fetchTasks();
    } catch (e) {
      console.error("Bulk complete error:", e);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleExecuteBulkDelete = async () => {
    setIsBulkProcessing(true);
    try {
      await apiClient.delete("/org/tasks/bulk", { data: { taskIds: selectedIds } });
      setSelectedIds([]);
      setIsMobileSelectionMode(false);
      setShowBulkDeleteModal(false);
      fetchTasks();
    } catch (e) {
      console.error("Bulk delete error:", e);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleStartFocus = (taskId: string) => {
    router.push(`/ceo/focus?taskId=${taskId}`);
  };

  return (
    <div className="w-full h-full min-h-0 flex-1 flex flex-col justify-between overflow-hidden px-3 sm:px-6 md:px-10 py-3 sm:py-4 max-w-[1400px] mx-auto bg-[#F8F9FB] dark:bg-[#0B0E12] text-[#17202A] dark:text-[#F2F4F7] font-sans space-y-3 select-none">
      
      {/* ── HEADER REGION (Zero Page Scroll) ───────────────────────── */}
      <div className="shrink-0 space-y-2.5">
        
        {/* Title Bar or Mobile Selection Header */}
        {isMobileSelectionMode ? (
          /* Mobile Selection Top Header */
          <div className="flex items-center justify-between pb-2 border-b border-[#C9A52A]/40 bg-[#C9A52A]/10 -mx-3 px-3 py-2">
            <div className="flex items-center gap-2 text-[14px] font-bold text-[#17202A] dark:text-[#F2F4F7]">
              <span className="w-6 h-6 rounded-full bg-[#C9A52A] text-[#0B0D10] font-mono text-[12px] flex items-center justify-center font-bold">
                {selectedIds.length}
              </span>
              <span>selected</span>
            </div>
            <button
              onClick={() => { setSelectedIds([]); setIsMobileSelectionMode(false); }}
              className="px-3 py-1 rounded-[6px] bg-[#C9A52A] text-[#0B0D10] text-[12px] font-bold cursor-pointer"
            >
              Done
            </button>
          </div>
        ) : (
          /* Normal Header */
          <div className="flex items-center justify-between gap-3 pb-2 border-b border-[#E4E7EC] dark:border-[#272D36]">
            <div>
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-[#C9A52A] dark:text-[#D4B12F]" />
                <h1 className="text-[20px] sm:text-[24px] font-bold text-[#17202A] dark:text-[#F2F4F7] tracking-tight leading-none">
                  Tasks
                </h1>
              </div>
              <p className="text-[12px] text-[#667085] dark:text-[#8B95A5] mt-1 hidden sm:block">
                Tasks & Execution Control Center — Track execution across projects, learning plans, and organizational work.
              </p>
              <p className="text-[11.5px] text-[#667085] dark:text-[#8B95A5] mt-0.5 sm:hidden">
                Execution workspace
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center p-0.5 rounded-[8px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36]">
                <button
                  type="button"
                  onClick={() => setViewMode("TABLE")}
                  className={`px-2.5 h-[30px] rounded-[6px] text-[11.5px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    viewMode === "TABLE"
                      ? "bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10]"
                      : "text-[#667085] hover:text-[#17202A] dark:hover:text-[#F2F4F7]"
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Table</span>
                  <span className="sm:hidden">List</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("BOARD")}
                  className={`px-2.5 h-[30px] rounded-[6px] text-[11.5px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    viewMode === "BOARD"
                      ? "bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10]"
                      : "text-[#667085] hover:text-[#17202A] dark:hover:text-[#F2F4F7]"
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Board</span>
                </button>
              </div>

              <button
                type="button"
                onClick={fetchTasks}
                className="p-1.5 rounded-[8px] border border-[#E4E7EC] dark:border-[#272D36] bg-[#FFFFFF] dark:bg-[#15191F] text-[#667085] hover:text-[#17202A] transition-colors cursor-pointer"
                title="Refresh"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="hidden md:inline-flex items-center gap-1.5 px-4 h-[36px] rounded-[9px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[12.5px] font-bold hover:opacity-90 transition-opacity shadow-xs cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Create Task</span>
              </button>
            </div>
          </div>
        )}

        {/* ── DESKTOP STICKY BULK ACTION TOOLBAR (Visible on Desktop when selection active) ── */}
        {selectedIds.length > 0 && (
          <div className="hidden md:flex items-center justify-between p-2.5 rounded-[12px] bg-[#17202A] dark:bg-[#15191F] text-white shadow-lg border border-[#C9A52A]/40 animate-in fade-in duration-150">
            <div className="text-[12.5px] font-bold flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#C9A52A] text-[#0B0D10] font-mono text-[11px] flex items-center justify-center font-bold">
                {selectedIds.length}
              </span>
              <span>selected</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowBulkAssignSheet(true)}
                className="px-3 h-[30px] rounded-[7px] bg-[#FFFFFF]/10 hover:bg-[#FFFFFF]/20 text-[11.5px] font-semibold flex items-center gap-1 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5 text-[#C9A52A]" />
                <span>Assign</span>
              </button>
              <button
                onClick={() => setShowBulkStatusSheet(true)}
                className="px-3 h-[30px] rounded-[7px] bg-[#FFFFFF]/10 hover:bg-[#FFFFFF]/20 text-[11.5px] font-semibold flex items-center gap-1 cursor-pointer"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-blue-400" />
                <span>Status</span>
              </button>
              <button
                onClick={() => setShowBulkPrioritySheet(true)}
                className="px-3 h-[30px] rounded-[7px] bg-[#FFFFFF]/10 hover:bg-[#FFFFFF]/20 text-[11.5px] font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>Priority</span>
              </button>
              <button
                onClick={handleExecuteBulkComplete}
                className="px-3 h-[30px] rounded-[7px] bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-[11.5px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Complete</span>
              </button>
              <button
                onClick={() => setShowBulkDeleteModal(true)}
                className="px-3 h-[30px] rounded-[7px] bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 text-[11.5px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>

              <div className="w-[1px] h-5 bg-white/20 mx-1" />

              <button
                onClick={() => { setSelectedIds([]); setIsMobileSelectionMode(false); }}
                className="text-slate-400 hover:text-white text-[11.5px] font-medium"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Desktop 5 KPI Cards */}
        {selectedIds.length === 0 && (
          <div className="hidden md:grid grid-cols-5 gap-3">
            <div className="p-3 rounded-[12px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] space-y-0.5">
              <div className="text-[10.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider">Total Tasks</div>
              <div className="text-[18px] font-bold text-[#17202A] dark:text-[#F2F4F7]">{summaryMetrics.total}</div>
            </div>
            <div className="p-3 rounded-[12px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] space-y-0.5">
              <div className="text-[10.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider">Active</div>
              <div className="text-[18px] font-bold text-blue-600 dark:text-blue-400">{summaryMetrics.active}</div>
            </div>
            <div className="p-3 rounded-[12px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] space-y-0.5">
              <div className="text-[10.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider">Completed</div>
              <div className="text-[18px] font-bold text-emerald-600 dark:text-emerald-400">{summaryMetrics.completed}</div>
            </div>
            <div className="p-3 rounded-[12px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] space-y-0.5">
              <div className="text-[10.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider">Overdue</div>
              <div className="text-[18px] font-bold text-amber-600 dark:text-amber-400">{summaryMetrics.overdue}</div>
            </div>
            <div className="p-3 rounded-[12px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] space-y-0.5">
              <div className="text-[10.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider">Filtered</div>
              <div className="text-[18px] font-bold text-[#C9A52A] dark:text-[#D4B12F]">{filteredTasks.length}</div>
            </div>
          </div>
        )}

        {/* Mobile Compact Single-Row Metric Strip */}
        {!isMobileSelectionMode && (
          <div className="md:hidden flex items-center justify-between px-3 py-2 rounded-[10px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] text-[11.5px] font-bold shrink-0">
            <div className="flex flex-col items-center">
              <span className="text-[#17202A] dark:text-[#F2F4F7] text-[13px]">{summaryMetrics.total}</span>
              <span className="text-[9.5px] text-[#667085] uppercase">Total</span>
            </div>
            <div className="w-[1px] h-5 bg-[#E4E7EC] dark:bg-[#272D36]" />
            <div className="flex flex-col items-center">
              <span className="text-blue-600 dark:text-blue-400 text-[13px]">{summaryMetrics.active}</span>
              <span className="text-[9.5px] text-[#667085] uppercase">Active</span>
            </div>
            <div className="w-[1px] h-5 bg-[#E4E7EC] dark:bg-[#272D36]" />
            <div className="flex flex-col items-center">
              <span className="text-emerald-600 dark:text-emerald-400 text-[13px]">{summaryMetrics.completed}</span>
              <span className="text-[9.5px] text-[#667085] uppercase">Done</span>
            </div>
            <div className="w-[1px] h-5 bg-[#E4E7EC] dark:bg-[#272D36]" />
            <div className="flex flex-col items-center">
              <span className="text-amber-600 dark:text-amber-400 text-[13px]">{summaryMetrics.overdue}</span>
              <span className="text-[9.5px] text-[#667085] uppercase">Due</span>
            </div>
          </div>
        )}

        {/* Filter Chips Row */}
        {!isMobileSelectionMode && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] whitespace-nowrap">
            {TASK_TYPE_CHIPS.map((chip) => (
              <button
                key={chip.id}
                onClick={() => setActiveTypeTab(chip.id)}
                className={`px-3 py-1 rounded-[7px] text-[11.5px] font-bold transition-all cursor-pointer shrink-0 ${
                  activeTypeTab === chip.id
                    ? "bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10]"
                    : "bg-[#FFFFFF] dark:bg-[#15191F] text-[#667085] dark:text-[#8B95A5] border border-[#E4E7EC] dark:border-[#272D36]"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        )}

        {/* Search Bar & Mobile Filter Trigger */}
        {!isMobileSelectionMode && (
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#667085]" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 h-[34px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[8px] text-[12px] text-[#17202A] dark:text-[#F2F4F7] outline-none"
              />
            </div>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="hidden md:block h-[34px] px-3 bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[8px] text-[12px] font-semibold text-[#17202A] dark:text-[#F2F4F7] outline-none"
            >
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setShowFilterSheet(true)}
              className="md:hidden h-[34px] px-3 rounded-[8px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] text-[12px] font-bold text-[#17202A] dark:text-[#F2F4F7] flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#C9A52A]" />
              <span>Filter</span>
            </button>
          </div>
        )}
      </div>

      {/* ── INTERNAL SCROLL CONTAINER (Only this container scrolls) ────── */}
      <div className="flex-1 min-h-0 w-full overflow-hidden flex flex-col">
        {error ? (
          <div className="p-6 text-center bg-[#FFFFFF] dark:bg-[#15191F] rounded-[14px] border border-rose-500/20 space-y-3 max-w-md mx-auto my-auto">
            <AlertCircle className="w-9 h-9 text-rose-500 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-[14.5px] font-bold text-[#17202A] dark:text-[#F2F4F7]">
                Couldn't load tasks
              </h3>
              <p className="text-[11.5px] text-[#667085] dark:text-[#8B95A5]">{error}</p>
            </div>
            <button
              onClick={fetchTasks}
              className="px-4 h-[34px] rounded-[8px] bg-[#C9A52A] text-[#0B0D10] text-[12px] font-bold hover:opacity-90 transition-opacity cursor-pointer inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        ) : loading ? (
          <div className="p-10 flex items-center justify-center bg-[#FFFFFF] dark:bg-[#15191F] rounded-[14px] border border-[#E4E7EC] dark:border-[#272D36] my-auto">
            <Loader2 className="w-6 h-6 animate-spin text-[#C9A52A] dark:text-[#D4B12F]" />
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="p-6 text-center bg-[#FFFFFF] dark:bg-[#15191F] rounded-[14px] border border-[#E4E7EC] dark:border-[#272D36] space-y-2 max-w-sm mx-auto my-auto">
            <CheckSquare className="w-9 h-9 text-[#C9A52A] dark:text-[#D4B12F] mx-auto opacity-70" />
            <div className="space-y-1">
              <h3 className="text-[14px] font-bold text-[#17202A] dark:text-[#F2F4F7]">
                No active work
              </h3>
              <p className="text-[11.5px] text-[#667085] dark:text-[#8B95A5]">
                Your assigned tasks will appear here.
              </p>
            </div>
          </div>
        ) : viewMode === "TABLE" ? (
          <>
            {/* DESKTOP TABLE VIEW */}
            <div className="hidden md:block h-full min-h-0 overflow-y-auto bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[14px] shadow-xs">
              <table className="w-full text-left text-[12.5px]">
                <thead className="sticky top-0 z-10 bg-[#F8F9FB] dark:bg-[#111419] border-b border-[#E4E7EC] dark:border-[#272D36] text-[11px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider">
                  <tr>
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        ref={(el) => { if (el) el.indeterminate = isIndeterminate; }}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300 text-[#C9A52A]"
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
                  {filteredTasks.map((t, index) => {
                    const isSelected = selectedIds.includes(t.id);
                    return (
                      <tr
                        key={t.id}
                        onClick={(e) => handleTaskRowClick(t, index, e)}
                        className={`transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-[#C9A52A]/10 dark:bg-[#C9A52A]/15 border-l-4 border-l-[#C9A52A]"
                            : "hover:bg-[#F8F9FB] dark:hover:bg-[#111419]"
                        }`}
                      >
                        <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectId(t.id)}
                            className="rounded border-gray-300 text-[#C9A52A]"
                          />
                        </td>
                        <td className="p-3 font-semibold text-[#17202A] dark:text-[#F2F4F7]">
                          {t.title}
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
                        <td className="p-3 font-semibold text-[12px]">
                          {t.priority || "Medium"}
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
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* MOBILE COMPACT CARDS LIST */}
            <div className="md:hidden h-full min-h-0 overflow-y-auto space-y-2 pb-20">
              {filteredTasks.map((t, index) => {
                const isSelected = selectedIds.includes(t.id);
                return (
                  <div
                    key={t.id}
                    onClick={(e) => handleTaskRowClick(t, index, e)}
                    className={`p-3 rounded-[12px] border transition-all cursor-pointer space-y-2 ${
                      isSelected
                        ? "border-[#C9A52A] bg-[#C9A52A]/10 ring-1 ring-[#C9A52A]"
                        : "bg-[#FFFFFF] dark:bg-[#15191F] border-[#E4E7EC] dark:border-[#272D36]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        {isMobileSelectionMode && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectId(t.id)}
                            className="mt-1 rounded border-gray-300 text-[#C9A52A]"
                          />
                        )}
                        <div>
                          <h4 className="text-[13.5px] font-bold text-[#17202A] dark:text-[#F2F4F7] leading-tight">
                            {t.title}
                          </h4>
                          <div className="text-[10.5px] font-semibold text-[#667085] dark:text-[#8B95A5] mt-0.5 flex items-center gap-1.5">
                            <span className="uppercase text-[#C9A52A] font-bold">{t.type || "Task"}</span>
                            <span>•</span>
                            <span>{t.projectName || "Workspace"}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={(e) => { e.stopPropagation(); setActionTaskSheet(t); }}
                        className="p-1 text-[#667085] hover:text-[#17202A]"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#C9A52A]/10 text-[#C9A52A] border border-[#C9A52A]/20 uppercase">
                          ● {t.priority || "Medium"}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_STYLE[t.status] || STATUS_STYLE["Pending"]}`}>
                          {t.status}
                        </span>
                      </div>

                      <div className="text-[10.5px] text-[#667085] font-mono">
                        {t.deadline ? new Date(t.deadline).toLocaleDateString([], { month: "short", day: "numeric" }) : "Flexible"}
                      </div>
                    </div>

                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between text-[10px] font-mono text-[#667085]">
                        <span>Assignee: {t.assigneeName || "Unassigned"}</span>
                        <span>{t.progressPercent || (t.status === "Completed" ? 100 : 0)}%</span>
                      </div>
                      <div className="h-1 w-full bg-[#E4E7EC] dark:bg-[#272D36] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#C9A52A] dark:bg-[#D4B12F] rounded-full"
                          style={{ width: `${t.progressPercent || (t.status === "Completed" ? 100 : 0)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          /* KANBAN BOARD VIEW */
          <div className="h-full min-h-0 overflow-x-auto flex gap-3 pb-2">
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
                  className="w-72 sm:w-80 shrink-0 h-full min-h-0 bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[14px] p-3 flex flex-col space-y-2"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[#E4E7EC] dark:border-[#272D36]">
                    <h4 className="text-[13px] font-bold text-[#17202A] dark:text-[#F2F4F7]">
                      {col.title}
                    </h4>
                    <span className="w-5 h-5 rounded-full bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] text-[11px] font-mono font-bold text-[#667085] flex items-center justify-center">
                      {colTasks.length}
                    </span>
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-0.5">
                    {colTasks.map((t) => {
                      const isSelected = selectedIds.includes(t.id);
                      return (
                        <div
                          key={t.id}
                          onClick={() => toggleSelectId(t.id)}
                          className={`p-3 rounded-[10px] border space-y-2 cursor-pointer transition-all ${
                            isSelected
                              ? "border-[#C9A52A] bg-[#C9A52A]/10 ring-1 ring-[#C9A52A]"
                              : "bg-[#F8F9FB] dark:bg-[#111419] border-[#E4E7EC] dark:border-[#272D36]"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1.5">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectId(t.id)}
                                className="rounded border-gray-300 text-[#C9A52A]"
                              />
                              <h5 className="text-[12.5px] font-bold text-[#17202A] dark:text-[#F2F4F7] leading-tight">
                                {t.title}
                              </h5>
                            </div>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#C9A52A]/10 text-[#C9A52A] uppercase shrink-0">
                              {t.priority}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[10.5px] text-[#667085]">
                            <span>{t.assigneeName || "Unassigned"}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleUpdateStatus(t.id, col.id === "Completed" ? "In Progress" : "Completed"); }}
                              className="text-[#C9A52A] font-bold"
                            >
                              {col.id === "Completed" ? "Reopen" : "Done"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── MOBILE SELECTION BOTTOM ACTION BAR (Visible in Mobile Selection Mode) ── */}
      {selectedIds.length > 0 && (
        <div className="md:hidden fixed bottom-16 inset-x-3 z-40 p-3 rounded-[12px] bg-[#17202A] dark:bg-[#15191F] text-white flex items-center justify-around shadow-2xl border border-[#C9A52A]/50 animate-in slide-in-from-bottom duration-200">
          <button
            onClick={() => setShowBulkAssignSheet(true)}
            className="flex flex-col items-center gap-1 text-[11px] font-bold text-slate-300 hover:text-white"
          >
            <UserPlus className="w-4 h-4 text-[#C9A52A]" />
            <span>Assign</span>
          </button>
          <button
            onClick={() => setShowBulkStatusSheet(true)}
            className="flex flex-col items-center gap-1 text-[11px] font-bold text-slate-300 hover:text-white"
          >
            <ArrowRightLeft className="w-4 h-4 text-blue-400" />
            <span>Status</span>
          </button>
          <button
            onClick={() => setShowBulkPrioritySheet(true)}
            className="flex flex-col items-center gap-1 text-[11px] font-bold text-slate-300 hover:text-white"
          >
            <Flame className="w-4 h-4 text-amber-400" />
            <span>Priority</span>
          </button>
          <button
            onClick={handleExecuteBulkComplete}
            className="flex flex-col items-center gap-1 text-[11px] font-bold text-emerald-400"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Complete</span>
          </button>
          <button
            onClick={() => setShowBulkDeleteModal(true)}
            className="flex flex-col items-center gap-1 text-[11px] font-bold text-rose-400"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete</span>
          </button>
        </div>
      )}

      {/* ── MOBILE PRIMARY FLOATING CREATION BUTTON (56px Circle) ─────── */}
      {!isMobileSelectionMode && (
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="md:hidden fixed bottom-20 right-5 z-40 w-14 h-14 rounded-full bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] shadow-xl flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-transform"
          aria-label="Create Task"
        >
          <Plus className="w-7 h-7 stroke-[2.5]" />
        </button>
      )}

      {/* ── BULK ASSIGN BOTTOM SHEET ───────────────────────────────────── */}
      <MobileSheet
        isOpen={showBulkAssignSheet}
        onClose={() => setShowBulkAssignSheet(false)}
        title={`Assign ${selectedIds.length} Tasks`}
      >
        <div className="space-y-3 p-4 text-[13px]">
          <p className="text-[12px] text-[#667085]">Select an organization member to reassign selected tasks:</p>
          <div className="max-h-[220px] overflow-y-auto border border-[#E4E7EC] dark:border-[#272D36] rounded-[10px] divide-y divide-[#E4E7EC] dark:divide-[#272D36]">
            {assignableUsers.map((u) => (
              <button
                key={u.id}
                onClick={() => handleExecuteBulkAssign(u.id)}
                className="w-full p-3 text-left hover:bg-[#F8F9FB] dark:hover:bg-[#111419] flex items-center justify-between transition-colors"
              >
                <div>
                  <div className="font-bold text-[#17202A] dark:text-[#F2F4F7]">{u.name}</div>
                  <div className="text-[11px] text-[#667085]">{u.role} — {u.email}</div>
                </div>
                <User className="w-4 h-4 text-[#C9A52A]" />
              </button>
            ))}
          </div>
        </div>
      </MobileSheet>

      {/* ── BULK STATUS BOTTOM SHEET ──────────────────────────────────── */}
      <MobileSheet
        isOpen={showBulkStatusSheet}
        onClose={() => setShowBulkStatusSheet(false)}
        title={`Change Status for ${selectedIds.length} Tasks`}
      >
        <div className="space-y-2 p-4 text-[13px]">
          {["Not Started", "In Progress", "Blocked", "Completed"].map((st) => (
            <button
              key={st}
              onClick={() => handleExecuteBulkStatus(st)}
              className="w-full p-3 rounded-[9px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] font-bold text-left hover:border-[#C9A52A] flex items-center justify-between"
            >
              <span>{st}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10.5px] border ${STATUS_STYLE[st]}`}>{st}</span>
            </button>
          ))}
        </div>
      </MobileSheet>

      {/* ── BULK PRIORITY BOTTOM SHEET ────────────────────────────────── */}
      <MobileSheet
        isOpen={showBulkPrioritySheet}
        onClose={() => setShowBulkPrioritySheet(false)}
        title={`Change Priority for ${selectedIds.length} Tasks`}
      >
        <div className="space-y-2 p-4 text-[13px]">
          {["Low", "Medium", "High", "Critical"].map((pr) => (
            <button
              key={pr}
              onClick={() => handleExecuteBulkPriority(pr)}
              className="w-full p-3 rounded-[9px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] font-bold text-left hover:border-[#C9A52A] flex items-center justify-between"
            >
              <span>{pr} Priority</span>
              <span className="text-[11px] font-mono text-[#C9A52A]">{pr}</span>
            </button>
          ))}
        </div>
      </MobileSheet>

      {/* ── MOBILE FILTER BOTTOM SHEET ─────────────────────────────────── */}
      <MobileSheet
        isOpen={showFilterSheet}
        onClose={() => setShowFilterSheet(false)}
        title="Filter Tasks"
      >
        <div className="space-y-4 p-4 text-[13px]">
          <div className="space-y-1.5">
            <label className="font-bold text-[#17202A] dark:text-[#F2F4F7]">Task Type</label>
            <select
              value={activeTypeTab}
              onChange={(e) => setActiveTypeTab(e.target.value)}
              className="w-full h-[40px] px-3 rounded-[9px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] outline-none"
            >
              {TASK_TYPE_CHIPS.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-[#17202A] dark:text-[#F2F4F7]">Priority</label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full h-[40px] px-3 rounded-[9px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] outline-none"
            >
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 pt-3">
            <button
              onClick={() => { setActiveTypeTab("All"); setPriorityFilter("All"); setStatusFilter("All"); setShowFilterSheet(false); }}
              className="flex-1 h-[40px] rounded-[10px] border border-[#E4E7EC] dark:border-[#272D36] font-bold text-[#667085]"
            >
              Reset
            </button>
            <button
              onClick={() => setShowFilterSheet(false)}
              className="flex-1 h-[40px] rounded-[10px] bg-[#C9A52A] text-[#0B0D10] font-bold"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </MobileSheet>

      {/* ── MOBILE QUICK TASK ACTIONS SHEET ───────────────────────────── */}
      <MobileSheet
        isOpen={!!actionTaskSheet}
        onClose={() => setActionTaskSheet(null)}
        title={actionTaskSheet?.title}
      >
        <div className="space-y-2 p-4 text-[13.5px]">
          <button
            onClick={() => {
              const id = actionTaskSheet?.id;
              if (id) {
                setSelectedIds([id]);
                setIsMobileSelectionMode(true);
              }
              setActionTaskSheet(null);
            }}
            className="w-full p-3 rounded-[10px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] font-bold flex items-center gap-2 text-[#17202A] dark:text-[#F2F4F7]"
          >
            <CheckSquare className="w-4 h-4 text-[#C9A52A]" />
            <span>Select Task for Bulk Execution</span>
          </button>
          <button
            onClick={() => { const id = actionTaskSheet?.id; setActionTaskSheet(null); handleStartFocus(id); }}
            className="w-full p-3 rounded-[10px] bg-[#C9A52A]/10 text-[#C9A52A] font-bold flex items-center gap-2"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Start Focus Session</span>
          </button>
          <button
            onClick={() => { const id = actionTaskSheet?.id; setActionTaskSheet(null); handleUpdateStatus(id, "Completed"); }}
            className="w-full p-3 rounded-[10px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] font-semibold text-emerald-600 flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Mark as Completed</span>
          </button>
          <button
            onClick={() => { const t = actionTaskSheet; setActionTaskSheet(null); setSelectedTask(t); }}
            className="w-full p-3 rounded-[10px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] font-semibold text-[#17202A] dark:text-[#F2F4F7] flex items-center gap-2"
          >
            <ChevronRight className="w-4 h-4" />
            <span>View Task Details</span>
          </button>
        </div>
      </MobileSheet>

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
