"use client";

import { useState, useEffect } from "react";
import { Plus, FolderKanban, Search, Filter, MoreHorizontal, Target, ChevronRight, Loader2, Sparkles, AlertCircle, CheckCircle2, Clock, Pencil, Trash2, Eye } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import apiClient from "@/lib/api-client";
import { useSocket } from "@/components/providers/socket-provider";
import { PremiumCard } from "@/components/ui/premium-card";
import Link from "next/link";
import PromptProjectModal from "@/components/projects/prompt-project-modal";

function statusColor(status: string) {
  const map: Record<string, string> = {
    "Active": "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    "Planning": "text-blue-500 bg-blue-500/10 border-blue-500/20",
    "On Hold": "text-amber-500 bg-amber-500/10 border-amber-500/20",
    "Completed": "text-slate-400 bg-slate-400/10 border-slate-400/20",
    "Archived": "text-muted-foreground bg-muted border-border",
    "Cancelled": "text-rose-500 bg-rose-500/10 border-rose-500/20",
  };
  return map[status] || "text-muted-foreground bg-muted border-border";
}

function priorityColor(p: string) {
  if (p === "Urgent") return "text-rose-500";
  if (p === "High") return "text-orange-500";
  if (p === "Medium") return "text-amber-500";
  return "text-muted-foreground";
}

function healthColor(h: string) {
  if (h === "Healthy") return "text-emerald-500";
  if (h === "At Risk") return "text-amber-500";
  if (h === "Off Track") return "text-rose-500";
  return "text-muted-foreground";
}

export default function CEOProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showPrompt, setShowPrompt] = useState(false);
  const { socket } = useSocket();

  const fetchProjects = async () => {
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      const url = `/org/projects${workspaceId ? `?workspaceId=${workspaceId}` : ""}`;
      const res = await apiClient.get(url);
      if (res.data.success) setProjects(res.data.data);
    } catch (e: any) {
      setError("Unable to load projects. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProjects(); }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on("project.created", fetchProjects);
    socket.on("project.updated", fetchProjects);
    socket.on("project.deleted", fetchProjects);
    return () => { socket.off("project.created"); socket.off("project.updated"); socket.off("project.deleted"); };
  }, [socket]);

  const filtered = projects.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || (p.description || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: projects.length,
    active: projects.filter(p => p.status === "Active").length,
    planning: projects.filter(p => p.status === "Planning").length,
    completed: projects.filter(p => p.status === "Completed").length,
    healthy: projects.filter(p => p.health === "Healthy").length,
    atRisk: projects.filter(p => p.health === "At Risk").length,
  };

  const handleDeleteProject = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this project?")) return;
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      const url = `/org/projects/${projectId}${workspaceId ? `?workspaceId=${workspaceId}` : ""}`;
      const res = await apiClient.delete(url);
      if (res.data.success) {
        fetchProjects();
      }
    } catch (err) {
      alert("Failed to delete project");
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1440px] mx-auto w-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage and track all organization projects</p>
        </div>
        <button
          onClick={() => setShowPrompt(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-lg shadow-sm hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <PremiumCard className="p-3">
          <p className="text-xs text-muted-foreground">Total Projects</p>
          <p className="text-xl font-bold text-foreground mt-1">{stats.total}</p>
        </PremiumCard>
        <PremiumCard className="p-3">
          <p className="text-xs text-muted-foreground">Active</p>
          <p className="text-xl font-bold text-emerald-500 mt-1">{stats.active}</p>
        </PremiumCard>
        <PremiumCard className="p-3">
          <p className="text-xs text-muted-foreground">Planning</p>
          <p className="text-xl font-bold text-blue-500 mt-1">{stats.planning}</p>
        </PremiumCard>
        <PremiumCard className="p-3">
          <p className="text-xs text-muted-foreground">Completed</p>
          <p className="text-xl font-bold text-slate-400 mt-1">{stats.completed}</p>
        </PremiumCard>
        <PremiumCard className="p-3">
          <p className="text-xs text-muted-foreground">Healthy</p>
          <p className="text-xl font-bold text-emerald-500 mt-1">{stats.healthy}</p>
        </PremiumCard>
        <PremiumCard className="p-3">
          <p className="text-xs text-muted-foreground">At Risk</p>
          <p className="text-xl font-bold text-amber-500 mt-1">{stats.atRisk}</p>
        </PremiumCard>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto">
          {["All", "Active", "Planning", "Completed"].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                statusFilter === status
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Projects List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <FolderKanban className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
          <h3 className="text-sm font-semibold text-foreground">No projects found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            {search || statusFilter !== "All" ? "Try adjusting your search or filters." : "Get started by creating your first organization project."}
          </p>
          {!search && statusFilter === "All" && (
            <button
              onClick={() => setShowPrompt(true)}
              className="mt-4 px-3.5 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Project
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filtered.map((project, idx) => (
              <motion.div key={project.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}>
                <PremiumCard className="hover:border-border/80 transition-colors group">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/10 flex items-center justify-center shrink-0">
                      <Target className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <Link href={`/ceo/projects/${project.id}`} className="font-semibold text-foreground text-sm hover:text-primary transition-colors">
                            {project.name}
                          </Link>
                          {project.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{project.description}</p>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusColor(project.status)}`}>{project.status}</span>
                          <span className={`text-[10px] font-semibold ${priorityColor(project.priority)}`}>{project.priority}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mt-3 flex-wrap">
                        <div className="flex items-center gap-2 flex-1 min-w-[140px]">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary transition-all duration-700"
                              style={{ width: `${project.progress || 0}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-foreground shrink-0">{project.progress || 0}%</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {project.completedTasks || 0}/{project.totalTasks || 0} tasks
                          </span>
                          {project.deadline && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              Due {new Date(project.deadline).toLocaleDateString()}
                            </span>
                          )}
                          <span className={`flex items-center gap-1 font-medium ${healthColor(project.health)}`}>
                            {project.health}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/ceo/projects/${project.id}`} className="p-2 rounded-lg hover:bg-accent transition-colors">
                        <Eye className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                      </Link>
                      <button
                        onClick={(e) => handleDeleteProject(project.id, e)}
                        className="p-2 rounded-lg hover:bg-rose-500/10 transition-colors text-muted-foreground hover:text-rose-500"
                        title="Delete Project"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </PremiumCard>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <PromptProjectModal
        isOpen={showPrompt}
        onClose={() => setShowPrompt(false)}
        onSuccess={fetchProjects}
        workspaceType="ORGANIZATION"
      />
    </div>
  );
}
