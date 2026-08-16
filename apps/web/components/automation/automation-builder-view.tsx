"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Sparkles,
  Zap,
  CheckCircle2,
  AlertCircle,
  Clock,
  Bell,
  Play,
  Pause,
  Layers,
  ArrowRight,
  Plus,
  Trash2,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Loader2,
  Info,
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { useSocket } from "@/components/providers/socket-provider";
import { useRegisterRefresh } from "@/components/providers/global-refresh-provider";

interface AutomationBuilderViewProps {
  workspaceType?: "personal" | "organization";
  workspaceId?: string;
  role?: string;
}

const COMPACT_EXAMPLES = [
  "Every weekday at 9 AM, remind me to review my priorities.",
  "When a task is assigned to me, notify me.",
  "When a task becomes overdue, notify me.",
  "Every Friday, create my weekly progress summary.",
];

function humanizeTrigger(type?: string, config?: any): string {
  if (!type) return "Event Triggered";
  switch (type.toUpperCase()) {
    case "SCHEDULE":
      return config?.cron ? `Scheduled: ${config.cron}` : config?.time ? `Everyday at ${config.time}` : "Scheduled time";
    case "TASK_ASSIGNED":
      return "When a task is assigned to me";
    case "TASK_ACCEPTED":
      return "When a task is accepted";
    case "TASK_COMPLETED":
      return "When a task is completed";
    case "TASK_OVERDUE":
      return "When a task becomes overdue";
    case "PROGRESS_UPDATED":
      return "When progress is updated";
    default:
      return "Workflow event";
  }
}

function humanizeAction(type?: string, config?: any): string {
  if (!type) return "Perform Action";
  switch (type.toUpperCase()) {
    case "NOTIFICATION":
      return config?.message ? `Notify: "${config.message}"` : "Send notification";
    case "TASK_UPDATE":
      return "Update task status";
    case "SCHEDULER":
      return "Trigger scheduled digest";
    case "PROGRESS_UPDATE":
      return "Update progress automatically";
    default:
      return "Execute action";
  }
}

function formatRelativeTime(dateInput?: string | Date | null): string {
  if (!dateInput) return "Never";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "—";

  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hour ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function AutomationBuilderView({
  workspaceType = "personal",
  workspaceId,
  role = "MEMBER",
}: AutomationBuilderViewProps) {
  const { socket } = useSocket();

  const [mode, setMode] = useState<"PROMPT" | "VISUAL">("PROMPT");
  const [promptInput, setPromptInput] = useState("");
  const [isInterpreting, setIsInterpreting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);

  // Visual Builder Fields
  const [builderName, setBuilderName] = useState("");
  const [builderTriggerType, setBuilderTriggerType] = useState<string>("SCHEDULE");
  const [builderActionType, setBuilderActionType] = useState<string>("NOTIFICATION");
  const [builderMessage, setBuilderMessage] = useState("");
  const [builderScheduleTime, setBuilderScheduleTime] = useState("09:00");

  // Real Automations List & Expanded Advanced Details ID set
  const [automations, setAutomations] = useState<any[]>([]);
  const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({});

  const resolveActiveWorkspaceId = () => {
    if (workspaceId && workspaceId !== "undefined" && workspaceId !== "null") return workspaceId;
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("workspaceId");
      if (stored && stored !== "undefined" && stored !== "null") return stored;
    }
    return undefined;
  };

  // Load Automations safely from backend
  const fetchAutomations = useCallback(async () => {
    try {
      const activeWs = resolveActiveWorkspaceId();
      const url = activeWs ? `/automation/list?workspaceId=${activeWs}` : `/automation/list`;
      const res = await apiClient.get(url, { timeout: 8000 }).catch(() => null);

      if (res?.data?.success && Array.isArray(res.data.data)) {
        setAutomations(res.data.data);
        setError(null);
      } else if (res?.data?.error) {
        setError({
          title: "Unable to load automations",
          message: "Check your connection and try again.",
        });
      } else {
        setAutomations([]);
      }
    } catch {
      setError({
        title: "Unable to load automations",
        message: "Check your connection and try again.",
      });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchAutomations();
  }, [fetchAutomations]);

  useRegisterRefresh(fetchAutomations);

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => fetchAutomations();
    socket.on("automation.created", handleUpdate);
    socket.on("automation.triggered", handleUpdate);
    return () => {
      socket.off("automation.created", handleUpdate);
      socket.off("automation.triggered", handleUpdate);
    };
  }, [socket, fetchAutomations]);

  const handleManualRefresh = () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    fetchAutomations();
  };

  // Handle Automation Creation from Prompt or Visual Form
  const handleCreateAutomation = async (overridePrompt?: string) => {
    if (isSaving || isInterpreting) return;

    const targetPrompt = overridePrompt || promptInput;
    if (mode === "PROMPT" && (!targetPrompt || targetPrompt.trim().length < 3)) {
      setError({
        title: "Describe what you want to automate",
        message: "Enter a prompt describing your workflow rule (min 3 characters).",
      });
      return;
    }

    setError(null);
    const activeWs = resolveActiveWorkspaceId();

    if (mode === "PROMPT") {
      setIsInterpreting(true);
      try {
        const interpretRes = await apiClient.post("/automation/interpret-prompt", {
          prompt: targetPrompt.trim(),
          workspaceType,
        });

        if (interpretRes.data?.success && interpretRes.data.data) {
          const parsed = interpretRes.data.data;
          
          setIsSaving(true);
          const createRes = await apiClient.post("/automation/create", {
            name: parsed.name || "Workflow Automation",
            description: parsed.description || targetPrompt,
            creationMode: "PROMPT",
            originalPrompt: targetPrompt.trim(),
            triggerType: parsed.triggerType || "SCHEDULE",
            triggerConfig: parsed.triggerConfig || {},
            conditionConfig: parsed.conditionConfig || {},
            actionType: parsed.actionType || "NOTIFICATION",
            actionConfig: parsed.actionConfig || {},
            workspaceId: activeWs,
            requiresConfirmation: Boolean(parsed.requiresConfirmation),
          });

          if (createRes.data?.success) {
            setPromptInput("");
            await fetchAutomations();
          } else {
            setError({
              title: "Unable to create automation",
              message: "We couldn't save this automation right now. Please try again.",
            });
          }
        } else {
          setError({
            title: "Unable to interpret prompt",
            message: interpretRes.data?.error || "We couldn't understand this workflow prompt. Try simpler wording.",
          });
        }
      } catch (err: any) {
        setError({
          title: "Unable to create automation",
          message: "We couldn't save this automation right now. Please try again.",
        });
      } finally {
        setIsInterpreting(false);
        setIsSaving(false);
      }
    } else {
      // Visual Mode Submission
      if (!builderName.trim()) {
        setError({
          title: "Automation name required",
          message: "Please enter a name for your automation.",
        });
        return;
      }

      setIsSaving(true);
      try {
        const createRes = await apiClient.post("/automation/create", {
          name: builderName.trim(),
          description: `Automated ${builderTriggerType} -> ${builderActionType}`,
          creationMode: "VISUAL",
          triggerType: builderTriggerType,
          triggerConfig: { time: builderScheduleTime },
          conditionConfig: {},
          actionType: builderActionType,
          actionConfig: { message: builderMessage || "Automation triggered" },
          workspaceId: activeWs,
          requiresConfirmation: false,
        });

        if (createRes.data?.success) {
          setBuilderName("");
          setBuilderMessage("");
          await fetchAutomations();
        } else {
          setError({
            title: "Unable to create automation",
            message: "We couldn't save this automation right now. Please try again.",
          });
        }
      } catch {
        setError({
          title: "Unable to create automation",
          message: "We couldn't save this automation right now. Please try again.",
        });
      } finally {
        setIsSaving(false);
      }
    }
  };

  // Toggle Automation Status (Active / Paused)
  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === "ACTIVE" ? "PAUSED" : "ACTIVE";
    try {
      await apiClient.patch(`/automation/${id}/status`, { status: nextStatus });
      setAutomations((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: nextStatus } : a))
      );
    } catch {
      setError({
        title: "Unable to update automation",
        message: "Failed to change automation status. Please try again.",
      });
    }
  };

  const toggleDetails = (id: string) => {
    setExpandedDetails((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="w-full h-full flex flex-col justify-between overflow-y-auto bg-[#F9FAFB] dark:bg-[#060806] text-[#17202A] dark:text-[#F2F4F7] font-sans select-none p-4 sm:p-5 md:px-8 md:py-5 pb-[calc(84px+env(safe-area-inset-bottom))] md:pb-5 max-w-[1400px] mx-auto space-y-5 box-border [scrollbar-width:none]">
      
      {/* 1. PAGE HEADER & MODE SWITCHER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5E7EB] dark:border-[#272D36] shrink-0">
        <div className="space-y-0.5">
          <h1 className="text-[20px] sm:text-[24px] font-bold text-[#17202A] dark:text-[#F2F4F7] tracking-tight leading-none">
            Automation
          </h1>
          <p className="text-[12.5px] text-[#667085] dark:text-[#8B95A5]">
            Automate recurring work and workflow actions.
          </p>
        </div>

        {/* Mode Switcher Pills */}
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-[12px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E5E7EB] dark:border-[#272D36] flex items-center gap-1 shadow-xs">
            <button
              onClick={() => setMode("PROMPT")}
              className={`h-[34px] px-3.5 rounded-[9px] text-[12.5px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                mode === "PROMPT"
                  ? "bg-[#B28D18] dark:bg-[#C9A52A] text-white dark:text-[#0B0D10] shadow-xs"
                  : "text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7]"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>Prompt</span>
            </button>
            <button
              onClick={() => setMode("VISUAL")}
              className={`h-[34px] px-3.5 rounded-[9px] text-[12.5px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                mode === "VISUAL"
                  ? "bg-[#B28D18] dark:bg-[#C9A52A] text-white dark:text-[#0B0D10] shadow-xs"
                  : "text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7]"
              }`}
            >
              <Zap className="w-3.5 h-3.5 shrink-0" />
              <span>Visual Builder</span>
            </button>
          </div>

          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="w-[38px] h-[38px] rounded-[11px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E5E7EB] dark:border-[#272D36] text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7] flex items-center justify-center cursor-pointer transition-colors shrink-0 shadow-xs"
            title="Refresh automations"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-[#B28D18] dark:text-[#C9A52A]" : ""}`} />
          </button>
        </div>
      </div>

      {/* 2. GLOBAL SAFE INLINE ERROR BANNER */}
      {error && (
        <div className="p-3 sm:p-4 rounded-[14px] bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[12.5px] font-medium flex items-center justify-between gap-3 shrink-0 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <div className="min-w-0">
              <p className="font-bold text-[13px] tracking-tight">{error.title}</p>
              <p className="text-[12px] opacity-90 truncate">{error.message}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setError(null);
              if (isSaving || isInterpreting) return;
              handleCreateAutomation();
            }}
            className="h-[32px] px-3 rounded-[8px] bg-rose-600 hover:bg-rose-500 text-white text-[11.5px] font-bold cursor-pointer shrink-0 transition-colors"
          >
            Try again
          </button>
        </div>
      )}

      {/* 3. CREATION AREA */}
      <div className="p-4 sm:p-5 rounded-[18px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E5E7EB] dark:border-[#272D36] shadow-xs space-y-4">
        {mode === "PROMPT" ? (
          /* Prompt Creation Area */
          <div className="space-y-3">
            <div className="space-y-0.5">
              <h2 className="text-[15px] font-bold text-[#17202A] dark:text-[#F2F4F7] tracking-tight">
                Create automation with Prompt
              </h2>
              <p className="text-[12px] text-[#667085] dark:text-[#8B95A5]">
                Describe what you want to automate in simple words.
              </p>
            </div>

            <div className="space-y-2">
              <textarea
                value={promptInput}
                disabled={isSaving || isInterpreting}
                onChange={(e) => setPromptInput(e.target.value)}
                placeholder='e.g. "When I complete a task, update my progress automatically."'
                className="w-full min-h-[90px] p-3.5 bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] rounded-[13px] text-[13px] text-[#17202A] dark:text-[#F2F4F7] placeholder-[#667085] dark:placeholder-[#8B95A5] outline-none focus:border-[#B28D18] dark:focus:border-[#C9A52A] transition-colors resize-none disabled:opacity-50"
              />

              {/* Clickable Example Chips */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-bold text-[#667085] dark:text-[#8B95A5] uppercase tracking-wider block">
                  Try an example
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {COMPACT_EXAMPLES.map((ex, idx) => (
                    <button
                      key={idx}
                      type="button"
                      disabled={isSaving || isInterpreting}
                      onClick={() => {
                        setPromptInput(ex);
                        setError(null);
                      }}
                      className="px-3 py-1.5 rounded-[9px] bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] text-[11.5px] font-medium text-[#17202A] dark:text-[#F2F4F7] hover:border-[#B28D18] dark:hover:border-[#C9A52A] transition-colors cursor-pointer text-left disabled:opacity-50"
                    >
                      "{ex}"
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                disabled={isSaving || isInterpreting || !promptInput.trim()}
                onClick={() => handleCreateAutomation()}
                className="h-[42px] px-5 rounded-[11px] bg-[#B28D18] dark:bg-[#C9A52A] text-white dark:text-[#0B0D10] text-[13px] font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:pointer-events-none disabled:translate-y-0"
              >
                {isSaving || isInterpreting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <span>Create automation</span>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Visual Builder Area */
          <div className="space-y-3.5">
            <div className="space-y-0.5">
              <h2 className="text-[15px] font-bold text-[#17202A] dark:text-[#F2F4F7] tracking-tight">
                Visual Automation Builder
              </h2>
              <p className="text-[12px] text-[#667085] dark:text-[#8B95A5]">
                Configure trigger events and automated actions.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#667085] dark:text-[#8B95A5]">
                  AUTOMATION NAME
                </label>
                <input
                  type="text"
                  placeholder="e.g. Daily Priority Digest"
                  value={builderName}
                  onChange={(e) => setBuilderName(e.target.value)}
                  className="w-full h-[40px] px-3 bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] rounded-[10px] text-[13px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#B28D18] dark:focus:border-[#C9A52A]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#667085] dark:text-[#8B95A5]">
                  TRIGGER EVENT
                </label>
                <select
                  value={builderTriggerType}
                  onChange={(e) => setBuilderTriggerType(e.target.value)}
                  className="w-full h-[40px] px-3 bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] rounded-[10px] text-[13px] font-semibold text-[#17202A] dark:text-[#F2F4F7] outline-none cursor-pointer"
                >
                  <option value="SCHEDULE">Scheduled Time / Daily</option>
                  <option value="TASK_ASSIGNED">When a task is assigned</option>
                  <option value="TASK_COMPLETED">When a task is completed</option>
                  <option value="TASK_OVERDUE">When a task becomes overdue</option>
                  <option value="PROGRESS_UPDATED">When progress is updated</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#667085] dark:text-[#8B95A5]">
                  ACTION TYPE
                </label>
                <select
                  value={builderActionType}
                  onChange={(e) => setBuilderActionType(e.target.value)}
                  className="w-full h-[40px] px-3 bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] rounded-[10px] text-[13px] font-semibold text-[#17202A] dark:text-[#F2F4F7] outline-none cursor-pointer"
                >
                  <option value="NOTIFICATION">Send Notification</option>
                  <option value="TASK_UPDATE">Update Task Status</option>
                  <option value="PROGRESS_UPDATE">Update Progress Automatically</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#667085] dark:text-[#8B95A5]">
                  NOTIFICATION MESSAGE / NOTE
                </label>
                <input
                  type="text"
                  placeholder="e.g. Review priorities for today"
                  value={builderMessage}
                  onChange={(e) => setBuilderMessage(e.target.value)}
                  className="w-full h-[40px] px-3 bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] rounded-[10px] text-[13px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#B28D18] dark:focus:border-[#C9A52A]"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                disabled={isSaving || !builderName.trim()}
                onClick={() => handleCreateAutomation()}
                className="h-[42px] px-5 rounded-[11px] bg-[#B28D18] dark:bg-[#C9A52A] text-white dark:text-[#0B0D10] text-[13px] font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:pointer-events-none"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Create automation</span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. AUTOMATION LIST / TABLE */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-bold text-[#17202A] dark:text-[#F2F4F7] tracking-tight">
            Automations ({automations.length})
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center space-y-3 rounded-[16px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E5E7EB] dark:border-[#272D36]">
            <Loader2 className="w-6 h-6 animate-spin text-[#B28D18] dark:text-[#C9A52A] mx-auto" />
            <span className="text-[13px] font-medium text-[#667085] dark:text-[#8B95A5]">Loading automations...</span>
          </div>
        ) : automations.length === 0 ? (
          <div className="p-8 text-center space-y-3 rounded-[16px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E5E7EB] dark:border-[#272D36]">
            <div className="w-10 h-10 rounded-full bg-[#B28D18]/10 dark:bg-[#C9A52A]/10 text-[#B28D18] dark:text-[#C9A52A] flex items-center justify-center mx-auto">
              <Zap className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-[15px] font-bold text-[#17202A] dark:text-[#F2F4F7]">No automations yet</h3>
              <p className="text-[12.5px] text-[#667085] dark:text-[#8B95A5] max-w-sm mx-auto leading-relaxed">
                Create your first automation to reduce repetitive work.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {automations.map((item) => {
              const status = (item.status || "ACTIVE").toUpperCase();
              const isExpanded = Boolean(expandedDetails[item.id]);

              const statusBadge =
                status === "ACTIVE" ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Active
                  </span>
                ) : status === "PAUSED" ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[11px] font-bold inline-flex items-center gap-1">
                    Paused
                  </span>
                ) : status === "FAILED" ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[11px] font-bold inline-flex items-center gap-1">
                    Failed
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-gray-500/10 border border-gray-500/20 text-gray-600 dark:text-gray-400 text-[11px] font-bold">
                    Draft
                  </span>
                );

              return (
                <div
                  key={item.id}
                  className="p-4 rounded-[16px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E5E7EB] dark:border-[#272D36] space-y-3 shadow-xs hover:border-[#B28D18] dark:hover:border-[#C9A52A] transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-[14.5px] font-bold text-[#17202A] dark:text-[#F2F4F7] truncate">
                          {item.name}
                        </h3>
                        {statusBadge}
                      </div>

                      <p className="text-[12.5px] text-[#667085] dark:text-[#8B95A5] leading-relaxed">
                        {item.description || humanizeTrigger(item.triggerType, item.triggerConfig)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleToggleStatus(item.id, status)}
                        className={`h-[32px] px-3 rounded-[8px] text-[11.5px] font-bold cursor-pointer transition-colors ${
                          status === "ACTIVE"
                            ? "bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A]"
                            : "bg-[#B28D18] dark:bg-[#C9A52A] text-white dark:text-[#0B0D10]"
                        }`}
                      >
                        {status === "ACTIVE" ? "Pause" : "Resume"}
                      </button>

                      <button
                        onClick={() => toggleDetails(item.id)}
                        className="h-[32px] px-2.5 rounded-[8px] border border-[#E5E7EB] dark:border-[#272D36] text-[#667085] dark:text-[#8B94A3] hover:text-[#17202A] text-[11.5px] font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <span>Details</span>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </button>
                    </div>
                  </div>

                  {/* Summary Bar */}
                  <div className="pt-2.5 border-t border-[#E5E7EB] dark:border-[#272D36] grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11.5px] text-[#667085] dark:text-[#8B95A5]">
                    <div>
                      <span className="block text-[10.5px] font-bold uppercase tracking-wider text-[#667085] dark:text-[#8B95A5]">Trigger</span>
                      <span className="font-semibold text-[#17202A] dark:text-[#F2F4F7] truncate block">
                        {humanizeTrigger(item.triggerType, item.triggerConfig)}
                      </span>
                    </div>

                    <div>
                      <span className="block text-[10.5px] font-bold uppercase tracking-wider text-[#667085] dark:text-[#8B95A5]">Action</span>
                      <span className="font-semibold text-[#17202A] dark:text-[#F2F4F7] truncate block">
                        {humanizeAction(item.actionType, item.actionConfig)}
                      </span>
                    </div>

                    <div>
                      <span className="block text-[10.5px] font-bold uppercase tracking-wider text-[#667085] dark:text-[#8B95A5]">Last run</span>
                      <span className="font-medium text-[#17202A] dark:text-[#F2F4F7] block">
                        {formatRelativeTime(item.lastRunAt)}
                      </span>
                    </div>

                    <div>
                      <span className="block text-[10.5px] font-bold uppercase tracking-wider text-[#667085] dark:text-[#8B95A5]">Next run</span>
                      <span className="font-medium text-[#17202A] dark:text-[#F2F4F7] block">
                        {item.nextRunAt ? formatRelativeTime(item.nextRunAt) : "On event"}
                      </span>
                    </div>
                  </div>

                  {/* Advanced Human-Readable Details Drawer Toggle */}
                  {isExpanded && (
                    <div className="p-3 rounded-[12px] bg-[#F8F9FA] dark:bg-[#07090D] border border-[#E5E7EB] dark:border-[#272D36] space-y-1.5 text-[12px]">
                      <span className="font-bold text-[#17202A] dark:text-[#F2F4F7] block text-[11.5px]">
                        Advanced Details
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[#667085] dark:text-[#8B95A5]">
                        <div>
                          <strong className="text-[#17202A] dark:text-[#F2F4F7]">Creation Mode:</strong> {item.creationMode || "Prompt"}
                        </div>
                        <div>
                          <strong className="text-[#17202A] dark:text-[#F2F4F7]">Runs Executed:</strong> {item.runCount || 0} times
                        </div>
                        {item.originalPrompt && (
                          <div className="col-span-1 sm:col-span-2">
                            <strong className="text-[#17202A] dark:text-[#F2F4F7]">Original Prompt:</strong> "{item.originalPrompt}"
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
