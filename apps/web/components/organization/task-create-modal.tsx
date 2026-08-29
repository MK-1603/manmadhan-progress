"use client";

import { useState, useEffect, useMemo } from "react";
import {
  MessageSquareText,
  Layers,
  Sliders,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
  Code,
  FileText,
  Search,
  CheckSquare,
  Eye,
  Palette,
  Users,
  ShieldAlert,
  Plus,
  Trash2,
  Calendar,
  Clock,
  Briefcase,
  ChevronRight,
  ChevronDown,
  Target,
  Wrench,
  Bug,
  UploadCloud,
  FileCheck,
  Check
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { GlobalSheet } from "@/components/ui/global-sheet";
import { useAuth } from "@/components/auth/auth-context";
import {
  TaskDraft,
  TaskSource,
  TaskPriority,
  TaskType,
  createEmptyTaskDraft,
  normalizeTaskDraft
} from "@/types/task-creation";

interface TaskCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  role?: "CEO" | "CO-CEO" | "MEMBER";
  projectId?: string;
  milestoneId?: string;
  isPersonalWorkspace?: boolean;
  initialSource?: TaskSource;
  initialType?: any;
}

// ─── Standardized Workflow Templates ──────────────────────────────────────────
interface WorkflowTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: any;
  defaultPriority: TaskPriority;
  defaultType: TaskType;
  defaultEstimatedMinutes: number;
  evidenceRequired: boolean;
  reviewRequired: boolean;
  focusRequired: boolean;
  defaultSubtasks: string[];
}

const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: "dev-feature",
    name: "Development Feature",
    category: "Development",
    description: "Build new functionality with unit tests, acceptance criteria & PR review.",
    icon: Code,
    defaultPriority: "High",
    defaultType: "Development",
    defaultEstimatedMinutes: 180,
    evidenceRequired: true,
    reviewRequired: true,
    focusRequired: true,
    defaultSubtasks: ["Design architecture & API specs", "Implement core feature logic", "Write unit & integration tests", "Submit GitHub PR for code review"],
  },
  {
    id: "bug-fix",
    name: "Bug Fix & Patch",
    category: "Bug Fix",
    description: "Diagnose root cause, apply fix, verify regression & document findings.",
    icon: Bug,
    defaultPriority: "High",
    defaultType: "Development",
    defaultEstimatedMinutes: 90,
    evidenceRequired: true,
    reviewRequired: true,
    focusRequired: true,
    defaultSubtasks: ["Reproduce bug & write failing test", "Apply code fix & verify regression tests"],
  },
  {
    id: "research-investigation",
    name: "Technical Research & Discovery",
    category: "Research",
    description: "Analyze market technical alternatives, benchmarks & feasibility.",
    icon: Search,
    defaultPriority: "Medium",
    defaultType: "Research",
    defaultEstimatedMinutes: 180,
    evidenceRequired: false,
    reviewRequired: true,
    focusRequired: false,
    defaultSubtasks: ["Gather technical specs & comparative metrics", "Synthesize findings into executive summary"],
  },
  {
    id: "code-review",
    name: "Peer Code Review",
    category: "Review",
    description: "Review pull requests, verify test coverage, security & architectural standards.",
    icon: Eye,
    defaultPriority: "High",
    defaultType: "Review",
    defaultEstimatedMinutes: 60,
    evidenceRequired: true,
    reviewRequired: false,
    focusRequired: true,
    defaultSubtasks: ["Audit diffs for security & correctness", "Verify automated test execution", "Provide actionable inline review feedback"],
  },
  {
    id: "deployment-release",
    name: "Deployment & Release",
    category: "Deployment",
    description: "Execute release pipeline, database migrations & smoke tests.",
    icon: UploadCloud,
    defaultPriority: "Critical",
    defaultType: "Development",
    defaultEstimatedMinutes: 90,
    evidenceRequired: true,
    reviewRequired: true,
    focusRequired: true,
    defaultSubtasks: ["Verify staging build & migrations", "Execute production deployment", "Perform post-deployment health check"],
  },
  {
    id: "meeting-followup",
    name: "Meeting & Action Items",
    category: "Meeting Follow-up",
    description: "Document meeting decisions, action items & delegate assignments.",
    icon: Users,
    defaultPriority: "Low",
    defaultType: "Meeting",
    defaultEstimatedMinutes: 45,
    evidenceRequired: false,
    reviewRequired: false,
    focusRequired: false,
    defaultSubtasks: ["Summarize key decisions", "Assign follow-up tasks"],
  },
  {
    id: "weekly-planning",
    name: "Weekly Sprint Planning",
    category: "Weekly Planning",
    description: "Review team priorities, set milestones & assign sprint deliverables.",
    icon: Calendar,
    defaultPriority: "Medium",
    defaultType: "Administrative",
    defaultEstimatedMinutes: 60,
    evidenceRequired: false,
    reviewRequired: false,
    focusRequired: false,
    defaultSubtasks: ["Audit previous sprint velocity", "Define weekly focus milestones", "Assign task responsibility"],
  },
];

export function TaskCreateModal({
  isOpen,
  onClose,
  onCreated,
  role = "CO-CEO",
  projectId,
  milestoneId,
  isPersonalWorkspace = false,
  initialSource = "manual",
}: TaskCreateModalProps) {
  const { user } = useAuth();

  // Creation State Machine: 
  // 0: ENTRY LAUNCHER (Prompt | Template | Manual)
  // 1: PROMPT INPUT OR TEMPLATE GALLERY
  // 2: MANUAL STEP 1 (Basic Details, Context & Assignee)
  // 3: MANUAL STEP 2 (Policy, Governance, Subtasks & Final Review)
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [selectedSource, setSelectedSource] = useState<TaskSource>(initialSource);

  // Unified Canonical Task Draft State
  const [draft, setDraft] = useState<TaskDraft>(() =>
    createEmptyTaskDraft(initialSource, { projectId, milestoneId })
  );

  // Prompt AI Parsing State
  const [promptText, setPromptText] = useState("");
  const [isParsingPrompt, setIsParsingPrompt] = useState(false);

  // Subtask Builder State
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");

  // Submitting & Reference Data State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [projects, setProjects] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);

  // Fetch Reference Data on Open
  useEffect(() => {
    if (!isOpen) return;
    setStep(0);
    setSelectedSource(initialSource || "manual");
    setDraft(createEmptyTaskDraft(initialSource || "manual", { projectId, milestoneId }));
    setPromptText("");
    setError("");

    const workspaceId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : null;
    if (!workspaceId) return;

    Promise.all([
      apiClient.get(`/org/projects?workspaceId=${workspaceId}`).catch(() => null),
      apiClient.get(`/organization/members?workspaceId=${workspaceId}`).catch(() => null),
    ]).then(([pRes, mRes]) => {
      if (pRes?.data?.success) setProjects(pRes.data.data);
      if (mRes?.data?.success) setMembers(mRes.data.data);
    });
  }, [isOpen, initialSource, projectId, milestoneId]);

  // RBAC Member Assignment Scoping
  const eligibleMembers = useMemo(() => {
    if (isPersonalWorkspace || role === "MEMBER") return [];
    if (role === "CO-CEO") {
      return members.filter((m: any) => {
        const memberRole = String(m.role || m.workspaceRole || "").toUpperCase();
        if (memberRole !== "MEMBER") return false;
        if (m.managerId) return m.managerId === user?.id;
        return true;
      });
    }
    return members;
  }, [members, role, isPersonalWorkspace, user]);

  const selectedMember = useMemo(() => {
    return eligibleMembers.find((m) => m.id === draft.assigneeId || m.userId === draft.assigneeId);
  }, [eligibleMembers, draft.assigneeId]);

  const selectedProject = useMemo(() => {
    return projects.find((p) => p.id === (draft.projectId || projectId));
  }, [projects, draft.projectId, projectId]);

  // Prompt Parsing Engine (Clean, no Sparkles)
  const handleParsePrompt = async () => {
    if (!promptText.trim()) {
      setError("Please describe the work in natural language.");
      return;
    }

    setIsParsingPrompt(true);
    setError("");
    try {
      const workspaceId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : null;
      const res = await apiClient.post("/org/tasks/generate-plan-from-prompt", {
        workspaceId,
        prompt: promptText.trim(),
        projectId: draft.projectId || projectId,
        milestoneId: draft.milestoneId || milestoneId,
      });

      if (res.data?.success && res.data.data?.tasks?.length > 0) {
        const parsedTask = res.data.data.tasks[0];
        setDraft((prev) =>
          normalizeTaskDraft({
            ...prev,
            source: "prompt",
            title: parsedTask.title || prev.title,
            description: parsedTask.description || `Work requested: "${promptText}"`,
            type: parsedTask.type || "Development",
            priority: parsedTask.priority || "High",
            estimatedMinutes: parsedTask.estimatedMinutes || 120,
            assigneeId: parsedTask.assigneeId || prev.assigneeId,
            dueAt: parsedTask.deadline || prev.dueAt,
            dependencies: parsedTask.dependencies || [],
          })
        );
        setStep(2); // Advance directly to Step 1 Manual Review & Edit
      } else {
        setDraft((prev) =>
          normalizeTaskDraft({
            ...prev,
            source: "prompt",
            title: promptText.length > 60 ? `${promptText.substring(0, 57)}...` : promptText,
            description: `Work requested: "${promptText}"`,
          })
        );
        setStep(2);
      }
    } catch {
      setDraft((prev) =>
        normalizeTaskDraft({
          ...prev,
          source: "prompt",
          title: promptText.length > 60 ? `${promptText.substring(0, 57)}...` : promptText,
          description: `Work requested: "${promptText}"`,
        })
      );
      setStep(2);
    } finally {
      setIsParsingPrompt(false);
    }
  };

  // Template Selection Engine
  const handleSelectTemplate = (template: WorkflowTemplate) => {
    setDraft((prev) =>
      normalizeTaskDraft({
        ...prev,
        source: "template",
        templateId: template.id,
        title: prev.title || `${template.name} Execution`,
        description: prev.description || template.description,
        priority: template.defaultPriority,
        type: template.defaultType,
        estimatedMinutes: template.defaultEstimatedMinutes,
        evidenceRequired: template.evidenceRequired,
        reviewRequired: template.reviewRequired,
        focusRequired: template.focusRequired,
        subtasks: template.defaultSubtasks.map((st, idx) => ({
          id: `sub_${idx}`,
          title: st,
          completed: false,
        })),
      })
    );
    setStep(2); // Jump directly to Step 1 Manual Review & Edit
  };

  // Subtask Management
  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    setDraft((prev) => ({
      ...prev,
      subtasks: [
        ...prev.subtasks,
        { id: `sub_${Date.now()}`, title: newSubtaskTitle.trim(), completed: false },
      ],
    }));
    setNewSubtaskTitle("");
  };

  const handleRemoveSubtask = (id: string) => {
    setDraft((prev) => ({
      ...prev,
      subtasks: prev.subtasks.filter((s) => s.id !== id),
    }));
  };

  // Final Task Creation Commit Handler (Idempotent)
  const handleSubmitTask = async () => {
    if (!draft.title.trim()) {
      setError("Task title is required");
      return;
    }
    if (role === "CO-CEO" && !isPersonalWorkspace && !draft.assigneeId && eligibleMembers.length > 0) {
      setError("Please select an assigned Member to receive this task.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const workspaceId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : null;
      const targetAssignee = isPersonalWorkspace || role === "MEMBER" ? user?.id : (draft.assigneeId || null);

      const payload = {
        workspaceId,
        sourceType: draft.source.toUpperCase(),
        templateId: draft.templateId || null,
        title: draft.title.trim(),
        description: draft.description || null,
        priority: draft.priority,
        type: draft.type,
        deadline: draft.dueAt || null,
        assigneeId: targetAssignee,
        projectId: draft.projectId || projectId || null,
        milestoneId: draft.milestoneId || milestoneId || null,
        estimatedMinutes: Number(draft.estimatedMinutes) || 60,
        requiresDocument: Boolean(draft.docType),
        requiresGithub: Boolean(draft.evidenceRequired),
        approvalRequired: Boolean(draft.reviewRequired),
        subtasks: draft.subtasks,
        dependencies: draft.dependencies,
      };

      const res = await apiClient.post("/org/tasks", payload);
      if (res.data?.success) {
        onCreated();
        onClose();
      } else {
        setError(res.data?.error?.message || res.data?.error || "Task could not be created. Please try again.");
      }
    } catch (e: any) {
      setError(e.response?.data?.error?.message || e.response?.data?.error || e.message || "Task creation failed. Please check network connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <GlobalSheet
      open={isOpen}
      onClose={onClose}
      title="Create Task"
      subtitle={
        step === 0
          ? "Choose how you want to start."
          : step === 1
          ? selectedSource === "prompt"
            ? "Describe the work to structure it."
            : "Select a reusable workflow template."
          : step === 2
          ? "Step 1 of 2 — Task Details & Assignee"
          : "Step 2 of 2 — Policy, Subtasks & Review"
      }
      desktopMaxWidth="max-w-[580px]"
    >
      <div className="p-5 sm:p-6 space-y-5 text-xs text-[#17202A] dark:text-[#F2F3F5] select-none">
        
        {/* Error Banner */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 font-medium flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button type="button" onClick={() => setError("")} className="text-rose-500 hover:text-foreground cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── STEP 0: ENTRY LAUNCHER SURFACE (Prompt | Template | Manual) ────────── */}
        {step === 0 && (
          <div className="space-y-3.5">
            
            {/* 1. PROMPT OPTION */}
            <button
              type="button"
              onClick={() => {
                setSelectedSource("prompt");
                setDraft((prev) => ({ ...prev, source: "prompt" }));
                setStep(1);
              }}
              className="w-full p-4 rounded-xl border border-[#C9A52A]/50 dark:border-[#D4B12F]/50 bg-[#FFFFFF] dark:bg-[#15181D] hover:bg-[#F8F9FA] dark:hover:bg-[#1C2027] transition-all text-left flex items-start justify-between gap-4 group cursor-pointer shadow-xs"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#17202A] dark:text-[#F2F3F5] group-hover:text-[#C9A52A] dark:group-hover:text-[#D4B12F]">
                    Prompt
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#C9A52A]/15 dark:bg-[#D4B12F]/15 text-[#C9A52A] dark:text-[#D4B12F] border border-[#C9A52A]/30 dark:border-[#D4B12F]/30 uppercase">
                    Recommended
                  </span>
                </div>
                <p className="text-xs text-[#667085] dark:text-[#8B94A3] leading-relaxed">
                  Describe the work in plain text and let Progress parse and structure the task parameters.
                </p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-[#C9A52A]/10 dark:bg-[#D4B12F]/10 border border-[#C9A52A]/30 dark:border-[#D4B12F]/30 text-[#C9A52A] dark:text-[#D4B12F] flex items-center justify-center shrink-0">
                <MessageSquareText className="w-4.5 h-4.5" />
              </div>
            </button>

            {/* 2. TEMPLATE OPTION */}
            <button
              type="button"
              onClick={() => {
                setSelectedSource("template");
                setDraft((prev) => ({ ...prev, source: "template" }));
                setStep(1);
              }}
              className="w-full p-4 rounded-xl border border-[#E5E7EB] dark:border-[#24282E] bg-[#FFFFFF] dark:bg-[#15181D] hover:bg-[#F8F9FA] dark:hover:bg-[#1C2027] transition-all text-left flex items-start justify-between gap-4 group cursor-pointer shadow-xs"
            >
              <div className="space-y-1 min-w-0">
                <span className="text-sm font-bold text-[#17202A] dark:text-[#F2F3F5] group-hover:text-[#C9A52A] dark:group-hover:text-[#D4B12F] block">
                  Template
                </span>
                <p className="text-xs text-[#667085] dark:text-[#8B94A3] leading-relaxed">
                  Start from a pre-configured workflow template with default checklist, review policy & timing.
                </p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-[#F3F4F6] dark:bg-[#20252C] border border-[#E5E7EB] dark:border-[#24282E] text-[#667085] dark:text-[#8B94A3] flex items-center justify-center shrink-0">
                <Layers className="w-4.5 h-4.5" />
              </div>
            </button>

            {/* 3. MANUAL OPTION */}
            <button
              type="button"
              onClick={() => {
                setSelectedSource("manual");
                setDraft((prev) => ({ ...prev, source: "manual" }));
                setStep(2); // Step 1 of Manual
              }}
              className="w-full p-4 rounded-xl border border-[#E5E7EB] dark:border-[#24282E] bg-[#FFFFFF] dark:bg-[#15181D] hover:bg-[#F8F9FA] dark:hover:bg-[#1C2027] transition-all text-left flex items-start justify-between gap-4 group cursor-pointer shadow-xs"
            >
              <div className="space-y-1 min-w-0">
                <span className="text-sm font-bold text-[#17202A] dark:text-[#F2F3F5] group-hover:text-[#C9A52A] dark:group-hover:text-[#D4B12F] block">
                  Manual
                </span>
                <p className="text-xs text-[#667085] dark:text-[#8B94A3] leading-relaxed">
                  Build the task step-by-step using structured 2-step setup.
                </p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-[#F3F4F6] dark:bg-[#20252C] border border-[#E5E7EB] dark:border-[#24282E] text-[#667085] dark:text-[#8B94A3] flex items-center justify-center shrink-0">
                <Sliders className="w-4.5 h-4.5" />
              </div>
            </button>

          </div>
        )}

        {/* ── STEP 1: PROMPT INPUT OR TEMPLATE GALLERY ───────────────────────── */}
        {step === 1 && selectedSource === "prompt" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#667085] dark:text-[#8B94A3]">
                PROMPT EXECUTION REQUEST
              </label>
              <textarea
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder="Example: Create a high priority backend task for Rahul under the Authentication milestone, due September 5, with GitHub evidence required."
                className="w-full h-28 p-3 rounded-xl border border-[#E5E7EB] dark:border-[#24282E] bg-[#FFFFFF] dark:bg-[#15181D] text-xs text-[#17202A] dark:text-[#F2F3F5] placeholder:text-[#9AA2AF] focus:outline-none focus:border-[#C9A52A] dark:focus:border-[#D4B12F] resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-mono font-semibold text-[#667085] dark:text-[#8B94A3]">Sample prompts:</span>
              <div className="flex flex-wrap gap-2">
                {[
                  "Build auth API unit tests for authentication milestone",
                  "Fix PostgreSQL query bottleneck on workspaces endpoint",
                  "Draft technical specs for workspace permission model"
                ].map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPromptText(sample)}
                    className="px-2.5 py-1 rounded-lg bg-[#F3F4F6] dark:bg-[#20252C] border border-[#E5E7EB] dark:border-[#24282E] text-[11px] text-[#667085] dark:text-[#8B94A3] hover:text-[#17202A] cursor-pointer"
                  >
                    "{sample}"
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(0)}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#667085] dark:text-[#8B94A3] hover:text-[#17202A] cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                type="button"
                onClick={handleParsePrompt}
                disabled={isParsingPrompt || !promptText.trim()}
                className="px-5 py-2.5 rounded-xl bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] font-bold text-xs hover:brightness-105 transition-all flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isParsingPrompt ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                <span>Structure Task Draft →</span>
              </button>
            </div>
          </div>
        )}

        {step === 1 && selectedSource === "template" && (
          <div className="space-y-4">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#667085] dark:text-[#8B94A3] block">
              SELECT WORKFLOW TEMPLATE
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[340px] overflow-y-auto pr-1">
              {WORKFLOW_TEMPLATES.map((tmpl) => {
                const Icon = tmpl.icon;
                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => handleSelectTemplate(tmpl)}
                    className="p-3 rounded-xl border border-[#E5E7EB] dark:border-[#24282E] bg-[#FFFFFF] dark:bg-[#15181D] hover:bg-[#F8F9FA] dark:hover:bg-[#1C2027] hover:border-[#C9A52A]/40 transition-all text-left space-y-1.5 cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-[#C9A52A] dark:text-[#D4B12F]" />
                        <span className="font-bold text-xs text-[#17202A] dark:text-[#F2F3F5] group-hover:text-[#C9A52A] dark:group-hover:text-[#D4B12F]">
                          {tmpl.name}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#F3F4F6] dark:bg-[#20252C] text-[#667085] dark:text-[#8B94A3]">
                        {tmpl.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#667085] dark:text-[#8B94A3] line-clamp-2 leading-relaxed">
                      {tmpl.description}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-start pt-2 border-t border-[#E5E7EB] dark:border-[#24282E]">
              <button
                type="button"
                onClick={() => setStep(0)}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#667085] dark:text-[#8B94A3] hover:text-[#17202A] cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: MANUAL STEP 1 (BASIC DETAILS, CONTEXT & ASSIGNEE) ────────── */}
        {step === 2 && (
          <div className="space-y-4">
            
            {/* Step Progress Bar */}
            <div className="flex items-center justify-between text-[11px] font-mono border-b border-[#E5E7EB] dark:border-[#24282E] pb-2">
              <span className="font-bold text-[#C9A52A] dark:text-[#D4B12F] uppercase">STEP 1 OF 2: DETAILS & ASSIGNEE</span>
              <span className="text-[#667085]">Method: {draft.source.toUpperCase()}</span>
            </div>

            {/* 1. TITLE & DESCRIPTION */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#667085] dark:text-[#8B94A3]">
                  Task Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  placeholder="e.g. Authentication API Integration"
                  className="w-full h-10 px-3 rounded-lg border border-[#E5E7EB] dark:border-[#24282E] bg-[#FFFFFF] dark:bg-[#15181D] text-xs font-semibold text-[#17202A] dark:text-[#F2F3F5] placeholder:text-[#9AA2AF] focus:outline-none focus:border-[#C9A52A]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#667085] dark:text-[#8B94A3]">
                  Description
                </label>
                <textarea
                  value={draft.description || ""}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  placeholder="Detailed work scope & specifications..."
                  className="w-full h-16 p-2.5 rounded-lg border border-[#E5E7EB] dark:border-[#24282E] bg-[#FFFFFF] dark:bg-[#15181D] text-xs text-[#17202A] dark:text-[#F2F3F5] placeholder:text-[#9AA2AF] focus:outline-none focus:border-[#C9A52A] resize-none"
                />
              </div>
            </div>

            {/* 2. PROJECT CONTEXT & ASSIGNEE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#667085] dark:text-[#8B94A3]">
                  Project Context
                </label>
                <select
                  value={draft.projectId || ""}
                  onChange={(e) => setDraft({ ...draft, projectId: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-[#E5E7EB] dark:border-[#24282E] bg-[#FFFFFF] dark:bg-[#15181D] text-xs font-medium text-[#17202A] dark:text-[#F2F3F5] focus:outline-none focus:border-[#C9A52A]"
                >
                  <option value="">No Project (General)</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {!isPersonalWorkspace && role !== "MEMBER" && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#667085] dark:text-[#8B94A3]">
                    Assignee {role === "CO-CEO" && <span className="text-rose-500">*</span>}
                  </label>
                  <select
                    value={draft.assigneeId || ""}
                    onChange={(e) => setDraft({ ...draft, assigneeId: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-[#E5E7EB] dark:border-[#24282E] bg-[#FFFFFF] dark:bg-[#15181D] text-xs font-medium text-[#17202A] dark:text-[#F2F3F5] focus:outline-none focus:border-[#C9A52A]"
                  >
                    <option value="">Select Assignee</option>
                    {eligibleMembers.map((m) => (
                      <option key={m.id} value={m.id || m.userId}>
                        {m.name || m.displayName || m.email}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* 3. PLANNING & TIMING */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#667085] dark:text-[#8B94A3]">
                  Priority
                </label>
                <select
                  value={draft.priority}
                  onChange={(e) => setDraft({ ...draft, priority: e.target.value as TaskPriority })}
                  className="w-full h-9 px-3 rounded-lg border border-[#E5E7EB] dark:border-[#24282E] bg-[#FFFFFF] dark:bg-[#15181D] text-xs font-medium text-[#17202A] dark:text-[#F2F3F5] focus:outline-none focus:border-[#C9A52A]"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#667085] dark:text-[#8B94A3]">
                  Est. Minutes
                </label>
                <input
                  type="number"
                  value={draft.estimatedMinutes}
                  onChange={(e) => setDraft({ ...draft, estimatedMinutes: Number(e.target.value) || 30 })}
                  className="w-full h-9 px-3 rounded-lg border border-[#E5E7EB] dark:border-[#24282E] bg-[#FFFFFF] dark:bg-[#15181D] text-xs font-mono text-[#17202A] dark:text-[#F2F3F5] focus:outline-none focus:border-[#C9A52A]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#667085] dark:text-[#8B94A3]">
                  Deadline
                </label>
                <input
                  type="date"
                  value={draft.dueAt ? new Date(draft.dueAt).toISOString().split("T")[0] : ""}
                  onChange={(e) => setDraft({ ...draft, dueAt: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-[#E5E7EB] dark:border-[#24282E] bg-[#FFFFFF] dark:bg-[#15181D] text-xs text-[#17202A] dark:text-[#F2F3F5] focus:outline-none focus:border-[#C9A52A]"
                />
              </div>
            </div>

            {/* STEP 1 CONFIG REVIEW CARD */}
            <div className="p-3 rounded-xl border border-[#E5E7EB] dark:border-[#24282E] bg-[#F8F9FA] dark:bg-[#1C2027] space-y-1 font-mono text-[11px]">
              <div className="text-[10px] font-bold text-[#667085] dark:text-[#8B94A3] uppercase">STEP 1 CONFIG REVIEW</div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[#17202A] dark:text-[#F2F3F5]">
                <span>Title: <strong>{draft.title || "—"}</strong></span>
                <span>Assignee: <strong>{selectedMember ? (selectedMember.name || selectedMember.displayName) : "Unassigned"}</strong></span>
                <span>Est: <strong>{draft.estimatedMinutes}m</strong></span>
              </div>
            </div>

            {/* STEP 1 NAVIGATION ACTIONS */}
            <div className="flex items-center justify-between pt-2 border-t border-[#E5E7EB] dark:border-[#24282E]">
              <button
                type="button"
                onClick={() => setStep(0)}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#667085] dark:text-[#8B94A3] hover:text-[#17202A] cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!draft.title.trim()) {
                    setError("Task title is required");
                    return;
                  }
                  setError("");
                  setStep(3); // Advance to Step 2 (Policy, Subtasks & Review)
                }}
                className="px-5 py-2.5 rounded-xl bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] font-extrabold text-xs hover:brightness-105 transition-all flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <span>Next: Policy & Review →</span>
              </button>
            </div>

          </div>
        )}

        {/* ── STEP 3: MANUAL STEP 2 (POLICY, SUBTASKS & FINAL CONFIRMATION REVIEW) ── */}
        {step === 3 && (
          <div className="space-y-4">
            
            {/* Step Progress Bar */}
            <div className="flex items-center justify-between text-[11px] font-mono border-b border-[#E5E7EB] dark:border-[#24282E] pb-2">
              <span className="font-bold text-[#C9A52A] dark:text-[#D4B12F] uppercase">STEP 2 OF 2: POLICY & REVIEW</span>
              <span className="text-[#667085]">Method: {draft.source.toUpperCase()}</span>
            </div>

            {/* 1. EXECUTION & GOVERNANCE POLICY TOGGLES */}
            <div className="p-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#24282E] bg-[#F8F9FA] dark:bg-[#1C2027] space-y-2.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#667085] dark:text-[#8B94A3] block">
                EXECUTION & GOVERNANCE POLICY
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.focusRequired}
                    onChange={(e) => setDraft({ ...draft, focusRequired: e.target.checked })}
                    className="w-4 h-4 accent-[#C9A52A] dark:accent-[#D4B12F] rounded"
                  />
                  <span>Focus Timer</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.evidenceRequired}
                    onChange={(e) => setDraft({ ...draft, evidenceRequired: e.target.checked })}
                    className="w-4 h-4 accent-[#C9A52A] dark:accent-[#D4B12F] rounded"
                  />
                  <span>GitHub Evidence</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.reviewRequired}
                    onChange={(e) => setDraft({ ...draft, reviewRequired: e.target.checked })}
                    className="w-4 h-4 accent-[#C9A52A] dark:accent-[#D4B12F] rounded"
                  />
                  <span>Review Required</span>
                </label>
              </div>
            </div>

            {/* 2. SUBTASK CHECKLIST BUILDER */}
            <div className="space-y-2">
              <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#667085] dark:text-[#8B94A3]">
                Subtasks Checklist
              </label>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddSubtask(); } }}
                  placeholder="Add subtask item..."
                  className="flex-1 h-9 px-3 rounded-lg border border-[#E5E7EB] dark:border-[#24282E] bg-[#FFFFFF] dark:bg-[#15181D] text-xs"
                />
                <button
                  type="button"
                  onClick={handleAddSubtask}
                  className="px-3 h-9 rounded-lg bg-[#F3F4F6] dark:bg-[#20252C] border border-[#E5E7EB] dark:border-[#24282E] font-semibold hover:bg-[#E5E7EB] dark:hover:bg-[#2A3038] cursor-pointer"
                >
                  Add
                </button>
              </div>

              {draft.subtasks.length > 0 && (
                <div className="space-y-1 pt-1 max-h-[140px] overflow-y-auto">
                  {draft.subtasks.map((st) => (
                    <div
                      key={st.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-[#F8F9FA] dark:bg-[#1C2027] border border-[#E5E7EB] dark:border-[#24282E] text-xs font-mono"
                    >
                      <span className="truncate">• {st.title}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSubtask(st.id)}
                        className="text-rose-500 hover:text-rose-600 cursor-pointer shrink-0 ml-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* PRE-CREATION COMPLETE SUMMARY REVIEW CARD */}
            <div className="p-4 rounded-xl border border-[#C9A52A]/40 dark:border-[#D4B12F]/40 bg-[#FFFFFF] dark:bg-[#15181D] shadow-xs space-y-2 font-mono text-[11px]">
              <div className="flex items-center justify-between text-[#667085] dark:text-[#8B94A3] border-b border-[#E5E7EB] dark:border-[#24282E] pb-2">
                <span className="font-bold uppercase tracking-wider text-[#C9A52A] dark:text-[#D4B12F]">
                  FINAL CONFIRMATION REVIEW
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F3F4F6] dark:bg-[#20252C]">
                  {draft.priority} Priority
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[#667085] dark:text-[#8B94A3]">
                <div>Title: <span className="text-[#17202A] dark:text-[#F2F3F5] font-semibold truncate block">{draft.title}</span></div>
                <div>Assignee: <span className="text-[#17202A] dark:text-[#F2F3F5] font-semibold">{selectedMember ? (selectedMember.name || selectedMember.displayName) : "Unassigned"}</span></div>
                <div>Project: <span className="text-[#17202A] dark:text-[#F2F3F5] font-semibold">{selectedProject ? selectedProject.name : "General"}</span></div>
                <div>Est. Time: <span className="text-[#17202A] dark:text-[#F2F3F5] font-semibold">{draft.estimatedMinutes}m</span></div>
                <div>GitHub Evidence: <span className="text-[#17202A] dark:text-[#F2F3F5] font-semibold">{draft.evidenceRequired ? "Yes" : "No"}</span></div>
                <div>Review Required: <span className="text-[#17202A] dark:text-[#F2F3F5] font-semibold">{draft.reviewRequired ? "Yes" : "No"}</span></div>
              </div>
            </div>

            {/* STEP 2 ACTION CONTROLS */}
            <div className="flex items-center justify-between pt-2 border-t border-[#E5E7EB] dark:border-[#24282E]">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#667085] dark:text-[#8B94A3] hover:text-[#17202A] cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Step 1
              </button>

              <button
                type="button"
                onClick={handleSubmitTask}
                disabled={isSubmitting || !draft.title.trim() || (role === "CO-CEO" && !draft.assigneeId && eligibleMembers.length > 0)}
                className="px-6 py-2.5 rounded-xl bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] font-extrabold text-xs hover:brightness-105 active:scale-[0.99] transition-all flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-40"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Create Task</span>
              </button>
            </div>

          </div>
        )}

      </div>
    </GlobalSheet>
  );
}
