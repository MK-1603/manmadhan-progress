"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus, FolderKanban, Search, Loader2, AlertCircle,
  Trash2, RefreshCw, ChevronRight, LayoutGrid, List,
  Edit, Check, X, ChevronDown
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { useSocket } from "@/components/providers/socket-provider";
import { useRegisterRefresh } from "@/components/providers/global-refresh-provider";
import Link from "next/link";
import { CreateProjectModal } from "@/components/organization/create-project-modal";
import { EditProjectModal } from "@/components/organization/edit-project-modal";
import { DeleteConfirmationModal } from "@/components/organization/delete-confirmation-modal";

const STATUS_STYLE: Record<string, string> = {
  Active: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  ACTIVE: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  Planning: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  PLANNING: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  "On Hold": "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  ON_HOLD: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  Completed: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20",
  COMPLETED: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20",
  Archived: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20",
  ARCHIVED: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20",
  Cancelled: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
};

const PRIMARY_MOBILE_STATUSES = ["All", "Active", "Planning"];
const MORE_MOBILE_STATUSES = ["On Hold", "Completed", "Archived"];
const STATUS_FILTERS = ["All", "Active", "Planning", "On Hold", "Completed", "Archived"];

function fmtDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

export default function ProjectsPage() {
  const { socket } = useSocket();
  const [realProjects, setRealProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [viewMode, setViewMode] = useState<"table" | "board">("table");

  // Selection & Action Modals
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any | null>(null);
  const [deleteConfirmSingleId, setDeleteConfirmSingleId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showMoreStatusSheet, setShowMoreStatusSheet] = useState(false);

  // Drag & drop state
  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : undefined;
      const res = await apiClient.get(`/org/projects${wsId ? `?workspaceId=${wsId}` : ""}`);
      if (res.data?.success) {
        setRealProjects(res.data.data || []);
        setError("");
      } else {
        setError(res.data?.error || "Failed to load projects.");
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

  // Realtime Socket updates
  useEffect(() => {
    if (!socket) return;
    const handleProjectUpdated = () => fetchProjects();
    const handleProjectCreated = () => fetchProjects();
    const handleProjectDeleted = () => fetchProjects();

    socket.on("project_updated", handleProjectUpdated);
    socket.on("project_created", handleProjectCreated);
    socket.on("project_deleted", handleProjectDeleted);

    return () => {
      socket.off("project_updated", handleProjectUpdated);
      socket.off("project_created", handleProjectCreated);
      socket.off("project_deleted", handleProjectDeleted);
    };
  }, [socket, fetchProjects]);

  const filtered = useMemo(() => {
    return realProjects.filter((p) => {
      const matchSearch =
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.mandate?.toLowerCase().includes(search.toLowerCase()) ||
        p.objective?.toLowerCase().includes(search.toLowerCase());

      const matchStatus =
        statusFilter === "All" ||
        p.status?.toUpperCase() === statusFilter.toUpperCase() ||
        (statusFilter === "Active" && p.status?.toUpperCase() === "ACTIVE") ||
        (statusFilter === "Planning" && p.status?.toUpperCase() === "PLANNING") ||
        (statusFilter === "On Hold" && p.status?.toUpperCase() === "ON_HOLD") ||
        (statusFilter === "Completed" && p.status?.toUpperCase() === "COMPLETED") ||
        (statusFilter === "Archived" && p.status?.toUpperCase() === "ARCHIVED");

      return matchSearch && matchStatus;
    });
  }, [realProjects, search, statusFilter]);

  const kpis = useMemo(() => {
    const total = realProjects.length;
    const active = realProjects.filter(p => p.status?.toUpperCase() === "ACTIVE" || p.status === "Active").length;
    const planning = realProjects.filter(p => p.status?.toUpperCase() === "PLANNING" || p.status === "Planning").length;
    const onHold = realProjects.filter(p => p.status?.toUpperCase() === "ON_HOLD" || p.status === "On Hold").length;
    const completed = realProjects.filter(p => p.status?.toUpperCase() === "COMPLETED" || p.status === "Completed").length;

    return { total, active, planning, onHold, completed };
  }, [realProjects]);

  const isMoreStatusActive = MORE_MOBILE_STATUSES.some((s) => s.toLowerCase() === statusFilter.toLowerCase());

  // Bulk Selection Handlers
  const isAllSelected = useMemo(() => {
    return filtered.length > 0 && filtered.every((p) => selectedIds.includes(p.id));
  }, [filtered, selectedIds]);

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((p) => p.id));
    }
  };

  const toggleSelectOne = (id: string, e: React.SyntheticEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Execute Single Delete
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
      setError(err?.response?.data?.error || "Failed to delete project");
    } finally {
      setDeleting(false);
    }
  };

  // Drag and Drop Column Handler
  const handleDropOnColumn = async (targetStatus: string, e: React.DragEvent) => {
    e.preventDefault();
    const projectId = e.dataTransfer.getData("text/plain") || draggedProjectId;
    if (!projectId) return;

    const targetProject = realProjects.find((p) => p.id === projectId);
    if (!targetProject || targetProject.status === targetStatus) return;

    // Optimistic UI update
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
      console.error("Failed to update status via drag & drop:", err);
      fetchProjects();
    } finally {
      setDraggedProjectId(null);
    }
  };

  const base = typeof window !== "undefined"
    ? window.location.pathname.startsWith("/co-ceo") ? "/co-ceo"
    : window.location.pathname.startsWith("/member") ? "/member"
    : "/ceo"
    : "/ceo";

  return (
    <div className="w-full min-h-full flex flex-col justify-between p-3.5 sm:p-5 md:px-8 md:py-5 max-w-[1600px] mx-auto bg-[#F8F9FB] dark:bg-[#0B0E12] text-[#17202A] dark:text-[#F2F4F7] font-sans select-none space-y-4 pb-24 md:pb-5">
      
      {/* ── MOBILE WORKSPACE (100% UNTOUCHED & PROTECTED) ──────────────── */}
      <div className="md:hidden space-y-3">
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-[20px] font-bold text-[#17202A] dark:text-[#F2F4F7] tracking-tight leading-none">
              Projects
            </h1>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="px-4 h-[36px] rounded-[9px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] font-bold text-[12px] flex items-center justify-center gap-1.5 shrink-0 cursor-pointer active:scale-95 shadow-xs transition-transform whitespace-nowrap"
            >
              <Plus className="w-4 h-4 stroke-[2.5] shrink-0" />
              <span>New Project</span>
            </button>
          </div>
          <p className="text-[12px] text-[#667085] dark:text-[#8B95A5]">
            Plan, execute, and track organization work.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[12px] font-medium flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="truncate">{error}</span>
            </div>
            <button onClick={fetchProjects} className="font-semibold underline cursor-pointer shrink-0 ml-2">
              Retry
            </button>
          </div>
        )}

        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#667085] dark:text-[#8B95A5]" />
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 h-[42px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[10px] text-[12.5px] text-[#17202A] dark:text-[#F2F4F7] placeholder-[#667085] dark:placeholder-[#8B95A5] outline-none focus:border-[#C9A52A] dark:focus:border-[#D4B12F] shadow-xs"
          />
        </div>

        {/* Mobile Status Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-[#E4E7EC] dark:border-[#272D36] pb-1 overflow-x-auto [scrollbar-width:none]">
          <div className="flex items-center gap-1">
            {PRIMARY_MOBILE_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-[8px] text-[12px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter.toLowerCase() === s.toLowerCase()
                    ? "bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10]"
                    : "text-[#667085] dark:text-[#8B95A5]"
                }`}
              >
                {s}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setShowMoreStatusSheet(true)}
              className={`px-3 py-1.5 rounded-[8px] text-[12px] font-bold transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                isMoreStatusActive
                  ? "bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10]"
                  : "text-[#667085] dark:text-[#8B95A5]"
              }`}
            >
              <span>{isMoreStatusActive ? statusFilter : "More"}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Mobile Project Cards List */}
        <div className="space-y-3">
          {loading ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 rounded-[14px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] space-y-3 shadow-2xs">
                  <div className="h-4 bg-[#E4E7EC] dark:bg-[#272D36] rounded w-2/3" />
                  <div className="h-3 bg-[#E4E7EC] dark:bg-[#272D36] rounded w-full" />
                  <div className="h-2 bg-[#E4E7EC] dark:bg-[#272D36] rounded-full w-full" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="w-full rounded-[16px] border border-[#E4E7EC] dark:border-[#272D36] bg-[#FFFFFF] dark:bg-[#15191F] flex flex-col items-center justify-center py-8 px-6 text-center space-y-4 my-2 max-w-md mx-auto shadow-2xs">
              <div className="w-12 h-12 rounded-full bg-[#C9A52A]/10 text-[#C9A52A] flex items-center justify-center border border-[#C9A52A]/20 shrink-0">
                <FolderKanban className="w-6 h-6 stroke-[2]" />
              </div>
              <div className="space-y-1.5 max-w-sm">
                <h3 className="text-[16px] font-bold text-[#17202A] dark:text-[#F2F4F7]">
                  No projects found
                </h3>
                <p className="text-[12.5px] text-[#667085] dark:text-[#8B95A5] leading-relaxed">
                  Create your first organization project to define the mandate, assign ownership, and start execution.
                </p>
              </div>
              <button
                onClick={() => setIsCreateOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 px-5 h-[40px] rounded-[10px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[12.5px] font-bold hover:opacity-90 transition-opacity shadow-xs cursor-pointer whitespace-nowrap shrink-0 mt-1"
              >
                <Plus className="w-4 h-4 stroke-[2.5] shrink-0" />
                <span>Create Project</span>
              </button>
            </div>
          ) : (
            filtered.map((project) => (
              <div
                key={project.id}
                className="p-4 rounded-[14px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] space-y-3 shadow-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <Link
                      href={`${base}/projects/${project.id}`}
                      className="text-[14.5px] font-bold text-[#17202A] dark:text-[#F2F4F7] hover:text-[#C9A52A] transition-colors block truncate leading-snug"
                    >
                      {project.name}
                    </Link>
                    {(project.objective || project.description || project.mandate) && (
                      <p className="text-[12px] text-[#667085] dark:text-[#8B95A5] line-clamp-2 leading-relaxed">
                        {project.objective || project.description || project.mandate}
                      </p>
                    )}
                  </div>

                  <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold shrink-0 ${STATUS_STYLE[project.status] || STATUS_STYLE.Archived}`}>
                    {project.status}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-[#667085] dark:text-[#8B95A5]">Progress</span>
                    <span className="font-bold text-[#17202A] dark:text-[#F2F4F7]">{project.progress || 0}% ({project.completedTasks || 0}/{project.totalTasks || 0} tasks)</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#E4E7EC] dark:bg-[#272D36] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#C9A52A] dark:bg-[#D4B12F] rounded-full transition-all duration-500"
                      style={{ width: `${project.progress || 0}%` }}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E4E7EC]/60 dark:border-[#272D36]/60 flex items-center justify-between text-[12px]">
                  <div className="text-[#667085] dark:text-[#8B95A5]">
                    Due: <span className="font-mono font-medium text-[#17202A] dark:text-[#F2F4F7]">{fmtDate(project.deadline)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingProject(project)}
                      className="p-1.5 rounded-md text-[#667085] hover:text-[#C9A52A] hover:bg-[#C9A52A]/10 transition-colors"
                      title="Edit project"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>

                    <Link
                      href={`${base}/projects/${project.id}`}
                      className="px-2.5 py-1 rounded-[7px] bg-[#C9A52A]/10 text-[#C9A52A] dark:text-[#D4B12F] border border-[#C9A52A]/20 text-[11.5px] font-semibold flex items-center gap-1"
                    >
                      Open <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── DESKTOP RECONSTRUCTED NO-SCROLL WORKSPACE (>= 1024px) ────────── */}
      <div className="hidden md:flex md:flex-col h-[calc(100dvh-76px)] min-h-0 w-full overflow-hidden space-y-3.5">
        
        {/* Desktop Page Header (Compact ~40px) */}
        <div className="shrink-0 flex items-center justify-between gap-4 border-b border-[#E4E7EC] dark:border-[#272D36] pb-2.5">
          <div className="space-y-0.5">
            <h1 className="text-[24px] font-extrabold text-[#17202A] dark:text-[#F2F4F7] tracking-tight leading-none">
              Projects
            </h1>
            <p className="text-[12px] text-[#667085] dark:text-[#8B95A5]">
              Plan, execute, and track organization work from one place.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={fetchProjects}
              className="h-[36px] px-3.5 rounded-[9px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7] text-[12px] font-semibold transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 whitespace-nowrap shrink-0"
              title="Refresh projects"
            >
              <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={() => setIsCreateOpen(true)}
              className="h-[36px] px-5 rounded-[9px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[12px] font-bold hover:opacity-90 transition-opacity inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[2.5] shrink-0" />
              <span>New Project</span>
            </button>
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="shrink-0 p-3 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[12.5px] font-medium flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={fetchProjects} className="font-semibold underline cursor-pointer">
              Retry
            </button>
          </div>
        )}

        {/* Compact Executive KPI Strip (~84px height) */}
        <div className="shrink-0 grid grid-cols-5 gap-3">
          <div className="h-[84px] p-3 rounded-[12px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] flex flex-col justify-between shadow-2xs">
            <span className="text-[10.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider">TOTAL</span>
            <div className="text-[22px] font-extrabold text-[#17202A] dark:text-[#F2F4F7] leading-none">{kpis.total}</div>
            <p className="text-[10.5px] text-[#667085] dark:text-[#8B95A5]">All projects</p>
          </div>

          <div className="h-[84px] p-3 rounded-[12px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] flex flex-col justify-between shadow-2xs">
            <span className="text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">ACTIVE</span>
            <div className="text-[22px] font-extrabold text-emerald-600 dark:text-emerald-400 leading-none">{kpis.active}</div>
            <p className="text-[10.5px] text-[#667085] dark:text-[#8B95A5]">In execution</p>
          </div>

          <div className="h-[84px] p-3 rounded-[12px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] flex flex-col justify-between shadow-2xs">
            <span className="text-[10.5px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">PLANNING</span>
            <div className="text-[22px] font-extrabold text-blue-600 dark:text-blue-400 leading-none">{kpis.planning}</div>
            <p className="text-[10.5px] text-[#667085] dark:text-[#8B95A5]">Preparing execution</p>
          </div>

          <div className="h-[84px] p-3 rounded-[12px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] flex flex-col justify-between shadow-2xs">
            <span className="text-[10.5px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">ON HOLD</span>
            <div className="text-[22px] font-extrabold text-amber-600 dark:text-amber-400 leading-none">{kpis.onHold}</div>
            <p className="text-[10.5px] text-[#667085] dark:text-[#8B95A5]">Paused projects</p>
          </div>

          <div className="h-[84px] p-3 rounded-[12px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] flex flex-col justify-between shadow-2xs">
            <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">COMPLETED</span>
            <div className="text-[22px] font-extrabold text-[#17202A] dark:text-[#F2F4F7] leading-none">{kpis.completed}</div>
            <p className="text-[10.5px] text-[#667085] dark:text-[#8B95A5]">Finished projects</p>
          </div>
        </div>

        {/* Compact Unified Desktop Toolbar Surface (~44px height) */}
        <div className="shrink-0 flex items-center justify-between gap-3 bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] p-1.5 rounded-[12px] shadow-2xs">
          <div className="relative w-[300px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#667085] dark:text-[#8B95A5]" />
            <input
              type="text"
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 h-[34px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] rounded-[8px] text-[12px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#C9A52A]"
            />
          </div>

          <div className="flex items-center gap-1">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`h-[30px] px-3 text-[11.5px] font-bold rounded-[7px] transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === s
                    ? "bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] shadow-2xs"
                    : "text-[#667085] hover:text-[#17202A] dark:hover:text-[#F2F4F7]"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex items-center p-0.5 rounded-[7px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36]">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`px-2.5 h-[28px] rounded-[5px] text-[11.5px] font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                viewMode === "table"
                  ? "bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10]"
                  : "text-[#667085] hover:text-[#17202A] dark:hover:text-[#F2F4F7]"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("board")}
              className={`px-2.5 h-[28px] rounded-[5px] text-[11.5px] font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                viewMode === "board"
                  ? "bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10]"
                  : "text-[#667085] hover:text-[#17202A] dark:hover:text-[#F2F4F7]"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Board</span>
            </button>
          </div>
        </div>

        {/* Desktop Integrated Flex Workspace (Fills remaining viewport space, zero page scroll) */}
        <div className="flex-1 min-h-0 bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[14px] shadow-2xs overflow-hidden flex flex-col justify-center">
          {loading ? (
            /* Compact Skeleton Loader */
            <div className="p-4 space-y-2.5 animate-pulse w-full">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-[44px] bg-[#F8F9FB] dark:bg-[#111419] rounded-[8px] w-full flex items-center justify-between px-4">
                  <div className="w-1/4 h-3.5 bg-[#E4E7EC] dark:bg-[#272D36] rounded" />
                  <div className="w-1/6 h-3.5 bg-[#E4E7EC] dark:bg-[#272D36] rounded" />
                  <div className="w-1/6 h-3.5 bg-[#E4E7EC] dark:bg-[#272D36] rounded" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            /* Integrated Compact Empty State */
            <div className="flex flex-col items-center justify-center py-8 px-6 text-center space-y-3.5 my-auto">
              <div className="w-11 h-11 rounded-full bg-[#C9A52A]/10 text-[#C9A52A] flex items-center justify-center border border-[#C9A52A]/20 shrink-0">
                <FolderKanban className="w-5 h-5 stroke-[2]" />
              </div>
              <div className="space-y-1 max-w-md">
                <h3 className="text-[16px] font-bold text-[#17202A] dark:text-[#F2F4F7]">
                  {realProjects.length === 0 ? "No projects yet" : "No matching projects"}
                </h3>
                <p className="text-[12.5px] text-[#667085] dark:text-[#8B95A5] leading-relaxed">
                  {realProjects.length === 0
                    ? "Create your first organization project to define the mandate, assign ownership, and start execution."
                    : `No organization projects matched your search term "${search}" or status filter "${statusFilter}".`}
                </p>
              </div>
              {realProjects.length === 0 ? (
                <button
                  onClick={() => setIsCreateOpen(true)}
                  className="inline-flex items-center justify-center gap-2 px-6 h-[38px] rounded-[10px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[12.5px] font-bold hover:opacity-90 transition-opacity shadow-2xs cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Plus className="w-4 h-4 stroke-[2.5] shrink-0" />
                  <span>Create Project</span>
                </button>
              ) : (
                <button
                  onClick={() => { setSearch(""); setStatusFilter("All"); }}
                  className="inline-flex items-center justify-center gap-1.5 px-4 h-[34px] rounded-[8px] border border-[#E4E7EC] dark:border-[#272D36] text-[12px] font-bold text-[#17202A] dark:text-[#F2F4F7] hover:bg-[#F8F9FB] dark:hover:bg-[#111419] cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span>Clear Filters</span>
                </button>
              )}
            </div>
          ) : viewMode === "table" ? (
            /* Desktop Enterprise Execution Table (Internal Y-Scroll) */
            <div className="w-full h-full min-h-0 overflow-y-auto">
              <table className="w-full text-left text-[12.5px]">
                <thead className="sticky top-0 z-10 bg-[#F8F9FB] dark:bg-[#111419] border-b border-[#E4E7EC] dark:border-[#272D36] text-[10.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider">
                  <tr className="h-[40px]">
                    <th className="p-3 w-10">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={toggleSelectAll}
                        className="rounded border-[#E4E7EC] dark:border-[#272D36] text-[#C9A52A] focus:ring-0 cursor-pointer"
                      />
                    </th>
                    <th className="p-3">Project</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Tasks & Progress</th>
                    <th className="p-3">Owner</th>
                    <th className="p-3">Target Date</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E7EC]/60 dark:divide-[#272D36]/60">
                  {filtered.map((p) => (
                    <tr key={p.id} className="hover:bg-[#F8F9FB] dark:hover:bg-[#111419] transition-colors h-[48px]">
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(p.id)}
                          onChange={(e) => toggleSelectOne(p.id, e)}
                          className="rounded border-[#E4E7EC] dark:border-[#272D36] text-[#C9A52A] focus:ring-0 cursor-pointer"
                        />
                      </td>
                      <td className="p-3">
                        <Link href={`${base}/projects/${p.id}`} className="font-bold text-[#17202A] dark:text-[#F2F4F7] hover:text-[#C9A52A] transition-colors block">
                          {p.name}
                        </Link>
                        {(p.objective || p.mandate) && (
                          <span className="text-[11px] text-[#667085] dark:text-[#8B95A5] line-clamp-1">{p.objective || p.mandate}</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border ${STATUS_STYLE[p.status] || STATUS_STYLE.Archived}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="p-3 w-[200px]">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10.5px] font-mono">
                            <span className="text-[#667085]">{p.completedTasks || 0}/{p.totalTasks || 0} tasks</span>
                            <span className="font-bold text-[#17202A] dark:text-[#F2F4F7]">{p.progress || 0}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-[#E4E7EC] dark:bg-[#272D36] rounded-full overflow-hidden">
                            <div className="h-full bg-[#C9A52A] dark:bg-[#D4B12F] rounded-full transition-all" style={{ width: `${p.progress || 0}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="p-3 font-medium text-[#17202A] dark:text-[#F2F4F7]">
                        {p.ownerName || p.ownerEmail || "Organization Owner"}
                      </td>
                      <td className="p-3 font-mono text-[#667085] text-[11.5px]">{fmtDate(p.deadline || p.targetDate)}</td>
                      <td className="p-3 text-right space-x-1.5">
                        <button
                          onClick={() => setEditingProject(p)}
                          className="p-1 rounded-md text-[#667085] hover:text-[#C9A52A] hover:bg-[#C9A52A]/10 transition-colors"
                          title="Edit Project"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmSingleId(p.id)}
                          className="p-1 rounded-md text-[#667085] hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                          title="Delete Project"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <Link
                          href={`${base}/projects/${p.id}`}
                          className="inline-flex items-center justify-center gap-1 px-2.5 py-0.5 rounded-[6px] bg-[#C9A52A]/10 text-[#C9A52A] border border-[#C9A52A]/20 text-[11px] font-bold whitespace-nowrap"
                        >
                          Open <ChevronRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Desktop Kanban Board View (Internal Column Y-Scroll) */
            <div className="p-3 grid grid-cols-4 gap-3 w-full h-full min-h-0 overflow-y-auto">
              {["Planning", "Active", "On Hold", "Completed"].map((status) => {
                const colProjects = filtered.filter(p => (p.status || "Planning").toUpperCase() === status.toUpperCase() || (status === "Active" && p.status === "ACTIVE"));
                return (
                  <div
                    key={status}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDropOnColumn(status, e)}
                    className="bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] rounded-[12px] p-3 space-y-2.5 min-h-[400px] flex flex-col"
                  >
                    <div className="flex items-center justify-between border-b border-[#E4E7EC] dark:border-[#272D36] pb-2">
                      <h3 className="text-[13px] font-bold text-[#17202A] dark:text-[#F2F4F7]">{status}</h3>
                      <span className="w-5 h-5 rounded-full bg-[#FFFFFF] dark:bg-[#15191F] text-[#667085] text-[10.5px] font-bold flex items-center justify-center border border-[#E4E7EC] dark:border-[#272D36]">
                        {colProjects.length}
                      </span>
                    </div>
                    <div className="space-y-2 overflow-y-auto flex-1 pr-0.5">
                      {colProjects.map((p) => (
                        <div
                          key={p.id}
                          draggable
                          onDragStart={(e) => { e.dataTransfer.setData("text/plain", p.id); setDraggedProjectId(p.id); }}
                          className="p-3 rounded-[10px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] space-y-2 cursor-grab active:cursor-grabbing hover:border-[#C9A52A]/50 transition-colors shadow-2xs"
                        >
                          <Link href={`${base}/projects/${p.id}`} className="text-[13px] font-bold text-[#17202A] dark:text-[#F2F4F7] hover:text-[#C9A52A] block leading-snug">
                            {p.name}
                          </Link>
                          {(p.mandate || p.objective) && (
                            <p className="text-[11px] text-[#667085] dark:text-[#8B95A5] line-clamp-2">{p.mandate || p.objective}</p>
                          )}
                          <div className="space-y-1 pt-1 border-t border-[#E4E7EC]/60 dark:border-[#272D36]/60">
                            <div className="flex items-center justify-between text-[10px] text-[#667085]">
                              <span>Progress</span>
                              <span className="font-bold">{p.progress || 0}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-[#E4E7EC] dark:bg-[#272D36] rounded-full overflow-hidden">
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
        </div>
      </div>

      {/* Mobile Secondary Status Sheet */}
      {showMoreStatusSheet && (
        <div
          className="md:hidden fixed inset-0 z-[140] flex flex-col justify-end bg-black/70 backdrop-blur-xs font-sans transition-opacity animate-in fade-in duration-200"
          onClick={() => setShowMoreStatusSheet(false)}
        >
          <div
            className="bg-[#FFFFFF] dark:bg-[#15191F] border-t border-[#E4E7EC] dark:border-[#272D36] rounded-t-[24px] p-5 space-y-4 max-h-[75dvh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-3">
              <div className="w-10 h-1 bg-[#E4E7EC] dark:bg-[#272D36] rounded-full mx-auto" />
              <div className="flex items-center justify-between pb-2 border-b border-[#E4E7EC] dark:border-[#272D36]">
                <h3 className="text-[15px] font-bold text-[#17202A] dark:text-[#F2F4F7]">Secondary Project Statuses</h3>
                <button
                  type="button"
                  onClick={() => setShowMoreStatusSheet(false)}
                  className="p-1.5 rounded-full text-[#667085] hover:bg-[#F8F9FB] dark:hover:bg-[#111419]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-1">
              {MORE_MOBILE_STATUSES.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => {
                    setStatusFilter(status);
                    setShowMoreStatusSheet(false);
                  }}
                  className={`w-full h-[48px] px-3.5 rounded-[12px] text-left text-[13px] font-bold transition-colors flex items-center justify-between cursor-pointer ${
                    statusFilter.toLowerCase() === status.toLowerCase()
                      ? "bg-[#C9A52A]/10 text-[#C9A52A]"
                      : "text-[#17202A] dark:text-[#F2F4F7] hover:bg-[#F8F9FB] dark:hover:bg-[#111419]"
                  }`}
                >
                  <span>{status}</span>
                  {statusFilter.toLowerCase() === status.toLowerCase() && <Check className="w-4 h-4 text-[#C9A52A]" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create Project Modal */}
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
        description="This action cannot be undone. All tasks associated with this project will be deleted."
        isSubmitting={deleting}
        onClose={() => setDeleteConfirmSingleId(null)}
        onConfirm={handleExecuteSingleDelete}
      />
    </div>
  );
}
