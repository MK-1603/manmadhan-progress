"use client";

import { useState } from "react";
import { ListPlus, Wand2, Loader2, AlertCircle, Trash2, Plus, CheckCircle2, User, Clock, Tag } from "lucide-react";
import apiClient from "@/lib/api-client";

interface GenerateTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  defaultProjectId?: string;
  defaultMilestoneId?: string;
}

export function GenerateTasksModal({
  isOpen,
  onClose,
  onCreated,
  defaultProjectId,
  defaultMilestoneId,
}: GenerateTasksModalProps) {
  const [step, setStep] = useState<"input" | "preview">("input");
  const [prompt, setPrompt] = useState("");
  const [contextType, setContextType] = useState<"Project" | "Milestone" | "Organization">("Project");
  
  const [planData, setPlanData] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleGeneratePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) {
      setError("Please describe the work to generate tasks.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      const res = await apiClient.post("/org/tasks/generate-plan-from-prompt", {
        workspaceId,
        prompt: prompt.trim(),
        projectId: defaultProjectId,
        milestoneId: defaultMilestoneId,
      });

      if (res.data.success) {
        setPlanData(res.data.data);
        setTasks(res.data.data.tasks || []);
        setMembers(res.data.data.members || []);
        setStep("preview");
      } else {
        setError(res.data.error || "Failed to generate task plan");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to generate task plan");
    } finally {
      setLoading(false);
    }
  };

  const handleTaskFieldChange = (index: number, field: string, value: any) => {
    const updated = [...tasks];
    updated[index] = { ...updated[index], [field]: value };
    setTasks(updated);
  };

  const handleRemoveTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const handleAddGeneratedTask = () => {
    setTasks([
      ...tasks,
      {
        tempId: String(Date.now()),
        title: "New Automated Execution Task",
        description: "Additional deliverable task",
        type: "Development",
        priority: "Medium",
        estimatedMinutes: 120,
        assigneeId: members[0]?.id || null,
        deadline: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      },
    ]);
  };

  const handleConfirmAndCreate = async () => {
    if (tasks.length === 0) {
      setError("At least one task is required to create a plan");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      const res = await apiClient.post("/org/tasks/create-from-plan", {
        workspaceId,
        tasks,
        projectId: defaultProjectId,
        milestoneId: defaultMilestoneId,
      });

      if (res.data.success) {
        onCreated();
        onClose();
        setStep("input");
        setPrompt("");
      } else {
        setError(res.data.error || "Failed to create tasks from plan");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to create tasks from plan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-3xl bg-card border border-border rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
              <ListPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground tracking-tight">
                {step === "input" ? "Automated Task Generation" : "Task Plan Preview"}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {step === "input"
                  ? "Describe the work and the system will create an execution task plan preview"
                  : `Review and refine ${tasks.length} generated tasks before confirming creation`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-xs font-semibold text-muted-foreground hover:text-foreground px-2 py-1"
          >
            Esc / Close
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          {step === "input" ? (
            <form onSubmit={handleGeneratePlan} className="space-y-4">
              {/* Context Selector */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                  Task Generation Context
                </label>
                <div className="flex items-center gap-2">
                  {(["Project", "Milestone", "Organization"] as const).map((ctx) => (
                    <button
                      key={ctx}
                      type="button"
                      onClick={() => setContextType(ctx)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                        contextType === ctx
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {ctx} Scope
                    </button>
                  ))}
                </div>
              </div>

              {/* Prompt Input Area */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Describe Work to Execute
                  </label>
                  <button
                    type="button"
                    onClick={() => setPrompt("Build authentication for the website. Create frontend and backend tasks, testing tasks, documentation tasks, and assign frontend work to Arun and backend work to Kumar. Complete everything by September 30.")}
                    className="text-[11px] text-primary hover:underline font-semibold"
                  >
                    Load Sample Prompt
                  </button>
                </div>
                <textarea
                  rows={5}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. Prepare all requirement documentation for ManMadhan Hub. Create PRD, TRD, application workflow, architecture document, and acceptance criteria..."
                  className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:border-primary outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setPrompt("Software Development Task Planner: Break down full stack web app into requirements, development, testing, and deployment tasks.")}
                  className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 font-medium"
                >
                  <Wand2 className="w-3.5 h-3.5 text-primary" /> Use Prompt Library Template
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl shadow-sm hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Generate Task Plan Preview &rarr;</>}
                </button>
              </div>
            </form>
          ) : (
            /* Step 2: Task Plan Preview */
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs text-muted-foreground font-semibold">
                  Source: <span className="text-foreground">Prompt Engine</span> &bull; {tasks.length} Generated Execution Tasks
                </span>
                <button
                  type="button"
                  onClick={handleAddGeneratedTask}
                  className="px-3 py-1.5 bg-primary/10 border border-primary/20 text-primary text-xs font-bold rounded-xl hover:bg-primary/20 transition-colors inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Task to Plan
                </button>
              </div>

              <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                {tasks.map((task, idx) => (
                  <div key={task.tempId || idx} className="p-3 bg-background border border-border rounded-xl space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={task.title}
                        onChange={(e) => handleTaskFieldChange(idx, "title", e.target.value)}
                        className="flex-1 px-2.5 py-1 bg-card border border-border rounded-lg text-xs font-bold text-foreground focus:border-primary outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveTask(idx)}
                        className="p-1 text-muted-foreground hover:text-rose-500 transition-colors shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div>
                        <label className="text-[9px] font-bold text-muted-foreground block uppercase">Type</label>
                        <select
                          value={task.type}
                          onChange={(e) => handleTaskFieldChange(idx, "type", e.target.value)}
                          className="w-full px-2 py-1 bg-card border border-border rounded-lg text-[11px] font-semibold text-foreground"
                        >
                          {["Development", "Documentation", "Research", "Review", "Task"].map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[9px] font-bold text-muted-foreground block uppercase">Priority</label>
                        <select
                          value={task.priority}
                          onChange={(e) => handleTaskFieldChange(idx, "priority", e.target.value)}
                          className="w-full px-2 py-1 bg-card border border-border rounded-lg text-[11px] font-semibold text-foreground"
                        >
                          {["Urgent", "High", "Medium", "Low"].map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[9px] font-bold text-muted-foreground block uppercase">Assignee</label>
                        <select
                          value={task.assigneeId || ""}
                          onChange={(e) => handleTaskFieldChange(idx, "assigneeId", e.target.value)}
                          className="w-full px-2 py-1 bg-card border border-border rounded-lg text-[11px] font-semibold text-foreground"
                        >
                          {members.map((m) => (
                            <option key={m.id} value={m.id}>{m.name || m.email}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[9px] font-bold text-muted-foreground block uppercase">Est. Minutes</label>
                        <input
                          type="number"
                          value={task.estimatedMinutes || 120}
                          onChange={(e) => handleTaskFieldChange(idx, "estimatedMinutes", Number(e.target.value))}
                          className="w-full px-2 py-1 bg-card border border-border rounded-lg text-[11px] font-mono text-foreground"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setStep("input")}
                  className="px-4 py-2 border border-border rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  &larr; Back to Prompt
                </button>

                <button
                  type="button"
                  onClick={handleConfirmAndCreate}
                  disabled={loading}
                  className="px-5 py-2 bg-emerald-500 text-black text-xs font-bold rounded-xl hover:bg-emerald-400 transition-colors inline-flex items-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> Confirm & Create {tasks.length} Tasks</>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
