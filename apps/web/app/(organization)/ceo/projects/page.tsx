"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus, FolderKanban, Search, Loader2, AlertCircle,
  CheckCircle2, Clock, Eye, Trash2, RefreshCw, BarChart2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import apiClient from "@/lib/api-client";
import { useSocket } from "@/components/providers/socket-provider";
import Link from "next/link";
import { CreateProjectModal } from "@/components/projects/create-project-modal";

const STATUS_STYLE: Record<string, string> = {
  Active:    "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  Planning:  "bg-blue-500/10 text-blue-600 border-blue-500/20",
  PLANNING:  "bg-blue-500/10 text-blue-600 border-blue-500/20",
  "On Hold": "bg-amber-500/10 text-amber-600 border-amber-500/20",
  Completed: "bg-muted text-muted-foreground border-border",
  Archived:  "bg-muted text-muted-foreground border-border",
  Cancelled: "bg-destructive/10 text-destructive border-destructive/20",
};

const PRIORITY_STYLE: Record<string, string> = {
  Urgent: "text-rose-500",
  High:   "text-orange-500",
  Medium: "text-amber-500",
  Low:    "text-muted-foreground",
};

function progressColor(p: number) {
  if (p >= 75) return "bg-emerald-500";
  if (p >= 40) return "bg-gold";
  return "bg-blue-500";
}

const STATUS_FILTERS = ["All", "Active", "Planning", "On Hold", "Completed"];

export default function ProjectsPage() {
  const { socket } = useSocket();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    try {
      const wsId = localStorage.getItem("workspaceId");
      const res = await apiClient.get(`/org/projects${wsId ? `?workspaceId=${wsId}` : ""}`);
      if (res.data.success) setProjects(res.data.data || []);
      else setError(res.data.error || "Failed to load projects");
    } catch (e: any) {
      setError(e.response?.data?.error || "Unable to load projects.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

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

  const filtered = projects.filter(p => {
    const matchSearch = (p.name || "").toLowerCase().includes(search.toLowerCase())
      || (p.description || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All"
      || p.status === statusFilter
      || p.status?.toUpperCase() === statusFilter.toUpperCase();
    return matchSearch && matchStatus;
  });

  const stats = {
    total:       projects.length,
    active:      projects.filter(p => p.status === "Active").length,
    planning:    projects.filter(p => ["Planning", "PLANNING"].includes(p.status)).length,
    completed:   projects.filter(p => p.status === "Completed").length,
    avgProgress: projects.length
      ? Math.round(projects.reduce((a, p) => a + (p.progress || 0), 0) / projects.length)
      : 0,
  };

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

  // Determine base href from current URL path
  const base = typeof window !== "undefined"
    ? window.location.pathname.startsWith("/co-ceo") ? "/co-ceo"
    : window.location.pathname.startsWith("/member") ? "/member"
    : "/ceo"
    : "/ceo";

  return (
    <div className="px-5 md:px-8 xl:px-10 pt-7 pb-16 max-w-[1440px] mx-auto w-full space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
            ManMadhan · Organization
          </p>
          <h1 className="text-[28px] sm:text-[30px] font-bold text-foreground tracking-tight leading-none">
            Projects
          </h1>
          <p className="text-[12px] text-muted-foreground mt-2">
            Plan, execute, and track all organization projects.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchProjects}
            className="p-2 rounded-xl border border-border bg-card hover:bg-muted transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gold hover:bg-gold/90 text-[#111827] text-[12px] font-bold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> New Project
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-card border border-border rounded-xl text-[12px] text-muted-foreground">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
        </div>
      )}

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: "Total",       value: stats.total,       color: "text-foreground" },
          { label: "Active",      value: stats.active,      color: "text-emerald-600" },
          { label: "Planning",    value: stats.planning,    color: "text-blue-500" },
          { label: "Completed",   value: stats.completed,   color: "text-muted-foreground" },
          { label: "Avg Progress",value: `${stats.avgProgress}%`, color: "text-foreground" },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-2xl px-4 py-4">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{s.label}</p>
            <p className={`text-[26px] font-bold font-mono leading-none mt-1.5 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2.5 bg-card border border-border rounded-xl text-[12px] text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-gold transition-all"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {STATUS_FILTERS.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-xl text-[11px] font-semibold transition-all shrink-0 ${
                statusFilter === s
                  ? "bg-foreground text-background"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* ── Projects List ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 animate-spin text-gold" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center border border-dashed border-border rounded-2xl">
          <FolderKanban className="w-8 h-8 text-muted-foreground/20" />
          <p className="text-[14px] font-semibold text-foreground">
            {search || statusFilter !== "All" ? "No projects match your filters" : "No projects yet"}
          </p>
          <p className="text-[12px] text-muted-foreground max-w-xs">
            {search || statusFilter !== "All"
              ? "Try adjusting your search or clearing filters."
              : "Create your first organization project to get started."}
          </p>
          {!search && statusFilter === "All" && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gold hover:bg-gold/90 text-[#111827] text-[11px] font-bold transition-colors"
            >
              <Plus className="w-3 h-3" /> Create Project
            </button>
          )}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {/* Table Header */}
          <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_120px_100px_80px] items-center gap-4 px-5 py-3 border-b border-border bg-muted/30">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Project</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Status</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Progress</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Tasks</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Deadline</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-right">Actions</span>
          </div>

          <AnimatePresence>
            <div className="divide-y divide-border">
              {filtered.map((project, idx) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.03 }}
                  className="group"
                >
                  {/* Desktop Row */}
                  <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_120px_100px_80px] items-center gap-4 px-5 py-4 hover:bg-muted/20 transition-colors">
                    <div className="min-w-0">
                      <Link
                        href={`${base}/projects/${project.id}`}
                        className="text-[13px] font-semibold text-foreground hover:text-gold transition-colors truncate block"
                      >
                        {project.name}
                      </Link>
                      {project.description && (
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">{project.description}</p>
                      )}
                    </div>
                    <div>
                      <span className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold ${STATUS_STYLE[project.status] || STATUS_STYLE.Archived}`}>
                        {project.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${progressColor(project.progress || 0)}`}
                          style={{ width: `${project.progress || 0}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-foreground shrink-0 w-8 text-right">
                        {project.progress || 0}%
                      </span>
                    </div>
                    <div className="text-[12px] text-muted-foreground">
                      <span className="font-semibold text-foreground">{project.completedTasks || 0}</span>
                      <span>/{project.totalTasks || 0}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {project.deadline
                        ? new Date(project.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                        : <span className="text-muted-foreground/40">—</span>}
                    </div>
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link
                        href={`${base}/projects/${project.id}`}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                      </Link>
                      <button
                        onClick={(e) => handleDelete(project.id, e)}
                        disabled={deletingId === project.id}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  </div>

                  {/* Mobile Card */}
                  <Link href={`${base}/projects/${project.id}`} className="md:hidden block p-4 hover:bg-muted/20 transition-colors">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <p className="text-[13px] font-semibold text-foreground">{project.name}</p>
                      <span className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold shrink-0 ${STATUS_STYLE[project.status] || STATUS_STYLE.Archived}`}>
                        {project.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${progressColor(project.progress || 0)}`}
                          style={{ width: `${project.progress || 0}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-foreground shrink-0">{project.progress || 0}%</span>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                      <span><span className="font-semibold text-foreground">{project.completedTasks || 0}</span>/{project.totalTasks || 0} tasks</span>
                      {project.deadline && (
                        <span>Due {new Date(project.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                      )}
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        </div>
      )}

      <CreateProjectModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={fetchProjects}
      />
    </div>
  );
}
