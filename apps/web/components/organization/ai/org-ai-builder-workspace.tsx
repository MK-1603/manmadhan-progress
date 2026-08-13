"use client";

import { useState } from "react";
import { Send, CheckCircle2, ArrowRight, AlertCircle, Building } from "lucide-react";
import apiClient from "@/lib/api-client";

export function OrgAIBuilderWorkspace() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleCommand = async (cmd?: string) => {
    const text = cmd || input;
    if (!text.trim()) return;

    setError(null);
    setResult(null);
    setLoading(true);

    try {
      const lower = text.toLowerCase();
      if (lower.includes("task") || lower.includes("assign")) {
        setResult({
          type: "ORGANIZATION TASK",
          title: "Organization Task Mandate",
          description: text,
          explanation: "Parsed organization task assignment for immediate dispatch.",
          details: { Priority: "High", ApprovalRequired: "Yes", Status: "ASSIGNED" },
          payload: { title: text.slice(0, 40), description: text, priority: "High" },
        });
      } else {
        setResult({
          type: "ORGANIZATION PROJECT",
          title: "Project Milestone Plan",
          description: text,
          explanation: "Structured organization project blueprint.",
          details: { TargetDeadline: "30 Days", Milestones: 4, ApprovalRequired: "CEO / CO-CEO" },
          payload: { name: text.slice(0, 40), description: text, status: "Planning" },
        });
      }
    } catch (e: any) {
      setError("Failed to interpret organization command.");
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!result) return;
    setLoading(true);
    try {
      if (result.type === "ORGANIZATION TASK") {
        await apiClient.post("/org/tasks/create", result.payload);
        setSuccess("Organization Task Created Successfully!");
      } else {
        await apiClient.post("/org/projects", result.payload);
        setSuccess("Organization Project Created Successfully!");
      }
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || "Failed to execute organization command.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6 md:p-8">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">AI Builder</h1>
            <span className="px-2 py-0.5 rounded-md bg-gold/10 text-gold text-[10px] font-bold uppercase tracking-wider border border-gold/20 flex items-center gap-1">
              <Building className="w-3 h-3" /> Organization Workspace
            </span>
          </div>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">
            Command workspace for organizational projects, tasks, and team execution.
          </p>
        </div>
      </header>

      <section className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-xs">
        <div>
          <label className="block text-xs font-bold text-foreground mb-1">
            What organization mandate do you want to issue?
          </label>
          <p className="text-[11.5px] text-muted-foreground font-medium">
            Describe a project, task assignment, or team milestone.
          </p>
        </div>

        <div className="relative">
          <textarea
            rows={3}
            placeholder="e.g. Assign a high-priority task for backend API testing by Friday..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full p-4 pr-12 rounded-xl bg-background border border-border text-xs font-medium text-foreground focus:outline-none focus:border-gold"
          />
          <button
            type="button"
            onClick={() => handleCommand()}
            disabled={loading || !input.trim()}
            className="absolute right-3 bottom-3 p-2 rounded-lg bg-gold hover:bg-gold-hover text-gold-foreground transition-all disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </section>

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs flex items-center gap-2 font-bold">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {success}
        </div>
      )}

      {result && !loading && (
        <section className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-sm font-bold text-foreground">{result.title}</h3>
            <span className="text-[10px] font-bold uppercase text-gold px-2 py-0.5 bg-gold/10 rounded-md">
              {result.type}
            </span>
          </div>

          <p className="text-xs text-muted-foreground font-medium">{result.explanation}</p>

          <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-background border border-border">
            {Object.entries(result.details).map(([k, v]) => (
              <div key={k}>
                <span className="text-[10px] uppercase font-bold text-muted-foreground">{k}</span>
                <p className="text-xs font-bold text-foreground">{String(v)}</p>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setResult(null)}
              className="px-4 py-2 rounded-xl border border-border text-xs font-bold text-muted-foreground"
            >
              Discard
            </button>
            <button
              onClick={handleExecute}
              className="px-5 py-2 rounded-xl bg-gold text-gold-foreground font-bold text-xs flex items-center gap-1.5"
            >
              Confirm & Dispatch <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
