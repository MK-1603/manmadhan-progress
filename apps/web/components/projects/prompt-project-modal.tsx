"use client";

import React, { useState } from "react";
import apiClient from "@/lib/api-client";
import { GlobalSheet } from "@/components/ui/global-sheet";
import { useAuth } from "@/components/auth/auth-context";
import { X, Sparkles, Loader2, AlertCircle, Plus, Calendar, Flag, CheckCircle2, Shield, User, Code, FileText } from "lucide-react";

interface MilestoneItem {
  name: string;
  description: string;
  deadline: string;
}

interface FeatureItem {
  name: string;
  description: string;
  priority: string;
}

interface RequirementItem {
  title: string;
  description?: string;
  category?: string;
}

interface TaskItem {
  title: string;
  description?: string;
  priority?: string;
  estimatedMinutes?: number;
  deadline?: string;
  type?: string;
  requiresDocument?: boolean;
  requiresGithub?: boolean;
}

interface DocumentItem {
  docType: string;
  title: string;
  status: string;
}

interface PromptPlanData {
  project: {
    name: string;
    objective: string;
    description: string;
    scope: string[];
    outOfScope: string[];
    startDate: string;
    deadline: string;
    priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    riskLevel: "LOW" | "MEDIUM" | "HIGH";
  };
  features?: FeatureItem[];
  milestones: MilestoneItem[];
  requirements: RequirementItem[];
  deliverables: string[];
  tasks: TaskItem[];
  dependencies: Array<{ taskTitle: string; dependsOnTaskTitle: string }>;
  risks: string[];
  documents: DocumentItem[];
  assignmentOptions?: Array<{ id: string; name: string; role: string }>;
}

interface PromptProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (project: any) => void;
  workspaceType: "PERSONAL" | "ORGANIZATION";
}

export default function PromptProjectModal({
  isOpen,
  onClose,
  onSuccess,
  workspaceType,
}: PromptProjectModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<"PROMPT" | "GENERATING" | "REVIEW">("PROMPT");
  const [promptInput, setPromptInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [plan, setPlan] = useState<PromptPlanData | null>(null);

  const [selectedOwnerId, setSelectedOwnerId] = useState("");

  React.useEffect(() => {
    if (isOpen) {
      setStep("PROMPT");
      setPromptInput("");
      setPlan(null);
      setErrorMsg("");
      setLoading(false);
      setSelectedOwnerId("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGeneratePlan = async () => {
    if (!promptInput.trim()) {
      setErrorMsg("Please enter a project description prompt.");
      return;
    }
    setErrorMsg("");
    setStep("GENERATING");
    setLoading(true);

    try {
      const endpoint =
        workspaceType === "ORGANIZATION"
          ? "/org/projects/plan-from-prompt"
          : "/personal/projects/generate-plan";

      const res = await apiClient.post(endpoint, { prompt: promptInput });
      if (res.data?.success && res.data?.data) {
        const generated: PromptPlanData = res.data.data;
        setPlan(generated);
        // Exclude current logged in user (Self-Assignment Rule)
        const validOptions = (generated.assignmentOptions || []).filter(opt => opt.id !== user?.id);
        if (validOptions.length > 0) {
          setSelectedOwnerId(validOptions[0].id);
        }
        setStep("REVIEW");
      } else {
        throw new Error(res.data?.error || "Failed to generate plan");
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message || "Failed to parse project prompt.");
      setStep("PROMPT");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCreate = async () => {
    if (!plan) return;
    setLoading(true);
    setErrorMsg("");

    try {
      if (workspaceType === "ORGANIZATION") {
        const payload = {
          name: plan.project.name,
          objective: plan.project.objective,
          description: plan.project.description,
          scope: plan.project.scope,
          outOfScope: plan.project.outOfScope,
          startDate: plan.project.startDate,
          deadline: plan.project.deadline,
          priority: plan.project.priority,
          riskLevel: plan.project.riskLevel,
          assigneeId: selectedOwnerId || undefined,
          milestones: plan.milestones,
          requirements: plan.requirements,
          documents: plan.documents,
          tasks: plan.tasks,
        };
        const res = await apiClient.post("/org/projects", payload);
        if (res.data?.success) {
          onSuccess(res.data.data);
          onClose();
        } else {
          throw new Error(res.data?.error || "Failed to create project");
        }
      } else {
        // Personal project
        const payload = {
          name: plan.project.name,
          goal: plan.project.objective,
          description: plan.project.description,
          deadline: plan.project.deadline,
          priority: plan.project.priority,
          milestones: plan.milestones,
          tasks: plan.tasks,
        };
        const res = await apiClient.post("/personal/projects/create-from-plan", payload);
        if (res.data?.success) {
          onSuccess(res.data.data);
          onClose();
        } else {
          throw new Error(res.data?.error || "Failed to create personal project");
        }
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message || "Failed to confirm and create project.");
    } finally {
      setLoading(false);
    }
  };

  // Helper mutators for Review Page
  const updateProjectField = (field: string, value: any) => {
    if (!plan) return;
    setPlan({
      ...plan,
      project: {
        ...plan.project,
        [field]: value,
      },
    });
  };

  const handleAddMilestone = () => {
    if (!plan) return;
    const newM: MilestoneItem = {
      name: `Milestone ${plan.milestones.length + 1}`,
      description: "Milestone objective",
      deadline: plan.project.deadline,
    };
    setPlan({ ...plan, milestones: [...plan.milestones, newM] });
  };

  const handleRemoveMilestone = (index: number) => {
    if (!plan) return;
    const updated = plan.milestones.filter((_, i) => i !== index);
    setPlan({ ...plan, milestones: updated });
  };

  const handleUpdateMilestone = (index: number, field: string, val: string) => {
    if (!plan) return;
    const updated = [...plan.milestones];
    updated[index] = { ...updated[index], [field]: val };
    setPlan({ ...plan, milestones: updated });
  };

  const subtitleText = workspaceType === "ORGANIZATION" ? "ORGANIZATION MANDATE" : "PERSONAL WORKSPACE";
  const titleText =
    step === "PROMPT"
      ? "Create Project from Prompt"
      : step === "GENERATING"
      ? "Structuring Execution Mandate..."
      : "Review Project Mandate";

  const footer = (
    <div className="flex items-center justify-between w-full">
      {step === "PROMPT" && (
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleGeneratePlan}
            disabled={loading}
            className="px-5 py-2.5 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition-all shadow-md disabled:opacity-50 flex items-center gap-1.5"
          >
            <span>Generate Plan</span>
            <span>→</span>
          </button>
        </>
      )}

      {step === "REVIEW" && (
        <>
          <button
            onClick={() => setStep("PROMPT")}
            className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to Edit Prompt
          </button>
          <button
            onClick={handleConfirmCreate}
            disabled={loading}
            className="px-6 py-2.5 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition-all shadow-lg disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            <span>{loading ? "Creating Project..." : "Confirm & Create Project"}</span>
          </button>
        </>
      )}
    </div>
  );

  return (
    <GlobalSheet
      open={isOpen}
      onClose={onClose}
      title={titleText}
      subtitle={subtitleText}
      footerActions={step !== "GENERATING" ? footer : undefined}
      desktopMode="modal"
      desktopMaxWidth="max-w-3xl"
    >
      <div className="space-y-5 text-sm">
        {errorMsg && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: PROMPT INPUT */}
        {step === "PROMPT" && (
          <div className="space-y-4">
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Describe your project naturally. The system will convert your intent into a structured project plan with milestones, dates, tasks, and document specs.
            </p>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wider">
                Project Prompt Input
              </label>
              <textarea
                rows={5}
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                placeholder='e.g., "Build the ManMadhan Hub website by September 30. The project should include frontend, backend, authentication, database, deployment, testing and documentation."'
                className="w-full bg-background border border-border rounded-xl p-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors resize-none"
              />
            </div>

            <div className="bg-muted/40 border border-border p-3.5 rounded-xl text-xs space-y-2">
              <span className="font-bold text-foreground uppercase tracking-wider text-[10px] block">
                Quick Preset Prompt Templates (Click to apply):
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setPromptInput("Build ManMadhan Progress Hub platform with core task engine, project features, PRD/TRD document specs, and GitHub PR evidence tracking by October 15.")}
                  className="px-2.5 py-1 bg-background border border-border rounded-lg text-foreground text-[11px] hover:border-amber-500 hover:text-amber-500 transition-colors text-left"
                >
                  🚀 ManMadhan Progress Hub
                </button>
                <button
                  type="button"
                  onClick={() => setPromptInput("Build high-throughput payment gateway service with API specs, security audit, and integration test suite.")}
                  className="px-2.5 py-1 bg-background border border-border rounded-lg text-foreground text-[11px] hover:border-amber-500 hover:text-amber-500 transition-colors text-left"
                >
                  💳 Payment Gateway Microservice
                </button>
                <button
                  type="button"
                  onClick={() => setPromptInput("Develop cross-platform Mobile App for inventory control with barcode scanning and real-time offline sync.")}
                  className="px-2.5 py-1 bg-background border border-border rounded-lg text-foreground text-[11px] hover:border-amber-500 hover:text-amber-500 transition-colors text-left"
                >
                  📱 Mobile Inventory App
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: GENERATING LOADING STATE */}
        {step === "GENERATING" && (
          <div className="py-14 flex flex-col items-center justify-center text-center space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
            <div>
              <h3 className="text-base font-semibold text-foreground">Analyzing Natural Language Prompt</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Extracting objectives, calculating date boundaries, structuring milestones & requirements...
              </p>
            </div>
          </div>
        )}

        {/* STEP 3: REVIEW PROJECT MANDATE */}
        {step === "REVIEW" && plan && (
          <div className="space-y-5 text-sm">
            {/* Project Meta Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Project Name</label>
                <input
                  type="text"
                  value={plan.project.name}
                  onChange={(e) => updateProjectField("name", e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3.5 py-2 text-foreground text-sm focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Priority</label>
                <select
                  value={plan.project.priority}
                  onChange={(e) => updateProjectField("priority", e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3.5 py-2 text-foreground text-sm focus:border-amber-500 focus:outline-none"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Start Date (YYYY-MM-DD)</label>
                <input
                  type="date"
                  value={plan.project.startDate}
                  onChange={(e) => updateProjectField("startDate", e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3.5 py-2 text-foreground text-sm focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-amber-500 mb-1">Final Deadline (YYYY-MM-DD)</label>
                <input
                  type="date"
                  value={plan.project.deadline}
                  onChange={(e) => updateProjectField("deadline", e.target.value)}
                  className="w-full bg-background border border-amber-500/40 rounded-xl px-3.5 py-2 text-foreground text-sm focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Organization Assignment (Org Workspace ONLY) */}
            {workspaceType === "ORGANIZATION" && plan.assignmentOptions && (
              <div className="bg-muted/40 border border-border p-4 rounded-xl space-y-2">
                <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                  Project Owner & Assignment
                </label>
                <select
                  value={selectedOwnerId}
                  onChange={(e) => setSelectedOwnerId(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3.5 py-2 text-foreground text-sm focus:border-amber-500 focus:outline-none"
                >
                  <option value="">Unassigned (Leader Managed)</option>
                  {plan.assignmentOptions
                    .filter(opt => opt.id !== user?.id)
                    .map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.name} ({opt.role})
                      </option>
                    ))}
                </select>
              </div>
            )}

            {/* Project Features */}
            {plan.features && plan.features.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Project Features ({plan.features.length})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {plan.features.map((f, idx) => (
                    <div key={idx} className="p-2.5 bg-muted/40 border border-border rounded-xl">
                      <span className="font-semibold text-foreground text-xs">{f.name}</span>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{f.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Objective & Description */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Objective</label>
              <textarea
                rows={2}
                value={plan.project.objective}
                onChange={(e) => updateProjectField("objective", e.target.value)}
                className="w-full bg-background border border-border rounded-xl p-3 text-foreground text-xs focus:border-amber-500 focus:outline-none resize-none"
              />
            </div>

            {/* Milestones */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Project Milestones ({plan.milestones.length})
                </h4>
                <button
                  onClick={handleAddMilestone}
                  className="text-xs text-amber-500 hover:underline font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Milestone
                </button>
              </div>

              <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                {plan.milestones.map((m, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-muted/40 p-2.5 rounded-xl border border-border">
                    <span className="text-xs font-bold text-muted-foreground w-5 text-center">{idx + 1}.</span>
                    <input
                      type="text"
                      value={m.name}
                      onChange={(e) => handleUpdateMilestone(idx, "name", e.target.value)}
                      className="flex-1 bg-background border border-border rounded-lg px-2.5 py-1 text-xs text-foreground"
                    />
                    <input
                      type="date"
                      value={m.deadline}
                      onChange={(e) => handleUpdateMilestone(idx, "deadline", e.target.value)}
                      className="bg-background border border-border rounded-lg px-2.5 py-1 text-xs text-muted-foreground"
                    />
                    <button
                      onClick={() => handleRemoveMilestone(idx)}
                      className="text-rose-500 hover:text-rose-600 text-xs px-2 py-1"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Tasks Breakdown */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Planned Tasks ({plan.tasks.length})
              </h4>
              {plan.tasks.length > 0 ? (
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 text-xs">
                  {plan.tasks.map((t, idx) => (
                    <div key={idx} className="bg-muted/40 px-3.5 py-2.5 rounded-xl border border-border flex items-center justify-between">
                      <span className="font-medium text-foreground">{t.title}</span>
                      <span className="text-muted-foreground text-[11px] font-semibold">{t.estimatedMinutes || 120} mins</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-muted/20 border border-border rounded-xl text-xs text-muted-foreground italic text-center">
                  Template mode: Tasks are not auto-created. CEO / Manager can manually create and assign tasks as project execution begins.
                </div>
              )}
            </div>

            {/* Required Documents */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Required Document Specs
              </h4>
              <div className="flex flex-wrap gap-2 text-xs">
                {plan.documents.map((doc, idx) => (
                  <span key={idx} className="bg-muted text-muted-foreground border border-border px-3 py-1 rounded-full font-medium">
                    ✓ {doc.docType}: {doc.title}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </GlobalSheet>
  );
}
