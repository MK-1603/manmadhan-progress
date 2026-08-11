"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, ArrowRight, CheckCircle2, AlertCircle, Shield, FolderKanban, Users, X } from "lucide-react";
import apiClient from "@/lib/api-client";

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (project: any) => void;
}

export function CreateProjectModal({ isOpen, onClose, onSuccess }: CreateProjectModalProps) {
  const [step, setStep] = useState<"PROMPT" | "ANALYSIS" | "CONFIRM">("PROMPT");
  const [prompt, setPrompt] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [assignmentType, setAssignmentType] = useState<"CEO_TO_CO_CEO" | "CEO_TO_MEMBER">("CEO_TO_CO_CEO");
  const [assignedToUserId, setAssignedToUserId] = useState("");
  const [responsibleCoCeoId, setResponsibleCoCeoId] = useState("");

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
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

  const coCeos = members.filter(m => m.role === "CO-CEO");
  const memberUsers = members.filter(m => m.role === "MEMBER" || m.role === "USER");

  const handleAnalyze = async () => {
    if (!prompt.trim() || prompt.trim().length < 5) {
      setError("Please provide a prompt describing your project mandate (min 5 characters).");
      return;
    }

    setError(null);
    setIsAnalyzing(true);
    try {
      const res = await apiClient.post("/org/projects/analyze", { prompt: prompt.trim() });
      if (res.data?.success && res.data.data) {
        setAnalysis(res.data.data);
        if (!title) setTitle(prompt.split(".")[0].slice(0, 50).trim());
        setStep("ANALYSIS");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to analyze project prompt.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCreateProject = async () => {
    if (!title.trim()) {
      setError("Project title is required.");
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
        description: description || prompt,
        deadline: deadline || null,
        assignedToUserId,
        assignmentType,
        responsibleCoCeoId: assignmentType === "CEO_TO_MEMBER" ? responsibleCoCeoId : null,
        prompt: prompt.trim(),
        analysisData: analysis,
      });

      if (res.data?.success) {
        onSuccess(res.data.data.project);
        onClose();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to create project.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/72 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#171717] border border-[#292929] rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-[#292929] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-[#E3AA18] shrink-0" />
            <div>
              <h2 className="text-[19px] font-[650] text-[#F5F5F5] leading-tight">Create Organization Project</h2>
              <p className="text-[13px] text-[#858585] mt-0.5">Define the project you want to execute.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#858585] hover:text-[#F5F5F5] hover:bg-[#222222] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3.5 rounded-xl bg-[#E05252]/10 border border-[#E05252]/20 text-[#E05252] text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {step === "PROMPT" && (
            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-semibold text-[#D6D6D6] tracking-[0.06em] uppercase mb-2">
                  PROJECT TITLE *
                </label>
                <input
                  type="text"
                  placeholder="e.g. AI Grievance Management System"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-[#111111] border border-[#2A2A2A] text-sm text-[#F5F5F5] placeholder-[#777777] focus:outline-none focus:border-[#E3AA18] focus:ring-1 focus:ring-[#E3AA18]/15"
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-[#D6D6D6] tracking-[0.06em] uppercase mb-2">
                  ORIGINAL PROJECT PROMPT *
                </label>
                <textarea
                  rows={4}
                  placeholder="Describe project goal, key features, technology stack and deadlines..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full p-3.5 rounded-xl bg-[#111111] border border-[#2A2A2A] text-sm text-[#F5F5F5] placeholder-[#777777] focus:outline-none focus:border-[#E3AA18] focus:ring-1 focus:ring-[#E3AA18]/15"
                />
              </div>
            </div>
          )}

          {step === "ANALYSIS" && analysis && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#151515] border border-[#292929]">
                <span className="font-bold text-[#F5F5F5] text-sm">{analysis.type}</span>
                <span className="px-2.5 py-1 rounded-full bg-[#E3AA18]/10 text-[#E3AA18] border border-[#E3AA18]/20 font-semibold text-[11px]">
                  {analysis.complexity} Complexity
                </span>
              </div>

              <div>
                <h4 className="font-semibold text-[#D6D6D6] uppercase tracking-[0.06em] text-[12px] mb-2">Detected Core Modules</h4>
                <div className="grid grid-cols-2 gap-2">
                  {analysis.coreFeatures?.map((f: string, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-[#B8B8B8] text-[12px] p-2 rounded-lg bg-[#111111] border border-[#292929]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#65C466] shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-[#D6D6D6] uppercase tracking-[0.06em] text-[12px] mb-2">7 Mandatory Milestones</h4>
                <div className="grid grid-cols-2 gap-2">
                  {analysis.milestonePlan?.map((m: any) => (
                    <div key={m.stageNumber} className="p-2.5 rounded-lg bg-[#111111] border border-[#292929] text-[12px]">
                      <span className="font-semibold text-[#F5F5F5]">{m.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === "CONFIRM" && (
            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-[12px] font-semibold text-[#D6D6D6] tracking-[0.06em] uppercase mb-2">
                  ASSIGNMENT HIERARCHY
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => { setAssignmentType("CEO_TO_CO_CEO"); setAssignedToUserId(""); }}
                    className={`p-3.5 rounded-xl border text-left transition-colors ${assignmentType === "CEO_TO_CO_CEO" ? "border-[#E3AA18] bg-[#E3AA18]/5" : "border-[#2A2A2A] bg-[#111111]"}`}
                  >
                    <div className="font-semibold text-[#F5F5F5] flex items-center gap-2">
                      <Shield className="w-4 h-4 text-[#E3AA18]" /> CEO → CO-CEO
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAssignmentType("CEO_TO_MEMBER"); setAssignedToUserId(""); }}
                    className={`p-3.5 rounded-xl border text-left transition-colors ${assignmentType === "CEO_TO_MEMBER" ? "border-[#E3AA18] bg-[#E3AA18]/5" : "border-[#2A2A2A] bg-[#111111]"}`}
                  >
                    <div className="font-semibold text-[#F5F5F5] flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#B8B8B8]" /> CEO → Member
                    </div>
                  </button>
                </div>
              </div>

              {assignmentType === "CEO_TO_CO_CEO" ? (
                <div>
                  <label className="block text-[12px] font-semibold text-[#D6D6D6] tracking-[0.06em] uppercase mb-2">
                    ASSIGN TO CO-CEO *
                  </label>
                  <select
                    value={assignedToUserId}
                    onChange={(e) => setAssignedToUserId(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl bg-[#111111] border border-[#2A2A2A] text-sm text-[#F5F5F5] focus:outline-none focus:border-[#E3AA18]"
                  >
                    <option value="">Select CO-CEO...</option>
                    {coCeos.map((c) => (
                      <option key={c.id} value={c.id}>{c.name || c.email} (CO-CEO)</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-semibold text-[#D6D6D6] tracking-[0.06em] uppercase mb-2">
                      RESPONSIBLE CO-CEO *
                    </label>
                    <select
                      value={responsibleCoCeoId}
                      onChange={(e) => setResponsibleCoCeoId(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-xl bg-[#111111] border border-[#2A2A2A] text-sm text-[#F5F5F5] focus:outline-none focus:border-[#E3AA18]"
                    >
                      <option value="">Select CO-CEO...</option>
                      {coCeos.map((c) => (
                        <option key={c.id} value={c.id}>{c.name || c.email}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[#D6D6D6] tracking-[0.06em] uppercase mb-2">
                      TARGET MEMBER *
                    </label>
                    <select
                      value={assignedToUserId}
                      onChange={(e) => setAssignedToUserId(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-xl bg-[#111111] border border-[#2A2A2A] text-sm text-[#F5F5F5] focus:outline-none focus:border-[#E3AA18]"
                    >
                      <option value="">Select Member...</option>
                      {memberUsers.map((m) => (
                        <option key={m.id} value={m.id}>{m.name || m.email}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[12px] font-semibold text-[#D6D6D6] tracking-[0.06em] uppercase mb-2">
                  TARGET DEADLINE (OPTIONAL)
                </label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-[#111111] border border-[#2A2A2A] text-sm text-[#F5F5F5] focus:outline-none focus:border-[#E3AA18]"
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-[#292929] flex items-center justify-between shrink-0">
          {step === "PROMPT" ? (
            <>
              <button onClick={onClose} className="px-4 py-2 rounded-xl bg-transparent border border-[#2A2A2A] text-[#BDBDBD] text-xs font-semibold hover:bg-[#1D1D1D] hover:text-[#F5F5F5] transition-colors">
                Cancel
              </button>
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="px-5 py-2.5 rounded-xl bg-[#E3AA18] hover:bg-[#F0BC2B] text-[#0A0A0A] text-xs font-semibold transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                {isAnalyzing ? "Analyzing Mandate..." : "Analyze Project Mandate"}
              </button>
            </>
          ) : step === "ANALYSIS" ? (
            <>
              <button onClick={() => setStep("PROMPT")} className="px-4 py-2 rounded-xl bg-transparent border border-[#2A2A2A] text-[#BDBDBD] text-xs font-semibold hover:bg-[#1D1D1D] hover:text-[#F5F5F5] transition-colors">
                Back
              </button>
              <button onClick={() => setStep("CONFIRM")} className="px-5 py-2.5 rounded-xl bg-[#E3AA18] hover:bg-[#F0BC2B] text-[#0A0A0A] text-xs font-semibold transition-colors flex items-center gap-2">
                Proceed to Assignment <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setStep("ANALYSIS")} className="px-4 py-2 rounded-xl bg-transparent border border-[#2A2A2A] text-[#BDBDBD] text-xs font-semibold hover:bg-[#1D1D1D] hover:text-[#F5F5F5] transition-colors">
                Back
              </button>
              <button
                onClick={handleCreateProject}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-[#E3AA18] hover:bg-[#F0BC2B] text-[#0A0A0A] text-xs font-semibold transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? "Creating Project..." : "Confirm & Launch Project"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
