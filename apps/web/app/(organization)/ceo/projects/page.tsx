"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Plus, FolderKanban, Search, AlertCircle,
  Trash2, RefreshCw, ChevronRight, LayoutGrid, List,
  Edit, X, MoreVertical, ArrowUpRight
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { useSocket } from "@/components/providers/socket-provider";
import { useRegisterRefresh } from "@/components/providers/global-refresh-provider";
import Link from "next/link";
import { CreateProjectModal } from "@/components/organization/create-project-modal";
import { EditProjectModal } from "@/components/organization/edit-project-modal";
import { DeleteConfirmationModal } from "@/components/organization/delete-confirmation-modal";
import { CustomDropdown } from "@/components/ui/custom-dropdown";

const STATUS_BADGE: Record<string, { bg: string; text: string; dot: string }> = {
  ACTIVE: { bg: "bg-emerald-500/10 border-emerald-500/20 dark:bg-emerald-500/10 light:bg-emerald-50", text: "text-emerald-500 dark:text-emerald-400 light:text-emerald-700", dot: "bg-emerald-500" },
  Active: { bg: "bg-emerald-500/10 border-emerald-500/20 dark:bg-emerald-500/10 light:bg-emerald-50", text: "text-emerald-500 dark:text-emerald-400 light:text-emerald-700", dot: "bg-emerald-500" },
  PLANNING: { bg: "bg-blue-500/10 border-blue-500/20 dark:bg-blue-500/10 light:bg-blue-50", text: "text-blue-500 dark:text-blue-400 light:text-blue-700", dot: "bg-blue-500" },
  Planning: { bg: "bg-blue-500/10 border-blue-500/20 dark:bg-blue-500/10 light:bg-blue-50", text: "text-blue-500 dark:text-blue-400 light:text-blue-700", dot: "bg-blue-500" },
  ON_HOLD: { bg: "bg-amber-500/10 border-amber-500/20 dark:bg-amber-500/10 light:bg-amber-50", text: "text-amber-500 dark:text-amber-400 light:text-amber-700", dot: "bg-amber-500" },
  "On Hold": { bg: "bg-amber-500/10 border-amber-500/20 dark:bg-amber-500/10 light:bg-amber-50", text: "text-amber-500 dark:text-amber-400 light:text-amber-700", dot: "bg-amber-500" },
  COMPLETED: { bg: "bg-purple-500/10 border-purple-500/20 dark:bg-purple-500/10 light:bg-purple-50", text: "text-purple-400 dark:text-purple-300 light:text-purple-700", dot: "bg-purple-400" },
  Completed: { bg: "bg-purple-500/10 border-purple-500/20 dark:bg-purple-500/10 light:bg-purple-50", text: "text-purple-400 dark:text-purple-300 light:text-purple-700", dot: "bg-purple-400" },
  ARCHIVED: { bg: "bg-slate-500/10 border-slate-500/20 dark:bg-slate-500/10 light:bg-zinc-100", text: "text-slate-400 dark:text-slate-400 light:text-zinc-600", dot: "bg-slate-400" },
  Archived: { bg: "bg-slate-500/10 border-slate-500/20 dark:bg-slate-500/10 light:bg-zinc-100", text: "text-slate-400 dark:text-slate-400 light:text-zinc-600", dot: "bg-slate-400" },
};

const PRIORITY_BADGE: Record<string, { text: string; dot: string }> = {
  Critical: { text: "text-rose-500 font-bold", dot: "bg-rose-500" },
  CRITICAL: { text: "text-rose-500 font-bold", dot: "bg-rose-500" },
  High: { text: "text-amber-500 font-bold", dot: "bg-amber-500" },
  HIGH: { text: "text-amber-500 font-bold", dot: "bg-amber-500" },
  Medium: { text: "text-[#C9A52A] font-semibold", dot: "bg-[#C9A52A]" },
  MEDIUM: { text: "text-[#C9A52A] font-semibold", dot: "bg-[#C9A52A]" },
  Low: { text: "text-slate-400 dark:text-slate-400 light:text-zinc-500 font-normal", dot: "bg-slate-400" },
  LOW: { text: "text-slate-400 dark:text-slate-400 light:text-zinc-500 font-normal", dot: "bg-slate-400" },
};

function fmtDeadlineLabel(dateStr?: string | null, status?: string): { dateText: string; relText: string; isOverdue: boolean; diffDays: number } {
  if (!dateStr) return { dateText: "—", relText: "No deadline", isOverdue: false, diffDays: 999 };
  try {
    const target = new Date(dateStr);
    const now = new Date();
    const isCompleted = (status || "").toUpperCase() === "COMPLETED";

    const dateText = target.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    if (isCompleted) return { dateText, relText: "Completed", isOverdue: false, diffDays: 999 };

    const diffDays = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      return { dateText, relText: `Overdue · ${dateText}`, isOverdue: true, diffDays };
    } else if (diffDays === 0) {
      return { dateText, relText: `Due Today`, isOverdue: false, diffDays };
    } else {
      return { dateText, relText: `Due ${dateText}`, isOverdue: false, diffDays };
    }
  } catch {
    return { dateText: dateStr, relText: "", isOverdue: false, diffDays: 999 };
  }
}

export default function ProjectsPage() {
  const { socket } = useSocket();
  const [realProjects, setRealProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search & Filter State
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [ownerFilter, setOwnerFilter] = useState("All");
  const [assigneeFilter, setAssigneeFilter] = useState("All");
  const [deadlineFilter, setDeadlineFilter] = useState("All");
  const [progressFilter, setProgressFilter] = useState("All");
  const [viewMode, setViewMode] = useState<"table" | "board">("table");

  // Selection & Actions State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any | null>(null);
  const [deleteConfirmSingleId, setDeleteConfirmSingleId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);

  // Drag & drop state for Board view
  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  // Close Action Dropdowns on Click Outside & Android Back Hardware Gesture
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setActiveActionMenuId(null);
      }
    }
    function handlePopState() {
      if (activeActionMenuId) {
        setActiveActionMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("popstate", handlePopState);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [activeActionMenuId]);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : undefined;
      const res = await apiClient.get(`/org/projects${wsId ? `?workspaceId=${wsId}` : ""}`);
      if (res.data?.success) {
        setRealProjects(res.data.data || []);
        setError("");
      } else {
        setError(res.data?.error || "Failed to load organization projects.");
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || "Unable to connect to projects service.");
    } finally {
      setLoading(false);
    }
  }, []);

  useRegisterRefresh(fetchProjects);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Socket listener for real-time project updates
  useEffect(() => {
    if (!socket) return;
    const handleRefresh = () => fetchProjects();

    socket.on("project_updated", handleRefresh);
    socket.on("project_created", handleRefresh);
    socket.on("project_deleted", handleRefresh);

    return () => {
      socket.off("project_updated", handleRefresh);
      socket.off("project_created", handleRefresh);
      socket.off("project_deleted", handleRefresh);
    };
  }, [socket, fetchProjects]);

  // Unique Owner & Assignee Filter Options
  const ownerOptions = useMemo(() => {
    const set = new Set<string>();
    realProjects.forEach((p) => {
      const o = p.ownerName || p.ownerEmail;
      if (o) set.add(o);
    });
    return Array.from(set);
  }, [realProjects]);

  const assigneeOptions = useMemo(() => {
    const set = new Set<string>();
    realProjects.forEach((p) => {
      const a = p.assignedUserName || p.assigneeName || p.assignedToUser?.name;
      if (a) set.add(a);
    });
    return Array.from(set);
  }, [realProjects]);

  // Dropdown options formatted for CustomDropdown
  const statusDropdownOptions = useMemo(
    () => [
      { value: "All", label: "All" },
      { value: "Active", label: "Active", dotColor: "bg-emerald-500" },
      { value: "Planning", label: "Planning", dotColor: "bg-blue-500" },
      { value: "On Hold", label: "On Hold", dotColor: "bg-amber-500" },
      { value: "Completed", label: "Completed", dotColor: "bg-purple-400" },
      { value: "Archived", label: "Archived", dotColor: "bg-slate-400" },
    ],
    []
  );

  const priorityDropdownOptions = useMemo(
    () => [
      { value: "All", label: "All" },
      { value: "Critical", label: "Critical", dotColor: "bg-rose-500" },
      { value: "High", label: "High", dotColor: "bg-amber-500" },
      { value: "Medium", label: "Medium", dotColor: "bg-[#C9A52A]" },
      { value: "Low", label: "Low", dotColor: "bg-slate-400" },
    ],
    []
  );

  const ownerDropdownOptions = useMemo(() => {
    const opts = [{ value: "All", label: "All" }];
    ownerOptions.forEach((o) => opts.push({ value: o, label: o }));
    return opts;
  }, [ownerOptions]);

  const assigneeDropdownOptions = useMemo(() => {
    const opts = [{ value: "All", label: "All" }];
    assigneeOptions.forEach((a) => opts.push({ value: a, label: a }));
    return opts;
  }, [assigneeOptions]);

  // Filtered Project Items
  const filtered = useMemo(() => {
    return realProjects.filter((p) => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.name?.toLowerCase().includes(q) ||
        p.mandate?.toLowerCase().includes(q) ||
        p.objective?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        (p.ownerName || "").toLowerCase().includes(q) ||
        (p.assignedUserName || p.assigneeName || "").toLowerCase().includes(q);

      const matchStatus =
        statusFilter === "All" ||
        p.status?.toUpperCase() === statusFilter.toUpperCase() ||
        (statusFilter === "Active" && p.status?.toUpperCase() === "ACTIVE") ||
        (statusFilter === "Planning" && p.status?.toUpperCase() === "PLANNING") ||
        (statusFilter === "On Hold" && p.status?.toUpperCase() === "ON_HOLD") ||
        (statusFilter === "Completed" && p.status?.toUpperCase() === "COMPLETED") ||
        (statusFilter === "Archived" && p.status?.toUpperCase() === "ARCHIVED");

      const matchPriority =
        priorityFilter === "All" ||
        p.priority?.toUpperCase() === priorityFilter.toUpperCase();

      const matchOwner =
        ownerFilter === "All" ||
        p.ownerName === ownerFilter ||
        p.ownerEmail === ownerFilter;

      const matchAssignee =
        assigneeFilter === "All" ||
        p.assignedUserName === assigneeFilter ||
        p.assigneeName === assigneeFilter ||
        p.assignedToUser?.name === assigneeFilter;

      const dInfo = fmtDeadlineLabel(p.deadline || p.targetDate, p.status);
      const matchDeadline =
        deadlineFilter === "All" ||
        (deadlineFilter === "Overdue" && dInfo.isOverdue) ||
        (deadlineFilter === "DueToday" && dInfo.diffDays === 0) ||
        (deadlineFilter === "DueThisWeek" && dInfo.diffDays >= 0 && dInfo.diffDays <= 7);

      const prog = p.progress || 0;
      const matchProgress =
        progressFilter === "All" ||
        (progressFilter === "NotStarted" && prog === 0) ||
        (progressFilter === "InProgress" && prog > 0 && prog < 100) ||
        (progressFilter === "Completed" && prog >= 100);

      return matchSearch && matchStatus && matchPriority && matchOwner && matchAssignee && matchDeadline && matchProgress;
    });
  }, [realProjects, search, statusFilter, priorityFilter, ownerFilter, assigneeFilter, deadlineFilter, progressFilter]);

  // Live KPI Summary Counts
  const kpis = useMemo(() => {
    const total = realProjects.length;
    const active = realProjects.filter((p) => (p.status || "").toUpperCase() === "ACTIVE").length;
    const planning = realProjects.filter((p) => (p.status || "").toUpperCase() === "PLANNING").length;
    const onHold = realProjects.filter((p) => (p.status || "").toUpperCase() === "ON_HOLD").length;
    const completed = realProjects.filter((p) => (p.status || "").toUpperCase() === "COMPLETED").length;
    return { total, active, planning, onHold, completed };
  }, [realProjects]);

  // More Filters Popover Node
  const activeMoreFiltersCount = (deadlineFilter !== "All" ? 1 : 0) + (progressFilter !== "All" ? 1 : 0);

  const handleClearMoreFilters = () => {
    setDeadlineFilter("All");
    setProgressFilter("All");
  };

  const moreFiltersContentNode = (
    <div className="space-y-3 text-[12px] font-sans">
      <div>
        <div className="text-[10.5px] font-bold text-[#8B95A5] dark:text-[#8B95A5] light:text-zinc-500 uppercase tracking-wider mb-1.5">
          Deadline
        </div>
        <div className="space-y-1">
          {[
            { id: "All", name: "All" },
            { id: "Overdue", name: "Overdue" },
            { id: "DueToday", name: "Due Today" },
            { id: "DueThisWeek", name: "Due This Week" },
          ].map((df) => (
            <label
              key={df.id}
              className="flex items-center gap-2 cursor-pointer text-[#F2F4F7] dark:text-[#F2F4F7] light:text-zinc-900 font-medium"
            >
              <input
                type="radio"
                name="deadlineFilter"
                checked={deadlineFilter === df.id}
                onChange={() => setDeadlineFilter(df.id)}
                className="accent-[#C9A52A]"
              />
              <span>{df.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="pt-2 border-t border-[#272D36] dark:border-[#272D36] light:border-zinc-200">
        <div className="text-[10.5px] font-bold text-[#8B95A5] dark:text-[#8B95A5] light:text-zinc-500 uppercase tracking-wider mb-1.5">
          Progress
        </div>
        <div className="space-y-1">
          {[
            { id: "All", name: "All" },
            { id: "NotStarted", name: "Not Started (0%)" },
            { id: "InProgress", name: "In Progress (1-99%)" },
            { id: "Completed", name: "Completed (100%)" },
          ].map((pf) => (
            <label
              key={pf.id}
              className="flex items-center gap-2 cursor-pointer text-[#F2F4F7] dark:text-[#F2F4F7] light:text-zinc-900 font-medium"
            >
              <input
                type="radio"
                name="progressFilter"
                checked={progressFilter === pf.id}
                onChange={() => setProgressFilter(pf.id)}
                className="accent-[#C9A52A]"
              />
              <span>{pf.name}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  // Single Project Deletion
  const handleExecuteSingleDelete = async () => {
    if (!deleteConfirmSingleId) return;
    setDeleting(true);
    try {
      const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : undefined;
      await apiClient.delete(`/org/projects/${deleteConfirmSingleId}${wsId ? `?workspaceId=${wsId}` : ""}`);
      setRealProjects((prev) => prev.filter((p) => p.id !== deleteConfirmSingleId));
      setSelectedIds((prev) => prev.filter((i) => i !== deleteConfirmSingleId));
      setDeleteConfirmSingleId(null);
      fetchProjects();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to delete organization project");
    } finally {
      setDeleting(false);
    }
  };

  // Drag & Drop Status Handler for Board View
  const handleDropOnColumn = async (targetStatus: string, e: React.DragEvent) => {
    e.preventDefault();
    const projectId = e.dataTransfer.getData("text/plain") || draggedProjectId;
    if (!projectId) return;

    const targetProject = realProjects.find((p) => p.id === projectId);
    if (!targetProject || targetProject.status === targetStatus) return;

    setRealProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, status: targetStatus } : p))
    );

    try {
      const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : undefined;
      await apiClient.put(`/org/projects/${projectId}${wsId ? `?workspaceId=${wsId}` : ""}`, {
        name: targetProject.name,
        status: targetStatus,
      });
      fetchProjects();
    } catch (err: any) {
      console.error("Failed to update status:", err);
      fetchProjects();
    } finally {
      setDraggedProjectId(null);
    }
  };

  const basePath = typeof window !== "undefined"
    ? window.location.pathname.startsWith("/co-ceo") ? "/co-ceo"
    : window.location.pathname.startsWith("/member") ? "/member"
    : "/ceo"
    : "/ceo";

  return (
    <div className="w-full h-screen min-h-[100dvh] overflow-hidden bg-[#0B0E12] dark:bg-[#0B0E12] light:bg-[#F6F7F9] text-[#F2F4F7] dark:text-[#F2F4F7] light:text-zinc-900 font-sans flex flex-col select-none transition-colors duration-150">
      
      {/* ── 100VH DESKTOP & RESPONSIVE MAIN WORKSPACE WRAPPER ── */}
      <div className="flex-1 min-h-0 flex flex-col p-3 sm:p-6 max-w-[1700px] w-full mx-auto space-y-3 sm:space-y-4 overflow-hidden">
        
        {/* ── COMPACT PAGE HEADER & ORG CONTEXT ── */}
        <div className="shrink-0 flex items-center justify-between gap-3 border-b border-[#272D36] dark:border-[#272D36] light:border-zinc-200 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[19px] sm:text-[22px] font-extrabold text-[#F2F4F7] dark:text-[#F2F4F7] light:text-zinc-900 tracking-tight leading-none">
                Projects
              </h1>
              <span className="text-[10.5px] px-2 py-0.5 rounded-full bg-[#C9A52A]/10 text-[#C9A52A] font-bold border border-[#C9A52A]/20">
                ManMadhan Organization
              </span>
            </div>
            <p className="text-[12px] text-[#8B95A5] dark:text-[#8B95A5] light:text-zinc-500 mt-1 hidden md:block">
              Plan, execute, and track organization work from one single-surface execution workspace.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchProjects}
              className="h-[36px] px-3 rounded-[9px] bg-[#15191F] dark:bg-[#15191F] light:bg-white border border-[#272D36] dark:border-[#272D36] light:border-zinc-300 text-[#8B95A5] dark:text-[#8B95A5] light:text-zinc-700 hover:text-[#F2F4F7] dark:hover:text-[#F2F4F7] light:hover:text-zinc-900 text-[12px] font-bold hidden md:flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Refresh projects"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="h-[36px] sm:h-[38px] px-3.5 sm:px-4 rounded-[9px] bg-[#C9A52A] text-[#0B0D10] font-bold text-[12px] flex items-center justify-center gap-1.5 cursor-pointer hover:opacity-90 transition-opacity shadow-xs whitespace-nowrap"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ New Project</span>
            </button>
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="shrink-0 p-3 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 text-[12.5px] font-medium flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={fetchProjects} className="font-semibold underline cursor-pointer">
              Retry
            </button>
          </div>
        )}

        {/* ── COMPACT STATUS SUMMARY STRIP ── */}
        <div className="shrink-0 flex items-center justify-between px-3.5 py-2 rounded-[12px] bg-[#15191F] dark:bg-[#15191F] light:bg-white border border-[#272D36] dark:border-[#272D36] light:border-zinc-200 text-[12px] shadow-2xs">
          <div className="flex items-center gap-4 sm:gap-6 overflow-x-auto [scrollbar-width:none]">
            <button
              onClick={() => setStatusFilter("All")}
              className={`flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${
                statusFilter === "All" ? "text-[#C9A52A] font-bold" : "text-[#8B95A5] dark:text-[#8B95A5] light:text-zinc-600 hover:text-[#F2F4F7]"
              }`}
            >
              <span className="font-mono text-[13px] font-extrabold">{kpis.total}</span>
              <span>Projects</span>
            </button>

            <span className="w-px h-3.5 bg-[#272D36] dark:bg-[#272D36] light:bg-zinc-200 shrink-0" />

            <button
              onClick={() => setStatusFilter("Active")}
              className={`flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${
                statusFilter === "Active" ? "text-emerald-400 font-bold" : "text-[#8B95A5] dark:text-[#8B95A5] light:text-zinc-600 hover:text-[#F2F4F7]"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="font-mono text-[13px] font-extrabold text-emerald-500 dark:text-emerald-400 light:text-emerald-600">{kpis.active}</span>
              <span>Active</span>
            </button>

            <span className="w-px h-3.5 bg-[#272D36] dark:bg-[#272D36] light:bg-zinc-200 shrink-0" />

            <button
              onClick={() => setStatusFilter("Planning")}
              className={`flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${
                statusFilter === "Planning" ? "text-blue-400 font-bold" : "text-[#8B95A5] dark:text-[#8B95A5] light:text-zinc-600 hover:text-[#F2F4F7]"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
              <span className="font-mono text-[13px] font-extrabold text-blue-500 dark:text-blue-400 light:text-blue-600">{kpis.planning}</span>
              <span>Planning</span>
            </button>

            <span className="w-px h-3.5 bg-[#272D36] dark:bg-[#272D36] light:bg-zinc-200 shrink-0" />

            <button
              onClick={() => setStatusFilter("On Hold")}
              className={`flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${
                statusFilter === "On Hold" ? "text-amber-400 font-bold" : "text-[#8B95A5] dark:text-[#8B95A5] light:text-zinc-600 hover:text-[#F2F4F7]"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              <span className="font-mono text-[13px] font-extrabold text-amber-500 dark:text-amber-400 light:text-amber-600">{kpis.onHold}</span>
              <span>On Hold</span>
            </button>

            <span className="w-px h-3.5 bg-[#272D36] dark:bg-[#272D36] light:bg-zinc-200 shrink-0" />

            <button
              onClick={() => setStatusFilter("Completed")}
              className={`flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${
                statusFilter === "Completed" ? "text-purple-400 font-bold" : "text-[#8B95A5] dark:text-[#8B95A5] light:text-zinc-600 hover:text-[#F2F4F7]"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
              <span className="font-mono text-[13px] font-extrabold text-purple-400 light:text-purple-600">{kpis.completed}</span>
              <span>Completed</span>
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-2 text-[11px] text-[#667085] dark:text-[#667085] light:text-zinc-400">
            <span>Workspace Isolated</span>
          </div>
        </div>

        {/* ── COMPACT CONTROL FILTER BAR ── */}
        <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-2 rounded-[12px] bg-[#15191F] dark:bg-[#15191F] light:bg-white border border-[#272D36] dark:border-[#272D36] light:border-zinc-200 shadow-2xs">
          
          {/* Search Box */}
          <div className="relative flex-1 w-full sm:max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8B95A5] dark:text-[#8B95A5] light:text-zinc-400" />
            <input
              type="text"
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-[36px] pl-9 pr-3.5 bg-[#111419] dark:bg-[#111419] light:bg-zinc-50 border border-[#272D36] dark:border-[#272D36] light:border-zinc-200 rounded-[8px] text-[12px] text-[#F2F4F7] dark:text-[#F2F4F7] light:text-zinc-900 placeholder-[#667085] dark:placeholder-[#667085] light:placeholder-zinc-400 outline-none focus:border-[#C9A52A]"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#667085] hover:text-[#F2F4F7]">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Reusable Custom Dropdown Filters */}
          <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
            {/* Status Dropdown */}
            <CustomDropdown
              label="Status"
              value={statusFilter}
              onChange={setStatusFilter}
              options={statusDropdownOptions}
              minDropdownWidth={160}
              className="w-full sm:w-auto"
            />

            {/* Priority Dropdown */}
            <CustomDropdown
              label="Priority"
              value={priorityFilter}
              onChange={setPriorityFilter}
              options={priorityDropdownOptions}
              minDropdownWidth={160}
              className="w-full sm:w-auto"
            />

            {/* Owner Dropdown (Desktop Only) */}
            <div className="hidden md:inline-block">
              <CustomDropdown
                label="Owner"
                value={ownerFilter}
                onChange={setOwnerFilter}
                options={ownerDropdownOptions}
                searchable={ownerOptions.length > 3}
                searchPlaceholder="Search owners..."
                minDropdownWidth={200}
              />
            </div>

            {/* Assignee Dropdown (Desktop Only) */}
            <div className="hidden md:inline-block">
              <CustomDropdown
                label="Assignee"
                value={assigneeFilter}
                onChange={setAssigneeFilter}
                options={assigneeDropdownOptions}
                searchable={assigneeOptions.length > 3}
                searchPlaceholder="Search assignees..."
                minDropdownWidth={200}
              />
            </div>

            {/* More Filters Dropdown (Desktop Only) */}
            <div className="hidden md:inline-block">
              <CustomDropdown
                label="More Filters"
                value=""
                onChange={() => {}}
                options={[]}
                isMoreFilters={true}
                moreFiltersContent={moreFiltersContentNode}
                activeFilterCount={activeMoreFiltersCount}
                onClearFilters={handleClearMoreFilters}
                minDropdownWidth={220}
              />
            </div>

            {/* View Mode Toggle (Desktop Only) */}
            <div className="hidden md:flex items-center p-0.5 rounded-[8px] bg-[#111419] dark:bg-[#111419] light:bg-zinc-100 border border-[#272D36] dark:border-[#272D36] light:border-zinc-200">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`px-3 h-[30px] rounded-[6px] text-[11.5px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === "table"
                    ? "bg-[#C9A52A] text-[#0B0D10]"
                    : "text-[#8B95A5] dark:text-[#8B95A5] light:text-zinc-600 hover:text-[#F2F4F7] dark:hover:text-[#F2F4F7] light:hover:text-zinc-900"
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Table</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("board")}
                className={`px-3 h-[30px] rounded-[6px] text-[11.5px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === "board"
                    ? "bg-[#C9A52A] text-[#0B0D10]"
                    : "text-[#8B95A5] dark:text-[#8B95A5] light:text-zinc-600 hover:text-[#F2F4F7] dark:hover:text-[#F2F4F7] light:hover:text-zinc-900"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Board</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── HERO PROJECT WORKSPACE CONTAINER (Fills remaining height, Y-Scroll) ── */}
        <div className="flex-1 min-h-0 bg-[#15191F] dark:bg-[#15191F] light:bg-white border border-[#272D36] dark:border-[#272D36] light:border-zinc-200 rounded-[14px] shadow-2xs overflow-hidden flex flex-col">
          {loading ? (
            <div className="p-4 sm:p-6 space-y-3 animate-pulse my-auto">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-[48px] bg-[#111419] dark:bg-[#111419] light:bg-zinc-50 rounded-[8px] w-full flex items-center justify-between px-4">
                  <div className="w-1/3 h-4 bg-[#272D36] dark:bg-[#272D36] light:bg-zinc-200 rounded" />
                  <div className="w-1/6 h-4 bg-[#272D36] dark:bg-[#272D36] light:bg-zinc-200 rounded" />
                  <div className="w-1/6 h-4 bg-[#272D36] dark:bg-[#272D36] light:bg-zinc-200 rounded" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            /* Compact Empty State */
            <div className="flex flex-col items-center justify-center p-6 sm:p-8 text-center space-y-4 my-auto">
              <div className="w-12 h-12 rounded-full bg-[#C9A52A]/10 text-[#C9A52A] flex items-center justify-center border border-[#C9A52A]/20">
                <FolderKanban className="w-6 h-6 stroke-[2]" />
              </div>

              <div className="space-y-1 max-w-sm">
                <h3 className="text-[15px] sm:text-[16px] font-extrabold text-[#F2F4F7] dark:text-[#F2F4F7] light:text-zinc-900">
                  {realProjects.length === 0 ? "No projects yet" : "No matching projects"}
                </h3>
                <p className="text-[12px] text-[#8B95A5] dark:text-[#8B95A5] light:text-zinc-500 leading-relaxed">
                  {realProjects.length === 0
                    ? "Create your first organization project to begin execution."
                    : "No projects matched your active search or filter rules."}
                </p>
              </div>

              {realProjects.length === 0 ? (
                <button
                  onClick={() => setIsCreateOpen(true)}
                  className="px-4 h-[36px] rounded-[9px] bg-[#C9A52A] text-[#0B0D10] text-[12px] font-bold flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>+ Create Project</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("All");
                    setPriorityFilter("All");
                    setOwnerFilter("All");
                    setAssigneeFilter("All");
                    setDeadlineFilter("All");
                    setProgressFilter("All");
                  }}
                  className="px-4 h-[34px] rounded-[8px] bg-[#111419] dark:bg-[#111419] light:bg-zinc-100 border border-[#272D36] dark:border-[#272D36] light:border-zinc-300 text-[12px] font-bold text-[#F2F4F7] dark:text-[#F2F4F7] light:text-zinc-900 hover:bg-[#272D36] transition-colors cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <>
              {/* ── MOBILE EXECUTIVE PROJECT CARDS (<768px) ── */}
              <div className="md:hidden flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5 pb-[calc(88px+env(safe-area-inset-bottom,0px))]">
                {filtered.map((p) => {
                  const statusObj = STATUS_BADGE[p.status] || STATUS_BADGE.Archived;
                  const priorityObj = PRIORITY_BADGE[p.priority] || PRIORITY_BADGE.Medium;
                  const deadlineInfo = fmtDeadlineLabel(p.deadline || p.targetDate, p.status);
                  const isMenuOpen = activeActionMenuId === p.id;

                  return (
                    <div
                      key={p.id}
                      className="p-3.5 rounded-[12px] bg-[#111419] dark:bg-[#111419] light:bg-zinc-50 border border-[#272D36] dark:border-[#272D36] light:border-zinc-200 space-y-2.5 relative"
                    >
                      {/* Top Row: Title + Action Menu */}
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`${basePath}/projects/${p.id}`}
                          className="text-[16px] font-semibold text-[#F2F4F7] dark:text-[#F2F4F7] light:text-zinc-900 hover:text-[#C9A52A] leading-snug line-clamp-1 flex-1 py-1"
                        >
                          {p.name}
                        </Link>

                        <div className="relative shrink-0">
                          <button
                            type="button"
                            onClick={() => setActiveActionMenuId(isMenuOpen ? null : p.id)}
                            className="w-[44px] h-[44px] flex items-center justify-center rounded-[8px] text-[#8B95A5] dark:text-[#8B95A5] light:text-zinc-500 hover:text-[#F2F4F7] cursor-pointer"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {isMenuOpen && (
                            <div
                              ref={actionMenuRef}
                              className="absolute right-0 top-7 w-44 bg-[#15191F] dark:bg-[#15191F] light:bg-white border border-[#272D36] dark:border-[#272D36] light:border-zinc-200 rounded-[10px] shadow-2xl z-50 p-1 divide-y divide-[#272D36]/60 dark:divide-[#272D36]/60 light:divide-zinc-200 text-left"
                            >
                              <div className="py-1">
                                <Link
                                  href={`${basePath}/projects/${p.id}`}
                                  className="w-full px-3 py-1.5 text-[12px] font-medium text-[#F2F4F7] dark:text-[#F2F4F7] light:text-zinc-900 hover:bg-[#C9A52A]/10 hover:text-[#C9A52A] rounded-[6px] flex items-center justify-between transition-colors block"
                                >
                                  <span>Open Project</span>
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </Link>
                              </div>

                              <div className="py-1">
                                <button
                                  type="button"
                                  onClick={() => { setEditingProject(p); setActiveActionMenuId(null); }}
                                  className="w-full px-3 py-1.5 text-[12px] font-medium text-[#F2F4F7] dark:text-[#F2F4F7] light:text-zinc-900 hover:bg-[#C9A52A]/10 hover:text-[#C9A52A] rounded-[6px] flex items-center gap-2 transition-colors text-left cursor-pointer"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                  <span>Edit Project</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => { setDeleteConfirmSingleId(p.id); setActiveActionMenuId(null); }}
                                  className="w-full px-3 py-1.5 text-[12px] font-medium text-rose-400 hover:bg-rose-500/10 rounded-[6px] flex items-center gap-2 transition-colors text-left cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Delete Project</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Description Line */}
                      {(p.mandate || p.description || p.objective) && (
                        <p className="text-[12px] text-[#8B95A5] dark:text-[#8B95A5] light:text-zinc-500 line-clamp-1 leading-normal">
                          {p.mandate || p.description || p.objective}
                        </p>
                      )}

                      {/* Status + Priority Dots */}
                      <div className="flex items-center gap-3 text-[11.5px]">
                        <span className={`inline-flex items-center gap-1.5 font-bold ${statusObj.text}`}>
                          <span className={`w-2 h-2 rounded-full ${statusObj.dot}`} />
                          <span>{p.status}</span>
                        </span>

                        <span className={`inline-flex items-center gap-1.5 ${priorityObj.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${priorityObj.dot}`} />
                          <span>{p.priority || "Medium"}</span>
                        </span>
                      </div>

                      {/* Deadline Label */}
                      {deadlineInfo.relText && (
                        <div className={`text-[11px] font-mono ${deadlineInfo.isOverdue ? "text-rose-500 font-bold" : "text-[#8B95A5] dark:text-[#8B95A5] light:text-zinc-500"}`}>
                          {deadlineInfo.relText}
                        </div>
                      )}

                      {/* Progress Bar */}
                      <div className="space-y-1 pt-1 border-t border-[#272D36]/60 dark:border-[#272D36]/60 light:border-zinc-200">
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="text-[#8B95A5] dark:text-[#8B95A5] light:text-zinc-500">Progress</span>
                          <span className="font-bold text-[#F2F4F7] dark:text-[#F2F4F7] light:text-zinc-900">{p.progress || 0}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-[#15191F] dark:bg-[#15191F] light:bg-zinc-200 border border-[#272D36] dark:border-[#272D36] light:border-zinc-300 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#C9A52A] rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, Math.max(0, p.progress || 0))}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── DESKTOP HERO PROJECT TABLE & BOARD (>=768px) ── */}
              {viewMode === "table" ? (
                <div className="hidden md:block w-full flex-1 min-h-0 overflow-y-auto">
                  <table className="w-full text-left text-[12.5px] border-collapse">
                    <thead className="sticky top-0 z-20 bg-[#111419] dark:bg-[#111419] light:bg-zinc-100 border-b border-[#272D36] dark:border-[#272D36] light:border-zinc-200 text-[10.5px] font-bold text-[#8B95A5] dark:text-[#8B95A5] light:text-zinc-500 uppercase tracking-wider">
                      <tr className="h-[42px]">
                        <th className="px-4 py-3 min-w-[260px]">PROJECT</th>
                        <th className="px-4 py-3 min-w-[130px]">OWNER</th>
                        <th className="px-4 py-3 min-w-[130px]">ASSIGNEE</th>
                        <th className="px-4 py-3 min-w-[100px]">STATUS</th>
                        <th className="px-4 py-3 min-w-[90px]">PRIORITY</th>
                        <th className="px-4 py-3 min-w-[140px]">DEADLINE</th>
                        <th className="px-4 py-3 min-w-[140px]">PROGRESS</th>
                        <th className="px-4 py-3 text-right w-[60px]">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#272D36]/60 dark:divide-[#272D36]/60 light:divide-zinc-200">
                      {filtered.map((p) => {
                        const statusObj = STATUS_BADGE[p.status] || STATUS_BADGE.Archived;
                        const priorityObj = PRIORITY_BADGE[p.priority] || PRIORITY_BADGE.Medium;
                        const deadlineInfo = fmtDeadlineLabel(p.deadline || p.targetDate, p.status);
                        const isMenuOpen = activeActionMenuId === p.id;

                        return (
                          <tr key={p.id} className="hover:bg-[#111419]/80 dark:hover:bg-[#111419]/80 light:hover:bg-zinc-50 transition-colors h-[54px] group">
                            
                            {/* PROJECT IDENTITY */}
                            <td className="px-4 py-2.5">
                              <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-[8px] bg-[#C9A52A]/10 text-[#C9A52A] border border-[#C9A52A]/20 flex items-center justify-center font-bold text-[12px] shrink-0 mt-0.5">
                                  {p.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <Link
                                    href={`${basePath}/projects/${p.id}`}
                                    className="font-bold text-[#F2F4F7] dark:text-[#F2F4F7] light:text-zinc-900 group-hover:text-[#C9A52A] transition-colors flex items-center gap-1.5 line-clamp-1"
                                  >
                                    <span>{p.name}</span>
                                    <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-[#C9A52A]" />
                                  </Link>
                                  {(p.mandate || p.description || p.objective) && (
                                    <p className="text-[11px] text-[#8B95A5] dark:text-[#8B95A5] light:text-zinc-500 line-clamp-1 mt-0.5">
                                      {p.mandate || p.description || p.objective}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* OWNER */}
                            <td className="px-4 py-2.5 font-medium text-[#F2F4F7] dark:text-[#F2F4F7] light:text-zinc-900">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-[#272D36] dark:bg-[#272D36] light:bg-zinc-200 text-[#F2F4F7] dark:text-[#F2F4F7] light:text-zinc-800 text-[10px] font-extrabold flex items-center justify-center shrink-0">
                                  {(p.ownerName || "O").charAt(0).toUpperCase()}
                                </div>
                                <span className="truncate text-[12px]">{p.ownerName || p.ownerEmail || "Owner"}</span>
                              </div>
                            </td>

                            {/* ASSIGNEE */}
                            <td className="px-4 py-2.5 font-medium text-[#F2F4F7] dark:text-[#F2F4F7] light:text-zinc-900">
                              {p.assignedUserName || p.assigneeName || p.assignedToUser?.name ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-[#C9A52A]/20 text-[#C9A52A] text-[10px] font-extrabold flex items-center justify-center shrink-0">
                                    {(p.assignedUserName || p.assigneeName || p.assignedToUser?.name || "A").charAt(0).toUpperCase()}
                                  </div>
                                  <span className="truncate text-[12px]">{p.assignedUserName || p.assigneeName || p.assignedToUser?.name}</span>
                                </div>
                              ) : (
                                <span className="text-[11px] text-[#667085] dark:text-[#667085] light:text-zinc-400 italic">Unassigned</span>
                              )}
                            </td>

                            {/* STATUS */}
                            <td className="px-4 py-2.5">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusObj.bg} ${statusObj.text}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${statusObj.dot}`} />
                                <span>{p.status}</span>
                              </span>
                            </td>

                            {/* PRIORITY */}
                            <td className="px-4 py-2.5">
                              <span className={`inline-flex items-center gap-1 text-[11.5px] ${priorityObj.text}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${priorityObj.dot}`} />
                                <span>{p.priority || "Medium"}</span>
                              </span>
                            </td>

                            {/* DEADLINE */}
                            <td className="px-4 py-2.5 text-[11.5px]">
                              <div className="space-y-0.5">
                                <div className="font-mono text-[#F2F4F7] dark:text-[#F2F4F7] light:text-zinc-900 font-semibold">{deadlineInfo.dateText}</div>
                                {deadlineInfo.relText && (
                                  <div className={`text-[10.5px] ${deadlineInfo.isOverdue ? "text-rose-500 font-bold" : "text-[#8B95A5] dark:text-[#8B95A5] light:text-zinc-500"}`}>
                                    {deadlineInfo.relText}
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* PROGRESS */}
                            <td className="px-4 py-2.5">
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-[11px] font-mono">
                                  <span className="text-[#8B95A5] dark:text-[#8B95A5] light:text-zinc-500">{p.completedTasks || 0}/{p.totalTasks || 0} tasks</span>
                                  <span className="font-bold text-[#F2F4F7] dark:text-[#F2F4F7] light:text-zinc-900">{p.progress || 0}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-[#111419] dark:bg-[#111419] light:bg-zinc-200 border border-[#272D36] dark:border-[#272D36] light:border-zinc-300 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-[#C9A52A] rounded-full transition-all duration-300"
                                    style={{ width: `${Math.min(100, Math.max(0, p.progress || 0))}%` }}
                                  />
                                </div>
                              </div>
                            </td>

                            {/* ACTIONS MENU */}
                            <td className="px-4 py-2.5 text-right relative">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => setActiveActionMenuId(isMenuOpen ? null : p.id)}
                                  className="p-1.5 rounded-[6px] text-[#8B95A5] hover:text-[#F2F4F7] dark:hover:text-[#F2F4F7] light:hover:text-zinc-900 hover:bg-[#111419] dark:hover:bg-[#111419] light:hover:bg-zinc-100 transition-colors cursor-pointer"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>

                                {/* Dropdown Menu */}
                                {isMenuOpen && (
                                  <div
                                    ref={actionMenuRef}
                                    className="absolute right-4 top-10 w-44 bg-[#15191F] dark:bg-[#15191F] light:bg-white border border-[#272D36] dark:border-[#272D36] light:border-zinc-200 rounded-[10px] shadow-2xl z-50 p-1 divide-y divide-[#272D36]/60 dark:divide-[#272D36]/60 light:divide-zinc-200 text-left"
                                  >
                                    <div className="py-1">
                                      <Link
                                        href={`${basePath}/projects/${p.id}`}
                                        className="w-full px-3 py-1.5 text-[12px] font-medium text-[#F2F4F7] dark:text-[#F2F4F7] light:text-zinc-900 hover:bg-[#C9A52A]/10 hover:text-[#C9A52A] rounded-[6px] flex items-center justify-between transition-colors block"
                                      >
                                        <span>Open Project</span>
                                        <ChevronRight className="w-3.5 h-3.5" />
                                      </Link>
                                    </div>

                                    <div className="py-1">
                                      <button
                                        type="button"
                                        onClick={() => { setEditingProject(p); setActiveActionMenuId(null); }}
                                        className="w-full px-3 py-1.5 text-[12px] font-medium text-[#F2F4F7] dark:text-[#F2F4F7] light:text-zinc-900 hover:bg-[#C9A52A]/10 hover:text-[#C9A52A] rounded-[6px] flex items-center gap-2 transition-colors text-left cursor-pointer"
                                      >
                                        <Edit className="w-3.5 h-3.5" />
                                        <span>Edit Project</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => { setDeleteConfirmSingleId(p.id); setActiveActionMenuId(null); }}
                                        className="w-full px-3 py-1.5 text-[12px] font-medium text-rose-400 hover:bg-rose-500/10 rounded-[6px] flex items-center gap-2 transition-colors text-left cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>Delete Project</span>
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>

                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="hidden md:grid p-4 grid-cols-4 gap-4 w-full flex-1 min-h-0 overflow-y-auto">
                  {["Planning", "Active", "On Hold", "Completed"].map((status) => {
                    const colProjects = filtered.filter((p) => (p.status || "Planning").toUpperCase() === status.toUpperCase());
                    return (
                      <div
                        key={status}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleDropOnColumn(status, e)}
                        className="bg-[#111419] dark:bg-[#111419] light:bg-zinc-50 border border-[#272D36] dark:border-[#272D36] light:border-zinc-200 rounded-[12px] p-3 space-y-3 flex flex-col min-h-[360px]"
                      >
                        <div className="flex items-center justify-between border-b border-[#272D36] dark:border-[#272D36] light:border-zinc-200 pb-2">
                          <h3 className="text-[12.5px] font-extrabold text-[#F2F4F7] dark:text-[#F2F4F7] light:text-zinc-900 uppercase tracking-wider">{status}</h3>
                          <span className="px-2 py-0.5 rounded-full bg-[#15191F] dark:bg-[#15191F] light:bg-white text-[#8B95A5] dark:text-[#8B95A5] light:text-zinc-700 text-[11px] font-mono font-bold border border-[#272D36] dark:border-[#272D36] light:border-zinc-200">
                            {colProjects.length}
                          </span>
                        </div>

                        <div className="space-y-2.5 overflow-y-auto flex-1 pr-0.5">
                          {colProjects.map((p) => (
                            <div
                              key={p.id}
                              draggable
                              onDragStart={(e) => { e.dataTransfer.setData("text/plain", p.id); setDraggedProjectId(p.id); }}
                              className="p-3.5 rounded-[10px] bg-[#15191F] dark:bg-[#15191F] light:bg-white border border-[#272D36] dark:border-[#272D36] light:border-zinc-200 space-y-2.5 cursor-grab active:cursor-grabbing hover:border-[#C9A52A]/50 transition-colors shadow-2xs"
                            >
                              <Link href={`${basePath}/projects/${p.id}`} className="text-[13px] font-bold text-[#F2F4F7] dark:text-[#F2F4F7] light:text-zinc-900 hover:text-[#C9A52A] block leading-snug">
                                {p.name}
                              </Link>

                              {(p.mandate || p.description || p.objective) && (
                                <p className="text-[11.5px] text-[#8B95A5] dark:text-[#8B95A5] light:text-zinc-500 line-clamp-2 leading-relaxed">
                                  {p.mandate || p.description || p.objective}
                                </p>
                              )}

                              <div className="pt-2 border-t border-[#272D36] dark:border-[#272D36] light:border-zinc-200 space-y-1.5">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="text-[#8B95A5] dark:text-[#8B95A5] light:text-zinc-500">Progress</span>
                                  <span className="font-bold text-[#F2F4F7] dark:text-[#F2F4F7] light:text-zinc-900 font-mono">{p.progress || 0}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-[#111419] dark:bg-[#111419] light:bg-zinc-200 border border-[#272D36] dark:border-[#272D36] light:border-zinc-300 rounded-full overflow-hidden">
                                  <div className="h-full bg-[#C9A52A] rounded-full" style={{ width: `${p.progress || 0}%` }} />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

      </div>

      {/* Single-Surface Create Project Modal */}
      <CreateProjectModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => fetchProjects()}
      />

      {/* Edit Project Modal */}
      <EditProjectModal
        isOpen={!!editingProject}
        project={editingProject}
        onClose={() => setEditingProject(null)}
        onSuccess={() => fetchProjects()}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={!!deleteConfirmSingleId}
        title={`Delete "${realProjects.find((p) => p.id === deleteConfirmSingleId)?.name || 'Project'}"?`}
        description="This action will delete the project record and remove all associated assignments. This action cannot be undone."
        isSubmitting={deleting}
        onClose={() => setDeleteConfirmSingleId(null)}
        onConfirm={handleExecuteSingleDelete}
      />
    </div>
  );
}
