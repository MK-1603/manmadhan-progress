"use client";

import { useState } from "react";
import {
  GitCommit, ShieldCheck, CheckCircle2, AlertCircle, Layers, FileCheck, Plus,
  Edit2, Trash2, ArrowRight, Save, ShieldAlert, ChevronRight, Lock
} from "lucide-react";
import { PremiumCard } from "@/components/ui/premium-card";

export interface WorkflowStage {
  id: string;
  stepNumber: string;
  name: string;
  description: string;
  ownerRole: "CEO" | "CO-CEO" | "MEMBER";
  requiredEvidence: "GitHub PR / Commit" | "TRD / Document" | "Live Demo URL" | "None";
  requiresApproval: boolean;
}

export function OrgWorkflowTab() {
  const [stages, setStages] = useState<WorkflowStage[]>([
    {
      id: "stage-1",
      stepNumber: "01",
      name: "Planning & Scope",
      description: "Define project objectives, initial mandate scope, and assign operational leadership.",
      ownerRole: "CEO",
      requiredEvidence: "TRD / Document",
      requiresApproval: true,
    },
    {
      id: "stage-2",
      stepNumber: "02",
      name: "Requirements & Architecture",
      description: "Formulate product requirement documentation (PRD) and tech stack specifications.",
      ownerRole: "CO-CEO",
      requiredEvidence: "TRD / Document",
      requiresApproval: true,
    },
    {
      id: "stage-3",
      stepNumber: "03",
      name: "Design & UX Specifications",
      description: "Review component layout wireframes, design tokens, and user flow architectures.",
      ownerRole: "CO-CEO",
      requiredEvidence: "Live Demo URL",
      requiresApproval: false,
    },
    {
      id: "stage-4",
      stepNumber: "04",
      name: "Implementation & Build",
      description: "Active development execution, task completion, and code submission.",
      ownerRole: "MEMBER",
      requiredEvidence: "GitHub PR / Commit",
      requiresApproval: false,
    },
    {
      id: "stage-5",
      stepNumber: "05",
      name: "Testing & Quality Verification",
      description: "Execute automated unit tests, build validation checks, and regression verification.",
      ownerRole: "MEMBER",
      requiredEvidence: "GitHub PR / Commit",
      requiresApproval: true,
    },
    {
      id: "stage-6",
      stepNumber: "06",
      name: "Executive Review",
      description: "Leadership evaluation of completed milestones and verification of deliverable quality.",
      ownerRole: "CO-CEO",
      requiredEvidence: "Live Demo URL",
      requiresApproval: true,
    },
    {
      id: "stage-7",
      stepNumber: "07",
      name: "CEO Final Sign-off",
      description: "Formal sign-off and approval of final milestone artifacts prior to release.",
      ownerRole: "CEO",
      requiredEvidence: "TRD / Document",
      requiresApproval: true,
    },
    {
      id: "stage-8",
      stepNumber: "08",
      name: "Completion & Archival",
      description: "Project execution successfully marked complete and archived into organization record.",
      ownerRole: "CEO",
      requiredEvidence: "None",
      requiresApproval: false,
    },
  ]);

  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState("");

  const handleStageUpdate = (updatedStage: WorkflowStage) => {
    setStages(stages.map((s) => (s.id === updatedStage.id ? updatedStage : s)));
    setEditingStageId(null);
    setSaveNotice("Workflow pipeline stage updated ✓");
    setTimeout(() => setSaveNotice(""), 3000);
  };

  const handleAddStage = () => {
    const nextNumber = (stages.length + 1).toString().padStart(2, "0");
    const newStage: WorkflowStage = {
      id: `stage-${Date.now()}`,
      stepNumber: nextNumber,
      name: `New Stage ${nextNumber}`,
      description: "Configure stage execution policy and verification criteria.",
      ownerRole: "MEMBER",
      requiredEvidence: "GitHub PR / Commit",
      requiresApproval: false,
    };
    setStages([...stages, newStage]);
    setEditingStageId(newStage.id);
  };

  return (
    <div className="space-y-6 max-w-5xl w-full mx-auto pb-12 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div>
          <h2 className="text-lg font-extrabold text-[#F4F7F5] tracking-tight flex items-center gap-2">
            <GitCommit className="w-5 h-5 text-gold" /> Organization Workflows & Pipeline Builder
          </h2>
          <p className="text-xs text-[#9AA4B2] font-medium mt-0.5">
            Configure canonical execution stages, evidence requirements, and milestone approval gates.
          </p>
        </div>

        <button
          type="button"
          onClick={handleAddStage}
          className="h-9 px-3.5 rounded-lg bg-gold hover:bg-gold/90 text-black text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Custom Stage</span>
        </button>
      </div>

      {saveNotice && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {saveNotice}
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <PremiumCard className="p-4 bg-[#0F1218] border-white/10 rounded-xl space-y-2">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-gold" />
            <h3 className="text-xs font-bold text-[#F4F7F5] uppercase tracking-wider">System-Defined Mandates</h3>
          </div>
          <p className="text-xs text-[#9AA4B2] font-medium leading-relaxed">
            Standard 8-Stage sequential progression, task acceptance rules, and mandatory night lockout.
          </p>
          <span className="inline-block text-[9.5px] font-mono font-bold px-2 py-0.5 rounded bg-gold/15 text-gold border border-gold/30">
            SYSTEM IMMUTABLE
          </span>
        </PremiumCard>

        <PremiumCard className="p-4 bg-[#0F1218] border-white/10 rounded-xl space-y-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-400" />
            <h3 className="text-xs font-bold text-[#F4F7F5] uppercase tracking-wider">Organization Execution Builder</h3>
          </div>
          <p className="text-xs text-[#9AA4B2] font-medium leading-relaxed">
            Customize stage owner roles, required evidence types, and milestone review gates for your workspace.
          </p>
          <span className="inline-block text-[9.5px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30">
            ORGANIZATION CUSTOMIZABLE
          </span>
        </PremiumCard>
      </div>

      {/* Workflow Builder Stage Pipeline List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-[#F4F7F5] uppercase tracking-wider flex items-center gap-2">
            <GitCommit className="w-3.5 h-3.5 text-gold" /> Project Execution Pipeline Stages ({stages.length})
          </h3>
        </div>

        <div className="space-y-3">
          {stages.map((stage) => {
            const isEditing = editingStageId === stage.id;

            return (
              <PremiumCard
                key={stage.id}
                className={`p-4 transition-all ${
                  isEditing
                    ? "bg-[#0F1218] border-gold/50 shadow-md"
                    : "bg-[#0F1218] border-white/10 hover:border-white/20"
                }`}
              >
                {!isEditing ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3.5">
                      <div className="w-9 h-9 rounded-xl bg-gold/15 text-gold font-mono font-black text-sm flex items-center justify-center border border-gold/30 shrink-0 mt-0.5">
                        {stage.stepNumber}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-bold text-[#F4F7F5]">{stage.name}</h4>
                          <span
                            className={`px-2 py-0.5 rounded text-[9.5px] font-mono font-bold border ${
                              stage.ownerRole === "CEO"
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                : stage.ownerRole === "CO-CEO"
                                ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                                : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                            }`}
                          >
                            OWNER: {stage.ownerRole}
                          </span>

                          {stage.requiresApproval && (
                            <span className="px-2 py-0.5 rounded text-[9.5px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              APPROVAL REQUIRED
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-[#9AA4B2] font-medium leading-relaxed">{stage.description}</p>

                        <div className="flex items-center gap-3 text-[10.5px] font-mono text-[#667085] pt-1">
                          <span>Evidence: <strong className="text-[#F4F7F5]">{stage.requiredEvidence}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditingStageId(stage.id)}
                        className="h-8 px-3 rounded-lg bg-[#0B0E13] border border-white/10 text-[#9AA4B2] hover:text-[#F4F7F5] hover:border-white/20 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit Stage</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Edit Stage Inline Form */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <span className="text-xs font-bold text-gold font-mono">EDIT STAGE {stage.stepNumber}</span>
                      <button
                        type="button"
                        onClick={() => setEditingStageId(null)}
                        className="text-xs text-[#667085] hover:text-[#F4F7F5]"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-[#F4F7F5] mb-1">STAGE NAME</label>
                        <input
                          type="text"
                          defaultValue={stage.name}
                          id={`name-${stage.id}`}
                          className="w-full h-9 px-3 rounded-lg bg-[#0B0E13] border border-white/10 text-xs text-[#F4F7F5] focus:outline-none focus:border-gold"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-[#F4F7F5] mb-1">OWNER ROLE</label>
                        <select
                          defaultValue={stage.ownerRole}
                          id={`role-${stage.id}`}
                          className="w-full h-9 px-3 rounded-lg bg-[#0B0E13] border border-white/10 text-xs text-[#F4F7F5] focus:outline-none focus:border-gold"
                        >
                          <option value="CEO">CEO</option>
                          <option value="CO-CEO">CO-CEO</option>
                          <option value="MEMBER">MEMBER</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#F4F7F5] mb-1">DESCRIPTION</label>
                      <input
                        type="text"
                        defaultValue={stage.description}
                        id={`desc-${stage.id}`}
                        className="w-full h-9 px-3 rounded-lg bg-[#0B0E13] border border-white/10 text-xs text-[#F4F7F5] focus:outline-none focus:border-gold"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-[#F4F7F5] mb-1">REQUIRED EVIDENCE</label>
                        <select
                          defaultValue={stage.requiredEvidence}
                          id={`evidence-${stage.id}`}
                          className="w-full h-9 px-3 rounded-lg bg-[#0B0E13] border border-white/10 text-xs text-[#F4F7F5] focus:outline-none focus:border-gold"
                        >
                          <option value="GitHub PR / Commit">GitHub PR / Commit</option>
                          <option value="TRD / Document">TRD / Document</option>
                          <option value="Live Demo URL">Live Demo URL</option>
                          <option value="None">None</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2 pt-5">
                        <input
                          type="checkbox"
                          defaultChecked={stage.requiresApproval}
                          id={`approval-${stage.id}`}
                          className="w-4 h-4 rounded bg-[#0B0E13] border-white/10 text-gold focus:ring-0"
                        />
                        <label htmlFor={`approval-${stage.id}`} className="text-xs font-bold text-[#F4F7F5] cursor-pointer">
                          Requires Formal Leadership Approval
                        </label>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() => {
                          const nameInput = (document.getElementById(`name-${stage.id}`) as HTMLInputElement)?.value;
                          const roleInput = (document.getElementById(`role-${stage.id}`) as HTMLSelectElement)?.value;
                          const descInput = (document.getElementById(`desc-${stage.id}`) as HTMLInputElement)?.value;
                          const evInput = (document.getElementById(`evidence-${stage.id}`) as HTMLSelectElement)?.value;
                          const appInput = (document.getElementById(`approval-${stage.id}`) as HTMLInputElement)?.checked;

                          handleStageUpdate({
                            ...stage,
                            name: nameInput || stage.name,
                            ownerRole: (roleInput as any) || stage.ownerRole,
                            description: descInput || stage.description,
                            requiredEvidence: (evInput as any) || stage.requiredEvidence,
                            requiresApproval: appInput ?? stage.requiresApproval,
                          });
                        }}
                        className="h-8 px-4 rounded-lg bg-gold text-black font-bold text-xs hover:bg-gold/90 transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Stage Rules</span>
                      </button>
                    </div>
                  </div>
                )}
              </PremiumCard>
            );
          })}
        </div>
      </div>
    </div>
  );
}
