"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  FolderKanban,
  FileText,
  Calendar,
  Users,
  Check,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  UserCheck,
  Edit3
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { useRouter } from "next/navigation";
import { GlobalSheet } from "@/components/ui/global-sheet";
import { useAuth } from "@/components/auth/auth-context";

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (project?: any) => void;
}

export type CreationMethod = "PROMPT" | "TEMPLATE" | "MANUAL";
export type CreationStage = "METHOD" | "DETAILS" | "ASSIGNMENT" | "REVIEW";

// ── Shared Project Draft Data Structure ───────────────────────────────────────
interface ProjectDraft {
  title: string;
  description: string;
  objective: string;
  category: string;
  priority: "Critical" | "High" | "Medium" | "Low";
  deadline: string;
  constraintsText: string;
  toolsText: string;
  githubUrl: string;
  requirements: string[];
  deliverables: string[];
  milestones: string[];
  selectedCoCeoId: string;
  creationMethod: CreationMethod;
}

const DEFAULT_PROJECT_DRAFT: ProjectDraft = {
  title: "",
  description: "",
  objective: "",
  category: "Development",
  priority: "Medium",
  deadline: "",
  constraintsText: "",
  toolsText: "",
  githubUrl: "",
  requirements: [],
  deliverables: [],
  milestones: ["01 Foundation", "02 Requirements", "03 Architecture", "04 Implementation", "05 Testing", "06 Release"],
  selectedCoCeoId: "",
  creationMethod: "PROMPT",
};

interface ProjectTemplateItem {
  id: string;
  name: string;
  category: string;
  description: string;
  defaultPriority: "Critical" | "High" | "Medium" | "Low";
  defaultRequirements: string[];
  defaultDeliverables: string[];
  defaultTools: string[];
  defaultMilestones: string[];
}

const PROJECT_TEMPLATES: ProjectTemplateItem[] = [
  {
    id: "saas-web",
    name: "SaaS Web Application",
    category: "Full Stack",
    description: "Production Next.js application with authentication, PostgreSQL database schema & RBAC.",
    defaultPriority: "High",
    defaultRequirements: ["User authentication & session management", "Multi-tenant workspace architecture", "Role-based access control (RBAC)", "Responsive dashboard UI"],
    defaultDeliverables: ["Functional Next.js frontend", "Express API endpoints & database migrations", "Automated test suite"],
    defaultTools: ["Next.js", "TypeScript", "PostgreSQL", "Tailwind CSS"],
    defaultMilestones: ["01 Foundation", "02 Requirements", "03 Architecture", "04 Implementation", "05 Testing", "06 Release"],
  },
  {
    id: "mobile-pwa",
    name: "Mobile PWA Application",
    category: "Mobile",
    description: "Offline-first Progressive Web App with service workers, push notifications & touch UI.",
    defaultPriority: "Medium",
    defaultRequirements: ["Responsive touch-friendly layout", "Offline storage engine", "Service worker push notifications"],
    defaultDeliverables: ["PWA manifest & service worker", "Offline sync logic", "Lighthouse PWA audit score > 90"],
    defaultTools: ["React", "TypeScript", "Workbox", "Tailwind CSS"],
    defaultMilestones: ["01 Mobile Wireframes", "02 Offline Engine", "03 Push Setup", "04 PWA Release"],
  },
  {
    id: "backend-api",
    name: "Backend REST Microservice",
    category: "Backend",
    description: "High-performance Node.js API with automated schema migrations & OpenAPI docs.",
    defaultPriority: "High",
    defaultRequirements: ["OpenAPI 3.0 specification", "Database query optimization & indexing", "JWT auth middleware"],
    defaultDeliverables: ["Express REST API codebase", "Database migration scripts", "Postman / Swagger documentation"],
    defaultTools: ["Node.js", "Express", "Drizzle ORM", "Docker"],
    defaultMilestones: ["01 API Specs", "02 Database Migrations", "03 Auth Middleware", "04 Staging Deploy"],
  },
  {
    id: "system-redesign",
    name: "System Architecture Redesign",
    category: "Architecture",
    description: "Refactor core infrastructure for low-latency request processing, indexing & caching.",
    defaultPriority: "Critical",
    defaultRequirements: ["Audit database bottlenecks", "Implement Redis cache layer", "Execute zero-downtime migration"],
    defaultDeliverables: ["Redis caching service", "Optimized database schema", "Performance benchmarking report"],
    defaultTools: ["PostgreSQL", "Redis", "Node.js"],
    defaultMilestones: ["01 Query Audit", "02 Redis Setup", "03 Zero-Downtime Migration"],
  },
];

const SINGLE_SAMPLE_PROMPT = "Build an AI-powered interview platform for students with authentication, company search, interview preparation and analytics.";

export function CreateProjectModal({ isOpen, onClose, onSuccess }: CreateProjectModalProps) {
  const router = useRouter();
  const { user } = useAuth();

  // 5-Stage Logical Stepper Flow:
  // 01 METHOD -> 02 DETAILS -> 03 ASSIGNMENT -> 04 REVIEW -> (05 COMMIT)
  const [stage, setStage] = useState<CreationStage>("METHOD");

  // Shared Canonical Project Draft State (Preserved across all method switches)
  const [draft, setDraft] = useState<ProjectDraft>(DEFAULT_PROJECT_DRAFT);

  // Method Switch Confirmation Dialog State
  const [pendingMethod, setPendingMethod] = useState<CreationMethod | null>(null);
  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false);

  // Prompt UI Local States
  const [promptText, setPromptText] = useState("");
  const [showAddDetails, setShowAddDetails] = useState(false);

  // Requirement & Deliverable Input State
  const [newRequirement, setNewRequirement] = useState("");
  const [newDeliverable, setNewDeliverable] = useState("");
  const [newMilestone, setNewMilestone] = useState("");

  // System Action & Data States
  const [isStructuring, setIsStructuring] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [coCeoList, setCoCeoList] = useState<any[]>([]);

  // Reset & Fetch Assignees on Modal Open
  useEffect(() => {
    if (!isOpen) return;
    setStage("METHOD");
    setDraft(DEFAULT_PROJECT_DRAFT);
    setPendingMethod(null);
    setShowSwitchConfirm(false);
    setPromptText("");
    setShowAddDetails(false);
    setNewRequirement("");
    setNewDeliverable("");
    setNewMilestone("");
    setError(null);

    async function fetchCoCeos() {
      try {
        const res = await apiClient.get("/org/projects/eligible-assignees");
        if (Array.isArray(res.data?.coCeos)) setCoCeoList(res.data.coCeos);
      } catch {
        const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : null;
        if (wsId) {
          apiClient.get(`/organization/members?workspaceId=${wsId}`).then((res) => {
            if (res.data?.success && Array.isArray(res.data.data)) {
              setCoCeoList(res.data.data.filter((m: any) => String(m.role || m.workspaceRole || "").toUpperCase().includes("CO")));
            }
          }).catch(() => null);
        }
      }
    }

    fetchCoCeos();
  }, [isOpen]);

  const selectedCoCeo = useMemo(() => {
    return coCeoList.find((m) => m.id === draft.selectedCoCeoId || m.userId === draft.selectedCoCeoId);
  }, [coCeoList, draft.selectedCoCeoId]);

  // Method Switcher Trigger (Preserves Draft; asks confirmation if switching with non-empty inputs)
  const handleRequestSwitchMethod = (targetMethod: CreationMethod) => {
    if (targetMethod === draft.creationMethod) return;

    const hasData = Boolean(draft.title || draft.description || draft.requirements.length > 0 || promptText.trim());

    if (hasData) {
      setPendingMethod(targetMethod);
      setShowSwitchConfirm(true);
    } else {
      executeSwitchMethod(targetMethod, "KEEP");
    }
  };

  const executeSwitchMethod = (targetMethod: CreationMethod, mode: "KEEP" | "RESET") => {
    setShowSwitchConfirm(false);
    setPendingMethod(null);

    if (mode === "RESET") {
      setDraft({
        ...DEFAULT_PROJECT_DRAFT,
        creationMethod: targetMethod,
      });
      setPromptText("");
    } else {
      setDraft((prev) => ({
        ...prev,
        creationMethod: targetMethod,
      }));
    }
  };

  // Stage 01 -> Stage 02: Structure & Move to Details
  const handleProceedToDetails = async () => {
    if (draft.creationMethod === "PROMPT" && !promptText.trim()) {
      setError("Please describe your project brief before structuring.");
      return;
    }

    if (draft.creationMethod === "MANUAL" && !draft.title.trim()) {
      setError("Project Title is required.");
      return;
    }

    setIsStructuring(true);
    setError(null);

    try {
      if (draft.creationMethod === "PROMPT") {
        const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : undefined;
        const res = await apiClient.post(`/org/projects/parse-prompt-preview${wsId ? `?workspaceId=${wsId}` : ""}`, {
          prompt: promptText.trim(),
        }).catch(() => null);

        if (res?.data?.success && res.data?.data) {
          const d = res.data.data;
          setDraft((prev) => ({
            ...prev,
            title: prev.title || d.name || d.title || (promptText.length > 50 ? `${promptText.substring(0, 47)}...` : promptText),
            description: prev.description || d.description || `Project brief: "${promptText}"`,
            objective: prev.objective || d.objective || d.description || `Deliver project requirements for: "${promptText}"`,
            category: prev.category || d.category || "Development",
            priority: prev.priority || d.priority || "Medium",
            requirements: prev.requirements.length > 0 ? prev.requirements : (Array.isArray(d.requirements) && d.requirements.length > 0 ? d.requirements : ["User authentication & session management", "Multi-tenant workspace architecture"]),
            deliverables: prev.deliverables.length > 0 ? prev.deliverables : (Array.isArray(d.deliverables) && d.deliverables.length > 0 ? d.deliverables : ["Functional Next.js frontend", "Express API endpoints"]),
            toolsText: prev.toolsText || (Array.isArray(d.tools) ? d.tools.join(", ") : "Next.js, TypeScript, PostgreSQL"),
          }));
        } else {
          setDraft((prev) => ({
            ...prev,
            title: prev.title || (promptText.length > 50 ? `${promptText.substring(0, 47)}...` : promptText),
            description: prev.description || `Project brief: "${promptText}"`,
            objective: prev.objective || `Deliver project requirements for: "${promptText}"`,
          }));
        }
      }

      setStage("DETAILS");
    } catch {
      setDraft((prev) => ({
        ...prev,
        title: prev.title || (promptText.length > 50 ? `${promptText.substring(0, 47)}...` : promptText),
        description: prev.description || `Project brief: "${promptText}"`,
        objective: prev.objective || `Deliver project requirements for: "${promptText}"`,
      }));
      setStage("DETAILS");
    } finally {
      setIsStructuring(false);
    }
  };

  // Apply Blueprint Template
  const handleApplyTemplate = (tmpl: ProjectTemplateItem) => {
    const defaultDeadline = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split("T")[0];

    setDraft((prev) => ({
      ...prev,
      title: tmpl.name,
      description: tmpl.description,
      objective: tmpl.description,
      category: tmpl.category,
      priority: tmpl.defaultPriority,
      requirements: tmpl.defaultRequirements,
      deliverables: tmpl.defaultDeliverables,
      toolsText: tmpl.defaultTools.join(", "),
      milestones: tmpl.defaultMilestones,
      deadline: prev.deadline || defaultDeadline,
    }));

    setStage("DETAILS");
  };

  // Requirement & Deliverable Builders
  const handleAddRequirement = () => {
    if (!newRequirement.trim()) return;
    setDraft((prev) => ({ ...prev, requirements: [...prev.requirements, newRequirement.trim()] }));
    setNewRequirement("");
  };

  const handleRemoveRequirement = (idx: number) => {
    setDraft((prev) => ({ ...prev, requirements: prev.requirements.filter((_, i) => i !== idx) }));
  };

  const handleAddDeliverable = () => {
    if (!newDeliverable.trim()) return;
    setDraft((prev) => ({ ...prev, deliverables: [...prev.deliverables, newDeliverable.trim()] }));
    setNewDeliverable("");
  };

  const handleRemoveDeliverable = (idx: number) => {
    setDraft((prev) => ({ ...prev, deliverables: prev.deliverables.filter((_, i) => i !== idx) }));
  };

  const handleAddMilestone = () => {
    if (!newMilestone.trim()) return;
    setDraft((prev) => ({ ...prev, milestones: [...prev.milestones, newMilestone.trim()] }));
    setNewMilestone("");
  };

  const handleRemoveMilestone = (idx: number) => {
    setDraft((prev) => ({ ...prev, milestones: prev.milestones.filter((_, i) => i !== idx) }));
  };

  // Stage 04 -> Stage 05: Transactional Server Commit & Redirect
  const handleSubmitProject = async () => {
    if (!draft.title.trim()) {
      setError("Project Title is required.");
      return;
    }

    if (!draft.selectedCoCeoId && coCeoList.length > 0) {
      setError("Please select a CO-CEO Project Execution Lead.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : undefined;
      const payload = {
        name: draft.title.trim(),
        description: draft.description.trim() || null,
        objective: draft.objective.trim() || null,
        category: draft.category || "Development",
        priority: draft.priority || "Medium",
        targetDeadline: draft.deadline || null,
        constraints: draft.constraintsText ? draft.constraintsText.split("\n").filter(Boolean) : [],
        githubUrl: draft.githubUrl.trim() || null,
        tools: draft.toolsText ? draft.toolsText.split(",").map((t) => t.trim()).filter(Boolean) : [],
        requirements: draft.requirements,
        deliverables: draft.deliverables,
        milestones: draft.milestones.map((m, idx) => ({ title: m, order: idx + 1 })),
        creationMode: draft.creationMethod,
        responsibleCoCeoId: draft.selectedCoCeoId || null,
        coCeoInChargeId: draft.selectedCoCeoId || null,
      };

      const res = await apiClient.post(`/org/projects/create-v2${wsId ? `?workspaceId=${wsId}` : ""}`, payload);

      if (res.data?.success || res.data?.projectId || res.data?.data?.id) {
        const createdId = res.data.projectId || res.data?.data?.id || res.data?.project?.id;
        if (onSuccess) onSuccess(res.data);
        onClose();

        if (createdId) {
          const basePath = typeof window !== "undefined" && window.location.pathname.startsWith("/co-ceo") ? "/co-ceo" : "/ceo";
          router.push(`${basePath}/projects/${createdId}`);
        }
      } else {
        setError(res.data?.error || "Project could not be created. Please review required fields.");
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || "Project could not be created. Please check connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <GlobalSheet
      open={isOpen}
      onClose={onClose}
      title="Create Project"
      subtitle="Turn your idea into a structured project for Organization Workspace."
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
            <button type="button" onClick={() => setError(null)} className="text-rose-500 hover:text-foreground cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── METHOD SWITCH CONFIRMATION DIALOG MODAL ────────────────────────── */}
        {showSwitchConfirm && pendingMethod && (
          <div className="p-4 rounded-xl border border-[#C9A52A] bg-[#FFFFFF] dark:bg-[#15181D] space-y-3 shadow-md animate-in fade-in duration-150">
            <div className="flex items-center gap-2 text-[#C9A52A] font-bold text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Switch Creation Method?</span>
            </div>
            <p className="text-xs text-[#667085] dark:text-[#8B94A3] leading-relaxed">
              How would you like to handle your existing project details when switching to <strong>{pendingMethod}</strong>?
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowSwitchConfirm(false)}
                className="px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-xs font-semibold text-[#667085] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeSwitchMethod(pendingMethod, "RESET")}
                className="px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-600 border border-rose-500/20 text-xs font-bold cursor-pointer"
              >
                Start Fresh
              </button>
              <button
                type="button"
                onClick={() => executeSwitchMethod(pendingMethod, "KEEP")}
                className="px-3.5 py-1.5 rounded-lg bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] font-bold text-xs cursor-pointer"
              >
                Keep Details
              </button>
            </div>
          </div>
        )}

        {/* ── 5-STAGE STEPPER HEADER NAVIGATION ────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-[#E5E7EB] dark:border-[#24282E] pb-3 text-[11px] font-mono font-bold tracking-wider">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStage("METHOD")}
              className={`cursor-pointer hover:underline ${stage === "METHOD" ? "text-[#C9A52A] dark:text-[#D4B12F]" : "text-[#667085]"}`}
            >
              01 METHOD
            </button>
            <span className="text-[#667085]">•</span>
            <button
              type="button"
              onClick={() => { if (draft.title || promptText.trim()) setStage("DETAILS"); }}
              disabled={!draft.title && !promptText.trim()}
              className={`cursor-pointer hover:underline disabled:opacity-40 disabled:no-underline ${stage === "DETAILS" ? "text-[#C9A52A] dark:text-[#D4B12F]" : "text-[#667085]"}`}
            >
              02 DETAILS
            </button>
            <span className="text-[#667085]">•</span>
            <button
              type="button"
              onClick={() => { if (draft.title) setStage("ASSIGNMENT"); }}
              disabled={!draft.title}
              className={`cursor-pointer hover:underline disabled:opacity-40 disabled:no-underline ${stage === "ASSIGNMENT" ? "text-[#C9A52A] dark:text-[#D4B12F]" : "text-[#667085]"}`}
            >
              03 ASSIGNMENT
            </button>
            <span className="text-[#667085]">•</span>
            <button
              type="button"
              onClick={() => { if (draft.title) setStage("REVIEW"); }}
              disabled={!draft.title}
              className={`cursor-pointer hover:underline disabled:opacity-40 disabled:no-underline ${stage === "REVIEW" ? "text-[#C9A52A] dark:text-[#D4B12F]" : "text-[#667085]"}`}
            >
              04 REVIEW
            </button>
          </div>
        </div>

        {/* ── STAGE 01: METHOD & EDITOR PANEL ───────────────────────────────── */}
        {stage === "METHOD" && (
          <div className="space-y-4">
            
            {/* COMPACT SEGMENTED METHOD SELECTOR (ALWAYS VISIBLE & CLICKABLE) */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#667085] dark:text-[#8B94A3] block">
                Creation Method
              </span>
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[#F3F4F6] dark:bg-[#1C2027] border border-[#E5E7EB] dark:border-[#24282E] text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => handleRequestSwitchMethod("PROMPT")}
                  className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    draft.creationMethod === "PROMPT"
                      ? "bg-[#FFFFFF] dark:bg-[#15181D] text-[#C9A52A] dark:text-[#D4B12F] border border-[#C9A52A]/40 shadow-2xs font-bold"
                      : "text-[#667085] dark:text-[#8B94A3] hover:text-[#17202A]"
                  }`}
                >
                  <MessageSquareText className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Prompt Based</span>
                  <span className="inline sm:hidden">Prompt</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRequestSwitchMethod("TEMPLATE")}
                  className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    draft.creationMethod === "TEMPLATE"
                      ? "bg-[#FFFFFF] dark:bg-[#15181D] text-[#C9A52A] dark:text-[#D4B12F] border border-[#C9A52A]/40 shadow-2xs font-bold"
                      : "text-[#667085] dark:text-[#8B94A3] hover:text-[#17202A]"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Template Based</span>
                  <span className="inline sm:hidden">Template</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRequestSwitchMethod("MANUAL")}
                  className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    draft.creationMethod === "MANUAL"
                      ? "bg-[#FFFFFF] dark:bg-[#15181D] text-[#C9A52A] dark:text-[#D4B12F] border border-[#C9A52A]/40 shadow-2xs font-bold"
                      : "text-[#667085] dark:text-[#8B94A3] hover:text-[#17202A]"
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Manual Setup</span>
                  <span className="inline sm:hidden">Manual</span>
                </button>
              </div>
            </div>

            {/* METHOD A: PROMPT BASED EDITOR */}
            {draft.creationMethod === "PROMPT" && (
              <div className="space-y-4 pt-1">
                <div className="space-y-1">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#667085] dark:text-[#8B94A3] block">
                    PROJECT BRIEF
                  </span>
                  <p className="text-xs text-[#667085] dark:text-[#8B94A3]">
                    Describe what you want to build, accomplish, or deliver.
                  </p>
                </div>

                <textarea
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  placeholder="Build an AI-powered interview platform for students with authentication, company search, interview preparation, analytics, and a responsive mobile experience."
                  className="w-full h-32 p-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#24282E] bg-[#FFFFFF] dark:bg-[#15181D] text-xs text-[#17202A] dark:text-[#F2F3F5] placeholder:text-[#9AA2AF] focus:outline-none focus:border-[#C9A52A] resize-none leading-relaxed"
                />

                {/* Progressive Disclosure: + Add details */}
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setShowAddDetails(!showAddDetails)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#C9A52A] dark:text-[#D4B12F] hover:underline cursor-pointer"
                  >
                    {showAddDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    <span>+ Add details</span>
                  </button>

                  {showAddDetails && (
                    <div className="p-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#24282E] bg-[#F8F9FA] dark:bg-[#1C2027] space-y-3 animate-in fade-in duration-150">
                      <div className="grid grid-cols-3 gap-2.5">
                        <div>
                          <label className="text-[10px] font-mono font-bold text-[#667085] uppercase block mb-1">Category</label>
                          <select
                            value={draft.category}
                            onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                            className="w-full h-8 px-2 rounded-lg border border-[#E5E7EB] dark:border-[#24282E] bg-[#FFFFFF] dark:bg-[#15181D] text-[11px]"
                          >
                            <option value="Development">Development</option>
                            <option value="Full Stack">Full Stack</option>
                            <option value="Backend">Backend</option>
                            <option value="Design">Design</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-mono font-bold text-[#667085] uppercase block mb-1">Priority</label>
                          <select
                            value={draft.priority}
                            onChange={(e) => setDraft({ ...draft, priority: e.target.value as any })}
                            className="w-full h-8 px-2 rounded-lg border border-[#E5E7EB] dark:border-[#24282E] bg-[#FFFFFF] dark:bg-[#15181D] text-[11px]"
                          >
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                            <option value="Critical">Critical</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-mono font-bold text-[#667085] uppercase block mb-1">Deadline</label>
                          <input
                            type="date"
                            value={draft.deadline}
                            onChange={(e) => setDraft({ ...draft, deadline: e.target.value })}
                            className="w-full h-8 px-2 rounded-lg border border-[#E5E7EB] dark:border-[#24282E] bg-[#FFFFFF] dark:bg-[#15181D] text-[11px]"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono font-bold text-[#667085] uppercase block">Technology Stack</label>
                        <input
                          type="text"
                          value={draft.toolsText}
                          onChange={(e) => setDraft({ ...draft, toolsText: e.target.value })}
                          placeholder="e.g. Next.js, TypeScript, PostgreSQL"
                          className="w-full h-8 px-2.5 rounded-lg border border-[#E5E7EB] dark:border-[#24282E] bg-[#FFFFFF] dark:bg-[#15181D] text-[11px] font-mono"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Single Compact Sample Chip */}
                <div className="pt-1">
                  <span className="text-[10.5px] font-mono font-semibold text-[#667085] dark:text-[#8B94A3] block mb-1.5">
                    Try an example:
                  </span>
                  <button
                    type="button"
                    onClick={() => setPromptText(SINGLE_SAMPLE_PROMPT)}
                    className="p-2 rounded-xl bg-[#F3F4F6] dark:bg-[#20252C] border border-[#E5E7EB] dark:border-[#24282E] text-[11px] text-[#667085] dark:text-[#8B94A3] hover:text-[#17202A] text-left cursor-pointer transition-all block w-full"
                  >
                    "{SINGLE_SAMPLE_PROMPT}"
                  </button>
                </div>

                {/* Primary Action CTA */}
                <div className="flex justify-end pt-3 border-t border-[#E5E7EB] dark:border-[#24282E]">
                  <button
                    type="button"
                    onClick={handleProceedToDetails}
                    disabled={isStructuring || !promptText.trim()}
                    className="px-6 py-2.5 rounded-xl bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] font-extrabold text-xs hover:brightness-105 transition-all flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {isStructuring ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                    <span>Structure Project →</span>
                  </button>
                </div>
              </div>
            )}

            {/* METHOD B: TEMPLATE BASED EDITOR */}
            {draft.creationMethod === "TEMPLATE" && (
              <div className="space-y-3 pt-1">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#667085] dark:text-[#8B94A3] block">
                  CHOOSE BLUEPRINT TEMPLATE
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {PROJECT_TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => handleApplyTemplate(tmpl)}
                      className="p-3 rounded-xl border border-[#E5E7EB] dark:border-[#24282E] bg-[#FFFFFF] dark:bg-[#15181D] hover:bg-[#F8F9FA] dark:hover:bg-[#1C2027] hover:border-[#C9A52A]/40 transition-all text-left space-y-1.5 cursor-pointer group shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-[#17202A] dark:text-[#F2F3F5] group-hover:text-[#C9A52A]">
                          {tmpl.name}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#F3F4F6] dark:bg-[#20252C] text-[#667085]">
                          {tmpl.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#667085] dark:text-[#8B94A3] line-clamp-2 leading-relaxed">
                        {tmpl.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* METHOD C: MANUAL SETUP EDITOR */}
            {draft.creationMethod === "MANUAL" && (
              <div className="space-y-3 pt-1">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#667085] dark:text-[#8B94A3]">
                    Project Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={draft.title}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                    placeholder="e.g. ManMadhan Progress Core V1"
                    className="w-full h-10 px-3 rounded-lg border border-[#E5E7EB] dark:border-[#24282E] bg-[#FFFFFF] dark:bg-[#15181D] text-xs font-semibold text-[#17202A] dark:text-[#F2F3F5] placeholder:text-[#9AA2AF] focus:outline-none focus:border-[#C9A52A]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#667085] dark:text-[#8B94A3]">
                    Description & Objectives
                  </label>
                  <textarea
                    value={draft.description}
                    onChange={(e) => setDraft({ ...draft, description: e.target.value, objective: e.target.value })}
                    placeholder="Detailed project vision, goals, and execution scope..."
                    className="w-full h-20 p-2.5 rounded-lg border border-[#E5E7EB] dark:border-[#24282E] bg-[#FFFFFF] dark:bg-[#15181D] text-xs text-[#17202A] dark:text-[#F2F3F5] placeholder:text-[#9AA2AF] focus:outline-none focus:border-[#C9A52A] resize-none"
                  />
                </div>

                <div className="flex justify-end pt-3 border-t border-[#E5E7EB] dark:border-[#24282E]">
                  <button
                    type="button"
                    onClick={handleProceedToDetails}
                    disabled={!draft.title.trim()}
                    className="px-6 py-2.5 rounded-xl bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] font-extrabold text-xs hover:brightness-105 transition-all flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <span>Continue to Details →</span>
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ── STAGE 02: DETAILS (EDITABLE STRUCTURED PROJECT DRAFT) ─────────────── */}
        {stage === "DETAILS" && (
          <div className="space-y-4">
            <div className="space-y-1 border-b border-[#E5E7EB] dark:border-[#24282E] pb-2">
              <h3 className="text-sm font-bold text-[#17202A] dark:text-[#F2F3F5]">Project Blueprint Details</h3>
              <p className="text-xs text-[#667085] dark:text-[#8B94A3]">Review and fine-tune structured project parameters.</p>
            </div>

            {/* SECTION A: PROJECT */}
            <div className="p-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#24282E] bg-[#FFFFFF] dark:bg-[#15181D] space-y-2.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#667085] dark:text-[#8B94A3] block">
                PROJECT
              </span>

              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-[#667085]">Title <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  placeholder="Project title..."
                  className="w-full h-8 px-2.5 rounded-lg border border-[#E5E7EB] dark:border-[#24282E] bg-[#F8F9FA] dark:bg-[#1C2027] text-xs font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-[#667085]">Description & Objective</label>
                <textarea
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value, objective: e.target.value })}
                  className="w-full h-16 p-2 rounded-lg border border-[#E5E7EB] dark:border-[#24282E] bg-[#F8F9FA] dark:bg-[#1C2027] text-xs resize-none"
                />
              </div>
            </div>

            {/* SECTION B: DETAILS */}
            <div className="p-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#24282E] bg-[#FFFFFF] dark:bg-[#15181D] space-y-2.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#667085] dark:text-[#8B94A3] block">
                DETAILS & CONTROLS
              </span>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[10px] font-mono text-[#667085] block mb-1">Category</label>
                  <select
                    value={draft.category}
                    onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                    className="w-full h-8 px-2 rounded-lg border border-[#E5E7EB] dark:border-[#24282E] bg-[#F8F9FA] dark:bg-[#1C2027] text-[11px]"
                  >
                    <option value="Development">Development</option>
                    <option value="Full Stack">Full Stack</option>
                    <option value="Backend">Backend</option>
                    <option value="Design">Design</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-mono text-[#667085] block mb-1">Priority</label>
                  <select
                    value={draft.priority}
                    onChange={(e) => setDraft({ ...draft, priority: e.target.value as any })}
                    className="w-full h-8 px-2 rounded-lg border border-[#E5E7EB] dark:border-[#24282E] bg-[#F8F9FA] dark:bg-[#1C2027] text-[11px]"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-mono text-[#667085] block mb-1">Deadline</label>
                  <input
                    type="date"
                    value={draft.deadline}
                    onChange={(e) => setDraft({ ...draft, deadline: e.target.value })}
                    className="w-full h-8 px-2 rounded-lg border border-[#E5E7EB] dark:border-[#24282E] bg-[#F8F9FA] dark:bg-[#1C2027] text-[11px]"
                  />
                </div>
              </div>
            </div>

            {/* SECTION C: SCOPE (Requirements & Deliverables) */}
            <div className="p-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#24282E] bg-[#FFFFFF] dark:bg-[#15181D] space-y-2.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#667085] dark:text-[#8B94A3] block">
                SCOPE (REQUIREMENTS & DELIVERABLES)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1.5">
                  <label className="text-[10.5px] font-mono text-[#667085]">Requirements</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={newRequirement}
                      onChange={(e) => setNewRequirement(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddRequirement(); } }}
                      placeholder="Add requirement..."
                      className="flex-1 h-7 px-2 rounded border border-[#E5E7EB] dark:border-[#24282E] bg-[#F8F9FA] dark:bg-[#1C2027] text-[11px]"
                    />
                    <button type="button" onClick={handleAddRequirement} className="px-2 h-7 rounded bg-[#F3F4F6] text-[11px] font-bold">Add</button>
                  </div>
                  {draft.requirements.length > 0 && (
                    <div className="space-y-1 max-h-[80px] overflow-y-auto pr-0.5">
                      {draft.requirements.map((r, idx) => (
                        <div key={idx} className="flex items-center justify-between p-1 rounded bg-[#F8F9FA] dark:bg-[#1C2027] text-[10.5px] font-mono">
                          <span className="truncate">• {r}</span>
                          <button type="button" onClick={() => handleRemoveRequirement(idx)} className="text-rose-500 ml-1"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10.5px] font-mono text-[#667085]">Deliverables</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={newDeliverable}
                      onChange={(e) => setNewDeliverable(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddDeliverable(); } }}
                      placeholder="Add deliverable..."
                      className="flex-1 h-7 px-2 rounded border border-[#E5E7EB] dark:border-[#24282E] bg-[#F8F9FA] dark:bg-[#1C2027] text-[11px]"
                    />
                    <button type="button" onClick={handleAddDeliverable} className="px-2 h-7 rounded bg-[#F3F4F6] text-[11px] font-bold">Add</button>
                  </div>
                  {draft.deliverables.length > 0 && (
                    <div className="space-y-1 max-h-[80px] overflow-y-auto pr-0.5">
                      {draft.deliverables.map((d, idx) => (
                        <div key={idx} className="flex items-center justify-between p-1 rounded bg-[#F8F9FA] dark:bg-[#1C2027] text-[10.5px] font-mono">
                          <span className="truncate">• {d}</span>
                          <button type="button" onClick={() => handleRemoveDeliverable(idx)} className="text-rose-500 ml-1"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* STAGE 02 ACTIONS */}
            <div className="flex items-center justify-between pt-2 border-t border-[#E5E7EB] dark:border-[#24282E]">
              <button
                type="button"
                onClick={() => setStage("METHOD")}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#667085] dark:text-[#8B94A3] hover:text-[#17202A] cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Edit Method
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!draft.title.trim()) {
                    setError("Project Title is required.");
                    return;
                  }
                  setError(null);
                  setStage("ASSIGNMENT");
                }}
                className="px-5 py-2.5 rounded-xl bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] font-extrabold text-xs hover:brightness-105 transition-all flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <span>Continue to Assignment →</span>
              </button>
            </div>

          </div>
        )}

        {/* ── STAGE 03: ASSIGNMENT (CO-CEO PROJECT EXECUTION LEAD) ────────────── */}
        {stage === "ASSIGNMENT" && (
          <div className="space-y-4">
            <div className="space-y-1 border-b border-[#E5E7EB] dark:border-[#24282E] pb-2">
              <h3 className="text-sm font-bold text-[#17202A] dark:text-[#F2F3F5]">Project Execution Lead</h3>
              <p className="text-xs text-[#667085] dark:text-[#8B94A3]">
                The CEO selects ONE CO-CEO to manage execution authority for this project.
              </p>
            </div>

            {/* CO-CEO Selection Cards */}
            <div className="space-y-2">
              <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#667085] dark:text-[#8B94A3]">
                Select CO-CEO Lead <span className="text-rose-500">*</span>
              </label>

              {coCeoList.length === 0 ? (
                <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-mono text-[11px]">
                  No CO-CEOs currently available in this organization workspace.
                </div>
              ) : (
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {coCeoList.map((m) => {
                    const mId = m.id || m.userId;
                    const isSelected = draft.selectedCoCeoId === mId;
                    return (
                      <button
                        key={mId}
                        type="button"
                        onClick={() => setDraft((prev) => ({ ...prev, selectedCoCeoId: mId }))}
                        className={`w-full p-3 rounded-xl border transition-all text-left flex items-center justify-between gap-3 cursor-pointer ${
                          isSelected
                            ? "bg-[#C9A52A]/10 dark:bg-[#D4B12F]/10 border-[#C9A52A] dark:border-[#D4B12F] shadow-xs"
                            : "bg-[#FFFFFF] dark:bg-[#15181D] border-[#E5E7EB] dark:border-[#24282E] hover:bg-[#F8F9FA]"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-[#C9A52A]/20 text-[#C9A52A] font-bold flex items-center justify-center shrink-0">
                            {(m.name || m.displayName || m.email || "C").charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-xs text-[#17202A] dark:text-[#F2F3F5] block truncate">
                              {m.name || m.displayName || m.email}
                            </span>
                            <span className="text-[10px] font-mono text-[#667085]">
                              {m.email}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#C9A52A]/15 text-[#C9A52A]">
                            CO-CEO
                          </span>
                          {isSelected && <Check className="w-4 h-4 text-[#C9A52A]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Selected CO-CEO Authority Summary Card */}
            {selectedCoCeo && (
              <div className="p-3.5 rounded-xl border border-[#C9A52A]/40 bg-[#FFFFFF] dark:bg-[#15181D] space-y-1.5 font-mono text-[11px] shadow-xs">
                <div className="flex items-center gap-2 text-[#C9A52A] font-bold uppercase">
                  <UserCheck className="w-4 h-4" />
                  <span>AUTHORITY ASSIGNMENT</span>
                </div>
                <p className="text-xs text-[#17202A] dark:text-[#F2F3F5] leading-relaxed font-sans">
                  <strong>{selectedCoCeo.name || selectedCoCeo.displayName}</strong> will manage execution for this project and assign work to eligible Members.
                </p>
              </div>
            )}

            {/* STAGE 03 ACTIONS */}
            <div className="flex items-center justify-between pt-2 border-t border-[#E5E7EB] dark:border-[#24282E]">
              <button
                type="button"
                onClick={() => setStage("DETAILS")}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#667085] dark:text-[#8B94A3] hover:text-[#17202A] cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Details
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!draft.selectedCoCeoId && coCeoList.length > 0) {
                    setError("Please select a CO-CEO Project Execution Lead.");
                    return;
                  }
                  setError(null);
                  setStage("REVIEW");
                }}
                className="px-5 py-2.5 rounded-xl bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] font-extrabold text-xs hover:brightness-105 transition-all flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <span>Review Project →</span>
              </button>
            </div>

          </div>
        )}

        {/* ── STAGE 04: REVIEW & COMMIT (REVIEW PROJECT) ───────────────────────── */}
        {stage === "REVIEW" && (
          <div className="space-y-4">
            <div className="space-y-1 border-b border-[#E5E7EB] dark:border-[#24282E] pb-2">
              <h3 className="text-sm font-bold text-[#17202A] dark:text-[#F2F3F5]">Review Project</h3>
              <p className="text-xs text-[#667085] dark:text-[#8B94A3]">Verify parameters before final project creation.</p>
            </div>

            {/* SUMMARY SECTIONS */}
            <div className="p-4 rounded-xl border border-[#C9A52A]/40 dark:border-[#D4B12F]/40 bg-[#FFFFFF] dark:bg-[#15181D] shadow-xs space-y-3 font-mono text-[11px]">
              
              {/* SOURCE METHOD BADGE */}
              <div className="flex items-center justify-between border-b border-[#E5E7EB] dark:border-[#24282E] pb-2">
                <span className="font-bold uppercase tracking-wider text-[#C9A52A] dark:text-[#D4B12F]">SOURCE METHOD</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#C9A52A]/15 text-[#C9A52A] border border-[#C9A52A]/30">
                  {draft.creationMethod} BASED
                </span>
              </div>

              {/* PROJECT */}
              <div className="space-y-1 border-b border-[#E5E7EB] dark:border-[#24282E] pb-2">
                <span className="font-bold uppercase tracking-wider text-[#C9A52A] dark:text-[#D4B12F]">PROJECT</span>
                <div className="text-[#17202A] dark:text-[#F2F3F5]">Title: <strong className="font-sans font-bold">{draft.title}</strong></div>
                <div className="text-[#667085]">Objective: <span className="text-[#17202A] dark:text-[#F2F3F5] font-sans">{draft.objective || draft.description || "—"}</span></div>
              </div>

              {/* EXECUTION */}
              <div className="space-y-1 border-b border-[#E5E7EB] dark:border-[#24282E] pb-2">
                <span className="font-bold uppercase tracking-wider text-[#C9A52A] dark:text-[#D4B12F]">EXECUTION</span>
                <div className="grid grid-cols-2 gap-2 text-[#667085]">
                  <div>Project Lead: <strong className="text-[#17202A] dark:text-[#F2F3F5] font-sans">{selectedCoCeo ? (selectedCoCeo.name || selectedCoCeo.displayName) : "Unassigned"}</strong></div>
                  <div>Priority: <strong className="text-[#17202A] dark:text-[#F2F3F5]">{draft.priority}</strong></div>
                  <div>Deadline: <strong className="text-[#17202A] dark:text-[#F2F3F5]">{draft.deadline || "Not set"}</strong></div>
                  <div>Category: <strong className="text-[#17202A] dark:text-[#F2F3F5]">{draft.category}</strong></div>
                </div>
              </div>

              {/* SCOPE */}
              <div className="space-y-1 border-b border-[#E5E7EB] dark:border-[#24282E] pb-2">
                <span className="font-bold uppercase tracking-wider text-[#C9A52A] dark:text-[#D4B12F]">SCOPE</span>
                <div className="grid grid-cols-2 gap-2 text-[#667085]">
                  <div>Requirements: <strong className="text-[#17202A] dark:text-[#F2F3F5]">{draft.requirements.length} items</strong></div>
                  <div>Deliverables: <strong className="text-[#17202A] dark:text-[#F2F3F5]">{draft.deliverables.length} items</strong></div>
                </div>
              </div>

              {/* ACCESS GOVERNANCE */}
              <div className="space-y-1 pt-1">
                <span className="font-bold uppercase tracking-wider text-[#C9A52A] dark:text-[#D4B12F]">ACCESS GOVERNANCE</span>
                <div className="text-[#667085] leading-relaxed">
                  CEO → Selected CO-CEO (<span className="text-[#17202A] dark:text-[#F2F3F5] font-bold">{selectedCoCeo ? (selectedCoCeo.name || selectedCoCeo.displayName) : "Project Lead"}</span>) → Members (assigned through tasks)
                </div>
              </div>

            </div>

            {/* STAGE 04 ACTIONS */}
            <div className="flex items-center justify-between pt-2 border-t border-[#E5E7EB] dark:border-[#24282E]">
              <button
                type="button"
                onClick={() => setStage("ASSIGNMENT")}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#667085] dark:text-[#8B94A3] hover:text-[#17202A] cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>

              <button
                type="button"
                onClick={handleSubmitProject}
                disabled={isSubmitting || !draft.title.trim()}
                className="px-6 py-2.5 rounded-xl bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] font-extrabold text-xs hover:brightness-105 active:scale-[0.99] transition-all flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-40"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Create Project</span>
              </button>
            </div>

          </div>
        )}

      </div>
    </GlobalSheet>
  );
}
