"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-context";
import apiClient from "@/lib/api-client";
import {
  FolderKanban, Shield, ArrowLeft, ChevronRight, Layers, AlertCircle,
  CheckCircle2, FileText, LayoutTemplate, Sliders, Flag, CheckSquare, HardDrive, User
} from "lucide-react";

import { PromptMode } from "./prompt-mode";
import { TemplateMode } from "./template-mode";
import { ManualMode } from "./manual-mode";
import { BlueprintEditor } from "./blueprint-editor";
import { BlueprintReview } from "./blueprint-review";
import { PROJECT_TEMPLATES, ProjectTemplate, BlueprintMilestone } from "./templates-data";

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

  // ── Stage Control: CONFIG -> BLUEPRINT -> REVIEW ─────────────────────────────
  const [stage, setStage] = useState<"CONFIG" | "BLUEPRINT" | "REVIEW">("CONFIG");

  // ── Mode Control: PROMPT vs TEMPLATE vs MANUAL ─────────────────────────────
  const [mode, setMode] = useState<"PROMPT" | "TEMPLATE" | "MANUAL">("PROMPT");

  // ── Form State ─────────────────────────────────────────────────────────────
  const [promptText, setPromptText] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("software-product");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"Critical" | "High" | "Medium" | "Low">("High");
  const [deadline, setDeadline] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [toolsText, setToolsText] = useState("");

  const [selectedCoCeoId, setSelectedCoCeoId] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  // ── Blueprint Milestones & Tasks ───────────────────────────────────────────
  const [milestones, setMilestones] = useState<BlueprintMilestone[]>([]);

  // ── UI / Loading States ───────────────────────────────────────────────────
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Org Members Data ───────────────────────────────────────────────────────
  const [coCeoList, setCoCeoList] = useState<{ id: string; name: string; email: string; role: string }[]>([]);
  const [memberList, setMemberList] = useState<{ id: string; name: string; email: string; role: string }[]>([]);

  useEffect(() => {
    async function fetchAssignees() {
      let fetchedCoCeos: { id: string; name: string; email: string; role: string }[] = [];
      let fetchedMembers: { id: string; name: string; email: string; role: string }[] = [];

      try {
        const res = await apiClient.get("/org/projects/eligible-assignees");
        if (Array.isArray(res.data?.coCeos) && res.data.coCeos.length > 0) {
          fetchedCoCeos = res.data.coCeos;
        }
        if (Array.isArray(res.data?.members) && res.data.members.length > 0) {
          fetchedMembers = res.data.members;
        }
      } catch (err) {
        console.warn("Primary eligible-assignees call failed, trying fallback endpoints...", err);
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

      if (fetchedCoCeos.length > 0) {
        setCoCeoList(fetchedCoCeos);
        setSelectedCoCeoId((prev) => (prev ? prev : fetchedCoCeos[0].id));
      }
      if (fetchedMembers.length > 0) {
        setMemberList(fetchedMembers);
      }
    }
    fetchAssignees();
  }, []);

  // Initialize default template blueprint on mount
  useEffect(() => {
    const defaultTemplate = PROJECT_TEMPLATES.find((t) => t.id === "software-product") || PROJECT_TEMPLATES[0];
    if (defaultTemplate && milestones.length === 0) {
      setTitle(defaultTemplate.title);
      setDescription(defaultTemplate.subtitle);
      setMilestones(defaultTemplate.milestones);
    }
  }, [milestones.length]);

  // Derived Total Task Count
  const totalTasksCount = useMemo(() => {
    return milestones.reduce((acc, m) => acc + (m.tasks ? m.tasks.length : 0), 0);
  }, [milestones]);

  // Selected CO-CEO Name
  const selectedCoCeoName = useMemo(() => {
    const found = coCeoList.find((c) => c.id === selectedCoCeoId);
    return found ? found.name : "CO-CEO Unassigned";
  }, [coCeoList, selectedCoCeoId]);

  // Handle Template Selection
  const handleSelectTemplate = (template: ProjectTemplate) => {
    setSelectedTemplateId(template.id);
    setTitle(template.title);
    setDescription(template.subtitle);
    setMilestones(template.milestones);
    setToolsText("Next.js, TypeScript, PostgreSQL, Tailwind CSS");
  };

  // Handle Prompt Generation
  const handleGenerateFromPrompt = async () => {
    if (!promptText.trim()) {
      setError("Please provide project brief text.");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const parsedTitle = promptText.length > 50 ? `${promptText.substring(0, 48)}...` : promptText;
      setTitle(parsedTitle);
      setDescription(promptText);

      const generatedMilestones: BlueprintMilestone[] = [
        {
          id: "m-gen-1",
          stageNumber: 1,
          name: "M1 — Activation & Setup",
          description: "Initialize project repository, environment configuration, and team workspace.",
          deliverables: ["Project Charter", "Repository Setup"],
          tasks: [
            { id: "t-gen-1", title: "Setup Project Repository & Workspace", description: "Initialize Git repo and env variables.", priority: "High", assigneeRole: "EXECUTION_LEAD" },
            { id: "t-gen-2", title: "Kickoff Mandate Meeting", description: "Align team on deliverables and milestones.", priority: "Medium", assigneeRole: "EXECUTION_LEAD" },
          ],
        },
        {
          id: "m-gen-2",
          stageNumber: 2,
          name: "M2 — Product & Technical Specs",
          description: "Author PRD, TRD, and system architecture specifications.",
          deliverables: ["PRD Document", "Architecture Diagram"],
          tasks: [
            { id: "t-gen-3", title: "Author PRD Document", description: "Define detailed user stories and requirements.", priority: "Critical", assigneeRole: "EXECUTION_LEAD" },
            { id: "t-gen-4", title: "Define System Topology & DB Schema", description: "Create database migration blueprints.", priority: "High", assigneeRole: "EXECUTION_LEAD" },
          ],
        },
        {
          id: "m-gen-3",
          stageNumber: 3,
          name: "M3 — Core Feature Implementation",
          description: "Build core application features, database models, and APIs.",
          deliverables: ["Working Prototype", "API Endpoints"],
          tasks: [
            { id: "t-gen-5", title: "Build Database Models & API Routes", description: "Implement CRUD operations and validation.", priority: "Critical", assigneeRole: "MEMBER" },
            { id: "t-gen-6", title: "Develop Frontend Application Views", description: "Build responsive UI screens.", priority: "High", assigneeRole: "MEMBER" },
          ],
        },
        {
          id: "m-gen-4",
          stageNumber: 4,
          name: "M4 — QA, Security & Deployment",
          description: "Conduct security audit, QA testing, and production deployment.",
          deliverables: ["Test Suite Results", "Production Deployment"],
          tasks: [
            { id: "t-gen-7", title: "Run End-to-End Test Suite", description: "Verify core user journeys and performance.", priority: "High", assigneeRole: "EXECUTION_LEAD" },
            { id: "t-gen-8", title: "Deploy to Production Environment", description: "Finalize domain setup and SSL certificates.", priority: "Critical", assigneeRole: "EXECUTION_LEAD" },
          ],
        },
      ];

      setMilestones(generatedMilestones);
      setStage("BLUEPRINT");
    } catch (err: any) {
      setError(err?.message || "Failed to generate blueprint from brief.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle Launch Final Project Creation
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
        priority,
        deadline: deadline || null,
        targetDate: deadline || null,
        githubUrl: githubUrl || null,
        toolsText: toolsText || null,

        // Ownership Governance (CEO Fixed)
        ownerId: "CEO",
        ownerRole: "CEO",

        // Execution & Assignment Resolution
        coCeoInChargeId: selectedCoCeoId || null,
        responsibleCoCeoId: selectedCoCeoId || null,
        assignedToUserId: selectedCoCeoId || null,
        memberUserIds: selectedMemberIds,
        memberIds: selectedMemberIds,

        // Blueprint Milestones & Tasks
        milestones: milestones.map((m, idx) => ({
          stageNumber: idx + 1,
          name: m.name,
          description: m.description,
          deliverables: m.deliverables || [],
          tasks: (m.tasks || []).map((t) => ({
            title: t.title,
            description: t.description || "",
            priority: t.priority || "Medium",
            assigneeRole: t.assigneeRole || "EXECUTION_LEAD",
          })),
        })),
      };

      const wsId = typeof window !== "undefined" ? localStorage.getItem("workspaceId") : undefined;
      const res = await apiClient.post(`/org/projects/create-v2${wsId ? `?workspaceId=${wsId}` : ""}`, payload);

      if (res.data?.success || res.data?.projectId || res.data?.data?.id) {
        const createdId = res.data.projectId || res.data?.data?.id || res.data?.project?.id;
        if (createdId) {
          router.push(`${basePath}/projects/${createdId}`);
        } else {
          router.push(`${basePath}/projects`);
        }
      } else {
        setError(res.data?.error || "Unable to create project. Please verify fields and retry.");
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || "Project creation failed. Please check network connectivity.");
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
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold text-foreground tracking-tight">Project Creation Workspace</h1>
                <span className="px-2 py-0.5 rounded-full bg-[#C9A52A]/15 text-[#C9A52A] text-[10px] font-extrabold uppercase tracking-wider border border-[#C9A52A]/20">
                  Application Builder
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground hidden sm:block">
                Prompt, template and manual project blueprint generator.
              </p>
            </div>
          </div>

          {/* Stepper Progress Indicator */}
          <div className="hidden md:flex items-center gap-2">
            <div className={`px-3 py-1 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 ${
              stage === "CONFIG" ? "bg-[#C9A52A]/15 border-[#C9A52A]/40 text-[#C9A52A]" : "bg-card border-border text-muted-foreground"
            }`}>
              <span className="w-3.5 h-3.5 rounded-full bg-[#C9A52A]/20 text-[#C9A52A] font-mono text-[9.5px] flex items-center justify-center font-bold">1</span>
              <span>01 DETAILS</span>
            </div>
            <div className={`px-3 py-1 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 ${
              stage === "BLUEPRINT" ? "bg-[#C9A52A]/15 border-[#C9A52A]/40 text-[#C9A52A]" : "bg-card border-border text-muted-foreground"
            }`}>
              <span className="w-3.5 h-3.5 rounded-full bg-[#C9A52A]/20 text-[#C9A52A] font-mono text-[9.5px] flex items-center justify-center font-bold">2</span>
              <span>02 BLUEPRINT</span>
            </div>
            <div className={`px-3 py-1 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 ${
              stage === "REVIEW" ? "bg-[#C9A52A]/15 border-[#C9A52A]/40 text-[#C9A52A]" : "bg-card border-border text-muted-foreground"
            }`}>
              <span className="w-3.5 h-3.5 rounded-full bg-[#C9A52A]/20 text-[#C9A52A] font-mono text-[9.5px] flex items-center justify-center font-bold">3</span>
              <span>03 REVIEW</span>
            </div>
          </div>

          {/* Ownership Governance Badge */}
          <div className="flex items-center gap-2 text-xs shrink-0">
            <div className="px-3 py-1.5 rounded-xl bg-muted/60 border border-border text-muted-foreground flex items-center gap-2 text-[11px]">
              <Shield className="w-3.5 h-3.5 text-[#C9A52A]" />
              <span>Project Owner: <strong className="text-foreground font-extrabold">CEO 🔒</strong></span>
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
          
          {/* Mode Selector Segmented Tabs (Visible in DETAILS Stage) */}
          {stage === "CONFIG" && (
            <div className="px-4 sm:px-6 pt-4 shrink-0">
              <div className="p-1 rounded-xl bg-card border border-border grid grid-cols-3 gap-1 shadow-xs">
                <button
                  type="button"
                  onClick={() => setMode("PROMPT")}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    mode === "PROMPT"
                      ? "bg-[#C9A52A] text-[#0B0D10] font-extrabold shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" /> Prompt Brief
                </button>

                <button
                  type="button"
                  onClick={() => setMode("TEMPLATE")}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    mode === "TEMPLATE"
                      ? "bg-[#C9A52A] text-[#0B0D10] font-extrabold shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <LayoutTemplate className="w-3.5 h-3.5" /> Template Library
                </button>

                <button
                  type="button"
                  onClick={() => setMode("MANUAL")}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    mode === "MANUAL"
                      ? "bg-[#C9A52A] text-[#0B0D10] font-extrabold shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" /> Manual Setup
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

            {/* Mode Content Views */}
            {stage === "CONFIG" && (
              <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-xs">
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
                )}
              </div>
            )}

            {/* Blueprint Editor Stage */}
            {stage === "BLUEPRINT" && (
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
            )}

            {/* Pre-Flight Review Stage */}
            {stage === "REVIEW" && (
              <BlueprintReview
                title={title}
                description={description}
                priority={priority}
                deadline={deadline}
                userRole={userRole}
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
              />
            )}
          </div>

          {/* Fixed Action Bar at Bottom of Creation Workspace */}
          <div className="h-14 shrink-0 border-t border-border bg-card/90 backdrop-blur-md px-6 flex items-center justify-between z-20 text-xs">
            <button
              type="button"
              onClick={() => {
                if (stage === "REVIEW") setStage("BLUEPRINT");
                else if (stage === "BLUEPRINT") setStage("CONFIG");
                else router.push(`${basePath}/projects`);
              }}
              className="px-4 py-2 rounded-xl border border-border text-foreground hover:bg-muted font-bold cursor-pointer transition-colors"
            >
              {stage === "CONFIG" ? "Cancel" : "← Back"}
            </button>

            <div className="flex items-center gap-2">
              {stage === "CONFIG" && (
                <button
                  type="button"
                  onClick={() => setStage("BLUEPRINT")}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C9A52A] to-[#D4B12F] text-[#0B0D10] font-extrabold cursor-pointer shadow-2xs hover:brightness-105 flex items-center gap-1.5"
                >
                  <span>Continue to Blueprint →</span>
                </button>
              )}

              {stage === "BLUEPRINT" && (
                <button
                  type="button"
                  onClick={() => setStage("REVIEW")}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C9A52A] to-[#D4B12F] text-[#0B0D10] font-extrabold cursor-pointer shadow-2xs hover:brightness-105 flex items-center gap-1.5"
                >
                  <span>Proceed to Pre-Flight Review →</span>
                </button>
              )}

              {stage === "REVIEW" && (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleConfirmLaunch}
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-[#C9A52A] to-[#D4B12F] text-[#0B0D10] font-extrabold cursor-pointer shadow-2xs hover:brightness-105 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? "Creating Project..." : "Confirm & Launch Project"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT ZONE: PERMANENT LIVE PROJECT BLUEPRINT PANEL (4 Columns) ────────── */}
        <div className="hidden lg:flex lg:col-span-4 h-full border-l border-border bg-card/60 backdrop-blur-md flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-border shrink-0 bg-card flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-[#C9A52A] uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" /> Project Blueprint
            </span>
            <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono text-[10px] font-bold">
              Live State
            </span>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 text-xs">
            {/* Title & Objective Card */}
            <div className="p-3.5 rounded-xl bg-background border border-border space-y-1.5">
              <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block">Mandate Summary</span>
              <h4 className="font-extrabold text-foreground text-xs">{title || "Untitled Project"}</h4>
              {description && <p className="text-[11px] text-muted-foreground line-clamp-3">{description}</p>}
            </div>

            {/* Ownership Governance */}
            <div className="p-3.5 rounded-xl bg-background border border-border space-y-2">
              <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block">Ownership</span>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Project Owner</span>
                <span className="px-2 py-0.5 rounded bg-secondary text-foreground font-extrabold border border-border inline-flex items-center gap-1 text-[10.5px]">
                  <Shield className="w-3 h-3 text-[#C9A52A]" /> CEO 🔒
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Created By</span>
                <span className="font-bold text-[#C9A52A]">{userRole === "CO-CEO" ? "You (CO-CEO)" : "You (CEO)"}</span>
              </div>
            </div>

            {/* Execution & Assignees */}
            <div className="p-3.5 rounded-xl bg-background border border-border space-y-2">
              <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block">Execution</span>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">CO-CEO Lead</span>
                <span className="font-bold text-blue-500 truncate max-w-[150px]">{selectedCoCeoName}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Members Assigned</span>
                <span className="font-mono font-bold text-foreground">{selectedMemberIds.length} users</span>
              </div>
            </div>

            {/* Milestones Breakdown */}
            <div className="p-3.5 rounded-xl bg-background border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">Milestones ({milestones.length})</span>
                <span className="text-[10px] font-mono text-muted-foreground">{totalTasksCount} tasks</span>
              </div>
              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {milestones.map((m, idx) => (
                  <div key={m.id || idx} className="p-2 rounded-lg bg-card border border-border flex items-center justify-between text-[11px]">
                    <span className="font-bold text-foreground truncate max-w-[180px]">{m.name}</span>
                    <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono text-[9.5px]">
                      {m.tasks?.length || 0} tasks
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Document Requirements & Storage */}
            <div className="p-3.5 rounded-xl bg-background border border-border space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Document Requirements</span>
                <span className="font-bold text-foreground">8 Required · 0 Uploaded</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground font-semibold">Storage Usage</span>
                <span className="font-mono font-bold text-emerald-500">0 MB</span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Document requirements consume 0 MB until files are uploaded post-creation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
