"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus, FolderKanban, Search, Loader2, AlertCircle,
  Trash2, RefreshCw, ChevronRight
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { useSocket } from "@/components/providers/socket-provider";
import Link from "next/link";
import { CreateProjectModal } from "@/components/projects/create-project-modal";

const STATUS_STYLE: Record<string, string> = {
  Active:    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  ACTIVE:    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  Planning:  "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  PLANNING:  "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  "On Hold": "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  Completed: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20",
  COMPLETED: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20",
  Archived:  "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20",
  Cancelled: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
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
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch real projects from backend API
  const fetchProjects = useCallback(async () => {
    setLoading(true);
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
        (p.description || "").toLowerCase().includes(search.toLowerCase());
      const matchStatus =
        statusFilter === "All" ||
        p.status === statusFilter ||
        (p.status && p.status.toUpperCase() === statusFilter.toUpperCase());
      return matchSearch && matchStatus;
    });
  }, [realProjects, search, statusFilter]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this project? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      const wsId = localStorage.getItem("workspaceId");
      await apiClient.delete(`/org/projects/${id}${wsId ? `?workspaceId=${wsId}` : ""}`);
      fetchProjects();
    } catch {
      alert("Failed to delete project");
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
    <div className="w-full h-full max-h-full flex flex-col justify-between overflow-hidden px-4 sm:px-6 md:px-10 py-4 sm:py-5 max-w-[1400px] mx-auto bg-[#F8F9FB] dark:bg-[#0B0E12] text-[#17202A] dark:text-[#F2F4F7] font-sans select-none space-y-4">
      
      {/* ── MOBILE HEADER (<= 767px) ────────────────────────────────────── */}
      <div className="md:hidden shrink-0 space-y-3">
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#E4E7EC] dark:border-[#272D36]">
          <h1 className="text-[22px] font-bold text-[#17202A] dark:text-[#F2F4F7] tracking-tight leading-none shrink-0">
            Projects
          </h1>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={fetchProjects}
              className="w-[44px] h-[44px] rounded-[11px] border border-[#E4E7EC] dark:border-[#272D36] bg-[#FFFFFF] dark:bg-[#15191F] text-[#667085] dark:text-[#8B95A5] flex items-center justify-center shrink-0 cursor-pointer active:scale-95 transition-transform"
              title="Refresh projects"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="h-[44px] px-4 rounded-[11px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[13px] font-semibold flex items-center justify-center shrink-0 cursor-pointer active:scale-95 transition-transform shadow-xs whitespace-nowrap"
            >
              <span>+  New Project</span>
            </button>
          </div>
        </div>

        <p className="text-[12.5px] text-[#667085] dark:text-[#8B95A5] leading-snug">
          Plan, execute, and track organization work from one place.
        </p>

        {/* Search Input */}
        <div className="relative w-full pt-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#667085] dark:text-[#8B95A5]" />
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 h-[42px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[10px] text-[13px] text-[#17202A] dark:text-[#F2F4F7] placeholder-[#667085] dark:placeholder-[#8B95A5] outline-none focus:border-[#C9A52A] dark:focus:border-[#D4B12F]"
          />
        </div>

        {/* Filter Pills Row */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-[11.5px] font-semibold rounded-[8px] transition-colors whitespace-nowrap cursor-pointer ${
                statusFilter === s
                  ? "bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10]"
                  : "bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] text-[#667085] dark:text-[#8B95A5]"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* ── DESKTOP HEADER (>= 768px) ──────────────────────────────────── */}
      <div className="hidden md:block shrink-0 space-y-4">
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#E4E7EC] dark:border-[#272D36]">
          <div className="space-y-0.5">
            <h1 className="text-[28px] font-bold text-[#17202A] dark:text-[#F2F4F7] tracking-tight leading-none">
              Projects
            </h1>
            <p className="text-[13.5px] text-[#667085] dark:text-[#8B95A5]">
              Plan, execute, and track organization work from one place.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={fetchProjects}
              className="p-2.5 rounded-[9px] border border-[#E4E7EC] dark:border-[#272D36] bg-[#FFFFFF] dark:bg-[#15191F] text-[#667085] dark:text-[#8B95A5] hover:bg-[#F3F4F6] dark:hover:bg-[#181D24] transition-colors cursor-pointer"
              title="Refresh projects"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-2 px-4 h-[40px] rounded-[9px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[13.5px] font-semibold hover:opacity-90 transition-opacity shadow-xs cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>+ New Project</span>
            </button>
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="p-3 rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[12px] font-medium flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={fetchProjects} className="font-semibold underline cursor-pointer">
              Retry
            </button>
          </div>
        )}

        {/* TOOLBAR: SEARCH & SEGMENTED FILTERS */}
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-3 text-[#667085] dark:text-[#8B95A5]" />
            <input
              type="text"
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 h-[40px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[9px] text-[13px] text-[#17202A] dark:text-[#F2F4F7] placeholder-[#667085] dark:placeholder-[#8B95A5] outline-none focus:border-[#C9A52A] dark:focus:border-[#D4B12F] transition-colors"
            />
          </div>

          <div className="flex items-center gap-1 bg-[#F8F9FB] dark:bg-[#111419] p-1 rounded-lg border border-[#E4E7EC] dark:border-[#272D36] overflow-x-auto">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-[11.5px] font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  statusFilter === s
                    ? "bg-[#FFFFFF] dark:bg-[#15191F] text-[#17202A] dark:text-[#F2F4F7] shadow-2xs border border-[#E4E7EC] dark:border-[#272D36]"
                    : "text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7]"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── PROJECT CONTENT REGION ─────────────────────────────────────── */}
      <div className="flex-1 min-h-0 w-full bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[12px] flex flex-col overflow-hidden shadow-xs shrink">
        {/* Desktop Table Header */}
        <div className="hidden md:grid grid-cols-[2.5fr_1fr_1fr_1fr_1.2fr_80px] items-center gap-4 px-5 py-3 border-b border-[#E4E7EC] dark:border-[#272D36] bg-[#F8F9FB] dark:bg-[#111419] shrink-0 sticky top-0 z-10">
          <span className="text-[10.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-[0.08em]">Project</span>
          <span className="text-[10.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-[0.08em]">Status</span>
          <span className="text-[10.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-[0.08em]">Owner</span>
          <span className="text-[10.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-[0.08em]">Due Date</span>
          <span className="text-[10.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-[0.08em]">Progress</span>
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
              <FolderKanban className="w-8 h-8 text-[#C9A52A] dark:text-[#D4B12F] mx-auto opacity-70" />
              <div className="space-y-1">
                <h3 className="text-[15px] font-bold text-[#17202A] dark:text-[#F2F4F7]">
                  {search || statusFilter !== "All" ? "No matching projects" : "No projects yet"}
                </h3>
                <p className="text-[12.5px] text-[#667085] dark:text-[#8B95A5] max-w-sm mx-auto leading-relaxed">
                  {search || statusFilter !== "All"
                    ? "Try adjusting your search criteria or status filter."
                    : "Create your first organization project to begin."}
                </p>
              </div>
              {!search && statusFilter === "All" && (
                <button
                  onClick={() => setIsCreateOpen(true)}
                  className="h-[44px] px-5 rounded-[11px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[13px] font-semibold hover:opacity-90 transition-opacity inline-flex items-center gap-1.5 cursor-pointer mt-1 active:scale-95"
                >
                  <span>+  New Project</span>
                </button>
              )}
            </div>
          ) : (
            filtered.map((project) => (
              <div
                key={project.id}
                className="hover:bg-[#F8F9FB]/60 dark:hover:bg-[#111419]/60 transition-colors"
              >
                {/* Desktop Row */}
                <div className="hidden md:grid grid-cols-[2.5fr_1fr_1fr_1fr_1.2fr_80px] items-center gap-4 px-5 py-3.5">
                  <div className="min-w-0">
                    <Link
                      href={`${base}/projects/${project.id}`}
                      className="text-[13.5px] font-semibold text-[#17202A] dark:text-[#F2F4F7] hover:text-[#C9A52A] dark:hover:text-[#D4B12F] transition-colors truncate block"
                    >
                      {project.name}
                    </Link>
                    {project.description && (
                      <p className="text-[12px] text-[#667085] dark:text-[#8B95A5] truncate mt-0.5">
                        {project.description}
                      </p>
                    )}
                  </div>

                  <div>
                    <span className={`px-2 py-0.5 rounded-full border text-[10.5px] font-semibold ${STATUS_STYLE[project.status] || STATUS_STYLE.Archived}`}>
                      {project.status}
                    </span>
                  </div>

                  <div className="text-[12.5px] font-medium text-[#17202A] dark:text-[#F2F4F7]">
                    {project.owner || "CEO"}
                  </div>

                  <div className="text-[12px] font-mono text-[#667085] dark:text-[#8B95A5]">
                    {fmtDate(project.deadline)}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11.5px] font-mono font-semibold">
                      <span className="text-[#17202A] dark:text-[#F2F4F7]">{project.progress || 0}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-[#E4E7EC] dark:bg-[#272D36] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#C9A52A] dark:bg-[#D4B12F] rounded-full transition-all duration-500"
                        style={{ width: `${project.progress || 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`${base}/projects/${project.id}`}
                      className="px-2.5 py-1 rounded-[7px] bg-[#C9A52A]/10 text-[#C9A52A] dark:text-[#D4B12F] border border-[#C9A52A]/20 text-[12px] font-semibold hover:bg-[#C9A52A]/20 flex items-center gap-1 transition-colors"
                    >
                      Open Project <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      onClick={(e) => handleDelete(project.id, e)}
                      disabled={deletingId === project.id}
                      className="p-1 rounded text-[#667085] hover:text-rose-600 transition-colors ml-1 cursor-pointer"
                      title="Delete project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Mobile Project Card */}
                <div className="md:hidden p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`${base}/projects/${project.id}`}
                      className="text-[14px] font-bold text-[#17202A] dark:text-[#F2F4F7] leading-snug line-clamp-1 hover:text-[#C9A52A]"
                    >
                      {project.name}
                    </Link>
                    <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase shrink-0 ${STATUS_STYLE[project.status] || STATUS_STYLE.Archived}`}>
                      {project.status || "Active"}
                    </span>
                  </div>

                  {project.description && (
                    <p className="text-[12px] text-[#667085] dark:text-[#8B95A5] line-clamp-2 leading-relaxed">
                      {project.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-[11.5px] text-[#667085] dark:text-[#8B95A5] pt-0.5">
                    <span>Owner: <strong className="text-[#17202A] dark:text-[#F2F4F7] font-semibold">{project.owner || "CEO"}</strong></span>
                    <span className="font-mono">Due: {fmtDate(project.deadline)}</span>
                  </div>

                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between text-[11px] font-mono font-semibold">
                      <span className="text-[#667085] dark:text-[#8B95A5]">Progress</span>
                      <span className="text-[#17202A] dark:text-[#F2F4F7] font-bold">{project.progress || 0}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-[#E4E7EC] dark:bg-[#272D36] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#C9A52A] dark:bg-[#D4B12F] rounded-full transition-all duration-500"
                        style={{ width: `${project.progress || 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-[#F0F2F5] dark:border-[#1D222A]">
                    <button
                      onClick={(e) => handleDelete(project.id, e)}
                      disabled={deletingId === project.id}
                      className="text-[11.5px] font-semibold text-rose-500 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                    <Link
                      href={`${base}/projects/${project.id}`}
                      className="px-3 py-1.5 rounded-[8px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[12px] font-semibold flex items-center gap-1 hover:opacity-90 transition-opacity"
                    >
                      Open Project <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={fetchProjects}
      />
    </div>
  );
}
