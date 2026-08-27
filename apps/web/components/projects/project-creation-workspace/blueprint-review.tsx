"use client";

import React from "react";
import { BlueprintMilestone } from "./templates-data";
import { FolderKanban, Shield, UserCheck, Users, Calendar, Flag, CheckSquare, FileText, Github, ArrowLeft, Rocket, Loader2 } from "lucide-react";

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
      <div className="p-4 rounded-2xl bg-card border border-border space-y-2">
        <div className="flex items-center justify-between">
          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-gold text-[10px] font-bold uppercase tracking-wider">
            ● Final Pre-Flight Review
          </span>
          <span className="text-[11px] text-muted-foreground font-mono">
            {priority} Priority · {deadline || "Flexible Target"}
          </span>
        </div>

        <h3 className="text-base font-bold text-foreground">{title || "Untitled Organization Project"}</h3>
        {description && <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{description}</p>}
      </div>

      {/* Ownership & Permission Verification Card */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 space-y-2">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-amber-600 dark:text-gold shrink-0" />
          <h4 className="font-bold text-xs uppercase tracking-wider">Project Ownership Verification</h4>
        </div>
        <p className="text-[11.5px] leading-relaxed">
          All organization projects are owned by the <strong>CEO</strong>.
          {userRole === "CO-CEO" ? " As CO-CEO, you are creating this project blueprint under executive governance." : " You are creating this project as Workspace CEO."}
        </p>
      </div>

      {/* Summary Matrix */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 bg-card rounded-xl border border-border space-y-0.5">
          <span className="text-[9.5px] font-bold text-muted-foreground uppercase">Project Owner</span>
          <p className="font-bold text-foreground truncate">CEO 🔒</p>
        </div>

        <div className="p-3 bg-card rounded-xl border border-border space-y-0.5">
          <span className="text-[9.5px] font-bold text-muted-foreground uppercase">Created By</span>
          <p className="font-bold text-amber-600 dark:text-gold truncate">{userRole === "CO-CEO" ? "You (CO-CEO)" : "You (CEO)"}</p>
        </div>

        <div className="p-3 bg-card rounded-xl border border-border space-y-0.5">
          <span className="text-[9.5px] font-bold text-muted-foreground uppercase">Execution Lead</span>
          <p className="font-bold text-blue-500 truncate">{selectedCoCeo?.name || "CO-CEO Unassigned"}</p>
        </div>

        <div className="p-3 bg-card rounded-xl border border-border space-y-0.5">
          <span className="text-[9.5px] font-bold text-muted-foreground uppercase">Assigned Team</span>
          <p className="font-bold text-purple-500 truncate">{selectedMembers.length} Members</p>
        </div>
      </div>

      {/* Structure Summary Grid */}
      <div className="grid grid-cols-3 gap-2.5 text-center">
        <div className="p-3 bg-background rounded-xl border border-border space-y-0.5">
          <span className="text-[18px] font-extrabold text-foreground">{milestones.length}</span>
          <p className="text-[10px] font-bold text-muted-foreground uppercase">Milestone Gates</p>
        </div>

        <div className="p-3 bg-background rounded-xl border border-border space-y-0.5">
          <span className="text-[18px] font-extrabold text-amber-600 dark:text-gold">{totalTasks}</span>
          <p className="text-[10px] font-bold text-muted-foreground uppercase">Initial Tasks</p>
        </div>

        <div className="p-3 bg-background rounded-xl border border-border space-y-0.5">
          <span className="text-[18px] font-extrabold text-blue-500">11</span>
          <p className="text-[10px] font-bold text-muted-foreground uppercase">Document Folders</p>
        </div>
      </div>

      {/* Milestones Hierarchy Breakdown */}
      <div className="space-y-2">
        <h4 className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-1.5">
          <Flag className="w-3.5 h-3.5 text-amber-600 dark:text-gold" /> Structure Breakdown
        </h4>
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {milestones.map((m) => (
            <div key={m.id} className="p-3 rounded-xl bg-card border border-border space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground text-xs">{m.name}</span>
                <span className="text-[10px] font-mono text-muted-foreground">{m.tasks.length} tasks</span>
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-1">{m.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-3 border-t border-border flex items-center justify-between">
        <button
          type="button"
          onClick={onEditBlueprint}
          disabled={isSubmitting}
          className="inline-flex items-center gap-1.5 px-4 h-[40px] rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted font-bold text-xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Edit Blueprint
        </button>

        <button
          type="button"
          onClick={onConfirmLaunch}
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 px-6 h-[42px] rounded-xl bg-amber-500 hover:bg-amber-600 text-white dark:bg-gold dark:hover:bg-gold/90 dark:text-black font-bold text-xs transition-all disabled:opacity-50 cursor-pointer shadow-lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Creating Project...</span>
            </>
          ) : (
            <>
              <Rocket className="w-4 h-4" />
              <span>Confirm & Create Project</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
