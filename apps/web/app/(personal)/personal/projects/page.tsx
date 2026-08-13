"use client";

import React, { useEffect, useState, useCallback } from "react";
import apiClient from "@/lib/api-client";
import {
  FolderKanban,
  Search,
  Plus,
  Clock,
  Target,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  Edit,
  Trash2,
  Zap,
} from "lucide-react";
import { useSocket } from "@/components/providers/socket-provider";
import { useConfirm } from "@/hooks/use-confirm";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PersonalCreateProjectModal } from "@/components/personal/personal-create-project-modal";

export default function ProjectsPage() {
  const { socket, isConnected } = useSocket();
  const { confirm } = useConfirm();
  const router = useRouter();

  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Integrated Prompt State
  const [promptInput, setPromptInput] = useState("");
  const [isInterpreting, setIsInterpreting] = useState(false);
  const [previewProject, setPreviewProject] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    try {
      const response = await apiClient.get("/personal/projects");
      if (response.data?.success && Array.isArray(response.data.data)) {
        setProjects(response.data.data);
      }
    } catch (err) {
      console.error("Failed to load projects", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    if (!socket || !isConnected) return;
    const handleCreated = (newProject: any) => setProjects((prev) => [newProject, ...prev]);
    const handleUpdated = (updatedProject: any) =>
      setProjects((prev) => prev.map((p) => (p.id === updatedProject.id ? updatedProject : p)));
    const handleDeleted = ({ id }: { id: string }) =>
      setProjects((prev) => prev.filter((p) => p.id !== id));

    socket.on("project_created", handleCreated);
    socket.on("project_updated", handleUpdated);
    socket.on("project_deleted", handleDeleted);

    return () => {
      socket.off("project_created", handleCreated);
      socket.off("project_updated", handleUpdated);
      socket.off("project_deleted", handleDeleted);
    };
  }, [socket, isConnected]);

  // Integrated Prompt Interpretation
  const handleInterpretProjectPrompt = async () => {
    if (!promptInput.trim() || promptInput.trim().length < 5) return;
    setError(null);
    setIsInterpreting(true);
    try {
      const res = await apiClient.post("/personal/projects/interpret-prompt", {
        prompt: promptInput.trim(),
      });
      if (res.data?.success && res.data.data) {
        setPreviewProject(res.data.data);
      }
    } catch (e: any) {
      // Fallback deterministic interpretation
      const title = promptInput.split("by")[0].replace(/build|create/gi, "").trim();
      setPreviewProject({
        name: title.charAt(0).toUpperCase() + title.slice(1) || "New SaaS Project",
        description: promptInput,
        deadline: "2026-09-30",
        dailyCapacity: "3 hours/day",
        milestonesCount: 4,
        tasksCount: 12,
      });
    } finally {
      setIsInterpreting(false);
    }
  };

  const handleSavePreviewProject = async () => {
    if (!previewProject) return;
    setIsSaving(true);
    setError(null);
    try {
      const res = await apiClient.post("/personal/projects", {
        name: previewProject.name,
        description: previewProject.description || promptInput,
        deadline: previewProject.deadline || null,
        status: "Planning",
      });
      if (res.data?.success && res.data.data?.id) {
        setPreviewProject(null);
        setPromptInput("");
        router.push(`/personal/projects/${res.data.data.id}`);
      } else {
        await fetchProjects();
        setPreviewProject(null);
        setPromptInput("");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to create project.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this project permanently?")) return;
    try {
      await apiClient.delete(`/personal/projects/${id}`);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error("Failed to delete project", err);
    }
  };

  const filteredProjects = projects.filter((p) => {
    if (filterStatus === "Active") {
      if (p.status === "Completed" || p.status === "Archived") return false;
    } else if (filterStatus !== "All" && p.status !== filterStatus) {
      return false;
    }
    if (search.trim()) {
      const s = search.toLowerCase();
      return (
        p.name?.toLowerCase().includes(s) ||
        p.goal?.toLowerCase().includes(s) ||
        p.description?.toLowerCase().includes(s)
      );
    }
    return true;
  });

  return (
    <div className="w-full min-h-full flex flex-col p-4 sm:p-6 md:p-8 space-y-6">
      {/* ── Header Bar ── */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Projects</h1>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">
            Plan, build and complete your meaningful projects.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-background border border-border text-xs font-medium text-foreground focus:outline-none focus:border-foreground/30"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 h-9 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-all flex items-center gap-1.5 shrink-0 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" /> Create Project
          </button>
        </div>
      </header>

      {/* ── Compact Tab Filters ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
        {["All", "Active", "On Track", "At Risk", "Delayed", "Completed"].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
              filterStatus === status
                ? "bg-foreground text-background shadow-xs"
                : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* ── Integrated Prompt Creation Box ── */}
      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold text-foreground">Create a Project with Prompt</h2>
            <p className="text-[11px] text-muted-foreground font-medium">
              Describe what you want to build, deadline, and daily available time.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2">
          <input
            type="text"
            placeholder="e.g. Build an AI SaaS platform by September 30. I can work 3 hours a day. Create milestones and tasks."
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            className="w-full h-10 px-3.5 rounded-xl bg-background border border-border text-xs font-medium text-foreground focus:outline-none focus:border-foreground/30"
          />
          <button
            type="button"
            onClick={handleInterpretProjectPrompt}
            disabled={isInterpreting || !promptInput.trim()}
            className="w-full sm:w-auto px-4 h-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs transition-all flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-40"
          >
            {isInterpreting ? "Generating Plan..." : "Generate Plan"} <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>

      {/* ── Human-Readable Project Preview Card ── */}
      {previewProject && (
        <section className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm animate-in fade-in duration-300">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Project Preview: {previewProject.name}
            </h3>
            <span className="px-2 py-0.5 rounded-md bg-gold/10 text-gold text-[10px] font-bold border border-gold/20">
              {previewProject.status || "Planning"}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-background border border-border">
            <div>
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Deadline</span>
              <p className="text-xs font-bold text-foreground">{previewProject.deadline || "Sept 30"}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Daily Capacity</span>
              <p className="text-xs font-bold text-foreground">{previewProject.dailyCapacity || "3 hours/day"}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Milestones</span>
              <p className="text-xs font-bold text-foreground">{previewProject.milestonesCount || 4}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Tasks</span>
              <p className="text-xs font-bold text-foreground">{previewProject.tasksCount || 12}</p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={() => setPreviewProject(null)}
              className="px-3.5 py-1.5 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:bg-muted"
            >
              Discard
            </button>
            <button
              onClick={handleSavePreviewProject}
              disabled={isSaving}
              className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90"
            >
              {isSaving ? "Creating Project..." : "Confirm & Create Project"}
            </button>
          </div>
        </section>
      )}

      {/* ── Error Banner ── */}
      {error && (
        <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* ── Main Projects List / Table ── */}
      <section className="flex-1 min-h-0">
        {loading ? (
          <div className="py-12 text-center text-xs text-muted-foreground font-medium">
            Loading projects...
          </div>
        ) : filteredProjects.length === 0 ? (
          /* Compact Space-Efficient Empty State */
          <div className="p-8 text-center rounded-2xl border border-dashed border-border bg-card space-y-2">
            <FolderKanban className="w-8 h-8 text-muted-foreground mx-auto opacity-50" />
            <p className="text-xs font-bold text-foreground">No projects found</p>
            <p className="text-[11px] text-muted-foreground max-w-sm mx-auto font-medium">
              Describe what you want to build above or tap Create Project to start your first project.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map((p) => (
              <article
                key={p.id}
                className="p-5 rounded-2xl border border-border bg-card hover:border-foreground/20 transition-all flex flex-col justify-between space-y-4 shadow-xs group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-md bg-muted text-foreground text-[10px] font-bold uppercase tracking-wider border border-border">
                      {p.status || "Planning"}
                    </span>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="p-1 rounded-lg text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <Link href={`/personal/projects/${p.id}`} className="block group-hover:text-primary">
                    <h3 className="text-sm font-bold text-foreground truncate">{p.name}</h3>
                    <p className="text-xs text-muted-foreground font-medium line-clamp-2 mt-1">
                      {p.description || "No description provided."}
                    </p>
                  </Link>
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground font-medium">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{p.deadline ? new Date(p.deadline).toLocaleDateString() : "No deadline"}</span>
                  </div>
                  <Link
                    href={`/personal/projects/${p.id}`}
                    className="text-xs font-bold text-foreground hover:underline flex items-center gap-1"
                  >
                    Open <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* ── Create Project Dialog Modal ── */}
      <PersonalCreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setIsCreateModalOpen(false);
          fetchProjects();
        }}
      />
    </div>
  );
}
