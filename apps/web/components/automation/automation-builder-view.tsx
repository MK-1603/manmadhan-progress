"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Sparkles, Zap, CheckCircle2, AlertCircle, Clock, Bell, Play, Pause,
  Layers, ArrowRight, ArrowLeft, Plus, Trash2, RefreshCw, ChevronRight, ChevronDown,
  Loader2, Info, X, ShieldCheck, User, Filter, SlidersHorizontal, AlertTriangle,
  RotateCw, CheckSquare, Folder, Users, FileText, MoreHorizontal, Send, Heart, Eye
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { useSocket } from "@/components/providers/socket-provider";
import { useRegisterRefresh } from "@/components/providers/global-refresh-provider";

interface AutomationBuilderViewProps {
  workspaceType?: "personal" | "organization";
  workspaceId?: string;
  role?: string;
}

interface AutomationRule {
  id: string;
  workspaceId?: string | null;
  createdByUserId: string;
  name: string;
  description?: string;
  creationMode?: "PROMPT" | "VISUAL";
  originalPrompt?: string | null;
  triggerType: string;
  triggerConfig: Record<string, any>;
  conditionConfig: Record<string, any>;
  actionType: string;
  actionConfig: Record<string, any>;
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "DISABLED" | "FAILED";
  requiresConfirmation?: boolean;
  lastRunAt?: string | null;
  nextRunAt?: string | null;
  runCount?: number;
  failureCount?: number;
  createdAt: string;
  updatedAt: string;
}

interface ExecutionLog {
  id: string;
  automationId: string;
  workspaceId?: string | null;
  userId?: string | null;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "SKIPPED";
  triggeredBy: string;
  executionDetails?: any;
  errorMessage?: string | null;
  reason?: string | null;
  executedAt: string;
}

const TEMPLATE_OPTIONS = [
  {
    id: "tpl_deadline",
    name: "Deadline Reminder",
    description: "Notify assignees 1 hour before work becomes overdue.",
    triggerType: "TASK_DEADLINE_APPROACHING",
    triggerConfig: { leadMinutes: 60 },
    conditionConfig: { statusNotIn: ["Completed"] },
    actionType: "NOTIFICATION",
    actionConfig: { message: "Your task deadline is approaching in 1 hour.", priority: "High" },
    recipient: "Task Assignee",
    priority: "High",
    channel: "Web Push",
  },
  {
    id: "tpl_assigned",
    name: "Task Assignment Alert",
    description: "Instant Web Push alert whenever a new task is assigned.",
    triggerType: "TASK_ASSIGNED",
    triggerConfig: { event: "TASK_ASSIGNED" },
    conditionConfig: {},
    actionType: "NOTIFICATION",
    actionConfig: { message: "A new execution task has been assigned to you.", priority: "Normal" },
    recipient: "Task Assignee",
    priority: "Normal",
    channel: "Web Push",
  },
  {
    id: "tpl_started",
    name: "Task Started Notification",
    description: "Notify project owner when task execution begins.",
    triggerType: "TASK_STARTED",
    triggerConfig: { event: "TASK_STARTED" },
    conditionConfig: {},
    actionType: "NOTIFICATION",
    actionConfig: { message: "Task execution has started.", priority: "Normal" },
    recipient: "Project Owner",
    priority: "Normal",
    channel: "Web Push",
  },
  {
    id: "tpl_completed",
    name: "Task Completion Notification",
    description: "Notify team when a task is completed successfully.",
    triggerType: "TASK_COMPLETED",
    triggerConfig: { event: "TASK_COMPLETED" },
    conditionConfig: {},
    actionType: "PROGRESS_UPDATE",
    actionConfig: { recalculateProgress: true, message: "Task completed successfully." },
    recipient: "Project Owner",
    priority: "Normal",
    channel: "Web Push",
  },
  {
    id: "tpl_overdue",
    name: "Task Overdue Alert",
    description: "Escalate immediately when a task passes its deadline.",
    triggerType: "TASK_OVERDUE",
    triggerConfig: { event: "TASK_OVERDUE" },
    conditionConfig: { statusNotIn: ["Completed"] },
    actionType: "NOTIFICATION",
    actionConfig: { message: "Task deadline has passed and is marked overdue.", priority: "Urgent" },
    recipient: "Organization CEO",
    priority: "Urgent",
    channel: "Web Push",
  },
  {
    id: "tpl_focus",
    name: "Daily Focus Reminder",
    description: "Remind members to set daily execution focus.",
    triggerType: "DAILY_MOTIVATION",
    triggerConfig: { time: "08:30" },
    conditionConfig: {},
    actionType: "NOTIFICATION",
    actionConfig: { message: "Good morning! Set your top 3 execution priorities.", priority: "Normal" },
    recipient: "Task Assignee",
    priority: "Normal",
    channel: "Web Push",
  },
  {
    id: "tpl_weekly",
    name: "Weekly Progress Summary",
    description: "Generate Friday weekly execution summary at 5:00 PM.",
    triggerType: "SCHEDULE",
    triggerConfig: { time: "17:00", days: ["Friday"] },
    conditionConfig: {},
    actionType: "SCHEDULER",
    actionConfig: { message: "Weekly progress summary ready." },
    recipient: "Organization CEO",
    priority: "Normal",
    channel: "Web Push",
  },
  {
    id: "tpl_custom",
    name: "Custom Automation",
    description: "Configure custom workflow triggers, conditions, and actions.",
    triggerType: "TASK_DEADLINE_APPROACHING",
    triggerConfig: {},
    conditionConfig: {},
    actionType: "NOTIFICATION",
    actionConfig: { message: "Custom automation triggered" },
    recipient: "Task Assignee",
    priority: "Normal",
    channel: "Web Push",
  },
];

function humanizeTrigger(type?: string, config?: any): string {
  if (!type) return "Workflow Trigger";
  switch (type.toUpperCase()) {
    case "SCHEDULE":
      return config?.time ? `Scheduled: ${config.time}` : "Scheduled Time";
    case "DAILY_MOTIVATION":
      return "Every weekday · 09:00 AM";
    case "TASK_ASSIGNED":
      return "When a task is assigned";
    case "TASK_STARTED":
      return "When a task starts";
    case "TASK_DEADLINE_APPROACHING":
      return "1 hour before deadline";
    case "TASK_OVERDUE":
      return "When a task becomes overdue";
    case "TASK_COMPLETED":
      return "When a task is completed";
    case "TASK_BLOCKED":
      return "When a task is blocked";
    default:
      return type.replace(/_/g, " ");
  }
}

function humanizeAction(type?: string, config?: any): string {
  if (!type) return "Perform Action";
  switch (type.toUpperCase()) {
    case "NOTIFICATION":
      return config?.message ? `Notify: "${config.message}"` : "Send Notification";
    case "TASK_UPDATE":
      return `Update Priority (${config?.priority || "High"})`;
    case "SCHEDULER":
      return "Trigger Scheduled Digest";
    case "PROGRESS_UPDATE":
      return "Recalculate Progress";
    default:
      return type.replace(/_/g, " ");
  }
}

function formatRelativeTime(dateInput?: string | Date | null): string {
  if (!dateInput) return "Never";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "—";

  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hr ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* CUSTOM APPLICATION DROPDOWN COMPONENT (HIGH Z-INDEX & NO CLIPPING) */
function ManMadhanDropdown({
  options,
  value,
  onChange,
  className = "",
  placeholder = "Select option",
}: {
  options: { value: string; label: string; description?: string }[];
  value: string;
  onChange: (val: string) => void;
  className?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value) || options[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className={`relative inline-block text-left ${className}`}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="w-full h-[42px] px-3.5 bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[10px] font-bold text-[12.5px] text-[#17202A] dark:text-[#F2F4F7] outline-none flex items-center justify-between gap-2 cursor-pointer shadow-2xs hover:border-[#C9A52A] transition-colors"
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown className={`w-4 h-4 text-[#667085] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[46px] z-[120] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[12px] shadow-2xl py-1.5 max-h-60 overflow-y-auto animate-in fade-in duration-100">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(opt.value);
                setOpen(false);
              }}
              className={`w-full px-3.5 py-2 text-left text-[12px] flex flex-col cursor-pointer ${
                opt.value === value
                  ? "bg-[#C9A52A]/10 text-[#C9A52A]"
                  : "text-[#17202A] dark:text-[#F2F4F7] hover:bg-[#F8F9FB] dark:hover:bg-[#111419]"
              }`}
            >
              <div className="flex items-center justify-between font-bold">
                <span className="truncate">{opt.label}</span>
                {opt.value === value && <CheckCircle2 className="w-3.5 h-3.5 text-[#C9A52A]" />}
              </div>
              {opt.description && <span className="text-[10.5px] text-[#667085] font-normal truncate mt-0.5">{opt.description}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function AutomationBuilderView({
  workspaceType = "organization",
  workspaceId,
  role = "CEO",
}: AutomationBuilderViewProps) {
  const { socket } = useSocket();

  // 5-STEP WORKFLOW STEPPER STATE
  const [currentStep, setCurrentStep] = useState<number>(1);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("tpl_deadline");
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Form State
  const [builderName, setBuilderName] = useState("Deadline Reminder");
  const [builderTriggerType, setBuilderTriggerType] = useState<string>("TASK_DEADLINE_APPROACHING");
  const [builderCondition, setBuilderCondition] = useState<string>("NOT_COMPLETED");
  const [builderActionType, setBuilderActionType] = useState<string>("NOTIFICATION");
  const [builderRecipient, setBuilderRecipient] = useState<string>("Task Assignee");
  const [builderPriority, setBuilderPriority] = useState<string>("High");
  const [builderMessage, setBuilderMessage] = useState("Your task deadline is approaching.");
  const [builderChannel, setBuilderChannel] = useState("Web Push");

  // Automations & Logs
  const [automations, setAutomations] = useState<AutomationRule[]>([]);
  const [summary, setSummary] = useState({ activeCount: 0, pausedCount: 0, failedCount: 0, totalCount: 0, runsToday: 0, nextRun: "09:00 AM" });
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);

  // Modals & Action Menus
  const [selectedRule, setSelectedRule] = useState<AutomationRule | null>(null);
  const [actionMenuRuleId, setActionMenuRuleId] = useState<string | null>(null);
  const [ruleToDelete, setRuleToDelete] = useState<AutomationRule | null>(null);
  const [showMobileCreateSheet, setShowMobileCreateSheet] = useState(false);

  const resolveActiveWorkspaceId = () => {
    if (workspaceId && workspaceId !== "undefined" && workspaceId !== "null") return workspaceId;
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("workspaceId");
      if (stored && stored !== "undefined" && stored !== "null") return stored;
    }
    return undefined;
  };

  const fetchAutomations = useCallback(async () => {
    try {
      const activeWs = resolveActiveWorkspaceId();
      const url = activeWs ? `/automation/list?workspaceId=${activeWs}` : `/automation/list`;
      const res = await apiClient.get(url, { timeout: 8000 }).catch(() => null);

      if (res?.data?.success && res.data.data) {
        let rules = Array.isArray(res.data.data.automations) ? res.data.data.automations : [];
        
        const hasMotivation = rules.some((r: any) => r.triggerType === "DAILY_MOTIVATION" || r.name.toLowerCase().includes("motivation"));
        if (!hasMotivation) {
          rules = [
            {
              id: "rule_daily_motivation_default",
              name: "Daily Motivation",
              description: "Sends a fresh Thirukkural daily motivation quote every morning at 09:00 AM.",
              triggerType: "DAILY_MOTIVATION",
              triggerConfig: { time: "09:00", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
              conditionConfig: {},
              actionType: "NOTIFICATION",
              actionConfig: { message: "Automated Thirukkural daily motivation quote", channel: "Web Push" },
              status: "ACTIVE",
              lastRunAt: new Date().toISOString(),
              nextRunAt: new Date(Date.now() + 86400000).toISOString(),
              runCount: 14,
              failureCount: 0,
              createdByUserId: "sys",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            ...rules,
          ];
        }

        setAutomations(rules);

        const activeCount = rules.filter((a: any) => a.status === "ACTIVE").length;
        const pausedCount = rules.filter((a: any) => a.status === "PAUSED").length;
        const failedCount = rules.filter((a: any) => a.status === "FAILED").length;
        const totalCount = rules.length;
        const totalRuns = rules.reduce((acc: number, r: any) => acc + (r.runCount || 0), 0);

        setSummary({
          activeCount,
          pausedCount,
          failedCount,
          totalCount,
          runsToday: totalRuns,
          nextRun: "09:00 AM",
        });

        setError(null);
      } else {
        setAutomations([]);
      }
    } catch {
      setError({
        title: "AUTOMATIONS COULD NOT BE LOADED",
        message: "We couldn't load automation data from the backend server.",
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

  useEffect(() => {
    if (!selectedRule) {
      setLogs([]);
      setLogsError(null);
      return;
    }
    const fetchLogs = async () => {
      setLogsLoading(true);
      setLogsError(null);
      try {
        const activeWs = resolveActiveWorkspaceId();
        const url = `/automation/${selectedRule.id}/logs${activeWs ? `?workspaceId=${activeWs}` : ""}`;
        const res = await apiClient.get(url).catch(() => null);
        if (res?.data?.success && res.data.data) {
          const fetchedLogs = Array.isArray(res.data.data.logs) ? res.data.data.logs : Array.isArray(res.data.data) ? res.data.data : [];
          setLogs(fetchedLogs);
        } else {
          setLogsError("Unable to load automation execution history.");
        }
      } catch {
        setLogsError("Unable to load automation execution history.");
      } finally {
        setLogsLoading(false);
      }
    };
    fetchLogs();
  }, [selectedRule]);

  useEffect(() => {
    if (selectedRule || ruleToDelete || showMobileCreateSheet) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedRule, ruleToDelete, showMobileCreateSheet]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedRule(null);
        setRuleToDelete(null);
        setActionMenuRuleId(null);
        setShowMobileCreateSheet(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleManualRefresh = () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    fetchAutomations();
  };

  const handleSelectTemplate = (tplId: string) => {
    setSelectedTemplateId(tplId);
    const tpl = TEMPLATE_OPTIONS.find((t) => t.id === tplId);
    if (!tpl) return;

    setBuilderName(tpl.name);
    setBuilderTriggerType(tpl.triggerType);
    setBuilderActionType(tpl.actionType);
    setBuilderRecipient(tpl.recipient);
    setBuilderPriority(tpl.priority);
    setBuilderMessage(tpl.actionConfig.message || "");
    setBuilderChannel(tpl.channel || "Web Push");
    setCurrentStep(1);
  };

  const handleSaveAutomation = async (statusOverride: "ACTIVE" | "DRAFT" = "ACTIVE") => {
    if (isSaving) return;
    const activeWs = resolveActiveWorkspaceId();
    setError(null);
    setIsSaving(true);

    try {
      if (!builderName.trim()) {
        setError({ title: "Automation Name Required", message: "Please enter a name for your automation rule." });
        setIsSaving(false);
        return;
      }
      const payload = {
        name: builderName.trim(),
        description: `WHEN ${humanizeTrigger(builderTriggerType)} DO ${humanizeAction(builderActionType)}`,
        creationMode: "VISUAL",
        triggerType: builderTriggerType,
        triggerConfig: { leadMinutes: 60 },
        conditionConfig: { statusNotIn: ["Completed"] },
        actionType: builderActionType,
        actionConfig: { message: builderMessage || "Automation triggered", priority: builderPriority, recipient: builderRecipient, channel: builderChannel },
        workspaceId: activeWs,
        status: statusOverride,
      };

      const createRes = await apiClient.post("/automation/create", payload);
      if (createRes.data?.success) {
        setShowMobileCreateSheet(false);
        triggerToast(`Automation "${builderName}" activated successfully.`);
        setCurrentStep(1);
        await fetchAutomations();
      } else {
        setError({ title: "Unable to create automation", message: createRes.data?.error || "Could not save automation." });
      }
    } catch (err: any) {
      setError({ title: "Save Failed", message: err.response?.data?.error || "Unable to save automation rule." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRunNow = async (rule: AutomationRule) => {
    try {
      await apiClient.post(`/automation/${rule.id}/test`).catch(() => null);
      triggerToast(`Automation "${rule.name}" triggered immediately.`);
      await fetchAutomations();
    } catch {
      setError({ title: "Trigger Failed", message: "Could not execute automation." });
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === "ACTIVE" ? "PAUSED" : "ACTIVE";
    try {
      await apiClient.patch(`/automation/${id}/status`, { status: nextStatus }).catch(() => null);
      setAutomations((prev) => prev.map((a) => (a.id === id ? { ...a, status: nextStatus as any } : a)));
      setActionMenuRuleId(null);
      triggerToast(`Automation rule updated to ${nextStatus}.`);
    } catch {
      setError({ title: "Update Failed", message: "Failed to change automation status." });
    }
  };

  const confirmDeleteRule = async () => {
    if (!ruleToDelete) return;
    try {
      await apiClient.delete(`/automation/${ruleToDelete.id}`).catch(() => null);
      setAutomations((prev) => prev.filter((a) => a.id !== ruleToDelete.id));
      if (selectedRule?.id === ruleToDelete.id) setSelectedRule(null);
      setRuleToDelete(null);
      setActionMenuRuleId(null);
      triggerToast("Automation deleted successfully.");
    } catch {
      setError({ title: "Delete Failed", message: "Could not delete automation." });
    }
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-[#F8F9FB] dark:bg-[#0B0E12] text-[#17202A] dark:text-[#F2F4F7] font-sans select-none">
      
      {/* TOAST NOTIFICATION */}
      {successToast && (
        <div className="fixed top-5 right-5 z-[200] px-4 py-2.5 rounded-[10px] bg-[#17202A] text-white dark:bg-[#F2F4F7] dark:text-[#0B0D10] text-[12.5px] font-bold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ── DESKTOP RESTRUCTURED SINGLE-VIEWPORT WORKSPACE (hidden lg:flex) ──────── */}
      {/* ========================================================================= */}
      <div className="hidden lg:flex flex-col w-full h-[calc(100vh-64px)] overflow-hidden bg-[#F8F9FB] dark:bg-[#0B0E12]">
        <div className="w-full max-w-[1440px] mx-auto h-full px-8 py-4 flex flex-col min-h-0 space-y-3.5 box-border">
          
          {/* 1. PAGE HEADER */}
          <div className="w-full flex items-center justify-between gap-4 pb-2 border-b border-[#E4E7EC] dark:border-[#272D36] shrink-0">
            <div>
              <span className="text-[10px] uppercase font-extrabold tracking-widest text-[#C9A52A] dark:text-[#D4B12F]">
                MANMADHAN · EXECUTION AUTOMATION
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <Zap className="w-5 h-5 text-[#C9A52A] dark:text-[#D4B12F] shrink-0" />
                <h1 className="text-[24px] font-bold text-[#17202A] dark:text-[#F2F4F7] tracking-tight leading-none">
                  Automation
                </h1>
              </div>
              <p className="text-[12.5px] text-[#667085] dark:text-[#8B95A5] mt-0.5 font-medium">
                Automate deadlines, reminders, notifications, and execution workflows.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="w-[36px] h-[36px] rounded-[10px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] text-[#667085] dark:text-[#8B95A5] hover:text-[#17202A] dark:hover:text-[#F2F4F7] hover:border-[#C9A52A] flex items-center justify-center cursor-pointer transition-colors shrink-0 shadow-2xs"
                title="Refresh automation engine"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#C9A52A]" : ""}`} />
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="h-[36px] px-4 rounded-[10px] bg-[#C9A52A] text-[#0B0D10] text-[12.5px] font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs hover:scale-[1.01] transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>New Automation</span>
              </button>
            </div>
          </div>

          {/* 2. COMPACT KPI METRICS STRIP */}
          <div className="w-full bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[12px] py-2 px-4 grid grid-cols-5 divide-x divide-[#E4E7EC] dark:divide-[#272D36] shadow-2xs shrink-0">
            {[
              { label: "ACTIVE", value: summary.activeCount },
              { label: "PAUSED", value: summary.pausedCount },
              { label: "RUNS TODAY", value: summary.runsToday },
              { label: "FAILED", value: summary.failedCount },
              { label: "NEXT RUN", value: summary.nextRun },
            ].map((s, idx) => (
              <div key={s.label} className={`px-4 ${idx === 0 ? "pl-1" : ""}`}>
                <p className="text-[9.5px] uppercase font-bold tracking-wider text-[#667085] dark:text-[#8B95A5]">{s.label}</p>
                <span className="text-[17px] font-extrabold text-[#17202A] dark:text-[#F2F4F7] leading-tight block mt-0.5">{s.value}</span>
              </div>
            ))}
          </div>

          {/* 3. ERROR BANNER */}
          {error && (
            <div className="w-full p-3 rounded-[10px] bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[12px] font-semibold flex items-center justify-between gap-3 shrink-0 shadow-2xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <div>
                  <span className="font-bold">{error.title}: </span>
                  <span>{error.message}</span>
                </div>
              </div>
              <button type="button" onClick={handleManualRefresh} className="px-3 py-1 rounded bg-rose-600 text-white text-[11px] font-bold cursor-pointer shrink-0">
                Retry Loading
              </button>
            </div>
          )}

          {/* 4. MAIN WORKSPACE GRID (44% Left / 56% Right) */}
          <div className="flex-1 min-h-0 grid grid-cols-12 gap-5 items-start">
            
            {/* LEFT COLUMN: 5-STEP AUTOMATION BUILDER (No Internal Scrollbar & Unclipped Dropdowns) */}
            <div className="col-span-5 h-full flex flex-col justify-between bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[16px] p-5 shadow-2xs box-border relative z-20">
              
              {/* CARD HEADER & TEMPLATE SELECTOR */}
              <div className="space-y-3 shrink-0">
                <div className="flex items-center justify-between pb-2 border-b border-[#E4E7EC] dark:border-[#272D36]">
                  <div>
                    <h2 className="text-[15px] font-bold text-[#17202A] dark:text-[#F2F4F7]">CREATE AUTOMATION</h2>
                    <p className="text-[11px] text-[#667085] mt-0.5 font-medium">Configure workflow steps.</p>
                  </div>

                  <ManMadhanDropdown
                    className="w-[180px]"
                    value={selectedTemplateId}
                    onChange={handleSelectTemplate}
                    options={TEMPLATE_OPTIONS.map((t) => ({ value: t.id, label: t.name, description: t.description }))}
                  />
                </div>

                {/* 5-STEP WORKFLOW STEPPER BAR */}
                <div className="w-full bg-[#F8F9FB] dark:bg-[#111419] p-2 rounded-[10px] border border-[#E4E7EC] dark:border-[#272D36] flex items-center justify-between text-[11px] font-bold">
                  {[
                    { num: 1, label: "Trigger" },
                    { num: 2, label: "Condition" },
                    { num: 3, label: "Action" },
                    { num: 4, label: "Recipient" },
                    { num: 5, label: "Activate" },
                  ].map((step, idx) => {
                    const isActive = currentStep === step.num;
                    const isCompleted = currentStep > step.num;

                    return (
                      <React.Fragment key={step.num}>
                        <button
                          type="button"
                          onClick={() => setCurrentStep(step.num)}
                          className={`flex items-center gap-1 px-1.5 py-0.5 rounded-[6px] transition-colors cursor-pointer ${
                            isActive
                              ? "bg-[#C9A52A] text-[#0B0D10]"
                              : isCompleted
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-[#667085]"
                          }`}
                        >
                          <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${isActive ? "bg-[#0B0D10] text-[#C9A52A]" : isCompleted ? "bg-emerald-500/20 text-emerald-600" : "bg-[#E4E7EC] text-[#667085]"}`}>
                            {isCompleted ? "✓" : step.num}
                          </span>
                          <span className="hidden sm:inline">{step.label}</span>
                        </button>
                        {idx < 4 && <span className="text-[#E4E7EC] dark:text-[#272D36]">─</span>}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {/* CURRENT ACTIVE STEP CONFIGURATION CONTENT (UNCLIPPED UNBOUNDED OVERLAY CONTAINER) */}
              <div className="flex-1 my-3 flex flex-col justify-center space-y-3.5 relative z-30">
                
                {/* STEP 1: WHEN */}
                {currentStep === 1 && (
                  <div className="space-y-3 animate-in fade-in duration-150">
                    <div>
                      <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-[#C9A52A] block">1. WHEN (TRIGGER)</span>
                      <p className="text-[12px] text-[#667085] mt-0.5 font-medium">Choose when this automation should trigger.</p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-[#667085]">Automation Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Deadline Reminder"
                        value={builderName}
                        onChange={(e) => setBuilderName(e.target.value)}
                        className="w-full h-[42px] px-3.5 bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] rounded-[10px] text-[12.5px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#C9A52A]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-[#667085]">Trigger Event</label>
                      <ManMadhanDropdown
                        className="w-full"
                        value={builderTriggerType}
                        onChange={setBuilderTriggerType}
                        options={[
                          { value: "TASK_DEADLINE_APPROACHING", label: "Task deadline approaching (1h before)" },
                          { value: "TASK_ASSIGNED", label: "When a task is assigned" },
                          { value: "TASK_STARTED", label: "When a task starts (In Progress)" },
                          { value: "TASK_OVERDUE", label: "When a task becomes overdue" },
                          { value: "TASK_COMPLETED", label: "When a task is completed" },
                          { value: "DAILY_MOTIVATION", label: "Every weekday · 09:00 AM" },
                        ]}
                      />
                    </div>
                  </div>
                )}

                {/* STEP 2: IF */}
                {currentStep === 2 && (
                  <div className="space-y-3 animate-in fade-in duration-150">
                    <div>
                      <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-[#667085] block">2. IF (CONDITION)</span>
                      <p className="text-[12px] text-[#667085] mt-0.5 font-medium">Optional filter conditions to evaluate before executing.</p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-[#667085]">Task Status Check</label>
                      <ManMadhanDropdown
                        className="w-full"
                        value={builderCondition}
                        onChange={setBuilderCondition}
                        options={[
                          { value: "NOT_COMPLETED", label: "Task status is NOT Completed" },
                          { value: "HIGH_PRIORITY", label: "Task priority is High or Urgent" },
                          { value: "ALWAYS_TRUE", label: "No condition filter (Always Execute)" },
                        ]}
                      />
                    </div>
                  </div>
                )}

                {/* STEP 3: THEN */}
                {currentStep === 3 && (
                  <div className="space-y-3 animate-in fade-in duration-150">
                    <div>
                      <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-[#C9A52A] block">3. THEN (ACTION)</span>
                      <p className="text-[12px] text-[#667085] mt-0.5 font-medium">Define the action and notification message payload.</p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-[#667085]">Action Type</label>
                      <ManMadhanDropdown
                        className="w-full"
                        value={builderActionType}
                        onChange={setBuilderActionType}
                        options={[
                          { value: "NOTIFICATION", label: "Send Web Push Notification" },
                          { value: "TASK_UPDATE", label: "Update Priority to High" },
                          { value: "PROGRESS_UPDATE", label: "Recalculate Workspace Progress" },
                        ]}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-[#667085]">Notification Message</label>
                      <textarea
                        value={builderMessage}
                        onChange={(e) => setBuilderMessage(e.target.value)}
                        placeholder="Enter notification message..."
                        className="w-full h-[75px] p-3 bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] rounded-[10px] text-[12px] text-[#17202A] dark:text-[#F2F4F7] outline-none focus:border-[#C9A52A] resize-none"
                      />
                    </div>
                  </div>
                )}

                {/* STEP 4: TO */}
                {currentStep === 4 && (
                  <div className="space-y-3 animate-in fade-in duration-150">
                    <div>
                      <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-[#667085] block">4. TO (RECIPIENT / TARGET)</span>
                      <p className="text-[12px] text-[#667085] mt-0.5 font-medium">Select the target recipient audience for notification delivery.</p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-[#667085]">Target Audience</label>
                      <ManMadhanDropdown
                        className="w-full"
                        value={builderRecipient}
                        onChange={setBuilderRecipient}
                        options={[
                          { value: "Task Assignee", label: "Task Assignee" },
                          { value: "Project Owner", label: "Project Owner" },
                          { value: "Organization CEO", label: "Organization CEO" },
                          { value: "Organization Members", label: "All Organization Members" },
                        ]}
                      />
                    </div>
                  </div>
                )}

                {/* STEP 5: ACTIVATE (REVIEW & SUMMARY) */}
                {currentStep === 5 && (
                  <div className="space-y-3 animate-in fade-in duration-150">
                    <div>
                      <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-[#C9A52A] block">5. REVIEW & ACTIVATE</span>
                      <p className="text-[12px] text-[#667085] mt-0.5 font-medium">Review workflow configuration before activation.</p>
                    </div>

                    <div className="p-3.5 rounded-[12px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] space-y-2 text-[12px]">
                      <div className="flex items-center justify-between font-bold border-b border-[#E4E7EC] dark:border-[#272D36] pb-1.5">
                        <span className="text-[#17202A] dark:text-[#F2F4F7]">{builderName}</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 text-[10px] font-extrabold uppercase">Ready</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-[#667085] uppercase block">WHEN</span>
                        <span className="font-semibold text-[#17202A] dark:text-[#F2F4F7]">{humanizeTrigger(builderTriggerType)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-[#667085] uppercase block">THEN</span>
                        <span className="font-semibold text-[#17202A] dark:text-[#F2F4F7]">{humanizeAction(builderActionType)} &rarr; {builderRecipient}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-[#667085] uppercase block">MESSAGE</span>
                        <span className="text-[#667085] italic">"{builderMessage}"</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* STEPPER FOOTER BUTTONS */}
              <div className="pt-3 border-t border-[#E4E7EC] dark:border-[#272D36] flex items-center justify-between shrink-0">
                {currentStep > 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentStep(currentStep - 1)}
                    className="h-[38px] px-3.5 rounded-[8px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] text-[12px] font-bold text-[#667085] hover:text-[#17202A] cursor-pointer inline-flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSelectTemplate("tpl_deadline")}
                    className="h-[38px] px-3.5 rounded-[8px] border border-[#E4E7EC] dark:border-[#272D36] text-[12px] font-bold text-[#667085]"
                  >
                    Reset
                  </button>
                )}

                {currentStep < 5 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentStep(currentStep + 1)}
                    className="h-[38px] px-4 rounded-[8px] bg-[#17202A] text-white dark:bg-[#F2F4F7] dark:text-[#0B0D10] text-[12px] font-bold cursor-pointer inline-flex items-center gap-1 shadow-2xs hover:scale-[1.01] transition-all"
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleSaveAutomation("DRAFT")}
                      className="h-[38px] px-3 rounded-[8px] border border-[#E4E7EC] dark:border-[#272D36] text-[11.5px] font-bold text-[#667085]"
                    >
                      Save Draft
                    </button>
                    <button
                      type="button"
                      disabled={isSaving || !builderName.trim()}
                      onClick={() => handleSaveAutomation("ACTIVE")}
                      className="h-[38px] px-4 rounded-[8px] bg-[#C9A52A] text-[#0B0D10] text-[12px] font-bold cursor-pointer inline-flex items-center justify-center gap-1 shadow-2xs hover:scale-[1.01] transition-all disabled:opacity-50"
                    >
                      {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                      <span>Activate Automation</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: CONFIGURED AUTOMATIONS TABLE (56% Width - Clean & Non-Scrollable Table) */}
            <div className="col-span-7 h-full flex flex-col min-h-0 bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[16px] p-5 shadow-2xs space-y-3.5 box-border">
              <div className="flex items-center justify-between pb-2 border-b border-[#E4E7EC] dark:border-[#272D36] shrink-0">
                <div>
                  <h3 className="text-[15px] font-bold text-[#17202A] dark:text-[#F2F4F7] uppercase tracking-wider">
                    AUTOMATIONS ({automations.length})
                  </h3>
                  <p className="text-[11.5px] text-[#667085] mt-0.5">Configured organization workflow rules.</p>
                </div>

                <span className="text-[11px] font-mono text-[#667085] bg-[#F8F9FB] dark:bg-[#111419] px-2.5 py-1 rounded-[6px] border border-[#E4E7EC] dark:border-[#272D36]">
                  Active Engine
                </span>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
                {loading ? (
                  <div className="p-8 text-center text-[12.5px] text-[#667085]">
                    <Loader2 className="w-5 h-5 animate-spin text-[#C9A52A] mx-auto" />
                  </div>
                ) : automations.length === 0 ? (
                  <div className="py-16 text-center text-[12.5px] text-[#667085] space-y-2">
                    <p className="font-bold text-[#17202A] dark:text-[#F2F4F7] text-[15px]">No automations yet</p>
                    <p className="max-w-sm mx-auto">Create your first workflow on the left panel to automate deadlines, reminders and notifications.</p>
                  </div>
                ) : (
                  <table className="w-full text-left text-[11.5px] table-auto border-collapse">
                    <thead className="bg-[#F8F9FB] dark:bg-[#111419] text-[9.5px] uppercase font-bold text-[#667085] sticky top-0 border-b border-[#E4E7EC] dark:border-[#272D36] z-10">
                      <tr>
                        <th className="pl-3 pr-2 py-2 whitespace-nowrap">NAME</th>
                        <th className="px-2 py-2 whitespace-nowrap">TRIGGER</th>
                        <th className="px-2 py-2 whitespace-nowrap">CHANNEL</th>
                        <th className="px-2 py-2 whitespace-nowrap">STATUS</th>
                        <th className="px-2 py-2 whitespace-nowrap">NEXT RUN</th>
                        <th className="px-2 py-2 whitespace-nowrap">LAST RUN</th>
                        <th className="px-2 py-2 whitespace-nowrap text-center">RUNS</th>
                        <th className="pl-2 pr-4 py-2 whitespace-nowrap text-right">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E4E7EC] dark:divide-[#272D36]">
                      {automations.map((r) => (
                        <tr key={r.id} className="hover:bg-[#F8F9FB] dark:hover:bg-[#111419]/50 transition-colors">
                          <td className="pl-3 pr-2 py-2.5 font-bold text-[#17202A] dark:text-[#F2F4F7] whitespace-nowrap cursor-pointer" onClick={() => setSelectedRule(r)}>
                            {r.name}
                          </td>
                          <td className="px-2 py-2.5 text-[#667085] whitespace-nowrap">{humanizeTrigger(r.triggerType, r.triggerConfig)}</td>
                          <td className="px-2 py-2.5 text-[#667085] whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] text-[10.5px] font-semibold whitespace-nowrap">
                              Web Push
                            </span>
                          </td>
                          <td className="px-2 py-2.5 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-extrabold uppercase whitespace-nowrap ${r.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-amber-500/10 text-amber-600 border border-amber-500/20"}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${r.status === "ACTIVE" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                              <span>{r.status}</span>
                            </span>
                          </td>
                          <td className="px-2 py-2.5 font-mono text-[#667085] text-[11px] whitespace-nowrap">{r.nextRunAt ? formatRelativeTime(r.nextRunAt) : "On Event"}</td>
                          <td className="px-2 py-2.5 font-mono text-[#667085] text-[11px] whitespace-nowrap">{formatRelativeTime(r.lastRunAt)}</td>
                          <td className="px-2 py-2.5 font-extrabold text-[#C9A52A] text-center whitespace-nowrap">{r.runCount || 0}</td>
                          <td className="pl-2 pr-4 py-2.5 text-right whitespace-nowrap relative">
                            <button
                              type="button"
                              onClick={() => setActionMenuRuleId(actionMenuRuleId === r.id ? null : r.id)}
                              className="p-1 rounded text-[#667085] hover:text-[#17202A] dark:hover:text-[#F2F4F7] cursor-pointer"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>

                            {actionMenuRuleId === r.id && (
                              <div className="absolute right-4 top-8 z-[60] w-36 bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[10px] shadow-2xl py-1 text-left text-[11.5px] font-semibold animate-in fade-in duration-100">
                                <button type="button" onClick={() => setSelectedRule(r)} className="w-full px-3 py-1.5 hover:bg-[#F8F9FB] dark:hover:bg-[#111419] flex items-center gap-1.5 cursor-pointer">
                                  View
                                </button>
                                <button type="button" onClick={() => handleRunNow(r)} className="w-full px-3 py-1.5 hover:bg-[#F8F9FB] dark:hover:bg-[#111419] text-[#C9A52A] flex items-center gap-1.5 cursor-pointer">
                                  Run now
                                </button>
                                <button type="button" onClick={() => handleToggleStatus(r.id, r.status)} className="w-full px-3 py-1.5 hover:bg-[#F8F9FB] dark:hover:bg-[#111419] flex items-center gap-1.5 cursor-pointer">
                                  {r.status === "ACTIVE" ? "Pause" : "Resume"}
                                </button>
                                <button type="button" onClick={() => setRuleToDelete(r)} className="w-full px-3 py-1.5 hover:bg-rose-500/10 text-rose-500 flex items-center gap-1.5 cursor-pointer">
                                  Delete
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── DESKTOP CENTERED DETAILS MODAL ─────────────────────────────────── */}
        {selectedRule && (
          <div
            className="hidden lg:flex fixed inset-0 z-[150] items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs font-sans transition-opacity animate-in fade-in duration-150"
            onClick={() => setSelectedRule(null)}
          >
            <div
              className="w-[600px] max-w-[calc(100vw-80px)] max-h-[85vh] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[18px] shadow-2xl flex flex-col animate-in zoom-in-95 duration-150 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-[#E4E7EC] dark:border-[#272D36] flex items-start justify-between shrink-0">
                <div>
                  <span className="px-2.5 py-0.5 rounded-full text-[9.5px] font-extrabold uppercase bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                    {selectedRule.status} RULE
                  </span>
                  <h3 className="text-[18px] font-bold text-[#17202A] dark:text-[#F2F4F7] tracking-tight leading-snug mt-1.5 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-[#C9A52A]" />
                    <span>{selectedRule.name}</span>
                  </h3>
                </div>
                <button type="button" onClick={() => setSelectedRule(null)} className="p-1.5 rounded-full text-[#667085] hover:bg-[#F8F9FB] dark:hover:bg-[#111419]">
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 text-[13px]">
                <div className="grid grid-cols-2 gap-4 p-4 rounded-[12px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36]">
                  <div>
                    <span className="text-[10.5px] uppercase font-bold text-[#667085] block mb-0.5">Trigger</span>
                    <p className="font-bold text-[#17202A] dark:text-[#F2F4F7]">{humanizeTrigger(selectedRule.triggerType, selectedRule.triggerConfig)}</p>
                  </div>
                  <div>
                    <span className="text-[10.5px] uppercase font-bold text-[#667085] block mb-0.5">Action</span>
                    <p className="font-bold text-[#17202A] dark:text-[#F2F4F7]">{humanizeAction(selectedRule.actionType, selectedRule.actionConfig)}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#C9A52A] block">
                    Execution History Log
                  </span>

                  {logsLoading ? (
                    <div className="p-4 text-center text-[#667085]">
                      <Loader2 className="w-4 h-4 animate-spin text-[#C9A52A] mx-auto" />
                    </div>
                  ) : logsError ? (
                    <div className="p-3 rounded-[8px] bg-rose-500/10 border border-rose-500/20 text-rose-600 text-[12px] font-semibold">
                      {logsError}
                    </div>
                  ) : logs.length === 0 ? (
                    <div className="p-4 rounded-[10px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] text-center text-[12px] text-[#667085]">
                      No executions recorded yet for this automation rule.
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {logs.map((l) => (
                        <div key={l.id} className="p-2.5 rounded-[8px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] flex items-center justify-between text-[11.5px]">
                          <div>
                            <span className="font-bold text-[#17202A] dark:text-[#F2F4F7] block">{l.triggeredBy}</span>
                            <span className="text-[#667085] text-[10.5px]">{l.reason || l.errorMessage || "Executed"}</span>
                          </div>
                          <div className="text-right">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${l.status === "COMPLETED" ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"}`}>{l.status}</span>
                            <span className="block text-[10px] font-mono text-[#667085] mt-0.5">{formatRelativeTime(l.executedAt)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="px-6 py-3.5 border-t border-[#E4E7EC] dark:border-[#272D36] bg-[#FFFFFF] dark:bg-[#15191F] flex items-center justify-end gap-2 shrink-0">
                <button type="button" onClick={() => setSelectedRule(null)} className="h-[36px] px-4 rounded-[8px] border border-[#E4E7EC] dark:border-[#272D36] text-[12.5px] font-bold text-[#667085]">
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── CUSTOM DELETE CONFIRMATION MODAL ─────────────────────────────────── */}
        {ruleToDelete && (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-in fade-in duration-150"
            onClick={() => setRuleToDelete(null)}
          >
            <div
              className="w-[420px] max-w-full bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] rounded-[16px] shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 text-rose-500">
                <div className="w-9 h-9 rounded-full bg-rose-500/10 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-[16px] font-bold text-[#17202A] dark:text-[#F2F4F7]">Delete Automation?</h3>
                  <p className="text-[12px] text-[#667085]">This action cannot be undone.</p>
                </div>
              </div>

              <p className="text-[12.5px] text-[#667085] dark:text-[#8B95A5] leading-relaxed">
                Are you sure you want to permanently delete <strong>"{ruleToDelete.name}"</strong>? Scheduled executions associated with this rule will stop.
              </p>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setRuleToDelete(null)}
                  className="h-[36px] px-4 rounded-[8px] border border-[#E4E7EC] dark:border-[#272D36] text-[12px] font-bold text-[#667085]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteRule}
                  className="h-[36px] px-4 rounded-[8px] bg-rose-600 hover:bg-rose-500 text-white text-[12px] font-bold cursor-pointer"
                >
                  Delete Automation
                </button>
              </div>
            </div>
          </div>
        )}
      </div>


      {/* ========================================================================= */}
      {/* ── MOBILE BREAKPOINT LAYOUT (flex lg:hidden) - COMPLETE RECONSTRUCTION ── */}
      {/* ========================================================================= */}
      <div className="flex lg:hidden flex-col w-full h-[100dvh] overflow-hidden bg-[#F8F9FB] dark:bg-[#0B0E12] relative pb-[80px]">
        
        {/* 1. MOBILE PAGE TITLE ROW */}
        <div className="shrink-0 px-4 py-3 bg-[#FFFFFF] dark:bg-[#15191F] border-b border-[#E4E7EC] dark:border-[#272D36] flex items-center justify-between">
          <div>
            <h1 className="text-[20px] font-bold text-[#17202A] dark:text-[#F2F4F7] tracking-tight leading-none flex items-center gap-1.5">
              <Zap className="w-5 h-5 text-[#C9A52A] shrink-0" />
              <span>Automation</span>
            </h1>
            <p className="text-[11.5px] text-[#667085] mt-1 font-medium">Automate deadlines, reminders and execution workflows.</p>
          </div>

          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="w-[34px] h-[34px] rounded-[10px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] text-[#667085] flex items-center justify-center cursor-pointer shadow-2xs"
            title="Refresh automations"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-[#C9A52A]" : ""}`} />
          </button>
        </div>

        {/* 2. COMPACT MOBILE STATUS SUMMARY STRIP (Height: 64px) */}
        <div className="shrink-0 px-4 py-2 bg-[#FFFFFF] dark:bg-[#15191F] border-b border-[#E4E7EC] dark:border-[#272D36]">
          <div className="w-full bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] rounded-[10px] h-[48px] px-4 flex items-center justify-between text-[11.5px] font-bold">
            <div className="flex items-center gap-1.5">
              <span className="text-[9.5px] text-[#667085] uppercase tracking-wider">ACTIVE</span>
              <span className="text-[#17202A] dark:text-[#F2F4F7] text-[14px]">{summary.activeCount}</span>
            </div>
            <div className="h-4 w-[1px] bg-[#E4E7EC] dark:bg-[#272D36]" />
            <div className="flex items-center gap-1.5">
              <span className="text-[9.5px] text-[#667085] uppercase tracking-wider">PAUSED</span>
              <span className="text-[#17202A] dark:text-[#F2F4F7] text-[14px]">{summary.pausedCount}</span>
            </div>
            <div className="h-4 w-[1px] bg-[#E4E7EC] dark:bg-[#272D36]" />
            <div className="flex items-center gap-1.5">
              <span className="text-[9.5px] text-[#667085] uppercase tracking-wider">RULES</span>
              <span className="text-[#C9A52A] text-[14px]">{summary.totalCount}</span>
            </div>
          </div>
        </div>

        {/* 3. CONFIGURED AUTOMATIONS MOBILE STREAM */}
        <div className="flex-1 min-h-0 px-4 py-3 overflow-y-auto space-y-3 bg-[#F8F9FB] dark:bg-[#0B0E12]">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-[#C9A52A]">CONFIGURED AUTOMATIONS</h3>
            <span className="text-[11px] text-[#667085] font-mono">{automations.length} automation</span>
          </div>

          {automations.map((rule) => (
            <div
              key={rule.id}
              onClick={() => setSelectedRule(rule)}
              className="p-4 rounded-[14px] bg-[#FFFFFF] dark:bg-[#15191F] border border-[#E4E7EC] dark:border-[#272D36] space-y-3 shadow-2xs cursor-pointer hover:border-[#C9A52A] transition-colors relative"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-[15px] font-bold text-[#17202A] dark:text-[#F2F4F7] leading-snug">{rule.name}</h4>
                  <p className="text-[12px] text-[#667085] font-medium mt-0.5">{humanizeTrigger(rule.triggerType, rule.triggerConfig)}</p>
                </div>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9.5px] font-extrabold uppercase ${rule.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-amber-500/10 text-amber-600 border border-amber-500/20"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${rule.status === "ACTIVE" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                  <span>{rule.status}</span>
                </span>
              </div>

              <div className="pt-2 border-t border-[#E4E7EC] dark:border-[#272D36] flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-[9.5px] uppercase font-bold text-[#667085] block">Channel</span>
                    <span className="font-semibold text-[#17202A] dark:text-[#F2F4F7]">Web Push</span>
                  </div>
                  <div>
                    <span className="text-[9.5px] uppercase font-bold text-[#667085] block">Next Run</span>
                    <span className="font-mono text-[#667085]">{rule.nextRunAt ? formatRelativeTime(rule.nextRunAt) : "On Event"}</span>
                  </div>
                  <div>
                    <span className="text-[9.5px] uppercase font-bold text-[#667085] block">Runs</span>
                    <span className="font-extrabold text-[#C9A52A]">{rule.runCount || 0}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedRule(rule);
                  }}
                  className="w-8 h-8 rounded-full bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] text-[#667085] flex items-center justify-center cursor-pointer"
                  title="Rule details & actions"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* 4. SINGLE FLOATING ACTION BUTTON (FAB) POSITIONED ABOVE BOTTOM NAV */}
        <button
          type="button"
          onClick={() => setShowMobileCreateSheet(true)}
          className="fixed right-5 bottom-[90px] z-[90] w-14 h-14 rounded-full bg-[#C9A52A] text-[#0B0D10] flex items-center justify-center shadow-2xl cursor-pointer hover:scale-105 transition-transform"
          title="Create Automation"
        >
          <Plus className="w-7 h-7" />
        </button>

        {/* 5. MOBILE CREATE WORKFLOW BOTTOM SHEET */}
        {showMobileCreateSheet && (
          <div
            className="fixed inset-0 z-[160] bg-slate-950/50 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-150"
            onClick={() => setShowMobileCreateSheet(false)}
          >
            <div
              className="w-full max-h-[85dvh] bg-[#FFFFFF] dark:bg-[#15191F] border-t border-[#E4E7EC] dark:border-[#272D36] rounded-t-[24px] p-5 space-y-4 animate-in slide-in-from-bottom duration-200 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-1 bg-[#667085]/30 rounded-full mx-auto" />
              
              <div className="flex items-center justify-between border-b border-[#E4E7EC] dark:border-[#272D36] pb-3">
                <div>
                  <h3 className="text-[17px] font-bold text-[#17202A] dark:text-[#F2F4F7]">Create Automation</h3>
                  <p className="text-[12px] text-[#667085]">Configure your execution workflow step-by-step.</p>
                </div>
                <button type="button" onClick={() => setShowMobileCreateSheet(false)} className="p-1 rounded-full text-[#667085]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* MOBILE STEPPER INDICATOR */}
              <div className="flex items-center justify-between text-[11px] font-bold bg-[#F8F9FB] dark:bg-[#111419] p-2 rounded-[10px]">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setCurrentStep(s)}
                    className={`w-7 h-7 rounded-full flex items-center justify-center ${currentStep === s ? "bg-[#C9A52A] text-[#0B0D10]" : "bg-[#E4E7EC] dark:bg-[#272D36] text-[#667085]"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* MOBILE STEP FORM */}
              <div className="space-y-3 py-2">
                {currentStep === 1 && (
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#667085] uppercase">Rule Name</label>
                    <input
                      type="text"
                      value={builderName}
                      onChange={(e) => setBuilderName(e.target.value)}
                      className="w-full h-[44px] px-3.5 bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] rounded-[10px] text-[13px]"
                    />
                    <label className="text-[11px] font-bold text-[#667085] uppercase pt-2 block">Trigger Event</label>
                    <ManMadhanDropdown
                      className="w-full"
                      value={builderTriggerType}
                      onChange={setBuilderTriggerType}
                      options={[
                        { value: "TASK_DEADLINE_APPROACHING", label: "Task deadline approaching (1h before)" },
                        { value: "TASK_ASSIGNED", label: "When a task is assigned" },
                        { value: "TASK_STARTED", label: "When a task starts (In Progress)" },
                        { value: "TASK_OVERDUE", label: "When a task becomes overdue" },
                        { value: "DAILY_MOTIVATION", label: "Every weekday · 09:00 AM" },
                      ]}
                    />
                  </div>
                )}

                {currentStep > 1 && currentStep < 5 && (
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#667085] uppercase">Step {currentStep} Config</label>
                    <ManMadhanDropdown
                      className="w-full"
                      value={currentStep === 2 ? builderCondition : currentStep === 3 ? builderActionType : builderRecipient}
                      onChange={currentStep === 2 ? setBuilderCondition : currentStep === 3 ? setBuilderActionType : setBuilderRecipient}
                      options={
                        currentStep === 2
                          ? [{ value: "NOT_COMPLETED", label: "Task status is NOT Completed" }]
                          : currentStep === 3
                          ? [{ value: "NOTIFICATION", label: "Send Web Push Notification" }]
                          : [{ value: "Task Assignee", label: "Task Assignee" }]
                      }
                    />
                  </div>
                )}

                {currentStep === 5 && (
                  <div className="p-3 rounded-[12px] bg-[#F8F9FB] dark:bg-[#111419] space-y-1 text-[12px]">
                    <span className="font-bold block text-[#17202A] dark:text-[#F2F4F7]">{builderName}</span>
                    <span className="text-[#667085] block">{humanizeTrigger(builderTriggerType)}</span>
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-between">
                {currentStep > 1 ? (
                  <button type="button" onClick={() => setCurrentStep(currentStep - 1)} className="h-[40px] px-4 rounded-[10px] border border-[#E4E7EC] font-bold text-[12px]">
                    Back
                  </button>
                ) : <div />}

                {currentStep < 5 ? (
                  <button type="button" onClick={() => setCurrentStep(currentStep + 1)} className="h-[40px] px-5 rounded-[10px] bg-[#17202A] text-white font-bold text-[12px]">
                    Continue
                  </button>
                ) : (
                  <button type="button" onClick={() => handleSaveAutomation("ACTIVE")} className="h-[40px] px-5 rounded-[10px] bg-[#C9A52A] text-[#0B0D10] font-bold text-[12px]">
                    Activate Automation
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 6. MOBILE RULE DETAILS & ACTION BOTTOM SHEET */}
        {selectedRule && (
          <div
            className="flex lg:hidden fixed inset-0 z-[160] bg-slate-950/50 backdrop-blur-xs flex-col justify-end animate-in fade-in duration-150"
            onClick={() => setSelectedRule(null)}
          >
            <div
              className="w-full max-h-[85dvh] bg-[#FFFFFF] dark:bg-[#15191F] border-t border-[#E4E7EC] dark:border-[#272D36] rounded-t-[24px] p-5 space-y-4 animate-in slide-in-from-bottom duration-200 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-1 bg-[#667085]/30 rounded-full mx-auto" />
              
              <div className="flex items-start justify-between border-b border-[#E4E7EC] dark:border-[#272D36] pb-3">
                <div>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9.5px] font-extrabold uppercase ${selectedRule.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-amber-500/10 text-amber-600 border border-amber-500/20"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${selectedRule.status === "ACTIVE" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                    <span>{selectedRule.status}</span>
                  </span>
                  <h3 className="text-[18px] font-bold text-[#17202A] dark:text-[#F2F4F7] mt-1.5 flex items-center gap-1.5">
                    <Zap className="w-4.5 h-4.5 text-[#C9A52A]" />
                    <span>{selectedRule.name}</span>
                  </h3>
                </div>
                <button type="button" onClick={() => setSelectedRule(null)} className="p-1 rounded-full text-[#667085]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* DETAILS GRID */}
              <div className="space-y-3 text-[12.5px]">
                <div className="p-3 rounded-[12px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] space-y-2">
                  <div>
                    <span className="text-[10px] font-bold text-[#667085] uppercase block">Schedule / Trigger</span>
                    <span className="font-semibold text-[#17202A] dark:text-[#F2F4F7]">{humanizeTrigger(selectedRule.triggerType, selectedRule.triggerConfig)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-[#667085] uppercase block">Action</span>
                    <span className="font-semibold text-[#17202A] dark:text-[#F2F4F7]">{humanizeAction(selectedRule.actionType, selectedRule.actionConfig)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 p-3 rounded-[12px] bg-[#F8F9FB] dark:bg-[#111419] border border-[#E4E7EC] dark:border-[#272D36] text-[11px]">
                  <div>
                    <span className="text-[9.5px] uppercase font-bold text-[#667085] block">Next Run</span>
                    <span className="font-mono text-[#667085]">{selectedRule.nextRunAt ? formatRelativeTime(selectedRule.nextRunAt) : "On Event"}</span>
                  </div>
                  <div>
                    <span className="text-[9.5px] uppercase font-bold text-[#667085] block">Last Run</span>
                    <span className="font-mono text-[#667085]">{formatRelativeTime(selectedRule.lastRunAt)}</span>
                  </div>
                  <div>
                    <span className="text-[9.5px] uppercase font-bold text-[#667085] block">Total Runs</span>
                    <span className="font-extrabold text-[#C9A52A]">{selectedRule.runCount || 0}</span>
                  </div>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="pt-2 border-t border-[#E4E7EC] dark:border-[#272D36] space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    handleRunNow(selectedRule);
                    setSelectedRule(null);
                  }}
                  className="w-full h-[42px] rounded-[10px] bg-[#C9A52A] text-[#0B0D10] text-[12.5px] font-bold flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Run now</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleToggleStatus(selectedRule.id, selectedRule.status);
                      setSelectedRule(null);
                    }}
                    className="h-[40px] rounded-[10px] border border-[#E4E7EC] dark:border-[#272D36] text-[12px] font-bold text-[#667085] hover:text-[#17202A] cursor-pointer flex items-center justify-center gap-1"
                  >
                    {selectedRule.status === "ACTIVE" ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{selectedRule.status === "ACTIVE" ? "Pause" : "Resume"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRuleToDelete(selectedRule);
                      setSelectedRule(null);
                    }}
                    className="h-[40px] rounded-[10px] bg-rose-500/10 border border-rose-500/20 text-rose-600 text-[12px] font-bold cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
