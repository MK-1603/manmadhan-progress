"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { X, Loader2, Sparkles, ChevronRight, UserCheck, Bot, Calendar, Layers, AlertCircle, ArrowLeft, Plus, Check } from "lucide-react";
import apiClient from "@/lib/api-client";
import { useRouter } from "next/navigation";

function generateUUID() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

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
  onSuccess: (project?: any) => void;
}

export function CreateProjectModal({ isOpen, onClose, onSuccess }: CreateProjectModalProps) {
  const router = useRouter();

  // ── Stage Control (COMPOSE vs REVIEW) ───────────────────────────────────────
  const [stage, setStage] = useState<"COMPOSE" | "REVIEW">("COMPOSE");

  // ── Prompt & AI Extraction State ───────────────────────────────────────────
  const [promptText, setPromptText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Directory & Context ─────────────────────────────────────────────────────
  const [allUsers, setAllUsers] = useState<AssigneeUser[]>([]);
  const [currentUser, setCurrentUser] = useState<{ id?: string; name?: string; role?: string }>({
    name: "Authorized CEO",
    role: "CEO",
  });

  // ── Mention Autocomplete State ──────────────────────────────────────────────
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionPosition, setMentionPosition] = useState<number>(0);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState<number>(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Structured Intent (Extracted by AI for Review Stage) ────────────────────
  const [extractedIntent, setExtractedIntent] = useState<{
    title: string;
    description: string;
    objective: string;
    priority: "Low" | "Medium" | "High" | "Critical";
    deadline: string | null;
    executionLead: AssigneeUser | null;
    members: Array<{ user: AssigneeUser; responsibility?: string }>;
    milestones: Array<{ name: string; description?: string }>;
    hubTools: Array<{ name: string; purpose: string }>;
    risks: string[];
  } | null>(null);

  // ── Load Directory Users on Open ────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    setStage("COMPOSE");
    setError(null);
    setIsParsing(false);
    setIsSubmitting(false);

    async function loadDirectory() {
      try {
        const workspaceId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : undefined;
        const wsParam = workspaceId && workspaceId !== "undefined" ? `?workspaceId=${workspaceId}` : "";

        const [dirRes, userRes] = await Promise.all([
          apiClient.get(`/org/directory${wsParam}`).catch(() => null),
          apiClient.get(`/auth/me`).catch(() => null),
        ]);

        if (dirRes?.data?.success && Array.isArray(dirRes.data.data)) {
          setAllUsers(dirRes.data.data);
        }

        if (userRes?.data?.user) {
          setCurrentUser(userRes.data.user);
        }
      } catch (e) {
        console.error("Failed to load directory data for project modal:", e);
      }
    }

    loadDirectory();
  }, [isOpen]);

  // ── Autocomplete Mention Filter Options ─────────────────────────────────────
  const mentionOptions = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();

    const options: Array<{ id: string; label: string; subLabel: string; isMe?: boolean; userObj?: AssigneeUser }> = [
      {
        id: "me",
        label: "@me",
        subLabel: `${currentUser.name || "CEO"} (You · Owner)`,
        isMe: true,
      },
    ];

    allUsers.forEach((u) => {
      if (u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.role?.toLowerCase().includes(q)) {
        options.push({
          id: u.id,
          label: `@${u.name || u.email.split("@")[0]}`,
          subLabel: `${u.role || "Member"} · ${u.email}`,
          userObj: u,
        });
      }
    });

    return options;
  }, [mentionQuery, allUsers, currentUser]);

  // ── Textarea @Mention Detector ──────────────────────────────────────────────
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setPromptText(val);
    setError(null);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      const query = textBeforeCursor.slice(lastAtIndex + 1);
      if (!/\s/.test(query)) {
        setMentionQuery(query);
        setMentionPosition(lastAtIndex);
        setSelectedMentionIndex(0);
        return;
      }
    }

    setMentionQuery(null);
  };

  const handleSelectMention = (option: typeof mentionOptions[0]) => {
    if (mentionPosition === null || !textareaRef.current) return;

    const beforeMention = promptText.slice(0, mentionPosition);
    const afterMention = promptText.slice(textareaRef.current.selectionStart);
    const inserted = `${option.label} `;

    const newText = beforeMention + inserted + afterMention;
    setPromptText(newText);
    setMentionQuery(null);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newCursorPos = mentionPosition + inserted.length;
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && mentionOptions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedMentionIndex((prev) => (prev + 1) % mentionOptions.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedMentionIndex((prev) => (prev - 1 + mentionOptions.length) % mentionOptions.length);
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        handleSelectMention(mentionOptions[selectedMentionIndex]);
      } else if (e.key === "Escape") {
        setMentionQuery(null);
      }
    }
  };

  // ── Stage 1: AI Prompt Extraction & Transition to Review ───────────────────
  const handleParsePrompt = async () => {
    if (!promptText.trim()) {
      setError("Please describe the project you want to execute.");
      return;
    }

    setError(null);
    setIsParsing(true);

    try {
      const workspaceId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : undefined;
      const res = await apiClient.post(`/org/projects/plan-from-prompt`, {
        prompt: promptText.trim(),
        workspaceId,
      });

      if (res.data?.success && res.data?.data) {
        const plan = res.data.data;
        const proj = plan.project || {};

        // Resolve Execution Lead mention against directory
        let leadUser: AssigneeUser | null = null;
        if (proj.executionLeadMention) {
          const cleanLead = proj.executionLeadMention.replace(/^@/, "").toLowerCase();
          leadUser = allUsers.find((u) => u.name?.toLowerCase().includes(cleanLead) || u.email?.toLowerCase().includes(cleanLead)) || null;
        }

        // Resolve Members mentions against directory
        const memberList: Array<{ user: AssigneeUser; responsibility?: string }> = [];
        if (Array.isArray(proj.memberMentions)) {
          proj.memberMentions.forEach((m: any) => {
            const cleanName = (m.name || "").replace(/^@/, "").toLowerCase();
            const matchedUser = allUsers.find((u) => u.name?.toLowerCase().includes(cleanName) || u.email?.toLowerCase().includes(cleanName));
            if (matchedUser && matchedUser.id !== currentUser.id && matchedUser.id !== leadUser?.id) {
              memberList.push({ user: matchedUser, responsibility: m.responsibility });
            }
          });
        }

        // Check Owner vs Assignee Business Rule: Owner cannot be assigned as executor
        if (leadUser && leadUser.id === currentUser.id) {
          setError("Project owner cannot be assigned as project executor.");
          setIsParsing(false);
          return;
        }

        // Build Intent Model
        setExtractedIntent({
          title: proj.name || "Untitled Project",
          description: proj.description || proj.objective || promptText.trim(),
          objective: proj.objective || proj.description || promptText.trim(),
          priority: proj.priority === "HIGH" || proj.priority === "CRITICAL" ? "High" : proj.priority === "LOW" ? "Low" : "Medium",
          deadline: proj.deadline || null,
          executionLead: leadUser,
          members: memberList,
          milestones: plan.milestones || [
            { name: "M1 — Foundation & Setup", description: "Core project setup and initial alignment" },
            { name: "M2 — Requirements & Architecture", description: "System architecture and functional specs" },
            { name: "M3 — Execution & Development", description: "Primary implementation phase" },
            { name: "M4 — Testing & Launch", description: "QA testing, bug fixes, and deployment" },
          ],
          hubTools: proj.hubTools || [
            { name: "Claude", purpose: "Architecture & Documentation" },
          ],
          risks: plan.risks || [],
        });

        setStage("REVIEW");
      } else {
        setError(res.data?.error || "Couldn't extract project intent. Please refine your prompt.");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to analyze prompt. Please try again.");
    } finally {
      setIsParsing(false);
    }
  };

  // ── Stage 2: Confirmed Real Project Creation Transaction ───────────────────
  const handleConfirmCreateProject = async () => {
    if (!extractedIntent) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const workspaceId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : undefined;

      const payload = {
        workspaceId,
        title: extractedIntent.title,
        description: extractedIntent.description,
        prompt: promptText,
        priority: extractedIntent.priority,
        assignedToUserId: extractedIntent.executionLead?.id || undefined,
        responsibleCoCeoId: extractedIntent.executionLead?.id || undefined,
        memberUserIds: extractedIntent.members.map((m) => m.user.id),
        deadline: extractedIntent.deadline || undefined,
        goals: [extractedIntent.objective],
        deliverables: (extractedIntent.milestones || []).map((m) => m.name),
        idempotencyKey: generateUUID(),
      };

      const res = await apiClient.post(`/org/projects/create-v2`, payload);

      if (res.data?.success) {
        const createdProject = res.data.data?.project || res.data.data;
        onSuccess(createdProject);
        onClose();
        if (createdProject?.id) {
          router.push(`/ceo/projects/${createdProject.id}`);
        }
      } else {
        setError(res.data?.error || "Failed to create project record.");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Project creation failed. Please check validation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#0B0D10] border border-[#272D36] rounded-[20px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-white font-sans">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#1D222A] flex items-center justify-between bg-[#111419] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#C9A52A]/15 border border-[#C9A52A]/30 flex items-center justify-center text-[#C9A52A]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-[#F2F4F7]">Create Project with AI</h2>
              <p className="text-[11px] text-[#667085]">
                {stage === "COMPOSE" ? "Describe what you want the team to execute." : "Review AI-extracted execution plan."}
              </p>
            </div>
          </div>

          {/* Two-Stage Progress Indicator */}
          <div className="flex items-center gap-2 text-[11px] font-mono">
            <span className={`px-2 py-0.5 rounded font-bold ${stage === "COMPOSE" ? "bg-[#C9A52A] text-black" : "bg-[#1D222A] text-[#667085]"}`}>
              1. Compose
            </span>
            <span className="text-[#667085]">──</span>
            <span className={`px-2 py-0.5 rounded font-bold ${stage === "REVIEW" ? "bg-[#C9A52A] text-black" : "bg-[#1D222A] text-[#667085]"}`}>
              2. Review
            </span>
            <button onClick={onClose} className="ml-3 p-1.5 rounded-lg text-[#667085] hover:text-white hover:bg-[#1D222A] transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ── STAGE 1: SINGLE PROMPT COMPOSER ───────────────────────────────────── */}
          {stage === "COMPOSE" && (
            <div className="space-y-4">
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={promptText}
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe the project you want to execute... (Use @mention for team members)"
                  rows={6}
                  className="w-full p-4 bg-[#111419] border border-[#272D36] focus:border-[#C9A52A] rounded-2xl text-[13px] text-[#F2F4F7] placeholder-[#667085] outline-none transition-all resize-none leading-relaxed"
                />

                {/* Real-time @Mention Autocomplete Dropdown */}
                {mentionQuery !== null && mentionOptions.length > 0 && (
                  <div className="absolute left-4 bottom-4 z-50 w-64 bg-[#15191F] border border-[#272D36] rounded-xl shadow-2xl overflow-hidden py-1">
                    <p className="px-3 py-1 text-[10px] font-bold text-[#667085] uppercase tracking-wider border-b border-[#1D222A]">
                      Assign Team Member
                    </p>
                    {mentionOptions.map((opt, idx) => (
                      <button
                        key={opt.id}
                        onClick={() => handleSelectMention(opt)}
                        className={`w-full px-3 py-2 text-left flex items-center justify-between text-xs cursor-pointer transition-colors ${
                          idx === selectedMentionIndex ? "bg-[#C9A52A]/20 text-[#C9A52A] font-bold" : "text-[#F2F4F7] hover:bg-[#1D222A]"
                        }`}
                      >
                        <span>{opt.label}</span>
                        <span className="text-[10px] text-[#667085]">{opt.subLabel}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Prompt Syntax Hints (Instructions, NOT Form Inputs) */}
              <div className="p-3.5 bg-[#111419]/60 rounded-xl border border-[#1D222A] space-y-1.5 text-[11px] text-[#667085]">
                <p className="font-bold text-[#8B95A5] uppercase tracking-wider text-[9.5px]">PROMPT HINT GUIDE (Natural or Structured Text Supported)</p>
                <p className="leading-relaxed">
                  <strong className="text-[#F2F4F7]">Example:</strong> &quot;Build Dental Patient Portal. Owner: @me. Execution Lead: @SHRIRAM. Members: @ARUN for frontend. Finish by 10 September. Use Claude and Figma from ManMadhan Hub.&quot;
                </p>
              </div>

              {/* Compose Stage CTA */}
              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleParsePrompt}
                  disabled={!promptText.trim() || isParsing}
                  className="inline-flex items-center gap-2 px-5 h-[42px] rounded-xl bg-[#C9A52A] text-black font-bold text-xs hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer shadow-lg"
                >
                  {isParsing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Extracting Project Intent...</span>
                    </>
                  ) : (
                    <>
                      <span>Review Project</span>
                      <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ── STAGE 2: SINGLE-VIEWPORT REVIEW SCREEN ──────────────────────────────── */}
          {stage === "REVIEW" && extractedIntent && (
            <div className="space-y-4 font-sans text-xs">
              {/* Project Card */}
              <div className="p-4 bg-[#111419] rounded-xl border border-[#272D36] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9.5px] font-bold text-[#C9A52A] bg-[#C9A52A]/10 px-2 py-0.5 rounded border border-[#C9A52A]/20 uppercase tracking-wider">
                    {extractedIntent.priority} Priority Project
                  </span>
                  {extractedIntent.deadline && (
                    <span className="text-[11px] font-mono text-[#8B95A5] flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#C9A52A]" /> Due: {extractedIntent.deadline}
                    </span>
                  )}
                </div>
                <h3 className="text-[16px] font-bold text-[#F2F4F7]">{extractedIntent.title}</h3>
                <p className="text-[#8B95A5] leading-relaxed line-clamp-2">{extractedIntent.description}</p>
              </div>

              {/* 2-Column Summary Matrix */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Ownership & Roles */}
                <div className="p-3.5 bg-[#111419] rounded-xl border border-[#272D36] space-y-2">
                  <p className="text-[10px] font-bold text-[#667085] uppercase tracking-wider flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-[#C9A52A]" /> Roles & Assignment
                  </p>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center bg-[#0B0D10] p-2 rounded-lg border border-[#1D222A]">
                      <span className="text-[#8B95A5]">Project Owner:</span>
                      <span className="font-bold text-[#F2F4F7]">You · CEO</span>
                    </div>
                    <div className="flex justify-between items-center bg-[#0B0D10] p-2 rounded-lg border border-[#1D222A]">
                      <span className="text-[#8B95A5]">Execution Lead:</span>
                      <span className="font-bold text-[#C9A52A]">
                        {extractedIntent.executionLead ? `@${extractedIntent.executionLead.name || extractedIntent.executionLead.email}` : "None"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Team Members & Responsibilities */}
                <div className="p-3.5 bg-[#111419] rounded-xl border border-[#272D36] space-y-2">
                  <p className="text-[10px] font-bold text-[#667085] uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-500" /> Team & Responsibilities
                  </p>
                  {extractedIntent.members.length > 0 ? (
                    <div className="space-y-1 max-h-24 overflow-y-auto">
                      {extractedIntent.members.map((m, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-[#0B0D10] p-1.5 rounded border border-[#1D222A] text-[11px]">
                          <span className="font-bold text-[#F2F4F7]">@{m.user.name || m.user.email}</span>
                          <span className="text-[#8B95A5]">{m.responsibility || "Execution Member"}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[#667085] italic py-1">No additional team members assigned.</p>
                  )}
                </div>
              </div>

              {/* Milestones & Hub Tools */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-[#111419] rounded-xl border border-[#272D36] space-y-2">
                  <p className="text-[10px] font-bold text-[#667085] uppercase tracking-wider flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-500" /> Milestones ({extractedIntent.milestones.length} Suggested)
                  </p>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {extractedIntent.milestones.map((m, idx) => (
                      <div key={idx} className="p-1.5 bg-[#0B0D10] rounded border border-[#1D222A] text-[11px] font-semibold text-[#F2F4F7]">
                        {m.name}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3.5 bg-[#111419] rounded-xl border border-[#272D36] space-y-2">
                  <p className="text-[10px] font-bold text-[#667085] uppercase tracking-wider flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5 text-purple-500" /> ManMadhan Hub Tools
                  </p>
                  {extractedIntent.hubTools.length > 0 ? (
                    <div className="space-y-1 max-h-24 overflow-y-auto">
                      {extractedIntent.hubTools.map((t, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-[#0B0D10] p-1.5 rounded border border-[#1D222A] text-[11px]">
                          <span className="font-bold text-[#F2F4F7]">{t.name}</span>
                          <span className="text-[#8B95A5]">{t.purpose}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[#667085] italic py-1">No Hub tools requested.</p>
                  )}
                </div>
              </div>

              {/* Review Stage Buttons */}
              <div className="pt-2 flex items-center justify-between">
                <button
                  onClick={() => setStage("COMPOSE")}
                  className="inline-flex items-center gap-1.5 px-4 h-[38px] rounded-xl border border-[#272D36] text-[#8B95A5] hover:text-white hover:bg-[#1D222A] transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Edit Prompt
                </button>

                <button
                  onClick={handleConfirmCreateProject}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-6 h-[40px] rounded-xl bg-[#C9A52A] text-black font-bold text-xs hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer shadow-lg"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating Project Workspace...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Project</span>
                      <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
