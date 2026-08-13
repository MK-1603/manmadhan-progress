"use client";

import React, { useState, useEffect } from "react";
import { CheckSquare, X, Calendar, Clock, User, Shield, AlertCircle, FileText, CheckCircle2, Sparkles, Zap, Lightbulb } from "lucide-react";
import apiClient from "@/lib/api-client";
import { useMediaQuery } from "@/hooks/use-media-query";
import { MobileSheet } from "@/components/ui/mobile-sheet";

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (task: any) => void;
  defaultProjectId?: string | null;
  defaultMilestoneId?: string | null;
  /** Pre-selects and locks the assignee (e.g. when opened from a CO-CEO profile page) */
  defaultAssigneeId?: string | null;
  defaultAssigneeName?: string | null;
  defaultAssigneeRole?: string | null;
}

const TASK_PROMPT_EXAMPLES = [
  "Create a high-priority task to finish the portfolio homepage by Friday at 6 PM.",
  "Add a task to study GraphQL tomorrow from 7 PM to 9 PM.",
  "Create a task to review the project backend, due this Sunday.",
  "Add a task to prepare the weekly progress report every Friday.",
  "Create a task to test the production deployment and mark it high priority.",
];

const TASK_TYPES = [
  "Development", "Documentation", "Research", "Study", "Design",
  "Testing", "Planning", "Analysis", "Framework", "Writing",
  "Configuration", "Deployment", "Review", "Meeting", "Learning", "Other"
];

const PRIORITIES = ["Low", "Medium", "High", "Critical"];

export function CreateTaskModal({
  isOpen,
  onClose,
  onSuccess,
  defaultProjectId = null,
  defaultMilestoneId = null,
  defaultAssigneeId = null,
  defaultAssigneeName = null,
  defaultAssigneeRole = null,
}: CreateTaskModalProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");

  const [creationMode, setCreationMode] = useState<"MANUAL" | "PROMPT">("MANUAL");
  const [promptText, setPromptText] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("Development");
  const [priority, setPriority] = useState("Medium");
  const [assigneeId, setAssigneeId] = useState(defaultAssigneeId || "");
  const [projectId, setProjectId] = useState<string | null>(defaultProjectId);
  const [milestoneId, setMilestoneId] = useState<string | null>(defaultMilestoneId);
  const [deadline, setDeadline] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [approvalRequired, setApprovalRequired] = useState(false);
  const [verificationRequired, setVerificationRequired] = useState(false);
  const [deliverable, setDeliverable] = useState("");

  // Contextual Automation Checkbox
  const [enableAutomation, setEnableAutomation] = useState(false);

  const [members, setMembers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [availableMilestones, setAvailableMilestones] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    async function loadData() {
      try {
        const [memRes, projRes] = await Promise.all([
          apiClient.get("/organization/members").catch(() => ({ data: { data: [] } })),
          apiClient.get("/org/projects").catch(() => ({ data: { data: [] } })),
        ]);
        if (memRes.data?.data) setMembers(memRes.data.data);
        if (projRes.data?.data && Array.isArray(projRes.data.data)) setProjects(projRes.data.data);
      } catch (e) {
        console.error("Failed to load task creation data:", e);
      }
    }
    loadData();
  }, [isOpen]);

  useEffect(() => {
    if (!projectId) {
      setAvailableMilestones([]);
      setMilestoneId(null);
      return;
    }
    const foundProj = projects.find((p) => p.id === projectId);
    if (foundProj && Array.isArray(foundProj.milestones)) {
      setAvailableMilestones(foundProj.milestones);
    } else {
      setAvailableMilestones([]);
    }
  }, [projectId, projects]);

  if (!isOpen) return null;

  // Natural Language Task Prompt Parser
  const handleParsePrompt = () => {
    if (!promptText.trim() || promptText.trim().length < 5) {
      setError("Please provide a task prompt (min 5 characters).");
      return;
    }
    setError(null);
    const text = promptText.trim();
    const lower = text.toLowerCase();

    // Extract Title
    let parsedTitle = text.split("by")[0].split("due")[0].replace(/create a task|add a task|create task/gi, "").trim();
    if (parsedTitle.length > 0) {
      parsedTitle = parsedTitle.charAt(0).toUpperCase() + parsedTitle.slice(1);
    } else {
      parsedTitle = text.slice(0, 50);
    }

    // Extract Priority
    let parsedPriority = "Medium";
    if (lower.includes("high priority") || fontHas("high")) parsedPriority = "High";
    else if (lower.includes("critical")) parsedPriority = "Critical";

    setTitle(parsedTitle);
    setDescription(text);
    setPriority(parsedPriority);
    setCreationMode("MANUAL");
  };

  function fontHas(sub: string) {
    return promptText.toLowerCase().includes(sub);
  }

  const handleCreateTask = async () => {
    if (!title.trim()) {
      setError("Task title is required.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const res = await apiClient.post("/org/tasks/create", {
        title: title.trim(),
        description: description.trim() || title.trim(),
        type,
        priority,
        assigneeUserId: assigneeId || null,
        projectId: projectId || null,
        milestoneId: milestoneId || null,
        deadline: deadline || null,
        startTime: startTime || null,
        endTime: endTime || null,
        approvalRequired,
        verificationRequired,
        deliverable: deliverable || null,
      });

      if (res.data?.success) {
        // If contextual task automation was checked, create automation rule
        if (enableAutomation) {
          try {
            await apiClient.post("/automation/create", {
              name: `Automation for Task: ${title.trim().slice(0, 30)}`,
              description: `Auto-alert when task "${title.trim()}" becomes overdue.`,
              triggerType: "TASK_OVERDUE",
              actionType: "NOTIFICATION",
              actionConfig: { message: `Task "${title.trim()}" is overdue.` },
              status: "ACTIVE",
            });
          } catch (autoErr) {
            console.error("Contextual automation creation failed:", autoErr);
          }
        }

        onSuccess(res.data.data.task);
        onClose();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to create task.");
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ────────────────────────────────── Form Body ────────────────────────────────── */
  const renderFormBody = () => (
    <div className="space-y-4 text-xs">
      {error && (
        <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-2 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Mode Switcher */}
      <div className="flex items-center gap-2 p-1 rounded-xl bg-muted border border-border">
        <button
          type="button"
          onClick={() => setCreationMode("MANUAL")}
          className={`flex-1 py-1.5 rounded-lg font-bold text-xs transition-all ${
            creationMode === "MANUAL"
              ? "bg-card text-foreground shadow-xs border border-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Manual Form
        </button>
        <button
          type="button"
          onClick={() => setCreationMode("PROMPT")}
          className={`flex-1 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
            creationMode === "PROMPT"
              ? "bg-card text-foreground shadow-xs border border-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-gold" /> Create with Prompt
        </button>
      </div>

      {creationMode === "PROMPT" ? (
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-bold text-foreground uppercase tracking-wider mb-1.5">
              DESCRIBE TASK MANDATE *
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Create a high-priority task to finish the portfolio homepage by Friday at 6 PM..."
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              className="w-full p-3.5 rounded-xl bg-background border border-border text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-gold"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleParsePrompt}
              className="px-4 py-2 rounded-xl bg-gold text-gold-foreground font-bold text-xs hover:bg-gold-hover transition-all flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5" /> Interpret & Fill Form
            </button>
          </div>

          <div className="pt-2 border-t border-border">
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
              TASK PROMPT EXAMPLES (TAP TO POPULATE)
            </label>
            <div className="space-y-1.5">
              {TASK_PROMPT_EXAMPLES.map((ex, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setPromptText(ex);
                    setError(null);
                  }}
                  className="w-full p-2 rounded-lg border border-border/80 bg-muted/20 hover:bg-muted/50 text-left text-[11px] text-muted-foreground hover:text-foreground font-medium truncate transition-colors"
                >
                  "{ex}"
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase text-foreground mb-1">
              TASK TITLE *
            </label>
            <input
              type="text"
              placeholder="e.g. Build REST Authentication Engine"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-background border border-border text-xs font-medium text-foreground focus:outline-none focus:border-gold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase text-foreground mb-1">
                TASK TYPE
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-background border border-border text-xs font-medium text-foreground focus:outline-none focus:border-gold"
              >
                {TASK_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-foreground mb-1">
                PRIORITY
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-background border border-border text-xs font-medium text-foreground focus:outline-none focus:border-gold"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p} Priority
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-foreground mb-1">
              DESCRIPTION
            </label>
            <textarea
              rows={2}
              placeholder="Specify requirements and deliverables..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 rounded-xl bg-background border border-border text-xs font-medium text-foreground focus:outline-none focus:border-gold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase text-foreground mb-1">
                ASSIGNEE
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-background border border-border text-xs font-medium text-foreground focus:outline-none focus:border-gold"
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name || m.email} ({m.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-foreground mb-1">
                TARGET DEADLINE
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-background border border-border text-xs font-medium text-foreground focus:outline-none focus:border-gold"
              />
            </div>
          </div>

          {/* Contextual Automation Checkbox */}
          <div className="pt-2">
            <label className="flex items-center gap-2 p-3 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={enableAutomation}
                onChange={(e) => setEnableAutomation(e.target.checked)}
                className="w-4 h-4 rounded text-gold focus:ring-gold"
              />
              <div>
                <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-gold" /> Automate this Task
                </p>
                <p className="text-[10px] text-muted-foreground font-medium">
                  Automatically send a notification if this task becomes overdue.
                </p>
              </div>
            </label>
          </div>
        </div>
      )}
    </div>
  );

  const renderFooter = () => (
    <div className="flex items-center justify-between w-full">
      <button
        type="button"
        onClick={onClose}
        className="px-4 py-2 rounded-xl border border-border text-muted-foreground font-bold text-xs hover:bg-muted transition-colors"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={handleCreateTask}
        disabled={isSubmitting || !title.trim()}
        className="px-5 py-2 rounded-xl bg-gold text-gold-foreground font-bold text-xs hover:bg-gold-hover transition-all shadow-xs disabled:opacity-50"
      >
        {isSubmitting ? "Creating Task..." : "Create Task"}
      </button>
    </div>
  );

  if (isMobile) {
    return (
      <MobileSheet isOpen={isOpen} onClose={onClose} title="Create Task" footerActions={renderFooter()}>
        {renderFormBody()}
      </MobileSheet>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card border border-border text-card-foreground rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-gold" /> Create Task
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {renderFormBody()}

        <div className="border-t border-border pt-4">{renderFooter()}</div>
      </div>
    </div>
  );
}
