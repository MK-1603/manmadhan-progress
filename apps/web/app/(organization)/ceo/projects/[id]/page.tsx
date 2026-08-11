"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Target, CheckCircle2, Clock, AlertCircle, Loader2, Flag,
  ListTodo, Calendar, BarChart3, FileText, ChevronRight, Edit2, CheckSquare,
  Lock, GitBranch, BookOpen, ShieldCheck, History, X, Plus, Trash2, Edit3,
  FileUp, ExternalLink, MessageSquare, Upload
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { PremiumCard } from "@/components/ui/premium-card";
import Link from "next/link";
import { EditProjectModal } from "@/components/organization/edit-project-modal";
import { MilestoneModal } from "@/components/organization/milestone-modal";
import { ProjectAcceptanceBanner } from "@/components/organization/project-acceptance-banner";

const statusColor = (s: string) => {
  const m: Record<string, string> = {
    "PENDING_ACCEPTANCE": "text-amber-500 bg-amber-500/10 border-amber-500/20",
    "DECLINED": "text-rose-500 bg-rose-500/10 border-rose-500/20",
    "Active": "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    "Planning": "text-blue-500 bg-blue-500/10 border-blue-500/20",
    "REQUIREMENTS_IN_PROGRESS": "text-amber-500 bg-amber-500/10 border-amber-500/20",
    "READY_FOR_EXECUTION": "text-blue-500 bg-blue-500/10 border-blue-500/20",
    "Completed": "text-slate-400 bg-slate-400/10 border-slate-400/20",
    "Draft": "text-muted-foreground bg-muted border-border",
    "Assigned": "text-blue-400 bg-blue-400/10 border-blue-400/20",
    "In Progress": "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    "Review": "text-purple-500 bg-purple-500/10 border-purple-500/20",
    "Approved": "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    "Blocked": "text-rose-500 bg-rose-500/10 border-rose-500/20",
  };
  return m[s] || "text-muted-foreground bg-muted border-border";
};

type Tab = "foundation" | "features" | "roadmap" | "tasks" | "github" | "timeline" | "overview";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("foundation");

  // Edit Modals State
  const [showEditProjectModal, setShowEditProjectModal] = useState(false);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<any>(null);

  // Project Foundation Checklist State
  const [prdStatus, setPrdStatus] = useState("In Progress");
  const [trdStatus, setTrdStatus] = useState("Not Started");
  const [workflowStatus, setWorkflowStatus] = useState("Not Started");
  const [githubUrl, setGithubUrl] = useState("");
  const [userManualStatus, setUserManualStatus] = useState("Not Started");
  const [roadmapStatus, setRoadmapStatus] = useState("Not Started");

  // Event Timeline State
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);

  // Requirement Documents & Verification State
  const [requirementFiles, setRequirementFiles] = useState<Record<string, {
    fileName?: string;
    fileUrl?: string;
    githubUrl?: string;
    status: string;
    feedback?: string;
  }>>({});

  const handleVerifyRequirement = async (key: string, newStatus: string, extra: any = {}) => {
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      const res = await apiClient.post(`/org/projects/${id}/verify-requirement`, {
        key,
        status: newStatus,
        workspaceId,
        ...extra,
      });

      if (res.data.success) {
        setRequirementFiles(prev => ({
          ...prev,
          [key]: {
            ...prev[key],
            status: newStatus,
            ...extra,
          }
        }));

        if (key === "PRD") setPrdStatus(newStatus);
        if (key === "TRD") setTrdStatus(newStatus);
        if (key === "Workflow") setWorkflowStatus(newStatus);
        if (key === "UserManual") setUserManualStatus(newStatus);
        if (key === "GitHub" && extra.githubUrl) setGithubUrl(extra.githubUrl);

        fetchProject();
        fetchTimeline();
      }
    } catch (e: any) {}
  };

  const fetchProject = useCallback(async () => {
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      const url = `/org/projects/${id}${workspaceId ? `?workspaceId=${workspaceId}` : ""}`;
      const res = await apiClient.get(url);
      if (res.data.success) {
        const p = res.data.data;
        setProject(p);
        if (p.githubUrl) setGithubUrl(p.githubUrl);
      } else {
        setError(res.data.error || "Failed to load project");
      }
    } catch (e: any) {
      setError("Unable to load project. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchTimeline = useCallback(async () => {
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      const res = await apiClient.get(`/org/projects/${id}/timeline?workspaceId=${workspaceId}`);
      if (res.data.success) {
        setTimelineEvents(res.data.data || []);
      }
    } catch (e: any) {
      // Non-critical
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchProject();
      fetchTimeline();
    }
  }, [id, fetchProject, fetchTimeline]);

  const handleOpenAddMilestone = () => {
    setEditingMilestone(null);
    setShowMilestoneModal(true);
  };

  const handleOpenEditMilestone = (ms: any) => {
    setEditingMilestone(ms);
    setShowMilestoneModal(true);
  };

  const handleArchiveMilestone = async (msId: string) => {
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      const res = await apiClient.delete(`/org/projects/${id}/milestones/${msId}?workspaceId=${workspaceId}`);
      if (res.data.success) {
        fetchProject();
        fetchTimeline();
      }
    } catch (e: any) {
      // Non-critical
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  if (error || !project) return (
    <div className="p-6 max-w-lg mx-auto space-y-4 pt-16">
      <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-xs font-medium">
        <AlertCircle className="w-4 h-4 shrink-0" /> {error || "Project not found"}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => { setLoading(true); setError(""); fetchProject(); fetchTimeline(); }}
          className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:bg-primary/90 transition-colors"
        >
          Retry Loading
        </button>
        <Link
          href="/ceo/projects"
          className="px-4 py-2 bg-card border border-border text-xs font-bold rounded-xl text-foreground hover:bg-accent transition-colors"
        >
          Back to Projects
        </Link>
      </div>
    </div>
  );

  // Compute Foundation Completion
  const isPrdReady = prdStatus === "Ready" || prdStatus === "Completed";
  const isTrdReady = trdStatus === "Ready" || trdStatus === "Completed";
  const isWorkflowReady = workflowStatus === "Ready" || workflowStatus === "Completed";
  const isRoadmapReady = (project.milestones && project.milestones.length > 0) || roadmapStatus === "Completed";

  const foundationItems = [
    { label: "Requirements Defined", ready: true },
    { label: "Product Requirements (PRD)", ready: isPrdReady },
    { label: "Technical Architecture (TRD)", ready: isTrdReady },
    { label: "Application Workflow", ready: isWorkflowReady },
    { label: "GitHub Repository", ready: githubUrl.trim().length > 0 },
    { label: "User Manual / Documentation", ready: userManualStatus === "Ready" || userManualStatus === "Completed" },
    { label: "Project Roadmap & Milestones", ready: isRoadmapReady },
  ];

  const foundationProgress = Math.round((foundationItems.filter(i => i.ready).length / foundationItems.length) * 100);
  const isRoadmapGatePassed = foundationProgress >= 70 && isRoadmapReady;

  const getNextStepText = () => {
    if (!isPrdReady) return "Complete PRD (Product Requirements Document)";
    if (!isTrdReady) return "Complete TRD (Technical Architecture Document)";
    if (!isWorkflowReady) return "Define Application Workflow";
    if (!isRoadmapReady) return "Build Project Roadmap & Milestones";
    return "Start Execution Tasks";
  };

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "foundation", label: "Project Foundation", icon: FileText },
    { id: "features", label: "Features", icon: CheckSquare },
    { id: "roadmap", label: "Roadmap", icon: Flag },
    { id: "tasks", label: "Tasks", icon: ListTodo },
    { id: "github", label: "GitHub", icon: GitBranch },
    { id: "timeline", label: "Timeline & History", icon: History },
    { id: "overview", label: "Overview", icon: Target },
  ];

  return (
    <div className="p-4 lg:p-6 max-w-[1400px] mx-auto w-full space-y-5">
      {/* Executive Header Bar */}
      <div>
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Projects
        </button>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-lg font-bold text-foreground">{project.name}</h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusColor(project.status)}`}>
                {project.status === "REQUIREMENTS_IN_PROGRESS" ? "REQUIREMENTS IN PROGRESS" : project.status}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border text-emerald-500 bg-emerald-500/10 border-emerald-500/20">
                {project.health || "Healthy"}
              </span>
            </div>
            {project.objective && <p className="text-xs text-muted-foreground mt-1">{project.objective}</p>}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEditProjectModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
            >
              <Edit2 className="w-3.5 h-3.5" /> Edit Project Mandate
            </button>
            <button
              onClick={async () => {
                if (!confirm("Are you sure you want to delete this project? This action cannot be undone.")) return;
                try {
                  const workspaceId = localStorage.getItem("workspaceId");
                  const res = await apiClient.delete(`/org/projects/${id}?workspaceId=${workspaceId}`);
                  if (res.data.success) {
                    router.push("/ceo/projects");
                  }
                } catch (e) {
                  alert("Failed to delete project");
                }
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold rounded-xl hover:bg-rose-500/20 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete Project
            </button>
          </div>
        </div>
      </div>

      {/* Project Assignment Acceptance Banner */}
      <ProjectAcceptanceBanner project={project} onUpdated={() => { fetchProject(); fetchTimeline(); }} />

      {/* Primary Next Action Banner */}
      <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-primary/20 rounded-lg text-primary">
            <ChevronRight className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary block">
              PRIMARY NEXT STEP
            </span>
            <p className="text-xs font-bold text-foreground">
              {getNextStepText()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Foundation Progress:</span>
          <span className="font-mono font-bold text-foreground">{foundationProgress}%</span>
        </div>
      </div>

      {/* Status Progress Bar with Date + Time */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <PremiumCard className="p-3">
          <p className="text-[11px] text-muted-foreground">Foundation Status</p>
          <p className="text-xl font-bold text-foreground mt-1">{foundationProgress}%</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{foundationItems.filter(i => i.ready).length}/7 Items Complete</p>
        </PremiumCard>

        <PremiumCard className="p-3">
          <p className="text-[11px] text-muted-foreground">Roadmap Gate</p>
          <p className={`text-xl font-bold mt-1 ${isRoadmapGatePassed ? "text-emerald-500" : "text-amber-500"}`}>
            {isRoadmapGatePassed ? "UNLOCKED" : "LOCKED"}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{isRoadmapGatePassed ? "Ready for Execution" : "Requires Roadmap"}</p>
        </PremiumCard>

        <PremiumCard className="p-3">
          <p className="text-[11px] text-muted-foreground">Planned Start Date & Time</p>
          <p className="text-xs font-mono font-bold text-foreground mt-1">
            {project.startDate ? new Date(project.startDate).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "Today 09:00 AM"}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Mandate Start</p>
        </PremiumCard>

        <PremiumCard className="p-3">
          <p className="text-[11px] text-muted-foreground">Executive Deadline & Time</p>
          <p className="text-xs font-mono font-bold text-foreground mt-1">
            {project.deadline ? new Date(project.deadline).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "No Deadline"}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">CEO Mandate End</p>
        </PremiumCard>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold transition-colors border-b-2 -mb-px shrink-0 ${
              tab === t.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Project Foundation Workspace */}
      {tab === "foundation" && (
        <div className="space-y-4">
          <div className="p-4 border border-border rounded-xl bg-card space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Project Requirement Analysis & Foundation Checklist
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  The assigned Project Owner must establish requirements, PRD, TRD, and Roadmap before task execution begins.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-primary">{foundationProgress}% Complete</span>
            </div>

            {/* Checklist Grid with Dropdowns, File Uploads & CEO Verification */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* 1. Scope */}
              <div className="p-3 border border-border rounded-xl bg-card space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> 1. Scope & Requirements
                  </span>
                  <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">DEFINED</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {project.description || "Executive project scope defined."}
                </p>
              </div>

              {/* Requirement Items: PRD, TRD, Workflow, GitHub, UserManual */}
              {[
                { key: "PRD", label: "2. Product Requirements (PRD)", status: prdStatus, icon: FileText, desc: "Goals, target users, functional requirements, and acceptance criteria." },
                { key: "TRD", label: "3. Technical Architecture (TRD)", status: trdStatus, icon: BookOpen, desc: "Tech stack, data schemas, API specifications, and infrastructure." },
                { key: "Workflow", label: "4. Application Workflow", status: workflowStatus, icon: GitBranch, desc: "End-to-end feature workflow from user input to backend output." },
                { key: "GitHub", label: "5. GitHub Repository", status: githubUrl ? "Ready" : "Not Started", icon: GitBranch, desc: "Repository URL, branch structure, and pull requests." },
                { key: "UserManual", label: "6. User Manual / Guide", status: userManualStatus, icon: FileText, desc: "User guide detailing access, workflows, and major actions." },
              ].map(item => {
                const fileInfo = requirementFiles[item.key] || {};
                const isVerified = item.status === "Ready" || item.status === "Completed";
                const isPendingReview = item.status === "Submitted for Verification" || fileInfo.fileName;

                return (
                  <div key={item.key} className="p-3.5 border border-border rounded-xl bg-card space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <item.icon className="w-4 h-4 text-primary shrink-0" /> {item.label}
                      </span>

                      {/* Dropdown Menu for Status */}
                      <div className="flex items-center gap-1.5">
                        <select
                          value={item.status}
                          onChange={(e) => handleVerifyRequirement(item.key, e.target.value)}
                          className="px-2 py-1 bg-background border border-border rounded text-[10px] font-bold text-foreground focus:border-primary outline-none"
                        >
                          <option value="Not Started">Not Started</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Submitted for Verification">Submitted for Verification</option>
                          <option value="Ready">Verified & Approved</option>
                          <option value="Changes Requested">Changes Requested</option>
                        </select>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground">{item.desc}</p>

                    {/* GitHub Link Input */}
                    {item.key === "GitHub" ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <input
                            type="url"
                            placeholder="https://github.com/organization/repository"
                            value={githubUrl}
                            onChange={(e) => setGithubUrl(e.target.value)}
                            className="flex-1 px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs font-mono text-foreground focus:border-primary outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleVerifyRequirement("GitHub", githubUrl ? "Ready" : "Not Started", { githubUrl })}
                            className="px-2.5 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-lg shrink-0"
                          >
                            Save Link
                          </button>
                        </div>
                        {githubUrl && (
                          <a
                            href={githubUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-primary hover:underline flex items-center gap-1 font-mono"
                          >
                            <ExternalLink className="w-3 h-3" /> {githubUrl}
                          </a>
                        )}
                      </div>
                    ) : (
                      /* File Upload Control */
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-border/50">
                          <label className="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 bg-background border border-border rounded-lg text-[11px] font-bold text-foreground hover:bg-accent transition-colors">
                            <Upload className="w-3 h-3 text-primary" /> Upload File
                            <input
                              type="file"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) {
                                  handleVerifyRequirement(item.key, "Submitted for Verification", { fileName: f.name });
                                }
                              }}
                            />
                          </label>

                          {fileInfo.fileName && (
                            <span className="text-[10px] font-mono font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20 flex items-center gap-1">
                              <FileText className="w-3 h-3" /> {fileInfo.fileName}
                            </span>
                          )}
                        </div>

                        {/* CEO / CO-CEO Verification Panel */}
                        <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-2">
                          <span className="text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground">
                            Leadership Verification:
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleVerifyRequirement(item.key, "Ready", { feedback: "Approved by Leadership" })}
                              className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-colors flex items-center gap-1 ${
                                isVerified
                                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                  : "bg-emerald-500 text-white hover:bg-emerald-600"
                              }`}
                            >
                              <ShieldCheck className="w-3 h-3" /> {isVerified ? "Verified" : "Approve & Verify"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleVerifyRequirement(item.key, "Changes Requested", { feedback: "Changes requested" })}
                              className="px-2.5 py-1 text-[10px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-lg hover:bg-amber-500/20 transition-colors"
                            >
                              Request Changes
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Features */}
      {tab === "features" && (
        <div className="space-y-4">
          <div className="p-4 border border-border rounded-xl bg-card space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Structured Project Features ({project.features?.length || 0})
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Real feature modules driving task generation & implementation requirements.
                </p>
              </div>
            </div>

            {project.features && project.features.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {project.features.map((feat: any, i: number) => (
                  <div key={feat.id || i} className="p-3.5 border border-border rounded-xl bg-muted/20 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-foreground">{feat.name}</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                        {feat.priority || "MEDIUM"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{feat.description || "Feature description and specifications"}</p>
                    <span className="inline-block text-[10px] font-semibold text-emerald-500 mt-1">
                      Status: {feat.status || "PLANNED"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No feature modules defined yet for this project.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: GitHub Integration */}
      {tab === "github" && (
        <div className="space-y-4">
          <div className="p-4 border border-border rounded-xl bg-card space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-amber-500" /> Source Code & GitHub Integration
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  First-class repository connection and PR evidence tracking.
                </p>
              </div>
            </div>

            {project.github ? (
              <div className="p-4 border border-border rounded-xl bg-muted/20 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Connected Repository</span>
                    <h4 className="text-sm font-bold text-foreground">{project.github.owner}/{project.github.repoName}</h4>
                  </div>
                  <a
                    href={project.github.repositoryUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-lg flex items-center gap-1.5"
                  >
                    <span>Open GitHub</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                <div className="text-xs text-muted-foreground space-y-1 pt-1 border-t border-border">
                  <p>Default Branch: <span className="font-mono text-foreground font-semibold">{project.github.defaultBranch || "main"}</span></p>
                  <p>Repository URL: <span className="font-mono text-foreground">{project.github.repositoryUrl}</span></p>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-muted-foreground space-y-2">
                <p>No GitHub repository connected yet.</p>
                <p className="text-[11px] text-muted-foreground">Tasks requiring code evidence will prompt for PR URL upon completion.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Roadmap & Full Milestone CRUD */}
      {tab === "roadmap" && (
        <div className="space-y-4">
          <div className="p-4 border border-border rounded-xl bg-card space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Project Execution Roadmap & Milestones
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Full milestone CRUD & scheduling respecting executive deadline.
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenAddMilestone}
                className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Milestone
              </button>
            </div>

            {project.milestones && project.milestones.length > 0 ? (
              <div className="space-y-2 pt-1">
                {project.milestones.map((ms: any, i: number) => (
                  <div key={ms.id || i} className="p-3 border border-border rounded-xl bg-muted/10 flex items-center justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs font-bold text-foreground">{ms.name}</h4>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${statusColor(ms.status)}`}>
                            {ms.status}
                          </span>
                        </div>
                        {ms.description && <p className="text-[11px] text-muted-foreground mt-0.5">{ms.description}</p>}
                        {ms.deadline && (
                          <span className="text-[10px] font-mono text-muted-foreground block mt-1">
                            Target: {new Date(ms.deadline).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEditMilestone(ms)}
                        className="px-2 py-1 bg-card border border-border rounded text-[10px] font-semibold text-foreground hover:bg-muted transition-colors flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3" /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleArchiveMilestone(ms.id)}
                        className="p-1 text-muted-foreground hover:text-rose-500 transition-colors"
                        title="Archive Milestone"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground text-xs space-y-2">
                <p>No roadmap milestones added yet.</p>
                <button
                  type="button"
                  onClick={handleOpenAddMilestone}
                  className="px-3 py-1.5 bg-primary/10 border border-primary/20 text-primary font-bold rounded-lg hover:bg-primary/20 transition-colors inline-flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add First Milestone
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Tasks */}
      {tab === "tasks" && (
        <div className="space-y-4">
          {!isRoadmapGatePassed ? (
            <div className="p-6 border border-amber-500/20 bg-amber-500/5 rounded-xl text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto">
                <Lock className="w-5 h-5" />
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-500">
                  ROADMAP GATE: TASK EXECUTION LOCKED
                </h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Development execution tasks are locked until Project Requirements, PRD, TRD, Application Workflow, and Roadmap are completed by the assigned Owner.
                </p>
              </div>
              <button
                onClick={() => setTab("foundation")}
                className="px-4 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center gap-1.5"
              >
                Go to Foundation Checklist <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="p-4 border border-border rounded-xl bg-card space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Project Execution Tasks ({project.tasks?.length || 0})
                </h3>
                <Link
                  href={`/ceo/tasks`}
                  className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Create Execution Task
                </Link>
              </div>

              {project.tasks && project.tasks.length > 0 ? (
                <div className="space-y-2">
                  {project.tasks.map((t: any) => (
                    <div key={t.id} className="p-3 border border-border rounded-xl bg-muted/10 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-semibold text-foreground truncate">{t.title}</h4>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${statusColor(t.status)}`}>
                          {t.status}
                        </span>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!confirm("Are you sure you want to delete this task?")) return;
                            try {
                              const workspaceId = localStorage.getItem("workspaceId");
                              const res = await apiClient.delete(`/org/tasks/${t.id}?workspaceId=${workspaceId}`);
                              if (res.data.success) fetchProject();
                            } catch (e) {
                              alert("Failed to delete task");
                            }
                          }}
                          className="p-1 text-muted-foreground hover:text-rose-500 transition-colors"
                          title="Delete Task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-xs">
                  Roadmap gate passed! You may now create project execution tasks.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Event-Driven Timeline */}
      {tab === "timeline" && (
        <div className="p-4 border border-border rounded-xl bg-card space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Project Event Timeline & Audit History
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Chronological historical activity, date modifications, and mandate milestones.
              </p>
            </div>
            <span className="text-xs text-muted-foreground font-mono">{timelineEvents.length} Events</span>
          </div>

          {timelineEvents.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-xs">
              No historical timeline events recorded yet.
            </div>
          ) : (
            <div className="relative pl-6 space-y-4 border-l-2 border-border/80">
              {timelineEvents.map((evt) => (
                <div key={evt.id} className="relative">
                  <div className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-primary border-2 border-card" />
                  <div className="p-3 border border-border rounded-xl bg-muted/10 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-foreground">{evt.action}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {evt.timestamp ? new Date(evt.timestamp).toLocaleString() : ""}
                      </span>
                    </div>
                    {evt.details && (
                      <p className="text-xs text-muted-foreground leading-relaxed">{evt.details}</p>
                    )}
                    <span className="text-[10px] font-semibold text-primary block">
                      Actor: {evt.actorName || "CEO"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Overview */}
      {tab === "overview" && (
        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-4">
            {project.description && (
              <PremiumCard className="p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground mb-2">Description</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{project.description}</p>
              </PremiumCard>
            )}
          </div>
          <div className="space-y-4">
            <PremiumCard className="p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Mandate Details</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Owner:</span>
                  <span className="font-semibold text-foreground">{project.ownerName || "CO-CEO / Member"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Start Schedule:</span>
                  <span className="font-mono font-semibold text-foreground">{project.startDate ? new Date(project.startDate).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "Today"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Executive Deadline:</span>
                  <span className="font-mono font-semibold text-foreground">{project.deadline ? new Date(project.deadline).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "Not Set"}</span>
                </div>
              </div>
            </PremiumCard>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {showEditProjectModal && (
        <EditProjectModal
          isOpen={showEditProjectModal}
          project={project}
          onClose={() => setShowEditProjectModal(false)}
          onUpdated={() => {
            fetchProject();
            fetchTimeline();
          }}
        />
      )}

      {/* Milestone Add/Edit Modal */}
      {showMilestoneModal && (
        <MilestoneModal
          isOpen={showMilestoneModal}
          projectId={id}
          projectDeadline={project?.deadline}
          milestone={editingMilestone}
          onClose={() => setShowMilestoneModal(false)}
          onSaved={() => {
            fetchProject();
            fetchTimeline();
          }}
        />
      )}
    </div>
  );
}
