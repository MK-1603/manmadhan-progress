"use client";

import React, { useState, useEffect } from "react";
import { BookOpen, Plus, X, Loader2, Sparkles, Check, ChevronRight, ChevronLeft, Calendar, User, Shield, AlertCircle } from "lucide-react";
import apiClient from "@/lib/api-client";

interface CreateLearningPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const TEMPLATE_PRESETS = [
  {
    name: "AI Engineering Mastery",
    objective: "Master core AI agent architecture, RAG, tool stacking, and LLM management.",
    topics: ["AI AGENTS", "RAG ARCHITECTURE", "PROMPT ENGINEERING", "LLM MANAGEMENT", "MCP & AGENT PROTOCOLS"],
  },
  {
    name: "Fullstack SaaS Execution",
    objective: "End-to-end modern web application architecture, auth, database, and deployment.",
    topics: ["NEXT.JS TURBOPACK", "POSTGRESQL & DRIZZLE", "RBAC & AUTHENTICATION", "REAL-TIME SOCKETS", "VERCEL DEPLOYMENT"],
  },
  {
    name: "Productivity & Workflow Automation",
    objective: "Automate organizational workflows and personal execution systems.",
    topics: ["WORKFLOW AUTOMATION", "AI TOOL STACKING", "FOCUS & TIME LOGGING", "COMMUNITY & INVITATIONS"],
  },
];

export function CreateLearningPlanModal({ isOpen, onClose, onSuccess }: CreateLearningPlanModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [objective, setObjective] = useState("");
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("MEDIUM");
  const [targetDate, setTargetDate] = useState("");
  const [selectedOwnerId, setSelectedOwnerId] = useState("");

  // Topics State
  const [topics, setTopics] = useState<string[]>([]);
  const [newTopicTitle, setNewTopicTitle] = useState("");

  // Eligible Users
  const [users, setUsers] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setName("");
      setDescription("");
      setObjective("");
      setPriority("MEDIUM");
      setTargetDate("");
      setTopics([]);
      setError("");

      const fetchEligible = async () => {
        try {
          const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : undefined;
          const res = await apiClient.get(`/org/projects/eligible-assignees${wsId ? `?workspaceId=${wsId}` : ""}`);
          if (res.data?.data) {
            setUsers(res.data.data.all || []);
          }
        } catch (e) {
          console.error("Failed to fetch assignees:", e);
        }
      };
      fetchEligible();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddTopic = () => {
    if (!newTopicTitle.trim()) return;
    setTopics((prev) => [...prev, newTopicTitle.trim()]);
    setNewTopicTitle("");
  };

  const handleRemoveTopic = (index: number) => {
    setTopics((prev) => prev.filter((_, i) => i !== index));
  };

  const handleApplyTemplate = (preset: typeof TEMPLATE_PRESETS[0]) => {
    setName(preset.name);
    setObjective(preset.objective);
    setTopics(preset.topics);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Learning plan name is required");
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : undefined;
      await apiClient.post(`/org/learning/plans${wsId ? `?workspaceId=${wsId}` : ""}`, {
        name: name.trim(),
        description: description.trim() || undefined,
        objective: objective.trim() || undefined,
        priority,
        ownerId: selectedOwnerId || undefined,
        targetDate: targetDate || undefined,
        initialTopics: topics.map((t) => ({ title: t })),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to create learning plan");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-200 overflow-x-hidden font-sans">
      <div className="w-full sm:max-w-xl bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-t-[20px] sm:rounded-[16px] shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh] overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E4E7EC] dark:border-[#272D36] flex items-center justify-between bg-[#F8F9FB] dark:bg-[#111419]">
          <div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#C9A52A] dark:text-[#D4B12F]" />
              <h2 className="text-[17px] font-bold text-[#17202A] dark:text-[#F2F4F7]">
                Create Learning Plan
              </h2>
            </div>
            <p className="text-[12px] text-[#667085] dark:text-[#8B95A5] mt-0.5">
              Step {step} of 4 — {step === 1 ? "Plan Details" : step === 2 ? "Structure & Topics" : step === 3 ? "Assignment" : "Review & Create"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#667085] hover:bg-[#E4E7EC] dark:hover:bg-[#272D36] transition-colors"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Step Indicator Bar */}
        <div className="flex items-center h-1 bg-[#E4E7EC] dark:bg-[#272D36]">
          <div
            className="h-full bg-[#C9A52A] dark:bg-[#D4B12F] transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[12.5px] font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Body Steps */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* STEP 1: Plan Details */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[12.5px] font-semibold text-[#17202A] dark:text-[#F2F4F7]">
                  Plan Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. AI Engineering Mastery 2026"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-[42px] px-3.5 rounded-[10px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] text-[13.5px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#C9A52A]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[12.5px] font-semibold text-[#17202A] dark:text-[#F2F4F7]">
                  Learning Objective
                </label>
                <input
                  type="text"
                  placeholder="e.g. Build end-to-end production AI agents and RAG pipelines."
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  className="w-full h-[42px] px-3.5 rounded-[10px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] text-[13.5px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#C9A52A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[12.5px] font-semibold text-[#17202A] dark:text-[#F2F4F7]">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full h-[42px] px-3 rounded-[10px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] text-[13px] text-[#17202A] dark:text-[#F2F4F7] outline-none"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12.5px] font-semibold text-[#17202A] dark:text-[#F2F4F7]">Target Date</label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full h-[42px] px-3 rounded-[10px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] text-[13px] text-[#17202A] dark:text-[#F2F4F7] outline-none"
                  />
                </div>
              </div>

              {/* Template Presets */}
              <div className="pt-2 border-t border-[#E4E7EC] dark:border-[#272D36] space-y-2">
                <label className="text-[11.5px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#C9A52A]" /> Optional Starter Templates
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {TEMPLATE_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => handleApplyTemplate(preset)}
                      className="p-3 rounded-[10px] border border-[#E4E7EC] dark:border-[#272D36] bg-[#F8F9FB] dark:bg-[#111419] hover:border-[#C9A52A] text-left transition-colors cursor-pointer group"
                    >
                      <div className="text-[13px] font-bold text-[#17202A] dark:text-[#F2F4F7] group-hover:text-[#C9A52A]">
                        {preset.name}
                      </div>
                      <div className="text-[11.5px] text-[#667085] dark:text-[#8B95A5] mt-0.5">
                        {preset.objective}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Structure & Topics */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[12.5px] font-semibold text-[#17202A] dark:text-[#F2F4F7]">
                  Add Topics / Modules to Plan
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Topic title (e.g. Prompt Engineering, RAG)..."
                    value={newTopicTitle}
                    onChange={(e) => setNewTopicTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTopic())}
                    className="flex-1 h-[42px] px-3.5 rounded-[10px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] text-[13px] text-[#17202A] dark:text-[#F2F4F7] outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddTopic}
                    className="h-[42px] px-4 rounded-[10px] bg-[#C9A52A] text-[#0B0D10] text-[12.5px] font-bold hover:opacity-90 transition-opacity flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {/* Topics List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11.5px] font-bold text-[#667085] uppercase tracking-wider">
                  <span>Topics ({topics.length})</span>
                  {topics.length === 0 && <span className="text-amber-500 font-normal">Add at least 1 topic</span>}
                </div>
                {topics.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-[#E4E7EC] dark:border-[#272D36] rounded-[10px] text-[12.5px] text-[#667085]">
                    No topics added yet. Type a topic title above or pick a template from Step 1.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-[220px] overflow-y-auto">
                    {topics.map((t, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-[9px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] text-[13px]"
                      >
                        <div className="flex items-center gap-2.5 font-medium text-[#17202A] dark:text-[#F2F4F7]">
                          <span className="w-5 h-5 rounded-full bg-[#C9A52A]/10 text-[#C9A52A] font-mono font-bold text-[11px] flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span>{t}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveTopic(idx)}
                          className="text-[#667085] hover:text-rose-500 transition-colors p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: Assignment */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[12.5px] font-semibold text-[#17202A] dark:text-[#F2F4F7]">
                  Assign Plan Owner / Lead
                </label>
                <div className="max-h-[240px] overflow-y-auto divide-y divide-[#E4E7EC] dark:divide-[#272D36] border border-[#E4E7EC] dark:border-[#272D36] rounded-[10px] bg-[#FFFFFF] dark:bg-[#15191F]">
                  {users.length === 0 ? (
                    <div className="p-4 text-center text-[12px] text-[#667085]">
                      Loading organization directory...
                    </div>
                  ) : (
                    users.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => setSelectedOwnerId(u.id)}
                        className={`w-full p-3 text-left flex items-center justify-between transition-colors ${
                          selectedOwnerId === u.id
                            ? "bg-[#C9A52A]/10 border-l-4 border-l-[#C9A52A]"
                            : "hover:bg-[#F8F9FB] dark:hover:bg-[#111419]"
                        }`}
                      >
                        <div>
                          <div className="text-[13px] font-bold text-[#17202A] dark:text-[#F2F4F7]">
                            {u.name} ({u.role})
                          </div>
                          <div className="text-[11.5px] text-[#667085]">{u.email}</div>
                        </div>
                        {selectedOwnerId === u.id && <Check className="w-4 h-4 text-[#C9A52A]" />}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Review & Confirm */}
          {step === 4 && (
            <div className="space-y-4 font-sans text-[13px]">
              <div className="p-4 rounded-[12px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[15px] font-bold text-[#17202A] dark:text-[#F2F4F7]">{name}</h4>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#C9A52A]/10 text-[#C9A52A] font-bold text-[10.5px] border border-[#C9A52A]/20">
                    {priority} PRIORITY
                  </span>
                </div>
                {objective && (
                  <p className="text-[12.5px] text-[#667085] dark:text-[#8B95A5] leading-relaxed">
                    Objective: {objective}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2 text-[12px] pt-2 border-t border-[#E4E7EC] dark:border-[#272D36]">
                  <div>
                    <span className="text-[#667085]">Topics:</span>{" "}
                    <strong className="text-[#17202A] dark:text-[#F2F4F7]">{topics.length} topics</strong>
                  </div>
                  <div>
                    <span className="text-[#667085]">Target Date:</span>{" "}
                    <strong className="text-[#17202A] dark:text-[#F2F4F7]">{targetDate || "Flexible"}</strong>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[12px]">
                Upon confirmation, this learning plan will be created in PostgreSQL and accessible across your organization workspace.
              </div>
            </div>
          )}

        </div>

        {/* Footer Navigation */}
        <div className="px-6 py-4 border-t border-[#E4E7EC] dark:border-[#272D36] flex items-center justify-between bg-[#F8F9FB] dark:bg-[#111419]">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as any)}
              className="h-[38px] px-4 rounded-[10px] border border-[#E4E7EC] dark:border-[#272D36] text-[#667085] dark:text-[#8B95A5] text-[12.5px] font-semibold hover:text-[#17202A] flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              disabled={step === 1 && !name.trim()}
              onClick={() => setStep((s) => (s + 1) as any)}
              className="h-[38px] px-5 rounded-[10px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[12.5px] font-bold hover:opacity-90 disabled:opacity-50 flex items-center gap-1 cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="h-[38px] px-6 rounded-[10px] bg-[#C9A52A] dark:bg-[#D4B12F] text-[#0B0D10] text-[12.5px] font-bold hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#0B0D10]" />
              ) : (
                <Check className="w-4 h-4 stroke-[2.5]" />
              )}
              <span>Create Learning Plan</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
