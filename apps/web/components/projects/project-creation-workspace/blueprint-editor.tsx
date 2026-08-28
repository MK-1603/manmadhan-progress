"use client";

import React from "react";
import { Lock, UserCheck, Users, Shield, Flag, Calendar, Github, Wrench } from "lucide-react";

export interface MemberOption {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface BlueprintEditorProps {
  coCeoList: MemberOption[];
  memberList: MemberOption[];
  selectedCoCeoId: string;
  setSelectedCoCeoId: (id: string) => void;
  selectedExecutionLeadId: string;
  setSelectedExecutionLeadId: (id: string) => void;
  selectedMemberIds: string[];
  setSelectedMemberIds: (ids: string[]) => void;
  priority: "Critical" | "High" | "Medium" | "Low";
  setPriority: (val: "Critical" | "High" | "Medium" | "Low") => void;
  deadline: string;
  setDeadline: (val: string) => void;
  category: string;
  setCategory: (val: string) => void;
  githubUrl: string;
  setGithubUrl: (val: string) => void;
  toolsText: string;
  setToolsText: (val: string) => void;
  userRole: string;
  requirementAssignees: Record<string, string>;
  setRequirementAssignees: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  requirements: string[];
}

export function BlueprintEditor({
  coCeoList,
  memberList,
  selectedCoCeoId,
  setSelectedCoCeoId,
  selectedExecutionLeadId,
  setSelectedExecutionLeadId,
  selectedMemberIds,
  setSelectedMemberIds,
  priority,
  setPriority,
  deadline,
  setDeadline,
  category,
  setCategory,
  githubUrl,
  setGithubUrl,
  toolsText,
  setToolsText,
  userRole,
  requirementAssignees,
  setRequirementAssignees,
  requirements,
}: BlueprintEditorProps) {
  const toggleMemberSelection = (id: string) => {
    setSelectedMemberIds(
      selectedMemberIds.includes(id)
        ? selectedMemberIds.filter((mId) => mId !== id)
        : [...selectedMemberIds, id]
    );
  };

  const handleReqAssigneeChange = (req: string, userId: string) => {
    setRequirementAssignees((prev) => ({ ...prev, [req]: userId }));
  };

  return (
    <div className="space-y-5 font-sans text-xs">
      {/* Header */}
      <div className="space-y-1">
        <h3 className="text-sm font-extrabold text-foreground tracking-tight">
          Project Assignment
        </h3>
        <p className="text-xs text-muted-foreground">
          Define ownership, responsibility and project controls.
        </p>
      </div>

      {/* 1. Ownership Governance Section */}
      <div className="p-4 rounded-2xl bg-card border border-border space-y-3 shadow-xs">
        <span className="text-[10.5px] font-extrabold text-muted-foreground uppercase tracking-wider block">
          Ownership Governance
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-background border border-border space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground block">Project Owner</span>
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-foreground text-xs">CEO</span>
              <span className="px-2 py-0.5 rounded bg-secondary text-foreground text-[10px] font-extrabold border border-border inline-flex items-center gap-1">
                <Lock className="w-3 h-3 text-[#C9A52A]" /> Read-only
              </span>
            </div>
            <p className="text-[10.5px] text-muted-foreground">Organization project ownership is locked to CEO.</p>
          </div>

          <div className="p-3 rounded-xl bg-background border border-border space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground block">Created By</span>
            <span className="font-extrabold text-[#C9A52A] text-xs block">
              {userRole === "CO-CEO" ? "Current User (CO-CEO)" : "Current User (CEO)"}
            </span>
            <p className="text-[10.5px] text-muted-foreground">Authenticated creator identifier recorded for audit trail.</p>
          </div>
        </div>
      </div>

      {/* 2. Execution Assignment Section */}
      <div className="p-4 rounded-2xl bg-card border border-border space-y-3.5 shadow-xs">
        <span className="text-[10.5px] font-extrabold text-muted-foreground uppercase tracking-wider block">
          Execution Assignment
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Project Lead (CO-CEO) */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold text-foreground block uppercase tracking-wider">
              Project Lead
            </label>
            <select
              value={selectedCoCeoId}
              onChange={(e) => setSelectedCoCeoId(e.target.value)}
              className="w-full h-[38px] px-3 bg-background border border-border rounded-xl text-xs text-foreground outline-none focus:border-[#C9A52A] cursor-pointer font-semibold"
            >
              <option value="">Select CO-CEO</option>
              {coCeoList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (CO-CEO)
                </option>
              ))}
            </select>
            <span className="text-[10.5px] text-muted-foreground block leading-tight">
              This CO-CEO will manage the execution of this project and assign work to its members.
            </span>
          </div>

          {/* Execution Lead */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold text-foreground block uppercase tracking-wider">
              Execution Lead
            </label>
            <select
              value={selectedExecutionLeadId}
              onChange={(e) => setSelectedExecutionLeadId(e.target.value)}
              className="w-full h-[38px] px-3 bg-background border border-border rounded-xl text-xs text-foreground outline-none focus:border-[#C9A52A] cursor-pointer font-semibold"
            >
              <option value="">Select Execution Lead (Optional)</option>
              {memberList.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.role})
                </option>
              ))}
            </select>
            <span className="text-[10.5px] text-muted-foreground block leading-tight">Primary lead engineer assigned for technical execution.</span>
          </div>
        </div>

        {/* Project Members Selection */}
        <div className="space-y-2 pt-2 border-t border-border/60">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-foreground">
              Project Members ({selectedMemberIds.length} selected)
            </label>
            {selectedMemberIds.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedMemberIds([])}
                className="text-[10.5px] text-muted-foreground hover:text-foreground font-bold underline cursor-pointer"
              >
                Deselect all
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
            {memberList.length === 0 ? (
              <span className="text-muted-foreground text-xs italic col-span-2">No organization members loaded.</span>
            ) : (
              memberList.map((m) => {
                const isSelected = selectedMemberIds.includes(m.id);
                return (
                  <div
                    key={m.id}
                    onClick={() => toggleMemberSelection(m.id)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-xs ${
                      isSelected
                        ? "bg-[#C9A52A]/10 border-[#C9A52A] text-foreground font-bold"
                        : "bg-background border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <div className="truncate">
                      <span className="block truncate text-xs">{m.name}</span>
                      <span className="text-[10px] text-muted-foreground block truncate">{m.role}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="rounded border-border text-[#C9A52A] focus:ring-0 cursor-pointer shrink-0"
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 3. Project Controls Section */}
      <div className="p-4 rounded-2xl bg-card border border-border space-y-3.5 shadow-xs">
        <span className="text-[10.5px] font-extrabold text-muted-foreground uppercase tracking-wider block">
          Project Controls & Metadata
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-foreground block">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="w-full h-[38px] px-3 bg-background border border-border rounded-xl text-xs text-foreground outline-none focus:border-[#C9A52A] cursor-pointer"
            >
              <option value="Critical">Critical Priority</option>
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Low">Low Priority</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-foreground block">Target Deadline</label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full h-[38px] px-3 bg-background border border-border rounded-xl text-xs text-foreground outline-none focus:border-[#C9A52A] cursor-pointer"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-foreground block">GitHub Repository</label>
            <input
              type="url"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/org/repo"
              className="w-full h-[38px] px-3 bg-background border border-border rounded-xl text-xs text-foreground outline-none focus:border-[#C9A52A]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-foreground block">Tech Stack / Tools</label>
            <input
              type="text"
              value={toolsText}
              onChange={(e) => setToolsText(e.target.value)}
              placeholder="Next.js, PostgreSQL, TypeScript"
              className="w-full h-[38px] px-3 bg-background border border-border rounded-xl text-xs text-foreground outline-none focus:border-[#C9A52A]"
            />
          </div>
        </div>
      </div>

      {/* 4. Requirements Tagging Section */}
      {requirements.length > 0 && (
        <div className="p-4 rounded-2xl bg-card border border-border space-y-3 shadow-xs">
          <span className="text-[10.5px] font-extrabold text-muted-foreground uppercase tracking-wider block">
            Requirement Responsibilities ({requirements.length})
          </span>
          <p className="text-[11px] text-muted-foreground">
            Optionally specify a responsible team member for each requirement item. (Does not create tasks).
          </p>

          <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
            {requirements.map((req, idx) => (
              <div key={idx} className="p-2.5 rounded-xl bg-background border border-border flex items-center justify-between gap-3 text-xs">
                <span className="font-bold text-foreground truncate max-w-[200px]">{req}</span>
                <select
                  value={requirementAssignees[req] || ""}
                  onChange={(e) => handleReqAssigneeChange(req, e.target.value)}
                  className="h-[32px] px-2 bg-card border border-border rounded-lg text-xs text-foreground outline-none focus:border-[#C9A52A] cursor-pointer shrink-0"
                >
                  <option value="">Owner: Not assigned</option>
                  {memberList.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
