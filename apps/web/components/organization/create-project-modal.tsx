"use client";

import React, { useState, useEffect } from "react";
import { X, ChevronRight, ChevronLeft, Calendar, Shield, Users, Loader2, Sparkles, AlertCircle } from "lucide-react";
import apiClient from "@/lib/api-client";

interface AssigneeUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateProjectModal({ isOpen, onClose, onSuccess }: CreateProjectModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [mandate, setMandate] = useState("");

  const [assignmentType, setAssignmentType] = useState<"CEO_TO_CO_CEO" | "CEO_TO_MEMBER">("CEO_TO_CO_CEO");
  const [responsibleCoCeoId, setResponsibleCoCeoId] = useState("");
  const [assignedToUserId, setAssignedToUserId] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("MEDIUM");

  const [coCeos, setCoCeos] = useState<AssigneeUser[]>([]);
  const [members, setMembers] = useState<AssigneeUser[]>([]);
  const [allUsers, setAllUsers] = useState<AssigneeUser[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setName("");
      setMandate("");
      setAssignmentType("CEO_TO_CO_CEO");
      setResponsibleCoCeoId("");
      setAssignedToUserId("");
      setDeadline("");
      setPriority("MEDIUM");
      setError("");

      fetchEligibleAssignees();
    }
  }, [isOpen]);

  const fetchEligibleAssignees = async () => {
    try {
      const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : undefined;
      const res = await apiClient.get(`/org/projects/eligible-assignees${wsId ? `?workspaceId=${wsId}` : ""}`);
      if (res.data?.data) {
        setCoCeos(res.data.data.coCeos || []);
        setMembers(res.data.data.members || []);
        setAllUsers(res.data.data.all || []);
      }
    } catch (err: any) {
      console.error("Failed to fetch assignees:", err);
    }
  };

  if (!isOpen) return null;

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Project Name is required.");
      return;
    }
    if (!mandate.trim()) {
      setError("Project Mandate is required.");
      return;
    }
    setStep(2);
  };

  const handleCreateProject = async () => {
    setError("");
    if (!assignedToUserId) {
      setError("Please select an assigned recipient for this project.");
      return;
    }
    if (assignmentType === "CEO_TO_MEMBER" && !responsibleCoCeoId) {
      setError("Responsible CO-CEO is required when assigning directly to a Member.");
      return;
    }

    setSubmitting(true);
    try {
      const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : undefined;
      const validWsId = wsId && wsId !== "undefined" && wsId !== "null" ? wsId : undefined;
      await apiClient.post(`/org/projects/create-v2${validWsId ? `?workspaceId=${validWsId}` : ""}`, {
        workspaceId: validWsId,
        title: name.trim(),
        description: mandate.trim(),
        prompt: mandate.trim(),
        deadline: deadline ? new Date(deadline).toISOString() : null,
        assignedToUserId,
        assignmentType,
        responsibleCoCeoId: assignmentType === "CEO_TO_MEMBER" ? responsibleCoCeoId : assignedToUserId,
        priority,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      const errObj = err?.response?.data?.error;
      const msg = typeof errObj === "string" ? errObj : errObj?.message || err?.message || "Failed to create project. Please try again.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 w-screen h-screen z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-200 overflow-x-hidden">
      <div className="w-full sm:max-w-xl bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-t-[20px] sm:rounded-[16px] shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh] overflow-hidden font-sans">
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[#E4E7EC] dark:border-[#272D36] flex items-center justify-between bg-[#F8F9FB] dark:bg-[#111419]">
          <div>
            <h2 className="text-[16px] font-bold text-[#17202A] dark:text-[#F2F4F7] flex items-center gap-2">
              <span>Create Project</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#C9A52A]/10 text-[#C9A52A] dark:text-[#D4B12F] font-semibold border border-[#C9A52A]/20">
                Step {step} of 2
              </span>
            </h2>
            <p className="text-[12px] text-[#667085] dark:text-[#8B95A5] mt-0.5">
              {step === 1 ? "Project Mandate & Objectives" : "Assignment & Execution Settings"}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#667085] dark:text-[#8B95A5] hover:bg-[#E4E7EC] dark:hover:bg-[#272D36] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Indicator Bar */}
        <div className="w-full bg-[#E4E7EC] dark:bg-[#272D36] h-1">
          <div
            className="bg-[#C9A52A] dark:bg-[#D4B12F] h-1 transition-all duration-300"
            style={{ width: step === 1 ? "50%" : "100%" }}
          />
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-5 mt-4 p-3 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[12.5px] font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Modal Form Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {step === 1 ? (
            <form id="create-step-1-form" onSubmit={handleNextStep} className="space-y-4">
              {/* Project Name */}
              <div className="space-y-1.5">
                <label className="text-[12.5px] font-semibold text-[#17202A] dark:text-[#F2F4F7]">
                  Project Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ManMadhan Execution Engine V2"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-[44px] px-3.5 rounded-[10px] bg-[#FFFFFF] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] text-[13.5px] text-[#17202A] dark:text-[#F2F4F7] placeholder:text-[#98A2B3] dark:placeholder:text-[#667085] outline-none focus:border-[#C9A52A] dark:focus:border-[#D4B12F] transition-all shadow-xs"
                />
                <p className="text-[11.5px] text-[#667085] dark:text-[#8B95A5]">
                  Give the project a clear, recognizable name.
                </p>
              </div>

              {/* Project Mandate */}
              <div className="space-y-1.5">
                <label className="text-[12.5px] font-semibold text-[#17202A] dark:text-[#F2F4F7]">
                  Project Mandate <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Define what needs to be accomplished and the expected outcome..."
                  value={mandate}
                  onChange={(e) => setMandate(e.target.value)}
                  className="w-full p-3 rounded-[10px] bg-[#FFFFFF] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] text-[13.5px] text-[#17202A] dark:text-[#F2F4F7] placeholder:text-[#98A2B3] dark:placeholder:text-[#667085] outline-none focus:border-[#C9A52A] dark:focus:border-[#D4B12F] transition-all shadow-xs resize-none"
                />
                <p className="text-[11.5px] text-[#667085] dark:text-[#8B95A5]">
                  Define what needs to be accomplished and the expected outcome.
                </p>
              </div>
            </form>
          ) : (
            <div className="space-y-5">
              {/* Project Summary Banner */}
              <div className="p-3.5 rounded-[12px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] space-y-1">
                <p className="text-[10.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-[0.08em]">
                  PROJECT MANDATE PREVIEW
                </p>
                <h4 className="text-[14px] font-bold text-[#17202A] dark:text-[#F2F4F7] truncate">{name}</h4>
                <p className="text-[12px] text-[#667085] dark:text-[#8B95A5] line-clamp-2 leading-relaxed">{mandate}</p>
              </div>

              {/* Assignment Selector */}
              <div className="space-y-3">
                <label className="text-[12.5px] font-semibold text-[#17202A] dark:text-[#F2F4F7]">
                  ASSIGNMENT FLOW
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setAssignmentType("CEO_TO_CO_CEO");
                      setAssignedToUserId(coCeos[0]?.id || "");
                    }}
                    className={`p-3 rounded-[11px] border text-left transition-all ${
                      assignmentType === "CEO_TO_CO_CEO"
                        ? "border-[#C9A52A] dark:border-[#D4B12F] bg-[#C9A52A]/10 text-[#17202A] dark:text-[#F2F4F7]"
                        : "border-[#E4E7EC] dark:border-[#272D36] bg-[#FFFFFF] dark:bg-[#111419] text-[#667085] dark:text-[#8B95A5]"
                    }`}
                  >
                    <div className="text-[12.5px] font-bold">CEO → CO-CEO</div>
                    <div className="text-[11px] opacity-80 mt-0.5">Assign directly to CO-CEO</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAssignmentType("CEO_TO_MEMBER");
                      setAssignedToUserId(members[0]?.id || "");
                    }}
                    className={`p-3 rounded-[11px] border text-left transition-all ${
                      assignmentType === "CEO_TO_MEMBER"
                        ? "border-[#C9A52A] dark:border-[#D4B12F] bg-[#C9A52A]/10 text-[#17202A] dark:text-[#F2F4F7]"
                        : "border-[#E4E7EC] dark:border-[#272D36] bg-[#FFFFFF] dark:bg-[#111419] text-[#667085] dark:text-[#8B95A5]"
                    }`}
                  >
                    <div className="text-[12.5px] font-bold">CEO → MEMBER</div>
                    <div className="text-[11px] opacity-80 mt-0.5">Assign to Team Member</div>
                  </button>
                </div>
              </div>

              {/* Assignee Dropdown */}
              <div className="space-y-1.5">
                <label className="text-[12.5px] font-semibold text-[#17202A] dark:text-[#F2F4F7]">
                  {assignmentType === "CEO_TO_CO_CEO" ? "ASSIGN TO CO-CEO *" : "ASSIGN TO MEMBER *"}
                </label>
                <select
                  value={assignedToUserId}
                  onChange={(e) => setAssignedToUserId(e.target.value)}
                  className="w-full h-[44px] px-3.5 rounded-[10px] bg-[#FFFFFF] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] text-[13.5px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#C9A52A] dark:focus:border-[#D4B12F]"
                >
                  <option value="">Select Assignee...</option>
                  {(assignmentType === "CEO_TO_CO_CEO" ? (coCeos.length > 0 ? coCeos : allUsers) : (members.length > 0 ? members : allUsers)).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role || (assignmentType === "CEO_TO_CO_CEO" ? "CO-CEO" : "MEMBER")})
                    </option>
                  ))}
                </select>
              </div>

              {/* Responsible CO-CEO (Mandatory for Member Assignments) */}
              {assignmentType === "CEO_TO_MEMBER" && (
                <div className="space-y-1.5">
                  <label className="text-[12.5px] font-semibold text-[#17202A] dark:text-[#F2F4F7]">
                    RESPONSIBLE CO-CEO *
                  </label>
                  <select
                    value={responsibleCoCeoId}
                    onChange={(e) => setResponsibleCoCeoId(e.target.value)}
                    className="w-full h-[44px] px-3.5 rounded-[10px] bg-[#FFFFFF] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] text-[13.5px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#C9A52A] dark:focus:border-[#D4B12F]"
                  >
                    <option value="">Select Responsible CO-CEO...</option>
                    {(coCeos.length > 0 ? coCeos : allUsers).map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role || "CO-CEO"})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* 2-Column Layout: Target Date & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[12.5px] font-semibold text-[#17202A] dark:text-[#F2F4F7]">
                    TARGET DATE
                  </label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full h-[44px] px-3.5 rounded-[10px] bg-[#FFFFFF] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] text-[13.5px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#C9A52A] dark:focus:border-[#D4B12F]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12.5px] font-semibold text-[#17202A] dark:text-[#F2F4F7]">
                    PRIORITY
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full h-[44px] px-3.5 rounded-[10px] bg-[#FFFFFF] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] text-[13.5px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#C9A52A] dark:focus:border-[#D4B12F]"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer CTA */}
        <div className="px-5 pt-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] border-t border-[#E4E7EC] dark:border-[#272D36] flex items-center justify-between bg-[#F8F9FB] dark:bg-[#111419] shrink-0">
          {step === 2 ? (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="h-[40px] px-4 rounded-[10px] border border-[#E4E7EC] dark:border-[#272D36] text-[#17202A] dark:text-[#F2F4F7] text-[13px] font-semibold hover:bg-[#E4E7EC]/50 dark:hover:bg-[#272D36]/50 transition-all flex items-center gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="h-[40px] px-4 rounded-[10px] text-[#667085] dark:text-[#8B95A5] text-[13px] font-semibold hover:text-[#17202A] dark:hover:text-[#F2F4F7] transition-all"
            >
              Cancel
            </button>
          )}

          {step === 1 ? (
            <button
              type="submit"
              form="create-step-1-form"
              className="h-[40px] px-5 rounded-[10px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[13px] font-bold hover:opacity-90 transition-all flex items-center gap-1.5 active:scale-95 shadow-xs"
            >
              Next: Assignment <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={handleCreateProject}
              className="h-[40px] px-6 rounded-[10px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[13px] font-bold hover:opacity-90 transition-all flex items-center gap-2 active:scale-95 shadow-xs disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Creating...
                </>
              ) : (
                "Create Project"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
