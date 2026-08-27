"use client";

import React from "react";
import { Lock, CheckCircle2, AlertCircle, Loader2, ArrowLeft } from "lucide-react";
import { MemberOption } from "./blueprint-editor";

interface BlueprintReviewProps {
  title: string;
  description: string;
  category: string;
  priority: string;
  deadline: string;
  selectedCoCeoId: string;
  coCeoList: MemberOption[];
  selectedExecutionLeadId: string;
  selectedMemberIds: string[];
  memberList: MemberOption[];
  requirements: string[];
  deliverables: string[];
  githubUrl: string;
  toolsText: string;
  isSubmitting: boolean;
  onEditBlueprint: () => void;
  onConfirmLaunch: () => void;
  userRole: string;
}

export function BlueprintReview({
  title,
  description,
  category,
  priority,
  deadline,
  selectedCoCeoId,
  coCeoList,
  selectedExecutionLeadId,
  selectedMemberIds,
  memberList,
  requirements,
  deliverables,
  githubUrl,
  toolsText,
  isSubmitting,
  onEditBlueprint,
  onConfirmLaunch,
  userRole,
}: BlueprintReviewProps) {
  // Resolve Names
  const coCeoLead = coCeoList.find((c) => c.id === selectedCoCeoId);
  const executionLead = memberList.find((m) => m.id === selectedExecutionLeadId);
  const selectedMembers = memberList.filter((m) => selectedMemberIds.includes(m.id));

  // Pre-flight Validations
  const validationIssues: string[] = [];
  if (!title.trim()) validationIssues.push("Project title is required.");
  if (!description.trim()) validationIssues.push("Project description / objective is required.");

  const isValid = validationIssues.length === 0;

  return (
    <div className="space-y-5 font-sans text-xs">
      {/* Header */}
      <div className="space-y-1">
        <h3 className="text-sm font-extrabold text-foreground tracking-tight">
          Review Project
        </h3>
        <p className="text-xs text-muted-foreground">
          Confirm the project details and assignment before creation.
        </p>
      </div>

      {/* Pre-flight Validation Status Banner */}
      {!isValid ? (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 space-y-1">
          <div className="flex items-center gap-2 font-bold text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{validationIssues.length} item(s) require attention before creation:</span>
          </div>
          <ul className="list-disc list-inside text-[11px] space-y-0.5 pl-5 font-semibold">
            {validationIssues.map((issue, idx) => (
              <li key={idx}>{issue}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-between text-xs font-bold">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Pre-flight verification passed. Ready to create project.</span>
          </div>
          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-500 font-mono text-[10px]">VERIFIED</span>
        </div>
      )}

      {/* Summary Grid Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Section 1: Project Identity */}
        <div className="p-4 rounded-2xl bg-card border border-border space-y-2 shadow-xs">
          <span className="text-[10.5px] font-extrabold text-muted-foreground uppercase tracking-wider block">
            01. Project Metadata
          </span>
          <div>
            <h4 className="text-sm font-extrabold text-foreground">{title || "Untitled Project"}</h4>
            <p className="text-xs text-muted-foreground line-clamp-3 mt-1">{description || "No description provided."}</p>
          </div>
          <div className="pt-2 border-t border-border/60 grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-muted-foreground block">Category</span>
              <span className="font-bold text-foreground">{category || "General"}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Priority</span>
              <span className="font-bold text-amber-500">{priority}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Deadline</span>
              <span className="font-bold text-foreground">{deadline || "No deadline"}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Tech Stack</span>
              <span className="font-bold text-foreground truncate block">{toolsText || "Not specified"}</span>
            </div>
          </div>
        </div>

        {/* Section 2: Ownership Governance */}
        <div className="p-4 rounded-2xl bg-card border border-border space-y-3 shadow-xs">
          <span className="text-[10.5px] font-extrabold text-muted-foreground uppercase tracking-wider block">
            02. Ownership Governance
          </span>
          <div className="p-3 rounded-xl bg-background border border-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground font-semibold">Project Owner</span>
              <span className="px-2 py-0.5 rounded bg-secondary text-foreground text-[10.5px] font-extrabold border border-border inline-flex items-center gap-1">
                <Lock className="w-3 h-3 text-[#C9A52A]" /> CEO
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground font-semibold">Created By</span>
              <span className="font-bold text-[#C9A52A]">{userRole === "CO-CEO" ? "You (CO-CEO)" : "You (CEO)"}</span>
            </div>
          </div>
        </div>

        {/* Section 3: Execution Assignment */}
        <div className="p-4 rounded-2xl bg-card border border-border space-y-2 shadow-xs">
          <span className="text-[10.5px] font-extrabold text-muted-foreground uppercase tracking-wider block">
            03. Execution Assignment
          </span>
          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">CO-CEO Lead</span>
              <span className="font-bold text-blue-500">{coCeoLead ? coCeoLead.name : "Not assigned"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Execution Lead</span>
              <span className="font-bold text-foreground">{executionLead ? executionLead.name : "Not assigned"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Members Assigned</span>
              <span className="font-mono font-bold text-foreground">{selectedMembers.length} users</span>
            </div>
          </div>
        </div>

        {/* Section 4: Requirements & Deliverables */}
        <div className="p-4 rounded-2xl bg-card border border-border space-y-2 shadow-xs">
          <span className="text-[10.5px] font-extrabold text-muted-foreground uppercase tracking-wider block">
            04. Scope Requirements & Deliverables
          </span>
          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Requirements Defined</span>
              <span className="font-mono font-bold text-foreground">{requirements.length} items</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Deliverables Defined</span>
              <span className="font-mono font-bold text-foreground">{deliverables.length} items</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Document Requirements</span>
              <span className="font-mono font-bold text-foreground">8 Requirements</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground font-semibold">Initial Storage Usage</span>
              <span className="font-mono font-bold text-emerald-500">0 MB</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="p-4 rounded-2xl bg-card border border-border flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <button
          type="button"
          onClick={onEditBlueprint}
          className="px-4 py-2 rounded-xl border border-border text-foreground hover:bg-muted font-bold text-xs flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Edit Assignment
        </button>

        <button
          type="button"
          disabled={isSubmitting || !isValid}
          onClick={onConfirmLaunch}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#C9A52A] to-[#D4B12F] text-[#0B0D10] font-extrabold text-xs cursor-pointer shadow-md hover:brightness-105 disabled:opacity-40 flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Persisting Project Transaction...</span>
            </>
          ) : (
            <span>Create Project</span>
          )}
        </button>
      </div>
    </div>
  );
}
