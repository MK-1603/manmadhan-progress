"use client";

import React, { useState } from "react";
import { Lock, CheckCircle2, FileText, ChevronRight, Plus, Loader2, X, Flag, AlertCircle } from "lucide-react";
import { formatEnumLabel, getMilestoneStateBadgeClass } from "@/lib/utils/formatters";
import apiClient from "@/lib/api-client";

export interface StageMilestone {
  id: string;
  stageNumber: number;
  milestoneCode: string;
  name: string;
  description: string;
  state?: string | null;
  status?: string | null;
  dependencies?: number[];
  document?: {
    id: string;
    title: string;
    currentVersion: number;
    wordCount: number;
    folderPath: string;
  };
}

interface ProjectMilestonesViewProps {
  milestones: StageMilestone[];
  projectId?: string;
  onSelectMilestone?: (milestone: StageMilestone) => void;
  onRefresh?: () => void;
}

/* ── inline "Add Manual Milestone" modal ── */
function AddMilestoneModal({
  projectId,
  projectDeadline,
  onClose,
  onSaved,
}: {
  projectId: string;
  projectDeadline?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const defaultDate = projectDeadline
    ? new Date(projectDeadline).toISOString().split("T")[0]
    : new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0];
  const [deadline, setDeadline] = useState(defaultDate);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!name.trim()) { setError("Milestone name is required."); return; }
    setLoading(true); setError("");
    try {
      const wsId = localStorage.getItem("workspaceId");
      const res = await apiClient.post(`/org/projects/${projectId}/milestones`, {
        workspaceId: wsId,
        name: name.trim(),
        description: description.trim() || null,
        deadline: new Date(deadline).toISOString(),
      });
      if (res.data.success) { onSaved(); onClose(); }
      else setError(res.data.error || "Failed to add milestone.");
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || "Failed to add milestone.");
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#171717] border border-[#292929] rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#292929]">
          <div className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-[#E3AA18]" />
            <span className="text-xs font-bold text-[#F5F5F5] uppercase tracking-wider">Add Manual Milestone</span>
          </div>
          <button onClick={onClose} className="text-[#858585] hover:text-[#F5F5F5] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#E05252]/10 border border-[#E05252]/20 text-[#E05252] text-xs">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
            </div>
          )}
          <div>
            <label className="block text-[10px] font-semibold text-[#858585] uppercase tracking-widest mb-1.5">Milestone Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Additional Research Phase"
              className="w-full h-10 px-3.5 rounded-xl bg-[#111111] border border-[#2A2A2A] text-xs text-[#F5F5F5] placeholder-[#555] focus:outline-none focus:border-[#E3AA18]"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#858585] uppercase tracking-widest mb-1.5">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Scope and deliverables..."
              className="w-full p-3 rounded-xl bg-[#111111] border border-[#2A2A2A] text-xs text-[#F5F5F5] placeholder-[#555] focus:outline-none focus:border-[#E3AA18] resize-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#858585] uppercase tracking-widest mb-1.5">Target Date</label>
            <input
              type="date"
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
              className="w-full h-10 px-3.5 rounded-xl bg-[#111111] border border-[#2A2A2A] text-xs text-[#F5F5F5] focus:outline-none focus:border-[#E3AA18]"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={onClose} className="px-4 py-2 rounded-xl border border-[#2A2A2A] text-xs text-[#BDBDBD] hover:bg-[#1D1D1D] transition-colors">Cancel</button>
            <button
              onClick={submit}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-[#E3AA18] hover:bg-[#F0BC2B] text-[#0A0A0A] text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Add Milestone
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── main view ── */
export function ProjectMilestonesView({
  milestones,
  projectId,
  onSelectMilestone,
  onRefresh,
}: ProjectMilestonesViewProps) {
  const [showAdd, setShowAdd] = useState(false);

  const mandatory = [...(milestones || [])]
    .filter(m => m.stageNumber && m.stageNumber <= 8)
    .sort((a, b) => (a.stageNumber || 0) - (b.stageNumber || 0));

  const additional = [...(milestones || [])]
    .filter(m => !m.stageNumber || m.stageNumber > 8)
    .sort((a, b) => (a.stageNumber || 0) - (b.stageNumber || 0));

  const renderRow = (m: StageMilestone, isAdditional = false) => {
    const rawState = m.state || m.status || "LOCKED";
    const isLocked   = rawState === "LOCKED";
    const isApproved = rawState === "APPROVED";
    const isAvailable = rawState === "AVAILABLE";

    return (
      <button
        key={m.id || m.stageNumber}
        type="button"
        disabled={isLocked}
        onClick={() => !isLocked && onSelectMilestone && onSelectMilestone(m)}
        aria-label={`Open milestone: ${m.name}`}
        className={`
          w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between gap-4
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3AA18]
          ${isLocked
            ? "bg-background border-border opacity-50 cursor-not-allowed"
            : isApproved
            ? "bg-[#65C466]/5 border-[#65C466]/20 hover:border-[#65C466]/40 cursor-pointer"
            : isAvailable
            ? "bg-gold/5 border-gold/30 hover:border-gold cursor-pointer"
            : "bg-background border-border hover:border-gold/50 cursor-pointer"
          }
        `}
      >
        {/* left: number badge + text */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div className={`
            w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold
            ${isApproved ? "bg-[#65C466] text-[#0A0A0A]"
              : isLocked  ? "bg-muted text-muted-foreground"
              : "bg-gold text-[#0A0A0A]"}
          `}>
            {isApproved
              ? <CheckCircle2 className="w-4 h-4" />
              : isLocked
              ? <Lock className="w-4 h-4" />
              : isAdditional
              ? `A${(m.stageNumber || 9) - 8}`
              : String(m.stageNumber || 1).padStart(2, "0")}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-foreground truncate">{m.name || "Milestone"}</span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0 ${getMilestoneStateBadgeClass(rawState)}`}>
                {formatEnumLabel(rawState, "LOCKED")}
              </span>
              {isAdditional && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-border text-muted-foreground uppercase tracking-wider shrink-0">
                  Additional
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{m.description || ""}</p>
          </div>
        </div>

        {/* right: doc info + chevron */}
        <div className="flex items-center gap-3 shrink-0 text-xs">
          {m.document && (
            <div className="hidden sm:flex items-center gap-1.5 text-muted-foreground text-[11px]">
              <FileText className="w-3.5 h-3.5" />
              <span>v{m.document.currentVersion} · {m.document.wordCount}w</span>
            </div>
          )}
          {!isLocked && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>
    );
  };

  return (
    <>
      <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
        {/* header */}
        <div className="flex items-center justify-between border-b border-border pb-4 flex-wrap gap-3">
          <div>
            <span className="text-[11px] font-semibold text-gold uppercase tracking-wider">8-Stage Execution Pipeline</span>
            <h2 className="text-base font-semibold text-foreground mt-0.5">Mandatory Project Milestones</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#65C466]" /> Approved</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gold" /> In Progress</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-muted-foreground" /> Locked</span>
            </div>
            {projectId && (
              <button
                onClick={() => setShowAdd(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-background hover:bg-accent text-foreground text-[11px] font-semibold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Milestone
              </button>
            )}
          </div>
        </div>

        {/* mandatory 8 */}
        <div className="space-y-2.5">
          {mandatory.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">No mandatory milestones found for this project.</p>
          ) : (
            mandatory.map(m => renderRow(m, false))
          )}
        </div>

        {/* additional milestones */}
        {additional.length > 0 && (
          <div className="space-y-2.5 pt-2 border-t border-border">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">Additional Milestones</span>
            {additional.map(m => renderRow(m, true))}
          </div>
        )}
      </div>

      {showAdd && projectId && (
        <AddMilestoneModal
          projectId={projectId}
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); onRefresh?.(); }}
        />
      )}
    </>
  );
}
