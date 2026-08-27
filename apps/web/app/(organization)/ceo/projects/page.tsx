"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Plus, FolderKanban, Search, AlertCircle,
  Trash2, ChevronRight, LayoutGrid, List,
  Edit, X, MoreVertical, ArrowUpRight, Filter, ChevronDown,
  CheckCircle2, Clock, Shield, AlertTriangle, RefreshCw, Layers
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { useSocket } from "@/components/providers/socket-provider";
import { useRegisterRefresh } from "@/components/providers/global-refresh-provider";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { EditProjectModal } from "@/components/organization/edit-project-modal";
import { DeleteConfirmationModal } from "@/components/organization/delete-confirmation-modal";
import { CustomDropdown } from "@/components/ui/custom-dropdown";

const STATUS_BADGE: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  ACTIVE: { bg: "bg-emerald-500/10 border-emerald-500/20", text: "text-emerald-500", dot: "bg-emerald-500", label: "Active" },
  Active: { bg: "bg-emerald-500/10 border-emerald-500/20", text: "text-emerald-500", dot: "bg-emerald-500", label: "Active" },
  PLANNING: { bg: "bg-blue-500/10 border-blue-500/20", text: "text-blue-500", dot: "bg-blue-500", label: "Planning" },
  Planning: { bg: "bg-blue-500/10 border-blue-500/20", text: "text-blue-500", dot: "bg-blue-500", label: "Planning" },
  ON_HOLD: { bg: "bg-amber-500/10 border-amber-500/20", text: "text-amber-500", dot: "bg-amber-500", label: "On Hold" },
  "On Hold": { bg: "bg-amber-500/10 border-amber-500/20", text: "text-amber-500", dot: "bg-amber-500", label: "On Hold" },
  COMPLETED: { bg: "bg-purple-500/10 border-purple-500/20", text: "text-purple-400", dot: "bg-purple-400", label: "Completed" },
  Completed: { bg: "bg-purple-500/10 border-purple-500/20", text: "text-purple-400", dot: "bg-purple-400", label: "Completed" },
  ARCHIVED: { bg: "bg-slate-500/10 border-slate-500/20", text: "text-slate-400", dot: "bg-slate-400", label: "Archived" },
  Archived: { bg: "bg-slate-500/10 border-slate-500/20", text: "text-slate-400", dot: "bg-slate-400", label: "Archived" },
};

const HEALTH_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  HEALTHY: { bg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-500", text: "Healthy", label: "Healthy" },
  Healthy: { bg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-500", text: "Healthy", label: "Healthy" },
  AT_RISK: { bg: "bg-amber-500/10 border-amber-500/20 text-amber-500", text: "At Risk", label: "At Risk" },
  "At Risk": { bg: "bg-amber-500/10 border-amber-500/20 text-amber-500", text: "At Risk", label: "At Risk" },
  CRITICAL: { bg: "bg-rose-500/10 border-rose-500/20 text-rose-500", text: "Critical", label: "Critical" },
  Critical: { bg: "bg-rose-500/10 border-rose-500/20 text-rose-500", text: "Critical", label: "Critical" },
};

const PRIORITY_BADGE: Record<string, { text: string; dot: string }> = {
  Critical: { text: "text-rose-500 font-bold", dot: "bg-rose-500" },
  CRITICAL: { text: "text-rose-500 font-bold", dot: "bg-rose-500" },
  High: { text: "text-amber-500 font-bold", dot: "bg-amber-500" },
  HIGH: { text: "text-amber-500 font-bold", dot: "bg-amber-500" },
  Medium: { text: "text-[#C9A52A] font-semibold", dot: "bg-[#C9A52A]" },
  MEDIUM: { text: "text-[#C9A52A] font-semibold", dot: "bg-[#C9A52A]" },
  Low: { text: "text-slate-400 font-normal", dot: "bg-slate-400" },
  LOW: { text: "text-slate-400 font-normal", dot: "bg-slate-400" },
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
      return { dateText, relText: `Overdue by ${Math.abs(diffDays)}d`, isOverdue: true, diffDays };
    } else if (diffDays === 0) {
      return { dateText, relText: "Due Today", isOverdue: false, diffDays };
    } else {
      return { dateText, relText: `Due in ${diffDays}d`, isOverdue: false, diffDays };
    }
  } catch {
    return { dateText: dateStr, relText: "—", isOverdue: false, diffDays: 999 };
  }
}

export default function ProjectsPage() {
  const pathname = usePathname() || "";
  const router = useRouter();
  const { socket } = useSocket();

  const basePath = pathname.startsWith("/co-ceo") ? "/co-ceo" : pathname.startsWith("/member") ? "/member" : "/ceo";
  const userRole = pathname.startsWith("/co-ceo") ? "CO-CEO" : pathname.startsWith("/member") ? "MEMBER" : "CEO";

  const [realProjects, setRealProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search & Multi-Filter State
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [coCeoFilter, setCoCeoFilter] = useState("All");
  const [deadlineFilter, setDeadlineFilter] = useState("All");
  const [healthFilter, setHealthFilter] = useState("All");
  const [viewMode, setViewMode] = useState<"table" | "board">("table");

  // Selection & Action Modals State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingProject, setEditingProject] = useState<any | null>(null);
  const [deleteConfirmSingleId, setDeleteConfirmSingleId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);

  // Bulk Action Modals State
  const [bulkActionType, setBulkActionType] = useState<"status" | "priority" | "archive" | "delete" | null>(null);
  const [bulkStatusValue, setBulkStatusValue] = useState<string>("Active");
  const [bulkPriorityValue, setBulkPriorityValue] = useState<string>("Medium");
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);

  const actionMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setActiveActionMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch real projects from API
  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : undefined;
      const res = await apiClient.get(`/org/projects?_t=${Date.now()}${wsId ? `&workspaceId=${wsId}` : ""}`);
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

  // Real-time socket listener
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

  // Derive unique CO-CEO options from real database projects
  const coCeoOptions = useMemo(() => {
    const set = new Set<string>();
    realProjects.forEach((p) => {
      const lead = p.coCeoLeadName || p.assignedUserName || p.assigneeName;
      if (lead && lead !== "Unassigned") set.add(lead);
    });
    return Array.from(set);
  }, [realProjects]);

  // Metric Cards Calculations (Real Database Data)
  const metrics = useMemo(() => {
    const total = realProjects.length;
    const active = realProjects.filter((p) => p.status?.toUpperCase() === "ACTIVE" || p.status === "Active").length;
    const planning = realProjects.filter((p) => p.status?.toUpperCase() === "PLANNING" || p.status === "Planning").length;
    const onHold = realProjects.filter((p) => p.status?.toUpperCase() === "ON_HOLD" || p.status === "On Hold").length;
    const completed = realProjects.filter((p) => p.status?.toUpperCase() === "COMPLETED" || p.status === "Completed").length;
    return { total, active, planning, onHold, completed };
  }, [realProjects]);

  // Multi-Filtered Projects List
  const filteredProjects = useMemo(() => {
    return realProjects.filter((p) => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.name?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.mandate?.toLowerCase().includes(q) ||
        (p.coCeoLeadName || "").toLowerCase().includes(q) ||
        (p.executionLeadName || "").toLowerCase().includes(q) ||
        (p.assignedUserName || "").toLowerCase().includes(q);

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

      const matchCoCeo =
        coCeoFilter === "All" ||
        p.coCeoLeadName === coCeoFilter ||
        p.assignedUserName === coCeoFilter;

      const dInfo = fmtDeadlineLabel(p.deadline || p.targetDate, p.status);
      const matchDeadline =
        deadlineFilter === "All" ||
        (deadlineFilter === "Overdue" && dInfo.isOverdue) ||
        (deadlineFilter === "DueToday" && dInfo.diffDays === 0) ||
        (deadlineFilter === "DueThisWeek" && dInfo.diffDays >= 0 && dInfo.diffDays <= 7) ||
        (deadlineFilter === "DueThisMonth" && dInfo.diffDays >= 0 && dInfo.diffDays <= 30) ||
        (deadlineFilter === "NoDeadline" && (!p.deadline && !p.targetDate));

      const matchHealth =
        healthFilter === "All" ||
        p.health?.toUpperCase() === healthFilter.toUpperCase();

      return matchSearch && matchStatus && matchPriority && matchCoCeo && matchDeadline && matchHealth;
    });
  }, [realProjects, search, statusFilter, priorityFilter, coCeoFilter, deadlineFilter, healthFilter]);

  // Active filters count & reset check
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== "All") count++;
    if (priorityFilter !== "All") count++;
    if (coCeoFilter !== "All") count++;
    if (deadlineFilter !== "All") count++;
    if (healthFilter !== "All") count++;
    if (search.trim()) count++;
    return count;
  }, [statusFilter, priorityFilter, coCeoFilter, deadlineFilter, healthFilter, search]);

  const clearAllFilters = () => {
    setSearch("");
    setStatusFilter("All");
    setPriorityFilter("All");
    setCoCeoFilter("All");
    setDeadlineFilter("All");
    setHealthFilter("All");
  };

  // Selection handlers
  const isAllSelected = filteredProjects.length > 0 && filteredProjects.every((p) => selectedIds.includes(p.id));
  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProjects.map((p) => p.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  // Single Delete Handler
  const handleDeleteSingle = async () => {
    if (!deleteConfirmSingleId) return;
    setDeleting(true);
    try {
      const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : undefined;
      await apiClient.delete(`/org/projects/${deleteConfirmSingleId}${wsId ? `?workspaceId=${wsId}` : ""}`);
      setRealProjects((prev) => prev.filter((p) => p.id !== deleteConfirmSingleId));
      setSelectedIds((prev) => prev.filter((i) => i !== deleteConfirmSingleId));
      setDeleteConfirmSingleId(null);
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to delete project");
    } finally {
      setDeleting(false);
    }
  };

  // Bulk Actions Handler
  const handleExecuteBulkAction = async () => {
    if (!bulkActionType || selectedIds.length === 0) return;
    setIsBulkSubmitting(true);
    try {
      const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : undefined;
      const actionData: any = {};
      if (bulkActionType === "status") actionData.status = bulkStatusValue;
      if (bulkActionType === "priority") actionData.priority = bulkPriorityValue;

      if (bulkActionType === "delete") {
        setRealProjects((prev) => prev.filter((p) => !selectedIds.includes(p.id)));
      }

      await apiClient.post(`/org/projects/bulk${wsId ? `?workspaceId=${wsId}` : ""}`, {
        projectIds: selectedIds,
        action: bulkActionType,
        actionData,
      });

      setSelectedIds([]);
      setBulkActionType(null);
      fetchProjects();
    } catch (err: any) {
      console.error("Bulk action failed:", err);
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  return (
    <div className="w-full h-[calc(100vh-65px)] max-h-[calc(100vh-65px)] flex flex-col overflow-hidden bg-background text-foreground font-sans">
      {/* ── 1. COMPACT PAGE HEADER & CREATION CTA ───────────────────────────────── */}
      <div className="px-4 sm:px-6 pt-4 pb-3 border-b border-border shrink-0 bg-card/60 backdrop-blur-md space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-extrabold text-foreground tracking-tight">Projects Workspace</h1>
              <span className="px-2 py-0.5 rounded-full bg-[#C9A52A]/15 text-[#C9A52A] text-[10px] font-extrabold uppercase tracking-wider border border-[#C9A52A]/20">
                Executive Portfolio
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              ManMadhan Organization · Plan, execute and track organizational project mandates.
            </p>
          </div>

          <Link
            href={`${basePath}/projects/create`}
            className="px-4 h-[38px] rounded-xl bg-gradient-to-r from-[#C9A52A] to-[#D4B12F] text-[#0B0D10] font-extrabold text-xs transition-all hover:brightness-105 shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline">New Project</span>
          </Link>
        </div>

        {/* ── 2. REAL DATABASE METRIC CARDS ────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
          <button
            type="button"
            onClick={() => setStatusFilter("All")}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              statusFilter === "All"
                ? "bg-[#C9A52A]/10 border-[#C9A52A] shadow-xs"
                : "bg-card border-border hover:border-border/80"
            }`}
          >
            <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block">Total Projects</span>
            <span className="text-base font-extrabold text-foreground">{metrics.total}</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("Active")}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              statusFilter === "Active"
                ? "bg-emerald-500/10 border-emerald-500/50 shadow-xs"
                : "bg-card border-border hover:border-border/80"
            }`}
          >
            <span className="text-[10px] font-extrabold text-emerald-500 uppercase tracking-wider block">Active</span>
            <span className="text-base font-extrabold text-emerald-500">{metrics.active}</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("Planning")}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              statusFilter === "Planning"
                ? "bg-blue-500/10 border-blue-500/50 shadow-xs"
                : "bg-card border-border hover:border-border/80"
            }`}
          >
            <span className="text-[10px] font-extrabold text-blue-500 uppercase tracking-wider block">Planning</span>
            <span className="text-base font-extrabold text-blue-500">{metrics.planning}</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("On Hold")}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              statusFilter === "On Hold"
                ? "bg-amber-500/10 border-amber-500/50 shadow-xs"
                : "bg-card border-border hover:border-border/80"
            }`}
          >
            <span className="text-[10px] font-extrabold text-amber-500 uppercase tracking-wider block">On Hold</span>
            <span className="text-base font-extrabold text-amber-500">{metrics.onHold}</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("Completed")}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              statusFilter === "Completed"
                ? "bg-purple-500/10 border-purple-500/50 shadow-xs"
                : "bg-card border-border hover:border-border/80"
            }`}
          >
            <span className="text-[10px] font-extrabold text-purple-400 uppercase tracking-wider block">Completed</span>
            <span className="text-base font-extrabold text-purple-400">{metrics.completed}</span>
          </button>
        </div>

        {/* ── 3. SEARCH & MULTI-FILTER TOOLBAR ─────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1 text-xs">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
            {/* Search Input */}
            <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search title, prompt, CO-CEO..."
                className="w-full h-[36px] pl-9 pr-3 rounded-xl bg-background border border-border text-foreground text-xs focus:outline-none focus:border-[#C9A52A]"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Status Filter Dropdown */}
            <CustomDropdown
              label="Status"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "All", label: "All Statuses" },
                { value: "Planning", label: "Planning", dotColor: "bg-blue-500" },
                { value: "Active", label: "Active", dotColor: "bg-emerald-500" },
                { value: "On Hold", label: "On Hold", dotColor: "bg-amber-500" },
                { value: "Completed", label: "Completed", dotColor: "bg-purple-400" },
                { value: "Archived", label: "Archived", dotColor: "bg-slate-400" },
              ]}
              className="w-36"
            />

            {/* Priority Filter Dropdown */}
            <CustomDropdown
              label="Priority"
              value={priorityFilter}
              onChange={setPriorityFilter}
              options={[
                { value: "All", label: "All Priorities" },
                { value: "Critical", label: "Critical", dotColor: "bg-rose-500" },
                { value: "High", label: "High", dotColor: "bg-amber-500" },
                { value: "Medium", label: "Medium", dotColor: "bg-[#C9A52A]" },
                { value: "Low", label: "Low", dotColor: "bg-slate-400" },
              ]}
              className="w-36"
            />

            {/* CO-CEO Filter Dropdown */}
            <CustomDropdown
              label="CO-CEO"
              value={coCeoFilter}
              onChange={setCoCeoFilter}
              options={[
                { value: "All", label: "All CO-CEOs" },
                ...coCeoOptions.map((c) => ({ value: c, label: c })),
              ]}
              className="w-40"
            />

            {/* Deadline Filter Dropdown */}
            <CustomDropdown
              label="Deadline"
              value={deadlineFilter}
              onChange={setDeadlineFilter}
              options={[
                { value: "All", label: "All Deadlines" },
                { value: "Overdue", label: "Overdue" },
                { value: "DueToday", label: "Due Today" },
                { value: "DueThisWeek", label: "Due This Week" },
                { value: "DueThisMonth", label: "Due This Month" },
                { value: "NoDeadline", label: "No Deadline" },
              ]}
              className="w-36"
            />

            {/* Health Filter Dropdown */}
            <CustomDropdown
              label="Health"
              value={healthFilter}
              onChange={setHealthFilter}
              options={[
                { value: "All", label: "All Health" },
                { value: "Healthy", label: "Healthy", dotColor: "bg-emerald-500" },
                { value: "At Risk", label: "At Risk", dotColor: "bg-amber-500" },
                { value: "Critical", label: "Critical", dotColor: "bg-rose-500" },
              ]}
              className="w-32"
            />
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 p-1 bg-muted rounded-xl border border-border shrink-0">
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === "table" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
              title="Table View"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Table</span>
            </button>
            <button
              onClick={() => setViewMode("board")}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === "board" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
              title="Board View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Board</span>
            </button>
          </div>
        </div>

        {/* Active Filter Chips Bar */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/40 text-[11px]">
            <span className="text-muted-foreground font-bold">{filteredProjects.length} Matching Projects</span>
            {statusFilter !== "All" && (
              <span className="px-2 py-0.5 rounded-md bg-secondary border border-border text-foreground font-semibold flex items-center gap-1">
                Status: {statusFilter}
                <X className="w-3 h-3 cursor-pointer hover:text-rose-500" onClick={() => setStatusFilter("All")} />
              </span>
            )}
            {priorityFilter !== "All" && (
              <span className="px-2 py-0.5 rounded-md bg-secondary border border-border text-foreground font-semibold flex items-center gap-1">
                Priority: {priorityFilter}
                <X className="w-3 h-3 cursor-pointer hover:text-rose-500" onClick={() => setPriorityFilter("All")} />
              </span>
            )}
            {coCeoFilter !== "All" && (
              <span className="px-2 py-0.5 rounded-md bg-secondary border border-border text-foreground font-semibold flex items-center gap-1">
                CO-CEO: {coCeoFilter}
                <X className="w-3 h-3 cursor-pointer hover:text-rose-500" onClick={() => setCoCeoFilter("All")} />
              </span>
            )}
            {deadlineFilter !== "All" && (
              <span className="px-2 py-0.5 rounded-md bg-secondary border border-border text-foreground font-semibold flex items-center gap-1">
                Deadline: {deadlineFilter}
                <X className="w-3 h-3 cursor-pointer hover:text-rose-500" onClick={() => setDeadlineFilter("All")} />
              </span>
            )}
            {healthFilter !== "All" && (
              <span className="px-2 py-0.5 rounded-md bg-secondary border border-border text-foreground font-semibold flex items-center gap-1">
                Health: {healthFilter}
                <X className="w-3 h-3 cursor-pointer hover:text-rose-500" onClick={() => setHealthFilter("All")} />
              </span>
            )}
            <button
              onClick={clearAllFilters}
              className="text-[#C9A52A] hover:underline font-bold text-[10.5px] cursor-pointer ml-1"
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* ── 4. INTERNAL SCROLLABLE CONTENT REGION (TABLE OR BOARD) ─────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
        {/* Error Banner */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={fetchProjects} className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 rounded-lg font-bold flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-card border border-border animate-pulse" />
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          /* Empty States */
          <div className="p-8 rounded-2xl bg-card border border-border text-center space-y-3 my-6">
            <FolderKanban className="w-10 h-10 text-[#C9A52A] mx-auto opacity-70" />
            {realProjects.length === 0 ? (
              <div className="space-y-1">
                <h3 className="text-sm font-extrabold text-foreground">No Organization Projects Yet</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Create your first organization project mandate to assign CO-CEO execution leads and track milestone gates.
                </p>
                <div className="pt-2">
                  <Link
                    href={`${basePath}/projects/create`}
                    className="px-4 py-2 rounded-xl bg-[#C9A52A] text-[#0B0D10] font-extrabold text-xs inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Create Project
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <h3 className="text-sm font-extrabold text-foreground">No Projects Match Active Filters</h3>
                <p className="text-xs text-muted-foreground">
                  Try broadening your search query or clearing status/priority filter tags.
                </p>
                <div className="pt-2">
                  <button
                    onClick={clearAllFilters}
                    className="px-4 py-1.5 rounded-xl border border-border text-foreground hover:bg-muted text-xs font-bold"
                  >
                    Clear All Filters
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : viewMode === "table" ? (
          /* ── TABLE VIEW ─────────────────────────────────────────────────────── */
          <div className="rounded-2xl bg-card border border-border shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-[10.5px] font-extrabold text-muted-foreground uppercase tracking-wider sticky top-0 z-10 backdrop-blur-md">
                    <th className="py-3 px-3.5 w-8">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={toggleSelectAll}
                        className="rounded border-border text-[#C9A52A] focus:ring-0 cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-3.5">Project Mandate</th>
                    <th className="py-3 px-3.5">Owner</th>
                    <th className="py-3 px-3.5">CO-CEO Lead / Execution</th>
                    <th className="py-3 px-3.5">Status</th>
                    <th className="py-3 px-3.5">Priority</th>
                    <th className="py-3 px-3.5">Target Deadline</th>
                    <th className="py-3 px-3.5">Task Progress</th>
                    <th className="py-3 px-3.5">Health</th>
                    <th className="py-3 px-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredProjects.map((p) => {
                    const statusObj = STATUS_BADGE[p.status] || STATUS_BADGE.Planning;
                    const priorityObj = PRIORITY_BADGE[p.priority] || PRIORITY_BADGE.Medium;
                    const healthObj = HEALTH_BADGE[p.health] || HEALTH_BADGE.Healthy;
                    const dInfo = fmtDeadlineLabel(p.deadline || p.targetDate, p.status);
                    const isSelected = selectedIds.includes(p.id);

                    return (
                      <tr
                        key={p.id}
                        onClick={() => router.push(`${basePath}/projects/${p.id}`)}
                        className={`group transition-colors cursor-pointer ${
                          isSelected ? "bg-[#C9A52A]/5" : "hover:bg-muted/30"
                        }`}
                      >
                        {/* Select */}
                        <td className="py-3 px-3.5" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOne(p.id)}
                            className="rounded border-border text-[#C9A52A] focus:ring-0 cursor-pointer"
                          />
                        </td>

                        {/* Project Title & Category */}
                        <td className="py-3 px-3.5 max-w-[220px]">
                          <div className="space-y-0.5">
                            <span className="font-extrabold text-foreground group-hover:text-[#C9A52A] transition-colors truncate block">
                              {p.name}
                            </span>
                            {p.description && (
                              <p className="text-[11px] text-muted-foreground truncate">{p.description}</p>
                            )}
                          </div>
                        </td>

                        {/* Owner (CEO Fixed) */}
                        <td className="py-3 px-3.5">
                          <span className="px-2 py-0.5 rounded-md bg-secondary text-foreground text-[10.5px] font-extrabold border border-border inline-flex items-center gap-1">
                            <Shield className="w-3 h-3 text-[#C9A52A]" /> CEO 🔒
                          </span>
                        </td>

                        {/* CO-CEO Lead & Execution Lead */}
                        <td className="py-3 px-3.5">
                          <div className="space-y-0.5">
                            <span className="font-extrabold text-blue-500 text-[11px] truncate block">
                              {p.coCeoLeadName || p.assignedUserName || "CO-CEO Unassigned"}
                            </span>
                            {p.executionLeadName && p.executionLeadName !== "Unassigned" && (
                              <span className="text-[10px] text-muted-foreground block truncate">
                                Exec: {p.executionLeadName}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border inline-flex items-center gap-1.5 ${statusObj.bg} ${statusObj.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusObj.dot}`} />
                            {statusObj.label}
                          </span>
                        </td>

                        {/* Priority */}
                        <td className="py-3 px-3.5">
                          <span className={`inline-flex items-center gap-1 text-[11px] ${priorityObj.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${priorityObj.dot}`} />
                            {p.priority || "Medium"}
                          </span>
                        </td>

                        {/* Target Deadline */}
                        <td className="py-3 px-3.5">
                          <div className="space-y-0.5">
                            <span className="font-extrabold text-foreground text-[11px] block">{dInfo.dateText}</span>
                            <span className={`text-[10px] font-bold block ${dInfo.isOverdue ? "text-rose-500" : "text-muted-foreground"}`}>
                              {dInfo.relText}
                            </span>
                          </div>
                        </td>

                        {/* Task Progress */}
                        <td className="py-3 px-3.5 min-w-[130px]">
                          {p.totalTasks > 0 ? (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[10.5px]">
                                <span className="font-mono font-bold text-foreground">{p.completedTasks}/{p.totalTasks}</span>
                                <span className="font-bold text-[#C9A52A]">{p.progress}%</span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-[#C9A52A] to-[#D4B12F] transition-all duration-300"
                                  style={{ width: `${p.progress}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground text-[10px] font-bold">
                              No tasks
                            </span>
                          )}
                        </td>

                        {/* Health */}
                        <td className="py-3 px-3.5">
                          <span className={`px-2 py-0.5 rounded-md text-[10.5px] font-extrabold border ${healthObj.bg}`}>
                            {healthObj.label}
                          </span>
                        </td>

                        {/* Actions Dropdown */}
                        <td className="py-3 px-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="relative inline-block" ref={activeActionMenuId === p.id ? actionMenuRef : null}>
                            <button
                              type="button"
                              onClick={() => setActiveActionMenuId(activeActionMenuId === p.id ? null : p.id)}
                              className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>

                            {activeActionMenuId === p.id && (
                              <div className="absolute right-0 top-8 z-30 w-44 rounded-xl bg-card border border-border shadow-lg p-1 space-y-0.5 text-left text-xs font-semibold animate-in fade-in duration-100">
                                <Link
                                  href={`${basePath}/projects/${p.id}`}
                                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-muted text-foreground transition-colors"
                                >
                                  <ArrowUpRight className="w-3.5 h-3.5 text-[#C9A52A]" /> View Details
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveActionMenuId(null);
                                    setEditingProject(p);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-muted text-foreground transition-colors cursor-pointer"
                                >
                                  <Edit className="w-3.5 h-3.5 text-blue-500" /> Edit Project
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveActionMenuId(null);
                                    setDeleteConfirmSingleId(p.id);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-rose-500/10 text-rose-500 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Delete Project
                                </button>
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
          </div>
        ) : (
          /* ── KANBAN BOARD VIEW ──────────────────────────────────────────────── */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {["Planning", "Active", "On Hold", "Completed"].map((colStatus) => {
              const colProjects = filteredProjects.filter((p) => {
                const st = (p.status || "").toUpperCase();
                if (colStatus === "Planning") return st === "PLANNING";
                if (colStatus === "Active") return st === "ACTIVE";
                if (colStatus === "On Hold") return st === "ON_HOLD";
                if (colStatus === "Completed") return st === "COMPLETED";
                return false;
              });

              return (
                <div key={colStatus} className="p-3.5 rounded-2xl bg-card border border-border space-y-3 flex flex-col">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <span className="font-extrabold text-xs uppercase tracking-wider text-foreground">
                      {colStatus}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-bold">
                      {colProjects.length}
                    </span>
                  </div>

                  <div className="space-y-2.5 flex-1 overflow-y-auto">
                    {colProjects.map((p) => {
                      const priorityObj = PRIORITY_BADGE[p.priority] || PRIORITY_BADGE.Medium;
                      const dInfo = fmtDeadlineLabel(p.deadline || p.targetDate, p.status);

                      return (
                        <div
                          key={p.id}
                          onClick={() => router.push(`${basePath}/projects/${p.id}`)}
                          className="p-3.5 rounded-xl bg-background border border-border hover:border-[#C9A52A]/40 transition-all cursor-pointer space-y-2 shadow-2xs group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-extrabold text-foreground group-hover:text-[#C9A52A] transition-colors text-xs truncate block">
                              {p.name}
                            </span>
                            <span className={`text-[10px] ${priorityObj.text} shrink-0`}>
                              {p.priority}
                            </span>
                          </div>

                          {p.description && (
                            <p className="text-[11px] text-muted-foreground line-clamp-2">{p.description}</p>
                          )}

                          <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[10.5px]">
                            <span className="font-extrabold text-blue-500 truncate">
                              {p.coCeoLeadName || p.assignedUserName || "CO-CEO Unassigned"}
                            </span>
                            <span className="text-muted-foreground font-bold shrink-0">{dInfo.relText}</span>
                          </div>

                          {p.totalTasks > 0 && (
                            <div className="w-full h-1 rounded-full bg-muted overflow-hidden">
                              <div className="h-full bg-[#C9A52A]" style={{ width: `${p.progress}%` }} />
                            </div>
                          )}
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

      {/* ── MODALS (EDIT & DELETE CONFIRMATION) ───────────────────────────────── */}
      {editingProject && (
        <EditProjectModal
          project={editingProject}
          isOpen={!!editingProject}
          onClose={() => setEditingProject(null)}
          onSuccess={() => {
            setEditingProject(null);
            fetchProjects();
          }}
        />
      )}

      {deleteConfirmSingleId && (
        <DeleteConfirmationModal
          isOpen={!!deleteConfirmSingleId}
          onClose={() => setDeleteConfirmSingleId(null)}
          onConfirm={handleDeleteSingle}
          title="Delete Project Mandate?"
          description="Are you sure you want to delete this organization project record? All associated team assignments will be removed."
          isSubmitting={deleting}
        />
      )}
    </div>
  );
}
