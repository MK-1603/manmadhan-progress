"use client";

import React, { useState, useEffect } from "react";
import { Plus, Shield, Users, X, AlertCircle, ArrowRight, ArrowLeft, Check } from "lucide-react";
import apiClient from "@/lib/api-client";
import { useMediaQuery } from "@/hooks/use-media-query";
import { MobileSheet } from "@/components/ui/mobile-sheet";
import { CustomSelect } from "@/components/ui/custom-select";
import { CustomDatePicker } from "@/components/ui/custom-date-picker";

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (project: any) => void;
  /** Pre-selects the CO-CEO assignee when opened from their profile page */
  defaultAssigneeId?: string | null;
  defaultAssigneeName?: string | null;
}

const PRIORITY_OPTIONS = [
  { value: "Low", label: "Low", color: "bg-slate-400" },
  { value: "Medium", label: "Medium", color: "bg-[#C9A52A]" },
  { value: "High", label: "High", color: "bg-amber-500" },
  { value: "Critical", label: "Critical", color: "bg-rose-500" },
];

export function CreateProjectModal({
  isOpen,
  onClose,
  onSuccess,
  defaultAssigneeId = null,
  defaultAssigneeName = null,
}: CreateProjectModalProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");

  const [step, setStep] = useState<1 | 2>(1);
  const [title, setTitle] = useState("");
  const [mandate, setMandate] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState<"Low" | "Medium" | "High" | "Critical">("Medium");
  const [assignmentType, setAssignmentType] = useState<"CEO_TO_CO_CEO" | "CEO_TO_MEMBER">("CEO_TO_CO_CEO");
  const [assignedToUserId, setAssignedToUserId] = useState(defaultAssigneeId || "");
  const [responsibleCoCeoId, setResponsibleCoCeoId] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    async function loadMembers() {
      try {
        const res = await apiClient.get("/organization/members");
        if (res.data?.data) {
          setMembers(res.data.data);
        }
      } catch (e) {
        console.error("Failed to load workspace members:", e);
      }
    }
    loadMembers();
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter candidate assignees (CO-CEO and MEMBER only, excluding CEO self-assignment)
  const coCeos = members.filter((m) => {
    const r = (m.role || "").toUpperCase();
    return r === "CO-CEO" || r === "CO_CEO";
  });

  const memberUsers = members.filter((m) => {
    const r = (m.role || "").toUpperCase();
    return r === "MEMBER" || r === "USER";
  });

  const coCeoOptions = coCeos.map((c) => ({
    value: c.id,
    label: c.name || c.displayName || c.email,
    sublabel: `CO-CEO · ${c.activeTasksCount ?? 0} active assignments`,
  }));

  const memberOptions = memberUsers.map((m) => ({
    value: m.id,
    label: m.name || m.displayName || m.email,
    sublabel: `Member · ${m.activeTasksCount ?? 0} active assignments`,
  }));

  const isStep1Valid = title.trim().length > 0 && mandate.trim().length >= 5;

  const handleStep1Continue = () => {
    if (!isStep1Valid) return;
    setError(null);
    setStep(2);
  };

  const handleCreateProject = async () => {
    if (!title.trim()) {
      setError("Project name is required.");
      setStep(1);
      return;
    }
    if (!mandate.trim()) {
      setError("Project mandate is required.");
      setStep(1);
      return;
    }
    if (!assignedToUserId) {
      setError("Please select an assignee for this project.");
      return;
    }
    if (assignmentType === "CEO_TO_MEMBER" && !responsibleCoCeoId) {
      setError("Responsible CO-CEO selection is mandatory when assigning directly to a Member.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const res = await apiClient.post("/org/projects/create-v2", {
        title: title.trim(),
        description: mandate.trim(),
        prompt: mandate.trim(),
        deadline: deadline || null,
        priority,
        assignedToUserId,
        assignmentType,
        responsibleCoCeoId: assignmentType === "CEO_TO_MEMBER" ? responsibleCoCeoId : null,
      });

      if (res.data?.success) {
        onSuccess(res.data.data.project);
        onClose();
        // Reset form after successful creation
        setTitle("");
        setMandate("");
        setDeadline("");
        setPriority("Medium");
        setStep(1);
      } else {
        setError(res.data?.error || "Failed to create organization project.");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to create project.");
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── Header Indicator ─────────────────────────────────────────────────── */
  const renderHeader = () => (
    <div className="space-y-1 font-sans">
      <div className="flex items-center justify-between">
        <p className="text-[11.5px] font-bold text-[#667085] dark:text-[#8B95A5]">
          Step {step} of 2
        </p>
        {!isMobile && (
          <button
            onClick={onClose}
            className="p-1 rounded-[7px] text-[#667085] hover:text-[#17202A] dark:hover:text-[#F2F4F7] hover:bg-[#F3F4F6] dark:hover:bg-[#181D24] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Progress Bar Indicator */}
      <div className="flex items-center gap-2 text-[11px] font-semibold pt-0.5">
        <span className={`flex items-center gap-1 ${step === 1 ? "text-[#C9A52A] dark:text-[#D4B12F]" : "text-emerald-600 dark:text-emerald-400"}`}>
          {step > 1 ? <Check className="w-3 h-3" /> : "●"} Project Mandate
        </span>
        <span className="text-[#E4E7EC] dark:text-[#272D36] font-mono">─────────</span>
        <span className={`flex items-center gap-1 ${step === 2 ? "text-[#C9A52A] dark:text-[#D4B12F]" : "text-[#667085] dark:text-[#8B95A5]"}`}>
          {step === 2 ? "●" : "○"} Assignment
        </span>
      </div>
    </div>
  );

  /* ── Step 1 Form Body (Compact & Non-Scrollable) ───────────────────────── */
  const renderStep1 = () => (
    <div className="space-y-2.5 font-sans text-[12px]">
      {error && (
        <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[11px] flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Project Name */}
      <div className="space-y-0.5">
        <label className="block text-[10.5px] font-bold text-[#17202A] dark:text-[#F2F4F7] uppercase tracking-wider">
          PROJECT NAME *
        </label>
        <input
          type="text"
          placeholder="e.g. ManMadhan Progress V1 Platform"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full h-[36px] px-3 bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] rounded-[8px] text-[12px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#C9A52A] dark:focus:border-[#D4B12F]"
        />
        <p className="text-[10px] text-[#667085] dark:text-[#8B95A5]">
          Give the project a clear name.
        </p>
      </div>

      {/* Project Mandate */}
      <div className="space-y-0.5">
        <label className="block text-[10.5px] font-bold text-[#17202A] dark:text-[#F2F4F7] uppercase tracking-wider">
          PROJECT MANDATE *
        </label>
        <textarea
          rows={3}
          placeholder="Describe what needs to be accomplished, expected outcome, important requirements and constraints..."
          value={mandate}
          onChange={(e) => setMandate(e.target.value)}
          className="w-full p-2.5 bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] rounded-[8px] text-[12px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#C9A52A] dark:focus:border-[#D4B12F] resize-none"
        />
        <p className="text-[10px] text-[#667085] dark:text-[#8B95A5]">
          Define what needs to be accomplished and the expected outcome.
        </p>
      </div>
    </div>
  );

  /* ── Step 2 Form Body (Custom Controls) ─────────────────────────────────── */
  const renderStep2 = () => (
    <div className="space-y-2.5 font-sans text-[12px]">
      {error && (
        <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[11px] flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Compact Read-Only Project Summary */}
      <div className="p-2.5 rounded-[8px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] space-y-0.5">
        <span className="text-[9px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider block">PROJECT</span>
        <p className="text-[12.5px] font-bold text-[#17202A] dark:text-[#F2F4F7] truncate">{title}</p>
        <p className="text-[10.5px] text-[#667085] dark:text-[#8B95A5] line-clamp-1 truncate">
          {mandate}
        </p>
      </div>

      {/* Hierarchy Cards */}
      <div className="space-y-1">
        <label className="block text-[10.5px] font-bold text-[#17202A] dark:text-[#F2F4F7] uppercase tracking-wider">
          ASSIGN PROJECT *
        </label>
        {!defaultAssigneeId && (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => { setAssignmentType("CEO_TO_CO_CEO"); setAssignedToUserId(""); }}
              className={`p-2.5 rounded-[8px] border text-left transition-all cursor-pointer ${
                assignmentType === "CEO_TO_CO_CEO"
                  ? "border-[#C9A52A] dark:border-[#D4B12F] bg-[#C9A52A]/10 ring-1 ring-[#C9A52A]/30"
                  : "border-[#E4E7EC] dark:border-[#272D36] bg-[#FFFFFF] dark:bg-[#15191F]"
              }`}
            >
              <div className="font-bold text-[#17202A] dark:text-[#F2F4F7] flex items-center gap-1 text-[11px]">
                <Shield className="w-3.5 h-3.5 text-[#C9A52A]" /> CEO → CO-CEO
              </div>
              <p className="text-[10px] text-[#667085] dark:text-[#8B95A5] mt-0.5 truncate">Executive ownership</p>
            </button>

            <button
              type="button"
              onClick={() => { setAssignmentType("CEO_TO_MEMBER"); setAssignedToUserId(""); }}
              className={`p-2.5 rounded-[8px] border text-left transition-all cursor-pointer ${
                assignmentType === "CEO_TO_MEMBER"
                  ? "border-[#C9A52A] dark:border-[#D4B12F] bg-[#C9A52A]/10 ring-1 ring-[#C9A52A]/30"
                  : "border-[#E4E7EC] dark:border-[#272D36] bg-[#FFFFFF] dark:bg-[#15191F]"
              }`}
            >
              <div className="font-bold text-[#17202A] dark:text-[#F2F4F7] flex items-center gap-1 text-[11px]">
                <Users className="w-3.5 h-3.5 text-[#667085]" /> CEO → MEMBER
              </div>
              <p className="text-[10px] text-[#667085] dark:text-[#8B95A5] mt-0.5 truncate">Direct assignment</p>
            </button>
          </div>
        )}
      </div>

      {/* Assignee Custom Dropdowns */}
      {defaultAssigneeId ? (
        <div>
          <label className="block text-[10.5px] font-bold text-[#17202A] dark:text-[#F2F4F7] mb-0.5">
            RESPONSIBLE CO-CEO *
          </label>
          <div className="w-full h-[36px] px-3 rounded-[7px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#C9A52A]/40 text-[#17202A] dark:text-[#F2F4F7] font-bold flex items-center justify-between text-[11.5px]">
            <span>{defaultAssigneeName || "CO-CEO"}</span>
            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              CO-CEO
            </span>
          </div>
        </div>
      ) : assignmentType === "CEO_TO_CO_CEO" ? (
        <div>
          <label className="block text-[10.5px] font-bold text-[#17202A] dark:text-[#F2F4F7] mb-0.5">
            RESPONSIBLE CO-CEO *
          </label>
          <CustomSelect
            value={assignedToUserId}
            onChange={setAssignedToUserId}
            options={coCeoOptions}
            placeholder="Select CO-CEO..."
          />
        </div>
      ) : (
        <div className="space-y-2">
          <div>
            <label className="block text-[10.5px] font-bold text-[#17202A] dark:text-[#F2F4F7] mb-0.5">
              RESPONSIBLE CO-CEO *
            </label>
            <CustomSelect
              value={responsibleCoCeoId}
              onChange={setResponsibleCoCeoId}
              options={coCeoOptions}
              placeholder="Select CO-CEO..."
            />
          </div>
          <div>
            <label className="block text-[10.5px] font-bold text-[#17202A] dark:text-[#F2F4F7] mb-0.5">
              TARGET MEMBER *
            </label>
            <CustomSelect
              value={assignedToUserId}
              onChange={setAssignedToUserId}
              options={memberOptions}
              placeholder="Select Member..."
            />
          </div>
        </div>
      )}

      {/* Custom Target Date & Priority Grid */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10.5px] font-bold text-[#17202A] dark:text-[#F2F4F7] mb-0.5">
            TARGET DATE
          </label>
          <CustomDatePicker
            value={deadline}
            onChange={setDeadline}
            placeholder="Select date"
          />
        </div>
        <div>
          <label className="block text-[10.5px] font-bold text-[#17202A] dark:text-[#F2F4F7] mb-0.5">
            PRIORITY
          </label>
          <CustomSelect
            value={priority}
            onChange={(val) => setPriority(val as any)}
            options={PRIORITY_OPTIONS}
            placeholder="Select priority..."
          />
        </div>
      </div>
    </div>
  );

  /* ── Action Footer ──────────────────────────────────────────────────────── */
  const renderFooterActions = () => (
    <div className="flex items-center justify-between w-full font-sans">
      {step === 2 ? (
        <button
          type="button"
          onClick={() => { setError(null); setStep(1); }}
          className="px-3 h-[38px] rounded-[8px] border border-[#E4E7EC] dark:border-[#272D36] text-[#17202A] dark:text-[#F2F4F7] text-[11.5px] font-semibold hover:bg-[#F3F4F6] transition-colors flex items-center gap-1 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
      ) : (
        <button
          type="button"
          onClick={onClose}
          className="px-3.5 h-[38px] rounded-[8px] border border-[#E4E7EC] dark:border-[#272D36] text-[#17202A] dark:text-[#F2F4F7] text-[11.5px] font-semibold hover:bg-[#F3F4F6] transition-colors cursor-pointer"
        >
          Cancel
        </button>
      )}

      <div className="flex items-center gap-2">
        {step === 2 && (
          <button
            type="button"
            onClick={onClose}
            className="px-3 h-[38px] rounded-[8px] border border-[#E4E7EC] dark:border-[#272D36] text-[#17202A] dark:text-[#F2F4F7] text-[11.5px] font-semibold hover:bg-[#F3F4F6] transition-colors cursor-pointer"
          >
            Cancel
          </button>
        )}

        {step === 1 ? (
          <button
            type="button"
            onClick={handleStep1Continue}
            disabled={!isStep1Valid}
            className="px-4 h-[38px] rounded-[8px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[12px] font-semibold hover:opacity-90 transition-all flex items-center gap-1 shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
          >
            <span>Continue to Assignment</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleCreateProject}
            disabled={isSubmitting}
            className="px-4 h-[38px] rounded-[8px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[12px] font-semibold hover:opacity-90 transition-all flex items-center gap-1 shadow-xs disabled:opacity-50 cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isSubmitting ? "Creating Project..." : "+ Create Project"}</span>
          </button>
        )}
      </div>
    </div>
  );

  /* ── Mobile Viewport Layout ─────────────────────────────────────────────── */
  if (isMobile) {
    return (
      <MobileSheet
        isOpen={isOpen}
        onClose={onClose}
        title={`Create Organization Project (${step}/2)`}
        footerActions={renderFooterActions()}
      >
        <div className="space-y-2.5">
          {renderHeader()}
          {step === 1 ? renderStep1() : renderStep2()}
        </div>
      </MobileSheet>
    );
  }

  /* ── Desktop Viewport Layout (Width ~ 620px) ────────────────────────────── */
  return (
    <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[4px] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] text-[#17202A] dark:text-[#F2F4F7] rounded-[14px] max-w-[620px] w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="px-5 py-3 border-b border-[#E4E7EC] dark:border-[#272D36] shrink-0">
          {renderHeader()}
        </div>

        {/* Body */}
        <div className="p-5 flex-1 overflow-y-hidden">
          {step === 1 ? renderStep1() : renderStep2()}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-[#E4E7EC] dark:border-[#272D36] bg-[#F8F9FB] dark:bg-[#111419] shrink-0">
          {renderFooterActions()}
        </div>
      </div>
    </div>
  );
}
