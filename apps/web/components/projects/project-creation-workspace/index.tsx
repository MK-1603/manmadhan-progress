"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-context";
import apiClient from "@/lib/api-client";
import {
  FolderKanban, Wand2, LayoutTemplate, Sliders, Shield, ArrowLeft,
  ChevronRight, Layers, AlertCircle, CheckCircle2
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

      // Fallback query if coCeos array is empty
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

      // Fallback query if members array is empty
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
        if (!selectedCoCeoId) {
          setSelectedCoCeoId(fetchedCoCeos[0].id);
        }
      }
      if (fetchedMembers.length > 0) {
        setMemberList(fetchedMembers);
      }
    }
    fetchAssignees();
  }, []);

  // ── Handlers: Prompt Mode -> Blueprint ─────────────────────────────────────
  const handleGenerateFromPrompt = async () => {
    if (!promptText.trim()) return;
    setIsGenerating(true);
    setError(null);

    try {
      const res = await apiClient.post("/org/projects/plan-from-prompt", {
        prompt: promptText.trim(),
      });

      if (res.data) {
        const plan = res.data.plan || res.data;
        if (plan.title) setTitle(plan.title);
        if (plan.description || plan.objective) setDescription(plan.description || plan.objective);
        if (plan.priority) setPriority(plan.priority);
        if (plan.deadline) setDeadline(plan.deadline);
        if (plan.githubUrl) setGithubUrl(plan.githubUrl);
        if (plan.tools) setToolsText(Array.isArray(plan.tools) ? plan.tools.join(", ") : plan.tools);

        if (Array.isArray(plan.milestones) && plan.milestones.length > 0) {
          setMilestones(plan.milestones);
        }
      }
      setStage("BLUEPRINT");
    } catch (err: any) {
      console.warn("Prompt plan endpoint error, using client parsing fallback...", err);
      const fallbackTitle = promptText.split(".")[0]?.slice(0, 60) || "New Organization Project";
      setTitle(fallbackTitle);
      setDescription(promptText);
      setStage("BLUEPRINT");
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Handlers: Template Selection ───────────────────────────────────────────
  const handleSelectTemplate = (template: ProjectTemplate) => {
    setSelectedTemplateId(template.id);
    setTitle(`${template.title} Execution`);
    setDescription(template.description);
    setPriority(template.recommendedPriority);

    const d = new Date();
    d.setDate(d.getDate() + template.recommendedDeadlineDays);
    setDeadline(d.toISOString().split("T")[0]);

    setMilestones(template.milestones);
    setToolsText(template.tools.join(", "));
    setStage("BLUEPRINT");
  };

  // ── Handlers: Manual Mode Proceed ─────────────────────────────────────────
  const handleManualProceed = () => {
    if (!title.trim()) {
      setError("Please provide a Project Title before proceeding.");
      return;
    }
    setError(null);
    setStage("BLUEPRINT");
  };

  // ── Handlers: Final Persistence (Real Database API) ────────────────────────
  const handleConfirmLaunch = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        title: title.trim() || "Untitled Project",
        description: description.trim(),
        priority,
        deadline: deadline || null,
        githubUrl: githubUrl.trim() || null,
        toolsText: toolsText.trim(),
        coCeoInChargeId: selectedCoCeoId || null,
        memberIds: selectedMemberIds,
        milestones,
      };

      const res = await apiClient.post("/org/projects/create-v2", payload);
      const createdProject = res.data?.project;

      if (createdProject?.id) {
        router.push(`${basePath}/projects/${createdProject.id}`);
      } else {
        router.push(`${basePath}/projects`);
      }
    } catch (err: any) {
      console.error("Project launch failed:", err);
      setError(err.response?.data?.error || err.message || "Failed to persist project database records.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full min-h-full bg-background text-foreground font-sans flex flex-col">
      {/* ── STICKY TOP WORKSPACE HEADER ────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-md border-b border-border px-4 sm:px-6 py-3.5 shrink-0 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href={`${basePath}/projects`}
              className="p-2 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Back to Projects"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-[#C9A52A]" />
                <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-foreground">Project Creation Workspace</h1>
              </div>
              <p className="text-[11px] text-muted-foreground hidden sm:block">Prompt-driven & template-driven executive project builder.</p>
            </div>
          </div>

          {/* Stepper Progress Badges */}
          <div className="hidden md:flex items-center gap-2">
            <div className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition-all ${
              stage === "CONFIG"
                ? "bg-[#C9A52A]/15 border-[#C9A52A]/40 text-[#C9A52A]"
                : "bg-card border-border text-muted-foreground"
            }`}>
              <span className="w-4 h-4 rounded-full bg-[#C9A52A]/20 text-[#C9A52A] font-mono text-[10px] flex items-center justify-center font-bold">1</span>
              <span>Mandate & Mode</span>
            </div>
            <div className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition-all ${
              stage === "BLUEPRINT"
                ? "bg-[#C9A52A]/15 border-[#C9A52A]/40 text-[#C9A52A]"
                : "bg-card border-border text-muted-foreground"
            }`}>
              <span className="w-4 h-4 rounded-full bg-[#C9A52A]/20 text-[#C9A52A] font-mono text-[10px] flex items-center justify-center font-bold">2</span>
              <span>Blueprint Editor</span>
            </div>
            <div className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition-all ${
              stage === "REVIEW"
                ? "bg-[#C9A52A]/15 border-[#C9A52A]/40 text-[#C9A52A]"
                : "bg-card border-border text-muted-foreground"
            }`}>
              <span className="w-4 h-4 rounded-full bg-[#C9A52A]/20 text-[#C9A52A] font-mono text-[10px] flex items-center justify-center font-bold">3</span>
              <span>Pre-Flight Review</span>
            </div>
          </div>

          {/* Role & Ownership Badge */}
          <div className="flex items-center gap-2 text-xs">
            <div className="px-3.5 py-1.5 rounded-xl bg-muted/50 border border-border text-muted-foreground flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#C9A52A]" />
              <span className="hidden sm:inline">Project Owner: <strong className="text-foreground font-extrabold">CEO 🔒</strong></span>
              <span className="hidden sm:inline text-border">|</span>
              <span>Created By: <strong className="text-[#C9A52A] font-extrabold">{userRole === "CO-CEO" ? "You (CO-CEO)" : "You (CEO)"}</strong></span>
            </div>
          </div>
        </div>
      </header>

      {/* ── MAIN WORKSPACE CONTENT CONTAINER ───────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 pb-28">
        
        {/* ── LEFT COLUMN: CREATION CONFIGURATION & BLUEPRINT BUILDER (8 Cols) ───── */}
        <div className="lg:col-span-8 space-y-5">
          
          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center gap-2.5 shadow-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Creation Mode Segmented Tabs */}
          {stage === "CONFIG" && (
            <div className="p-1.5 rounded-2xl bg-card border border-border grid grid-cols-3 gap-1.5 shadow-xs">
              <button
                type="button"
                onClick={() => setMode("PROMPT")}
                className={`py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  mode === "PROMPT"
                    ? "bg-gradient-to-r from-[#C9A52A] to-[#D4B12F] text-[#0B0D10] shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <Wand2 className="w-4 h-4" /> Prompt Based
              </button>

              <button
                type="button"
                onClick={() => setMode("TEMPLATE")}
                className={`py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  mode === "TEMPLATE"
                    ? "bg-gradient-to-r from-[#C9A52A] to-[#D4B12F] text-[#0B0D10] shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <LayoutTemplate className="w-4 h-4" /> Template Based
              </button>

              <button
                type="button"
                onClick={() => setMode("MANUAL")}
                className={`py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  mode === "MANUAL"
                    ? "bg-gradient-to-r from-[#C9A52A] to-[#D4B12F] text-[#0B0D10] shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <Sliders className="w-4 h-4" /> Manual Setup
              </button>
            </div>
          )}

          {/* Mode Views */}
          {stage === "CONFIG" && (
            <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border shadow-xs space-y-4">
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
                      className="px-6 h-[44px] rounded-xl bg-gradient-to-r from-[#C9A52A] to-[#D4B12F] text-[#0B0D10] font-extrabold text-xs cursor-pointer shadow-md hover:brightness-105 flex items-center gap-1.5"
                    >
                      <span>Proceed to Blueprint Editor</span>
                      <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Stage 2: Interactive Blueprint Builder */}
          {stage === "BLUEPRINT" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-card border border-border shadow-xs">
                <span className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#C9A52A]" /> Step 2: Interactive Blueprint Customization
                </span>
                <button
                  type="button"
                  onClick={() => setStage("CONFIG")}
                  className="text-xs text-muted-foreground hover:text-foreground font-bold underline cursor-pointer"
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
                  className="px-6 h-[44px] rounded-xl bg-gradient-to-r from-[#C9A52A] to-[#D4B12F] text-[#0B0D10] font-extrabold text-xs transition-all cursor-pointer shadow-md hover:brightness-105 flex items-center gap-1.5"
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
        <div className="lg:col-span-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-xs space-y-3.5 lg:sticky lg:top-20 h-fit">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#C9A52A]" /> Blueprint Summary
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-[#C9A52A]/15 text-[#C9A52A] text-[10px] font-extrabold uppercase tracking-wider border border-[#C9A52A]/20">
                {stage}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-0.5">
                <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">Project Title</span>
                <p className="font-extrabold text-foreground text-xs truncate">
                  {title || (milestones.length > 0 ? "Untitled Project" : "Not Set (Type Prompt or Title)")}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 rounded-xl bg-background border border-border">
                  <span className="text-[9.5px] font-extrabold text-muted-foreground uppercase tracking-wider block">Priority</span>
                  <p className="font-extrabold text-[#C9A52A]">{priority}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-background border border-border">
                  <span className="text-[9.5px] font-extrabold text-muted-foreground uppercase tracking-wider block">Deadline</span>
                  <p className="font-extrabold text-foreground truncate">{deadline || "Flexible"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 rounded-xl bg-background border border-border">
                  <span className="text-[9.5px] font-extrabold text-muted-foreground uppercase tracking-wider block">CO-CEO Lead</span>
                  <p className="font-extrabold text-blue-500 truncate">
                    {coCeoList.find((c) => c.id === selectedCoCeoId)?.name || "Unassigned"}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-background border border-border">
                  <span className="text-[9.5px] font-extrabold text-muted-foreground uppercase tracking-wider block">Assigned Team</span>
                  <p className="font-extrabold text-purple-500 truncate">{selectedMemberIds.length} Members</p>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">Milestone Gates ({milestones.length})</span>
                <span className="text-[10px] font-mono text-[#C9A52A]">{milestones.reduce((sum, m) => sum + m.tasks.length, 0)} Total Tasks</span>
              </div>

              {milestones.length === 0 ? (
                <div className="p-3.5 rounded-xl bg-background border border-dashed border-border text-center space-y-1 text-xs">
                  <span className="text-[10.5px] font-extrabold text-[#C9A52A] uppercase tracking-wider block">
                    Blueprint Pending
                  </span>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Type a mandate prompt or select a template framework to build milestone gates in real-time.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  {milestones.map((m, idx) => (
                    <div key={m.id || idx} className="p-2.5 bg-background rounded-xl border border-border text-[11px] flex items-center justify-between">
                      <span className="font-bold text-foreground truncate">{m.name}</span>
                      <span className="text-[9.5px] font-mono text-muted-foreground shrink-0 bg-muted px-1.5 py-0.5 rounded">{m.tasks.length} tasks</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
