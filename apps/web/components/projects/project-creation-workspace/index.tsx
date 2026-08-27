"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-context";
import apiClient from "@/lib/api-client";
import {
  ArrowLeft, Lock, AlertCircle, CheckCircle2, FileText,
  LayoutTemplate, Sliders, Layers, Check, AlertTriangle
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

export function ProjectCreationWorkspace({
  userRole: initialRole,
  basePath: initialBasePath,
}: ProjectCreationWorkspaceProps = {}) {
  const router = useRouter();
  const { user } = useAuth();

  const userRole = (initialRole || user?.role || "CEO").toUpperCase();
  const basePath = initialBasePath || (userRole === "CO-CEO" ? "/co-ceo" : "/ceo");

  // ── STAGE CONTROL: TYPE -> ASSIGNMENT -> REVIEW ───────────────────────────
  const [stage, setStage] = useState<"TYPE" | "ASSIGNMENT" | "REVIEW">("TYPE");

  // ── MODE CONTROL & SUBSTEPS ───────────────────────────────────────────────
  const [mode, setMode] = useState<"PROMPT" | "TEMPLATE" | "MANUAL">("PROMPT");
  const [pendingMode, setPendingMode] = useState<"PROMPT" | "TEMPLATE" | "MANUAL" | null>(null);

  // Substeps per mode
  const [promptSubstep, setPromptSubstep] = useState<"DESCRIBE" | "UNDERSTAND" | "REFINE">("DESCRIBE");
  const [templateSubstep, setTemplateSubstep] = useState<"CHOOSE" | "CONFIGURE">("CHOOSE");
  const [manualSubstep, setManualSubstep] = useState<"INFORMATION" | "CONTROLS" | "REQUIREMENTS">("INFORMATION");

  // ── NORMALIZED PROJECT DRAFT STATE ─────────────────────────────────────────
  const [promptText, setPromptText] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("software-product");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Product Engineering");
  const [priority, setPriority] = useState<"Critical" | "High" | "Medium" | "Low">("High");
  const [deadline, setDeadline] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [toolsText, setToolsText] = useState("");

  const [requirementsText, setRequirementsText] = useState("PRD Document, Technical Specs, Security Audit");
  const [deliverablesText, setDeliverablesText] = useState("Working Application, Connected Repository, Test Suite");
  const [successCriteriaText, setSuccessCriteriaText] = useState("Passed E2E testing, zero critical vulnerabilities");

  // Prompt arrays state
  const [requirements, setRequirements] = useState<string[]>(["PRD Document", "Technical Specs", "Security Audit"]);
  const [deliverables, setDeliverables] = useState<string[]>(["Working Application", "Connected Repository", "Test Suite"]);
  const [successCriteria, setSuccessCriteria] = useState<string[]>(["Passed E2E testing, zero critical vulnerabilities"]);

  // ── STEP 2: EXECUTION ASSIGNMENT STATE (UNASSIGNED BY DEFAULT) ──────────────
  const [selectedCoCeoId, setSelectedCoCeoId] = useState("");
  const [selectedExecutionLeadId, setSelectedExecutionLeadId] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [requirementAssignees, setRequirementAssignees] = useState<Record<string, string>>({});

  // ── UI / LOADING / SUCCESS 3D OVERLAY STATES ──────────────────────────────
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);

  // ── ORG MEMBERS DATA ───────────────────────────────────────────────────────
  const [coCeoList, setCoCeoList] = useState<MemberOption[]>([]);
  const [memberList, setMemberList] = useState<MemberOption[]>([]);

  useEffect(() => {
    async function fetchAssignees() {
      let fetchedCoCeos: MemberOption[] = [];
      let fetchedMembers: MemberOption[] = [];

      try {
        const res = await apiClient.get("/org/projects/eligible-assignees");
        if (Array.isArray(res.data?.coCeos) && res.data.coCeos.length > 0) {
          fetchedCoCeos = res.data.coCeos;
        }
        if (Array.isArray(res.data?.members) && res.data.members.length > 0) {
          fetchedMembers = res.data.members;
        }
      } catch (err) {
        console.warn("Eligible assignees fetch failed, using fallbacks...", err);
      }

      if (fetchedCoCeos.length === 0) {
        try {
          const coCeoRes = await apiClient.get("/organization/co-ceos");
          const list = coCeoRes.data?.coCeos || coCeoRes.data?.data || [];
          if (Array.isArray(list) && list.length > 0) {
            fetchedCoCeos = list.map((item: any) => ({
              id: item.id || item.userId,
              name: item.displayName || item.name || item.email || "CO-CEO Lead",
              email: item.email || "",
              role: item.role || "CO-CEO",
            }));
          }
        } catch (err) {
          console.warn("CO-CEO fallback fetch failed:", err);
        }
      }

      if (fetchedMembers.length === 0) {
        try {
          const memRes = await apiClient.get("/organization/members");
          const list = memRes.data?.members || memRes.data?.data || [];
          if (Array.isArray(list) && list.length > 0) {
            fetchedMembers = list.map((item: any) => ({
              id: item.id || item.userId,
              name: item.displayName || item.name || item.email || "Team Member",
              email: item.email || "",
              role: item.role || "MEMBER",
            }));
          }
        } catch (err) {
          console.warn("Members fallback fetch failed:", err);
        }
      }

      if (fetchedCoCeos.length > 0) setCoCeoList(fetchedCoCeos);
      if (fetchedMembers.length > 0) setMemberList(fetchedMembers);
    }
    fetchAssignees();
  }, []);

  // Initialize default template draft on mount
  useEffect(() => {
    const defaultTemplate = PROJECT_TEMPLATES.find((t) => t.id === "software-product") || PROJECT_TEMPLATES[0];
    if (defaultTemplate && !title) {
      setTitle(defaultTemplate.title);
      setDescription(defaultTemplate.subtitle);
      setCategory(defaultTemplate.category);
      setToolsText(defaultTemplate.tools.join(", "));
    }
  }, [title]);

  // Handle Mode Change Request with Confirmation Warning
  const handleRequestModeChange = (targetMode: "PROMPT" | "TEMPLATE" | "MANUAL") => {
    if (targetMode === mode) return;
    if (title || promptText) {
      setPendingMode(targetMode);
    } else {
      setMode(targetMode);
    }
  };

  const handleConfirmModeSwitch = () => {
    if (pendingMode) {
      setMode(pendingMode);
      setPendingMode(null);
      if (pendingMode === "PROMPT") {
        setPromptSubstep("DESCRIBE");
      } else if (pendingMode === "TEMPLATE") {
        setTemplateSubstep("CHOOSE");
      } else if (pendingMode === "MANUAL") {
        setManualSubstep("INFORMATION");
      }
    }
  };

  // Selected CO-CEO Name
  const selectedCoCeoName = useMemo(() => {
    const found = coCeoList.find((c) => c.id === selectedCoCeoId);
    return found ? found.name : "Not assigned";
  }, [coCeoList, selectedCoCeoId]);

  // Selected Execution Lead Name
  const selectedExecutionLeadName = useMemo(() => {
    const found = memberList.find((m) => m.id === selectedExecutionLeadId);
    return found ? found.name : "Not assigned";
  }, [memberList, selectedExecutionLeadId]);

  // Handle Template Selection (Only structure, NEVER people!)
  const handleSelectTemplate = (template: ProjectTemplate) => {
    setSelectedTemplateId(template.id);
    setTitle(template.title);
    setDescription(template.subtitle);
    setCategory(template.category);
    setToolsText(template.tools.join(", "));
    setRequirementsText(template.documents.join(", "));
    setRequirements(template.documents);
  };

  // Handle Confirm Project Creation Transaction
  const handleConfirmLaunch = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const finalTitle = title.trim() || "New Organization Project";
      const finalDesc = description.trim() || "Organization project mandate.";

      const payload = {
        name: finalTitle,
        title: finalTitle,
        description: finalDesc,
        objective: finalDesc,
        mandate: finalDesc,
        category,
        priority,
        deadline: deadline || null,
        targetDate: deadline || null,
        githubUrl: githubUrl || null,
        toolsText: toolsText || null,
        requirements,
        deliverables,
        successCriteria,

        // Ownership Governance (Server-enforced CEO)
        ownerId: "CEO",
        ownerRole: "CEO",

        // Execution & Assignment Resolution
        coCeoInChargeId: selectedCoCeoId || null,
        responsibleCoCeoId: selectedCoCeoId || null,
        assignedToUserId: selectedExecutionLeadId || selectedCoCeoId || null,
        executionLeadId: selectedExecutionLeadId || null,
        memberUserIds: selectedMemberIds,
        memberIds: selectedMemberIds,
        requirementAssignees,
      };

      const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : undefined;
      const res = await apiClient.post(`/org/projects/create-v2${wsId ? `?workspaceId=${wsId}` : ""}`, payload);

      if (res.data?.success || res.data?.projectId || res.data?.data?.id) {
        const createdId = res.data.projectId || res.data?.data?.id || res.data?.project?.id || "recent";
        setCreatedProjectId(createdId);

        // Subtle 3D Success Experience for 1.5 seconds, then open Project Details!
        setTimeout(() => {
          router.push(`${basePath}/projects/${createdId}`);
        }, 1600);
      } else {
        setError(res.data?.error || "Unable to create project. Please review assignment fields and retry.");
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || "Project creation failed. Please check backend connection.");
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
                Project Creation
              </h1>
              <p className="text-[11px] text-muted-foreground hidden sm:block">
                Define, assign and review organizational projects.
              </p>
            </div>
          </div>

          {/* Stepper Progress Indicator */}
          <div className="flex items-center gap-2">
            <div className={`px-3 py-1 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 ${
              stage === "TYPE" ? "bg-[#C9A52A]/15 border-[#C9A52A]/40 text-[#C9A52A]" : "bg-card border-border text-muted-foreground"
            }`}>
              <span className="w-3.5 h-3.5 rounded-full bg-[#C9A52A]/20 text-[#C9A52A] font-mono text-[9.5px] flex items-center justify-center font-bold">1</span>
              <span>01 PROJECT TYPE</span>
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
          
          {/* Mode Selector Segmented Tabs (Visible in Step 1 PROJECT TYPE) */}
          {stage === "TYPE" && (
            <div className="px-4 sm:px-6 pt-4 shrink-0">
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

            {/* Step 1 Mode Views */}
            {stage === "TYPE" && (
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

          {/* Fixed Action Bar at Bottom */}
          <div className="h-14 shrink-0 border-t border-border bg-card/90 backdrop-blur-md px-6 flex items-center justify-between z-20 text-xs">
            <button
              type="button"
              onClick={() => {
                if (stage === "REVIEW") setStage("ASSIGNMENT");
                else if (stage === "ASSIGNMENT") setStage("TYPE");
                else router.push(`${basePath}/projects`);
              }}
              className="px-4 py-2 rounded-xl border border-border text-foreground hover:bg-muted font-bold cursor-pointer transition-colors"
            >
              {stage === "TYPE" ? "Cancel" : "← Back"}
            </button>

            <div className="flex items-center gap-2">
              {stage === "TYPE" && (
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
            <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono text-[10px] font-bold">
              Live State
            </span>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 text-xs">
            {/* Title & Metadata */}
            <div className="p-3.5 rounded-xl bg-background border border-border space-y-1.5">
              <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block">Project Draft</span>
              <h4 className="font-extrabold text-foreground text-xs">{title || "Untitled Project"}</h4>
              <div className="flex items-center gap-2 pt-1 text-[10.5px]">
                <span className="px-2 py-0.5 rounded bg-secondary text-muted-foreground font-bold">{category}</span>
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
                <span className="text-muted-foreground font-semibold">Document Requirements</span>
                <span className="font-mono font-bold text-foreground">8 Requirements</span>
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
              <AlertTriangle className="w-5 h-5" /> Switch Creation Mode?
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Switching creation mode will replace your current project draft. Do you want to proceed?
            </p>
            <div className="pt-2 flex justify-end gap-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => setPendingMode(null)}
                className="px-4 py-2 rounded-xl border border-border hover:bg-muted text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmModeSwitch}
                className="px-4 py-2 rounded-xl bg-[#C9A52A] text-[#0B0D10] hover:brightness-105"
              >
                Switch Mode
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. SUBTLE 3D SUCCESS ANIMATION OVERLAY ────────────────────────────────── */}
      {createdProjectId && (
        <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-md flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-300">
          {/* Subtle 3D Rotating Mesh / Checkmark Assembly */}
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
