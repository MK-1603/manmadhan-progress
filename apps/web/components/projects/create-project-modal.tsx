"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, ArrowRight, CheckCircle2, AlertCircle, Shield, Users, X, Lightbulb } from "lucide-react";
import apiClient from "@/lib/api-client";
import { useMediaQuery } from "@/hooks/use-media-query";
import { MobileSheet } from "@/components/ui/mobile-sheet";

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (project: any) => void;
  /** Pre-selects the CO-CEO assignee when opened from their profile page */
  defaultAssigneeId?: string | null;
  defaultAssigneeName?: string | null;
}

const PRESET_PROMPTS = [
  {
    title: "AI Grievance Management System",
    prompt: "Design and build an automated AI-driven grievance tracking and resolution portal with SLA escalation rules and real-time dashboard analytics.",
  },
  {
    title: "Real-Time Fleet Operations Engine",
    prompt: "Build an enterprise real-time dispatch and driver telemetry tracking system with WebSocket status updates and automated route optimization.",
  },
  {
    title: "Supply Chain & Inventory Portal",
    prompt: "Construct a multi-warehouse inventory management dashboard with purchase order tracking, low-stock predictive alerts, and audit logging.",
  },
  {
    title: "Customer Support AI Bot Engine",
    prompt: "Implement an omni-channel customer support agent with knowledge base ingestion, fallback agent handoff, and customer satisfaction metrics.",
  },
];

export function CreateProjectModal({
  isOpen,
  onClose,
  onSuccess,
  defaultAssigneeId = null,
  defaultAssigneeName = null,
}: CreateProjectModalProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");

  const [step, setStep] = useState<"PROMPT" | "ANALYSIS" | "CONFIRM">("PROMPT");
  const [prompt, setPrompt] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [assignmentType, setAssignmentType] = useState<"CEO_TO_CO_CEO" | "CEO_TO_MEMBER">("CEO_TO_CO_CEO");
  const [assignedToUserId, setAssignedToUserId] = useState(defaultAssigneeId || "");
  const [responsibleCoCeoId, setResponsibleCoCeoId] = useState("");

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    async function loadMembers() {
      try {
        const res = await apiClient.get("/organization/members");
        if (res.data?.data) {
          setMembers(res.data.data);
        }
      } catch (e) {
        console.error("Failed to load workspace members:", e);
      }
    }
    loadMembers();
  }, [isOpen]);

  if (!isOpen) return null;

  const coCeos = members.filter((m) => m.role === "CO-CEO");
  const memberUsers = members.filter((m) => m.role === "MEMBER" || m.role === "USER");

  const handleAnalyze = async () => {
    if (!prompt.trim() || prompt.trim().length < 5) {
      setError("Please provide a prompt describing your project mandate (min 5 characters).");
      return;
    }

    setError(null);
    setIsAnalyzing(true);
    try {
      const res = await apiClient.post("/org/projects/analyze", { prompt: prompt.trim() });
      if (res.data?.success && res.data.data) {
        setAnalysis(res.data.data);
        if (!title) setTitle(prompt.split(".")[0].slice(0, 50).trim());
        setStep("ANALYSIS");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to analyze project prompt.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCreateProject = async () => {
    if (!title.trim()) {
      setError("Project title is required.");
      return;
    }
    if (!assignedToUserId) {
      setError("Please select an assignee for this project.");
      return;
    }
    if (assignmentType === "CEO_TO_MEMBER" && !responsibleCoCeoId) {
      setError("Responsible CO-CEO selection is mandatory when assigning directly to a Member.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const res = await apiClient.post("/org/projects/create-v2", {
        title: title.trim(),
        description: description || prompt,
        deadline: deadline || null,
        assignedToUserId,
        assignmentType,
        responsibleCoCeoId: assignmentType === "CEO_TO_MEMBER" ? responsibleCoCeoId : null,
        prompt: prompt.trim(),
        analysisData: analysis,
      });

      if (res.data?.success) {
        onSuccess(res.data.data.project);
        onClose();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to create project.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectPreset = (preset: { title: string; prompt: string }) => {
    setTitle(preset.title);
    setPrompt(preset.prompt);
    setError(null);
  };

  /* ────────────────────────────────── Form Body Content ────────────────────────────────── */
  const renderModalBody = () => (
    <div className="space-y-5">
      {error && (
        <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {step === "PROMPT" && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">
              PROJECT TITLE *
            </label>
            <input
              type="text"
              placeholder="e.g. AI Grievance Management System"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl bg-background border border-border text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                ORIGINAL PROJECT PROMPT *
              </label>
              <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                <Lightbulb className="w-3.5 h-3.5 text-gold" /> Tap preset below
              </span>
            </div>
            <textarea
              rows={4}
              placeholder="Describe project goal, key features, technology stack and deadlines..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full p-3.5 rounded-xl bg-background border border-border text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all"
            />
          </div>

          {/* Preset Prompt Examples */}
          <div>
            <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
              PROMPT EXAMPLES & TEMPLATES
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRESET_PROMPTS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => selectPreset(preset)}
                  className="p-2.5 rounded-xl border border-border/80 bg-muted/20 hover:bg-muted/50 hover:border-gold/50 text-left transition-all group"
                >
                  <p className="text-[12px] font-bold text-foreground truncate group-hover:text-gold transition-colors">
                    {preset.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate font-medium mt-0.5">
                    {preset.prompt}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === "ANALYSIS" && analysis && (
        <div className="space-y-4 text-xs">
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/30 border border-border">
            <span className="font-bold text-foreground text-sm">{analysis.type}</span>
            <span className="px-2.5 py-1 rounded-full bg-gold/10 text-gold border border-gold/20 font-semibold text-[11px]">
              {analysis.complexity} Complexity
            </span>
          </div>

          <div>
            <h4 className="font-bold text-foreground uppercase tracking-wider text-[11px] mb-2">Detected Core Modules</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {analysis.coreFeatures?.map((f: string, i: number) => (
                <div key={i} className="flex items-center gap-2 text-foreground text-xs p-2.5 rounded-lg bg-background border border-border">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="font-medium truncate">{f}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-bold text-foreground uppercase tracking-wider text-[11px] mb-2">Mandatory Milestones</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {analysis.milestonePlan?.map((m: any) => (
                <div key={m.stageNumber} className="p-2.5 rounded-lg bg-background border border-border text-xs font-medium text-foreground truncate">
                  {m.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === "CONFIRM" && (
        <div className="space-y-4 text-xs">
          {!defaultAssigneeId && (
            <div>
              <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">
                ASSIGNMENT HIERARCHY
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => { setAssignmentType("CEO_TO_CO_CEO"); setAssignedToUserId(""); }}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    assignmentType === "CEO_TO_CO_CEO"
                      ? "border-gold bg-gold/5 ring-1 ring-gold/20"
                      : "border-border bg-background hover:bg-muted/20"
                  }`}
                >
                  <div className="font-bold text-foreground flex items-center gap-2 text-xs">
                    <Shield className="w-4 h-4 text-gold" /> CEO → CO-CEO
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => { setAssignmentType("CEO_TO_MEMBER"); setAssignedToUserId(""); }}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    assignmentType === "CEO_TO_MEMBER"
                      ? "border-gold bg-gold/5 ring-1 ring-gold/20"
                      : "border-border bg-background hover:bg-muted/20"
                  }`}
                >
                  <div className="font-bold text-foreground flex items-center gap-2 text-xs">
                    <Users className="w-4 h-4 text-muted-foreground" /> CEO → Member
                  </div>
                </button>
              </div>
            </div>
          )}

          {defaultAssigneeId ? (
            <div>
              <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">
                ASSIGN TO CO-CEO
              </label>
              <div className="w-full h-11 px-3.5 rounded-xl bg-background border border-gold/40 text-xs font-bold text-foreground flex items-center justify-between">
                <span>{defaultAssigneeName || "CO-CEO"}</span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  CO-CEO
                </span>
              </div>
            </div>
          ) : assignmentType === "CEO_TO_CO_CEO" ? (
            <div>
              <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">
                ASSIGN TO CO-CEO *
              </label>
              <select
                value={assignedToUserId}
                onChange={(e) => setAssignedToUserId(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-background border border-border text-xs font-medium text-foreground focus:outline-none focus:border-gold"
              >
                <option value="">Select CO-CEO...</option>
                {coCeos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || c.email} (CO-CEO)
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">
                  RESPONSIBLE CO-CEO *
                </label>
                <select
                  value={responsibleCoCeoId}
                  onChange={(e) => setResponsibleCoCeoId(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-background border border-border text-xs font-medium text-foreground focus:outline-none focus:border-gold"
                >
                  <option value="">Select CO-CEO...</option>
                  {coCeos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name || c.email}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">
                  TARGET MEMBER *
                </label>
                <select
                  value={assignedToUserId}
                  onChange={(e) => setAssignedToUserId(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-background border border-border text-xs font-medium text-foreground focus:outline-none focus:border-gold"
                >
                  <option value="">Select Member...</option>
                  {memberUsers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name || m.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">
              TARGET DEADLINE (OPTIONAL)
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl bg-background border border-border text-xs font-medium text-foreground focus:outline-none focus:border-gold"
            />
          </div>
        </div>
      )}
    </div>
  );

  /* ────────────────────────────────── Footer Actions ────────────────────────────────── */
  const renderFooterActions = () => (
    <div className="flex items-center justify-between w-full">
      {step === "PROMPT" ? (
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-border text-muted-foreground text-xs font-bold hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <div className="flex items-center gap-2">
            {defaultAssigneeId && title.trim() && (
              <button
                type="button"
                onClick={() => setStep("CONFIRM")}
                className="px-4 py-2.5 rounded-xl border border-border text-foreground text-xs font-bold hover:bg-muted transition-colors flex items-center gap-2"
              >
                Skip Analysis <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="px-5 py-2.5 rounded-xl bg-gold hover:bg-gold-hover text-gold-foreground text-xs font-bold transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              {isAnalyzing ? "Analyzing Mandate..." : "Analyze Project Mandate"}
            </button>
          </div>
        </>
      ) : step === "ANALYSIS" ? (
        <>
          <button
            type="button"
            onClick={() => setStep("PROMPT")}
            className="px-4 py-2.5 rounded-xl border border-border text-muted-foreground text-xs font-bold hover:bg-muted transition-colors"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => setStep("CONFIRM")}
            className="px-5 py-2.5 rounded-xl bg-gold hover:bg-gold-hover text-gold-foreground text-xs font-bold transition-all flex items-center gap-2"
          >
            Proceed to Assignment <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setStep(analysis ? "ANALYSIS" : "PROMPT")}
            className="px-4 py-2.5 rounded-xl border border-border text-muted-foreground text-xs font-bold hover:bg-muted transition-colors"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleCreateProject}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl bg-gold hover:bg-gold-hover text-gold-foreground text-xs font-bold transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            {isSubmitting ? "Creating Project..." : "Confirm & Launch Project"}
          </button>
        </>
      )}
    </div>
  );

  /* ──────────────────────── Mobile: iOS-Quality Bottom Sheet ──────────────────────── */
  if (isMobile) {
    return (
      <MobileSheet
        isOpen={isOpen}
        onClose={onClose}
        title="Create Organization Project"
        footerActions={renderFooterActions()}
      >
        {renderModalBody()}
      </MobileSheet>
    );
  }

  /* ──────────────────────── Desktop: Centered Dialog Modal ──────────────────────── */
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card border border-border text-card-foreground rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-gold shrink-0" />
            <div>
              <h2 className="text-lg font-bold text-foreground leading-tight">Create Organization Project</h2>
              <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                {defaultAssigneeName
                  ? `Assigning to ${defaultAssigneeName} (CO-CEO)`
                  : "Define the project you want to execute."}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">{renderModalBody()}</div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border shrink-0">{renderFooterActions()}</div>
      </div>
    </div>
  );
}
