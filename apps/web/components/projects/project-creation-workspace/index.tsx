"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-context";
import apiClient from "@/lib/api-client";
import {
  ArrowLeft, Lock, AlertCircle, FileText,
  LayoutTemplate, Sliders, Layers, Check, AlertTriangle, ChevronRight
} from "lucide-react";

import { PromptMode } from "./prompt-mode";
import { TemplateMode } from "./template-mode";
import { ManualMode } from "./manual-mode";
import { BlueprintEditor, MemberOption } from "./blueprint-editor";
import { BlueprintReview } from "./blueprint-review";
import { PROJECT_TEMPLATES, ProjectTemplate } from "./templates-data";

interface ProjectCreationWorkspaceProps {
  userRole?: string;
  basePath?: string;
}

type CreationStage = "METHOD" | "ASSIGNMENT" | "REVIEW";
type CreationMode = "PROMPT" | "TEMPLATE" | "MANUAL";

export function ProjectCreationWorkspace({
  userRole: initialRole,
  basePath: initialBasePath,
}: ProjectCreationWorkspaceProps = {}) {
  const router = useRouter();
  const { user } = useAuth();

  const userRole = (initialRole || user?.role || "CEO").toUpperCase();
  const basePath = initialBasePath || (userRole === "CO-CEO" ? "/co-ceo" : "/ceo");

  // ── 1. GLOBAL STAGE & METHOD CONTROL ─────────────────────────────────────
  const [stage, setStage] = useState<CreationStage>("METHOD");
  const [mode, setMode] = useState<CreationMode | null>(null);
  const [pendingMode, setPendingMode] = useState<CreationMode | null>(null);

  // Substep per mode
  const [promptSubstep, setPromptSubstep] = useState<"DESCRIBE" | "UNDERSTAND" | "REFINE">("DESCRIBE");
  const [templateSubstep, setTemplateSubstep] = useState<"CHOOSE" | "CONFIGURE">("CHOOSE");
  const [manualSubstep, setManualSubstep] = useState<"INFORMATION" | "CONTROLS" | "REQUIREMENTS">("INFORMATION");

  // ── 2. NORMALIZED DRAFT STATE (INITIALIZED EMPTY — NO DEMO DEFAULTS!) ──────
  const [promptText, setPromptText] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState<"Critical" | "High" | "Medium" | "Low">("Medium");
  const [deadline, setDeadline] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [toolsText, setToolsText] = useState("");

  const [requirementsText, setRequirementsText] = useState("");
  const [deliverablesText, setDeliverablesText] = useState("");
  const [successCriteriaText, setSuccessCriteriaText] = useState("");

  const [requirements, setRequirements] = useState<string[]>([]);
  const [deliverables, setDeliverables] = useState<string[]>([]);
  const [successCriteria, setSuccessCriteria] = useState<string[]>([]);

  // ── 3. ASSIGNMENT STATE (INITIALIZED UNASSIGNED!) ──────────────────────────
  const [selectedCoCeoId, setSelectedCoCeoId] = useState("");
  const [selectedExecutionLeadId, setSelectedExecutionLeadId] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [requirementAssignees, setRequirementAssignees] = useState<Record<string, string>>({});

  // ── 4. UI / SUBMISSION / SUCCESS OVERLAY STATES ───────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);

  // ── 5. ORGANIZATION DATA (REAL API DATA) ──────────────────────────────────
  const [coCeoList, setCoCeoList] = useState<MemberOption[]>([]);
  const [memberList, setMemberList] = useState<MemberOption[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  // Fetch real assignees on mount
  useEffect(() => {
    async function fetchAssignees() {
      setLoadingMembers(true);
      try {
        const res = await apiClient.get("/org/projects/eligible-assignees");
        if (Array.isArray(res.data?.coCeos)) setCoCeoList(res.data.coCeos);
        if (Array.isArray(res.data?.members)) setMemberList(res.data.members);
      } catch (err) {
        console.warn("Failed to fetch assignees:", err);
      } finally {
        setLoadingMembers(false);
      }
    }
    fetchAssignees();
  }, []);

  // Clean Draft Reset Helper
  const resetDraft = useCallback(() => {
    setPromptText("");
    setSelectedTemplateId("");
    setTitle("");
    setDescription("");
    setCategory("");
    setPriority("Medium");
    setDeadline("");
    setGithubUrl("");
    setToolsText("");
    setRequirementsText("");
    setDeliverablesText("");
    setSuccessCriteriaText("");
    setRequirements([]);
    setDeliverables([]);
    setSuccessCriteria([]);
  }, []);

  // Handle Mode Change with Confirmation Dialog if Dirty
  const handleRequestModeChange = (targetMode: CreationMode) => {
    if (targetMode === mode) return;
    const isDirty = !!(title || promptText || requirements.length > 0);
    if (isDirty) {
      setPendingMode(targetMode);
    } else {
      setMode(targetMode);
      if (targetMode === "PROMPT") setPromptSubstep("DESCRIBE");
      if (targetMode === "TEMPLATE") setTemplateSubstep("CHOOSE");
      if (targetMode === "MANUAL") setManualSubstep("INFORMATION");
    }
  };

  const handleConfirmModeSwitch = () => {
    if (pendingMode) {
      resetDraft();
      setMode(pendingMode);
      setPendingMode(null);
      if (pendingMode === "PROMPT") setPromptSubstep("DESCRIBE");
      if (pendingMode === "TEMPLATE") setTemplateSubstep("CHOOSE");
      if (pendingMode === "MANUAL") setManualSubstep("INFORMATION");
    }
  };

  // Selected Names Derived from Real State
  const selectedCoCeoName = useMemo(() => {
    const found = coCeoList.find((c) => c.id === selectedCoCeoId);
    return found ? found.name : "Not assigned";
  }, [coCeoList, selectedCoCeoId]);

  const selectedExecutionLeadName = useMemo(() => {
    const found = memberList.find((m) => m.id === selectedExecutionLeadId);
    return found ? found.name : "Not assigned";
  }, [memberList, selectedExecutionLeadId]);

  // Handle Template Selection (Populates structure only, NEVER people!)
  const handleSelectTemplate = (template: ProjectTemplate) => {
    setSelectedTemplateId(template.id);
    setTitle(template.title);
    setDescription(template.subtitle);
    setCategory(template.category);
    setToolsText(template.tools.join(", "));
    setRequirements(template.documents);
  };

  // Central Draft Validation
  const validateDraft = (): string | null => {
    if (!title.trim()) return "Project title is required.";
    if (!description.trim()) return "Project objective/description is required.";
    return null;
  };

  // Handle Confirm Launch API Submission
  const handleConfirmLaunch = async () => {
    const validationError = validateDraft();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Clean payload structure matching backend /create-v2 request contract exactly
      const payload = {
        title: title.trim(),
        name: title.trim(),
        description: description.trim(),
        mandate: description.trim(),
        category: category.trim() || "General",
        priority,
        deadline: deadline || null,
        githubUrl: githubUrl.trim() || null,
        toolsText: toolsText.trim() || null,
        requirements,
        deliverables,
        successCriteria,
        creationMode: mode || "MANUAL",

        // Execution Leads (Independent — NO FALLBACK!)
        responsibleCoCeoId: selectedCoCeoId || null,
        coCeoInChargeId: selectedCoCeoId || null,
        assignedToUserId: selectedExecutionLeadId || null,
        executionLeadId: selectedExecutionLeadId || null,
        memberUserIds: selectedMemberIds,
        memberIds: selectedMemberIds,
        requirementAssignees,
      };

      const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : undefined;
      const res = await apiClient.post(`/org/projects/create-v2${wsId ? `?workspaceId=${wsId}` : ""}`, payload);

      if (res.data?.success || res.data?.projectId || res.data?.data?.id) {
        const serverId = res.data.projectId || res.data?.data?.id || res.data?.project?.id;
        if (!serverId) {
          setError("Server returned success without a valid project ID.");
          return;
        }

        setCreatedProjectId(serverId);

        // Subtle 3D Success Overlay for 1.5s, then navigate to real Project Details
        setTimeout(() => {
          router.push(`${basePath}/projects/${serverId}`);
        }, 1600);
      } else {
        setError(res.data?.error || "Unable to create project. Please review fields and retry.");
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || "Project creation failed. Please check connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full h-[calc(100vh-65px)] max-h-[calc(100vh-65px)] flex flex-col overflow-hidden bg-background text-foreground font-sans">
      
      {/* ── 1. FIXED TOP HEADER & STEPPER ────────────────────────────────────────── */}
      <header className="px-4 sm:px-6 py-3 border-b border-border shrink-0 bg-card/60 backdrop-blur-md space-y-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href={`${basePath}/projects`}
              className="p-1.5 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              title="Back to Projects"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-base font-extrabold text-foreground tracking-tight">
                Create Project
              </h1>
              <p className="text-[11px] text-muted-foreground hidden sm:block">
                Choose creation method, assign leaders, and launch execution.
              </p>
            </div>
          </div>

          {/* Stepper Progress Indicator (01 METHOD -> 02 ASSIGNMENT -> 03 REVIEW) */}
          <div className="flex items-center gap-2">
            <div className={`px-3 py-1 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 ${
              stage === "METHOD" ? "bg-[#C9A52A]/15 border-[#C9A52A]/40 text-[#C9A52A]" : "bg-card border-border text-muted-foreground"
            }`}>
              <span className="w-3.5 h-3.5 rounded-full bg-[#C9A52A]/20 text-[#C9A52A] font-mono text-[9.5px] flex items-center justify-center font-bold">1</span>
              <span>01 METHOD</span>
            </div>
            <div className={`px-3 py-1 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 ${
              stage === "ASSIGNMENT" ? "bg-[#C9A52A]/15 border-[#C9A52A]/40 text-[#C9A52A]" : "bg-card border-border text-muted-foreground"
            }`}>
              <span className="w-3.5 h-3.5 rounded-full bg-[#C9A52A]/20 text-[#C9A52A] font-mono text-[9.5px] flex items-center justify-center font-bold">2</span>
              <span>02 ASSIGNMENT</span>
            </div>
            <div className={`px-3 py-1 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 ${
              stage === "REVIEW" ? "bg-[#C9A52A]/15 border-[#C9A52A]/40 text-[#C9A52A]" : "bg-card border-border text-muted-foreground"
            }`}>
              <span className="w-3.5 h-3.5 rounded-full bg-[#C9A52A]/20 text-[#C9A52A] font-mono text-[9.5px] flex items-center justify-center font-bold">3</span>
              <span>03 REVIEW</span>
            </div>
          </div>

          {/* Ownership Governance Badge */}
          <div className="hidden lg:flex items-center gap-2 text-xs shrink-0">
            <div className="px-3 py-1.5 rounded-xl bg-muted/60 border border-border text-muted-foreground flex items-center gap-2 text-[11px]">
              <Lock className="w-3.5 h-3.5 text-[#C9A52A]" />
              <span>Project Owner: <strong className="text-foreground font-extrabold">CEO</strong></span>
              <span className="text-border">|</span>
              <span>Created By: <strong className="text-[#C9A52A] font-extrabold">{userRole === "CO-CEO" ? "You (CO-CEO)" : "You (CEO)"}</strong></span>
            </div>
          </div>
        </div>
      </header>

      {/* ── 2. THREE-ZONE DESKTOP GRID CONTAINER ─────────────────────────────────── */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        
        {/* ── CENTER WORKSPACE REGION (8 Columns) ────────────────────────────────── */}
        <div className="lg:col-span-8 flex flex-col h-full overflow-hidden border-r border-border/50">
          
          {/* Segmented Mode Selector (Visible in Step 01 METHOD when mode is selected) */}
          {stage === "METHOD" && mode && (
            <div className="px-4 sm:px-6 pt-4 shrink-0 space-y-2">
              <span className="text-[10.5px] font-extrabold text-muted-foreground uppercase tracking-wider block">
                Creation Method:
              </span>
              <div className="p-1 rounded-xl bg-card border border-border grid grid-cols-3 gap-1 shadow-xs">
                <button
                  type="button"
                  onClick={() => handleRequestModeChange("PROMPT")}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    mode === "PROMPT"
                      ? "bg-[#C9A52A] text-[#0B0D10] font-extrabold shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" /> Prompt Based
                </button>

                <button
                  type="button"
                  onClick={() => handleRequestModeChange("TEMPLATE")}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    mode === "TEMPLATE"
                      ? "bg-[#C9A52A] text-[#0B0D10] font-extrabold shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <LayoutTemplate className="w-3.5 h-3.5" /> Template Based
                </button>

                <button
                  type="button"
                  onClick={() => handleRequestModeChange("MANUAL")}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    mode === "MANUAL"
                      ? "bg-[#C9A52A] text-[#0B0D10] font-extrabold shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" /> Manual
                </button>
              </div>
            </div>
          )}

          {/* Internal Scrollable Content Region */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* INITIAL SELECTION CARDS SCREEN (Step 01 METHOD before mode selection) */}
            {stage === "METHOD" && !mode && (
              <div className="space-y-6 max-w-2xl mx-auto py-4 sm:py-8">
                <div className="text-center space-y-1.5">
                  <h2 className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight">Choose Creation Method</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">Select how you want to construct this project mandate.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("PROMPT");
                      setPromptSubstep("DESCRIBE");
                    }}
                    className={`p-5 rounded-2xl border transition-all text-left space-y-4 cursor-pointer group shadow-2xs relative ${
                      mode === "PROMPT"
                        ? "border-[#C9A52A] bg-[#C9A52A]/5 ring-1 ring-[#C9A52A]"
                        : "bg-card border-border hover:border-[#C9A52A]/60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-[#C9A52A]/10 text-[#C9A52A] flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/60 group-hover:text-[#C9A52A] group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-extrabold text-foreground text-xs sm:text-sm group-hover:text-[#C9A52A] transition-colors">Prompt Based</h4>
                      <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">Describe what you want to create in natural language.</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMode("TEMPLATE");
                      setTemplateSubstep("CHOOSE");
                    }}
                    className={`p-5 rounded-2xl border transition-all text-left space-y-4 cursor-pointer group shadow-2xs relative ${
                      mode === "TEMPLATE"
                        ? "border-[#C9A52A] bg-[#C9A52A]/5 ring-1 ring-[#C9A52A]"
                        : "bg-card border-border hover:border-[#C9A52A]/60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                        <LayoutTemplate className="w-5 h-5" />
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/60 group-hover:text-[#C9A52A] group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-extrabold text-foreground text-xs sm:text-sm group-hover:text-[#C9A52A] transition-colors">Template Based</h4>
                      <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">Start from a predefined organizational framework.</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMode("MANUAL");
                      setManualSubstep("INFORMATION");
                    }}
                    className={`p-5 rounded-2xl border transition-all text-left space-y-4 cursor-pointer group shadow-2xs relative ${
                      mode === "MANUAL"
                        ? "border-[#C9A52A] bg-[#C9A52A]/5 ring-1 ring-[#C9A52A]"
                        : "bg-card border-border hover:border-[#C9A52A]/60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                        <Sliders className="w-5 h-5" />
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/60 group-hover:text-[#C9A52A] group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-extrabold text-foreground text-xs sm:text-sm group-hover:text-[#C9A52A] transition-colors">Manual Setup</h4>
                      <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">Directly enter project details and scope controls.</p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Mode-Specific Substep View */}
            {stage === "METHOD" && mode && (
              <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-xs">
                {mode === "PROMPT" && (
                  <PromptMode
                    promptText={promptText}
                    setPromptText={setPromptText}
                    substep={promptSubstep}
                    setSubstep={setPromptSubstep}
                    title={title}
                    setTitle={setTitle}
                    description={description}
                    setDescription={setDescription}
                    category={category}
                    setCategory={setCategory}
                    priority={priority}
                    setPriority={setPriority}
                    deadline={deadline}
                    setDeadline={setDeadline}
                    toolsText={toolsText}
                    setToolsText={setToolsText}
                    requirements={requirements}
                    setRequirements={setRequirements}
                    deliverables={deliverables}
                    setDeliverables={setDeliverables}
                    successCriteria={successCriteria}
                    setSuccessCriteria={setSuccessCriteria}
                    onProceedToAssignment={() => setStage("ASSIGNMENT")}
                  />
                )}

                {mode === "TEMPLATE" && (
                  <TemplateMode
                    selectedTemplateId={selectedTemplateId}
                    onSelectTemplate={handleSelectTemplate}
                    substep={templateSubstep}
                    setSubstep={setTemplateSubstep}
                    onProceedToAssignment={() => setStage("ASSIGNMENT")}
                  />
                )}

                {mode === "MANUAL" && (
                  <ManualMode
                    title={title}
                    setTitle={setTitle}
                    description={description}
                    setDescription={setDescription}
                    category={category}
                    setCategory={setCategory}
                    priority={priority}
                    setPriority={setPriority}
                    deadline={deadline}
                    setDeadline={setDeadline}
                    githubUrl={githubUrl}
                    setGithubUrl={setGithubUrl}
                    toolsText={toolsText}
                    setToolsText={setToolsText}
                    requirementsText={requirementsText}
                    setRequirementsText={setRequirementsText}
                    deliverablesText={deliverablesText}
                    setDeliverablesText={setDeliverablesText}
                    successCriteriaText={successCriteriaText}
                    setSuccessCriteriaText={setSuccessCriteriaText}
                    substep={manualSubstep}
                    setSubstep={setManualSubstep}
                    onProceedToAssignment={() => setStage("ASSIGNMENT")}
                  />
                )}
              </div>
            )}

            {/* Step 2 Assignment & Controls Stage */}
            {stage === "ASSIGNMENT" && (
              <BlueprintEditor
                coCeoList={coCeoList}
                memberList={memberList}
                selectedCoCeoId={selectedCoCeoId}
                setSelectedCoCeoId={setSelectedCoCeoId}
                selectedExecutionLeadId={selectedExecutionLeadId}
                setSelectedExecutionLeadId={setSelectedExecutionLeadId}
                selectedMemberIds={selectedMemberIds}
                setSelectedMemberIds={setSelectedMemberIds}
                priority={priority}
                setPriority={setPriority}
                deadline={deadline}
                setDeadline={setDeadline}
                category={category}
                setCategory={setCategory}
                githubUrl={githubUrl}
                setGithubUrl={setGithubUrl}
                toolsText={toolsText}
                setToolsText={setToolsText}
                userRole={userRole}
                requirementAssignees={requirementAssignees}
                setRequirementAssignees={setRequirementAssignees}
                requirements={requirements}
              />
            )}

            {/* Step 3 Final Review Stage */}
            {stage === "REVIEW" && (
              <BlueprintReview
                title={title}
                description={description}
                category={category}
                priority={priority}
                deadline={deadline}
                selectedCoCeoId={selectedCoCeoId}
                coCeoList={coCeoList}
                selectedExecutionLeadId={selectedExecutionLeadId}
                selectedMemberIds={selectedMemberIds}
                memberList={memberList}
                requirements={requirements}
                deliverables={deliverables}
                githubUrl={githubUrl}
                toolsText={toolsText}
                isSubmitting={isSubmitting}
                onEditBlueprint={() => setStage("ASSIGNMENT")}
                onConfirmLaunch={handleConfirmLaunch}
                userRole={userRole}
              />
            )}
          </div>

          {/* Fixed Bottom Action Bar */}
          <div className="h-14 shrink-0 border-t border-border bg-card/90 backdrop-blur-md px-6 flex items-center justify-between z-20 text-xs">
            <button
              type="button"
              onClick={() => {
                if (stage === "REVIEW") setStage("ASSIGNMENT");
                else if (stage === "ASSIGNMENT") setStage("METHOD");
                else if (mode) setMode(null);
                else router.push(`${basePath}/projects`);
              }}
              className="px-4 py-2 rounded-xl border border-border text-foreground hover:bg-muted font-bold cursor-pointer transition-colors"
            >
              {stage === "METHOD" && !mode ? "Cancel" : "← Back"}
            </button>

            <div className="flex items-center gap-2">
              {stage === "METHOD" && mode && (
                <button
                  type="button"
                  onClick={() => setStage("ASSIGNMENT")}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C9A52A] to-[#D4B12F] text-[#0B0D10] font-extrabold cursor-pointer shadow-2xs hover:brightness-105 flex items-center gap-1.5"
                >
                  <span>Continue to Assignment →</span>
                </button>
              )}

              {stage === "ASSIGNMENT" && (
                <button
                  type="button"
                  onClick={() => setStage("REVIEW")}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C9A52A] to-[#D4B12F] text-[#0B0D10] font-extrabold cursor-pointer shadow-2xs hover:brightness-105 flex items-center gap-1.5"
                >
                  <span>Proceed to Review →</span>
                </button>
              )}

              {stage === "REVIEW" && (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleConfirmLaunch}
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-[#C9A52A] to-[#D4B12F] text-[#0B0D10] font-extrabold cursor-pointer shadow-2xs hover:brightness-105 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? "Creating Project..." : "Create Project"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT ZONE: DRAFT SUMMARY PANEL (4 Columns) ─────────────────────────── */}
        <div className="hidden lg:flex lg:col-span-4 h-full border-l border-border bg-card/60 backdrop-blur-md flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-border shrink-0 bg-card flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-[#C9A52A] uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" /> Project Draft Summary
            </span>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 text-xs">
            {/* Title & Metadata */}
            <div className="p-3.5 rounded-xl bg-background border border-border space-y-1.5">
              <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block">Project Draft</span>
              <h4 className="font-extrabold text-foreground text-xs">{title || "Untitled Project"}</h4>
              <div className="flex items-center gap-2 pt-1 text-[10.5px]">
                <span className="px-2 py-0.5 rounded bg-secondary text-muted-foreground font-bold">{category || "Unassigned"}</span>
                <span className="font-bold text-amber-500">{priority}</span>
              </div>
            </div>

            {/* Ownership */}
            <div className="p-3.5 rounded-xl bg-background border border-border space-y-2">
              <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block">Ownership</span>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground font-semibold">Project Owner</span>
                <span className="px-2 py-0.5 rounded bg-secondary text-foreground font-extrabold border border-border inline-flex items-center gap-1 text-[10.5px]">
                  <Lock className="w-3 h-3 text-[#C9A52A]" /> CEO
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground font-semibold">Created By</span>
                <span className="font-bold text-[#C9A52A]">{userRole === "CO-CEO" ? "You (CO-CEO)" : "You (CEO)"}</span>
              </div>
            </div>

            {/* Execution */}
            <div className="p-3.5 rounded-xl bg-background border border-border space-y-2">
              <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block">Assignment</span>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground font-semibold">CO-CEO Lead</span>
                <span className="font-bold text-blue-500 truncate max-w-[150px]">{selectedCoCeoName}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground font-semibold">Execution Lead</span>
                <span className="font-bold text-foreground truncate max-w-[150px]">{selectedExecutionLeadName}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground font-semibold">Members</span>
                <span className="font-mono font-bold text-foreground">{selectedMemberIds.length} users</span>
              </div>
            </div>

            {/* Requirements & Documents */}
            <div className="p-3.5 rounded-xl bg-background border border-border space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground font-semibold">Requirements</span>
                <span className="font-mono font-bold text-foreground">{requirements.length} items</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground font-semibold">Initial Storage</span>
                <span className="font-mono font-bold text-emerald-500">0 MB</span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Document requirements consume 0 MB until files are uploaded post-creation inside Project Details.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── MODE SWITCHING CONFIRMATION DIALOG ──────────────────────────────────── */}
      {pendingMode && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="p-5 rounded-2xl bg-card border border-border max-w-sm w-full space-y-3 shadow-xl">
            <div className="flex items-center gap-2 text-amber-500 font-bold text-sm">
              <AlertTriangle className="w-5 h-5" /> Switch Creation Method?
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Switching creation method will replace your current project draft. Do you want to proceed?
            </p>
            <div className="pt-2 flex justify-end gap-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => setPendingMode(null)}
                className="px-4 py-2 rounded-xl border border-border hover:bg-muted text-foreground cursor-pointer"
              >
                Keep Current
              </button>
              <button
                type="button"
                onClick={handleConfirmModeSwitch}
                className="px-4 py-2 rounded-xl bg-[#C9A52A] text-[#0B0D10] hover:brightness-105 cursor-pointer"
              >
                Switch Method
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. SUBTLE 3D SUCCESS ANIMATION OVERLAY ────────────────────────────────── */}
      {createdProjectId && (
        <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-md flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-300">
          <div className="relative w-24 h-24 flex items-center justify-center">
            <div className="absolute inset-0 rounded-3xl border-2 border-[#C9A52A] animate-[spin_6s_linear_infinite] shadow-[0_0_25px_rgba(201,165,42,0.2)]" />
            <div className="absolute inset-2 rounded-2xl border-2 border-[#C9A52A]/40 animate-[spin_4s_linear_infinite_reverse]" />
            <div className="w-12 h-12 rounded-xl bg-[#C9A52A] text-[#0B0D10] flex items-center justify-center shadow-lg">
              <Check className="w-7 h-7 stroke-[3]" />
            </div>
          </div>

          <div className="text-center space-y-1">
            <span className="text-[10.5px] font-extrabold text-[#C9A52A] uppercase tracking-wider">
              Project Created Successfully
            </span>
            <h3 className="text-lg font-extrabold text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground">Opening Project Details Workspace...</p>
          </div>
        </div>
      )}
    </div>
  );
}
