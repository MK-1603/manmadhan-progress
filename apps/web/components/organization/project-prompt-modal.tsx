"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, FolderKanban, Loader2, ChevronRight, AlertCircle, ShieldCheck, Plus, Trash2, Calendar, Flag } from "lucide-react";
import apiClient from "@/lib/api-client";
import { useRouter } from "next/navigation";

interface ProjectPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

type Step = "describe" | "plan" | "creating";

export function ProjectPromptModal({ isOpen, onClose, onCreated }: ProjectPromptModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("describe");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [plan, setPlan] = useState<any>(null);

  // Editable Plan Confirmation State (Step 2)
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editObjective, setEditObjective] = useState("");
  const [editScope, setEditScope] = useState("");
  const [editStartDate, setEditStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [editDeadline, setEditDeadline] = useState("");
  const [editPriority, setEditPriority] = useState("High");
  const [assigneeId, setAssigneeId] = useState("");
  const [milestones, setMilestones] = useState<any[]>([]);

  // Manual Milestone Addition State
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [newMsName, setNewMsName] = useState("");
  const [newMsDeadline, setNewMsDeadline] = useState("");

  const handleClose = () => {
    setStep("describe");
    setPrompt("");
    setPlan(null);
    setError("");
    setShowAddMilestone(false);
    onClose();
  };

  // Step 1 -> Step 2: Generate Project Plan Preview
  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError("");
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      const res = await apiClient.post("/org/projects/plan-from-prompt", { prompt, workspaceId });
      if (res.data.success) {
        const p = res.data.data;
        setPlan(p);
        setEditName(p.name || "New Project Mandate");
        setEditDescription(p.description || prompt);
        setEditObjective(p.objective || `Execute: ${p.name}`);
        setEditScope(p.scope || "Deliver core requirements specified in executive prompt.");
        setEditStartDate(new Date().toISOString().split("T")[0]);
        setEditDeadline(p.deadline ? new Date(p.deadline).toISOString().split("T")[0] : new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split("T")[0]);
        setEditPriority(p.priority || "High");
        setMilestones(p.milestones || []);
        if (p.assignmentOptions && p.assignmentOptions.length > 0) {
          setAssigneeId(p.assignmentOptions[0].id);
        }
        setStep("plan");
      } else {
        setError(res.data.error || "Unable to generate project plan preview");
      }
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || "Failed to generate project plan");
    } finally {
      setLoading(false);
    }
  };

  const handleAddManualMilestone = () => {
    if (!newMsName.trim()) return;
    const newMs = {
      name: newMsName.trim(),
      description: `Manual milestone phase`,
      deadline: newMsDeadline ? new Date(newMsDeadline).toISOString() : new Date(editDeadline || Date.now()).toISOString(),
      order: milestones.length,
    };
    setMilestones([...milestones, newMs]);
    setNewMsName("");
    setNewMsDeadline("");
    setShowAddMilestone(false);
  };

  const handleRemoveMilestone = (idx: number) => {
    setMilestones(milestones.filter((_, i) => i !== idx));
  };

  // Step 2 -> Step 3: Create Project & Open Requirement Analysis Workspace
  const handleCreate = async () => {
    setError("");

    // Date Validation: Start Date < Deadline
    if (new Date(editDeadline).getTime() <= new Date(editStartDate).getTime()) {
      setError("Project Start Date must be strictly earlier than Final Deadline");
      return;
    }

    setStep("creating");
    try {
      const workspaceId = localStorage.getItem("workspaceId");
      const res = await apiClient.post("/org/projects", {
        workspaceId,
        name: editName,
        description: editDescription,
        goal: editObjective,
        startDate: editStartDate,
        deadline: editDeadline,
        priority: editPriority,
        assigneeId: assigneeId || undefined,
        milestones,
      });

      if (res.data.success && res.data.data?.id) {
        const newProjId = res.data.data.id;
        onCreated();
        handleClose();
        // Redirect directly to Project Requirement Workspace
        router.push(`/ceo/projects/${newProjId}`);
      } else {
        throw new Error(res.data.error || "Failed to create project");
      }
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || "Failed to create project");
      setStep("plan");
    }
  };

  if (!isOpen) return null;

  // Calculate Duration
  const daysDuration = editStartDate && editDeadline
    ? Math.max(1, Math.round((new Date(editDeadline).getTime() - new Date(editStartDate).getTime()) / (1000 * 3600 * 24)))
    : 30;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-black/60"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 6 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col z-10"
        >
          {/* Executive Compact Header Bar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/10 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary">
                <FolderKanban className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  {step === "describe" && "Create Organization Project"}
                  {step === "plan" && "Review Project Mandate"}
                  {step === "creating" && "Creating Project..."}
                </h2>
                <p className="text-[11px] text-muted-foreground">
                  {step === "describe" && "Describe executive project scope & directives"}
                  {step === "plan" && "Review scope, dates, milestones, and assigned owner"}
                  {step === "creating" && "Setting up project requirement workspace..."}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {step === "describe" && (
              <div className="space-y-4 max-w-2xl mx-auto py-2">
                <div>
                  <label className="text-xs font-bold text-foreground block uppercase tracking-wider mb-2">
                    Describe Project Scope & Mandate
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g. Build the ManMadhan Hub website starting Aug 12 by September 30. Assign frontend to CO-CEO Arun and backend to Member Kumar."
                    rows={5}
                    className="w-full px-3.5 py-3 bg-background border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none resize-none transition-colors"
                  />
                </div>

                <div className="p-3 bg-muted/20 border border-border rounded-xl space-y-1.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Example Directives
                  </span>
                  {[
                    "Build the ManMadhan Hub website by September 30. Assign frontend to Arun and backend to Kumar.",
                    "Launch mobile client authentication workflow with security audit by Q3 end.",
                    "Redesign organization CEO executive dashboard with real-time focus control.",
                  ].map((ex) => (
                    <button
                      key={ex}
                      type="button"
                      onClick={() => setPrompt(ex)}
                      className="block w-full text-left text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 p-1.5 rounded-lg transition-colors"
                    >
                      • {ex}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === "plan" && plan && (
              <div className="space-y-4">
                {/* Executive Summary Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-3 bg-muted/20 border border-border rounded-xl text-xs">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase block font-medium">Start</span>
                    <span className="font-mono font-bold text-foreground">{editStartDate || "Today"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase block font-medium">Deadline</span>
                    <span className="font-mono font-bold text-foreground">{editDeadline || "Not Set"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase block font-medium">Duration</span>
                    <span className="font-mono font-bold text-primary">{daysDuration} Days</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase block font-medium">Priority</span>
                    <span className={`font-bold ${editPriority === "Urgent" ? "text-rose-500" : "text-amber-500"}`}>{editPriority}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase block font-medium">Milestones</span>
                    <span className="font-mono font-bold text-foreground">{milestones.length} Phases</span>
                  </div>
                </div>

                {/* 2-Column Desktop Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  {/* Left Column: Project Details & Scope */}
                  <div className="lg:col-span-7 space-y-3">
                    <div className="p-3.5 bg-muted/10 border border-border rounded-xl space-y-2.5">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Project Mandate Details
                      </h3>

                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Project Name</label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-bold text-foreground focus:border-primary outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Objective</label>
                        <input
                          type="text"
                          value={editObjective}
                          onChange={(e) => setEditObjective(e.target.value)}
                          className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground focus:border-primary outline-none"
                        />
                      </div>
                    </div>

                    {/* Scope & Deliverables */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="p-3 bg-muted/10 border border-border rounded-xl space-y-1">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Scope</span>
                        <p className="text-xs text-foreground leading-relaxed">{editScope}</p>
                      </div>
                      <div className="p-3 bg-muted/10 border border-border rounded-xl space-y-1">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Out of Scope</span>
                        <p className="text-xs text-muted-foreground leading-relaxed">{plan.outOfScope}</p>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Ownership, Dates & Milestones */}
                  <div className="lg:col-span-5 space-y-3">
                    {/* Ownership & Date Controls */}
                    <div className="p-3.5 border border-primary/30 bg-primary/5 rounded-xl space-y-2.5">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5" /> Executive Ownership & Dates
                      </h3>

                      <div>
                        <label className="text-[10px] font-bold text-foreground uppercase block mb-1">Project Owner</label>
                        <select
                          value={assigneeId}
                          onChange={(e) => setAssigneeId(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground focus:border-primary outline-none"
                        >
                          {plan.assignmentOptions?.map((m: any) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.role})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-foreground uppercase block mb-1">Start Date</label>
                          <input
                            type="date"
                            value={editStartDate}
                            onChange={(e) => setEditStartDate(e.target.value)}
                            className="w-full px-2 py-1 bg-background border border-border rounded-lg text-xs font-mono text-foreground focus:border-primary outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-foreground uppercase block mb-1">Deadline</label>
                          <input
                            type="date"
                            value={editDeadline}
                            onChange={(e) => setEditDeadline(e.target.value)}
                            className="w-full px-2 py-1 bg-background border border-border rounded-lg text-xs font-mono text-foreground focus:border-primary outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Milestones Section (Supports Manual & AI Creation) */}
                    <div className="p-3 border border-border bg-card rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1">
                          <Flag className="w-3.5 h-3.5 text-primary" /> Milestones ({milestones.length})
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowAddMilestone(true)}
                          className="px-2 py-0.5 bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold rounded hover:bg-primary/20 transition-colors flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Add Milestone
                        </button>
                      </div>

                      {/* Manual Add Milestone Form */}
                      {showAddMilestone && (
                        <div className="p-2.5 bg-muted/20 border border-border rounded-lg space-y-2 animate-in fade-in duration-150">
                          <input
                            type="text"
                            placeholder="Milestone Name..."
                            value={newMsName}
                            onChange={(e) => setNewMsName(e.target.value)}
                            className="w-full px-2 py-1 bg-background border border-border rounded text-xs text-foreground outline-none focus:border-primary"
                          />
                          <div className="flex items-center justify-between gap-2">
                            <input
                              type="date"
                              value={newMsDeadline}
                              onChange={(e) => setNewMsDeadline(e.target.value)}
                              className="px-2 py-1 bg-background border border-border rounded text-[11px] font-mono text-foreground"
                            />
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setShowAddMilestone(false)}
                                className="px-2 py-1 border border-border text-[10px] font-semibold rounded text-muted-foreground"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={handleAddManualMilestone}
                                className="px-2.5 py-1 bg-primary text-primary-foreground text-[10px] font-bold rounded"
                              >
                                Add
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Milestone List */}
                      <div className="space-y-1 max-h-[160px] overflow-y-auto pr-1">
                        {milestones.length === 0 ? (
                          <div className="text-center py-4 text-muted-foreground text-[11px]">
                            No milestones added yet. Click <span className="font-bold text-foreground">+ Add Milestone</span> above to create one.
                          </div>
                        ) : (
                          milestones.map((m: any, i: number) => (
                            <div key={i} className="flex items-center justify-between gap-2 p-1.5 bg-muted/10 border border-border rounded-lg text-xs">
                              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                <span className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[9px] font-bold flex items-center justify-center shrink-0">
                                  {i + 1}
                                </span>
                                <span className="font-semibold text-foreground truncate text-[11px]">{m.name}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveMilestone(i)}
                                className="text-muted-foreground hover:text-rose-500 p-0.5"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === "creating" && (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                <Loader2 className="w-7 h-7 animate-spin text-primary" />
                <div>
                  <p className="text-xs font-bold text-foreground">Creating project mandate...</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Opening Project Requirements Analysis workspace...</p>
                </div>
              </div>
            )}
          </div>

          {/* Sticky Action Footer Bar */}
          {(step === "describe" || step === "plan") && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-muted/10 shrink-0">
              <button
                type="button"
                onClick={step === "describe" ? handleClose : () => setStep("describe")}
                className="px-3.5 py-1.5 border border-border text-xs font-semibold text-foreground rounded-xl hover:bg-muted transition-colors"
              >
                {step === "describe" ? "Cancel" : "Back"}
              </button>
              <button
                type="button"
                onClick={step === "describe" ? handleGenerate : handleCreate}
                disabled={loading || (step === "describe" && !prompt.trim())}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating Plan...
                  </>
                ) : (
                  <>
                    {step === "describe" ? "Generate Plan" : "Create Project"}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
