"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  CheckSquare, Search, Loader2, AlertCircle, User, Trash2, Plus, FolderKanban,
  RefreshCw, ChevronRight, BookOpen, Sparkles, Zap, Flame, Filter, LayoutGrid,
  List, Play, CheckCircle2, Clock, AlertTriangle, ShieldCheck, Check, X, MoreVertical, SlidersHorizontal, UserPlus, ArrowRightLeft, CornerUpRight, ChevronDown
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

const PRIMARY_MOBILE_CHIPS = [
  { id: "All", label: "All" },
  { id: "PROJECT WORK", label: "Project Work" },
  { id: "PERSONAL WORK", label: "Personal Work" },
  { id: "LEARNING", label: "Learning" },
];

const MORE_MOBILE_CHIPS = [
  { id: "DOCUMENTATION", label: "Docs" },
  { id: "RESEARCH", label: "Research" },
  { id: "SUBMISSION", label: "Submission" },
  { id: "REVIEW", label: "Review" },
];

const TASK_TYPE_CHIPS = [...PRIMARY_MOBILE_CHIPS, ...MORE_MOBILE_CHIPS];

const PRIORITY_OPTIONS = [
  { value: "All", label: "All Priorities" },
  { value: "Low", label: "Low Priority" },
  { value: "Medium", label: "Medium Priority" },
  { value: "High", label: "High Priority" },
  { value: "Critical", label: "Critical Priority" },
];

const STATUS_OPTIONS = [
  { value: "All", label: "All Statuses" },
  { value: "Not Started", label: "Not Started" },
  { value: "In Progress", label: "In Progress" },
  { value: "Blocked", label: "Blocked" },
  { value: "Completed", label: "Completed" },
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
  const [assigneeFilter, setAssigneeFilter] = useState("All");

  // Selection & Mobile Select Mode
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isMobileSelectionMode, setIsMobileSelectionMode] = useState(false);
  const lastSelectedIndexRef = useRef<number | null>(null);

  // Modals & Action Sheets
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [showMoreCategorySheet, setShowMoreCategorySheet] = useState(false);
  const [actionTaskSheet, setActionTaskSheet] = useState<any | null>(null);
  const [showBulkAssignSheet, setShowBulkAssignSheet] = useState(false);
  const [showBulkStatusSheet, setShowBulkStatusSheet] = useState(false);
  const [showBulkPrioritySheet, setShowBulkPrioritySheet] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Directory for Assignee dropdown
  const [assignableUsers, setAssignableUsers] = useState<any[]>([]);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : undefined;
      const res = await apiClient.get(`/org/tasks${wsId ? `?workspaceId=${wsId}` : ""}`);
      if (res.data?.success) {
        setTasks(res.data.data || []);
        setError("");
      } else {
        setError(res.data?.error || "Failed to load tasks.");
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || "Unable to load task workspace data.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDirectory = useCallback(async () => {
    try {
      const res = await apiClient.get("/org/directory");
      if (res.data?.success) {
        setAssignableUsers(res.data.data || []);
      }
    } catch (e) {
      console.error("Failed to fetch assignable users:", e);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    fetchDirectory();
  }, [fetchTasks, fetchDirectory]);

  // Realtime WebSocket listeners
  useEffect(() => {
    if (!socket) return;
    const handleTaskUpdated = () => fetchTasks();
    const handleTaskCreated = () => fetchTasks();
    const handleTaskDeleted = () => fetchTasks();

    socket.on("task_updated", handleTaskUpdated);
    socket.on("task_created", handleTaskCreated);
    socket.on("task_deleted", handleTaskDeleted);

    return () => {
      socket.off("task_updated", handleTaskUpdated);
      socket.off("task_created", handleTaskCreated);
      socket.off("task_deleted", handleTaskDeleted);
    };
  }, [socket, fetchTasks]);

  // Filter Logic
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchesSearch =
        (t.title || "").toLowerCase().includes(search.toLowerCase()) ||
        (t.projectName || "").toLowerCase().includes(search.toLowerCase()) ||
        (t.assigneeName || "").toLowerCase().includes(search.toLowerCase());

      const matchesType =
        activeTypeTab === "All" ||
        (t.taskType || "").toUpperCase() === activeTypeTab.toUpperCase() ||
        (activeTypeTab === "PROJECT WORK" && t.projectId) ||
        (activeTypeTab === "PERSONAL WORK" && !t.projectId);

      const matchesPriority = priorityFilter === "All" || (t.priority || "").toLowerCase() === priorityFilter.toLowerCase();
      const matchesStatus = statusFilter === "All" || (t.status || "").toLowerCase() === statusFilter.toLowerCase();
      const matchesAssignee = assigneeFilter === "All" || t.assigneeId === assigneeFilter;

      return matchesSearch && matchesType && matchesPriority && matchesStatus && matchesAssignee;
    });
  }, [tasks, search, activeTypeTab, priorityFilter, statusFilter, assigneeFilter]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (activeTypeTab !== "All") count++;
    if (priorityFilter !== "All") count++;
    if (statusFilter !== "All") count++;
    if (assigneeFilter !== "All") count++;
    return count;
  }, [activeTypeTab, priorityFilter, statusFilter, assigneeFilter]);

  const isMoreCategoryActive = MORE_MOBILE_CHIPS.some((c) => c.id === activeTypeTab);

  // Bulk Operations
  const isAllSelected = useMemo(() => {
    return filteredTasks.length > 0 && filteredTasks.every((t) => selectedIds.includes(t.id));
  }, [filteredTasks, selectedIds]);

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
      setIsMobileSelectionMode(false);
    } else {
      setSelectedIds(filteredTasks.map((t) => t.id));
    }
  };

  const handleTaskClick = (task: any, index: number, event: React.MouseEvent) => {
    if (event.shiftKey && lastSelectedIndexRef.current !== null) {
      const start = Math.min(lastSelectedIndexRef.current, index);
      const end = Math.max(lastSelectedIndexRef.current, index);
      const rangeIds = filteredTasks.slice(start, end + 1).map((t) => t.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...rangeIds])));
    } else if (selectedIds.length > 0 || isMobileSelectionMode) {
      toggleSelectId(task.id);
      lastSelectedIndexRef.current = index;
    } else {
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

  const handleExecuteBulkAssignee = async (assigneeId: string) => {
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

  const handleExecuteBulkDelete = async () => {
    setIsBulkProcessing(true);
    try {
      await apiClient.post("/org/tasks/bulk/delete", { taskIds: selectedIds });
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
    <div className="w-full min-h-full flex flex-col justify-between p-3.5 sm:p-6 md:p-8 max-w-[1600px] mx-auto bg-[#F8F9FB] dark:bg-[#0B0E12] text-[#17202A] dark:text-[#F2F4F7] font-sans space-y-4 select-none pb-20 md:pb-6">
      
      {/* ── HEADER REGION ──────────────────────────────────────────────── */}
      <div className="shrink-0 space-y-3">
        
        {/* Title Bar or Mobile Selection Header */}
        {isMobileSelectionMode ? (
          <div className="flex items-center justify-between pb-2 border-b border-[#C9A52A]/40 bg-[#C9A52A]/10 -mx-3.5 px-3.5 py-2">
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
          <div className="flex items-center justify-between gap-3 pb-2 border-b border-[#E4E7EC] dark:border-[#272D36]">
            <div>
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-[#C9A52A] dark:text-[#D4B12F]" />
                <h1 className="text-[20px] sm:text-[26px] font-bold text-[#17202A] dark:text-[#F2F4F7] tracking-tight leading-none">
                  Tasks
                </h1>
              </div>
              <p className="text-[12px] text-[#667085] dark:text-[#8B95A5] mt-1">
                Execution workspace
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* View Switcher Controls */}
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
                  <span className="sm:hidden">List</span>
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
                  <span>Board</span>
                </button>
              </div>

              <button
                type="button"
                onClick={fetchTasks}
                className="p-2 rounded-[9px] border border-[#E4E7EC] dark:border-[#272D36] bg-[#FFFFFF] dark:bg-[#15191F] text-[#667085] hover:text-[#17202A] transition-colors cursor-pointer"
                title="Refresh Tasks"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="hidden md:inline-flex items-center gap-1.5 px-3.5 h-[36px] rounded-[9px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] font-bold text-[12px] cursor-pointer shadow-xs shrink-0"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Create Task</span>
              </button>
            </div>
          </div>
        )}

        {/* ── DESKTOP & MOBILE FILTER CONTROLS ───────────────────────────── */}
        {!isMobileSelectionMode && (
          <div className="space-y-2.5">
            
            {/* Mobile Category Navigation (Primary Tabs + More ▾ sheet) */}
            <div className="flex items-center justify-between border-b border-[#E4E7EC] dark:border-[#272D36] pb-1 overflow-x-auto [scrollbar-width:none]">
              <div className="flex items-center gap-1">
                {/* Primary mobile category chips */}
                {PRIMARY_MOBILE_CHIPS.map((chip) => (
                  <button
                    key={chip.id}
                    onClick={() => setActiveTypeTab(chip.id)}
                    className={`px-3 py-1.5 rounded-[8px] text-[12px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                      activeTypeTab === chip.id
                        ? "bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10]"
                        : "text-[#667085] dark:text-[#8B95A5]"
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}

                {/* More Categories Button */}
                <button
                  type="button"
                  onClick={() => setShowMoreCategorySheet(true)}
                  className={`px-3 py-1.5 rounded-[8px] text-[12px] font-bold transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                    isMoreCategoryActive
                      ? "bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10]"
                      : "text-[#667085] dark:text-[#8B95A5]"
                  }`}
                >
                  <span>{isMoreCategoryActive ? MORE_MOBILE_CHIPS.find(c => c.id === activeTypeTab)?.label : "More"}</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Filter Row: Dominant Search + Filter Button */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#667085]" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 h-[42px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[10px] text-[12.5px] text-[#17202A] dark:text-[#F2F4F7] outline-none shadow-2xs focus:border-[#C9A52A]"
                />
              </div>

              {/* Desktop Filters */}
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="hidden md:block h-[42px] px-3 bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[10px] text-[12px] font-semibold text-[#17202A] dark:text-[#F2F4F7] outline-none"
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="hidden md:block h-[42px] px-3 bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[10px] text-[12px] font-semibold text-[#17202A] dark:text-[#F2F4F7] outline-none"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>

              {/* Mobile Filter Sheet Trigger Button */}
              <button
                type="button"
                onClick={() => setShowFilterSheet(true)}
                className={`md:hidden h-[42px] px-3.5 rounded-[10px] border text-[12.5px] font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors ${
                  activeFilterCount > 0
                    ? "bg-[#C9A52A]/10 border-[#C9A52A] text-[#C9A52A]"
                    : "bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] text-[#17202A] dark:text-[#F2F4F7]"
                }`}
              >
                <SlidersHorizontal className="w-4 h-4 text-[#C9A52A]" />
                <span>Filter</span>
                {activeFilterCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-[#C9A52A] text-[#0B0D10] text-[10px] font-bold flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>

          </div>
        )}
      </div>

      {/* ── TASK EXECUTION WORKSPACE ────────────────────────────────────── */}
      <div className="flex-1 space-y-4">
        {error ? (
          <div className="p-8 text-center bg-[#FFFFFF] dark:bg-[#15191F] rounded-[16px] border border-rose-500/20 space-y-3 max-w-md mx-auto shadow-sm">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-[15px] font-bold text-[#17202A] dark:text-[#F2F4F7]">
                Unable to load tasks
              </h3>
              <p className="text-[12px] text-[#667085] dark:text-[#8B95A5]">{error}</p>
            </div>
            <button
              onClick={fetchTasks}
              className="px-4 h-[36px] rounded-[9px] bg-[#C9A52A] text-[#0B0D10] text-[12.5px] font-bold hover:opacity-90 transition-opacity cursor-pointer inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        ) : loading ? (
          /* SKELETON LOADING ROWS */
          <div className="w-full bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[16px] p-4 space-y-3 animate-pulse">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-[56px] w-full bg-slate-100 dark:bg-[#1C222B] rounded-[10px] flex items-center justify-between px-4">
                <div className="w-1/3 h-4 bg-slate-200 dark:bg-[#272D36] rounded" />
                <div className="w-1/6 h-4 bg-slate-200 dark:bg-[#272D36] rounded" />
                <div className="w-1/6 h-4 bg-slate-200 dark:bg-[#272D36] rounded" />
              </div>
            ))}
          </div>
        ) : filteredTasks.length === 0 ? (
          /* WORKSPACE EMPTY STATE (Compact content-fitted card) */
          <div className="w-full rounded-[16px] border border-[#E4E7EC] dark:border-[#272D36] bg-[#FFFFFF] dark:bg-[#15191F] flex flex-col items-center justify-center py-8 px-6 text-center space-y-4 my-2 max-w-md mx-auto shadow-2xs">
            <div className="w-12 h-12 rounded-full bg-[#C9A52A]/10 text-[#C9A52A] flex items-center justify-center border border-[#C9A52A]/20 shrink-0">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>
            <div className="space-y-1.5 max-w-sm">
              <h3 className="text-[16px] font-bold text-[#17202A] dark:text-[#F2F4F7]">
                No active work
              </h3>
              <p className="text-[12.5px] text-[#667085] dark:text-[#8B95A5] leading-relaxed">
                Your assigned tasks will appear here. Create a task to begin execution.
              </p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-1.5 px-5 h-[40px] rounded-[10px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[12.5px] font-bold hover:opacity-90 transition-opacity shadow-xs cursor-pointer mt-1"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Create Task</span>
            </button>
          </div>
        ) : viewMode === "TABLE" ? (
          <>
            {/* DESKTOP TABLE VIEW */}
            <div className="hidden md:block bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[16px] shadow-xs overflow-hidden">
              <table className="w-full text-left text-[13px]">
                <thead className="bg-[#F8F9FB] dark:bg-[#111419] border-b border-[#E4E7EC] dark:border-[#272D36] text-[11px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider">
                  <tr className="h-[44px]">
                    <th className="p-3 w-10">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={handleSelectAll}
                        className="rounded border-[#E4E7EC] dark:border-[#272D36] text-[#C9A52A] focus:ring-0 cursor-pointer"
                      />
                    </th>
                    <th className="p-3">Task Title</th>
                    <th className="p-3">Project / Type</th>
                    <th className="p-3">Assignee</th>
                    <th className="p-3">Priority</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E7EC]/60 dark:divide-[#272D36]/60">
                  {filteredTasks.map((t, idx) => (
                    <tr
                      key={t.id}
                      onClick={(e) => handleTaskClick(t, idx, e)}
                      className={`hover:bg-[#F8F9FB] dark:hover:bg-[#111419] transition-colors cursor-pointer ${
                        selectedIds.includes(t.id) ? "bg-[#C9A52A]/5" : ""
                      }`}
                    >
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(t.id)}
                          onChange={() => toggleSelectId(t.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border-[#E4E7EC] dark:border-[#272D36] text-[#C9A52A] focus:ring-0 cursor-pointer"
                        />
                      </td>
                      <td className="p-3 font-semibold text-[#17202A] dark:text-[#F2F4F7]">{t.title}</td>
                      <td className="p-3 text-[#667085]">{t.projectName || t.taskType || "General"}</td>
                      <td className="p-3 font-medium">{t.assigneeName || "Unassigned"}</td>
                      <td className="p-3 font-bold">{t.priority || "Medium"}</td>
                      <td className="p-3">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${STATUS_STYLE[t.status] || STATUS_STYLE["Not Started"]}`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); setActionTaskSheet(t); }}
                          className="p-1.5 rounded-md hover:bg-[#E4E7EC] dark:hover:bg-[#272D36]"
                        >
                          <MoreVertical className="w-4 h-4 text-[#667085]" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* MOBILE PREMIUM TASK CARDS LIST */}
            <div className="md:hidden space-y-2.5">
              {filteredTasks.map((t, idx) => (
                <div
                  key={t.id}
                  onClick={(e) => handleTaskClick(t, idx, e)}
                  className={`p-3.5 rounded-[14px] bg-[#FFFFFF] dark:bg-[#15191F] border transition-all cursor-pointer space-y-2.5 shadow-2xs ${
                    selectedIds.includes(t.id)
                      ? "border-[#C9A52A] ring-1 ring-[#C9A52A]"
                      : "border-[#E4E7EC] dark:border-[#272D36]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <h4 className="text-[13.5px] font-bold text-[#17202A] dark:text-[#F2F4F7] leading-snug line-clamp-2">
                        {t.title}
                      </h4>
                      <p className="text-[11px] text-[#667085] dark:text-[#8B95A5]">
                        {t.projectName || t.taskType || "Work Task"}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold shrink-0 ${STATUS_STYLE[t.status] || STATUS_STYLE["Not Started"]}`}>
                      {t.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11.5px] text-[#667085] dark:text-[#8B95A5] pt-1 border-t border-[#E4E7EC]/60 dark:border-[#272D36]/60">
                    <span>Assignee: <strong className="text-[#17202A] dark:text-[#F2F4F7]">{t.assigneeName || "Unassigned"}</strong></span>
                    <span className="font-semibold text-[#17202A] dark:text-[#F2F4F7]">{t.priority || "Medium"}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          /* KANBAN BOARD VIEW */
          <div className="flex gap-3 overflow-x-auto pb-4 [scrollbar-width:none]">
            {KANBAN_COLUMNS.map((col) => {
              const colTasks = filteredTasks.filter((t) => (t.status || "Not Started").toLowerCase() === col.id.toLowerCase());
              return (
                <div key={col.id} className="w-[280px] shrink-0 bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[16px] p-3.5 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-[#E4E7EC] dark:border-[#272D36] pb-2">
                    <h3 className="text-[13px] font-bold text-[#17202A] dark:text-[#F2F4F7]">{col.title}</h3>
                    <span className="w-5 h-5 rounded-full bg-[#F8F9FB] dark:bg-[#111419] text-[#667085] text-[11px] font-bold flex items-center justify-center border border-[#E4E7EC] dark:border-[#272D36]">
                      {colTasks.length}
                    </span>
                  </div>

                  <div className="space-y-2 max-h-[550px] overflow-y-auto pr-0.5">
                    {colTasks.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTask(t)}
                        className="p-3 rounded-[12px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] space-y-2 cursor-pointer hover:border-[#C9A52A]/50 transition-colors"
                      >
                        <h4 className="text-[12.5px] font-bold text-[#17202A] dark:text-[#F2F4F7] line-clamp-2">{t.title}</h4>
                        <div className="flex items-center justify-between text-[10.5px] text-[#667085]">
                          <span>{t.assigneeName || "Unassigned"}</span>
                          <span className="font-bold">{t.priority}</span>
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

      {/* Mobile Secondary Category Bottom Sheet */}
      {showMoreCategorySheet && (
        <div
          className="md:hidden fixed inset-0 z-[140] flex flex-col justify-end bg-black/70 backdrop-blur-xs font-sans transition-opacity animate-in fade-in duration-200"
          onClick={() => setShowMoreCategorySheet(false)}
        >
          <div
            className="bg-[#FFFFFF] dark:bg-[#15191F] border-t border-[#E4E7EC] dark:border-[#272D36] rounded-t-[24px] p-5 space-y-4 max-h-[75dvh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-3">
              <div className="w-10 h-1 bg-[#E4E7EC] dark:bg-[#272D36] rounded-full mx-auto" />
              <div className="flex items-center justify-between pb-2 border-b border-[#E4E7EC] dark:border-[#272D36]">
                <h3 className="text-[15px] font-bold text-[#17202A] dark:text-[#F2F4F7]">Secondary Task Categories</h3>
                <button
                  type="button"
                  onClick={() => setShowMoreCategorySheet(false)}
                  className="p-1.5 rounded-full text-[#667085] hover:bg-[#F8F9FB] dark:hover:bg-[#111419]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-1">
              {MORE_MOBILE_CHIPS.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => {
                    setActiveTypeTab(chip.id);
                    setShowMoreCategorySheet(false);
                  }}
                  className={`w-full h-[48px] px-3.5 rounded-[12px] text-left text-[13px] font-bold transition-colors flex items-center justify-between cursor-pointer ${
                    activeTypeTab === chip.id
                      ? "bg-[#C9A52A]/10 text-[#C9A52A]"
                      : "text-[#17202A] dark:text-[#F2F4F7] hover:bg-[#F8F9FB] dark:hover:bg-[#111419]"
                  }`}
                >
                  <span>{chip.label}</span>
                  {activeTypeTab === chip.id && <CheckCircle2 className="w-4 h-4 text-[#C9A52A]" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Reconstructed Mobile Filter Sheet */}
      {showFilterSheet && (
        <div
          className="md:hidden fixed inset-0 z-[140] flex flex-col justify-end bg-black/70 backdrop-blur-xs font-sans transition-opacity animate-in fade-in duration-200"
          onClick={() => setShowFilterSheet(false)}
        >
          <div
            className="bg-[#FFFFFF] dark:bg-[#15191F] border-t border-[#E4E7EC] dark:border-[#272D36] rounded-t-[24px] p-5 space-y-4 max-h-[85dvh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-3">
              <div className="w-10 h-1 bg-[#E4E7EC] dark:bg-[#272D36] rounded-full mx-auto" />
              <div className="flex items-center justify-between pb-2 border-b border-[#E4E7EC] dark:border-[#272D36]">
                <h3 className="text-[15px] font-bold text-[#17202A] dark:text-[#F2F4F7]">Filter Tasks</h3>
                <button
                  type="button"
                  onClick={() => setShowFilterSheet(false)}
                  className="p-1.5 rounded-full text-[#667085] hover:bg-[#F8F9FB] dark:hover:bg-[#111419]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3 text-[13px]">
              <div className="space-y-1.5">
                <label className="font-bold text-[#17202A] dark:text-[#F2F4F7]">Task Category</label>
                <select
                  value={activeTypeTab}
                  onChange={(e) => setActiveTypeTab(e.target.value)}
                  className="w-full h-[44px] px-3.5 rounded-[10px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] text-[#17202A] dark:text-[#F2F4F7] font-semibold outline-none"
                >
                  {TASK_TYPE_CHIPS.map((chip) => (
                    <option key={chip.id} value={chip.id}>{chip.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[#17202A] dark:text-[#F2F4F7]">Priority</label>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full h-[44px] px-3.5 rounded-[10px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] text-[#17202A] dark:text-[#F2F4F7] font-semibold outline-none"
                >
                  {PRIORITY_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[#17202A] dark:text-[#F2F4F7]">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full h-[44px] px-3.5 rounded-[10px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] text-[#17202A] dark:text-[#F2F4F7] font-semibold outline-none"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[#17202A] dark:text-[#F2F4F7]">Assignee</label>
                <select
                  value={assigneeFilter}
                  onChange={(e) => setAssigneeFilter(e.target.value)}
                  className="w-full h-[44px] px-3.5 rounded-[10px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] text-[#17202A] dark:text-[#F2F4F7] font-semibold outline-none"
                >
                  <option value="All">All Assignees</option>
                  {assignableUsers.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-[#E4E7EC] dark:border-[#272D36]">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTypeTab("All");
                    setPriorityFilter("All");
                    setStatusFilter("All");
                    setAssigneeFilter("All");
                    setShowFilterSheet(false);
                  }}
                  className="flex-1 h-[42px] rounded-[10px] border border-[#E4E7EC] dark:border-[#272D36] font-bold text-[#667085] hover:text-[#17202A]"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setShowFilterSheet(false)}
                  className="flex-1 h-[42px] rounded-[10px] bg-[#C9A52A] text-[#0B0D10] font-bold hover:opacity-90"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Task Actions Sheet */}
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

      {/* Fixed Mobile-Only Task Creation FAB (Single entry point on mobile) */}
      <button
        type="button"
        onClick={() => setShowCreate(true)}
        className="md:hidden fixed bottom-[calc(72px+env(safe-area-inset-bottom)+12px)] right-4 z-40 w-14 h-14 rounded-full bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] shadow-xl flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
        title="Create Task"
      >
        <Plus className="w-6 h-6 stroke-[3]" />
      </button>

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
