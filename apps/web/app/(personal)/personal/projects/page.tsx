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
  Sparkles,
  Loader2,
  RefreshCw,
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

  // Integrated Prompt & Planner State
  const [promptInput, setPromptInput] = useState("");
  const [isInterpreting, setIsInterpreting] = useState(false);
  const [previewProject, setPreviewProject] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get("/personal/projects");
      if (response.data?.success && Array.isArray(response.data.data)) {
        setProjects(response.data.data);
      } else {
        setProjects([]);
      }
    } catch (err: any) {
      setError("Unable to load projects. The project service is temporarily unavailable.");
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

  // Integrated Prompt Interpretation -> Project Planner Transition
  const handleGeneratePlan = async () => {
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
      // Fallback preview
      const title = promptInput.split("by")[0].replace(/build|create/gi, "").trim();
      setPreviewProject({
        name: title ? title.charAt(0).toUpperCase() + title.slice(1) : "New Workspace Project",
        description: promptInput,
        deadline: "Not specified",
        dailyCapacity: "3 hours/day",
        milestonesCount: 4,
        tasksCount: 12,
        milestones: [
          { name: "Foundation & Setup", description: "Architecture setup", tasksCount: 3 },
          { name: "Core Design", description: "Interface system", tasksCount: 3 },
          { name: "Development", description: "Implementation", tasksCount: 4 },
          { name: "Launch", description: "Deployment and verification", tasksCount: 2 },
        ],
      });
    } finally {
      setIsInterpreting(false);
    }
  };

  const handleConfirmCreateProject = async () => {
    if (!previewProject) return;
    setIsSaving(true);
    setError(null);
    try {
      const res = await apiClient.post("/personal/projects", {
        name: previewProject.name,
        description: previewProject.description || promptInput,
        deadline: previewProject.deadline !== "Not specified" ? previewProject.deadline : null,
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
      setError("Unable to create project. Please verify backend service.");
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
      setError("Unable to delete project.");
    }
  };

  const STATUS_TABS = ["All", "Active", "On Track", "At Risk", "Delayed", "Completed"];

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
    <div className="w-full min-h-full flex flex-col p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Projects</h1>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">
            Build and manage the work that matters.
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
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-background border border-border text-xs font-medium text-foreground focus:outline-none focus:border-foreground/30 transition-colors"
            />
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-3.5 h-9 rounded-lg bg-foreground text-background font-bold text-xs hover:opacity-90 transition-opacity flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        </div>
      </header>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-border text-xs font-bold">
        {STATUS_TABS.map((tab) => {
          const active = filterStatus === tab;
          return (
            <button
              key={tab}
              onClick={() => setFilterStatus(tab)}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                active
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchProjects}
            className="px-2.5 py-1 rounded bg-destructive/20 text-destructive font-bold text-[11px] hover:bg-destructive/30 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      )}

      {/* Prompt AI Generation Section */}
      {!previewProject ? (
        <div className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-3">
          <label className="block text-xs font-bold text-foreground">
            PROJECT GENERATOR
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Describe what you want to build... (e.g., Build my portfolio website by Sept 30)"
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGeneratePlan()}
              className="flex-1 h-10 px-3.5 rounded-lg bg-background border border-border text-xs font-medium text-foreground focus:outline-none focus:border-foreground/30 transition-colors"
            />
            <button
              onClick={handleGeneratePlan}
              disabled={isInterpreting || !promptInput.trim()}
              className="px-5 h-10 rounded-lg bg-foreground text-background font-bold text-xs hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-40 cursor-pointer"
            >
              {isInterpreting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                "Generate Plan"
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Dedicated Project Planner View */
        <div className="p-5 sm:p-6 rounded-xl border border-border bg-card shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                PROJECT PLANNER PREVIEW
              </span>
              <h2 className="text-base font-bold text-foreground mt-1">
                {previewProject.name}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPreviewProject(null)}
                className="px-3 h-8 rounded-lg border border-border text-xs font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCreateProject}
                disabled={isSaving}
                className="px-4 h-8 rounded-lg bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-opacity flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? "Creating..." : "Confirm & Create Project"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3 rounded-lg border border-border bg-background space-y-1">
              <span className="text-muted-foreground font-bold text-[10px]">DEADLINE</span>
              <p className="font-bold text-foreground">{previewProject.deadline || "Not specified"}</p>
            </div>
            <div className="p-3 rounded-lg border border-border bg-background space-y-1">
              <span className="text-muted-foreground font-bold text-[10px]">DAILY CAPACITY</span>
              <p className="font-bold text-foreground">{previewProject.dailyCapacity || "3 hours/day"}</p>
            </div>
            <div className="p-3 rounded-lg border border-border bg-background space-y-1">
              <span className="text-muted-foreground font-bold text-[10px]">SUGGESTED MILESTONES</span>
              <p className="font-bold text-foreground">{previewProject.milestonesCount || 4} Milestones</p>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
              GENERATED MILESTONES & TASKS
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {(previewProject.milestones || []).map((m: any, idx: number) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-lg border border-border bg-background space-y-1"
                >
                  <p className="font-bold text-foreground">
                    {idx + 1}. {m.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{m.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Projects List Grid */}
      {loading ? (
        <div className="py-12 text-center text-xs text-muted-foreground font-medium">
          Loading projects...
        </div>
      ) : filteredProjects.length === 0 ? (
        /* Compact 120-160px Empty State */
        <div className="h-40 rounded-xl border border-dashed border-border bg-muted/20 p-6 flex flex-col items-center justify-center text-center space-y-2">
          <p className="text-xs font-bold text-foreground">No projects found</p>
          <p className="text-[11px] text-muted-foreground">
            Create your first project to start planning and building your work.
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="mt-1 px-3.5 h-8 rounded-lg bg-foreground text-background font-bold text-xs hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            New Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="p-5 rounded-xl border border-border bg-card hover:border-foreground/30 transition-colors space-y-4 flex flex-col justify-between shadow-xs group"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-bold text-foreground group-hover:text-gold transition-colors line-clamp-1">
                    {project.name}
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-muted text-foreground uppercase border border-border shrink-0">
                    {project.status || "Planning"}
                  </span>
                </div>

                {project.description && (
                  <p className="text-xs text-muted-foreground font-medium line-clamp-2 leading-relaxed">
                    {project.description}
                  </p>
                )}
              </div>

              <div className="space-y-3 pt-2 border-t border-border/60">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-bold text-foreground">{project.progress || 0}%</span>
                </div>

                {/* Compact Progress Bar */}
                <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-foreground transition-all duration-300"
                    style={{ width: `${project.progress || 0}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-[11px] text-muted-foreground">
                    {project.deadline ? `Due ${new Date(project.deadline).toLocaleDateString()}` : "No deadline"}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDelete(project.id)}
                      className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                      title="Delete Project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <Link
                      href={`/personal/projects/${project.id}`}
                      className="px-2.5 py-1 rounded bg-muted text-foreground font-bold text-xs hover:bg-foreground hover:text-background transition-colors flex items-center gap-1"
                    >
                      Open <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      <PersonalCreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchProjects}
      />
    </div>
  );
}
