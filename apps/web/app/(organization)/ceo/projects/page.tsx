"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Plus, FolderKanban, Search, Loader2, AlertCircle,
  Trash2, RefreshCw, ChevronRight, LayoutGrid, List,
  Archive, CheckSquare, Square, Edit, MoreVertical, Shield, Check, X
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { useSocket } from "@/components/providers/socket-provider";
import { useRegisterRefresh } from "@/components/providers/global-refresh-provider";
import Link from "next/link";
import { CreateProjectModal } from "@/components/organization/create-project-modal";
import { EditProjectModal } from "@/components/organization/edit-project-modal";

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

const PRIORITY_STYLE: Record<string, string> = {
  LOW: "text-gray-600 dark:text-gray-400 bg-gray-500/10 border-gray-500/20",
  Low: "text-gray-600 dark:text-gray-400 bg-gray-500/10 border-gray-500/20",
  MEDIUM: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20",
  Medium: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20",
  HIGH: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
  High: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
  CRITICAL: "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20",
  Critical: "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20",
};

const STATUS_FILTERS = ["All", "Active", "Planning", "On Hold", "Completed"];

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

  // Selection & Bulk Action States
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Fetch real projects from backend API
  const fetchProjects = useCallback(async () => {
    try {
      const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : null;
      const res = await apiClient.get(`/org/projects${wsId ? `?workspaceId=${wsId}` : ""}`);
      if (res.data?.success) {
        setRealProjects(res.data.data || []);
        setError("");
      } else {
        setError(res.data?.error || "Failed to load projects");
      }
    } catch (e: any) {
      setError(e.response?.data?.error || "Unable to load projects.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useRegisterRefresh(fetchProjects);

  useEffect(() => {
    if (!socket) return;
    socket.on("project.created", fetchProjects);
    socket.on("project.updated", fetchProjects);
    socket.on("project.deleted", fetchProjects);
    return () => {
      socket.off("project.created", fetchProjects);
      socket.off("project.updated", fetchProjects);
      socket.off("project.deleted", fetchProjects);
    };
  }, [socket, fetchProjects]);

  const filtered = useMemo(() => {
    return realProjects.filter((p) => {
      const matchSearch =
        (p.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (p.objective || p.description || "").toLowerCase().includes(search.toLowerCase());
      const matchStatus =
        statusFilter === "All" ||
        p.status === statusFilter ||
        (p.status && p.status.toUpperCase() === statusFilter.toUpperCase()) ||
        (statusFilter === "On Hold" && (p.status === "ON_HOLD" || p.status === "On Hold"));
      return matchSearch && matchStatus;
    });
  }, [realProjects, search, statusFilter]);

  // Checkbox indeterminate state
  useEffect(() => {
    if (headerCheckboxRef.current) {
      const isAll = filtered.length > 0 && selectedIds.length === filtered.length;
      const isSome = selectedIds.length > 0 && selectedIds.length < filtered.length;
      headerCheckboxRef.current.checked = isAll;
      headerCheckboxRef.current.indeterminate = isSome;
    }
  }, [selectedIds, filtered]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filtered.map((p) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelectRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkAction = async (action: "ARCHIVE" | "CHANGE_STATUS" | "CHANGE_PRIORITY" | "DELETE", extraVal?: string) => {
    if (selectedIds.length === 0) return;
    if (action === "DELETE" && !confirm(`Permanently delete ${selectedIds.length} projects? This action cannot be undone.`)) {
      return;
    }

    setBulkProcessing(true);
    try {
      const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : undefined;
      await apiClient.post(`/org/projects/bulk-action${wsId ? `?workspaceId=${wsId}` : ""}`, {
        action,
        projectIds: selectedIds,
        status: action === "CHANGE_STATUS" ? extraVal : undefined,
        priority: action === "CHANGE_PRIORITY" ? extraVal : undefined,
      });

      setSelectedIds([]);
      fetchProjects();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Bulk action failed");
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this project? This action is permanent and cannot be undone.")) return;
    setDeletingId(id);
    try {
      const wsId = localStorage.getItem("workspaceId");
      await apiClient.delete(`/org/projects/${id}${wsId ? `?workspaceId=${wsId}` : ""}`);
      setRealProjects((prev) => prev.filter((p) => p.id !== id));
      setSelectedIds((prev) => prev.filter((i) => i !== id));
      fetchProjects();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to delete project");
    } finally {
      setDeletingId(null);
    }
  };

  const base = typeof window !== "undefined"
    ? window.location.pathname.startsWith("/co-ceo") ? "/co-ceo"
    : window.location.pathname.startsWith("/member") ? "/member"
    : "/ceo"
    : "/ceo";

  return (
    <div className="w-full min-h-full flex flex-col justify-between p-3.5 sm:p-5 md:px-10 md:py-5 max-w-[1400px] mx-auto bg-[#F8F9FB] dark:bg-[#0B0E12] text-[#17202A] dark:text-[#F2F4F7] font-sans select-none space-y-4">
      
      {/* Mobile Header Row */}
      <div className="md:hidden space-y-4">
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-[26px] font-extrabold text-[#17202A] dark:text-[#F2F4F7] tracking-tight leading-none">
              Projects
            </h1>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="w-[36px] h-[36px] rounded-[10px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] font-bold flex items-center justify-center shrink-0 cursor-pointer active:scale-95 shadow-xs transition-transform"
              title="Create project"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
          <p className="text-[13px] text-[#667085] dark:text-[#8B95A5]">
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
          <Search className="w-4.5 h-4.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#667085] dark:text-[#8B95A5]" />
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3.5 h-[46px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[12px] text-[14px] text-[#17202A] dark:text-[#F2F4F7] placeholder-[#667085] dark:placeholder-[#8B95A5] outline-none focus:border-[#C9A52A] dark:focus:border-[#D4B12F] shadow-xs"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden -mx-1 px-1">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`h-[36px] px-3.5 text-[12.5px] font-semibold rounded-[10px] transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                statusFilter === s
                  ? "bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] font-bold shadow-xs"
                  : "bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] text-[#667085] dark:text-[#8B95A5]"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Mobile Project Cards List */}
        <div className="space-y-3">
          {loading ? (
            <div className="p-8 flex items-center justify-center bg-[#FFFFFF] dark:bg-[#15191F] rounded-xl border border-[#E4E7EC] dark:border-[#272D36]">
              <Loader2 className="w-6 h-6 animate-spin text-[#C9A52A] dark:text-[#D4B12F]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center bg-[#FFFFFF] dark:bg-[#15191F] rounded-xl border border-[#E4E7EC] dark:border-[#272D36] space-y-2">
              <FolderKanban className="w-7 h-7 text-[#C9A52A] dark:text-[#D4B12F] mx-auto opacity-70" />
              <h3 className="text-[14px] font-bold text-[#17202A] dark:text-[#F2F4F7]">No projects found</h3>
              <p className="text-[12px] text-[#667085] dark:text-[#8B95A5]">Create a project to begin tracking execution.</p>
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
                      className="text-[15px] font-bold text-[#17202A] dark:text-[#F2F4F7] hover:text-[#C9A52A] transition-colors block truncate"
                    >
                      {project.name}
                    </Link>
                    {(project.objective || project.description) && (
                      <p className="text-[12px] text-[#667085] dark:text-[#8B95A5] line-clamp-2 leading-relaxed">
                        {project.objective || project.description}
                      </p>
                    )}
                  </div>

                  <span className={`px-2 py-0.5 rounded-full border text-[10.5px] font-semibold shrink-0 ${STATUS_STYLE[project.status] || STATUS_STYLE.Archived}`}>
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

      {/* Desktop Header */}
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

          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] p-1 rounded-[10px]">
            <button
              onClick={() => setViewMode("table")}
              className={`h-[30px] px-2.5 text-[12px] font-semibold rounded-[7px] flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "table"
                  ? "bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] font-bold shadow-xs"
                  : "text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7]"
              }`}
            >
              <List className="w-3.5 h-3.5" /> Table
            </button>
            <button
              onClick={() => setViewMode("board")}
              className={`h-[30px] px-2.5 text-[12px] font-semibold rounded-[7px] flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "board"
                  ? "bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] font-bold shadow-xs"
                  : "text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7]"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Board
            </button>
          </div>
        </div>

        {/* Floating Bulk Action Bar */}
        {selectedIds.length > 0 && (
          <div className="p-3 rounded-[12px] bg-[#C9A52A]/10 border border-[#C9A52A]/30 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <span className="text-[13px] font-bold text-[#17202A] dark:text-[#F2F4F7]">
                {selectedIds.length} project{selectedIds.length > 1 ? "s" : ""} selected
              </span>
              <button
                onClick={() => setSelectedIds([])}
                className="text-[12px] font-semibold text-[#667085] dark:text-[#8B95A5] hover:underline"
              >
                Clear Selection
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleBulkAction("ARCHIVE")}
                disabled={bulkProcessing}
                className="px-3 py-1.5 rounded-[8px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] text-[12px] font-semibold hover:border-[#C9A52A] transition-colors flex items-center gap-1.5"
              >
                <Archive className="w-3.5 h-3.5" /> Archive Selected
              </button>

              <button
                onClick={() => handleBulkAction("CHANGE_STATUS", "COMPLETED")}
                disabled={bulkProcessing}
                className="px-3 py-1.5 rounded-[8px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] text-[12px] font-semibold hover:border-[#C9A52A] transition-colors flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" /> Mark Completed
              </button>

              <button
                onClick={() => handleBulkAction("DELETE")}
                disabled={bulkProcessing}
                className="px-3 py-1.5 rounded-[8px] bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[12px] font-semibold hover:bg-rose-500/20 transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Selected
              </button>
            </div>
          </div>
        )}

        {/* Desktop Main Content Area */}
        {viewMode === "table" ? (
          <div className="flex-1 min-h-0 w-full bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[12px] flex flex-col overflow-hidden shadow-xs shrink">
            {/* Desktop Table Header */}
            <div className="grid grid-cols-[40px_2fr_1fr_1fr_1fr_1.2fr_160px] items-center gap-4 px-5 py-3 border-b border-[#E4E7EC] dark:border-[#272D36] bg-[#F8F9FB] dark:bg-[#111419] shrink-0 sticky top-0 z-10">
              <input
                type="checkbox"
                ref={headerCheckboxRef}
                onChange={handleSelectAll}
                className="w-4 h-4 rounded border-[#D0D5DD] dark:border-[#344054] accent-[#C9A52A] cursor-pointer"
              />
              <span className="text-[10.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-[0.08em]">Project</span>
              <span className="text-[10.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-[0.08em]">Status</span>
              <span className="text-[10.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-[0.08em]">Owner</span>
              <span className="text-[10.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-[0.08em]">Target</span>
              <span className="text-[10.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-[0.08em]">Progress</span>
              <span className="text-[10.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-[0.08em] text-right">Action</span>
            </div>

            {/* Desktop Table Body */}
            <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-[#E4E7EC] dark:divide-[#272D36] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {loading ? (
                <div className="p-8 flex items-center justify-center h-full min-h-[200px]">
                  <Loader2 className="w-7 h-7 animate-spin text-[#C9A52A] dark:text-[#D4B12F]" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-6 sm:p-8 text-center h-full flex flex-col items-center justify-center my-auto min-h-[260px] space-y-3 font-sans">
                  <FolderKanban className="w-9 h-9 text-[#C9A52A] dark:text-[#D4B12F] mx-auto opacity-70" />
                  <div className="space-y-1">
                    <h3 className="text-[16px] font-bold text-[#17202A] dark:text-[#F2F4F7]">
                      {search || statusFilter !== "All" ? "No matching projects" : "No projects yet"}
                    </h3>
                    <p className="text-[13px] text-[#667085] dark:text-[#8B95A5] max-w-sm mx-auto leading-relaxed">
                      {search || statusFilter !== "All"
                        ? "Try adjusting your search criteria or status filter."
                        : "Create a project to begin planning and tracking organization execution."}
                    </p>
                  </div>
                  {!search && statusFilter === "All" && (
                    <button
                      onClick={() => setIsCreateOpen(true)}
                      className="h-[44px] px-5 rounded-[11px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[13px] font-bold hover:opacity-90 transition-opacity inline-flex items-center gap-1.5 cursor-pointer mt-1 active:scale-95"
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                      <span>New Project</span>
                    </button>
                  )}
                </div>
              ) : (
                filtered.map((project) => (
                  <div
                    key={project.id}
                    className={`hover:bg-[#F8F9FB]/60 dark:hover:bg-[#111419]/60 transition-colors ${
                      selectedIds.includes(project.id) ? "bg-[#C9A52A]/5 dark:bg-[#C9A52A]/10" : ""
                    }`}
                  >
                    <div className="grid grid-cols-[40px_2fr_1fr_1fr_1fr_1.2fr_160px] items-center gap-4 px-5 py-3.5">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(project.id)}
                        onChange={(e) => handleToggleSelectRow(project.id, e as any)}
                        className="w-4 h-4 rounded border-[#D0D5DD] dark:border-[#344054] accent-[#C9A52A] cursor-pointer"
                      />

                      <div className="min-w-0">
                        <Link
                          href={`${base}/projects/${project.id}`}
                          className="text-[14px] font-bold text-[#17202A] dark:text-[#F2F4F7] hover:text-[#C9A52A] dark:hover:text-[#D4B12F] transition-colors truncate block"
                        >
                          {project.name}
                        </Link>
                        {(project.objective || project.description) && (
                          <p className="text-[12px] text-[#667085] dark:text-[#8B95A5] truncate mt-0.5">
                            {project.objective || project.description}
                          </p>
                        )}
                      </div>

                      <div>
                        <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-semibold ${STATUS_STYLE[project.status] || STATUS_STYLE.Archived}`}>
                          {project.status}
                        </span>
                      </div>

                      <div className="text-[12.5px] font-medium text-[#17202A] dark:text-[#F2F4F7] truncate">
                        {project.ownerName || project.owner || "CEO"}
                      </div>

                      <div className="text-[12px] font-mono text-[#667085] dark:text-[#8B95A5]">
                        {fmtDate(project.deadline)}
                      </div>

                      <div className="space-y-1 pr-2">
                        <div className="flex items-center justify-between text-[11.5px] font-mono font-semibold">
                          <span className="text-[#17202A] dark:text-[#F2F4F7]">{project.progress || 0}%</span>
                          <span className="text-[#667085] dark:text-[#8B95A5]">{project.completedTasks || 0}/{project.totalTasks || 0} tasks</span>
                        </div>
                        <div className="h-1.5 w-full bg-[#E4E7EC] dark:bg-[#272D36] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#C9A52A] dark:bg-[#D4B12F] rounded-full transition-all duration-500"
                            style={{ width: `${project.progress || 0}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-1.5 shrink-0">
                        <button
                          onClick={() => setEditingProject(project)}
                          className="p-1.5 rounded-md text-[#667085] hover:text-[#C9A52A] hover:bg-[#C9A52A]/10 transition-colors"
                          title="Edit project"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        <Link
                          href={`${base}/projects/${project.id}`}
                          className="px-2.5 py-1 rounded-[7px] bg-[#C9A52A]/10 text-[#C9A52A] dark:text-[#D4B12F] border border-[#C9A52A]/20 text-[12px] font-semibold hover:bg-[#C9A52A]/20 flex items-center gap-1 transition-colors shrink-0"
                        >
                          <span>Open Project</span> <ChevronRight className="w-3.5 h-3.5" />
                        </Link>

                        <button
                          onClick={(e) => handleDelete(project.id, e)}
                          disabled={deletingId === project.id}
                          className="p-1.5 rounded-md text-[#667085] hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
                          title="Delete project"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          /* Kanban Board View */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-1 min-h-[400px]">
            {["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED"].map((colStatus) => {
              const colProjects = filtered.filter(
                (p) =>
                  p.status === colStatus ||
                  (colStatus === "ON_HOLD" && (p.status === "On Hold" || p.status === "ON_HOLD")) ||
                  (colStatus === "COMPLETED" && (p.status === "Completed" || p.status === "COMPLETED"))
              );
              return (
                <div
                  key={colStatus}
                  className="bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[14px] p-4 flex flex-col space-y-3"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[#E4E7EC] dark:border-[#272D36]">
                    <h3 className="text-[13px] font-bold text-[#17202A] dark:text-[#F2F4F7] uppercase tracking-[0.08em]">
                      {colStatus.replace("_", " ")}
                    </h3>
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36]">
                      {colProjects.length}
                    </span>
                  </div>

                  <div className="flex-1 space-y-3 overflow-y-auto">
                    {colProjects.map((proj) => (
                      <div
                        key={proj.id}
                        className="p-3.5 rounded-[12px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] space-y-2.5 hover:border-[#C9A52A] transition-all"
                      >
                        <Link
                          href={`${base}/projects/${proj.id}`}
                          className="text-[13.5px] font-bold text-[#17202A] dark:text-[#F2F4F7] hover:text-[#C9A52A] transition-colors block truncate"
                        >
                          {proj.name}
                        </Link>
                        {(proj.objective || proj.description) && (
                          <p className="text-[11.5px] text-[#667085] dark:text-[#8B95A5] line-clamp-2 leading-relaxed">
                            {proj.objective || proj.description}
                          </p>
                        )}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="text-[#667085] dark:text-[#8B95A5]">Progress</span>
                            <span className="font-bold text-[#17202A] dark:text-[#F2F4F7]">{proj.progress || 0}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-[#E4E7EC] dark:bg-[#272D36] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#C9A52A] dark:bg-[#D4B12F] rounded-full transition-all duration-500"
                              style={{ width: `${proj.progress || 0}%` }}
                            />
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

      {/* Modals */}
      <CreateProjectModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={fetchProjects}
      />

      <EditProjectModal
        isOpen={!!editingProject}
        project={editingProject}
        onClose={() => setEditingProject(null)}
        onSuccess={fetchProjects}
      />
    </div>
  );
}
