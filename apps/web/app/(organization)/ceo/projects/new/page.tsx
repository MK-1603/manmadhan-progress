"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, ArrowRight, CheckCircle2, AlertCircle, Shield, FolderKanban, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api-client";

export default function NewProjectWizardPage() {
  const router = useRouter();
  const [step, setStep] = useState<"PROMPT" | "ANALYSIS" | "CONFIRM">("PROMPT");
  const [prompt, setPrompt] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [assignmentType, setAssignmentType] = useState<"CEO_TO_CO_CEO" | "CEO_TO_MEMBER">("CEO_TO_CO_CEO");
  const [assignedToUserId, setAssignedToUserId] = useState("");
  const [responsibleCoCeoId, setResponsibleCoCeoId] = useState("");
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    // Fetch members & CO-CEOs for assignment dropdowns
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
  }, []);

  const coCeos = members.filter(m => m.role === "CO-CEO");
  const memberUsers = members.filter(m => m.role === "MEMBER" || m.role === "USER");

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
        // Pre-fill title if empty
        if (!title) setTitle(extractTitle(prompt));
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
        prompt,
        analysisData: analysis,
      });

      if (res.data?.success) {
        router.push(`/ceo/projects`);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to create project.");
    } finally {
      setIsSubmitting(false);
    }
  };

  function extractTitle(p: string) {
    const clean = p.replace(/^(build|create|develop|launch)\s+/i, "");
    return clean.split(".")[0].slice(0, 50).trim();
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-border pb-5">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-gold" />
            Create Organization Project
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Prompt-Driven Project Analysis & 7-Stage Execution OS Pipeline
          </p>
        </div>

        {/* Wizard Steps */}
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className={`px-3 py-1.5 rounded-lg border ${step === "PROMPT" ? "bg-accent border-gold text-foreground" : "text-muted-foreground border-border"}`}>
            1. Prompt & Mandate
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
          <span className={`px-3 py-1.5 rounded-lg border ${step === "ANALYSIS" ? "bg-accent border-gold text-foreground" : "text-muted-foreground border-border"}`}>
            2. AI Analysis Review
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
          <span className={`px-3 py-1.5 rounded-lg border ${step === "CONFIRM" ? "bg-accent border-gold text-foreground" : "text-muted-foreground border-border"}`}>
            3. Assignment & Launch
          </span>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* STEP 1: PROMPT */}
      {step === "PROMPT" && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
          <div>
            <label className="block text-xs font-semibold text-foreground uppercase tracking-widest mb-2">
              Project Title
            </label>
            <input
              type="text"
              placeholder="e.g. AI Grievance Management Platform"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-11 px-4 rounded-xl bg-muted/50 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground uppercase tracking-widest mb-2">
              Project Prompt & Mandate Description
            </label>
            <textarea
              rows={5}
              placeholder="Describe what you want to build. e.g. Build an AI-driven Grievance Management System with student dashboard, CO-CEO routing, TRD/PRD documents, and GitHub PR verification by October 15..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full p-4 rounded-xl bg-muted/50 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="w-full py-3 rounded-xl bg-gold hover:bg-gold-hover text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
          >
            {isAnalyzing ? (
              <span>Analyzing Mandate & Generating Architecture...</span>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Analyze Project Mandate
              </>
            )}
          </button>
        </div>
      )}

      {/* STEP 2: ANALYSIS REVIEW */}
      {step === "ANALYSIS" && analysis && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gold">Analysis Result</span>
                <h2 className="text-lg font-bold text-foreground">{analysis.type}</h2>
              </div>
              <span className="px-3 py-1 rounded-full bg-gold/10 text-gold border border-gold/20 text-xs font-bold">
                {analysis.complexity} Complexity
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xs font-bold text-foreground uppercase tracking-widest mb-3">Core Features</h3>
                <ul className="space-y-1.5">
                  {analysis.coreFeatures?.map((f: string, i: number) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-xs font-bold text-foreground uppercase tracking-widest mb-3">Technical Stack Requirements</h3>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <p><strong className="text-foreground">Frontend:</strong> {analysis.technicalRequirements?.frontend?.join(", ")}</p>
                  <p><strong className="text-foreground">Backend:</strong> {analysis.technicalRequirements?.backend?.join(", ")}</p>
                  <p><strong className="text-foreground">Database:</strong> {analysis.technicalRequirements?.database?.join(", ")}</p>
                  <p><strong className="text-foreground">APIs:</strong> {analysis.technicalRequirements?.apis?.join(", ")}</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-foreground uppercase tracking-widest mb-3">7 Mandatory Milestone Stages</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {analysis.milestonePlan?.map((m: any) => (
                  <div key={m.stageNumber} className="p-3 rounded-xl bg-muted/40 border border-border text-xs">
                    <span className="text-[10px] font-bold text-gold">{m.name}</span>
                    <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{m.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setStep("PROMPT")}
              className="flex-1 py-3 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50"
            >
              Edit Mandate
            </button>
            <button
              onClick={() => setStep("CONFIRM")}
              className="flex-1 py-3 rounded-xl bg-gold hover:bg-gold-hover text-white text-xs font-bold flex items-center justify-center gap-2"
            >
              Proceed to Assignment
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: ASSIGNMENT & CONFIRMATION */}
      {step === "CONFIRM" && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-widest border-b border-border pb-3">
            Assignment Rules & Target Assignee
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-foreground uppercase tracking-widest mb-2">
                Assignment Hierarchy Mode
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setAssignmentType("CEO_TO_CO_CEO");
                    setAssignedToUserId("");
                  }}
                  className={`p-4 rounded-xl border text-left flex flex-col gap-1 ${assignmentType === "CEO_TO_CO_CEO" ? "border-gold bg-gold/5" : "border-border bg-muted/30"}`}
                >
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                    <Shield className="w-4 h-4 text-gold" />
                    CEO → CO-CEO
                  </div>
                  <span className="text-[11px] text-muted-foreground">Assign project leadership to a CO-CEO</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAssignmentType("CEO_TO_MEMBER");
                    setAssignedToUserId("");
                  }}
                  className={`p-4 rounded-xl border text-left flex flex-col gap-1 ${assignmentType === "CEO_TO_MEMBER" ? "border-gold bg-gold/5" : "border-border bg-muted/30"}`}
                >
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                    <Users className="w-4 h-4 text-purple-500" />
                    CEO → Responsible CO-CEO → Member
                  </div>
                  <span className="text-[11px] text-muted-foreground">Assign directly to a Member with a responsible CO-CEO</span>
                </button>
              </div>
            </div>

            {assignmentType === "CEO_TO_CO_CEO" ? (
              <div>
                <label className="block text-xs font-semibold text-foreground uppercase tracking-widest mb-2">
                  Assign To CO-CEO *
                </label>
                <select
                  value={assignedToUserId}
                  onChange={(e) => setAssignedToUserId(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl bg-muted/50 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select CO-CEO...</option>
                  {coCeos.map((c) => (
                    <option key={c.id} value={c.id}>{c.name || c.email} (CO-CEO)</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground uppercase tracking-widest mb-2">
                    Responsible CO-CEO *
                  </label>
                  <select
                    value={responsibleCoCeoId}
                    onChange={(e) => setResponsibleCoCeoId(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl bg-muted/50 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Select Responsible CO-CEO...</option>
                    {coCeos.map((c) => (
                      <option key={c.id} value={c.id}>{c.name || c.email} (CO-CEO)</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground uppercase tracking-widest mb-2">
                    Target Member *
                  </label>
                  <select
                    value={assignedToUserId}
                    onChange={(e) => setAssignedToUserId(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl bg-muted/50 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Select Member...</option>
                    {memberUsers.map((m) => (
                      <option key={m.id} value={m.id}>{m.name || m.email} (Member)</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-foreground uppercase tracking-widest mb-2">
                Target Deadline (Optional)
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full h-11 px-4 rounded-xl bg-muted/50 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4 border-t border-border">
            <button
              onClick={() => setStep("ANALYSIS")}
              className="flex-1 py-3 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50"
            >
              Back to Analysis
            </button>
            <button
              onClick={handleCreateProject}
              disabled={isSubmitting}
              className="flex-1 py-3 rounded-xl bg-gold hover:bg-gold-hover text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Launching Project & Issuing Assignment Request...</span>
              ) : (
                <>
                  <FolderKanban className="w-4 h-4" />
                  Confirm & Dispatch Project Assignment
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
