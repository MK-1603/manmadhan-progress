"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FolderKanban, Sparkles, LayoutTemplate, Sliders, ArrowLeft, Shield,
  Layers, CheckCircle2, ChevronRight, UserCheck, Users, Calendar, Flag,
  AlertCircle, Loader2
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { PROJECT_TEMPLATES, ProjectTemplate, BlueprintMilestone } from "./templates-data";
import { PromptMode } from "./prompt-mode";
import { TemplateMode } from "./template-mode";
import { ManualMode } from "./manual-mode";
import { BlueprintEditor } from "./blueprint-editor";
import { BlueprintReview } from "./blueprint-review";

export interface ProjectCreationWorkspaceProps {
  userRole: "CEO" | "CO-CEO" | string;
  basePath: string;
}

type Mode = "PROMPT" | "TEMPLATE" | "MANUAL";
type Stage = "CONFIG" | "BLUEPRINT" | "REVIEW";

interface MemberOption {
  id: string;
  name: string;
  email: string;
  role: string;
}

export function ProjectCreationWorkspace({ userRole, basePath }: ProjectCreationWorkspaceProps) {
  const router = useRouter();

  // Mode & Stage
  const [mode, setMode] = useState<Mode>("PROMPT");
  const [stage, setStage] = useState<Stage>("CONFIG");

  // Core Metadata State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"Critical" | "High" | "Medium" | "Low">("High");
  const [deadline, setDeadline] = useState("");
  const [promptText, setPromptText] = useState("");

  // Role Assignments
  const [selectedCoCeoId, setSelectedCoCeoId] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [coCeoList, setCoCeoList] = useState<MemberOption[]>([]);
  const [memberList, setMemberList] = useState<MemberOption[]>([]);

  // Blueprint Data
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("software-product");
  const [milestones, setMilestones] = useState<BlueprintMilestone[]>(PROJECT_TEMPLATES[0].milestones);
  const [githubUrl, setGithubUrl] = useState("");
  const [toolsText, setToolsText] = useState("");

  // Loading & Submission State
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch Eligible Assignees (CO-CEOs & Members)
  const fetchEligibleAssignees = useCallback(async () => {
    try {
      const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : undefined;
      const res = await apiClient.get(`/org/projects/eligible-assignees${wsId ? `?workspaceId=${wsId}` : ""}`);
      if (res.data?.success && res.data?.data) {
        const coCeos = res.data.data.coCeos || [];
        const members = res.data.data.members || [];
        const all = res.data.data.all || [];

        setCoCeoList(
          coCeos.map((c: any) => ({
            id: c.id || c.userId,
            name: c.name || c.displayName || c.email,
            email: c.email,
            role: "CO-CEO",
          }))
        );

        setMemberList(
          all.map((m: any) => ({
            id: m.id || m.userId,
            name: m.name || m.displayName || m.email,
            email: m.email,
            role: m.role || "MEMBER",
          }))
        );
      }
    } catch (_err) {}
  }, []);

  useEffect(() => {
    fetchEligibleAssignees();
  }, [fetchEligibleAssignees]);

  // Handler: Generate Blueprint from Prompt via AI API
  const handleGenerateFromPrompt = async () => {
    if (!promptText.trim()) return;
    setIsGenerating(true);
    setError(null);
    try {
      const res = await apiClient.post("/org/projects/plan-from-prompt", {
        prompt: promptText.trim(),
      });

      if (res.data?.success && res.data?.data) {
        const plan = res.data.data;
        setTitle(plan.title || title || "AI Generated Organization Project");
        setDescription(plan.mandate || plan.objective || promptText);
        if (plan.priority) setPriority(plan.priority);
        if (plan.deadline) setDeadline(plan.deadline);

        // If backend returned custom milestones, use them; otherwise set default software milestones
        if (Array.isArray(plan.milestones) && plan.milestones.length > 0) {
          setMilestones(
            plan.milestones.map((m: any, idx: number) => ({
              id: `m-prompt-${idx}`,
              stageNumber: idx + 1,
              name: m.name || `Phase ${idx + 1}`,
              description: m.description || "",
              deliverables: m.deliverables || ["Phase Verification"],
              tasks: Array.isArray(m.tasks)
                ? m.tasks.map((t: any, tidx: number) => ({
                    id: `t-prompt-${idx}-${tidx}`,
                    title: typeof t === "string" ? t : t.title || "Action Item",
                    description: t.description || "",
                    priority: t.priority || "Medium",
                    assigneeRole: "EXECUTION_LEAD",
                  }))
                : [],
            }))
          );
        } else {
          setMilestones(PROJECT_TEMPLATES[0].milestones);
        }

        setStage("BLUEPRINT");
      } else {
        setError(res.data?.error || "Failed to generate project blueprint.");
      }
    } catch (err: any) {
      // Fallback: local parser if API returns error
      const firstLine = promptText.trim().split("\n")[0].substring(0, 50);
      setTitle(title || firstLine || "New Organization Project");
      setDescription(promptText);
      setMilestones(PROJECT_TEMPLATES[0].milestones);
      setStage("BLUEPRINT");
    } finally {
      setIsGenerating(false);
    }
  };

  // Handler: Select Template
  const handleSelectTemplate = (template: ProjectTemplate) => {
    setSelectedTemplateId(template.id);
    setTitle(template.title);
    setDescription(template.description);
    setPriority(template.recommendedPriority);
    setMilestones(template.milestones);
    setToolsText(template.tools.join(", "));
    setStage("BLUEPRINT");
  };

  // Handler: Manual Mode Proceed
  const handleManualProceed = () => {
    if (!title.trim()) {
      setError("Please specify a project title.");
      return;
    }
    setError(null);
    setMilestones(PROJECT_TEMPLATES[6].milestones); // Custom template
    setStage("BLUEPRINT");
  };

  // Handler: Final Launch Creation Request
  const handleConfirmLaunch = async () => {
    if (!title.trim()) {
      setError("Project title is required.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const idempotencyKey = `create-proj-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        mandate: description.trim() || null,
        priority,
        deadline: deadline || null,
        responsibleCoCeoId: selectedCoCeoId || null,
        assignedToUserId: selectedCoCeoId || null,
        memberUserIds: selectedMemberIds,
        assignmentType: "CEO_TO_CO_CEO",
        customMilestones: milestones,
        githubUrl: githubUrl || null,
        toolsText: toolsText || null,
        idempotencyKey,
      };

      const res = await apiClient.post("/org/projects/create-v2", payload);

      if (res.data?.success) {
        const newProjId = res.data.data?.id || res.data.data?.projectId;
        if (newProjId) {
          router.push(`${basePath}/projects/${newProjId}`);
        } else {
          router.push(`${basePath}/projects`);
        }
      } else {
        setError(res.data?.error || "Failed to create organization project.");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to persist project database records.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full h-full min-h-screen bg-background text-foreground font-sans flex flex-col overflow-y-auto pb-24 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      {/* ── STICKY TOP WORKSPACE HEADER ────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-card border-b border-border px-4 sm:px-6 py-3 shrink-0 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`${basePath}/projects`}
              className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Back to Projects"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-amber-600 dark:text-gold" />
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground">Project Creation Workspace</h1>
              </div>
              <p className="text-[11px] text-muted-foreground">Prompt-driven & template-driven executive project builder.</p>
            </div>
          </div>

          {/* Role & Ownership Badge */}
          <div className="flex items-center gap-2 text-xs">
            <div className="px-3 py-1 rounded-xl bg-muted border border-border text-muted-foreground flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-amber-600 dark:text-gold" />
              <span>Project Owner: <strong className="text-foreground font-bold">CEO 🔒</strong></span>
              <span className="text-border">|</span>
              <span>Created By: <strong className="text-amber-600 dark:text-gold font-bold">{userRole === "CO-CEO" ? "You (CO-CEO)" : "You (CEO)"}</strong></span>
            </div>
          </div>
        </div>
      </header>

      {/* ── MAIN WORKSPACE CONTENT CONTAINER ───────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 pb-28">
        
        {/* ── LEFT COLUMN: CREATION CONFIGURATION & BLUEPRINT BUILDER (8 Cols) ───── */}
        <div className="lg:col-span-8 space-y-5">
          
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Creation Mode Segmented Tabs */}
          {stage === "CONFIG" && (
            <div className="p-1 rounded-xl bg-muted border border-border grid grid-cols-3 gap-1">
              <button
                type="button"
                onClick={() => setMode("PROMPT")}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  mode === "PROMPT"
                    ? "bg-card text-foreground shadow-xs border border-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-gold" /> Prompt Based
              </button>

              <button
                type="button"
                onClick={() => setMode("TEMPLATE")}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  mode === "TEMPLATE"
                    ? "bg-card text-foreground shadow-xs border border-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LayoutTemplate className="w-3.5 h-3.5 text-blue-500" /> Template Based
              </button>

              <button
                type="button"
                onClick={() => setMode("MANUAL")}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  mode === "MANUAL"
                    ? "bg-card text-foreground shadow-xs border border-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Sliders className="w-3.5 h-3.5 text-purple-500" /> Manual Setup
              </button>
            </div>
          )}

          {/* Mode Views */}
          {stage === "CONFIG" && (
            <div className="p-5 rounded-2xl bg-card border border-border shadow-xs space-y-4">
              {mode === "PROMPT" && (
                <PromptMode
                  promptText={promptText}
                  setPromptText={setPromptText}
                  isGenerating={isGenerating}
                  onGenerateBlueprint={handleGenerateFromPrompt}
                />
              )}

              {mode === "TEMPLATE" && (
                <TemplateMode
                  selectedTemplateId={selectedTemplateId}
                  onSelectTemplate={handleSelectTemplate}
                />
              )}

              {mode === "MANUAL" && (
                <div className="space-y-4">
                  <ManualMode
                    title={title}
                    setTitle={setTitle}
                    description={description}
                    setDescription={setDescription}
                    priority={priority}
                    setPriority={setPriority}
                    deadline={deadline}
                    setDeadline={setDeadline}
                    githubUrl={githubUrl}
                    setGithubUrl={setGithubUrl}
                    toolsText={toolsText}
                    setToolsText={setToolsText}
                  />

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleManualProceed}
                      className="px-6 h-[40px] rounded-xl bg-amber-500 hover:bg-amber-600 text-white dark:bg-gold dark:hover:bg-gold/90 dark:text-black font-bold text-xs cursor-pointer shadow-md flex items-center gap-1.5"
                    >
                      <span>Proceed to Blueprint</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Stage 2: Interactive Blueprint Builder */}
          {stage === "BLUEPRINT" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-amber-600 dark:text-gold" /> Step 2: Interactive Blueprint Customization
                </span>
                <button
                  type="button"
                  onClick={() => setStage("CONFIG")}
                  className="text-[11px] text-muted-foreground hover:text-foreground underline cursor-pointer"
                >
                  ← Back to Mode Setup
                </button>
              </div>

              <BlueprintEditor
                milestones={milestones}
                setMilestones={setMilestones}
                coCeoList={coCeoList}
                memberList={memberList}
                selectedCoCeoId={selectedCoCeoId}
                setSelectedCoCeoId={setSelectedCoCeoId}
                selectedMemberIds={selectedMemberIds}
                setSelectedMemberIds={setSelectedMemberIds}
                githubUrl={githubUrl}
                setGithubUrl={setGithubUrl}
                toolsText={toolsText}
                setToolsText={setToolsText}
              />

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setStage("REVIEW")}
                  className="px-6 h-[42px] rounded-xl bg-amber-500 hover:bg-amber-600 text-white dark:bg-gold dark:hover:bg-gold/90 dark:text-black font-bold text-xs transition-all cursor-pointer shadow-lg flex items-center gap-1.5"
                >
                  <span>Review & Confirm Launch</span>
                  <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            </div>
          )}

          {/* Stage 3: Final Pre-Flight Review */}
          {stage === "REVIEW" && (
            <BlueprintReview
              title={title}
              description={description}
              priority={priority}
              deadline={deadline}
              selectedCoCeoId={selectedCoCeoId}
              coCeoList={coCeoList}
              selectedMemberIds={selectedMemberIds}
              memberList={memberList}
              milestones={milestones}
              githubUrl={githubUrl}
              toolsText={toolsText}
              isSubmitting={isSubmitting}
              onEditBlueprint={() => setStage("BLUEPRINT")}
              onConfirmLaunch={handleConfirmLaunch}
              userRole={userRole}
            />
          )}

        </div>

        {/* ── RIGHT COLUMN: LIVE BLUEPRINT SUMMARY PREVIEW (4 Cols) ─────────────── */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-4 rounded-2xl bg-card border border-border shadow-xs space-y-3 sticky top-20">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-600 dark:text-gold" /> Blueprint Structure
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-secondary text-muted-foreground text-[10px] font-bold">
                {stage}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Project Title</span>
                <p className="font-bold text-foreground truncate">{title || "Untitled Project"}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Priority</span>
                  <p className="font-bold text-amber-600 dark:text-gold">{priority}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Deadline</span>
                  <p className="font-bold text-foreground">{deadline || "Flexible"}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-border space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Milestone Phases ({milestones.length})</span>
                <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                  {milestones.map((m, idx) => (
                    <div key={m.id || idx} className="p-2 bg-background rounded-lg border border-border text-[11px] flex items-center justify-between">
                      <span className="font-semibold text-foreground truncate">{m.name}</span>
                      <span className="text-[9.5px] font-mono text-muted-foreground">{m.tasks.length} tasks</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
