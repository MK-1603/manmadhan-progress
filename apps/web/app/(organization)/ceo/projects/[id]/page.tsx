"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Calendar as CalendarIcon, CheckCircle2, Clock, FileText,
  FolderKanban, GitBranch, MoreHorizontal, Shield, Sparkles, UserCheck,
  AlertTriangle, Trash2, Archive, Edit3, Eye, Copy, X, CheckSquare, Layers
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { ProjectMilestonesView } from "@/components/organization/project-milestones-view";
import { MilestoneWorkspace } from "@/components/organization/milestone-workspace";
import { GitHubOAuthPanel } from "@/components/integrations/github-oauth-panel";

export default function ProjectWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<any>(null);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "MILESTONES" | "TASKS" | "DOCUMENTS" | "GITHUB" | "CALENDAR" | "TIMELINE">("OVERVIEW");
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [actionsOpen, setActionsOpen] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<any>(null);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchProjectDetails = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get(`/org/projects/${projectId}`);
      if (res.data?.success && res.data.data) {
        const p = res.data.data;
        setProject(p);
        setMilestones(p.milestones || []);
        setDocuments(p.documents || []);
        setTasks(p.tasks || []);
        setActivity(p.activity || []);

        setEditName(p.name || "");
        setEditDescription(p.description || "");
        setEditDeadline(p.deadline ? new Date(p.deadline).toISOString().split("T")[0] : "");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to load project details.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) fetchProjectDetails();
  }, [projectId]);

  const handleUpdateProject = async () => {
    setIsUpdating(true);
    try {
      const res = await apiClient.patch(`/org/projects/${projectId}`, {
        name: editName.trim(),
        description: editDescription.trim(),
        deadline: editDeadline || null,
      });

      if (res.data?.success) {
        setShowEditModal(false);
        await fetchProjectDetails();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to update project.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleArchiveProject = async () => {
    if (!confirm("Are you sure you want to archive this project?")) return;
    try {
      await apiClient.post(`/org/projects/${projectId}/archive`);
      router.push("/ceo/projects");
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to archive project.");
    }
  };

  const handleDeleteProject = async () => {
    if (deleteConfirmText !== "DELETE") {
      alert('Please type "DELETE" to confirm deletion.');
      return;
    }
    try {
      await apiClient.delete(`/org/projects/${projectId}`);
      router.push("/ceo/projects");
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to delete project.");
    }
  };

  if (isLoading) {
    return <div className="p-12 text-center text-xs text-muted-foreground">Loading Project Workspace...</div>;
  }

  if (error || !project) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center space-y-4">
        <div className="p-4 rounded-xl bg-rose-500/10 text-rose-500 text-xs">{error || "Project not found."}</div>
        <Link href="/ceo/projects" className="text-xs text-gold underline">← Return to Projects</Link>
      </div>
    );
  }

  const approvedMilestonesCount = (milestones || []).filter(m => (m.state || m.status) === "APPROVED").length;
  const totalMilestonesCount = (milestones || []).length || 7;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Breadcrumb & Header */}
      <div className="space-y-4">
        <Link href="/ceo/projects" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Projects
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground tracking-tight">{project.name}</h1>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-gold/10 text-gold border border-gold/20 uppercase tracking-wider">
                {project.status || "PLANNING"}
              </span>
            </div>
            <p className="text-xs text-[#858585] max-w-2xl">{project.description || "No project description provided."}</p>
          </div>

          {/* Header Actions Menu */}
          <div className="relative">
            <button
              onClick={() => setActionsOpen(!actionsOpen)}
              className="px-4 py-2 rounded-xl bg-transparent border border-[#2A2A2A] text-[#BDBDBD] text-xs font-semibold hover:bg-[#1D1D1D] hover:text-[#F5F5F5] transition-colors flex items-center gap-2"
            >
              Actions <MoreHorizontal className="w-4 h-4" />
            </button>

            {actionsOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-[#171717] border border-[#292929] rounded-2xl shadow-2xl py-2 z-30 text-xs font-medium space-y-1">
                <button
                  onClick={() => { setShowPromptModal(true); setActionsOpen(false); }}
                  className="w-full px-4 py-2 text-left hover:bg-[#222222] flex items-center gap-2 text-[#F5F5F5]"
                >
                  <Eye className="w-3.5 h-3.5 text-[#E3AA18]" /> View Original Prompt
                </button>
                <button
                  onClick={() => { setShowEditModal(true); setActionsOpen(false); }}
                  className="w-full px-4 py-2 text-left hover:bg-[#222222] flex items-center gap-2 text-[#F5F5F5]"
                >
                  <Edit3 className="w-3.5 h-3.5 text-[#B8B8B8]" /> Edit Project
                </button>
                <button
                  onClick={() => { handleArchiveProject(); setActionsOpen(false); }}
                  className="w-full px-4 py-2 text-left hover:bg-[#222222] flex items-center gap-2 text-[#E3AA18]"
                >
                  <Archive className="w-3.5 h-3.5" /> Archive Project
                </button>
                <button
                  onClick={() => { setShowDeleteModal(true); setActionsOpen(false); }}
                  className="w-full px-4 py-2 text-left hover:bg-[#E05252]/10 flex items-center gap-2 text-[#E05252]"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete Project
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Metadata Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 bg-[#151515] border border-[#292929] rounded-2xl p-4 text-xs">
        <div>
          <span className="text-[10px] font-semibold text-[#858585] uppercase tracking-wider block">Assigned To</span>
          <span className="font-semibold text-[#F5F5F5] mt-0.5 block truncate">
            {project.assignment?.assignedTo?.name || project.ownerName || project.ownerId || "Unassigned"}
          </span>
          {project.assignment?.assignedTo?.role && (
            <span className="text-[9px] px-1 py-0.2 rounded bg-[#292929] text-[#B8B8B8] font-mono">
              {project.assignment.assignedTo.role}
            </span>
          )}
        </div>
        <div>
          <span className="text-[10px] font-semibold text-[#858585] uppercase tracking-wider block">Assignment Status</span>
          <span className={`font-semibold mt-0.5 block ${project.assignment?.status === "ACCEPTED" ? "text-[#65C466]" : "text-[#E3AA18]"}`}>
            {project.assignment?.status || "PENDING ACCEPTANCE"}
          </span>
        </div>
        <div>
          <span className="text-[10px] font-semibold text-[#858585] uppercase tracking-wider block">Priority</span>
          <span className="font-semibold text-[#E3AA18] mt-0.5 block">{project.priority || "Medium"}</span>
        </div>
        <div>
          <span className="text-[10px] font-semibold text-[#858585] uppercase tracking-wider block">Deadline</span>
          <span className="font-semibold text-[#F5F5F5] mt-0.5 block">{project.deadline ? new Date(project.deadline).toLocaleDateString() : "Flexible"}</span>
        </div>
        <div>
          <span className="text-[10px] font-semibold text-[#858585] uppercase tracking-wider block">Milestones Approved</span>
          <span className="font-semibold text-[#65C466] mt-0.5 block">{approvedMilestonesCount} / {totalMilestonesCount}</span>
        </div>
        <div>
          <span className="text-[10px] font-semibold text-[#858585] uppercase tracking-wider block">Progress</span>
          <span className="font-semibold text-[#F5F5F5] mt-0.5 block">{project.progress || 0}%</span>
        </div>
      </div>

      {/* Workspace Tabs */}
      <div className="flex items-center gap-2 border-b border-[#292929] pb-3 overflow-x-auto text-xs font-semibold">
        {(["OVERVIEW", "MILESTONES", "TASKS", "DOCUMENTS", "GITHUB", "CALENDAR", "TIMELINE"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl transition-colors ${activeTab === tab ? "bg-[#E3AA18] text-[#0A0A0A]" : "bg-transparent border border-[#2A2A2A] text-[#BDBDBD] hover:bg-[#1D1D1D] hover:text-[#F5F5F5]"}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* TAB CONTENTS */}
      {activeTab === "OVERVIEW" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-widest border-b border-border pb-3">Project Overview & Mandate</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{project.objective || project.description}</p>
              <div className="pt-2">
                <button onClick={() => setShowPromptModal(true)} className="px-3.5 py-1.5 rounded-lg bg-gold/10 text-gold border border-gold/20 text-xs font-bold hover:bg-gold/20 transition-colors">
                  View Full CEO Mandate Prompt
                </button>
              </div>
            </div>

            <ProjectMilestonesView
              milestones={milestones}
              onSelectMilestone={(m) => setSelectedMilestone(m)}
              projectId={projectId}
              onRefresh={fetchProjectDetails}
            />
          </div>

          <div className="space-y-6">
            {/* PROJECT ASSIGNMENT CARD */}
            <div className="bg-card border border-gold/30 rounded-2xl p-5 space-y-3">
              <h3 className="text-xs font-bold text-gold uppercase tracking-widest border-b border-border pb-2 flex items-center gap-2">
                <UserCheck className="w-4 h-4" /> Project Assignment
              </h3>
              <div className="space-y-2.5 text-xs">
                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase block">Assigned To</span>
                  <p className="font-bold text-foreground mt-0.5">
                    {project.assignment?.assignedTo?.name || project.ownerName || "Unassigned"}
                    <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-semibold">
                      {project.assignment?.assignedTo?.role || "CO-CEO"}
                    </span>
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase block">Assignment Status</span>
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mt-0.5 border ${
                    project.assignment?.status === "ACCEPTED"
                      ? "bg-[#65C466]/10 text-[#65C466] border-[#65C466]/20"
                      : "bg-gold/10 text-gold border-gold/20"
                  }`}>
                    {project.assignment?.status || "PENDING ACCEPTANCE"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase block">Assigned By</span>
                  <p className="font-semibold text-foreground mt-0.5">
                    {project.assignment?.assignedBy?.name || "CEO"}
                  </p>
                </div>
                {project.assignment?.createdAt && (
                  <div>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase block">Assigned Date</span>
                    <p className="font-medium text-muted-foreground mt-0.5">
                      {new Date(project.assignment.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-widest border-b border-border pb-2">Execution Metrics</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">7-Stage Health</span>
                  <span className="font-bold text-emerald-500">HEALTHY</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Document Registry</span>
                  <span className="font-bold text-foreground">{documents.length} Files</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Active Tasks</span>
                  <span className="font-bold text-foreground">{tasks.length} Tasks</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "MILESTONES" && (
        <ProjectMilestonesView
          milestones={milestones}
          onSelectMilestone={(m) => setSelectedMilestone(m)}
          projectId={projectId}
          onRefresh={fetchProjectDetails}
        />
      )}

      {activeTab === "TASKS" && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-foreground">Project Tasks</h3>
          {tasks.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No tasks created yet for this project.</p>
          ) : (
            <div className="space-y-2">
              {tasks.map((t: any) => (
                <div key={t.id} className="p-3.5 rounded-xl bg-muted/30 border border-border flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground">{t.title}</span>
                  <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground text-[10px]">{t.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "DOCUMENTS" && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-foreground">7-Stage Project Document Registry</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            {documents.map((d: any) => (
              <div key={d.id} className="p-4 rounded-xl bg-muted/30 border border-border space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gold shrink-0" />
                  <span className="font-bold text-foreground truncate">{d.title}</span>
                </div>
                <p className="text-[11px] text-muted-foreground truncate">{d.folderPath}</p>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-2 border-t border-border">
                  <span>v{d.currentVersion || 1}</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-bold">{d.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "GITHUB" && (
        <GitHubOAuthPanel projectId={projectId} project={project} />
      )}

      {activeTab === "CALENDAR" && (
        <div className="bg-card border border-border rounded-2xl p-8 text-center text-xs text-muted-foreground">
          Calendar schedule linked for planned work sessions and project deadlines.
        </div>
      )}

      {activeTab === "TIMELINE" && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-3 text-xs">
          <h3 className="font-bold text-foreground border-b border-border pb-2">Project Execution Audit Trail</h3>
          <p className="text-muted-foreground">Project initialized with 7-Stage Milestone Execution Engine on {new Date(project.createdAt).toLocaleDateString()}.</p>
        </div>
      )}

      {/* ORIGINAL PROMPT MODAL */}
      {showPromptModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-xl w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-gold" /> Original CEO Project Mandate Prompt
              </h2>
              <button onClick={() => setShowPromptModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 rounded-xl bg-muted/40 border border-border text-xs text-foreground font-mono leading-relaxed whitespace-pre-wrap">
              {project.objective || project.description}
            </div>
            <div className="flex justify-end">
              <button onClick={() => setShowPromptModal(false)} className="px-4 py-2 rounded-xl bg-gold text-white text-xs font-bold">
                Close Mandate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h2 className="text-sm font-bold text-foreground border-b border-border pb-2">Edit Project Details</h2>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-muted-foreground mb-1">Title</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-muted/40 border border-border text-xs"
                />
              </div>
              <div>
                <label className="block text-muted-foreground mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full p-3 rounded-xl bg-muted/40 border border-border text-xs"
                />
              </div>
              <div>
                <label className="block text-muted-foreground mb-1">Deadline</label>
                <input
                  type="date"
                  value={editDeadline}
                  onChange={(e) => setEditDeadline(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-muted/40 border border-border text-xs"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowEditModal(false)} className="px-4 py-2 rounded-xl border border-border text-xs">
                Cancel
              </button>
              <button onClick={handleUpdateProject} disabled={isUpdating} className="px-4 py-2 rounded-xl bg-gold text-white text-xs font-bold">
                {isUpdating ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h2 className="text-sm font-bold text-rose-500 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Confirm Delete Project
            </h2>
            <p className="text-xs text-muted-foreground">
              This action will permanently delete <strong>{project.name}</strong> and all associated tasks, documents, and approval requests.
            </p>
            <div>
              <label className="block text-[11px] font-bold text-foreground uppercase tracking-widest mb-1">
                Type DELETE to confirm:
              </label>
              <input
                type="text"
                placeholder="DELETE"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-muted/40 border border-border text-xs font-mono"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 rounded-xl border border-border text-xs">
                Cancel
              </button>
              <button onClick={handleDeleteProject} className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold">
                Delete Project
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MILESTONE WORKSPACE MODAL */}
      {selectedMilestone && (
        <MilestoneWorkspace
          milestone={selectedMilestone}
          projectId={projectId}
          project={project}
          onClose={() => setSelectedMilestone(null)}
          onRefresh={() => { fetchProjectDetails(); setSelectedMilestone(null); }}
        />
      )}
    </div>
  );
}
