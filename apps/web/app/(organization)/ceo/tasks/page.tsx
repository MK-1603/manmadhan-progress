"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  CheckSquare, Search, Loader2, AlertCircle, Trash2, Plus, RefreshCw, ChevronRight,
  LayoutGrid, List, Play, CheckCircle2, AlertTriangle, Check, X, MoreVertical,
  SlidersHorizontal, ChevronDown
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { useSocket } from "@/components/providers/socket-provider";
import { CreateTaskModal, renderNeatTextWithMentions } from "@/components/tasks/create-task-modal";
import { TaskDetailModal } from "@/components/tasks/task-detail-modal";
import { MobileSheet } from "@/components/ui/mobile-sheet";
import { useAuth } from "@/components/auth/auth-context";
import { useRouter } from "next/navigation";
import { CustomSelect, type CustomSelectOption } from "@/components/ui/custom-select";

const PRIORITY_OPTIONS: CustomSelectOption[] = [
  { value: "All", label: "All Priorities" },
  { value: "Low", label: "Low Priority", color: "bg-slate-400" },
  { value: "Medium", label: "Medium Priority", color: "bg-[#C9A52A]" },
  { value: "High", label: "High Priority", color: "bg-amber-500" },
  { value: "Urgent", label: "Urgent Priority", color: "bg-rose-500" },
];

const STATUS_OPTIONS: CustomSelectOption[] = [
  { value: "All", label: "All Statuses" },
  { value: "Pending", label: "Pending", color: "bg-amber-500" },
  { value: "In Progress", label: "In Progress", color: "bg-blue-500" },
  { value: "Paused", label: "Paused", color: "bg-purple-500" },
  { value: "Blocked", label: "Blocked", color: "bg-rose-500" },
  { value: "Completed", label: "Completed", color: "bg-emerald-500" },
  { value: "Cancelled", label: "Cancelled", color: "bg-slate-500" },
];

const STATUS_STYLE: Record<string, string> = {
  "Draft": "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
  "Not Started": "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  "Pending": "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  "In Progress": "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  "Assigned": "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  "Accepted": "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  "Paused": "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  "Review": "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  "Submitted": "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  "Completed": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  "Approved": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  "Blocked": "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  "Cancelled": "bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/20",
  "Overdue": "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
};

const PRIMARY_DESKTOP_TABS = [
  { id: "All", label: "All" },
  { id: "Project", label: "Project" },
  { id: "Personal", label: "Personal" },
  { id: "Learning", label: "Learning" },
];

const MORE_DESKTOP_CATEGORIES = [
  { id: "DOCUMENTATION", label: "Documentation" },
  { id: "RESEARCH", label: "Research" },
  { id: "SUBMISSION", label: "Submission" },
  { id: "REVIEW", label: "Review" },
];

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

const KANBAN_COLUMNS = [
  { id: "Pending", title: "Pending / Not Started" },
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

  // Modals & Dropdowns
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [showMoreCategorySheet, setShowMoreCategorySheet] = useState(false);
  const [showMoreDropdown, setShowMoreDropdown] = useState(false);
  const [actionTaskSheet, setActionTaskSheet] = useState<any | null>(null);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  const moreDropdownRef = useRef<HTMLDivElement>(null);

  // Directory for Assignee dropdown
  const [assignableUsers, setAssignableUsers] = useState<any[]>([]);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : undefined;
      const res = await apiClient.get(`/org/tasks${wsId ? `?workspaceId=${wsId}` : ""}`);
      if (res.data?.success) {
        setTasks(res.data.data || []);
        setError("");
      } else {
        setError(res.data?.error || "Unable to load tasks.");
      }
    } catch (err: any) {
      console.error(err);
      const status = err?.response?.status;
      if (status === 401) {
        setError("Session expired. Please log in again.");
      } else if (status === 403) {
        setError("Access denied. Insufficient permission to view tasks.");
      } else if (status === 404) {
        setError("Task workspace endpoint not found.");
      } else {
        setError(err?.response?.data?.error || "Unable to load task workspace data.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDirectory = useCallback(async () => {
    try {
      const res = await apiClient.get("/org/directory");
      if (res.data?.success && Array.isArray(res.data.data)) {
        setAssignableUsers(res.data.data);
        return;
      }
    } catch {
      // Fallback
    }

    try {
      const fallbackRes = await apiClient.get("/org/projects/eligible-assignees");
      if (fallbackRes.data?.data?.all) {
        setAssignableUsers(fallbackRes.data.data.all);
      }
    } catch (e) {
      console.warn("Unable to load workspace directory assignees:", e);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    fetchDirectory();
  }, [fetchTasks, fetchDirectory]);

  // Outside click listener for More dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(event.target as Node)) {
        setShowMoreDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
      const searchLower = search.toLowerCase().trim();
      const matchesSearch =
        !searchLower ||
        (t.title || "").toLowerCase().includes(searchLower) ||
        (t.projectName || "").toLowerCase().includes(searchLower) ||
        (t.assigneeName || "").toLowerCase().includes(searchLower);

      const typeUpper = (t.taskType || "").toUpperCase();
      const matchesType = (() => {
        if (activeTypeTab === "All") return true;
        if (activeTypeTab === "Project" || activeTypeTab === "PROJECT WORK") {
          return typeUpper === "PROJECT WORK" || !!t.projectId;
        }
        if (activeTypeTab === "Personal" || activeTypeTab === "PERSONAL WORK") {
          return typeUpper === "PERSONAL WORK" || (!t.projectId && typeUpper !== "LEARNING");
        }
        if (activeTypeTab === "Learning" || activeTypeTab === "LEARNING") {
          return typeUpper === "LEARNING";
        }
        return typeUpper === activeTypeTab.toUpperCase();
      })();

      const matchesPriority =
        priorityFilter === "All" || (t.priority || "").toLowerCase() === priorityFilter.toLowerCase();
      
      const taskStatusLower = (t.status || "").toLowerCase();
      const matchesStatus =
        statusFilter === "All" ||
        taskStatusLower === statusFilter.toLowerCase() ||
        (statusFilter === "Pending" && (taskStatusLower === "not started" || taskStatusLower === "draft"));

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

  const isMoreCategoryActive = MORE_DESKTOP_CATEGORIES.some((c) => c.id === activeTypeTab);

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

  const renderPriorityBadge = (priority?: string) => {
    const p = (priority || "Medium").toLowerCase();
    if (p === "urgent" || p === "critical") {
      return <span className="text-rose-600 dark:text-rose-400 font-bold">• Urgent</span>;
    }
    if (p === "high") {
      return <span className="text-amber-600 dark:text-amber-400 font-semibold">• High</span>;
    }
    if (p === "low") {
      return <span className="text-slate-500 font-medium">• Low</span>;
    }
    return <span className="text-[#C9A52A] font-medium">• Medium</span>;
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-[#F8F9FB] dark:bg-[#0B0E12] text-[#17202A] dark:text-[#F2F4F7] font-sans select-none">
      
      {/* ── 1. TASK PAGE HEADER ────────────────────────────────────────── */}
      <div className="shrink-0 px-4 md:px-6 py-3.5 border-b border-[#E4E7EC] dark:border-[#272D36] bg-[#FFFFFF] dark:bg-[#15191F]">
        {isMobileSelectionMode ? (
          <div className="flex items-center justify-between py-1 bg-[#C9A52A]/10 -mx-4 px-4">
            <div className="flex items-center gap-2 text-[14px] font-bold">
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
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CheckSquare className="w-6 h-6 text-[#C9A52A] dark:text-[#D4B12F] shrink-0" />
                <h1 className="text-[24px] md:text-[28px] font-bold text-[#17202A] dark:text-[#F2F4F7] tracking-tight leading-none">
                  Tasks
                </h1>
              </div>
              <p className="text-[12.5px] text-[#667085] dark:text-[#8B95A5] mt-1 font-medium">
                Execution workspace
              </p>
            </div>

            {/* Top Right Actions */}
            <div className="flex items-center gap-2">
              <div className="flex items-center p-0.5 rounded-[9px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36]">
                <button
                  type="button"
                  onClick={() => setViewMode("TABLE")}
                  className={`px-3.5 h-[32px] rounded-[7px] text-[12px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    viewMode === "TABLE"
                      ? "bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] shadow-2xs"
                      : "text-[#667085] hover:text-[#17202A] dark:hover:text-[#F2F4F7]"
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span>Table</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("BOARD")}
                  className={`px-3.5 h-[32px] rounded-[7px] text-[12px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    viewMode === "BOARD"
                      ? "bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] shadow-2xs"
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
                className="p-2 h-[34px] w-[34px] flex items-center justify-center rounded-[8px] border border-[#E4E7EC] dark:border-[#272D36] bg-[#FFFFFF] dark:bg-[#15191F] text-[#667085] hover:text-[#17202A] dark:hover:text-[#F2F4F7] transition-colors cursor-pointer"
                title="Refresh Tasks"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="hidden md:inline-flex items-center gap-1.5 px-4 h-[36px] rounded-[9px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] font-bold text-[12.5px] cursor-pointer shadow-2xs hover:opacity-90 transition-opacity shrink-0"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Create Task</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── 2. TASK CATEGORY NAVIGATION ────────────────────────────────── */}
      {!isMobileSelectionMode && (
        <div className="shrink-0 px-4 md:px-6 py-2 border-b border-[#E4E7EC] dark:border-[#272D36] bg-[#FFFFFF]/60 dark:bg-[#15191F]/60">
          {/* Desktop Compact Segmented Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {PRIMARY_DESKTOP_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTypeTab(tab.id)}
                className={`px-3.5 py-1.5 rounded-[8px] text-[12.5px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTypeTab === tab.id
                    ? "bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] shadow-2xs"
                    : "text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7]"
                }`}
              >
                {tab.label}
              </button>
            ))}

            {/* Desktop More Menu Dropdown */}
            <div className="relative inline-block" ref={moreDropdownRef}>
              <button
                type="button"
                onClick={() => setShowMoreDropdown(!showMoreDropdown)}
                className={`px-3.5 py-1.5 rounded-[8px] text-[12.5px] font-bold transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                  isMoreCategoryActive
                    ? "bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] shadow-2xs"
                    : "text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7]"
                }`}
              >
                <span>{isMoreCategoryActive ? MORE_DESKTOP_CATEGORIES.find((c) => c.id === activeTypeTab)?.label : "More"}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showMoreDropdown ? "rotate-180" : ""}`} />
              </button>

              {showMoreDropdown && (
                <div className="absolute top-full left-0 mt-1 w-44 rounded-xl border border-[#E4E7EC] dark:border-[#272D36] bg-[#FFFFFF] dark:bg-[#15191F] shadow-xl p-1.5 z-50 space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
                  {MORE_DESKTOP_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setActiveTypeTab(cat.id);
                        setShowMoreDropdown(false);
                      }}
                      className={`w-full px-3 py-2 rounded-lg text-left text-[12px] font-bold transition-colors flex items-center justify-between cursor-pointer ${
                        activeTypeTab === cat.id
                          ? "bg-[#C9A52A]/10 text-[#C9A52A]"
                          : "text-[#17202A] dark:text-[#F2F4F7] hover:bg-[#F8F9FB] dark:hover:bg-[#111419]"
                      }`}
                    >
                      <span>{cat.label}</span>
                      {activeTypeTab === cat.id && <Check className="w-3.5 h-3.5 text-[#C9A52A]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Mobile Category Chips */}
          <div className="md:hidden flex items-center justify-between overflow-x-auto [scrollbar-width:none]">
            <div className="flex items-center gap-1">
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

              <button
                type="button"
                onClick={() => setShowMoreCategorySheet(true)}
                className={`px-3 py-1.5 rounded-[8px] text-[12px] font-bold transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                  isMoreCategoryActive
                    ? "bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10]"
                    : "text-[#667085] dark:text-[#8B95A5]"
                }`}
              >
                <span>{isMoreCategoryActive ? MORE_MOBILE_CHIPS.find((c) => c.id === activeTypeTab)?.label : "More"}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. SEARCH + FILTER TOOLBAR ─────────────────────────────────── */}
      {!isMobileSelectionMode && (
        <div className="shrink-0 px-4 md:px-6 py-2.5 border-b border-[#E4E7EC] dark:border-[#272D36] bg-[#FFFFFF] dark:bg-[#15191F]">
          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[280px] md:min-w-[320px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#667085]" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 h-[42px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] rounded-[10px] text-[12.5px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#C9A52A] transition-colors"
              />
            </div>

            {/* Desktop Priority Filter Dropdown */}
            <div className="hidden md:block w-[160px] shrink-0">
              <CustomSelect
                value={priorityFilter}
                onChange={setPriorityFilter}
                options={PRIORITY_OPTIONS}
                size="md"
              />
            </div>

            {/* Desktop Status Filter Dropdown */}
            <div className="hidden md:block w-[160px] shrink-0">
              <CustomSelect
                value={statusFilter}
                onChange={setStatusFilter}
                options={STATUS_OPTIONS}
                size="md"
              />
            </div>

            {/* Mobile Filter Sheet Trigger Button */}
            <button
              type="button"
              onClick={() => setShowFilterSheet(true)}
              className={`md:hidden h-[42px] px-3.5 rounded-[10px] border text-[12.5px] font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors ${
                activeFilterCount > 0
                  ? "bg-[#C9A52A]/10 border-[#C9A52A] text-[#C9A52A]"
                  : "bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] text-[#17202A] dark:text-[#F2F4F7]"
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

      {/* ── 4. TASK CONTENT REGION (SCROLLS INTERNALLY) ────────────────── */}
      <div className="flex-1 min-h-0 p-4 md:p-6 overflow-y-auto">
        {error ? (
          /* ERROR STATE WITH RETRY */
          <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-[#FFFFFF] dark:bg-[#15191F] rounded-[16px] border border-rose-500/20 space-y-3 max-w-md mx-auto shadow-2xs">
            <AlertCircle className="w-10 h-10 text-rose-500 shrink-0" />
            <div className="space-y-1">
              <h3 className="text-[15px] font-bold text-[#17202A] dark:text-[#F2F4F7]">
                Unable to load tasks
              </h3>
              <p className="text-[12.5px] text-[#667085] dark:text-[#8B95A5]">{error}</p>
            </div>
            <button
              onClick={fetchTasks}
              className="px-4 h-[36px] rounded-[9px] bg-[#C9A52A] text-[#0B0D10] text-[12.5px] font-bold hover:opacity-90 transition-opacity cursor-pointer inline-flex items-center gap-1.5 mt-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        ) : loading ? (
          /* COMPACT SKELETON LOADING (MAX 4 ROWS) */
          <div className="w-full bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[16px] p-4 space-y-3 animate-pulse">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-[56px] w-full bg-[#F8F9FB] dark:bg-[#111419] rounded-[10px] flex items-center justify-between px-4">
                <div className="w-1/3 h-4 bg-slate-200 dark:bg-[#272D36] rounded" />
                <div className="w-1/6 h-4 bg-slate-200 dark:bg-[#272D36] rounded" />
                <div className="w-1/6 h-4 bg-slate-200 dark:bg-[#272D36] rounded" />
              </div>
            ))}
          </div>
        ) : filteredTasks.length === 0 ? (
          /* WORKSPACE EMPTY STATE */
          <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-[#FFFFFF] dark:bg-[#15191F] rounded-[16px] border border-[#E4E7EC] dark:border-[#272D36] space-y-4 shadow-2xs">
            <div className="w-12 h-12 rounded-full bg-[#C9A52A]/10 text-[#C9A52A] flex items-center justify-center border border-[#C9A52A]/20 shrink-0">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>
            <div className="space-y-1 max-w-sm">
              <h3 className="text-[16px] font-bold text-[#17202A] dark:text-[#F2F4F7]">
                No tasks yet
              </h3>
              <p className="text-[12.5px] text-[#667085] dark:text-[#8B95A5] leading-relaxed">
                Your assigned work will appear here. Create a task to begin execution.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-1.5 px-5 h-[38px] rounded-[10px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[12.5px] font-bold hover:opacity-90 transition-opacity shadow-2xs cursor-pointer mt-1"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Create Task</span>
            </button>
          </div>
        ) : viewMode === "TABLE" ? (
          <>
            {/* DESKTOP EXECUTION TABLE */}
            <div className="hidden md:block bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[16px] shadow-2xs overflow-hidden h-full flex flex-col">
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left text-[13px]">
                  <thead className="sticky top-0 bg-[#F8F9FB] dark:bg-[#111419] border-b border-[#E4E7EC] dark:border-[#272D36] text-[11px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider z-10">
                    <tr className="h-[44px]">
                      <th className="p-3 w-10">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={handleSelectAll}
                          className="rounded border-[#E4E7EC] dark:border-[#272D36] text-[#C9A52A] focus:ring-0 cursor-pointer"
                        />
                      </th>
                      <th className="p-3">TASK</th>
                      <th className="p-3">TYPE</th>
                      <th className="p-3">STATUS</th>
                      <th className="p-3">ASSIGNEE</th>
                      <th className="p-3">PROJECT</th>
                      <th className="p-3">PRIORITY</th>
                      <th className="p-3">DUE</th>
                      <th className="p-3 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E7EC]/60 dark:divide-[#272D36]/60">
                    {filteredTasks.map((t, idx) => (
                      <tr
                        key={t.id}
                        onClick={(e) => handleTaskClick(t, idx, e)}
                        className={`h-[58px] hover:bg-[#F8F9FB] dark:hover:bg-[#111419] transition-colors cursor-pointer ${
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
                        <td className="p-3 font-semibold text-[#17202A] dark:text-[#F2F4F7] max-w-[260px] truncate">
                          {t.title}
                        </td>
                        <td className="p-3 text-[12px] text-[#667085] dark:text-[#8B95A5] font-medium">
                          {t.taskType || (t.projectId ? "Project Work" : "Personal Work")}
                        </td>
                        <td className="p-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border ${STATUS_STYLE[t.status] || STATUS_STYLE["Pending"]}`}>
                            {(t.status || "Pending").toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3 text-[12.5px] font-medium text-[#17202A] dark:text-[#F2F4F7]">
                          {t.assigneeName ? renderNeatTextWithMentions(t.assigneeName.startsWith("@") ? t.assigneeName : `@${t.assigneeName}`) : "Unassigned"}
                        </td>
                        <td className="p-3 text-[12px] text-[#667085] dark:text-[#8B95A5]">
                          {t.projectName || "Standalone"}
                        </td>
                        <td className="p-3 text-[12px]">
                          {renderPriorityBadge(t.priority)}
                        </td>
                        <td className="p-3 text-[12px] text-[#667085] dark:text-[#8B95A5]">
                          {t.deadline ? new Date(t.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={(e) => { e.stopPropagation(); setActionTaskSheet(t); }}
                            className="p-1.5 rounded-md hover:bg-[#E4E7EC] dark:hover:bg-[#272D36] text-[#667085] transition-colors"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* MOBILE PREMIUM CARDS LIST */}
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
                    <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold shrink-0 ${STATUS_STYLE[t.status] || STATUS_STYLE["Pending"]}`}>
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
          <div className="flex gap-3 overflow-x-auto pb-4 h-full [scrollbar-width:none]">
            {KANBAN_COLUMNS.map((col) => {
              const colTasks = filteredTasks.filter((t) => {
                const s = (t.status || "Pending").toLowerCase();
                if (col.id === "Pending") return s === "pending" || s === "not started" || s === "draft";
                return s === col.id.toLowerCase();
              });

              return (
                <div key={col.id} className="w-[300px] shrink-0 bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[16px] p-3.5 space-y-3 shadow-2xs flex flex-col h-full">
                  <div className="flex items-center justify-between border-b border-[#E4E7EC] dark:border-[#272D36] pb-2 shrink-0">
                    <h3 className="text-[13px] font-bold text-[#17202A] dark:text-[#F2F4F7]">{col.title}</h3>
                    <span className="w-5 h-5 rounded-full bg-[#F8F9FB] dark:bg-[#111419] text-[#667085] text-[11px] font-bold flex items-center justify-center border border-[#E4E7EC] dark:border-[#272D36]">
                      {colTasks.length}
                    </span>
                  </div>

                  <div className="space-y-2 flex-1 overflow-y-auto pr-0.5">
                    {colTasks.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTask(t)}
                        className="p-3 rounded-[12px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] space-y-2 cursor-pointer hover:border-[#C9A52A]/50 transition-colors"
                      >
                        <h4 className="text-[12.5px] font-bold text-[#17202A] dark:text-[#F2F4F7] line-clamp-2">{t.title}</h4>
                        <div className="flex items-center justify-between text-[10.5px] text-[#667085]">
                          <span>{t.assigneeName || "Unassigned"}</span>
                          <span className="font-bold">{t.priority || "Medium"}</span>
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

      {/* Mobile Filter Sheet */}
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

      {/* Mobile-Only Create Task FAB */}
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
