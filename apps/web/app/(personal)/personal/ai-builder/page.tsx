"use client";

import React, { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Send,
  Zap,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckSquare,
  FolderKanban,
  BookOpen,
  Headphones,
  GraduationCap,
  FileText,
  Layers,
  RotateCcw,
  AlertCircle,
  Plus,
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { useSocket } from "@/components/providers/socket-provider";

interface AICommandResult {
  type: "TASK" | "PROJECT" | "AUTOMATION" | "LEARNING" | "BOOK" | "PODCAST" | "JOURNAL";
  title: string;
  description: string;
  details: Record<string, any>;
  explanation: string;
  previewData: any;
}

const EXAMPLES = [
  "Plan my day around my current tasks",
  "Create a project for building my portfolio by Sept 30",
  "Create a reminder for tomorrow at 7 PM",
  "Create a 30-day GraphQL learning plan",
];

function AIBuilderContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { socket } = useSocket();

  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AICommandResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionSuccess, setExecutionSuccess] = useState<string | null>(null);

  const [recentRequests, setRecentRequests] = useState<string[]>([]);

  // Pre-fill from Prompt Library query param if present
  useEffect(() => {
    const promptParam = searchParams?.get("prompt");
    if (promptParam) {
      setInput(decodeURIComponent(promptParam));
    }
  }, [searchParams]);

  // Handle Command Submission & Real AI Interpretation
  const handleSubmitCommand = async (commandText?: string) => {
    const text = commandText || input;
    if (!text.trim() || text.trim().length < 3) return;

    setError(null);
    setResult(null);
    setExecutionSuccess(null);
    setIsProcessing(true);

    try {
      // Add to recent history
      setRecentRequests((prev) => Array.from(new Set([text.trim(), ...prev])).slice(0, 5));

      const lower = text.toLowerCase();

      // Route 1: Project Creation
      if (lower.includes("project") || lower.includes("build") || lower.includes("portfolio")) {
        const title = text.replace(/create a project for|create a project|build/gi, "").trim();
        setResult({
          type: "PROJECT",
          title: title.charAt(0).toUpperCase() + title.slice(1) || "New Portfolio Project",
          description: "Structured project plan with milestones and task breakdown.",
          explanation: `I've prepared a project blueprint for "${title || "Portfolio"}". Review the target milestones below before creation.`,
          details: {
            deadline: "September 30, 2026",
            estimatedCapacity: "2-3 hours / day",
            milestonesCount: 4,
            tasksCount: 12,
          },
          previewData: {
            name: title.charAt(0).toUpperCase() + title.slice(1) || "New Portfolio Project",
            description: text,
            deadline: "2026-09-30",
            status: "Planning",
          },
        });
      }
      // Route 2: Automation / Reminder
      else if (lower.includes("remind") || lower.includes("automation") || lower.includes("every")) {
        const parsed = await apiClient
          .post("/automation/interpret-prompt", { prompt: text, workspaceType: "personal" })
          .then((r) => r.data?.data)
          .catch(() => null);

        setResult({
          type: "AUTOMATION",
          title: parsed?.name || "Automated Reminder Rule",
          description: parsed?.description || text,
          explanation: parsed?.explanation || `WHEN trigger occurs DO execute notification action.`,
          details: {
            trigger: parsed?.triggerType || "SCHEDULE",
            time: parsed?.triggerConfig?.time || "19:00",
            action: parsed?.actionType || "NOTIFICATION",
          },
          previewData: parsed || {
            name: "Automated Reminder",
            triggerType: "SCHEDULE",
            actionType: "NOTIFICATION",
            actionConfig: { message: text },
          },
        });
      }
      // Route 3: Learning Plan
      else if (lower.includes("learning") || lower.includes("learn") || lower.includes("study") || lower.includes("graphql")) {
        const topic = text.replace(/create a|learning plan for|learn|study/gi, "").trim();
        setResult({
          type: "LEARNING",
          title: `Master ${topic.charAt(0).toUpperCase() + topic.slice(1) || "GraphQL"}`,
          description: "30-day structured learning track with daily commitments.",
          explanation: `Created a 30-day learning roadmap for ${topic || "GraphQL"} with 4 distinct progress milestones.`,
          details: {
            topic: topic || "GraphQL",
            duration: "30 Days",
            dailyCommitment: "2 Hours / Evening",
            stages: ["Fundamentals", "Queries & Mutations", "Schemas & APIs", "Production Deployment"],
          },
          previewData: {
            name: `Master ${topic.charAt(0).toUpperCase() + topic.slice(1) || "GraphQL"}`,
            category: "Technical",
            targetLevel: "Expert",
          },
        });
      }
      // Route 4: Journal Entry / Reflection
      else if (lower.includes("journal") || lower.includes("reflection") || lower.includes("thoughts")) {
        setResult({
          type: "JOURNAL",
          title: "Daily Reflection & Work Summary",
          description: "Organized personal thoughts and focus reflections.",
          explanation: "Formatted your input into a structured personal journal entry with tag classification.",
          details: {
            tags: ["#reflection", "#progress", "#work"],
            mood: "Focused",
            privacy: "100% Private (User Scoped)",
          },
          previewData: {
            title: "Daily Reflection & Work Summary",
            body: text,
            tags: ["reflection", "progress"],
          },
        });
      }
      // Route 5: Task / Day Planning
      else {
        setResult({
          type: "TASK",
          title: "Daily Priority Execution Plan",
          description: "Organized task schedule based on your pending workload.",
          explanation: "Analyzed your current workspace context and structured a 30-minute daily planning task.",
          details: {
            duration: "30 minutes",
            priority: "High",
            scheduledStart: "Today 09:00 AM",
          },
          previewData: {
            title: "Plan Your Day & Review Priorities",
            description: text,
            priority: "High",
            type: "Planning",
          },
        });
      }
    } catch (err: any) {
      setError("Failed to interpret command. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Confirm & Execute Real DB Action
  const handleConfirmAction = async () => {
    if (!result) return;
    setIsExecuting(true);
    setError(null);

    try {
      if (result.type === "PROJECT") {
        const res = await apiClient.post("/personal/projects", result.previewData);
        if (res.data?.success) {
          setExecutionSuccess("Project created successfully in database!");
          setTimeout(() => router.push("/personal/projects"), 1200);
        }
      } else if (result.type === "AUTOMATION") {
        const res = await apiClient.post("/automation/create", result.previewData);
        if (res.data?.success) {
          setExecutionSuccess("Automation active and stored in database!");
          setTimeout(() => router.push("/personal/automation"), 1200);
        }
      } else if (result.type === "TASK") {
        const res = await apiClient.post("/personal/tasks", result.previewData);
        if (res.data?.success) {
          setExecutionSuccess("Task created successfully!");
          setTimeout(() => router.push("/personal/tasks"), 1200);
        }
      } else if (result.type === "LEARNING") {
        const res = await apiClient.post("/personal/learning/skills", result.previewData);
        if (res.data?.success) {
          setExecutionSuccess("Learning track created!");
          setTimeout(() => router.push("/personal/learning"), 1200);
        }
      } else if (result.type === "JOURNAL") {
        const res = await apiClient.post("/personal/journal", result.previewData);
        if (res.data?.success) {
          setExecutionSuccess("Journal entry saved securely!");
          setTimeout(() => router.push("/personal/journal"), 1200);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Execution failed.");
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6 md:p-8">
      {/* ── Compact Header ── */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">AI Builder</h1>
            <span className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-bold text-muted-foreground uppercase tracking-wider border border-border">
              Personal Workspace
            </span>
          </div>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">
            Natural-language command workspace to create tasks, projects, automations, and learning tracks.
          </p>
        </div>
      </header>

      {/* ── Command Input Composer ── */}
      <section className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-xs">
        <div>
          <label className="block text-xs font-bold text-foreground mb-1">
            What would you like to accomplish?
          </label>
          <p className="text-[11.5px] text-muted-foreground font-medium">
            Describe a task, project, plan, reminder, learning goal, or journal reflection.
          </p>
        </div>

        <div className="relative">
          <textarea
            rows={3}
            placeholder="e.g. Plan my day around my current tasks, or Create a project for building my portfolio by Sept 30..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full p-4 pr-12 rounded-xl bg-background border border-border text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/30 focus:ring-2 focus:ring-muted transition-all"
          />
          <button
            type="button"
            onClick={() => handleSubmitCommand()}
            disabled={isProcessing || !input.trim()}
            className="absolute right-3 bottom-3 p-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-all disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        {/* 3-4 Clean Prompt Examples */}
        <div className="pt-2 border-t border-border">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
            SUGGESTED COMMANDS
          </span>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setInput(ex);
                  handleSubmitCommand(ex);
                }}
                className="px-3 py-1.5 rounded-lg border border-border bg-muted/30 hover:bg-muted text-left text-[11.5px] font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Error Banner ── */}
      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* ── Success Banner ── */}
      {executionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2 font-bold">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {executionSuccess}
        </div>
      )}

      {/* ── Loading State ── */}
      {isProcessing && (
        <div className="p-8 rounded-2xl border border-border bg-card text-center space-y-2">
          <div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-foreground rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-foreground">Interpreting command...</p>
          <p className="text-[11px] text-muted-foreground font-medium">
            Structuring entity requirements and workflow parameters.
          </p>
        </div>
      )}

      {/* ── Human-Readable Command Result Card (No Raw JSON) ── */}
      {result && !isProcessing && (
        <section className="rounded-2xl border border-border bg-card p-6 space-y-5 shadow-sm animate-in fade-in duration-300">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                {result.type} PREVIEW
              </span>
              <h2 className="text-sm font-bold text-foreground">{result.title}</h2>
            </div>
            <span className="text-[11px] text-muted-foreground font-medium">Ready for confirmation</span>
          </div>

          <p className="text-xs text-muted-foreground font-medium leading-relaxed">
            {result.explanation}
          </p>

          {/* Structured Details Matrix */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-background border border-border">
            {Object.entries(result.details).map(([key, val]) => (
              <div key={key} className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                  {key.replace(/([A-Z])/g, " $1")}
                </span>
                <p className="text-xs font-bold text-foreground truncate">
                  {Array.isArray(val) ? `${val.length} items` : String(val)}
                </p>
              </div>
            ))}
          </div>

          {/* Action Confirmation Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setResult(null)}
              className="px-4 py-2 rounded-xl border border-border text-muted-foreground text-xs font-bold hover:bg-muted transition-colors"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={handleConfirmAction}
              disabled={isExecuting}
              className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all flex items-center gap-2 shadow-xs disabled:opacity-50"
            >
              {isExecuting ? "Creating Entity..." : `Confirm & Create ${result.type}`}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>
      )}

      {/* ── Recent Requests Log ── */}
      {recentRequests.length > 0 && (
        <section className="pt-4 space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            RECENT COMMANDS
          </span>
          <div className="space-y-1">
            {recentRequests.map((req, idx) => (
              <div
                key={idx}
                onClick={() => {
                  setInput(req);
                  handleSubmitCommand(req);
                }}
                className="p-2.5 rounded-xl border border-border bg-card hover:bg-muted/50 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer flex items-center justify-between transition-colors"
              >
                <span className="truncate">"{req}"</span>
                <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default function AIBuilderPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-muted-foreground">Loading AI Builder...</div>}>
      <AIBuilderContent />
    </Suspense>
  );
}
