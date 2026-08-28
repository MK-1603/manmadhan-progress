"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Plus, Search, AlertCircle, Trash2, LayoutGrid, List, Edit, X, MoreVertical,
  ArrowUpRight, Filter, Lock, RefreshCw, Calendar, SlidersHorizontal, FolderKanban
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { useSocket } from "@/components/providers/socket-provider";
import { useRegisterRefresh } from "@/components/providers/global-refresh-provider";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { EditProjectModal } from "@/components/organization/edit-project-modal";
import { DeleteConfirmationModal } from "@/components/organization/delete-confirmation-modal";
import { ResponsivePopover } from "@/components/ui/responsive-popover";

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

// ── PORTAL ACTION MENU COMPONENT (Immune to Table Overflow Clipping) ─────────
interface ActionMenuPortalProps {
  triggerRect: DOMRect | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenProject: () => void;
  onEditProject: () => void;
  onDeleteProject: () => void;
}

function ActionMenuPortal({
  triggerRect,
  isOpen,
  onClose,
  onOpenProject,
  onEditProject,
  onDeleteProject,
}: ActionMenuPortalProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleOutsideClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }

    function handleScrollOrResize() {
      onClose();
    }

    document.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !triggerRect || typeof window === "undefined") return null;

  const menuWidth = 160;
  const menuHeight = 120;

  // Vertical position calculation (flip upward if near screen bottom)
  let top = triggerRect.bottom + 4;
  if (top + menuHeight > window.innerHeight) {
    top = Math.max(8, triggerRect.top - menuHeight - 4);
  }

  // Horizontal position calculation (align right edge to trigger right)
  let left = triggerRect.right - menuWidth;
  if (left < 8) left = 8;

  return createPortal(
    <div
      ref={menuRef}
      style={{ top: `${top}px`, left: `${left}px`, width: `${menuWidth}px` }}
      className="fixed z-[9999] rounded-xl bg-card border border-border shadow-2xl p-1 space-y-0.5 text-left text-xs font-semibold animate-in fade-in duration-100"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => {
          onClose();
          onOpenProject();
        }}
        className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-muted text-foreground transition-colors cursor-pointer"
      >
        <ArrowUpRight className="w-3.5 h-3.5 text-[#C9A52A]" /> Open project
      </button>
      <button
        type="button"
        onClick={() => {
          onClose();
          onEditProject();
        }}
        className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-muted text-foreground transition-colors cursor-pointer"
      >
        <Edit className="w-3.5 h-3.5 text-blue-500" /> Edit project
      </button>
      <button
        type="button"
        onClick={() => {
          onClose();
          onDeleteProject();
        }}
        className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-rose-500/10 text-rose-500 transition-colors cursor-pointer"
      >
        <Trash2 className="w-3.5 h-3.5" /> Archive
      </button>
    </div>,
    document.body
  );
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

  // Portal Action Menu State
  const [activeMenuProject, setActiveMenuProject] = useState<any | null>(null);
  const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null);

  const filterPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
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

  // Open Action Menu Portal
  const handleOpenActionMenu = (e: React.MouseEvent<HTMLButtonElement>, project: any) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setTriggerRect(rect);
    setActiveMenuProject(project);
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
      {/* ── 1. PAGE HEADER (MATCHES REFERENCE IMAGE) ───────────────────────── */}
      <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3 border-b border-border shrink-0 bg-card/60 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
            <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">Projects</h1>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">Plan and execute organizational projects.</p>
          </div>

          <Link
            href={`${basePath}/projects/create`}
            className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-[#C9A52A] to-[#D4B12F] text-[#0B0D10] font-extrabold text-xs transition-all hover:brightness-105 shadow-sm flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Project</span>
          </Link>
        </div>

        {/* ── 2. STATUS TABS (HIDDEN ON MOBILE, VISIBLE ON DESKTOP ≥ md) ───────── */}
        <div className="hidden md:flex items-center gap-1 border-b border-border/60 pb-2 overflow-x-auto text-xs font-bold">
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

        {/* ── 3. SEARCH & COMPACT FILTER TOOLBAR (MATCHES REFERENCE IMAGE) ───── */}
        <div className="flex items-center justify-between gap-2.5 pt-1 text-xs">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Search Input */}
            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search projects..."
                className="w-full h-[42px] pl-10 pr-8 rounded-xl bg-background border border-border text-foreground text-xs sm:text-sm focus:outline-none focus:border-[#C9A52A] transition-colors"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Compact Filter Button (Square icon button on Mobile, Responsive Bottom Sheet) */}
            <ResponsivePopover
              isOpen={isFilterPanelOpen}
              setIsOpen={setIsFilterPanelOpen}
              align="right"
              desktopClassName="w-80 rounded-2xl border border-border bg-card shadow-2xl p-4 space-y-4 text-xs"
              trigger={
                <button
                  type="button"
                  onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                  className={`w-[42px] h-[42px] rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center shrink-0 relative ${
                    activeFiltersCount > 0
                      ? "bg-[#C9A52A]/15 border-[#C9A52A] text-[#C9A52A]"
                      : "bg-background border-border text-muted-foreground hover:text-foreground"
                  }`}
                  title="Filter Projects"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  {activeFiltersCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#C9A52A] text-[#0B0D10] text-[9.5px] font-mono font-extrabold flex items-center justify-center shadow-xs">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>
              }
            >
              {/* Bottom Sheet / Popover Content */}
              <div className="p-4 sm:p-0 space-y-4 text-xs">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-[#C9A52A]" />
                    <span className="font-extrabold text-foreground uppercase tracking-wider text-xs">Filter Projects</span>
                  </div>
                  {activeFiltersCount > 0 && (
                    <button
                      onClick={clearAllFilters}
                      className="text-[#C9A52A] hover:underline font-bold text-xs cursor-pointer"
                    >
                      Reset All
                    </button>
                  )}
                </div>

                {/* Status Filter */}
                <div className="space-y-1.5">
                  <label className="font-bold text-muted-foreground block text-[11px] uppercase tracking-wider">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full h-[40px] px-3 rounded-xl bg-background border border-border text-foreground text-xs font-medium focus:outline-none focus:border-[#C9A52A] transition-colors"
                  >
                    <option value="All">All Statuses ({metrics.total})</option>
                    <option value="Active">Active ({metrics.active})</option>
                    <option value="Planning">Planning ({metrics.planning})</option>
                    <option value="On Hold">On Hold ({metrics.onHold})</option>
                    <option value="Completed">Completed ({metrics.completed})</option>
                  </select>
                </div>

                {/* Priority Filter */}
                <div className="space-y-1.5">
                  <label className="font-bold text-muted-foreground block text-[11px] uppercase tracking-wider">Priority</label>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="w-full h-[40px] px-3 rounded-xl bg-background border border-border text-foreground text-xs font-medium focus:outline-none focus:border-[#C9A52A] transition-colors"
                  >
                    <option value="All">All Priorities</option>
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                {/* Assignment / CO-CEO Filter */}
                <div className="space-y-1.5">
                  <label className="font-bold text-muted-foreground block text-[11px] uppercase tracking-wider">Assignment / Lead</label>
                  <select
                    value={coCeoFilter}
                    onChange={(e) => setCoCeoFilter(e.target.value)}
                    className="w-full h-[40px] px-3 rounded-xl bg-background border border-border text-foreground text-xs font-medium focus:outline-none focus:border-[#C9A52A] transition-colors"
                  >
                    <option value="All">All Leads / Assigned</option>
                    {coCeoOptions.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Deadline Filter */}
                <div className="space-y-1.5">
                  <label className="font-bold text-muted-foreground block text-[11px] uppercase tracking-wider">Deadline</label>
                  <select
                    value={deadlineFilter}
                    onChange={(e) => setDeadlineFilter(e.target.value)}
                    className="w-full h-[40px] px-3 rounded-xl bg-background border border-border text-foreground text-xs font-medium focus:outline-none focus:border-[#C9A52A] transition-colors"
                  >
                    <option value="All">All Deadlines</option>
                    <option value="Overdue">Overdue</option>
                    <option value="DueToday">Due Today</option>
                    <option value="NoDeadline">No Deadline</option>
                  </select>
                </div>

                {/* Action Footer */}
                <div className="pt-3 border-t border-border flex items-center justify-between gap-3">
                  <button
                    onClick={clearAllFilters}
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => setIsFilterPanelOpen(false)}
                    className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C9A52A] to-[#D4B12F] text-[#0B0D10] font-extrabold text-xs shadow-md transition-all hover:brightness-105 cursor-pointer text-center"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            </ResponsivePopover>
          </div>

          {/* View Toggle (Hidden on mobile, visible on desktop ≥ md) */}
          <div className="hidden md:flex items-center gap-1 p-1 bg-muted rounded-xl border border-border shrink-0">
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === "table" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
              title="Table View"
            >
              <List className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
            <button
              onClick={() => setViewMode("board")}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === "board" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
              title="Board View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Board</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 4. INTERNAL SCROLLABLE CONTENT REGION ───────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
        {/* Error Banner */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={fetchProjects} className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 rounded-lg font-bold flex items-center gap-1 cursor-pointer">
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          </div>
        )}

        {/* Minimal Skeleton Loading */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-5 rounded-[18px] bg-card border border-border space-y-3 animate-pulse">
                <div className="w-8 h-8 rounded-lg bg-muted" />
                <div className="h-5 w-2/3 bg-muted rounded-md" />
                <div className="h-4 w-full bg-muted rounded-md" />
                <div className="h-4 w-1/2 bg-muted rounded-md" />
              </div>
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          /* Clean Professional Empty State */
          <div className="p-10 rounded-2xl bg-card border border-border text-center space-y-3 my-8 max-w-md mx-auto">
            <h3 className="text-sm font-extrabold text-foreground">No projects found</h3>
            <p className="text-xs text-muted-foreground">
              {search || activeFiltersCount > 0
                ? "No projects match your current filters. Try resetting search or filter options."
                : "Create your first organization project to begin execution."}
            </p>
            <div className="pt-2">
              {search || activeFiltersCount > 0 ? (
                <button
                  onClick={clearAllFilters}
                  className="px-4 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-bold text-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  Clear Filters
                </button>
              ) : (
                <Link
                  href={`${basePath}/projects/create`}
                  className="px-4 py-2 rounded-xl bg-[#C9A52A] text-[#0B0D10] font-extrabold text-xs inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> New Project
                </Link>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* ── MOBILE PROJECT CARDS LIST (< md) — MATCHES REFERENCE IMAGE ───── */}
            <div className="block md:hidden space-y-4 pb-32">
              {filteredProjects.map((p) => {
                const dInfo = fmtDeadlineLabel(p.deadline || p.targetDate, p.status);
                const progressVal = Math.min(100, Math.max(0, p.progress ?? p.completionPercentage ?? 0));

                return (
                  <div
                    key={p.id}
                    onClick={() => router.push(`${basePath}/projects/${p.id}`)}
                    className="p-5 rounded-[18px] sm:rounded-[20px] bg-card border border-border/80 hover:border-[#C9A52A]/40 transition-all shadow-2xs cursor-pointer space-y-3 font-sans relative group"
                  >
                    {/* 1. Project Icon (Top) & Three-Dot Menu */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2.5 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-lg bg-[#C9A52A]/10 border border-[#C9A52A]/25 flex items-center justify-center text-[#C9A52A] dark:text-[#D4B12F] shrink-0 font-mono text-xs font-bold">
                          {p.icon ? (
                            <span>{p.icon}</span>
                          ) : (
                            <FolderKanban className="w-4 h-4 text-[#C9A52A]" />
                          )}
                        </div>

                        {/* 2. Project Title */}
                        <h3 className="font-semibold text-foreground text-[17px] sm:text-lg tracking-tight leading-snug line-clamp-1">
                          {p.name}
                        </h3>
                      </div>

                      {/* 4. Three-Dot Menu */}
                      <button
                        type="button"
                        onClick={(e) => handleOpenActionMenu(e, p)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer shrink-0 -mr-1 -mt-1"
                        title="Project Actions"
                      >
                        <MoreVertical className="w-4.5 h-4.5" />
                      </button>
                    </div>

                    {/* 3. Project Description (max 2 lines, user's actual stored text) */}
                    {(p.description || p.mandate) && (
                      <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-relaxed font-normal">
                        {p.description || p.mandate}
                      </p>
                    )}

                    {/* Horizontal Divider Line */}
                    <div className="border-t border-border/60 pt-3 mt-3 flex items-center justify-between text-xs">
                      {/* 5. Due Date */}
                      <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                        <span>{p.deadline || p.targetDate ? `Due ${dInfo.dateText}` : "No deadline"}</span>
                      </div>

                      {/* 6. Completion & 7. Small Progress Indicator */}
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground text-xs">{progressVal}% Complete</span>
                        <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden shrink-0">
                          <div
                            className="h-full bg-[#C9A52A] rounded-full transition-all duration-300"
                            style={{ width: `${progressVal}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── DESKTOP/TABLET PRESENTATION (≥ md:) ────────────────────────────────── */}
            <div className="hidden md:block">
              {viewMode === "table" ? (
                /* ── TABLE VIEW WITH FIXED COLUMN ALIGNMENT ───────────────────────── */
                <div className="rounded-2xl bg-card border border-border shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs table-fixed">
                      <thead>
                        <tr className="border-b border-border bg-muted/30 text-[10.5px] font-extrabold text-muted-foreground uppercase tracking-wider sticky top-0 z-10 backdrop-blur-md">
                          <th className="py-3 px-3 w-9 text-center">
                            <input
                              type="checkbox"
                              checked={isAllSelected}
                              onChange={toggleSelectAll}
                              className="rounded border-border text-[#C9A52A] focus:ring-0 cursor-pointer"
                            />
                          </th>
                          <th className="py-3 px-3 min-w-[260px]">Project</th>
                          <th className="py-3 px-3 w-[120px]">Owner</th>
                          <th className="py-3 px-3 w-[150px]">Lead</th>
                          <th className="py-3 px-3 w-[110px]">Status</th>
                          <th className="py-3 px-3 w-[100px]">Priority</th>
                          <th className="py-3 px-3 w-[140px]">Deadline</th>
                          <th className="py-3 px-3 w-[130px]">Progress</th>
                          <th className="py-3 px-3 w-[64px] text-right">Actions</th>
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
                              className={`group h-[64px] transition-colors cursor-pointer ${
                                isSelected ? "bg-[#C9A52A]/5" : "hover:bg-muted/30"
                              }`}
                            >
                              {/* Select */}
                              <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSelectOne(p.id)}
                                  className="rounded border-border text-[#C9A52A] focus:ring-0 cursor-pointer"
                                />
                              </td>

                              {/* Project Title & Category */}
                              <td className="py-2.5 px-3 min-w-0">
                                <div className="space-y-0.5 min-w-0">
                                  <span className="font-extrabold text-foreground group-hover:text-[#C9A52A] transition-colors truncate block">
                                    {p.name}
                                  </span>
                                  {p.description && (
                                    <p className="text-[11px] text-muted-foreground truncate">{p.description}</p>
                                  )}
                                </div>
                              </td>

                              {/* Owner (CEO Fixed) */}
                              <td className="py-2.5 px-3">
                                <span className="text-foreground text-[11px] font-bold inline-flex items-center gap-1">
                                  <Lock className="w-3 h-3 text-[#C9A52A]" /> CEO
                                </span>
                              </td>

                              {/* CO-CEO Lead */}
                              <td className="py-2.5 px-3">
                                <span className="font-bold text-blue-500 text-[11px] truncate block">
                                  {p.coCeoLeadName || p.assignedUserName || "Unassigned"}
                                </span>
                              </td>

                              {/* Status */}
                              <td className="py-2.5 px-3">
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border inline-flex items-center gap-1 ${statusObj.bg} ${statusObj.text}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${statusObj.dot}`} />
                                  {statusObj.label}
                                </span>
                              </td>

                              {/* Priority */}
                              <td className="py-2.5 px-3">
                                <span className={`inline-flex items-center gap-1 text-[11px] ${priorityObj.text}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${priorityObj.dot}`} />
                                  {p.priority || "Medium"}
                                </span>
                              </td>

                              {/* Deadline */}
                              <td className="py-2.5 px-3">
                                <div className="space-y-0.5">
                                  <span className="font-bold text-foreground text-[11px] block">{dInfo.dateText}</span>
                                  <span className={`text-[10px] font-semibold block ${dInfo.isOverdue ? "text-rose-500" : "text-muted-foreground"}`}>
                                    {dInfo.relText}
                                  </span>
                                </div>
                              </td>

                              {/* Progress */}
                              <td className="py-2.5 px-3">
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
                                  <span className="text-muted-foreground text-[11px] font-medium block">
                                    No tasks yet
                                  </span>
                                )}
                              </td>

                              {/* Actions Trigger Button (Uses Portal Menu) */}
                              <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={(e) => handleOpenActionMenu(e, p)}
                                  className="w-8 h-8 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors inline-flex items-center justify-center cursor-pointer"
                                  title="Project Actions"
                                >
                                  <MoreVertical className="w-4 h-4" />
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
          </>
        )}
      </div>

      {/* ── PORTAL ACTION MENU ────────────────────────────────────────────────── */}
      <ActionMenuPortal
        triggerRect={triggerRect}
        isOpen={!!activeMenuProject}
        onClose={() => setActiveMenuProject(null)}
        onOpenProject={() => {
          if (activeMenuProject) router.push(`${basePath}/projects/${activeMenuProject.id}`);
        }}
        onEditProject={() => {
          if (activeMenuProject) setEditingProject(activeMenuProject);
        }}
        onDeleteProject={() => {
          if (activeMenuProject) setDeleteConfirmSingleId(activeMenuProject.id);
        }}
      />

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
