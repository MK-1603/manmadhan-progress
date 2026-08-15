"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  CheckSquare, Search, Loader2, AlertCircle,
  User, Trash2, Plus, FolderKanban, RefreshCw, ChevronRight,
  BookOpen, Sparkles, Zap, Flame, Compass, Lock
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { useSocket } from "@/components/providers/socket-provider";
import { CreateTaskModal } from "@/components/tasks/create-task-modal";
import { TaskDetailModal } from "@/components/tasks/task-detail-modal";
import { CustomSelect } from "@/components/ui/custom-select";
import { useAuth } from "@/components/auth/auth-context";

const STATUS_STYLE: Record<string, string> = {
  "Pending":           "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20",
  "PENDING_ACCEPTANCE":"bg-[#C9A52A]/10 text-[#C9A52A] dark:text-[#D4B12F] border-[#C9A52A]/20",
  "In Progress":       "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  "Assigned":          "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  "Accepted":          "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  "Review":            "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  "Submitted":         "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  "Completed":         "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  "Approved":          "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  "Blocked":           "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
};

const TASK_TYPE_TABS = ["All", "PROJECT WORK", "PERSONAL WORK", "LEARNING", "DOCUMENTATION", "RESEARCH", "SUBMISSION", "REVIEW"];

const PRIORITY_OPTIONS = [
  { value: "All", label: "All Priorities" },
  { value: "Low", label: "Low Priority", color: "bg-slate-400" },
  { value: "Medium", label: "Medium Priority", color: "bg-[#C9A52A]" },
  { value: "High", label: "High Priority", color: "bg-amber-500" },
  { value: "Critical", label: "Critical Priority", color: "bg-rose-500" },
];

const ENERGY_OPTIONS = [
  { value: "All", label: "Any Energy" },
  { value: "Deep Focus", label: "Deep Focus" },
  { value: "High Energy", label: "High Energy" },
  { value: "Normal", label: "Normal" },
  { value: "Low Energy", label: "Low Energy" },
  { value: "Quick Task", label: "Quick Task" },
];

export const LEARNING_TOPICS = [
  "AI AGENTS", "AI AUTOMATION", "FINE TUNING & AI ASSISTANTS", "PROMPT ENGINEERING",
  "STAYING UPDATED", "RAG", "LLM MANAGEMENT", "MULTIMODAL AI", "AI TOOL STACKING",
  "AI VIDEO CONTENT GENERATION", "VOICE", "MCP", "AGENT PROTOCOL", "AI POWERED SAAS DEVELOPMENT"
];

export default function TasksPage() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeTypeTab, setActiveTypeTab] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [energyFilter, setEnergyFilter] = useState("All");
  const [assigneeFilter, setAssigneeFilter] = useState("All");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
        setTasks([]);
        setError("");
      }
    } catch {
      setTasks([]);
      setError("");
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

  const handleCreateLearningPlan = () => {
    const learningTasks = LEARNING_TOPICS.map((topic, idx) => ({
      id: `learning-${Date.now()}-${idx + 1}`,
      title: `Study & Master: ${topic}`,
      description: `Structured learning module covering ${topic}, including Handbook & 10-Tool Document compilation.`,
      status: "Pending",
      priority: idx < 4 ? "High" : "Medium",
      type: "LEARNING",
      energyLevel: "Deep Focus",
      createdByRole: user?.role || "CEO",
      assignedByRole: user?.role || "CEO",
      assigneeName: "Unassigned",
      assignedAt: new Date().toISOString(),
      deadline: `2026-08-${20 + (idx % 8)}`,
      progress: 0,
      projectName: "Standalone Task",
    }));

    setTasks((prev) => [...learningTasks, ...prev]);
    setActiveTypeTab("LEARNING");
  };

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      const s = search.toLowerCase();
      const matchSearch =
        (t.title || "").toLowerCase().includes(s) ||
        (t.description || "").toLowerCase().includes(s) ||
        (t.assigneeName || "").toLowerCase().includes(s) ||
        (t.projectName || "").toLowerCase().includes(s);
      const matchPriority = priorityFilter === "All" || t.priority === priorityFilter;
      const matchEnergy = energyFilter === "All" || t.energyLevel === energyFilter;
      const matchType = activeTypeTab === "All" || t.type === activeTypeTab;
      const matchAssignee =
        assigneeFilter === "All" ||
        (assigneeFilter === "Me" && (t.assignedToId === user?.id || t.assigneeName === user?.name));

      return matchSearch && matchPriority && matchEnergy && matchType && matchAssignee;
    });
  }, [tasks, search, priorityFilter, energyFilter, activeTypeTab, assigneeFilter, user]);

  const stats = useMemo(() => {
    return {
      total: tasks.length,
      active: tasks.filter((t) => ["Assigned", "Accepted", "In Progress"].includes(t.status)).length,
      review: tasks.filter((t) => ["Review", "Submitted"].includes(t.status)).length,
      completed: tasks.filter((t) => ["Completed", "Approved"].includes(t.status)).length,
      overdue: tasks.filter(
        (t) => t.isOverdue || (t.deadline && !["Completed", "Approved"].includes(t.status) && new Date(t.deadline) < new Date())
      ).length,
    };
  }, [tasks]);

  const suggestedTask = useMemo(() => {
    return tasks.find((t) => t.status === "Pending" || t.status === "In Progress") || tasks[0];
  }, [tasks]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this task? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      if (id.startsWith("learning-") || id.startsWith("task-")) {
        setTasks((prev) => prev.filter((t) => t.id !== id));
      } else {
        const wsId = localStorage.getItem("workspaceId");
        await apiClient.delete(`/org/tasks/${id}${wsId ? `?workspaceId=${wsId}` : ""}`);
        fetchTasks();
      }
    } catch {
      alert("Failed to delete task");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="w-full h-full max-h-full flex flex-col justify-between overflow-hidden px-4 sm:px-6 md:px-10 py-4 sm:py-5 max-w-[1400px] mx-auto bg-[#F8F9FB] dark:bg-[#0B0E12] text-[#17202A] dark:text-[#F2F4F7] font-sans select-none space-y-3">
      {/* ── HEADER ───────────────────────────────────────────────────────── */}
      <div className="shrink-0 space-y-2">
        <div className="flex items-center justify-between gap-3 pb-2 border-b border-[#E4E7EC] dark:border-[#272D36]">
          <div>
            <h1 className="text-[22px] sm:text-[26px] font-bold text-[#17202A] dark:text-[#F2F4F7] tracking-tight leading-none">
              Tasks
            </h1>
            <p className="text-[12.5px] text-[#667085] dark:text-[#8B95A5] mt-1">
              Track and manage assigned organization, personal, learning, and project work.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isCEOorCOCEO && (
              <button
                onClick={handleCreateLearningPlan}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 h-[40px] rounded-[9px] border border-[#E4E7EC] dark:border-[#272D36] bg-[#FFFFFF] dark:bg-[#15191F] text-[#17202A] dark:text-[#F2F4F7] text-[12px] font-semibold hover:bg-[#F3F4F6] transition-colors cursor-pointer"
              >
                <BookOpen className="w-4 h-4 text-[#C9A52A]" />
                <span>Create Learning Plan</span>
              </button>
            )}

            <button
              onClick={fetchTasks}
              className="p-2 rounded-[9px] border border-[#E4E7EC] dark:border-[#272D36] bg-[#FFFFFF] dark:bg-[#15191F] text-[#667085] dark:text-[#8B95A5] hover:bg-[#F3F4F6] transition-colors cursor-pointer"
              title="Refresh tasks"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {isCEOorCOCEO ? (
              <button
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-1.5 px-4 h-[40px] rounded-[9px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[13px] font-semibold hover:opacity-90 transition-opacity shadow-xs cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>+ New Task</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] text-[11.5px] text-[#667085]">
                <Lock className="w-3.5 h-3.5 text-[#C9A52A]" />
                <span>Assigned Tasks Only</span>
              </div>
            )}
          </div>
        </div>

        {/* SUGGESTED WORK BANNER ("GOOD FIT FOR NOW") */}
        {suggestedTask && (
          <div className="p-3 rounded-[10px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] flex items-center justify-between gap-3 text-[12px]">
            <div className="flex items-center gap-2.5 min-w-0">
              <Compass className="w-4 h-4 text-[#C9A52A] shrink-0" />
              <div className="truncate">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#C9A52A] mr-2">Good Fit For Now</span>
                <span className="font-bold text-[#17202A] dark:text-[#F2F4F7] truncate">{suggestedTask.title}</span>
                <span className="text-[#667085] dark:text-[#8B95A5] ml-2 text-[11px]">({suggestedTask.type || "Task"})</span>
              </div>
            </div>
            <button
              onClick={() => setSelectedTask(suggestedTask)}
              className="px-3 h-[30px] rounded-[6px] bg-[#C9A52A]/10 text-[#C9A52A] dark:text-[#D4B12F] font-bold text-[11px] hover:bg-[#C9A52A]/20 transition-colors cursor-pointer shrink-0"
            >
              Start →
            </button>
          </div>
        )}

        {/* COMPACT INLINE TASK SUMMARY STRIP (ONLY WHEN TASKS EXIST) */}
        {tasks.length > 0 && (
          <div className="p-2.5 rounded-[9px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] text-[12px] flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3 font-semibold">
              <span className="text-[#17202A] dark:text-[#F2F4F7] font-bold">{stats.total} Tasks</span>
              <span className="text-[#E4E7EC] dark:text-[#272D36]">·</span>
              <span className="text-blue-600 dark:text-blue-400">{stats.active} Active</span>
              <span className="text-[#E4E7EC] dark:text-[#272D36]">·</span>
              <span className="text-amber-600 dark:text-amber-400">{stats.review} Review</span>
              <span className="text-[#E4E7EC] dark:text-[#272D36]">·</span>
              <span className="text-emerald-600 dark:text-emerald-400">{stats.completed} Completed</span>
              <span className="text-[#E4E7EC] dark:text-[#272D36]">·</span>
              <span className="text-rose-600 dark:text-rose-400">{stats.overdue} Overdue</span>
            </div>
          </div>
        )}

        {/* TOOLBAR: SEARCH & TYPE TABS & ENERGY FILTER */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-3 text-[#667085] dark:text-[#8B95A5]" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 h-[38px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[8px] text-[12.5px] text-[#17202A] dark:text-[#F2F4F7] placeholder-[#667085] dark:placeholder-[#8B95A5] outline-none focus:border-[#C9A52A] dark:focus:border-[#D4B12F]"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1 bg-[#F8F9FB] dark:bg-[#111419] p-1 rounded-lg border border-[#E4E7EC] dark:border-[#272D36] overflow-x-auto">
              {TASK_TYPE_TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTypeTab(tab)}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    activeTypeTab === tab
                      ? "bg-[#FFFFFF] dark:bg-[#15191F] text-[#17202A] dark:text-[#F2F4F7] shadow-2xs border border-[#E4E7EC] dark:border-[#272D36]"
                      : "text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7]"
                  }`}
                >
                  {tab === "PROJECT WORK" ? "Project" : tab === "PERSONAL WORK" ? "Personal" : tab}
                </button>
              ))}
            </div>

            <div className="w-[130px]">
              <CustomSelect
                value={energyFilter}
                onChange={setEnergyFilter}
                options={ENERGY_OPTIONS}
                placeholder="Energy Fit"
              />
            </div>

            <div className="w-[130px]">
              <CustomSelect
                value={priorityFilter}
                onChange={setPriorityFilter}
                options={PRIORITY_OPTIONS}
                placeholder="Priority"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── TASK RESULTS REGION (THE ONLY VERTICAL SCROLL CONTAINER) ─────── */}
      <div className="flex-1 min-h-0 w-full bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[12px] flex flex-col overflow-hidden shadow-xs shrink">
        {/* Desktop Table Header (Sticky) */}
        <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_70px] items-center gap-4 px-5 py-3 border-b border-[#E4E7EC] dark:border-[#272D36] bg-[#F8F9FB] dark:bg-[#111419] shrink-0 sticky top-0 z-10">
          <span className="text-[10.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-[0.08em]">Task</span>
          <span className="text-[10.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-[0.08em]">Type</span>
          <span className="text-[10.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-[0.08em]">Status</span>
          <span className="text-[10.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-[0.08em]">Assignee</span>
          <span className="text-[10.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-[0.08em]">Project</span>
          <span className="text-[10.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-[0.08em]">Due Date</span>
          <span className="text-[10.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-[0.08em] text-right">Action</span>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 min-h-0 overflow-y-auto pb-24 md:pb-0 divide-y divide-[#E4E7EC] dark:divide-[#272D36] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {loading ? (
            <div className="p-8 flex items-center justify-center h-full min-h-[200px]">
              <Loader2 className="w-7 h-7 animate-spin text-[#C9A52A] dark:text-[#D4B12F]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-6 sm:p-8 text-center h-full flex flex-col items-center justify-center my-auto min-h-[220px] space-y-3 font-sans">
              <CheckSquare className="w-8 h-8 text-[#C9A52A] dark:text-[#D4B12F] mx-auto opacity-70" />
              <div className="space-y-1">
                <h3 className="text-[15px] font-bold text-[#17202A] dark:text-[#F2F4F7]">
                  {search || activeTypeTab !== "All" ? "No matching tasks" : "No tasks assigned yet"}
                </h3>
                <p className="text-[12.5px] text-[#667085] dark:text-[#8B95A5] max-w-sm mx-auto leading-relaxed">
                  {search || activeTypeTab !== "All"
                    ? "Try adjusting your search criteria or task type filter."
                    : "Create your first organization task to begin tracking deliverables."}
                </p>
              </div>
            </div>
          ) : (
            filtered.map((task) => {
              const isOverdue =
                task.deadline &&
                !["Completed", "Approved"].includes(task.status) &&
                new Date(task.deadline) < new Date();

              return (
                <div
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className="hover:bg-[#F8F9FB]/60 dark:hover:bg-[#111419]/60 transition-colors cursor-pointer"
                >
                  {/* Desktop Table Row */}
                  <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_70px] items-center gap-4 px-5 py-3.5">
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-semibold text-[#17202A] dark:text-[#F2F4F7] truncate">
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="text-[12px] text-[#667085] dark:text-[#8B95A5] truncate mt-0.5">
                          {task.description}
                        </p>
                      )}
                    </div>

                    <div>
                      <span className="px-2 py-0.5 rounded bg-[#C9A52A]/10 text-[#C9A52A] dark:text-[#D4B12F] text-[10.5px] font-bold uppercase">
                        {task.type || "Work"}
                      </span>
                    </div>

                    <div>
                      <span className={`px-2 py-0.5 rounded-full border text-[10.5px] font-semibold ${STATUS_STYLE[task.status] || STATUS_STYLE.Pending}`}>
                        {task.status}
                      </span>
                    </div>

                    <div className="text-[12.5px] font-medium text-[#17202A] dark:text-[#F2F4F7] flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-[#667085] shrink-0" />
                      <span className="truncate">{task.assigneeName || "Unassigned"}</span>
                    </div>

                    <div className="text-[12px] text-[#667085] dark:text-[#8B95A5] truncate">
                      {task.projectName || "Standalone"}
                    </div>

                    <div className={`text-[12px] font-mono ${isOverdue ? "text-rose-600 dark:text-rose-400 font-bold" : "text-[#667085] dark:text-[#8B95A5]"}`}>
                      {task.deadline ? new Date(task.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                    </div>

                    <div className="flex items-center justify-end gap-1">
                      {isCEOorCOCEO && (
                        <button
                          onClick={(e) => handleDelete(task.id, e)}
                          disabled={deletingId === task.id}
                          className="p-1 rounded text-[#667085] hover:text-rose-600 transition-colors cursor-pointer"
                          title="Delete task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <span className="text-[#667085] hover:text-[#17202A] dark:hover:text-[#F2F4F7] text-[12px]">
                        <ChevronRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>

                  {/* Mobile Task Card */}
                  <div className="md:hidden p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-[13.5px] font-bold text-[#17202A] dark:text-[#F2F4F7] leading-snug line-clamp-1">
                        {task.title}
                      </h4>
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase shrink-0 ${STATUS_STYLE[task.status] || STATUS_STYLE.Pending}`}>
                        {task.status}
                      </span>
                    </div>

                    {task.description && (
                      <p className="text-[12px] text-[#667085] dark:text-[#8B95A5] line-clamp-2 leading-relaxed">
                        {task.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[11.5px] text-[#667085] dark:text-[#8B95A5]">
                      <span>Assignee: <strong className="text-[#17202A] dark:text-[#F2F4F7] font-semibold">{task.assigneeName || "Unassigned"}</strong></span>
                      <span className="font-mono">Due: {task.deadline ? new Date(task.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modals & Mobile Sheets */}
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
