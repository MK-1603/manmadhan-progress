"use client";

import React, { useState } from "react";
import { Lock, CheckCircle2, FileText, ChevronRight, Plus, Loader2, X, Flag, AlertCircle, Calendar } from "lucide-react";
import { formatEnumLabel, getMilestoneStateBadgeClass } from "@/lib/utils/formatters";
import apiClient from "@/lib/api-client";

export interface StageMilestone {
  id: string;
  stageNumber?: number;
  milestoneCode?: string;
  name: string;
  description?: string;
  state?: string | null;
  status?: string | null;
  source?: "SYSTEM" | "MANUAL";
  deadline?: string | null;
  targetDate?: string | null;
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

/* ── Add Milestone Modal (Theme-Consistent) ── */
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
      const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : null;
      const res = await apiClient.post(`/org/projects/${projectId}/milestones`, {
        workspaceId: wsId,
        name: name.trim(),
        description: description.trim() || null,
        deadline: new Date(deadline).toISOString(),
        source: "MANUAL",
      });
      if (res.data.success) { onSaved(); onClose(); }
      else setError(res.data.error || "Failed to add milestone.");
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || "Failed to add milestone.");
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-[4px] p-4">
      <div className="w-full max-w-md bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[16px] shadow-2xl overflow-hidden font-sans">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E4E7EC] dark:border-[#272D36]">
          <div className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-[#C9A52A] dark:text-[#D4B12F]" />
            <span className="text-[14px] font-bold text-[#17202A] dark:text-[#F2F4F7]">Add Milestone</span>
          </div>
          <button onClick={onClose} className="p-1 text-[#667085] hover:text-[#17202A] dark:hover:text-[#F2F4F7] transition-colors cursor-pointer">
            <X className="w-4.5 h-4.5" />
          </button>
        </div>
        <div className="p-5 space-y-3.5 text-[12.5px]">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-[8px] bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[12px]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div>
            <label className="block text-[12px] font-semibold text-[#17202A] dark:text-[#F2F4F7] mb-1">
              Milestone Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Core System Verification"
              className="w-full px-3.5 h-[42px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] rounded-[9px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#C9A52A] dark:focus:border-[#D4B12F] transition-colors"
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#17202A] dark:text-[#F2F4F7] mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Scope and key deliverable criteria..."
              className="w-full p-3 bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] rounded-[9px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#C9A52A] dark:focus:border-[#D4B12F] transition-colors resize-none"
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#17202A] dark:text-[#F2F4F7] mb-1">
              Target Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
              className="w-full px-3.5 h-[42px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] rounded-[9px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#C9A52A] dark:focus:border-[#D4B12F] transition-colors"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-[#E4E7EC] dark:border-[#272D36]">
            <button onClick={onClose} className="px-4 h-[40px] rounded-[9px] border border-[#E4E7EC] dark:border-[#272D36] bg-[#FFFFFF] dark:bg-[#15191F] font-semibold text-[#17202A] dark:text-[#F2F4F7] hover:bg-[#F3F4F6] transition-colors cursor-pointer">
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={loading || !name.trim()}
              className="px-4 h-[40px] rounded-[9px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>Add Milestone</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main View Component ── */
export function ProjectMilestonesView({
  milestones,
  projectId,
  onSelectMilestone,
  onRefresh,
}: ProjectMilestonesViewProps) {
  const [showAdd, setShowAdd] = useState(false);

  const list = [...(milestones || [])].sort((a, b) => (a.stageNumber || 99) - (b.stageNumber || 99));

  return (
    <>
      <div className="space-y-4 font-sans text-[#17202A] dark:text-[#F2F4F7]">
        {/* Header toolbar */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E4E7EC] dark:border-[#272D36]">
          <div className="space-y-0.5">
            <span className="text-[10.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-[0.08em]">
              PROJECT MILESTONES
            </span>
            <h3 className="text-[14px] font-semibold text-[#17202A] dark:text-[#F2F4F7]">
              Execution Checkpoints & Milestones
            </h3>
          </div>
          {projectId && (
            <button
              onClick={() => setShowAdd(true)}
              className="px-3.5 h-[36px] rounded-[8px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[12px] font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Milestone</span>
            </button>
          )}
        </div>

        {/* Milestone Timeline List */}
        <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E4E7EC] dark:before:bg-[#272D36]">
          {list.length === 0 ? (
            <div className="text-center py-8 text-[13px] text-[#667085] dark:text-[#8B95A5]">
              No milestones yet. Create a milestone to define an important checkpoint.
            </div>
          ) : (
            list.map((m, idx) => {
              const rawState = m.state || m.status || "UPCOMING";
              const isApproved = rawState === "APPROVED" || rawState === "COMPLETED";
              const isInProgress = rawState === "AVAILABLE" || rawState === "IN_PROGRESS";

              return (
                <div key={m.id || idx} className="relative flex items-start justify-between gap-3 group">
                  {/* Timeline Dot */}
                  <div
                    className={`absolute -left-6 top-1 w-5 h-5 rounded-full border-2 flex items-center justify-center bg-[#FFFFFF] dark:bg-[#15191F] transition-colors ${
                      isApproved
                        ? "border-emerald-500 text-emerald-500"
                        : isInProgress
                        ? "border-[#C9A52A] dark:border-[#D4B12F] text-[#C9A52A] dark:text-[#D4B12F]"
                        : "border-[#E4E7EC] dark:border-[#272D36] text-[#667085]"
                    }`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${
                        isApproved
                          ? "bg-emerald-500"
                          : isInProgress
                          ? "bg-[#C9A52A] dark:bg-[#D4B12F]"
                          : "bg-transparent"
                      }`}
                    />
                  </div>

                  {/* Milestone Details */}
                  <div
                    onClick={() => onSelectMilestone?.(m)}
                    className="flex-1 p-3 bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] rounded-[10px] hover:border-[#C9A52A] dark:hover:border-[#D4B12F] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[13.5px] font-semibold text-[#17202A] dark:text-[#F2F4F7] truncate">
                          {m.name}
                        </span>
                        <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded border border-[#E4E7EC] dark:border-[#272D36] text-[#667085] dark:text-[#8B95A5] uppercase">
                          {m.source || (m.stageNumber ? "SYSTEM" : "MANUAL")}
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                        isApproved
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : isInProgress
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                          : "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20"
                      }`}>
                        {rawState}
                      </span>
                    </div>

                    {m.description && (
                      <p className="text-[12px] text-[#667085] dark:text-[#8B95A5] line-clamp-2 mt-0.5">
                        {m.description}
                      </p>
                    )}

                    {(m.deadline || m.targetDate) && (
                      <p className="text-[11px] font-mono text-[#667085] dark:text-[#8B95A5] mt-1.5 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Target: {new Date(m.deadline || m.targetDate || "").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
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
