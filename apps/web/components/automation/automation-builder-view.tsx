"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Zap,
  CheckCircle2,
  AlertCircle,
  Clock,
  Bell,
  Play,
  Pause,
  History,
  Layers,
  ArrowRight,
  ShieldAlert,
  Terminal,
  Plus,
  Edit3,
  Trash2,
  RotateCcw,
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { useMediaQuery } from "@/hooks/use-media-query";
import { MobileSheet } from "@/components/ui/mobile-sheet";
import { useSocket } from "@/components/providers/socket-provider";

interface AutomationBuilderViewProps {
  workspaceType?: "personal" | "organization";
  workspaceId?: string;
  role?: string;
}

const SUPPORTED_EXAMPLES = [
  "Every weekday at 9 AM, remind me to review my priorities.",
  "When a task is assigned to me, notify me immediately.",
  "When a task is overdue, notify me and mark it as high priority.",
  "Every Friday at 5 PM, create my weekly progress summary.",
  "When I complete a task, update my progress automatically.",
  "Every Monday morning, show me the tasks I need to complete this week.",
  "When a task deadline changes, notify me.",
  "Every evening, remind me to review unfinished work.",
];

export function AutomationBuilderView({
  workspaceType = "personal",
  workspaceId,
  role = "MEMBER",
}: AutomationBuilderViewProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const { socket } = useSocket();

  const [mode, setMode] = useState<"PROMPT" | "VISUAL">("PROMPT");
  const [promptInput, setPromptInput] = useState("");
  const [isInterpreting, setIsInterpreting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parsed / Draft Automation State
  const [draftAutomation, setDraftAutomation] = useState<any | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Visual Builder Fields
  const [builderName, setBuilderName] = useState("");
  const [builderTriggerType, setBuilderTriggerType] = useState<string>("SCHEDULE");
  const [builderActionType, setBuilderActionType] = useState<string>("NOTIFICATION");
  const [builderMessage, setBuilderMessage] = useState("");
  const [builderScheduleTime, setBuilderScheduleTime] = useState("09:00");

  // Real Automations List & Logs
  const [automations, setAutomations] = useState<any[]>([]);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Load Real Automations from DB
  const fetchAutomations = async () => {
    try {
      const url = workspaceId
        ? `/automation/list?workspaceId=${workspaceId}`
        : `/automation/list`;
      const res = await apiClient.get(url);
      if (res.data?.success && Array.isArray(res.data.data)) {
        setAutomations(res.data.data);
      }
    } catch (e) {
      console.error("Failed to fetch automations:", e);
    }
  };

  useEffect(() => {
    fetchAutomations();
  }, [workspaceId]);

  // Real-time socket updates for automations
  useEffect(() => {
    if (!socket) return;
    const handleCreated = () => fetchAutomations();
    const handleTriggered = () => fetchAutomations();
    socket.on("automation.created", handleCreated);
    socket.on("automation.triggered", handleTriggered);
    return () => {
      socket.off("automation.created", handleCreated);
      socket.off("automation.triggered", handleTriggered);
    };
  }, [socket]);

  // Handle AI Prompt Interpretation
  const handleInterpretPrompt = async (rawPrompt?: string) => {
    const textToInterpret = rawPrompt || promptInput;
    if (!textToInterpret.trim() || textToInterpret.trim().length < 3) {
      setError("Please enter what you want to automate.");
      return;
    }

    setError(null);
    setIsInterpreting(true);
    try {
      const res = await apiClient.post("/automation/interpret-prompt", {
        prompt: textToInterpret.trim(),
        workspaceType,
      });

      if (res.data?.success && res.data.data) {
        const parsed = res.data.data;
        setDraftAutomation(parsed);
        // Sync to Visual Builder fields
        setBuilderName(parsed.name);
        setBuilderTriggerType(parsed.triggerType);
        setBuilderActionType(parsed.actionType);
        setBuilderMessage(parsed.actionConfig?.message || "");
        setBuilderScheduleTime(parsed.triggerConfig?.time || "09:00");

        setIsPreviewOpen(true);
      }
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
          err.message ||
          "Failed to interpret prompt. Please try a different wording."
      );
    } finally {
      setIsInterpreting(false);
    }
  };

  // Handle Saving Automation to Database
  const handleSaveAutomation = async () => {
    const payload = draftAutomation || {
      name: builderName || "New Workflow Automation",
      description: `Automated ${builderTriggerType} -> ${builderActionType}`,
      creationMode: mode,
      originalPrompt: promptInput || null,
      triggerType: builderTriggerType,
      triggerConfig: { time: builderScheduleTime },
      conditionConfig: {},
      actionType: builderActionType,
      actionConfig: { message: builderMessage || "Automation triggered" },
      workspaceId: workspaceId || null,
      status: "ACTIVE",
    };

    setIsSaving(true);
    setError(null);
    try {
      const res = await apiClient.post("/automation/create", payload);
      if (res.data?.success) {
        setIsPreviewOpen(false);
        setDraftAutomation(null);
        setPromptInput("");
        await fetchAutomations();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to save automation.");
    } finally {
      setIsSaving(false);
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
    } catch (e) {
      console.error("Failed to update status:", e);
    }
  };

  // View Execution Logs
  const handleViewLogs = async (id: string) => {
    setSelectedLogId(id);
    setIsLoadingLogs(true);
    try {
      const res = await apiClient.get(`/automation/${id}/logs`);
      if (res.data?.success) {
        setLogs(res.data.data);
      }
    } catch (e) {
      console.error("Failed to load logs:", e);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  /* ────────────────────────────────── Preview Sheet / Modal Content ────────────────────────────────── */
  const renderPreviewContent = () => (
    <div className="space-y-5 text-xs">
      {draftAutomation && (
        <>
          <div className="p-4 rounded-xl bg-gold/10 border border-gold/20 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-gold shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-foreground text-sm">{draftAutomation.name}</h4>
              <p className="text-muted-foreground text-xs mt-1 font-medium leading-relaxed">
                {draftAutomation.explanation}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-background border border-border space-y-1">
              <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                WHEN (TRIGGER)
              </span>
              <p className="font-bold text-foreground text-xs">{draftAutomation.triggerType}</p>
              {draftAutomation.triggerConfig?.time && (
                <p className="text-[11px] text-muted-foreground font-medium">
                  Scheduled at {draftAutomation.triggerConfig.time}
                </p>
              )}
            </div>

            <div className="p-3.5 rounded-xl bg-background border border-border space-y-1">
              <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                DO (ACTION)
              </span>
              <p className="font-bold text-foreground text-xs">{draftAutomation.actionType}</p>
              {draftAutomation.actionConfig?.message && (
                <p className="text-[11px] text-muted-foreground font-medium truncate">
                  "{draftAutomation.actionConfig.message}"
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderPreviewFooter = () => (
    <div className="flex items-center justify-between w-full">
      <button
        type="button"
        onClick={() => setIsPreviewOpen(false)}
        className="px-4 py-2.5 rounded-xl border border-border text-muted-foreground text-xs font-bold hover:bg-muted transition-colors"
      >
        Cancel
      </button>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setMode("VISUAL");
            setIsPreviewOpen(false);
          }}
          className="px-4 py-2.5 rounded-xl border border-border text-foreground text-xs font-bold hover:bg-muted transition-colors flex items-center gap-1.5"
        >
          <Edit3 className="w-3.5 h-3.5" /> Edit in Builder
        </button>
        <button
          type="button"
          onClick={handleSaveAutomation}
          disabled={isSaving}
          className="px-5 py-2.5 rounded-xl bg-gold hover:bg-gold-hover text-gold-foreground text-xs font-bold transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
        >
          {isSaving ? "Activating..." : "Activate Automation"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 p-4 sm:p-6 md:p-8">
      {/* ── Page Header ── */}
      <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              {workspaceType} workspace
            </span>
            <span className="px-2 py-0.5 rounded-full bg-gold/10 text-gold text-[10px] font-bold border border-gold/20">
              REAL SCHEDULER
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Workflow & Task Automation
          </h1>
          <p className="text-xs text-muted-foreground max-w-2xl font-medium">
            Create automated rules using natural-language AI prompts or the visual workflow builder.
            Automations execute on real server events and schedules.
          </p>
        </div>

        {/* Builder Mode Selector */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted border border-border shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setMode("PROMPT")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              mode === "PROMPT"
                ? "bg-card text-foreground shadow-xs border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-gold" /> Prompt Mode
          </button>
          <button
            type="button"
            onClick={() => setMode("VISUAL")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              mode === "VISUAL"
                ? "bg-card text-foreground shadow-xs border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-gold" /> Visual Builder
          </button>
        </div>
      </header>

      {/* ── Error Banner ── */}
      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2.5">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* ── MODE A: PROMPT-BASED AUTOMATION CREATION ── */}
      {mode === "PROMPT" && (
        <section className="space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-foreground">Create Automation with Prompt</h2>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">
                Describe what you want to automate in plain language.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <textarea
              rows={3}
              placeholder="e.g. Every weekday at 9 AM, remind me to review my priorities..."
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              className="w-full p-4 rounded-xl bg-background border border-border text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all"
            />

            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => handleInterpretPrompt()}
                disabled={isInterpreting || !promptInput.trim()}
                className="px-5 py-2.5 rounded-xl bg-gold hover:bg-gold-hover text-gold-foreground text-xs font-bold transition-all flex items-center gap-2 shadow-xs disabled:opacity-50"
              >
                {isInterpreting ? (
                  "Interpreting Workflow..."
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" /> Interpret & Create
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Supported Prompt Examples */}
          <div className="pt-3 border-t border-border/80">
            <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2.5">
              TRY SUPPORTED EXAMPLES (CLICK TO POPULATE)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SUPPORTED_EXAMPLES.map((example, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setPromptInput(example);
                    setError(null);
                  }}
                  className="p-2.5 rounded-xl border border-border/80 bg-muted/20 hover:bg-muted/50 hover:border-gold/50 text-left transition-all group"
                >
                  <p className="text-[11.5px] font-medium text-muted-foreground group-hover:text-foreground truncate">
                    "{example}"
                  </p>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── MODE B: VISUAL AUTOMATION BUILDER ── */}
      {mode === "VISUAL" && (
        <section className="space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm">
          <div>
            <h2 className="text-sm font-bold text-foreground">Visual Automation Builder</h2>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              Configure automation triggers, conditions, and actions visually.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase text-foreground mb-1.5">
                AUTOMATION NAME *
              </label>
              <input
                type="text"
                placeholder="e.g. Daily Standup Priority Alert"
                value={builderName}
                onChange={(e) => setBuilderName(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-background border border-border text-xs font-medium text-foreground focus:outline-none focus:border-gold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-foreground mb-1.5">
                TRIGGER TYPE (WHEN) *
              </label>
              <select
                value={builderTriggerType}
                onChange={(e) => setBuilderTriggerType(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-background border border-border text-xs font-medium text-foreground focus:outline-none focus:border-gold"
              >
                <option value="SCHEDULE">Every Day / Schedule (Cron)</option>
                <option value="TASK_ASSIGNED">When a Task is Assigned</option>
                <option value="TASK_ACCEPTED">When a Task is Accepted</option>
                <option value="TASK_COMPLETED">When a Task is Completed</option>
                <option value="TASK_OVERDUE">When a Task Becomes Overdue</option>
                <option value="PROGRESS_UPDATED">When Workspace Progress Updates</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-foreground mb-1.5">
                ACTION TYPE (DO) *
              </label>
              <select
                value={builderActionType}
                onChange={(e) => setBuilderActionType(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-background border border-border text-xs font-medium text-foreground focus:outline-none focus:border-gold"
              >
                <option value="NOTIFICATION">Send In-App Notification</option>
                <option value="TASK_UPDATE">Escalate Task Priority to High</option>
                <option value="SCHEDULER">Generate Progress Digest</option>
                <option value="PROGRESS_UPDATE">Recalculate Workspace Progress</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-foreground mb-1.5">
                ACTION MESSAGE / DETAILS
              </label>
              <input
                type="text"
                placeholder="e.g. Review daily priorities and focus tasks"
                value={builderMessage}
                onChange={(e) => setBuilderMessage(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-background border border-border text-xs font-medium text-foreground focus:outline-none focus:border-gold"
              />
            </div>
          </div>

          <div className="flex items-center justify-end pt-2">
            <button
              type="button"
              onClick={handleSaveAutomation}
              disabled={isSaving || !builderName.trim()}
              className="px-5 py-2.5 rounded-xl bg-gold hover:bg-gold-hover text-gold-foreground text-xs font-bold transition-all flex items-center gap-2 shadow-xs disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save & Activate Automation"}
            </button>
          </div>
        </section>
      )}

      {/* ── ACTIVE AUTOMATIONS LIST (DATABASE BACKED) ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Zap className="w-4 h-4 text-gold" /> Active Automations ({automations.length})
          </h2>
          <span className="text-xs text-muted-foreground font-medium">
            Stored in DB • Server Scheduler Active
          </span>
        </div>

        {automations.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-dashed border-border bg-card">
            <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-xs font-bold text-foreground">No Automations Created Yet</p>
            <p className="text-[11px] text-muted-foreground mt-1 max-w-sm mx-auto font-medium">
              Use Prompt Mode or Visual Builder above to create your first server-side automation rule.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
            {automations.map((item) => (
              <article
                key={item.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/20 transition-colors"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-foreground truncate">{item.name}</h3>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        item.status === "ACTIVE"
                          ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                          : "bg-muted text-muted-foreground border border-border"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground font-medium truncate">
                    {item.description || item.originalPrompt}
                  </p>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-medium pt-1">
                    <span>Runs: {item.runCount || 0}</span>
                    <span>•</span>
                    <span>Last: {item.lastRunAt ? new Date(item.lastRunAt).toLocaleTimeString() : "Never"}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(item.id, item.status)}
                    className="p-2 rounded-lg border border-border hover:bg-muted text-foreground transition-colors text-xs font-semibold flex items-center gap-1.5"
                  >
                    {item.status === "ACTIVE" ? (
                      <>
                        <Pause className="w-3.5 h-3.5 text-amber-500" /> Pause
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 text-emerald-500" /> Activate
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleViewLogs(item.id)}
                    className="p-2 rounded-lg border border-border hover:bg-muted text-foreground transition-colors text-xs font-semibold flex items-center gap-1.5"
                  >
                    <History className="w-3.5 h-3.5 text-gold" /> Logs
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* ── EXECUTION LOGS MODAL / SHEET ── */}
      {selectedLogId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border text-card-foreground rounded-2xl max-w-xl w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <History className="w-4 h-4 text-gold" /> Real Execution History Logs
              </h3>
              <button
                onClick={() => setSelectedLogId(null)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            {isLoadingLogs ? (
              <p className="text-xs text-muted-foreground font-medium py-4 text-center">Loading logs...</p>
            ) : logs.length === 0 ? (
              <p className="text-xs text-muted-foreground font-medium py-4 text-center">
                No execution events recorded yet.
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {logs.map((log) => (
                  <div key={log.id} className="p-3 rounded-xl bg-background border border-border text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold text-foreground">
                      <span>{log.triggeredBy}</span>
                      <span className="text-[10px] text-emerald-500 font-bold">{log.status}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-medium">
                      Executed at: {new Date(log.executedAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── AUTOMATION PREVIEW MODAL / BOTTOM SHEET ── */}
      {isMobile ? (
        <MobileSheet
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          title="Automation Preview"
          footerActions={renderPreviewFooter()}
        >
          {renderPreviewContent()}
        </MobileSheet>
      ) : (
        isPreviewOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-card border border-border text-card-foreground rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-gold" /> Automation Preview
                </h3>
                <button
                  onClick={() => setIsPreviewOpen(false)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              </div>

              {renderPreviewContent()}

              <div className="border-t border-border pt-4">{renderPreviewFooter()}</div>
            </div>
          </div>
        )
      )}
    </div>
  );
}
