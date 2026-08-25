"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { CheckSquare, X, Loader2, AlertCircle, ArrowLeft, ChevronRight, Command, ChevronDown, ChevronUp, HelpCircle, Zap, Calendar, User, Layers, Sparkles, Check } from "lucide-react";
import apiClient from "@/lib/api-client";
import { useAuth } from "@/components/auth/auth-context";
import { useRouter } from "next/navigation";

interface AssigneeUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (task: any) => void;
  defaultProjectId?: string | null;
  defaultMilestoneId?: string | null;
  defaultAssigneeId?: string | null;
  defaultAssigneeName?: string | null;
  defaultAssigneeRole?: string | null;
}

const QUICK_ADD_CHIPS = [
  { label: "Add All", key: "ADD_ALL", primary: true },
  { label: "Title", key: "Task Title: " },
  { label: "Type", key: "Task Type: " },
  { label: "Priority", key: "Priority: " },
  { label: "Energy", key: "Energy: " },
  { label: "Assignee", key: "Assignee: " },
  { label: "Project", key: "Project: " },
  { label: "Deadline", key: "Deadline: " },
  { label: "Deliverable", key: "Deliverable: " },
  { label: "Description", key: "Description: " },
];

const FULL_TEMPLATE_KEYS = [
  "Task Title: ",
  "Task Type: PROJECT WORK",
  "Priority: Medium",
  "Energy: Normal",
  "Assignee: @me",
  "Project: ",
  "Deadline: ",
  "Deliverable: ",
  "Description: ",
];

const SLASH_COMMANDS = [
  { command: "/title", label: "/title", desc: "Insert Task Title field", key: "Task Title: " },
  { command: "/type", label: "/type", desc: "Insert Task Type field", key: "Task Type: " },
  { command: "/priority", label: "/priority", desc: "Insert Priority field", key: "Priority: " },
  { command: "/energy", label: "/energy", desc: "Insert Energy Fit field", key: "Energy: " },
  { command: "/assignee", label: "/assignee", desc: "Insert Assignee field & trigger @people", key: "Assignee: @" },
  { command: "/project", label: "/project", desc: "Insert Associated Project field", key: "Project: " },
  { command: "/deadline", label: "/deadline", desc: "Insert Target Deadline field", key: "Deadline: " },
  { command: "/deliverable", label: "/deliverable", desc: "Insert Deliverable field", key: "Deliverable: " },
  { command: "/description", label: "/description", desc: "Insert Description field", key: "Description: " },
  { command: "/notes", label: "/notes", desc: "Insert Notes field", key: "Notes: " },
];

const PROMPT_EXAMPLES = [
  {
    title: "Simple Task",
    text: "Task Title: Write Auth Integration Tests and assign to @me",
    desc: "Single sentence task assignment",
  },
  {
    title: "Project Work Task",
    text: "Task Title: Build OAuth 2.0 Session Engine\nTask Type: PROJECT WORK\nPriority: High\nEnergy: Deep Focus\nAssignee: @me\nDeliverable: Working Auth APIs & Integration Tests\nDescription: Build JWT authentication service with RBAC enforcement.",
    desc: "Detailed project engineering work item",
  },
  {
    title: "Team Assignment",
    text: "Task Title: Responsive Navigation & Glassmorphism Header\nTask Type: PROJECT WORK\nPriority: Medium\nEnergy: High Energy\nAssignee: @ARUN\nDeliverable: Next.js Header Component\nDescription: Upgrade layout header with dark mode theme support.",
    desc: "Assigning task to organization team member",
  },
  {
    title: "Learning & Research",
    text: "Task Title: Study Model Context Protocol Specifications\nTask Type: LEARNING\nPriority: Low\nEnergy: Low Energy\nAssignee: @me\nDeliverable: Architecture Summary Notes\nDescription: Research MCP tool invocation guidelines and write notes.",
    desc: "Learning and specification research task",
  },
];

export function renderNeatTextWithMentions(text: string | null | undefined) {
  if (!text) return null;
  const parts = text.split(/(@[a-zA-Z0-9._-]+)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("@")) {
          const isMe = part.toLowerCase() === "@me";
          return (
            <span
              key={i}
              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 mx-0.5 rounded text-[11px] font-bold ${
                isMe
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  : "bg-[#C9A52A]/20 text-[#C9A52A] border border-[#C9A52A]/30"
              }`}
            >
              {part}
            </span>
          );
        }
        return part;
      })}
    </>
  );
}

export function CreateTaskModal({
  isOpen,
  onClose,
  onSuccess,
  defaultProjectId = null,
  defaultAssigneeId = null,
  defaultAssigneeName = null,
}: CreateTaskModalProps) {
  const router = useRouter();
  const { user } = useAuth();

  // ── Stage Control (COMPOSE vs REVIEW) ───────────────────────────────────────
  const [stage, setStage] = useState<"COMPOSE" | "REVIEW">("COMPOSE");

  // ── Prompt & Extraction State ──────────────────────────────────────────────
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
  const [projects, setProjects] = useState<any[]>([]);

  // ── Autocomplete Dropdown States ───────────────────────────────────────────
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionPosition, setMentionPosition] = useState<number>(0);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState<number>(0);

  const [slashQuery, setSlashQuery] = useState<string | null>(null);
  const [slashPosition, setSlashPosition] = useState<number>(0);
  const [selectedSlashIndex, setSelectedSlashIndex] = useState<number>(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Structured Extracted Intent for Review Stage ───────────────────────────
  const [extractedIntent, setExtractedIntent] = useState<{
    title: string;
    description: string;
    type: string;
    priority: "Low" | "Medium" | "High" | "Critical";
    energyLevel: string;
    assignee: AssigneeUser | null;
    assigneeText: string;
    projectId: string | null;
    projectTitle: string | null;
    deadline: string | null;
    deliverable: string | null;
  } | null>(null);

  // ── Load Directory Users & Projects on Open ─────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    setStage("COMPOSE");
    setError(null);
    setIsParsing(false);
    setIsSubmitting(false);
    setShowQuickRef(false);
    setShowExamples(false);
    setPendingExampleText(null);

    async function loadData() {
      try {
        const workspaceId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : undefined;
        const wsParam = workspaceId && workspaceId !== "undefined" ? `?workspaceId=${workspaceId}` : "";

        const [dirRes, projRes] = await Promise.all([
          apiClient.get(`/org/directory${wsParam}`).catch(() => null),
          apiClient.get(`/org/projects${wsParam}`).catch(() => null),
        ]);

        if (dirRes?.data?.success && Array.isArray(dirRes.data.data)) {
          setAllUsers(dirRes.data.data);
        }
        if (projRes?.data?.data && Array.isArray(projRes.data.data)) {
          setProjects(projRes.data.data);
        }
      } catch (e) {
        console.error("Failed to load directory/projects for task modal:", e);
      }
    }

    loadData();
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
      const keyClean = k.split(":")[0].toLowerCase();
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

    const keyClean = chipKey.split(":")[0].trim().toLowerCase();
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
        subLabel: `${user?.name || "Self"} (You · Assignee)`,
        isMe: true,
      },
    ];

    allUsers.forEach((u) => {
      if (u.id !== user?.id && (u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.role?.toLowerCase().includes(q))) {
        options.push({
          id: u.id,
          label: `@${u.name || u.email.split("@")[0]}`,
          subLabel: `${u.role || "Member"} · ${u.email}`,
          userObj: u,
        });
      }
    });

    return options;
  }, [mentionQuery, allUsers, user]);

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

  // ── Parse Prompt & Stage Transition ───────────────────────────────────────
  const handleParsePrompt = async () => {
    if (!promptText.trim()) {
      setError("Please describe the task you want to execute.");
      return;
    }

    setError(null);
    setIsParsing(true);

    try {
      const text = promptText.trim();
      const lower = text.toLowerCase();

      // Extract title
      let titleVal = "";
      const titleMatch = text.match(/Task Title:\s*([^\n]+)/i);
      if (titleMatch && titleMatch[1]) {
        titleVal = titleMatch[1].trim();
      } else {
        const lines = text.split("\n").filter((l) => l.trim().length > 0);
        titleVal = lines[0] ? lines[0].replace(/^(Task Title:|Title:|\/title)\s*/i, "").trim() : "Untitled Task";
      }

      // Extract task type
      let typeVal = "PROJECT WORK";
      if (lower.includes("learning") || lower.includes("study")) typeVal = "LEARNING";
      else if (lower.includes("documentation") || lower.includes("doc")) typeVal = "DOCUMENTATION";
      else if (lower.includes("research")) typeVal = "RESEARCH";
      else if (lower.includes("submission") || lower.includes("deliverable")) typeVal = "SUBMISSION";
      else if (lower.includes("review")) typeVal = "REVIEW";
      else if (lower.includes("personal") || lower.includes("standalone")) typeVal = "PERSONAL WORK";

      const typeMatch = text.match(/Task Type:\s*([^\n]+)/i);
      if (typeMatch && typeMatch[1]) {
        const matchedT = typeMatch[1].trim().toUpperCase();
        if (matchedT.includes("PERSONAL")) typeVal = "PERSONAL WORK";
        else if (matchedT.includes("LEARNING")) typeVal = "LEARNING";
        else if (matchedT.includes("DOC")) typeVal = "DOCUMENTATION";
        else if (matchedT.includes("RESEARCH")) typeVal = "RESEARCH";
        else if (matchedT.includes("SUBMISSION")) typeVal = "SUBMISSION";
        else if (matchedT.includes("REVIEW")) typeVal = "REVIEW";
        else if (matchedT.includes("PROJECT")) typeVal = "PROJECT WORK";
      }

      // Extract priority
      let prioVal: "Low" | "Medium" | "High" | "Critical" = "Medium";
      if (lower.includes("critical") || lower.includes("urgent")) prioVal = "Critical";
      else if (lower.includes("high")) prioVal = "High";
      else if (lower.includes("low")) prioVal = "Low";

      const prioMatch = text.match(/Priority:\s*([^\n]+)/i);
      if (prioMatch && prioMatch[1]) {
        const pStr = prioMatch[1].trim().toLowerCase();
        if (pStr.includes("critical")) prioVal = "Critical";
        else if (pStr.includes("high")) prioVal = "High";
        else if (pStr.includes("low")) prioVal = "Low";
        else if (pStr.includes("medium")) prioVal = "Medium";
      }

      // Extract energy level
      let energyVal = "Normal";
      if (lower.includes("deep focus") || lower.includes("architecture")) energyVal = "Deep Focus";
      else if (lower.includes("high energy")) energyVal = "High Energy";
      else if (lower.includes("low energy")) energyVal = "Low Energy";
      else if (lower.includes("quick task")) energyVal = "Quick Task";

      const energyMatch = text.match(/Energy:\s*([^\n]+)/i);
      if (energyMatch && energyMatch[1]) {
        energyVal = energyMatch[1].trim();
      }

      // Extract assignee
      let matchedAssignee: AssigneeUser | null = null;
      let assigneeText = "@me (Self)";

      if (lower.includes("@me") || lower.includes("assignee: @me")) {
        assigneeText = "@me (Self)";
        if (user?.id) {
          matchedAssignee = {
            id: user.id,
            name: user.name || "Self",
            email: user.email || "",
            role: user.role || "CEO",
          };
        }
      } else {
        const mentionMatches = text.match(/@([a-zA-Z0-9._-]+)/g);
        if (mentionMatches && mentionMatches.length > 0) {
          const mentionStr = mentionMatches[0].replace("@", "").toLowerCase();
          const found = allUsers.find(
            (u) => u.name?.toLowerCase().includes(mentionStr) || u.email?.toLowerCase().includes(mentionStr)
          );
          if (found) {
            matchedAssignee = found;
            assigneeText = `@${found.name || found.email}`;
          }
        }
      }

      if (!matchedAssignee && defaultAssigneeId) {
        const found = allUsers.find((u) => u.id === defaultAssigneeId);
        if (found) {
          matchedAssignee = found;
          assigneeText = `@${found.name || found.email}`;
        }
      }

      // Extract associated project
      let targetProjectId = defaultProjectId;
      let targetProjectTitle: string | null = null;

      const projMatch = text.match(/Project:\s*([^\n]+)/i);
      if (projMatch && projMatch[1]) {
        const pSearch = projMatch[1].trim().toLowerCase();
        const foundP = projects.find((p) => p.title?.toLowerCase().includes(pSearch) || p.name?.toLowerCase().includes(pSearch));
        if (foundP) {
          targetProjectId = foundP.id;
          targetProjectTitle = foundP.title || foundP.name;
        }
      }

      if (targetProjectId && !targetProjectTitle) {
        const foundP = projects.find((p) => p.id === targetProjectId);
        if (foundP) targetProjectTitle = foundP.title || foundP.name;
      }

      // Extract deadline
      let deadlineVal: string | null = null;
      const deadlineMatch = text.match(/(Deadline|Due|Target Date):\s*([^\n]+)/i);
      if (deadlineMatch && deadlineMatch[2]) {
        deadlineVal = deadlineMatch[2].trim();
      }

      // Extract deliverable
      let deliverableVal: string | null = null;
      const delivMatch = text.match(/Deliverable:\s*([^\n]+)/i);
      if (delivMatch && delivMatch[1]) {
        deliverableVal = delivMatch[1].trim();
      }

      // Extract description
      let descVal = text;
      const descMatch = text.match(/Description:\s*([\s\S]+)/i);
      if (descMatch && descMatch[1]) {
        descVal = descMatch[1].trim();
      }

      setExtractedIntent({
        title: titleVal,
        description: descVal,
        type: typeVal,
        priority: prioVal,
        energyLevel: energyVal,
        assignee: matchedAssignee,
        assigneeText,
        projectId: targetProjectId,
        projectTitle: targetProjectTitle,
        deadline: deadlineVal,
        deliverable: deliverableVal,
      });

      setStage("REVIEW");
    } catch (err: any) {
      setError(err?.message || "Failed to analyze task prompt.");
    } finally {
      setIsParsing(false);
    }
  };

  // ── Stage 2: Create Real Task Transaction ─────────────────────────────────
  const handleConfirmCreateTask = async () => {
    if (!extractedIntent) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const workspaceId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : undefined;

      const res = await apiClient.post("/org/tasks/create", {
        workspaceId: workspaceId && workspaceId !== "undefined" ? workspaceId : undefined,
        title: extractedIntent.title,
        description: extractedIntent.description,
        type: extractedIntent.type,
        priority: extractedIntent.priority,
        energyLevel: extractedIntent.energyLevel,
        assigneeId: extractedIntent.assignee?.id || null,
        assigneeUserId: extractedIntent.assignee?.id || null,
        projectId: extractedIntent.type === "PROJECT WORK" ? extractedIntent.projectId : null,
        deadline: extractedIntent.deadline || null,
        deliverable: extractedIntent.deliverable || null,
      });

      if (res.data?.success) {
        onSuccess(res.data.data);
        onClose();
      } else {
        setError(res.data?.error || "Failed to create task record.");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Task creation failed. Please check validation.");
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
              <CheckSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#F2F4F7]">Create Work Task</h2>
              <p className="text-[11px] text-[#667085]">Specify execution task mandate & details.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-[#667085] hover:text-white hover:bg-[#1D222A] transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {error && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Overwrite Protection Confirmation */}
          {pendingExampleText && (
            <div className="p-3 bg-amber-500/15 border border-amber-500/30 rounded-xl text-xs space-y-2">
              <p className="font-semibold text-amber-200">Replace current task prompt content with selected example?</p>
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
                  placeholder="Describe task to execute... (Use @ for team members, / for commands)"
                  rows={5}
                  className="w-full p-3 bg-[#111419] border border-[#272D36] focus:border-[#C9A52A] rounded-xl text-xs text-[#F2F4F7] placeholder-[#667085] outline-none transition-all resize-none leading-relaxed"
                />

                {/* Real-time @ Mention Autocomplete Dropdown */}
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

                {/* Real-time / Slash Commands Dropdown */}
                {slashQuery !== null && filteredSlashCommands.length > 0 && (
                  <div className="absolute left-3 bottom-3 z-50 w-64 bg-[#15191F] border border-[#272D36] rounded-xl shadow-2xl overflow-hidden py-1 max-h-48 overflow-y-auto">
                    <p className="px-3 py-1 text-[9.5px] font-bold text-blue-400 uppercase tracking-wider border-b border-[#1D222A]">
                      Quick Task Commands
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
                        <p className="text-[10px]">Type @ to assign organization team members or @me for yourself.</p>
                      </div>
                      <div className="p-2 bg-[#0B0D10] rounded border border-[#1D222A]">
                        <span className="font-bold text-blue-400">/ Commands</span>
                        <p className="text-[10px]">Type / to insert quick task metadata fields.</p>
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
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded uppercase">
                      {extractedIntent.type}
                    </span>
                    {extractedIntent.deadline && (
                      <span className="text-[11px] font-mono text-[#8B95A5] flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-[#C9A52A]" /> {extractedIntent.deadline}
                      </span>
                    )}
                  </div>
                </div>
                <h3 className="text-sm font-bold text-[#F2F4F7]">{extractedIntent.title}</h3>
              </div>

              {/* Summary Matrix */}
              <div className="grid grid-cols-2 gap-2.5 text-[11px]">
                <div className="p-2.5 bg-[#111419] rounded-xl border border-[#272D36] space-y-1">
                  <span className="text-[9.5px] font-bold text-[#667085] uppercase">Assignee</span>
                  <p className="font-bold text-[#C9A52A]">
                    {renderNeatTextWithMentions(extractedIntent.assigneeText)}
                  </p>
                </div>

                <div className="p-2.5 bg-[#111419] rounded-xl border border-[#272D36] space-y-1">
                  <span className="text-[9.5px] font-bold text-[#667085] uppercase">Energy Fit</span>
                  <p className="font-bold text-[#F2F4F7]">{extractedIntent.energyLevel}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-[11px]">
                <div className="p-2.5 bg-[#111419] rounded-xl border border-[#272D36] space-y-1">
                  <span className="text-[9.5px] font-bold text-[#667085] uppercase">Associated Project</span>
                  <p className="font-semibold text-purple-400">
                    {extractedIntent.projectTitle || "Standalone Task"}
                  </p>
                </div>

                <div className="p-2.5 bg-[#111419] rounded-xl border border-[#272D36] space-y-1">
                  <span className="text-[9.5px] font-bold text-[#667085] uppercase">Target Deliverable</span>
                  <p className="font-semibold text-[#F2F4F7]">
                    {extractedIntent.deliverable || "Standard Execution"}
                  </p>
                </div>
              </div>

              {/* Description & Mentions Preview */}
              <div className="p-2.5 bg-[#111419] rounded-xl border border-[#272D36] space-y-1">
                <span className="text-[9.5px] font-bold text-[#667085] uppercase">Task Mandate & Mentions</span>
                <div className="text-[#8B95A5] leading-relaxed">
                  {renderNeatTextWithMentions(extractedIntent.description)}
                </div>
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
                    <span>Review Task</span>
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
                onClick={handleConfirmCreateTask}
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
                    <span>Create Task</span>
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

