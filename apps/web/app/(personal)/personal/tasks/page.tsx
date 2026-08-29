"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
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
  List,
  LayoutGrid,
  RefreshCw,
  ChevronDown,
  Check
} from "lucide-react";
import { useSocket } from "@/components/providers/socket-provider";
import { useConfirm } from "@/hooks/use-confirm";
import { CustomSelect, type CustomSelectOption } from "@/components/ui/custom-select";
import { TaskCreateModal } from "@/components/organization/task-create-modal";

const PRIORITY_SELECT_OPTIONS: CustomSelectOption[] = [
  { value: "All", label: "All Priorities" },
  { value: "Low", label: "Low Priority", color: "bg-slate-400" },
  { value: "Medium", label: "Medium Priority", color: "bg-[#C9A52A]" },
  { value: "High", label: "High Priority", color: "bg-amber-500" },
  { value: "Urgent", label: "Urgent Priority", color: "bg-rose-500" },
];

const STATUS_SELECT_OPTIONS: CustomSelectOption[] = [
  { value: "All", label: "All Statuses" },
  { value: "Pending", label: "Pending", color: "bg-amber-500" },
  { value: "Completed", label: "Completed", color: "bg-emerald-500" },
];

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

const STATUS_STYLE: Record<string, string> = {
  "Pending": "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  "TODO": "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  "In Progress": "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  "Completed": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  "COMPLETED": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  "Blocked": "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
};

export default function PersonalTasksPage() {
  const { confirm } = useConfirm();
  const { socket, isConnected } = useSocket();

  const [viewMode, setViewMode] = useState<"TABLE" | "BOARD">("TABLE");
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [error, setError] = useState("");

  const [showMoreDropdown, setShowMoreDropdown] = useState(false);
  const moreDropdownRef = useRef<HTMLDivElement>(null);

  // Manual Form & Prompt Form
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
      } else {
        setError(response.data?.error || "Unable to load tasks.");
      }
    } catch (err: any) {
      console.error(err);
      const status = err?.response?.status;
      if (status === 401) {
        setError("Session expired. Please log in again.");
      } else if (status === 403) {
        setError("Access denied.");
      } else {
        setError(err.response?.data?.error || "Unable to load tasks.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(event.target as Node)) {
        setShowMoreDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    const ok = await confirm({
      title: "Delete Task",
      description: "Are you sure you want to delete this task? This action cannot be undone.",
      confirmLabel: "Delete Task",
      variant: "destructive",
    });
    if (!ok) return;
    setTasks((p) => p.filter((t) => t.id !== id));
    try {
      await apiClient.delete(`/personal/tasks/${id}`);
    } catch {
      fetchTasks();
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

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const searchLower = search.toLowerCase().trim();
      if (searchLower && !(t.title || "").toLowerCase().includes(searchLower)) return false;
      if (priorityFilter !== "All" && (t.priority || "").toLowerCase() !== priorityFilter.toLowerCase()) return false;

      const isComp = t.status === "COMPLETED" || t.status === "Completed";
      if (statusFilter === "Completed" && !isComp) return false;
      if (statusFilter === "Pending" && isComp) return false;

      const typeUpper = (t.type || t.taskType || "").toUpperCase();
      if (activeTab === "Project") return !!t.projectId || typeUpper === "PROJECT WORK";
      if (activeTab === "Personal") return !t.projectId && typeUpper !== "LEARNING";
      if (activeTab === "Learning") return typeUpper === "LEARNING";
      if (activeTab !== "All") return typeUpper === activeTab.toUpperCase();

      return true;
    });
  }, [tasks, search, priorityFilter, statusFilter, activeTab]);

  const isMoreCategoryActive = MORE_DESKTOP_CATEGORIES.some((c) => c.id === activeTab);

  const renderPriorityBadge = (priority?: string) => {
    const p = (priority || "Medium").toLowerCase();
    if (p === "urgent" || p === "critical") return <span className="text-rose-600 font-bold">• Urgent</span>;
    if (p === "high") return <span className="text-amber-600 font-semibold">• High</span>;
    if (p === "low") return <span className="text-slate-500 font-medium">• Low</span>;
    return <span className="text-[#C9A52A] font-medium">• Medium</span>;
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-[#F8F9FB] dark:bg-[#0B0E12] text-[#17202A] dark:text-[#F2F4F7] font-sans select-none">
      
      {/* ── 1. TASK PAGE HEADER ────────────────────────────────────────── */}
      <div className="shrink-0 px-4 md:px-6 py-3.5 border-b border-[#E4E7EC] dark:border-[#272D36] bg-[#FFFFFF] dark:bg-[#15191F]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-[#C9A52A] dark:text-[#D4B12F] shrink-0" />
              <h1 className="text-[24px] md:text-[28px] font-bold text-[#17202A] dark:text-[#F2F4F7] tracking-tight leading-none">
                Tasks
              </h1>
            </div>
            <p className="text-[12.5px] text-[#667085] dark:text-[#8B95A5] mt-1 font-medium">
              Execution workspace
            </p>
          </div>

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
              className="inline-flex items-center gap-1.5 px-4 h-[36px] rounded-[9px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] font-bold text-[12.5px] cursor-pointer shadow-2xs hover:opacity-90 transition-opacity shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Create Task</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. TASK CATEGORY NAVIGATION ────────────────────────────────── */}
      <div className="shrink-0 px-4 md:px-6 py-2 border-b border-[#E4E7EC] dark:border-[#272D36] bg-[#FFFFFF]/60 dark:bg-[#15191F]/60">
        <div className="flex items-center gap-1">
          {PRIMARY_DESKTOP_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-[8px] text-[12.5px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] shadow-2xs"
                  : "text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7]"
              }`}
            >
              {tab.label}
            </button>
          ))}

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
              <span>{isMoreCategoryActive ? MORE_DESKTOP_CATEGORIES.find((c) => c.id === activeTab)?.label : "More"}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showMoreDropdown ? "rotate-180" : ""}`} />
            </button>

            {showMoreDropdown && (
              <div className="absolute top-full left-0 mt-1 w-44 rounded-xl border border-[#E4E7EC] dark:border-[#272D36] bg-[#FFFFFF] dark:bg-[#15191F] shadow-xl p-1.5 z-50 space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
                {MORE_DESKTOP_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(cat.id);
                      setShowMoreDropdown(false);
                    }}
                    className={`w-full px-3 py-2 rounded-lg text-left text-[12px] font-bold transition-colors flex items-center justify-between cursor-pointer ${
                      activeTab === cat.id
                        ? "bg-[#C9A52A]/10 text-[#C9A52A]"
                        : "text-[#17202A] dark:text-[#F2F4F7] hover:bg-[#F8F9FB] dark:hover:bg-[#111419]"
                    }`}
                  >
                    <span>{cat.label}</span>
                    {activeTab === cat.id && <Check className="w-3.5 h-3.5 text-[#C9A52A]" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 3. SEARCH + FILTER TOOLBAR ─────────────────────────────────── */}
      <div className="shrink-0 px-4 md:px-6 py-2.5 border-b border-[#E4E7EC] dark:border-[#272D36] bg-[#FFFFFF] dark:bg-[#15191F]">
        <div className="flex items-center gap-3">
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

          <div className="w-[160px] shrink-0">
            <CustomSelect
              value={priorityFilter}
              onChange={setPriorityFilter}
              options={PRIORITY_SELECT_OPTIONS}
              size="md"
            />
          </div>

          <div className="w-[160px] shrink-0">
            <CustomSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={STATUS_SELECT_OPTIONS}
              size="md"
            />
          </div>
        </div>
      </div>

      {/* ── 4. TASK CONTENT REGION ─────────────────────────────────────── */}
      <div className="flex-1 min-h-0 p-4 md:p-6 overflow-y-auto">
        {error ? (
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
          <div className="bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[16px] shadow-2xs overflow-hidden h-full flex flex-col">
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left text-[13px]">
                <thead className="sticky top-0 bg-[#F8F9FB] dark:bg-[#111419] border-b border-[#E4E7EC] dark:border-[#272D36] text-[11px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider z-10">
                  <tr className="h-[44px]">
                    <th className="p-3 pl-4">TASK</th>
                    <th className="p-3">STATUS</th>
                    <th className="p-3">PRIORITY</th>
                    <th className="p-3">DUE DATE</th>
                    <th className="p-3 text-right pr-4">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E7EC]/60 dark:divide-[#272D36]/60">
                  {filteredTasks.map((t) => {
                    const isComp = t.status === "COMPLETED" || t.status === "Completed";
                    return (
                      <tr
                        key={t.id}
                        className="h-[58px] hover:bg-[#F8F9FB] dark:hover:bg-[#111419] transition-colors"
                      >
                        <td className="p-3 pl-4 font-semibold text-[#17202A] dark:text-[#F2F4F7]">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => handleToggle(t)}
                              className={`shrink-0 transition-colors ${
                                isComp ? "text-emerald-500" : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              {isComp ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                            </button>
                            <span className={isComp ? "line-through text-muted-foreground" : ""}>
                              {t.title}
                            </span>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border ${STATUS_STYLE[t.status] || STATUS_STYLE["Pending"]}`}>
                            {isComp ? "COMPLETED" : "PENDING"}
                          </span>
                        </td>
                        <td className="p-3 text-[12px]">
                          {renderPriorityBadge(t.priority)}
                        </td>
                        <td className="p-3 text-[12px] text-[#667085] dark:text-[#8B95A5]">
                          {t.deadline ? (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {new Date(t.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="p-3 text-right pr-4">
                          <button
                            type="button"
                            onClick={(e) => handleDelete(t.id, e)}
                            className="p-1.5 rounded-md text-[#667085] hover:text-rose-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
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
          <div className="flex gap-3 overflow-x-auto pb-4 h-full [scrollbar-width:none]">
            {["Pending", "Completed"].map((statusKey) => {
              const colTasks = filteredTasks.filter((t) => {
                const isComp = t.status === "COMPLETED" || t.status === "Completed";
                return statusKey === "Completed" ? isComp : !isComp;
              });

              return (
                <div key={statusKey} className="w-[320px] shrink-0 bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[16px] p-3.5 space-y-3 shadow-2xs flex flex-col h-full">
                  <div className="flex items-center justify-between border-b border-[#E4E7EC] dark:border-[#272D36] pb-2 shrink-0">
                    <h3 className="text-[13px] font-bold text-[#17202A] dark:text-[#F2F4F7]">{statusKey}</h3>
                    <span className="w-5 h-5 rounded-full bg-[#F8F9FB] dark:bg-[#111419] text-[#667085] text-[11px] font-bold flex items-center justify-center border border-[#E4E7EC] dark:border-[#272D36]">
                      {colTasks.length}
                    </span>
                  </div>

                  <div className="space-y-2 flex-1 overflow-y-auto pr-0.5">
                    {colTasks.map((t) => (
                      <div
                        key={t.id}
                        className="p-3 rounded-[12px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] space-y-2"
                      >
                        <h4 className="text-[12.5px] font-bold text-[#17202A] dark:text-[#F2F4F7] line-clamp-2">{t.title}</h4>
                        <div className="flex items-center justify-between text-[10.5px] text-[#667085]">
                          <span>{t.priority || "Medium"}</span>
                          {t.deadline && <span>{new Date(t.deadline).toLocaleDateString()}</span>}
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

      {/* Canonical Task Creation System */}
      <TaskCreateModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={fetchTasks}
        isPersonalWorkspace={true}
      />
    </div>
  );
}
