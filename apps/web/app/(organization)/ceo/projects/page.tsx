"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Plus, Search, AlertCircle, Trash2, LayoutGrid, List, Edit, X, MoreVertical,
  ArrowUpRight, Filter, Lock, RefreshCw
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { useSocket } from "@/components/providers/socket-provider";
import { useRegisterRefresh } from "@/components/providers/global-refresh-provider";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { EditProjectModal } from "@/components/organization/edit-project-modal";
import { DeleteConfirmationModal } from "@/components/organization/delete-confirmation-modal";

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

function fmtDeadlineLabel(dateStr?: string | null, status?: string): { dateText: string; relText: string; isOverdue: boolean } {
  if (!dateStr) return { dateText: "—", relText: "No deadline", isOverdue: false };
  try {
    const target = new Date(dateStr);
    const now = new Date();
    const isCompleted = (status || "").toUpperCase() === "COMPLETED";

    const dateText = target.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    if (isCompleted) return { dateText, relText: "Completed", isOverdue: false };

    const diffDays = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      return { dateText, relText: `Overdue (${Math.abs(diffDays)}d)`, isOverdue: true };
    } else if (diffDays === 0) {
      return { dateText, relText: "Due Today", isOverdue: false };
    } else {
      return { dateText, relText: `Due in ${diffDays}d`, isOverdue: false };
    }
  } catch {
    return { dateText: dateStr, relText: "—", isOverdue: false };
  }
}

export default function ProjectsPage() {
  const pathname = usePathname() || "";
  const router = useRouter();
  const { socket } = useSocket();

  const basePath = pathname.startsWith("/co-ceo") ? "/co-ceo" : pathname.startsWith("/member") ? "/member" : "/ceo";

  const [realProjects, setRealProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search & Multi-Filter State
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [coCeoFilter, setCoCeoFilter] = useState("All");
  const [deadlineFilter, setDeadlineFilter] = useState("All");
  const [viewMode, setViewMode] = useState<"table" | "board">("table");

  // Filter Popover Open State
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  // Selection & Action Modals State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingProject, setEditingProject] = useState<any | null>(null);
  const [deleteConfirmSingleId, setDeleteConfirmSingleId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);

  const actionMenuRef = useRef<HTMLDivElement>(null);
  const filterPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setActiveActionMenuId(null);
      }
      if (filterPanelRef.current && !filterPanelRef.current.contains(event.target as Node)) {
        setIsFilterPanelOpen(false);
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

  // Status Navigation Counts (Real Database Data)
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
        (deadlineFilter === "DueToday" && dInfo.relText === "Due Today") ||
        (deadlineFilter === "NoDeadline" && (!p.deadline && !p.targetDate));

      return matchSearch && matchStatus && matchPriority && matchCoCeo && matchDeadline;
    });
  }, [realProjects, search, statusFilter, priorityFilter, coCeoFilter, deadlineFilter]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== "All") count++;
    if (priorityFilter !== "All") count++;
    if (coCeoFilter !== "All") count++;
    if (deadlineFilter !== "All") count++;
    if (search.trim()) count++;
    return count;
  }, [statusFilter, priorityFilter, coCeoFilter, deadlineFilter, search]);

  const clearAllFilters = () => {
    setSearch("");
    setStatusFilter("All");
    setPriorityFilter("All");
    setCoCeoFilter("All");
    setDeadlineFilter("All");
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

  return (
    <div className="w-full h-[calc(100vh-65px)] max-h-[calc(100vh-65px)] flex flex-col overflow-hidden bg-background text-foreground font-sans">
      {/* ── 1. CLEAN GLOBAL HEADER (NO EMOJIS / NO EXTRA BADGES) ───────────────── */}
      <div className="px-4 sm:px-6 pt-4 pb-3 border-b border-border shrink-0 bg-card/60 space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h1 className="text-lg font-extrabold text-foreground tracking-tight">Projects</h1>
            <p className="text-xs text-muted-foreground">Plan and execute organizational projects.</p>
          </div>

          <Link
            href={`${basePath}/projects/create`}
            className="px-4 h-[38px] rounded-xl bg-gradient-to-r from-[#C9A52A] to-[#D4B12F] text-[#0B0D10] font-extrabold text-xs transition-all hover:brightness-105 shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Project</span>
          </Link>
        </div>

        {/* ── 2. COMPACT INTERACTIVE STATUS NAVIGATION (REPLACES GIANT CARDS) ───── */}
        <div className="flex items-center gap-1 border-b border-border/60 pb-2 overflow-x-auto text-xs font-bold">
          {[
            { id: "All", label: "All", count: metrics.total },
            { id: "Planning", label: "Planning", count: metrics.planning },
            { id: "Active", label: "Active", count: metrics.active },
            { id: "On Hold", label: "On Hold", count: metrics.onHold },
            { id: "Completed", label: "Completed", count: metrics.completed },
          ].map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  isActive
                    ? "bg-[#C9A52A] text-[#0B0D10] font-extrabold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded font-mono text-[10px] ${isActive ? "bg-black/20 text-[#0B0D10]" : "bg-muted text-muted-foreground"}`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── 3. SEARCH & UNIFIED FILTER TOOLBAR ────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 pt-1 text-xs">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Search Input */}
            <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search projects..."
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

            {/* Unified Filter Button & Popover */}
            <div className="relative" ref={filterPanelRef}>
              <button
                type="button"
                onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                className={`h-[36px] px-3.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeFiltersCount > 0
                    ? "bg-[#C9A52A]/15 border-[#C9A52A] text-[#C9A52A]"
                    : "bg-background border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Filter</span>
                {activeFiltersCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-[#C9A52A] text-[#0B0D10] text-[10px] font-mono font-extrabold flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              {/* Structured Filter Popover Panel */}
              {isFilterPanelOpen && (
                <div className="absolute left-0 top-11 z-30 w-72 p-4 rounded-2xl bg-card border border-border shadow-xl space-y-3.5 animate-in fade-in duration-100 text-xs">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <span className="font-extrabold text-foreground uppercase tracking-wider text-[10.5px]">Filter Projects</span>
                    <button onClick={clearAllFilters} className="text-[#C9A52A] hover:underline font-bold text-[10.5px]">
                      Reset
                    </button>
                  </div>

                  {/* Priority Select */}
                  <div className="space-y-1">
                    <label className="font-bold text-muted-foreground block text-[10.5px]">Priority</label>
                    <select
                      value={priorityFilter}
                      onChange={(e) => setPriorityFilter(e.target.value)}
                      className="w-full h-[34px] px-2.5 rounded-xl bg-background border border-border text-foreground text-xs focus:outline-none"
                    >
                      <option value="All">All Priorities</option>
                      <option value="Critical">Critical</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>

                  {/* CO-CEO Select */}
                  <div className="space-y-1">
                    <label className="font-bold text-muted-foreground block text-[10.5px]">CO-CEO Lead</label>
                    <select
                      value={coCeoFilter}
                      onChange={(e) => setCoCeoFilter(e.target.value)}
                      className="w-full h-[34px] px-2.5 rounded-xl bg-background border border-border text-foreground text-xs focus:outline-none"
                    >
                      <option value="All">All CO-CEOs</option>
                      {coCeoOptions.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Deadline Select */}
                  <div className="space-y-1">
                    <label className="font-bold text-muted-foreground block text-[10.5px]">Deadline</label>
                    <select
                      value={deadlineFilter}
                      onChange={(e) => setDeadlineFilter(e.target.value)}
                      className="w-full h-[34px] px-2.5 rounded-xl bg-background border border-border text-foreground text-xs focus:outline-none"
                    >
                      <option value="All">All Deadlines</option>
                      <option value="Overdue">Overdue</option>
                      <option value="DueToday">Due Today</option>
                      <option value="NoDeadline">No Deadline</option>
                    </select>
                  </div>

                  <div className="pt-2 border-t border-border flex justify-end">
                    <button
                      onClick={() => setIsFilterPanelOpen(false)}
                      className="px-4 py-1.5 rounded-xl bg-[#C9A52A] text-[#0B0D10] font-extrabold text-xs"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>
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
      </div>

      {/* ── 4. INTERNAL SCROLLABLE CONTENT REGION (PRIMARY TABLE SURFACE) ──────── */}
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
              <div key={i} className="h-14 rounded-xl bg-card border border-border animate-pulse" />
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          /* Clean Professional Empty State */
          <div className="p-10 rounded-2xl bg-card border border-border text-center space-y-3 my-8 max-w-md mx-auto">
            <h3 className="text-sm font-extrabold text-foreground">No projects yet</h3>
            <p className="text-xs text-muted-foreground">
              Create your first organization project to begin execution.
            </p>
            <div className="pt-2">
              <Link
                href={`${basePath}/projects/create`}
                className="px-4 py-2 rounded-xl bg-[#C9A52A] text-[#0B0D10] font-extrabold text-xs inline-flex items-center gap-1.5 shadow-2xs"
              >
                <Plus className="w-4 h-4" /> New Project
              </Link>
            </div>
          </div>
        ) : viewMode === "table" ? (
          /* ── TABLE VIEW ─────────────────────────────────────────────────────── */
          <div className="rounded-2xl bg-card border border-border shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-[10.5px] font-extrabold text-muted-foreground uppercase tracking-wider sticky top-0 z-10 backdrop-blur-md">
                    <th className="py-3 px-3.5 w-8">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={toggleSelectAll}
                        className="rounded border-border text-[#C9A52A] focus:ring-0 cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-3.5">Project</th>
                    <th className="py-3 px-3.5">Owner</th>
                    <th className="py-3 px-3.5">Lead</th>
                    <th className="py-3 px-3.5">Status</th>
                    <th className="py-3 px-3.5">Priority</th>
                    <th className="py-3 px-3.5">Deadline</th>
                    <th className="py-3 px-3.5">Progress</th>
                    <th className="py-3 px-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredProjects.map((p) => {
                    const statusObj = STATUS_BADGE[p.status] || STATUS_BADGE.Planning;
                    const priorityObj = PRIORITY_BADGE[p.priority] || PRIORITY_BADGE.Medium;
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
                        <td className="py-3 px-3.5 max-w-[240px]">
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
                          <span className="text-foreground text-[11px] font-bold inline-flex items-center gap-1">
                            <Lock className="w-3 h-3 text-[#C9A52A]" /> CEO
                          </span>
                        </td>

                        {/* CO-CEO Lead */}
                        <td className="py-3 px-3.5">
                          <span className="font-bold text-blue-500 text-[11px] truncate block">
                            {p.coCeoLeadName || p.assignedUserName || "Unassigned"}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3.5">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border inline-flex items-center gap-1 ${statusObj.bg} ${statusObj.text}`}>
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

                        {/* Deadline */}
                        <td className="py-3 px-3.5">
                          <div className="space-y-0.5">
                            <span className="font-bold text-foreground text-[11px] block">{dInfo.dateText}</span>
                            <span className={`text-[10px] font-semibold block ${dInfo.isOverdue ? "text-rose-500" : "text-muted-foreground"}`}>
                              {dInfo.relText}
                            </span>
                          </div>
                        </td>

                        {/* Progress */}
                        <td className="py-3 px-3.5 min-w-[120px]">
                          {p.totalTasks > 0 ? (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[10.5px]">
                                <span className="font-mono font-bold text-foreground">{p.completedTasks}/{p.totalTasks}</span>
                                <span className="font-bold text-[#C9A52A]">{p.progress}%</span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full bg-[#C9A52A] transition-all duration-300"
                                  style={{ width: `${p.progress}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-[11px] font-medium">
                              No tasks yet
                            </span>
                          )}
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
                              <div className="absolute right-0 top-8 z-30 w-40 rounded-xl bg-card border border-border shadow-lg p-1 space-y-0.5 text-left text-xs font-semibold animate-in fade-in duration-100">
                                <Link
                                  href={`${basePath}/projects/${p.id}`}
                                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-muted text-foreground transition-colors"
                                >
                                  <ArrowUpRight className="w-3.5 h-3.5 text-[#C9A52A]" /> Open project
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveActionMenuId(null);
                                    setEditingProject(p);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-muted text-foreground transition-colors cursor-pointer"
                                >
                                  <Edit className="w-3.5 h-3.5 text-blue-500" /> Edit project
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveActionMenuId(null);
                                    setDeleteConfirmSingleId(p.id);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-rose-500/10 text-rose-500 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Archive
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
                <div key={colStatus} className="p-3 rounded-2xl bg-card border border-border space-y-3 flex flex-col">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <span className="font-extrabold text-xs uppercase tracking-wider text-foreground">
                      {colStatus}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground text-[10px] font-bold">
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
                            <span className="font-bold text-blue-500 truncate">
                              {p.coCeoLeadName || p.assignedUserName || "Unassigned"}
                            </span>
                            <span className="text-muted-foreground font-semibold shrink-0">{dInfo.relText}</span>
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
          title="Delete Project?"
          description="Are you sure you want to delete this organization project record? All associated team assignments will be removed."
          isSubmitting={deleting}
        />
      )}
    </div>
  );
}
