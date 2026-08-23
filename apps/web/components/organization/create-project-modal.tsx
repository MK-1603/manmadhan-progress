"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { X, Loader2, FolderPlus, ChevronRight, UserCheck, Bot, Calendar, Layers, AlertCircle, ArrowLeft, Check, Command, ChevronDown, ChevronUp, HelpCircle, Zap } from "lucide-react";
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

const QUICK_ADD_CHIPS = [
  { label: "Add All", key: "ADD_ALL", primary: true },
  { label: "Title", key: "Project Title: " },
  { label: "Description", key: "Project Description: " },
  { label: "Assignee", key: "Assignee: " },
  { label: "Members", key: "Members: " },
  { label: "Deadline", key: "Deadline: " },
  { label: "Requirements", key: "Requirements: " },
  { label: "Milestones", key: "Milestones: " },
  { label: "Tools", key: "Tools: " },
  { label: "GitHub", key: "GitHub: " },
];

const FULL_TEMPLATE_KEYS = [
  "Project Title: ",
  "Project Description: ",
  "Assignee: ",
  "Members: ",
  "Deadline: ",
  "Requirements: ",
  "Milestones: ",
  "Tools: ",
  "GitHub: ",
  "Notes: ",
];

const SLASH_COMMANDS = [
  { command: "/title", label: "/title", desc: "Insert Project Title field", key: "Project Title: " },
  { command: "/description", label: "/description", desc: "Insert Project Description field", key: "Project Description: " },
  { command: "/assignee", label: "/assignee", desc: "Insert Assignee field & trigger @people", key: "Assignee: @" },
  { command: "/members", label: "/members", desc: "Insert Members field", key: "Members: @" },
  { command: "/deadline", label: "/deadline", desc: "Insert Target Deadline field", key: "Deadline: " },
  { command: "/requirements", label: "/requirements", desc: "Insert Requirements field", key: "Requirements: " },
  { command: "/milestones", label: "/milestones", desc: "Insert Milestones field", key: "Milestones: " },
  { command: "/tools", label: "/tools", desc: "Insert Tools selector field", key: "Tools: " },
  { command: "/github", label: "/github", desc: "Insert GitHub connection field", key: "GitHub: " },
  { command: "/notes", label: "/notes", desc: "Insert Notes field", key: "Notes: " },
];

const PROMPT_EXAMPLES = [
  {
    title: "Simple",
    text: "Build a portfolio website and assign @ARUN.",
    desc: "Single natural sentence with member mention",
  },
  {
    title: "Team Project",
    text: "Build ManMadhan Progress. @SHRIRAM leads execution and @ARUN handles frontend.",
    desc: "Lead & team member responsibilities",
  },
  {
    title: "Detailed",
    text: "Build a SaaS task platform with @SHRIRAM leading execution, @ARUN handling frontend, and @KARTHIK handling backend. Finish by 30 August.",
    desc: "Complete roles with target deadline",
  },
  {
    title: "Tools",
    text: "Build an AI productivity platform using Claude and Figma. @SHRIRAM leads execution.",
    desc: "Integrate AI & design tools",
  },
];

export function CreateProjectModal({ isOpen, onClose, onSuccess }: CreateProjectModalProps) {
  const router = useRouter();

  // ── Stage Control (COMPOSE vs REVIEW) ───────────────────────────────────────
  const [stage, setStage] = useState<"COMPOSE" | "REVIEW">("COMPOSE");

  // ── Prompt & AI Extraction State ───────────────────────────────────────────
  const [promptText, setPromptText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Accordion States for Reference & Examples ─────────────────────────────
  const [showQuickRef, setShowQuickRef] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const [pendingExampleText, setPendingExampleText] = useState<string | null>(null);

  // ── Directory & Context ─────────────────────────────────────────────────────
  const [allUsers, setAllUsers] = useState<AssigneeUser[]>([]);
  const [currentUser, setCurrentUser] = useState<{ id?: string; name?: string; role?: string }>({
    name: "Authorized CEO",
    role: "CEO",
  });

  // ── Autocomplete Dropdown States ───────────────────────────────────────────
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionPosition, setMentionPosition] = useState<number>(0);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState<number>(0);

  const [slashQuery, setSlashQuery] = useState<string | null>(null);
  const [slashPosition, setSlashPosition] = useState<number>(0);
  const [selectedSlashIndex, setSelectedSlashIndex] = useState<number>(0);

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
    setShowQuickRef(false);
    setShowExamples(false);
    setPendingExampleText(null);

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

  // ── Smart Add All & Quick Add Handlers ──────────────────────────────────────
  const handleSmartAddAll = () => {
    if (!promptText.trim()) {
      setPromptText(FULL_TEMPLATE_KEYS.join("\n"));
      return;
    }

    const lowerPrompt = promptText.toLowerCase();
    const missingKeys: string[] = [];

    FULL_TEMPLATE_KEYS.forEach((k) => {
      const keyClean = k.replace(":", "").trim().toLowerCase();
      if (!lowerPrompt.includes(keyClean)) {
        missingKeys.push(k);
      }
    });

    if (missingKeys.length > 0) {
      const prefix = promptText.endsWith("\n") ? "" : "\n\n";
      setPromptText((prev) => prev + prefix + missingKeys.join("\n"));
    }
  };

  const handleQuickAddClick = (chipKey: string) => {
    if (chipKey === "ADD_ALL") {
      handleSmartAddAll();
      return;
    }

    const keyClean = chipKey.replace(":", "").trim().toLowerCase();
    if (promptText.toLowerCase().includes(keyClean) && textareaRef.current) {
      textareaRef.current.focus();
      const pos = promptText.toLowerCase().indexOf(keyClean);
      textareaRef.current.setSelectionRange(pos, pos + chipKey.length);
      return;
    }

    if (!textareaRef.current) {
      setPromptText((prev) => prev + (prev.endsWith("\n") || prev === "" ? "" : "\n") + chipKey);
      return;
    }

    const cursorPos = textareaRef.current.selectionStart || promptText.length;
    const textBefore = promptText.slice(0, cursorPos);
    const textAfter = promptText.slice(cursorPos);
    const prefix = textBefore.length > 0 && !textBefore.endsWith("\n") ? "\n" : "";

    const insertedText = prefix + chipKey;
    const newText = textBefore + insertedText + textAfter;
    setPromptText(newText);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newPos = cursorPos + insertedText.length;
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  };

  // ── "Use Example" Handlers with Overwrite Protection ────────────────────────
  const handleApplyExample = (exampleText: string) => {
    if (!promptText.trim()) {
      setPromptText(exampleText);
    } else {
      setPendingExampleText(exampleText);
    }
  };

  const confirmOverwriteExample = () => {
    if (pendingExampleText) {
      setPromptText(pendingExampleText);
      setPendingExampleText(null);
    }
  };

  // ── Mention Autocomplete Filter Options (@ = PEOPLE ONLY) ───────────────────
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

    // Filter ONLY organization people
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

  // ── Slash Command Filter Options (/ = COMMANDS ONLY) ────────────────────────
  const filteredSlashCommands = useMemo(() => {
    if (slashQuery === null) return [];
    const q = slashQuery.toLowerCase();
    return SLASH_COMMANDS.filter((cmd) => cmd.command.toLowerCase().includes(q) || cmd.desc.toLowerCase().includes(q));
  }, [slashQuery]);

  // ── Textarea Change & Keyboard Handlers ─────────────────────────────────────
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
        setSlashQuery(null);
        return;
      }
    }

    const lastSlashIndex = textBeforeCursor.lastIndexOf("/");
    if (lastSlashIndex !== -1 && (lastSlashIndex === 0 || /\s/.test(textBeforeCursor[lastSlashIndex - 1]))) {
      const query = textBeforeCursor.slice(lastSlashIndex + 1);
      if (!/\s/.test(query)) {
        setSlashQuery(query);
        setSlashPosition(lastSlashIndex);
        setSelectedSlashIndex(0);
        setMentionQuery(null);
        return;
      }
    }

    setMentionQuery(null);
    setSlashQuery(null);
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

  const handleSelectSlashChip = (chipKey: string) => {
    if (slashPosition === null || !textareaRef.current) return;

    const beforeSlash = promptText.slice(0, slashPosition);
    const afterSlash = promptText.slice(textareaRef.current.selectionStart);
    const newText = beforeSlash + chipKey + afterSlash;
    setPromptText(newText);
    setSlashQuery(null);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newCursorPos = slashPosition + chipKey.length;
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle @ Mention navigation
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
      return;
    }

    // Handle / Slash Command navigation
    if (slashQuery !== null && filteredSlashCommands.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedSlashIndex((prev) => (prev + 1) % filteredSlashCommands.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedSlashIndex((prev) => (prev - 1 + filteredSlashCommands.length) % filteredSlashCommands.length);
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        handleSelectSlashChip(filteredSlashCommands[selectedSlashIndex].key);
      } else if (e.key === "Escape") {
        setSlashQuery(null);
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

        let leadUser: AssigneeUser | null = null;
        if (proj.executionLeadMention) {
          const cleanLead = proj.executionLeadMention.replace(/^@/, "").toLowerCase();
          leadUser = allUsers.find((u) => u.name?.toLowerCase().includes(cleanLead) || u.email?.toLowerCase().includes(cleanLead)) || null;
        }

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

        if (leadUser && leadUser.id === currentUser.id) {
          setError("Project owner cannot be assigned as project executor.");
          setIsParsing(false);
          return;
        }

        setExtractedIntent({
          title: proj.name || "Untitled Project",
          description: proj.description || proj.objective || promptText.trim(),
          objective: proj.objective || proj.description || promptText.trim(),
          priority: proj.priority === "HIGH" || proj.priority === "CRITICAL" ? "High" : proj.priority === "LOW" ? "Low" : "Medium",
          deadline: proj.deadline || null,
          executionLead: leadUser,
          members: memberList,
          milestones: plan.milestones || [
            { name: "M1 Foundation & Setup", description: "Core project setup and initial alignment" },
            { name: "M2 Requirements & Architecture", description: "System architecture and functional specs" },
            { name: "M3 Execution & Implementation", description: "Primary implementation phase" },
            { name: "M4 Testing & Deployment", description: "QA testing, bug fixes, and deployment" },
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

  // ── Stage 2: Real Project Creation Transaction ──────────────────────────────
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
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-[#0B0D10] border border-[#272D36] rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-white font-sans">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#1D222A] flex items-center justify-between bg-[#111419] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#C9A52A]/15 border border-[#C9A52A]/30 flex items-center justify-center text-[#C9A52A]">
              <FolderPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#F2F4F7]">Create Project</h2>
              <p className="text-[11px] text-[#667085]">Describe what you want to execute.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-[#667085] hover:text-white hover:bg-[#1D222A] transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Modal Content Body */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {error && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Overwrite Example Protection Confirmation */}
          {pendingExampleText && (
            <div className="p-3 bg-amber-500/15 border border-amber-500/30 rounded-xl text-xs space-y-2">
              <p className="font-semibold text-amber-200">Replace current prompt content with selected example?</p>
              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={() => setPendingExampleText(null)}
                  className="px-2.5 py-1 rounded border border-amber-500/40 text-amber-200 hover:bg-amber-500/20 text-[11px] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmOverwriteExample}
                  className="px-2.5 py-1 rounded bg-[#C9A52A] text-black font-bold text-[11px] cursor-pointer"
                >
                  Use Example
                </button>
              </div>
            </div>
          )}

          {/* ── STAGE 1: SINGLE PROMPT COMPOSER ───────────────────────────────────── */}
          {stage === "COMPOSE" && (
            <div className="space-y-3">
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={promptText}
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe what you want to execute... (Use @ for people, / for commands)"
                  rows={5}
                  className="w-full p-3 bg-[#111419] border border-[#272D36] focus:border-[#C9A52A] rounded-xl text-xs text-[#F2F4F7] placeholder-[#667085] outline-none transition-all resize-none leading-relaxed"
                />

                {/* Real-time @ Mention Dropdown (@ = PEOPLE ONLY) */}
                {mentionQuery !== null && mentionOptions.length > 0 && (
                  <div className="absolute left-3 bottom-3 z-50 w-64 bg-[#15191F] border border-[#272D36] rounded-xl shadow-2xl overflow-hidden py-1 max-h-48 overflow-y-auto">
                    <p className="px-3 py-1 text-[9.5px] font-bold text-[#C9A52A] uppercase tracking-wider border-b border-[#1D222A]">
                      Assign Organization Member
                    </p>
                    {mentionOptions.map((opt, idx) => (
                      <button
                        key={opt.id}
                        onClick={() => handleSelectMention(opt)}
                        className={`w-full px-3 py-1.5 text-left flex items-center justify-between text-xs cursor-pointer transition-colors ${
                          idx === selectedMentionIndex ? "bg-[#C9A52A]/20 text-[#C9A52A] font-bold" : "text-[#F2F4F7] hover:bg-[#1D222A]"
                        }`}
                      >
                        <span>{opt.label}</span>
                        <span className="text-[10px] text-[#667085]">{opt.subLabel}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Real-time / Slash Commands Dropdown (/ = COMMANDS ONLY) */}
                {slashQuery !== null && filteredSlashCommands.length > 0 && (
                  <div className="absolute left-3 bottom-3 z-50 w-64 bg-[#15191F] border border-[#272D36] rounded-xl shadow-2xl overflow-hidden py-1 max-h-48 overflow-y-auto">
                    <p className="px-3 py-1 text-[9.5px] font-bold text-blue-400 uppercase tracking-wider border-b border-[#1D222A]">
                      Quick Commands
                    </p>
                    {filteredSlashCommands.map((cmd, idx) => (
                      <button
                        key={cmd.command}
                        onClick={() => handleSelectSlashChip(cmd.key)}
                        className={`w-full px-3 py-1.5 text-left flex items-center justify-between text-xs cursor-pointer transition-colors ${
                          idx === selectedSlashIndex ? "bg-blue-500/20 text-blue-400 font-bold" : "text-[#F2F4F7] hover:bg-[#1D222A]"
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <Command className="w-3 h-3 text-blue-400" />
                          <span>{cmd.command}</span>
                        </div>
                        <span className="text-[9.5px] text-[#667085]">{cmd.desc}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Add Chips Section */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-[#667085] uppercase tracking-wider">Quick Add</p>
                  <span className="text-[9.5px] text-[#667085]">Click chip to insert key</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_ADD_CHIPS.map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => handleQuickAddClick(chip.key)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
                        chip.primary
                          ? "bg-[#C9A52A]/20 border-[#C9A52A] text-[#C9A52A] hover:bg-[#C9A52A] hover:text-black"
                          : "bg-[#111419] border-[#272D36] text-[#8B95A5] hover:text-[#F2F4F7] hover:border-[#C9A52A]/40"
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Collapsible Quick Reference Section */}
              <div className="border border-[#1D222A] rounded-xl bg-[#111419]/50 overflow-hidden text-xs">
                <button
                  type="button"
                  onClick={() => setShowQuickRef(!showQuickRef)}
                  className="w-full px-3 py-2 flex items-center justify-between text-[#8B95A5] hover:text-white transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5 text-[11px] font-bold">
                    <HelpCircle className="w-3.5 h-3.5 text-[#C9A52A]" /> Quick Reference
                  </span>
                  {showQuickRef ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {showQuickRef && (
                  <div className="p-3 border-t border-[#1D222A] space-y-2 text-[11px] text-[#667085]">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 bg-[#0B0D10] rounded border border-[#1D222A]">
                        <span className="font-bold text-[#C9A52A]">@ People</span>
                        <p className="text-[10px]">Type @ to assign organization members or @me for yourself.</p>
                      </div>
                      <div className="p-2 bg-[#0B0D10] rounded border border-[#1D222A]">
                        <span className="font-bold text-blue-400">/ Commands</span>
                        <p className="text-[10px]">Type / to insert quick command fields into prompt.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Collapsible Examples Accordion */}
              <div className="border border-[#1D222A] rounded-xl bg-[#111419]/50 overflow-hidden text-xs">
                <button
                  type="button"
                  onClick={() => setShowExamples(!showExamples)}
                  className="w-full px-3 py-2 flex items-center justify-between text-[#8B95A5] hover:text-white transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5 text-[11px] font-bold">
                    <Zap className="w-3.5 h-3.5 text-purple-400" /> Examples
                  </span>
                  {showExamples ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {showExamples && (
                  <div className="p-2 border-t border-[#1D222A] bg-[#0E1116] max-h-44 overflow-y-auto space-y-2 text-[11px]">
                    {PROMPT_EXAMPLES.map((ex, idx) => (
                      <div key={idx} className="p-2 bg-[#15191F] rounded-lg border border-[#272D36] flex items-center justify-between gap-2">
                        <div>
                          <p className="font-bold text-[#F2F4F7]">{ex.title}</p>
                          <p className="text-[10.5px] text-[#667085] line-clamp-1">{ex.text}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleApplyExample(ex.text)}
                          className="px-2.5 py-1 rounded bg-[#1D222A] hover:bg-[#C9A52A] hover:text-black font-bold text-[10px] text-[#C9A52A] transition-colors cursor-pointer shrink-0"
                        >
                          Use Example
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── STAGE 2: SINGLE-VIEWPORT REVIEW SCREEN ──────────────────────────────── */}
          {stage === "REVIEW" && extractedIntent && (
            <div className="space-y-3 font-sans text-xs">
              <div className="p-3 bg-[#111419] rounded-xl border border-[#272D36] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-[#C9A52A] bg-[#C9A52A]/10 px-2 py-0.5 rounded uppercase">
                    {extractedIntent.priority} Priority
                  </span>
                  {extractedIntent.deadline && (
                    <span className="text-[11px] font-mono text-[#8B95A5] flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-[#C9A52A]" /> {extractedIntent.deadline}
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-bold text-[#F2F4F7]">{extractedIntent.title}</h3>
                <p className="text-[#8B95A5] line-clamp-2">{extractedIntent.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-[11px]">
                <div className="p-2.5 bg-[#111419] rounded-xl border border-[#272D36] space-y-1">
                  <span className="text-[9.5px] font-bold text-[#667085] uppercase">Owner</span>
                  <p className="font-bold text-[#F2F4F7]">You · CEO</p>
                </div>

                <div className="p-2.5 bg-[#111419] rounded-xl border border-[#272D36] space-y-1">
                  <span className="text-[9.5px] font-bold text-[#C9A52A] uppercase">Execution Lead</span>
                  <p className="font-bold text-[#C9A52A]">
                    {extractedIntent.executionLead ? `@${extractedIntent.executionLead.name || extractedIntent.executionLead.email}` : "None"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-[11px]">
                <div className="p-2.5 bg-[#111419] rounded-xl border border-[#272D36] space-y-1">
                  <span className="text-[9.5px] font-bold text-[#667085] uppercase">Members</span>
                  <p className="font-semibold text-[#F2F4F7]">
                    {extractedIntent.members.length > 0
                      ? extractedIntent.members.map((m) => `@${m.user.name || m.user.email}`).join(", ")
                      : "None"}
                  </p>
                </div>

                <div className="p-2.5 bg-[#111419] rounded-xl border border-[#272D36] space-y-1">
                  <span className="text-[9.5px] font-bold text-[#667085] uppercase">Tools</span>
                  <p className="font-semibold text-purple-400">
                    {extractedIntent.hubTools.length > 0 ? extractedIntent.hubTools.map((t) => t.name).join(" · ") : "None"}
                  </p>
                </div>
              </div>

              <div className="p-2.5 bg-[#111419] rounded-xl border border-[#272D36] space-y-1">
                <span className="text-[9.5px] font-bold text-[#667085] uppercase">
                  Milestones ({extractedIntent.milestones.length} suggested)
                </span>
                <p className="text-[#8B95A5] line-clamp-1">
                  {extractedIntent.milestones.map((m) => m.name).join(" → ")}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Fixed Bottom Action Footer */}
        <div className="px-5 py-3 border-t border-[#1D222A] bg-[#111419] flex items-center justify-between shrink-0">
          {stage === "COMPOSE" ? (
            <div className="flex items-center justify-end w-full">
              <button
                onClick={handleParsePrompt}
                disabled={!promptText.trim() || isParsing}
                className="inline-flex items-center gap-1.5 px-5 h-[38px] rounded-xl bg-[#C9A52A] text-black font-bold text-xs hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer shadow-lg"
              >
                {isParsing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <span>Review Project</span>
                    <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full">
              <button
                onClick={() => setStage("COMPOSE")}
                className="inline-flex items-center gap-1 px-3.5 h-[36px] rounded-lg border border-[#272D36] text-[#8B95A5] hover:text-white hover:bg-[#1D222A] transition-colors cursor-pointer text-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Edit Prompt
              </button>

              <button
                onClick={handleConfirmCreateProject}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-5 h-[38px] rounded-xl bg-[#C9A52A] text-black font-bold text-xs hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer shadow-lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <span>Create Project</span>
                    <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
