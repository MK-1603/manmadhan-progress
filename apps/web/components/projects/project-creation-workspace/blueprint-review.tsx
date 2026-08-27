"use client";

import React from "react";
import { BlueprintMilestone } from "./templates-data";
import { Shield, UserCheck, Flag, ArrowLeft, Rocket, Loader2, CheckCircle2 } from "lucide-react";

interface MemberOption {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface BlueprintReviewProps {
  title: string;
  description: string;
  priority: string;
  deadline: string;
  selectedCoCeoId: string;
  coCeoList: MemberOption[];
  selectedMemberIds: string[];
  memberList: MemberOption[];
  milestones: BlueprintMilestone[];
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
  priority,
  deadline,
  selectedCoCeoId,
  coCeoList,
  selectedMemberIds,
  memberList,
  milestones,
  githubUrl,
  toolsText,
  isSubmitting,
  onEditBlueprint,
  onConfirmLaunch,
  userRole,
}: BlueprintReviewProps) {
  const selectedCoCeo = coCeoList.find((c) => c.id === selectedCoCeoId);
  const selectedMembers = memberList.filter((m) => selectedMemberIds.includes(m.id));
  const totalTasks = milestones.reduce((sum, m) => sum + m.tasks.length, 0);

  return (
    <div className="space-y-5 font-sans text-xs">
      {/* Header Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="px-3 py-1 rounded-full bg-[#C9A52A]/10 text-[#C9A52A] text-[10px] font-extrabold uppercase tracking-wider border border-[#C9A52A]/20 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Final Pre-Flight Review
          </span>
          <span className="text-[11px] text-muted-foreground font-mono bg-muted/40 px-2.5 py-0.5 rounded border border-border">
            {priority} Priority · {deadline || "Flexible Target"}
          </span>
        </div>

        <div>
          <h3 className="text-base font-extrabold text-foreground">{title || "Untitled Organization Project"}</h3>
          {description && <p className="text-xs text-muted-foreground leading-relaxed mt-1 line-clamp-3">{description}</p>}
        </div>
      </div>

      {/* Ownership & Permission Verification Card */}
      <div className="p-4 rounded-2xl bg-[#C9A52A]/10 border border-[#C9A52A]/30 text-foreground space-y-2 shadow-xs">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#C9A52A] shrink-0" />
          <h4 className="font-extrabold text-xs uppercase tracking-wider">Project Ownership Verification</h4>
        </div>
        <p className="text-[11.5px] text-muted-foreground leading-relaxed">
          All organization projects are permanently owned by the <strong className="text-foreground font-bold">CEO</strong>.
          {userRole === "CO-CEO" ? " As CO-CEO, you are creating this project blueprint under executive governance." : " You are launching this project as Workspace CEO."}
        </p>
      </div>

      {/* Summary Matrix */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-card rounded-2xl border border-border space-y-1 shadow-2xs">
          <span className="text-[9.5px] font-extrabold text-muted-foreground uppercase tracking-wider block">Project Owner</span>
          <p className="font-extrabold text-foreground truncate text-xs">CEO 🔒</p>
        </div>

        <div className="p-3.5 bg-card rounded-2xl border border-border space-y-1 shadow-2xs">
          <span className="text-[9.5px] font-extrabold text-muted-foreground uppercase tracking-wider block">Created By</span>
          <p className="font-extrabold text-[#C9A52A] truncate text-xs">{userRole === "CO-CEO" ? "You (CO-CEO)" : "You (CEO)"}</p>
        </div>

        <div className="p-3.5 bg-card rounded-2xl border border-border space-y-1 shadow-2xs">
          <span className="text-[9.5px] font-extrabold text-muted-foreground uppercase tracking-wider block">Execution Lead</span>
          <p className="font-extrabold text-blue-500 truncate text-xs">{selectedCoCeo?.name || "CO-CEO Unassigned"}</p>
        </div>

        <div className="p-3.5 bg-card rounded-2xl border border-border space-y-1 shadow-2xs">
          <span className="text-[9.5px] font-extrabold text-muted-foreground uppercase tracking-wider block">Assigned Team</span>
          <p className="font-extrabold text-purple-500 truncate text-xs">{selectedMembers.length} Members</p>
        </div>
      </div>

      {/* Structure Summary Grid */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="p-3.5 bg-background rounded-2xl border border-border space-y-0.5 shadow-2xs">
          <span className="text-xl font-extrabold text-foreground block">{milestones.length}</span>
          <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">Milestone Gates</p>
        </div>

        <div className="p-3.5 bg-background rounded-2xl border border-border space-y-0.5 shadow-2xs">
          <span className="text-xl font-extrabold text-[#C9A52A] block">{totalTasks}</span>
          <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">Initial Tasks</p>
        </div>

        <div className="p-3.5 bg-background rounded-2xl border border-border space-y-0.5 shadow-2xs">
          <span className="text-xl font-extrabold text-blue-500 block">11</span>
          <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">Document Folders</p>
        </div>
      </div>

      {/* Milestones Hierarchy Breakdown */}
      <div className="space-y-2.5">
        <h4 className="font-extrabold text-foreground text-xs uppercase tracking-wider flex items-center gap-1.5">
          <Flag className="w-4 h-4 text-[#C9A52A]" /> Milestone Phase Breakdown
        </h4>
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {milestones.map((m) => (
            <div key={m.id} className="p-3.5 rounded-2xl bg-card border border-border space-y-1.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-foreground text-xs">{m.name}</span>
                <span className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">{m.tasks.length} tasks</span>
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-1">{m.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Final Action Controls */}
      <div className="pt-3 border-t border-border flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onEditBlueprint}
          disabled={isSubmitting}
          className="px-4 py-2.5 rounded-xl border border-border text-muted-foreground hover:text-foreground text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" /> Edit Blueprint
        </button>

        <button
          type="button"
          onClick={onConfirmLaunch}
          disabled={isSubmitting}
          className="px-6 h-[44px] rounded-xl bg-gradient-to-r from-[#C9A52A] to-[#D4B12F] text-[#0B0D10] font-extrabold text-xs transition-all disabled:opacity-50 cursor-pointer shadow-md hover:brightness-105 flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Persisting Real Database Records...</span>
            </>
          ) : (
            <>
              <Rocket className="w-4 h-4 fill-current" />
              <span>Confirm & Launch Project</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
