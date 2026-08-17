"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Plus, FolderKanban, Search, Loader2, AlertCircle,
  Trash2, RefreshCw, ChevronRight, LayoutGrid, List,
  Archive, CheckSquare, Square, Edit, MoreVertical, Shield, Check, X, Move, ChevronDown
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
  const [deleteConfirmBulk, setDeleteConfirmBulk] = useState(false);
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

  // Execute Bulk Delete
  const handleExecuteBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setDeleting(true);
    try {
      const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : undefined;
      await apiClient.post(`/org/projects/bulk-delete${wsId ? `?workspaceId=${wsId}` : ""}`, {
        projectIds: selectedIds,
      });
      setRealProjects((prev) => prev.filter((p) => !selectedIds.includes(p.id)));
      setSelectedIds([]);
      setDeleteConfirmBulk(false);
      fetchProjects();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to delete projects");
    } finally {
      setDeleting(false);
    }
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
    <div className="w-full min-h-full flex flex-col justify-between p-3.5 sm:p-5 md:px-10 md:py-5 max-w-[1400px] mx-auto bg-[#F8F9FB] dark:bg-[#0B0E12] text-[#17202A] dark:text-[#F2F4F7] font-sans select-none space-y-4 pb-24 md:pb-5">
      
      {/* ── MOBILE HEADER REGION ───────────────────────────────────────── */}
      <div className="md:hidden space-y-3">
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-[20px] font-bold text-[#17202A] dark:text-[#F2F4F7] tracking-tight leading-none">
              Projects
            </h1>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="px-3.5 h-[36px] rounded-[9px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] font-bold text-[12px] flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95 shadow-xs transition-transform"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
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
            /* 3-Card Animated Skeleton Loader */
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
            /* Content-Sized Empty State Card */
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
                className="inline-flex items-center gap-1.5 px-5 h-[40px] rounded-[10px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[12.5px] font-bold hover:opacity-90 transition-opacity shadow-xs cursor-pointer mt-1"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
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

      {/* ── DESKTOP HEADER & CONTENT (UNTOUCHED) ───────────────────────── */}
      <div className="hidden md:flex md:flex-col space-y-4">
        <div className="flex items-center justify-between gap-4 border-b border-[#E4E7EC] dark:border-[#272D36] pb-4">
          <div className="space-y-0.5">
            <h1 className="text-[26px] font-extrabold text-[#17202A] dark:text-[#F2F4F7] tracking-tight leading-none flex items-center gap-2.5">
              <span>Projects</span>
            </h1>
            <p className="text-[13px] text-[#667085] dark:text-[#8B95A5]">
              Plan, execute, and track organization work from one place.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchProjects}
              className="h-[40px] px-3.5 rounded-[10px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7] text-[12.5px] font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
              title="Refresh projects"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={() => setIsCreateOpen(true)}
              className="h-[40px] px-4 rounded-[10px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[13px] font-bold hover:opacity-90 transition-opacity inline-flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>New Project</span>
            </button>
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[13px] font-medium flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={fetchProjects} className="font-semibold underline cursor-pointer">
              Retry
            </button>
          </div>
        )}

        {/* Desktop Filter Bar & View Switcher */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 max-w-xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#667085] dark:text-[#8B95A5]" />
              <input
                type="text"
                placeholder="Search projects by name, mandate..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3.5 h-[40px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[10px] text-[13px] text-[#17202A] dark:text-[#F2F4F7] placeholder-[#667085] dark:placeholder-[#8B95A5] outline-none focus:border-[#C9A52A] dark:focus:border-[#D4B12F] shadow-xs"
              />
            </div>

            <div className="flex items-center gap-1 bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] p-1 rounded-[10px]">
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`h-[30px] px-3 text-[12px] font-semibold rounded-[7px] transition-all cursor-pointer ${
                    statusFilter === s
                      ? "bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] font-bold shadow-xs"
                      : "text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7]"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center p-1 bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[10px]">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`px-3 h-[30px] rounded-[7px] text-[12px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
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
                className={`px-3 h-[30px] rounded-[7px] text-[12px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
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
        </div>

        {/* Desktop View Workspace */}
        {loading ? (
          <div className="p-12 text-center bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[16px]">
            <Loader2 className="w-8 h-8 animate-spin text-[#C9A52A] mx-auto" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[16px] space-y-3">
            <FolderKanban className="w-10 h-10 text-[#C9A52A] mx-auto opacity-70" />
            <h3 className="text-[16px] font-bold text-[#17202A] dark:text-[#F2F4F7]">No projects found</h3>
            <p className="text-[13px] text-[#667085] dark:text-[#8B95A5]">Create a project to begin tracking execution.</p>
          </div>
        ) : viewMode === "table" ? (
          <div className="bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[16px] overflow-hidden shadow-xs">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-[#F8F9FB] dark:bg-[#111419] border-b border-[#E4E7EC] dark:border-[#272D36] text-[11px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider">
                <tr className="h-[44px]">
                  <th className="p-3 w-10">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={toggleSelectAll}
                      className="rounded border-[#E4E7EC] dark:border-[#272D36] text-[#C9A52A] focus:ring-0 cursor-pointer"
                    />
                  </th>
                  <th className="p-3">Project Name</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Tasks</th>
                  <th className="p-3">Progress</th>
                  <th className="p-3">Target Date</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E7EC]/60 dark:divide-[#272D36]/60">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-[#F8F9FB] dark:hover:bg-[#111419] transition-colors">
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(p.id)}
                        onChange={(e) => toggleSelectOne(p.id, e)}
                        className="rounded border-[#E4E7EC] dark:border-[#272D36] text-[#C9A52A] focus:ring-0 cursor-pointer"
                      />
                    </td>
                    <td className="p-3 font-semibold text-[#17202A] dark:text-[#F2F4F7]">
                      <Link href={`${base}/projects/${p.id}`} className="hover:text-[#C9A52A]">
                        {p.name}
                      </Link>
                    </td>
                    <td className="p-3">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${STATUS_STYLE[p.status] || STATUS_STYLE.Archived}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="p-3 font-medium text-[#667085]">{p.completedTasks || 0} / {p.totalTasks || 0}</td>
                    <td className="p-3 font-bold text-[#17202A] dark:text-[#F2F4F7]">{p.progress || 0}%</td>
                    <td className="p-3 font-mono text-[#667085]">{fmtDate(p.deadline)}</td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        onClick={() => setEditingProject(p)}
                        className="p-1 text-slate-400 hover:text-[#C9A52A]"
                        title="Edit Project"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmSingleId(p.id)}
                        className="p-1 text-slate-400 hover:text-rose-500"
                        title="Delete Project"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* KANBAN BOARD VIEW DESKTOP */
          <div className="flex gap-4 overflow-x-auto pb-4">
            {STATUS_FILTERS.filter(s => s !== "All").map((status) => {
              const colProjects = filtered.filter(p => p.status?.toUpperCase() === status.toUpperCase() || (status === "Active" && p.status === "ACTIVE"));
              return (
                <div key={status} className="w-[300px] shrink-0 bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[16px] p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-[#E4E7EC] dark:border-[#272D36] pb-2">
                    <h3 className="text-[13.5px] font-bold text-[#17202A] dark:text-[#F2F4F7]">{status}</h3>
                    <span className="w-5 h-5 rounded-full bg-[#F8F9FB] dark:bg-[#111419] text-[#667085] text-[11px] font-bold flex items-center justify-center border border-[#E4E7EC] dark:border-[#272D36]">
                      {colProjects.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {colProjects.map((p) => (
                      <div key={p.id} className="p-3.5 rounded-[12px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] space-y-2">
                        <Link href={`${base}/projects/${p.id}`} className="text-[13px] font-bold text-[#17202A] dark:text-[#F2F4F7] hover:text-[#C9A52A] block truncate">
                          {p.name}
                        </Link>
                        <div className="text-[11px] text-[#667085] flex items-center justify-between">
                          <span>{p.progress || 0}% complete</span>
                          <span>{fmtDate(p.deadline)}</span>
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
